//bitte das folgende Skript noch drüber kopieren oder gleich als Globalskript anlegen
//globaleCreateFunktionen.js

const enumFunctions = 'online' // die Funktion die in Aufzählung für dieses Skript zur Verfügung gestellt wird, muß den überwachten States zu geordnet werden

// Pfad an dem alles erstellt werden soll
const path = '0_userdata.0.Kontrollzentrum.Sensorueberwachung'

// wie sieht die Zeit in der Telegramnachrichct aus
const options = {hour: 'numeric', minute:'numeric', month: 'numeric', day: 'numeric'}


var msg = {}

async function init() {
    if (!existsState(path)) await createFolderAsync(path, 'Geräteüberwachung')
    work()
    return Promise.resolve(true);
}

// Nachrichten werden nur einmal am Tag versendet, rücksetzen um 7:30 
schedule('30 7 * * *', function() { msg = {}})

schedule('*/15 * * * *', work)
schedule('15 10 * * 7', function(){work(true)})
// 0_userdata.0.Kontrollzentrum
async function work(long = false){
    let devs = $('state(functions=online)')

    const now = new Date().getTime()
    for (let a=0; a<devs.length; a++ ) {
        try {
            let dp = devs[a]
            let lc = getState(dp).lc // ts oder lc
            let v = {}
            let cts = v.zeit
            if (long) cts = v. langzeit
            v = readDP(dp)
            let alarm = false;
            switch (v.art) {
                case "ts":
                lc = getState(v.dp).ts
                alarm = lc + cts < now            
                break;
                case "lc":
                alarm = getState(v.dp).lc + cts < now
                break;
                case "true":
                case "false":
                alarm = getState(v.dp).val 
                if (v.art == true) alarm = !alarm
                if (long && !alarm) alarm = !getState(v.dp).ts + cts < now
                break;
            } //"ts, lc, true, false Worauf geprüft werden soll"},
            if (alarm) {
                if(msg[dp] === undefined) msg[dp] = {} 
                msg[dp].ts = formatDate(lc,"hh:mm / DD.MM")
                let tdp = dp.split('.').slice(0, -1).join('.')
                if (existsObject(tdp)) {
                    msg[dp].name = getObject(tdp).common.name
                } else {
                    msg[dp].name = getObject(dp).common.name
                }             
                if (msg[dp].name.de !== undefined) msg[dp].name = msg[dp].name.de     
                msg[dp].adapter = dp.split('.')[0]
            } else {
                delete msg[dp]
            }
        } catch(e) {log(e);log(2)}
    }
    let message = ''
    for (let dp in msg) {
        let m = msg[dp]
        if (m.msg !== undefined) continue
        message += m.adapter+'-'+m.name + " - " + m.ts + '\n'
        m.msg = message
    }
    let tempdevs = $('state(id='+path+'.*.dp)')
    //log(tempdevs)
    for (let a=0;a<tempdevs.length;a++) {
        let dp = getState(tempdevs[a]).val
        let index = -1
        for (let b=0;b<devs.length;b++) {
            if (devs[b] == dp) {
                index = b
            }
        }
        if (index == -1) {
            deleteDP(dp)
        }
    }

    if (message) {
        if (long) message = 'Gerätelangzeitüberwachung\n' + message
        else message = 'Geräte offline\n' + message
        sendTo('telegram', {user: 'Tim', text: message });         
    }
    return Promise.resolve(true);
}

async function deleteDP(dp) {
    let id = dp.split('.').join('-')// + '-' + dp.hashCode() .splice(0,3)
    let tPath = path +'.'+ id
    if (existsObject(tPath)) {
        for (let p in stateDef) {
            deleteState(tPath +'.'+ p)
        }
        deleteState(tPath )
    }
}
async function readDP(dp) {
    let id = dp.split('.').join('-')// + '-' + dp.hashCode() .splice(0,3)
    let tPath = path +'.'+ id
    let result = {} 
    if (existsObject(tPath)) {
        for (let p in stateDef) {
            result[p] = getState(tPath +'.'+ p).val
            if (!getState(tPath +'.'+ p).ack) setState(tPath +'.'+ p, result[p], true)
        }
    } else {
        let name = getObject(dp.split('.').slice(0,-1).join('.')).common.name
        if (name.de !== undefined) name = name.de 
        await createDeviceAsync(tPath, name)
        for (let p in stateDef) {
            let o = {"type": stateDef[p].type, name:p, desc:stateDef[p].desc}
            let def = stateDef[p].def
            if (p == "id") def = id
            if (p == "dp") def = dp
            await createStateAsync(tPath+'.'+p, def, o)
            result[p] = def
        }
    }
    if (result.zeit !== undefined) {
        let t = result.zeit
        let ts = 0;
        if (t.lastIndexOf('d')) {
            ts += parseInt(t.slice(0,-1))
        }
        ts *=24  
        if (t.lastIndexOf('h')) {
            ts += parseInt(t.slice(0,-1))
        } 
        ts*=60 
        if (t.lastIndexOf('m')) {
            ts += parseInt(t.slice(0,-1)) 
        }
        ts*=60000 
        result.zeit = ts
    } else result.zeit = 0
    if (result.langzeit !== undefined) {
        let t = result.langzeit
        let ts = 0;
        if (t.lastIndexOf('d')) {
            ts += parseInt(t.slice(0,-1))
        }
        ts *=24  
        if (t.lastIndexOf('h')) {
            ts += parseInt(t.slice(0,-1))
        } 
        ts*=60 
        if (t.lastIndexOf('m')) {
            ts += parseInt(t.slice(0,-1)) 
        }
        ts*=60000 
        result.langzeit = ts
    } else result.langzeit = 0
    return Promise.resolve(result);
}

const stateDef = {
    "id": {"type": "string", "def":"", "desc": "diese Id"},
    "dp": {"type": "string", "def":"", "desc": "ursprüngliche ID"},
    "art": {"type": "string", "def":"ts", "desc": "ts, lc, true, false Worauf geprüft werden soll"},
    "activ": {"type": "boolean", "def":true, "desc": "An/Auschalten"},
    "zeit": {"type": "string", "def":"30m", "desc": "d,h,m"},
    "langzeit": {"type": "string", "def":"14d", "desc": "Wie zeit, jedoch wird der Zeitstempel(ts) geprüft, ob dieser aktualisiert wurde"},
}


/*
    1.  Zeitraum der getestet werden soll
    2.  ts = überprüfe die Zeit zwischen den Änderungen
        bool = teste ob State true ist
*/

init()