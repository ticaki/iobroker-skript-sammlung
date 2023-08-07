//bitte das folgende Skript noch darüber kopieren oder gleich als globales Skript anlegen
//globaleCreateFunktionen.js

/* Schreibt "Warnungen" ins Log und versendet 1 mal pro Tag/Start Meldungen per Telegram */
/* Für colle Funktionalität muß dieses auf einer eigenen Javascriptinstanz alleine laufen. */
/* v0.2.3 Logausgabe beinhaltet den vollen Pfad zum Konfigurationspunkt, nur cp in die Objektszeile des Objektbrowsers und man findet ihn
/* v0.2.2 system.adapter.* wird nun direkt unter adapter einsortiert
/* Benennung des Datenzweigs angepasst.
/* test auf true/false/größer/kleiner benutzt Zeit und testet last change
/* v0.2.1 Mit Versionsverwaltung, Fehler der Vorversion im Datenbaum werden behoben */

const setFunctionToAllStates = false

const enumFunctions = 'online' // die Funktion die in Aufzählung für dieses Skript zur Verfügung gestellt wird, muß den überwachten States zu geordnet werden

// Pfad an dem alles erstellt werden soll, hier kann man die Überwachung deaktivieren und einstellen
const path = '0_userdata.0.Kontrollzentrum.Sensorueberwachung'

// wie sieht die Zeit in der Telegramnachricht aus
const options = "hh:mm / DD.MM"

//telegramm user
const user = 'Tim'

// Hier wird der Meldungsspeicher zurück gesetzt
schedule('30 8 * * *', function() { msg = {}})

//für ein Update ab hier kopieren 1234567
const version = 0.23
var oldVersion = 0;
var firstRun = true;
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
        'nuki.*.timestamp',
        'zigbee2mqtt.*.last_seen'
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
        "art": {"type": "number", "def":0, "desc": "ts, lc, true, false Worauf geprüft werden soll", states:{"0": "Zeitstempel", "1": "Letzte Änderung", "2": "true = offline", "3":"false = offline", "4":"nummer < testwert = offline", "5":"nummer > testwert = offline"}},
        "activ": {"type": "boolean", "def":true, "desc": "An/Auschalten"},
        "zeit": {"type": "string", "def":"30m", "desc": "d,h,m bis art einen Benachrichtigung auslöst"},
        "testwert": {"type": "number", "def":0, "desc": "zu den Arten größer und kleiner der Testwert"},
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
        },
        "last_seen": {
            "stateTyp": "state",
            "art": {"def":0},
            "zeit": {"def":"1d"},
        },
        
    }
}

const pathToState = path + '.gerät'
const pathToAdapter = path + '.adapter'
const pathToScript = path + '.script'
const paths = [pathToAdapter,pathToState,pathToScript]

var msg = {}

async function init() {
    if (setFunctionToAllStates ) {
        for (const idPart of watchingDevice.states) {
            let s = Array.prototype.slice.apply($('state(id='+idPart+')'))
            for (const id of s) {
                await addToEnum('enum.functions.'+enumFunctions,id)
            }
        }
    }
    if (existsObject(path+'.version')) oldVersion = getState(path+'.version').val
    if (!existsObject(path)) {
        await createFolderAsync(path, 'Ausfallüberwachung')
        if (!oldVersion) oldVersion = version
    }
    if (!existsObject(path+'.version')) await createStateAsync(path+'.version', 0, {"type":'number', "name":'Skriptversionsnummer', "read":true, "write":false}, )
    if (!existsObject(pathToState)) await createFolderAsync(pathToState, 'Geräteüberwachung')
    if (!existsObject(pathToAdapter)) await createFolderAsync(pathToAdapter, 'Adapterüberwachung')
    if (!existsObject(pathToScript)) await createFolderAsync(pathToScript, 'Skriptüberwachung')
    setState(path+'.version', version, true)
    //work()
    return Promise.resolve(true);
}

// Nachrichten werden nur einmal am Tag versendet, rücksetzen um 7:30 


setInterval(work, 900000)

schedule('15 10 * * 7', function(){work(true)})

async function work(long = false){ 
    let devs = Array.prototype.slice.apply($('state(functions='+enumFunctions+')'))
    for (const sel of watchingDevice.adapter ) devs = Array.prototype.slice.apply($('state(id='+sel+')')).concat(devs)
    for (const sel of watchingDevice.scripts ) devs = Array.prototype.slice.apply($('state(id='+sel+')')).concat(devs)
    const now = new Date().getTime()
    for (let a=0; a<devs.length; a++ ) {
        try {
            let dp = devs[a]
            if (!existsObject(dp)) continue
            let v = {}
            v = await readDP(dp)
            let lc = getState(v.dp).lc // ts oder lc
            let ts =  getState(v.dp).ts
            let cts = v.zeit
            if (long && !v["ts_langzeit_prüfung"]) continue
            if (!v.activ) continue
            if (long) cts = v.langzeit
            let alarm = false;
            switch (v.art) {//"ts, lc, true, false Worauf geprüft werden soll"},
                case 0:// test auf ts
                alarm = ts + cts < now            
                break;
                case 2:// test auf true oder false
                case 3:
                alarm = getState(v.dp).val 
                if (v.art == 3) alarm = !alarm
                alarm = alarm && (lc + cts < now)
                if (long && !alarm) alarm = !(ts + cts < now)
                if (!alarm || long) break;
                case 1://Test auf lc
                alarm = lc + cts < now
                break;
                case 4:
                alarm = getState(v.dp).val < v.testwert
                alarm = alarm && (lc + cts < now) 
                break;
                case 5:
                alarm = getState(v.dp).val > v.testwert
                alarm = alarm && (lc + cts < now)
                break;
            }
         
            if (alarm){
                switch(v.devTyp) {
                    case 'adapter':
                    case 'script':
                    log(dp + ' ist deaktiviert!', 'warn')
                    break
                    case 'state':
                    log(dp + ' ist offline!', 'warn')
                    break
                }
                log(v.id + ' Konfigurationspunkt', 'warn')
            }
            if (alarm) {
                if(msg[dp] === undefined) msg[dp] = {} 
                msg[dp].ts = formatDate(lc,options)
                msg[dp].devTyp = v.devTyp
                if (v.devTyp != "script" ) {
                    if (existsObject(v.id)) {
                        msg[dp].name = getObject(v.id).common.name
                    } else {
                        msg[dp].name = getObject(dp).common.name
                    } 
                    msg[dp].adapter = dp.split('.').slice(0,2).join('.')  
                } else {
                    msg[dp].name = v.dp.split('.').slice(3).join('.')
                }          
                if (msg[dp].name.de !== undefined) msg[dp].name = msg[dp].name.de     
                
            } else {
                delete msg[dp]
            }
        } catch(e) {log(e);log(2)}
    }
    let messageObj = {}
    let message = ''
    for (let dp in msg) {
        let m = msg[dp]
        if (m.msg !== undefined) continue
        m.msg = ''
        if (m.adapter !== undefined) {m.msg = m.adapter+': '}
        m.msg += m.name + " - " + m.ts + '\n'
        if (messageObj[m.devTyp] === undefined) messageObj[m.devTyp] = m.devTyp + ':\n'
        messageObj[m.devTyp] += m.msg
    }
    for (let t in messageObj) {
        message+=messageObj[t]+'\n'
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
        else message = 'Geräte/Software offline\n\n' + message
        sendTo('telegram', {user: user, text: message });         
    }
    oldVersion = version
    firstRun = long
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
    if (devTyp == 'adapter') {
        let tid = id;
        if (tid.startsWith('system.adapter.')) tid = tid.replace('system.adapter.','')
        tPath = pathToAdapter +'.'+ tid
        
    }
    else if (devTyp == 'script') {
        id = dp.split('.').slice(3).join('.')
        tPath = pathToScript +'.'+ id
    }
    else tPath = pathToState +'.'+ id
    var result = {"devTyp": devTyp} 
    if (existsObject(tPath)) {
        for (let p in stateDef["_default"]) {
            if (!existsState(tPath +'.'+ p)) result = await _createSingleState(tPath, p, result)
            else { 
                result[p] = getState(tPath +'.'+ p).val
                if (!getState(tPath +'.'+ p).ack) setState(tPath +'.'+ p, result[p], true)
            }
        }
        if (firstRun){          
            if (devTyp === 'state') {
                let nid = id.split('.').slice(0,3).join('.');
                let name = ''
                if (existsObject(nid)) name = getObject(nid).common.name
                if (name) extendObject(tPath.split('.').slice(0,-1).join('.'), {common:{"name": name}})
            }
        }
        if (oldVersion < 0.21 && existsObject(tPath+'art')) deleteObject(tPath+'art')
        if (oldVersion < 0.21) extendObject(tPath+'.'+"art", {common:{states:{"0": "Zeitstempel", "1": "Letzte Änderung", "2": "true = offline", "3":"false = offline", "4":"nummer < testwert = offline", "5":"nummer > testwert = offline"}}})
        result.id = tPath
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
            result = await _createSingleState(tPath, p, result)
        }
    }
    if (result.zeit !== undefined) {
        let t = result.zeit
        let ts = 0;
        if (t.lastIndexOf('d') !== -1) {
            ts += parseInt(t.slice(0,-1))
        }
        ts *=24  
        if (t.lastIndexOf('h')!== -1) {
            ts += parseInt(t.slice(0,-1))
        } 
        ts*=60 
        if (t.lastIndexOf('m')!== -1) {
            ts += parseInt(t.slice(0,-1))
        }
        ts*=60000 
        result.zeit = ts
    } else result.zeit = 0
    if (result.langzeit !== undefined) {
        let t = result.langzeit
        let ts = 0;
        if (t.lastIndexOf('d')!== -1) {
            ts += parseInt(t.slice(0,-1))
        }
        ts *=24  
        if (t.lastIndexOf('h')!== -1) {
            ts += parseInt(t.slice(0,-1))
        } 
        ts*=60 
        if (t.lastIndexOf('m')!== -1) {
            ts += parseInt(t.slice(0,-1)) 
        }
        ts*=60000 
        result.langzeit = ts
    } else result.langzeit = 0
    return Promise.resolve(result);
    async function _createSingleState(tPath, p, result) {
        let o = {"type": stateDef["_default"][p].type, name:p, desc:stateDef["_default"][p].desc}
        let def = stateDef["_default"][p].def
        if (lastTag && stateDef["lastTag"][lastTag][p]) def = stateDef["lastTag"][lastTag][p].def
        else if (firstTag && stateDef["firstTag"][firstTag][p]) def = stateDef["firstTag"][firstTag][p].def
        if (p == "id") def = tPath
        if (p == "dp") def = dp
        if (stateDef["_default"][p].states !== undefined) o.states = stateDef["_default"][p].states
        await createStateAsync(tPath+'.'+p, def, o)
        result[p] = def
        return Promise.resolve(result);
    }
}

async function addToEnum(enumName, newStateId) {
    if (!await existsObjectAsync(newStateId)) {
        log(newStateId + ' not exist!', 'warn')
        return Promise.resolve(false);
    }
    let myEnum = await getObjectAsync(enumName);
    if (myEnum) {
        let pos = myEnum.common.members.indexOf(newStateId);
        if (pos === -1) {
            try {
                myEnum.common.members.push(newStateId);
                myEnum.from = "system.adapter." + "0";
                myEnum.ts = new Date().getTime();
                await setObjectAsync(enumName, myEnum);
                Promise.resolve(true);
            } catch (e) {log(e + ' add id: ' + newStateId,'error')}
        }
    }
    return Promise.resolve(false);
}

init()