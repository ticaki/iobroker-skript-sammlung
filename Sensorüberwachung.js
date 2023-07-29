//bitte das folgende Skript noch drüber kopieren oder gleich als Globalskript anlegen
//globaleCreateFunktionen.js

/* Schreibt "Warnungen" ins Log und versendet 1 mal pro Tag/Start Meldungen per Telegram */

const setFunctionToAllStates = false

const enumFunctions = 'online' // die Funktion die in Aufzählung für dieses Skript zur Verfügung gestellt wird, muß den überwachten States zu geordnet werden


// Pfad an dem alles erstellt werden soll, hier kann man die Überwachung deaktivieren und einstellen
const path = '0_userdata.0.Kontrollzentrum.Sensorueberwachung'

// wie sieht die Zeit in der Telegramnachrichct aus
const options = "hh:mm / DD.MM"

//telegramm user
const user = 'Tim'

// Hier wird der Meldungsspeicher zurück gesetzt
schedule('30 7 * * *', function() { msg = {}})

// Den unter States befindlichen Punkten wird die functions enum zugewiesen wenn setFunctionToAllStates true ist
// states die nicht mit einem enum versehen werden können und auch überwachte werden sollen
const watchingDevice = {
    adapter: [
         '*.info.connection',
        'system.adapter.*.alive'
    ],
    states: [       
        '*.UNREACH',
        'sonoff.*.Uptime',
        'shelly.*.uptime',
        'nuki.*.timestamp'
    ],
    scripts: [
        // hier jede Jasacriptinstanz eintragen, dieses Skript muß alleine auf einer eigenen laufen
        // wenn die Instanz anhält läuft auch dieses Skript nicht, damit ist eine überprüfung der eigenen Instanz sinnlos
        'javascript.0.scriptEnabled.*' 
    ]
}

// default werte
const stateDef = {
    "_default": {
        "id": {"type": "string", "def":"", "desc": "diese Id"},
        "dp": {"type": "string", "def":"", "desc": "ursprüngliche ID"},
        "art": {"type": "number", "def":0, "desc": "ts, lc, true, false Worauf geprüft werden soll", states:{"0": "Zeitstempel", "1": "Letzte Änderung", "2": "true = offline", "3":"false = offline"}},
        "activ": {"type": "boolean", "def":true, "desc": "An/Auschalten"},
        "zeit": {"type": "string", "def":"30m", "desc": "d,h,m"},
        "ts_langzeit_prüfung": {"type": "boolean", "def":true, "desc": "Langzeitprüfung aktiv"},
        "langzeit": {"type": "string", "def":"14d", "desc": "Wie zeit, jedoch wird der Zeitstempel(ts) einmal die Wochhe geprüft, ob dieser aktualisiert wurde"},
    }, 
    "firstTag": { // am Anfang des dp
        "javascript": {
            "stateTyp": "script",
            "art": {"def":3},
            "zeit": {"def":"15m"},
            "ts_langzeit_prüfung": {"def":false}
        },
        "system": {
            "stateTyp": "adapter",
            "art": {"def":3},
            "zeit": {"def":"15m"},
            "ts_langzeit_prüfung": {"def":false}
        }
    },
    "lastTag": { // am Ende des dp. Das wird zuerst geprüft und überschreibt einstellungen in firstTag
        "UNREACH": {
            "stateTyp": "state",
            "art": {"def":2},
            "zeit": {"def":"1h"}
        },
        "info.connection": {
            "stateTyp": "adapter",
            "art": {"def":3},
            "zeit": {"def":"15m"},
            "ts_langzeit_prüfung": {"def":false}
        }
    }
}

var msg = {}

async function init() {
    if (setFunctionToAllStates ) {
        for (const idPart of watchingDevice.states) {
            let s = Array.prototype.slice.apply($('state(id='+idPart+')'))
            for (const id of s) {
                addToEnum('enum.functions.'+enumFunctions,id)
            }
        }
    }

    if (!existsObject(path)) await createFolderAsync(path, 'Ausfallüberwachung')
    if (!existsObject(pathToState)) await createFolderAsync(pathToState, 'Geräteüberwachung')
    if (!existsObject(pathToAdapter)) await createFolderAsync(pathToAdapter, 'Adapterüberwachung')
    work()
    return Promise.resolve(true);
}

const pathToState = path + '.gerät'
const pathToAdapter = path + '.adapter'
const pathToScript = path + '.script'
const paths = [pathToAdapter,pathToState,pathToScript]
//system.adapter.admin.0.alive
// Nachrichten werden nur einmal am Tag versendet, rücksetzen um 7:30 


schedule('*/15 * * * *', work)

schedule('15 10 * * 7', function(){work(true)})

async function work(long = false){
    let devs = Array.prototype.slice.apply($('state(functions='+enumFunctions+')'))
    for (const sel of watchingDevice.adapter ) devs = Array.prototype.slice.apply($('state(id='+sel+')')).concat(devs)
    for (const sel of watchingDevice.scripts ) devs = Array.prototype.slice.apply($('state(id='+sel+')')).concat(devs)
    const now = new Date().getTime()
    for (let a=0; a<devs.length; a++ ) {
        //try {
            let dp = devs[a]
            let lc = getState(dp).lc // ts oder lc
            let v = {}
            v = await readDP(dp)
            let cts = v.zeit
            if (long && !v["ts_langzeit_prüfung"]) continue
            if (!v.activ) continue
            if (long) cts = v. langzeit
            let alarm = false;
            switch (v.art) {//"ts, lc, true, false Worauf geprüft werden soll"},
                case 0:
                lc = getState(v.dp).ts
                alarm = lc + cts < now            
                break;
                case 1:
                alarm = getState(v.dp).lc + cts < now
                break;
                case 2:
                case 3:
                alarm = getState(v.dp).val 
                if (v.art == 3) alarm = !alarm
                if (long && !alarm) alarm = !getState(v.dp).ts + cts < now
                break;
            } 
            if (alarm)log(dp + ' nicht aktiv', 'warn')
            if (alarm) {
                //log(v)
                if(msg[dp] === undefined) msg[dp] = {} 
                msg[dp].ts = formatDate(lc,options)
                msg[dp].adapter = ''
                let tdp = dp.split('.').slice(0, -1).join('.')
                if (v.devTyp != "script" ) {
                    if (existsObject(tdp)) {
                        msg[dp].name = getObject(tdp).common.name
                    } else {
                        msg[dp].name = getObject(dp).common.name
                    } 
                    msg[dp].adapter = dp.split('.').slice(0,2).join('.')  
                } else {
                    msg[dp].adapter = v.devTyp
                    msg[dp].name = v.dp.split('.').slice(3).join('.')
                }          
                if (msg[dp].name.de !== undefined) msg[dp].name = msg[dp].name.de     
                
            } else {
                delete msg[dp]
            }
        //} catch(e) {log(e);log(2)}
    }
    let message = ''
    for (let dp in msg) {
        let m = msg[dp]
        if (m.msg !== undefined) continue
        if (m.adapter) message += m.adapter+': '
        message += m.name + " - " + m.ts + '\n'
        m.msg = message
    }
    let tempdevs = $('state(id='+path+'.*.dp)')
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
        if (long) message = 'Geräte/Softwarelangzeitüberwachung\n' + message
        else message = 'Geräte/Software offline\n' + message
        sendTo('telegram', {user: user, text: message });         
    }
    return Promise.resolve(true);
}

async function deleteDP(dp) {
    let id = dp.split('.').join('-')
    for (const p of paths) {
        let tPath = p +'.'+ id
        if (existsObject(tPath)) {
            for (let p in stateDef["_default"]) {
                deleteState(tPath +'.'+ p)
            }
            deleteState(tPath )
        }
    }
}
async function readDP(dp) {
    let firstTag, lastTag , devTyp = 'state'
    for (const d in stateDef.firstTag ) {
        if (dp.startsWith(d)) {
            firstTag = d
            if (stateDef.firstTag[d].stateTyp) devTyp = stateDef.firstTag[d].stateTyp 
        }
    }
    for (const d in stateDef.lastTag ) {
        if (dp.endsWith(d)) {
            lastTag = d
            if (stateDef.lastTag[d].stateTyp !== undefined) devTyp = stateDef.lastTag[d].stateTyp 
        }
    }
    let id = dp
    let tPath = ''
    if (devTyp == 'adapter') tPath = pathToAdapter +'.'+ id
    else if (devTyp == 'script') {
        id = dp.split('.').slice(3).join('.')
        tPath = pathToScript +'.'+ id
    }
    else tPath = pathToState +'.'+ id
    let result = {"devTyp": devTyp} 
    if (existsObject(tPath)) {
        for (let p in stateDef["_default"]) {
            result[p] = getState(tPath +'.'+ p).val
            if (!getState(tPath +'.'+ p).ack) setState(tPath +'.'+ p, result[p], true)
        }
    } else {
        let name 
        if (devTyp !== 'script') {
            if (existsObject(dp.split('.').slice(0,-1).join('.'))) name = getObject(dp.split('.').slice(0,-1).join('.')).common.name
            else name = getObject(dp).common.name
        } else {
            name = id
        }
        if (name.de !== undefined) name = name.de 
        await createDeviceAsync(tPath, name)

        for (let p in stateDef["_default"]) {
            let o = {"type": stateDef["_default"][p].type, name:p, desc:stateDef["_default"][p].desc}
            let def = stateDef["_default"][p].def
            if (lastTag && stateDef["lastTag"][lastTag][p]) def = stateDef["lastTag"][lastTag][p].def
            else if (firstTag && stateDef["firstTag"][firstTag][p]) def = stateDef["firstTag"][firstTag][p].def
            if (p == "id") def = id
            if (p == "dp") def = dp
            if (stateDef["_default"][p].states !== undefined) o.states = stateDef["_default"][p].states
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

async function addToEnum(enumName, newStateId) {
    let myEnum = await getObjectAsync(enumName);
    if (myEnum) {
        let pos = myEnum.common.members.indexOf(newStateId);
        if (pos === -1) {
            try {
                myEnum.common.members.push(newStateId);
                myEnum.from = "system.adapter." + "0";
                myEnum.ts = new Date().getTime();
                log('enum:' + newStateId)
                await setObjectAsync(enumName, myEnum);
                Promise.resolve(true);
            } catch (e) {log(e,'error')}
        }
    }
    Promise.resolve(false);
}

init()