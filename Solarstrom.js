var thorsten = false

var devices = [// id, watt, auszeit min, angeschaltet minimum zeit
    {id:'sonoff.0.Gosund Steckdose 4.POWER', watt:5, deactivatetime:0, activateTime:30, prio:0, isStartTimer:null, isEndTimer:null}
]



const axios = require('axios');
var startTime = new Date('2023-05-06T05:00Z')
const ye = 60*60*1000*24*365
var value = getState('0_userdata.0.Energie.Solar.Fillin_5kw_%').val
var result = 0;
var sum = 0;
var sumcount = 0
const maxPower = 8000
var currentPower = 0;
var lastPower = getState('sma-em.0.3015986450.psurplus').val - getState('sma-em.0.3015986450.pregard').val;
var m11 = 10240*60*60
var m7 = 7680*60*60
var m5 = 5120*60*60
var a11s = getState('0_userdata.0.Energie.Akku_Test.11kw_state').val*3600
var a11u = getState('0_userdata.0.Energie.Akku_Test.11kw_use').val*3600
var a7s = getState('0_userdata.0.Energie.Akku_Test.7kw_state').val*3600
var a5s = getState('0_userdata.0.Energie.Akku_Test.5KW_state').val*3600
var a7u = getState('0_userdata.0.Energie.Akku_Test.7kw_use').val*3600
var a5u = getState('0_userdata.0.Energie.Akku_Test.5kw_use').val*3600

var consumOG = 0
var consumS = 0
var psurplus = getState('sma-em.0.3015986450.psurplus').val
var tempSolar = 0;
var tempSolarNeg = 0;
var firstrun = true;
const destPath = '0_userdata.0.Energie.Akku_Test'
const ctotalConsum = '0_userdata.0.Energie.Verbrauch_Gebäude.Total'
var totalConsum = getState(ctotalConsum).val
csCustom()


schedule('*/5 * * * *', setMyForcast)

async function csCustom() {
    await createStateCustom(destPath,'11kw_state', 'number', 0)
    await createStateCustom(destPath,'11kw_use', 'number', 0)
    await createStateCustom(destPath,'7kw_state', 'number', 0)
    await createStateCustom(destPath,'7kw_use', 'number', 0)
    await createStateCustom(destPath,'5KW_state', 'number', 0)
    await createStateCustom(destPath,'5KW_state', 'number', 0)
    await createStateCustom(destPath,'11kw_money', 'number', 0)
    await createStateCustom(destPath,'7kw_money', 'number', 0)
    await createStateCustom(destPath,'5kw_money', 'number', 0)
    await createStateCustom('0_userdata.0.Energie.Solar','Fillin_5kw_%', 'number', 0)
    await createStateCustom('0_userdata.0.Energie.Solar.','energieüberschuss', 'boolean', 0)
    await createStateCustom('0_userdata.0.Energie.Solar.','Solarüberschuss', 'number', 0)
    await createStateCustom('0_userdata.0.Energie.Solar.','Obergeschoss_max_Netzbezug', 'number', 0)
    tempSolar = await getState('0_userdata.0.Energie.Solar.Obergeschoss_max_Netzbezug').val
    return Promise.resolve(true);
}


function setDevices() {
    return
    //devices = [1,2,3]
    let c = currentPower * 1000
    let cc = 0
    devices.forEach((d) => {
        let on = getState(d.id).val
        if (on == d.on) cc += d.watt
        d.on = on;    
    })
    devices.forEach((d) => {
        if (c < 0) {
            if (d.on && !d.isStartTimer) {
                setState(d.id, false)
                d.on = false
                endDevice(d)
            }
        } else if (c > 0) {
            if (!d.on && c > d.watt && !d.isEndTimer) {
                setState(d.id, true)
                startDevice(d)
                d.on = true
                c-=d.watt
                cc+=d.watt
            }
        }
    })
}

function endDevice(d) {
    if (d.isEndTimer) return
    return d.isEndTimer = setTimeout(function(a) {
        a.isEndTimer = null
    }, d.deactivatetime * 1000, d)
}

function startDevice(d) {
    if (d.isStartTimer) return
    return d.isStartTimer = setTimeout(function(a) {
        a.isStartTimer = null
    },d.activateTime * 1000, d)
}
on({id:'shelly.0.SHEM-3#C45BBE6C597F#1.Total.ConsumedPower', change:'ne'}, function(obj){
    let d = 0;
    if (firstrun) { // verwerfe ersten Durchlauf da Daten nur Teilweise erhoben wurden
        d = (obj.state.val - obj.oldState.val) * 3600 // ((obj.state.lc - obj.oldState.lc) / 1000) 
        if (d > -tempSolarNeg ) d = -tempSolarNeg
        tempSolar += d /3600000
    } else firstrun = false;
    tempSolarNeg = 0;
    setState('0_userdata.0.Energie.Solar.Obergeschoss_max_Netzbezug', tempSolar, true)
})
var netIncom = 0
schedule('10 */5 * * * *', function(){
    setState(ctotalConsum, totalConsum, true)
})

var saveTotalVal = 0;
var calcTotalValTimer = null;

on({id:ctotalConsum, change:'any'}, function(obj){
    let tc = (obj.state.val - obj.oldState.val) * 1000
    let partIncom = (tc == 0 ? 0 : (netIncom * 1000) / tc)
    let eg = (tc - consumOG - consumS) * partIncom
    let og = consumOG * partIncom
    let s = consumS * partIncom
    setState('0_userdata.0.Energie.Verbrauch_Gebäude.Anteil_Netzbezug_EG', eg,true)
    setState('0_userdata.0.Energie.Verbrauch_Gebäude.Anteil_Netzbezug_OG', og ,true)
    setState('0_userdata.0.Energie.Verbrauch_Gebäude.Anteil_Netzbezug_Sonstiges', s,true)
    consumOG = 0
    consumS = 0
    netIncom = 0
})


on({id:'shelly.0.SHEM-3#C45BBE6C597F#1.Total.ConsumedPower', change:'ne'}, function(obj){
    consumOG += (obj.state.val - obj.oldState.val)
})
on({id:'shelly.0.SHSW-25#E8DB84AB6198#1.Relay0.Energy', change:'ne'}, function(obj){
    consumS += (obj.state.val - obj.oldState.val)
})

on({id:'sma-em.0.3015986450.pregardcounter', change:'ne'}, function(obj){
    saveTotalVal -= (obj.state.val - obj.oldState.val) * 3600/ ((obj.state.lc - obj.oldState.lc)/1000)
    calcTotalVal() 
    totalConsum += obj.state.val - obj.oldState.val
    netIncom += obj.state.val - obj.oldState.val
})
on({id:'sma-em.0.3015986450.psurpluscounter', change:'ne'}, function(obj){
    saveTotalVal += (obj.state.val - obj.oldState.val) * 3600/ ((obj.state.lc - obj.oldState.lc)/1000)
    calcTotalVal()
    totalConsum -= obj.state.val - obj.oldState.val
})

on({id:'shelly.0.SHEM-3#BCFF4DFD10B1#1.Total.Total_Returned', change:'ne'}, function(obj){
    totalConsum += (obj.state.val - obj.oldState.val) /1000
})

function calcTotalVal() {
    if (calcTotalValTimer) clearTimeout(calcTotalValTimer)
    calcTotalValTimer = setTimeout(function(){
        setState('0_userdata.0.Energie.Solar.solarüberschuss_aus_kwh_daten', saveTotalVal, true)
        saveTotalVal = 0
    },5000)
}

async function createStateCustom(destPath, dataPoint, typ, def) {
    if (!await existsStateAsync(destPath + dataPoint)) {
        await createStateAsync(destPath + dataPoint, {read:true, write:true, def:def, name:"script", type:typ, }, );
    }
    return Promise.resolve(true);
}

// zeit erhöhen auf 2 minuten oder so
schedule('*/15 * * * * *', function(){
    currentPower = lastPower
    lastPower = sum/sumcount
    currentPower = (currentPower + lastPower)/2 
    let cs = getState('0_userdata.0.Energie.Solar.energieüberschuss').val
    if (cs != currentPower > 400 && cs != currentPower > 200) setState('0_userdata.0.Energie.Solar.energieüberschuss', currentPower > 400, true)
    setState('0_userdata.0.Energie.Solar.Solarüberschuss', currentPower/1000, true)
    sum = 0;
    sumcount = 0;
})



var nous02debouce = null;
var nous02debouceValue = false;
const chot = '0_userdata.0.Dummys.test'
var hotDebouce = null
var hotDebouceValue = getState(chot).val
var hotValue = hotDebouceValue
on({id:chot, change:'ne'}, function(obj){
    hotValue = obj.state.val
})

on({id:'0_userdata.0.Energie.Solar.Solarüberschuss', change:'ne'}, function(obj){
    let v = obj.state.val
    if ( v > 0.3 != hotValue && v > 0.25 != hotValue ) {
        hotDebouceValue = v > 0.3
        if (!hotDebouce) {
            setState(chot, v > 0.3)
            hotDebouceFunc()
        }  
        function hotDebouceFunc() {
            hotDebouce = setTimeout(function(){
                if (hotValue == hotDebouceValue) {
                    hotDebouce = null;
                } else {
                    setState(chot, hotDebouceValue)
                    hotDebouceFunc()
                }
            }, 600000)
        }
    }
})

var wind = getState('openweathermap.0.forecast.current.windGust').val
var temp = getState('openweathermap.0.forecast.current.temperature').val
var energieueber = getState('0_userdata.0.Energie.Solar.energieüberschuss').val
switchBrunnen(wind, temp, energieueber)

on({id:'openweathermap.0.forecast.current.temperature', change: 'ne'}, function(obj){
    temp = obj.state.val
    switchBrunnen(wind, temp, energieueber)
})
on({id:'openweathermap.0.forecast.current.windGust', change: 'ne'}, function(obj){
    wind = obj.state.val
    switchBrunnen(wind, temp, energieueber)
})
on({id:'0_userdata.0.Energie.Solar.energieüberschuss', change:'ne'}, function(obj){
    energieueber = obj.state.val
    switchBrunnen(wind, energieueber)
})

function switchBrunnen(wind, temp, solar) {
    nous02debouceValue = solar;
    if (wind > 10 ) nous02debouceValue = false
    if (temp < 10 ) nous02debouceValue = false
    if (nous02debouceValue == getState('sonoff.0.NOUS 02.POWER').val) {
        return
    }
    if (!nous02debouce) {
        setState('sonoff.0.NOUS 02.POWER', nous02debouceValue)
        nous02debouceFunc()
    }  
    function nous02debouceFunc() {
        nous02debouce = setTimeout(function(){
            if (getState('sonoff.0.NOUS 02.POWER').val == nous02debouceValue) {
                nous02debouce = null;
            } else {
                setState('sonoff.0.NOUS 02.POWER', nous02debouceValue)
                nous02debouceFunc()
            }
        }, 300000)
    }
}
//Produktion
on({id:'sma-em.0.3015986450.psurplus', change:'any', valGt:0}, function(obj){
    let v = obj.state.val
    psurplus = obj.state.val;
    //tempSolarPos+= (v * (obj.state.ts -obj.oldState.ts)/1000)
    let secs = (obj.state.ts - obj.oldState.ts) /1000
    if (thorsten) {
        let ot = obj.oldState.ts
        let nt = obj.state.ts
        sumcount = (nt - ot) / 1000
        v = (obj.state.val - obj.oldState.val) * 3600
        sum += v
    } else {
        sum += v *secs
        sumcount += secs
    }
    
    // weg
    if (v > 200) {  
        if (v>8000) v=8000   
        value++
    } if ( v <= 0) value = 0;
    //
    if (a11s < m11) {
        a11s += v*secs
    }
    if (a7s < m7) {
        a7s += v*secs
    }
    if (a5s < m5) {
        a5s += v*secs
    }
})


//Verbrauch
on({id:'sma-em.0.3015986450.pregard', change:'any', valGt:0}, function(obj){
    let v = obj.state.val
    let secs = (obj.state.ts - obj.oldState.ts) /1000
    tempSolarNeg-= v //(v / (obj.state.ts - obj.oldState.ts)/1000) 
    if (thorsten) {
        let ot = obj.oldState.ts
        let nt = obj.state.ts
        sumcount = (nt - ot) / 1000
        v = (obj.state.val - obj.oldState.val) * 3600
        sum -= v //* (obj.state.lc - obj.oldState.lc)/1000
      
    } else {
        sum -= v*secs
        sumcount+=secs
        
    }    
    let te = getState('shelly.0.SHEM-3#BCFF4DFD10B1#1.Total.InstantPower').val*-1
    // weg
    if (te > 0 && v + te > 8000 ){ 
        let nv = (v+te-8000)
        v -= nv
        if (v < 0) v = 0
    }
    else if (v > 8000) v = 8000
    //
    if (a11s > v) {
        a11s -= v*secs
        a11u += v*secs
    } else {
        a11u += a11s
        a11s = 0
    }
    if (a7s > v) {
        a7s -= v*secs
        a7u += v*secs
    } else {
        a7u += a7s
        a7s = 0
    }
    if (a5s > v) {
        a5s -= v*secs
        a5u += v*secs
    } else {
        a5u += a5s
        a5s = 0
    }
})

schedule('*/30 * * * * *', function(){
    if (currentPower > 200) {
        let v = currentPower
        let result = currentPower/7000 * 100;
        if (result > 100) result = 100
        setState('0_userdata.0.Energie.Solar.Fillin_5kw_%',result, true)
    } else {
        setState('0_userdata.0.Energie.Solar.Fillin_5kw_%',0, true)
    }
    if (a11s >m11) {
        a11s = m11
    }
    setState('0_userdata.0.Energie.Akku_Test.11kw_state',a11s/3600, true)
    if (a7s >m7) {
        a7s = m7
    }
    setState('0_userdata.0.Energie.Akku_Test.7kw_state',a7s/3600, true)
    if (a5s > m5) {
        a5s = m5
    }
    setState('0_userdata.0.Energie.Akku_Test.5KW_state',a5s/3600, true)
    setState('0_userdata.0.Energie.Akku_Test.5kw_use', a5u/3600, true)
    setState('0_userdata.0.Energie.Akku_Test.7kw_use', a7u/3600, true)
    setState('0_userdata.0.Energie.Akku_Test.11kw_use', a11u/3600, true)
    let dif = new Date().getTime() - startTime.getTime()
    setState('0_userdata.0.Energie.Akku_Test.5kw_money', a5u/3600 * 0.23 / dif * ye /1000, true)
    setState('0_userdata.0.Energie.Akku_Test.7kw_money', a7u/3600 * 0.23 / dif * ye /1000, true)
    setState('0_userdata.0.Energie.Akku_Test.11kw_money', a11u/3600 * 0.23 / dif * ye /1000, true)

    setDevices()
})

var ledSchedule = null
if (getState('sonoff.0.Gosund Steckdose 7.POWER').val) ledSchedule = schedule('*/5 * * * * *', setDesk1)
else ledSchedule = schedule('*/5 * * * *', setDesk1)

on({id:'sonoff.0.Gosund Steckdose 7.POWER', change:'ne'}, function(obj){
    if (ledSchedule) clearSchedule(ledSchedule)
    log('wled steckdose ist:' + obj.state.val)
    if (obj.state.val) ledSchedule = schedule('*/5 * * * * *', setDesk1)
    else ledSchedule = schedule('*/5 * * * *', setDesk1)
})

const ledcount = 60;// 2 leds sind unter halb der Ausfräsung, 
const noColorLed = 4 // 6 leds sind in der oberen Kurve
const ledMaxCount = 129-1 //die letzte LED ist nicht sichtbar
//const ctomorrow = 'pvforecast.1.summary.energy.tomorrow'
var tomorrow = 0
//tomorrow = getForcast(getState(ctomorrow).val)

function getForcast(v) {
    let max = 8000
    if (v > max) v = max
    return ledMaxCount - Math.round((ledcount) * v / max) -1 
}
//on({id:ctomorrow, change:'ne'}, function(obj){
//    tomorrow = getForcast(obj.state.val)
//})
on({id:'shelly.0.SHEM-3#BCFF4DFD10B1#1.Total.InstantPower', change:'ne'}, setDesk1)

var deactiveWledTimer = null
var lastLed = []
var setDeskTimeout = null;
var setDeskAgain = false
function setDesk2(obj) {
    setDeskTimeout = null;
    if (setDeskAgain) {
        setDeskAgain = false;
        setDesk1(obj)
    }
}
function setDesk1(obj) {
    if (obj !== undefined) {
        if (setDeskTimeout) clearTimeout(setDeskTimeout)
        setDeskTimeout = null;
    } else if (setDeskTimeout) {
        setDeskAgain = true;
        return
    }
    setDesk(obj)
    setDeskTimeout = setTimeout(setDesk2,6000,null)
    setDeskAgain = false;
}
async function setDesk(obj) {
    let bat = 0
    let sol = obj == undefined ? getState('shelly.0.SHEM-3#BCFF4DFD10B1#1.Total.InstantPower').val* -1: obj.state.val * -1
    let use = sol - psurplus + getState('sma-em.0.3015986450.pregard').val
    sol = (sol > 0 ? sol : 0)
    sol = sol > maxPower ? maxPower : sol
    use = use > maxPower ? maxPower : use
   
    let s = Math.round(ledcount * sol /maxPower)+2
    let u = Math.round(ledcount * use /maxPower)+2
    //let b = ledMaxCount - Math.round((ledcount) * bat /100) - 1
    let tt = getState('bydhvs.0.State.SOC').val
    tt = tt > 100 ? 100 : tt
    tt = tt < 5 ? 5 : tt
    let t = ledMaxCount - Math.round((ledcount) * (tt-5) / 95)
    let b = ledMaxCount - Math.round((ledcount) * getState('0_userdata.0.MQTT.k.heizungsraum.switch:0.apower').val / maxPower) 
    let c = getState('0_userdata.0.MQTT.k.heizungsraum.switch:0.output').val ? ledMaxCount-1 : ledMaxCount
    let bri = 220
    let oBri = 180
    if ( s <= u && sol < 800) {
        if (!getState('sonoff.0.Gosund Steckdose 7.POWER').val) return Promise.resolve(true);
        oBri = 80
        if (!deactiveWledTimer /*&& bat < 20*/) deactiveWledTimer = setTimeout(function(){
            setState('sonoff.0.Gosund Steckdose 7.POWER', false)
            deactiveWledTimer = null;
        }, 60 * 60000) //halbe stunde
    } else {
        if (deactiveWledTimer) {
            clearTimeout(deactiveWledTimer)
            deactiveWledTimer = null
        }
        if (!getState('sonoff.0.Gosund Steckdose 7.POWER').val) {
            setState('sonoff.0.Gosund Steckdose 7.POWER', true)
        }
    }
    if (getState('wled.0.c049efe62f6c._info._online').val != true) return
    if (!getState('sonoff.0.Gosund Steckdose 7.POWER').val) return
    let change = false;
    let p = [[0,0,0]];
    
    for (let a = 1; a < ledMaxCount; a++) {
       
        if (a < u ) {
            p.push([bri,0,0])
            if (a > s) {
                p[a][0] = bri-20 
                p[a][2] = bri+20
            }
        } else if (a < s) {
            p.push([0,bri,0])     
        } else if (a >= c ) {
            p.push([bri,bri,bri])
        } else if (a == tomorrow ) {
            p.push([0,254,0])
        } else if (a >= b ) {
            p.push([bri,bri,bri])
        } else if (a >= t ) {
            p.push([bri-20,bri-20,0])
        } else {
            p.push([0,0,0])
        }
        if (lastLed[a] == undefined || p[a][0] != lastLed[a][0] || p[a][1] != lastLed[a][1] || p[a][2] != lastLed[a][2])  change=true
      
    }

    p.push([0,0,0]) // die erste und letzte LED sind nicht sichtbar
    lastLed = p;
    
    if (!change) return Promise.resolve(true);
    try {
        const {data} = await axios.post('http://'+getState('wled.0.c049efe62f6c._info.ip').val+'/json', {
            "bri":oBri,
            "seg": [{
                "id": 0, 
                "i": p
            }]}, { 
                headers: {
                    "Content-Type": 'application/json'
                }
            }
        )
    } catch(error) {
        console.warn('wled unten nicht erreichbar!' + error)

    }
    return Promise.resolve(true);
}

function setMyForcast() {
    const fHours = 2
    const basedir = '0_userdata.0.Energie.solcast'
    const powersubdir = '.power.data'
    let path = basedir + '.mid' + powersubdir+'.'
    let start = new Date().getMinutes() < 30 ? new Date().setMinutes(30,0,0) : new Date(new Date().setHours(new Date().getHours()+1,0,0,0))
    let stop = new Date(new Date().setHours(new Date(start).getHours()+fHours,0,0,0))
    let staA = [new Date(start).getHours(), new Date(start).getMinutes()] 
    let stoA = [new Date(stop).getHours(), new Date(stop).getMinutes()] 
    if (staA[0] > stoA[0]) stoA[0] +=24
    let count = 0
    let total = 0
    for (let b = staA[0]; b < stoA[0]; b++) {
        if (b >=24 ) continue      
        for (let c = 0; c < 2; c++) {
            let t = staA[1] + c * 30 >= 60 ? b + 1 :   b
            let h = t < 10 ? '0' + t : t
            t = ((staA[1] + c * 30) % 60) 
            let m = t < 10 ? '0' + t : t
            h = h + ':' + m
            if (!existsState(path + h)) continue
            total +=getState(path + h).val
            count++
        }
    }
    total /= count
    tomorrow = getForcast(total*1000)
}
setMyForcast();