export {}
/**
 * Verwaltung von Nachrichten für Nspanel Screensaver.
 * Nachrichten werden gesendet in dem ein Text oder Json in die Datenpunkt die auf IncomingMessage enden geschrieben wird.
 * 
 * TEXT: Kann nach dem Muster headline#text verwendet werden. z.B. 'nur headline', '#nur text' oder 'headline#text'
 * 
 * JSON: Das Json hat folgendes Format: {id: string, headline: string, msg: string, clear: number, change: number}
 * Normale Nachricht: Alle Datenpunkte sind optional
 * { 
 * headline: Die Überschrift 1. Zeile 
 * msg: Der Nachrichtentext 2. Zeile, 
 * clear: Zeit in Sekunden die die Nachricht angezeigt werden soll, 
 * change: Wenn mehrere Nachrichten für dieses Panel anstehen, die Zeit die diese Nachricht angezeigt werden soll, bevor die nächste angezeigt wird.. 
 * }
 * 
 * Nachrichten die permanent angezeigt werden sollen:
 * Wenn eine Nachricht die Eigenschaft "id" hat, wird sie solange angezeigt bis einen leere Nachricht mit dieser ID geschickt wird. z.B. {id: 'Haustür steht offen'} 
 * 
 */


/**
 * Ein Array das auf die Ordnernamens ScreensaverInfo zeigt. In diesem Ordner liegen die Datenpunkte die auf 'popupNotifyHeading', 'popupNotifyText' enden.
 *
 */
const nspanelPath: string[] = [
    '0_userdata.0.NSPanel.1.ScreensaverInfo',
];

/**
 * Datenpfad an dem Datenpunkte von diesem Skript erstellt werden. Es wird ein Unterordner unterhalb dieses Datenpunktes erstellt.
 * Muss mit javascript oder 0_userdata.0 beginnen.
 */
const userPath: string = '0_userdata.0.NSPanel';


/**********************************************************************************************************************************
 *  Keine Konfiguration mehr ab hier
 **********************************************************************************************************************************/



/** 
 * Zeit in Sekunden die eine Nachricht angezeigt werden soll.
 */
let clearTime: number = 30;

/** 
 * Zeit in Sekunden die eine Nachricht mindestens angezeigt werden soll, wenn weitere Nachricht auf die Anzeige warten.
 */
let changeTime: number = 10;




let messageDB: messageObjectType[] = []
const path = `${userPath}.screen_messages`
type messageObjectType = {id: string, panel: number, headline: string, msg: string, clear: number, change: number, set: number, setChange: number}
type messageArrivedType = Partial<Pick <messageObjectType,'id' | 'headline' | 'msg' | 'clear' | 'change'>>
let globalIndex: {[key: number]: messageObjectType | undefined} = {};

async function init() {
    // check config
    for (const dp of nspanelPath) {
        for (const enddp of ['popupNotifyHeading', 'popupNotifyText']) {
            const id = `${dp}.${enddp}`
            if (!existsState(`${id}`)) {
                log(`Error in configuration! ID in nspanelPath doesn't exist! Search for ${id} --- ${dp} is wrong!`, 'error');
                log('Script stopped!', 'error')
                stopScript(scriptName);
                return;
            }
        }
    }
    if (!userPath.startsWith('javascript') && !userPath.startsWith('0_userdata.0')) {
        log(`Error in configuration! userPath must start with javascript or 0_userdata.0! Your config value is ${userPath},`, 'error');
        log('Script stopped!', 'error')
        stopScript(scriptName);
        return;
    }
    
    await extendObject(`${path}`, statesObjects.screen_messages);
    await extendObject(`${path}.config`, statesObjects.config)
    await extendObject(`${path}.config.clearTime`, statesObjects.clearTime)
    await extendObject(`${path}.config.changeTime`, statesObjects.changeTime)
    await sleep(200);
    clearTime = getState(`${path}.config.clearTime`).val;
    changeTime = getState(`${path}.config.changeTime`).val;
    on({id: `${path}.config.clearTime`, change: 'any', ack: false}, (obj) => {
        clearTime = obj.state.val;
        setState(obj.id, obj.state.val, true);
    })
    on({id: `${path}.config.changeTime`, change: 'any', ack: false}, (obj) => {
        changeTime = obj.state.val;
        setState(obj.id, obj.state.val, true);
    })
    const obj = statesObjects.incomingMessage;
    obj.common.name = 'Eingehende Nachrichten an Alle';
    await extendObject(`${path}.globalPanelIncomingMessage`, obj);
    await sleep(100);
    on({id: `${path}.globalPanelIncomingMessage`, change: 'any', ack: false}, (obj) => {
        nspanelPath.forEach((dp, i) => {
            setState(`${path}.panel${i}IncomingMessage`, obj.state.val, false);
        });
        setState(obj.id, obj.state.val, true);
    })
    nspanelPath.forEach(async (dp, i) => {
        const obj = statesObjects.incomingMessage;
        obj.common.name = `Panel ${i+1} - Eingehende Nachrichten`;
        await extendObject(`${path}.panel${i}IncomingMessage`, obj);
        await sleep(100);
        on({id: `${path}.panel${i}IncomingMessage`, change: 'any', ack: false}, (obj) => {
            let value = obj.state.val as Partial<messageArrivedType>;
            try {
                value = JSON.parse(obj.state.val) as Partial<messageArrivedType>;
            } catch (e) {
            }
            if (typeof value != 'object') {
                value = {} as Partial<messageArrivedType>;
                const rows = obj.state.val.split('#');
                if (rows && rows.length > 2) {
                    const test = rows.slice(2);
                    log(`You add more as one # to the string message! Ignore this part "${test.join('#')}"!`, 'warn')
                }
                value.headline = rows[0] ? rows[0] : '';
                value.msg = rows[1] ? rows[1] : '';
            }
            if ((value.id !== undefined || value.id != '') && !value.headline && !value.msg) {
                const index = messageDB.findIndex(a=> a.id == value.id)
                if (index != -1) {
                    messageDB[index].id = undefined;
                    messageDB[index].set = 1;
                    handleMessages(messageDB[index].panel)
                    return;
                }
            }
            const n = obj.id.replace(`${path}.panel`, '').replace('IncomingMessage', '');
            if (n == '' || n == undefined) return;
            const panel = parseInt(n)
           
            const newMsg: messageObjectType = {
                id: value.id || undefined,
                panel: panel, 
                headline: value.headline || '', 
                msg: value.msg || '',
                clear: value.clear || clearTime,
                change: value.change || changeTime,
                set: 0,
                setChange: 0,
            }
        
            const index = globalIndex[panel] ? messageDB.indexOf(globalIndex[panel]) : -1;
            if (index == -1 || index == messageDB.length -1) {
                messageDB.push(newMsg);
            } else {
                messageDB.splice(index+1,0,newMsg);
            }
            
            setState(obj.id, obj.state.val, true);
            handleMessages(panel)
        })
    });
}

async function handleMessages(panel: number) {
    if (panel != -1) {
        
        messageDB = messageDB.filter(a => a.id || a.panel != panel ||  !(a.panel == panel && a.set != 0 && a.set < new Date().getTime()));
        const messages = messageDB.filter(a => a.panel == panel);
        let oldMessage: messageObjectType | undefined = undefined;
        if (globalIndex[panel] !== undefined) {
            oldMessage = globalIndex[panel];
            if (messages.length > 0 && oldMessage.setChange > new Date().getTime() && messageDB.indexOf(oldMessage) != -1) {
                return;
            } 
        }
        if (messages.length > 0) {
            let index = messages.indexOf(oldMessage);
            index = (index + 1) % messages.length;
            const msg = messages[index];
            if (msg.set == 0) {
                msg.set = new Date().getTime() + messageDB[index].clear * 1000 + 1;
                setTimeout(handleMessages, msg.set - new Date().getTime(), msg.panel);
            }
            msg.setChange = new Date().getTime() + msg.change * 1000 + 1;
            setTimeout(handleMessages, msg.setChange - new Date().getTime(), msg.panel);
            globalIndex[panel] = msg;
            await setStateAsync(`${nspanelPath[msg.panel]}.popupNotifyHeading`, msg.headline, false);
            await setStateAsync(`${nspanelPath[msg.panel]}.popupNotifyText`, msg.msg, false);
            return;
        }
        await setStateAsync(`${nspanelPath[panel]}.popupNotifyHeading`, '', false);
        await setStateAsync(`${nspanelPath[panel]}.popupNotifyText`, '', false);
    } 
}

const statesObjects: {[key: string]: iobJS.StateObject | iobJS.ChannelObject | iobJS.DeviceObject} = {
    screen_messages: {
        _id: '',
        type: 'device',
        common: {
            name: 'Nachrichtenverwaltung für Nspanel'
        },
        native: {}
    },
    config: {
        _id: '',
        type: 'channel',
        common: {
            name: 'Standardzeiteinstellungen'
        },
        native: {}
    },
    incomingMessage: {
        _id: '',
        type: 'state',
        common: {
            name: 'Eingehende Nachrichten',
            type: 'string',
            role: 'json',
            def: '{}',
            read: true,
            write: true
        },
        native:{}
    },
    clearTime: {
        _id: '',
        type: 'state',
        common: {
            name: 'Wartezeit bevor Löschung',
            type: 'number',
            role: 'value',
            def: clearTime,
            unit: 's',
            read: true,
            write: true
        },
        native:{}
    },
    changeTime: {
        _id: '',
        type: 'state',
        common: {
            name: 'Wartezeit bevor Wechsel',
            type: 'number',
            role: 'value',
            unit: 's',
            def: changeTime,
            read: true,
            write: true
        },
        native:{}
    },
}
init();