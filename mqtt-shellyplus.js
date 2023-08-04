//v0.11
//Datenpunkt .ts löschen, 
//.ts wird jetzt auch aktualisiert wenn der GetStatus() ein Update liefert

const prefix = '0_userdata.0.MQTT' // darunter wird gespeichert
const suchPrefix = 'mqtt.0.shellies2' // hier kommen die Daten her und begrenzen das ganze auf einen subtopic... Einfach das was im Topic bei allen Shellies gleich ist, muß hier stehen und davor die mqtt instanz
const topicPrefix = 'shellies2' // hier muss der Teil von suchPrefix stehen der im Topic der shellys enthalten ist. Ohne die mqtt instanz

const DEBUG = false

async function setValues(json, srcID) {
    let result = null
    let id = prefix
    if (json.hasOwnProperty('id')) {
        id += '.' + srcID
        result = json['result']
        if (json['id'] == 1) {
            if(!result.hasOwnProperty('id')) return
            id+='.switch:'+result["id"]
        } else if (json['id'] == 3) {
            result["device-id"] = json['src']
            result["source-dp"] = suchPrefix+'.' + srcID
        } else {
            //log(json)
            return
        }
    } else if (json.hasOwnProperty('params')){
        id += '.' + srcID
        result = json['params']
    }
    
    setKeys(id, result)

    async function setKeys(id, result) {
        if (result === null) return
        if (typeof(result) === 'object') {
            if (result.isArray) {
                for (let a = 0; a<result.length; a++) {
                    setKeys(id+'.'+a, result[a])
                }
            } else {
                for (let key in result) {
                    setKeys(id+'.'+key, result[key])
                }
            }
        } else {
            let temp = id.split('.')
            let popName = temp[temp.length-1];
            if (!stateDefintion.hasOwnProperty(popName) ) popName = ''
            if (popName && stateDefintion[popName]["read"]!== undefined) {
                result = stateDefintion[popName]["read"](result)
            } 
            if (popName && stateDefintion[popName]["linked"] !== undefined) {
                let a = 0;
                let nid = stateDefintion[popName]["linked"], tnid = ''
                while ( nid.replace("../",'') != nid) {
                    nid = nid.replace("../", '')
                    a++
                    
                }
                temp = temp.slice(0, temp.length-a)
                temp[temp.length-1] = nid
                nid = temp.join('.')           
                if (existsState(nid)) setState(nid,result,true)
            }
            if (existsState(id)) {
                setState(id, result, true)
            } else {
                let common = {name:'no name', type:typeof(result), write:false}
                if (popName) {
                    let def = stateDefintion[popName]
                    for (let d in def.common) {
                        common[d] = def.common[d] 
                    }
                }
                try {
                    await createStateAsync(id, result,common)
                } catch(e) {log(e)}
            }
        }
        return Promise.resolve(true);
    }
    return Promise.resolve(true);
}

const stateDefintion = {
    "output": {
        "common": {
            "name": "Schalter1",
            "write": true,
            "role": "switch",
        },
        "trigger": true,
        "write": '"method":"Switch.Set",  "params":{"id":0,"on":$VALUE$}}',

    },
    "tC": {
        "common": {
            "name": "Temperatur",
            "role": "value.temperature",
            "unit": "C°",
        },
        "trigger": false,
    },
    "ts": {
        "common": {
            "name": "seit letztem Reset",
            "role": "value.datetime",
            "type": "number",
            "unit": "ms"
        },
        "trigger": false,
    },
    "unixtime": {
        "common": {
            "name": "seit letztem Reset",
            "role": "value.datetime",
            "type": "number",
            "unit": "ms"
        },
        "trigger": false,
        "linked": "../ts" 
    }
}
for (let d in stateDefintion) {
    if (stateDefintion[d].hasOwnProperty('trigger') && stateDefintion[d]["trigger"]) {
        let r = prefix
        let reg = '^'+regexEscape(r)+'.*\.'+d+'$'
        const regex = new RegExp(reg, 'g');
        on({id:regex, ack:false}, function (obj) {
            let id = ''
            let aid = obj.id.split('.')
            let a = aid.length-1
            while(a-- >= 0) {
                aid.splice(a,Infinity)
                let t = aid.join('.')+'.source-dp'
                log(t)
                if (existsState(t)) {
                    id = getState(t).val
                    break;
                }
            }
            if (id) {
                id = id.replace(suchPrefix,'')
                id = topicPrefix + id
                id = id.split('.').join('/')
                let v = obj.state.val
                let s = obj.id.split('.').pop()
                let msg = {topic: id+'/rpc', message: '{"id":4, "src":"'+id+'/events/response", '+stateDefintion[s]['write'].replace('$VALUE$',v)}
                sendTo('mqtt.0', 'sendMessage2Client', msg);
                if (DEBUG) log(msg)
            }
        });
    }
}
{ 
    let r = suchPrefix
    let reg = '^'+regexEscape(r)+'.*events.*rpc$'
    const regex = new RegExp(reg, 'g');
    on({id:regex, change:'ne'}, function (obj) {
        if (!obj.state.val) return
        //if (obj.id.lastIndexOf('events.rpc') !== -1) return
        let j = JSON.parse(obj.state.val)
        let id = obj.id.replace(suchPrefix,'')
        let aId = id.split('.')
        for (let a = 0; a < aId.length; a++) {
            if (!aId[a]) aId.splice(a,1)
            if (aId[a] == 'events') aId.splice(a,Infinity)
        }
        id = aId.join('.')
        if (DEBUG) log('id: ' + id + ' - ' +JSON.stringify(j))
        setValues(j, id)
    });
}
schedule('4 */20 * * * *',getStatus) 

function getStatus() {
    let s = $('state(id='+suchPrefix+'.*.events.rpc)')
    s.each(id =>  {
        let path  = id.split('.').slice(0,-2).join('.')
        let topic = topicPrefix ? topicPrefix+'.' : '' 
        topic += path.replace(suchPrefix+'.','')
        topic = topic.replaceAll('.','/') 
        let to = topic + '/events/response'
        topic +='/rpc'
        sendTo('mqtt.0', 'sendMessage2Client', {topic: topic, message: '{"id":3, "src":"'+to+'", "method":"Shelly.GetStatus", "params":{"id":0}}'});  
    })
}
//on(/^system\.adapter\..*\.\d+\.memRss$/
function regexEscape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
getStatus()
