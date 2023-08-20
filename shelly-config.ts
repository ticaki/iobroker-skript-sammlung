const onlyLog:boolean =  true

let options = {
    "auth": { // den Zweig löschen wenn keine http password vergeben
        "username": "",
        "password": ""
    },
    "settings": {
        "mqtt_enable": true,
        //"mqtt_server": "iobroker.kiemen.com:1882",
        //"mqtt_user": "Tim",
        //"mqtt_id": "shelly1-1118CB",
        //"mqtt_reconnect_timeout_max": 60,
        //"mqtt_reconnect_timeout_min": 2,
        //"mqtt_pass": "",
        "mqtt_clean_session": true,
        "mqtt_keep_alive": 60,
        "mqtt_max_qos": 1,
        "mqtt_retain": false,
        "mqtt_update_period": 30
    },
} 


let dev = $('state[state.id=shelly.*.hostname]')
const axios = require('axios')

async function setData() {
        let opt:object = {}
        if (options.auth !== undefined) opt["auth"] = options.auth
        let appendix = ''
        for (let key in options.settings) {
            if (!(options && options.settings && options.settings[key] !== undefined)) return
            if (!appendix) appendix = '?'
            else appendix += '&'
            appendix += key + "=" + options.settings[key]
        }    for (let d of dev) {
        
        let ip = getState(d).val
        let url = 'http://'+ip+'/settings'+ appendix
        if ( onlyLog) {
            log(url + JSON.stringify(options))
            continue
        }
        try {
            const result = await axios.get(url, opt);
            await axios.get('http://'+ip+'/reboot', opt);
            log (JSON.stringify(result.data))
        } catch (error) {log(error)}
        return Promise.resolve(null)
    }
}

//shelly.0.SHSW-1#1118CB#1.hostname
setData()