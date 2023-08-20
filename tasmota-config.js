const axios = require("axios")

// User und Password für die Weboberfläche soweit vergeben
var user = ''
var password = ''


// null bedeutet überspringen, '' bedeutet leeres Feld  Keine Ahnung ob das letzte geht
const ipPrefix = '192.168.179.'
const ipFrom = 62 //erste ip die verwendet wird dann +1 für jeden Durchlauf
const gateway = '192.168.178.1'
const netmask = '255.255.254.0'
const dns = '192.168.179.1'
const dns2 = null //''
const webpassword = null //''
const mqtthost = 'mqtt.tims.home'
const mqttuser =  '' //''
const mqttpassword = '' //''
const ssid1 = null //''
const wifipassword = null //''


// wenn das Array aus IP Adressen und nicht aus state IDs besteht nachvollgendes auf true
const ipNotState = true
var counter = 1;
const justScan = true
if (justScan) {
    
    doit()
    async function doit() {
        axios.defaults.timeout = 5000
        axios.defaults.timeoutErrorMessage='timeout'
        
        for (let a = 1; a<256;a++) {
            let ip = '192.168.179.'+a
            var url = 'http://'+ip+'/cm?' + user + password +'&cmnd=Upgrade'
            try {
                setTimeout(function(url) {
                    axios.get(url)
                    .then(response => {
                        //for (let a in response) log(a)
                        if (response.status == '200'){
                            if ( JSON.stringify(response.data).lastIndexOf('"Upgrade":"1 or') !== -1) {
                                console.log(counter++ + '. Tasmota: ' +response.config.url.replace('/cm?&cmnd=Upgrade','') );
                            }
                        }
                    }).catch(err => {});//log('ip: ' + ip + ' 2.result: ' +JSON.stringify(result))
                }, a * 40,url)
            } catch(e) {if (e.name != 'Error')log(e)}
            //log(url)

            
        }
        return
    }
    
    return;
}
//let dev = $('state[state.id=sonoff.*.Info2_IPAddress]')
//log(dev)
///*
let dev = [
    '192.168.178.186'
]
//*/

var param = [
    ipPrefix,
    gateway,
    netmask,
    dns,
    dns2,
    webpassword,
    mqtthost,
    mqttuser,
    mqttpassword,
    ssid1,
    wifipassword,
    '1'
]

const cmds = [
    'IPAddress1', // device ip
    'IPAddress2', // gateway
    'IPAddress3', // subnet
    'IPAddress4', // DNS
    'IPAddress5', // DNS2
    'WebPassword',
    'MqttHost',
    'MqttUser,',
    'MqttPassword',
    'SSID1', 
    'Password1', // wifipassword
    'restart%201' // restart
]

if (user) user = 'user='+user
if (password) password = '&password='+password
let eIp = ipFrom;

async function work() {
    for (let b = 0; b<dev.length;b++) {
        let id = dev[b]
        if ((!existsState(id) || !getState(id).val) && !ipNotState) return
        //if (eIp >= 52) return
        var url = 'http://'+(ipNotState?id:getState(id).val)+'/cm?' + user + password +'&cmnd='

        for (let a=0; a<cmds.length;a++) {
            if (param[a] === null) continue
            url +=  'Backlog%20'+cmds[a]+'%20'+param[a]
            if (a == 0) url +=eIp
            if (a != cmds.length -1) url += '%3B'
        }
        try {
            const result = await axios.get(url)
            log(url)
            log(result.status)
        } catch (e){}
        if (eIp != null) eIp++
    }     
}

if (!justScan) work()