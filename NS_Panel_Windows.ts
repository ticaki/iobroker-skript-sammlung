
/**
 *  In diesem Ordner werden die Datenpunkt erstellt, die zum Daten sammeln verwendet werden
 */
const Username_Path: string = '0_userdata.0.NSPanel.1.usr';

/**
 * Hier werden die Aliase erstellt die auf obrige States verweisen
 */
const Alias_Path = 'alias.0.NSPanel.1.usr';

/**
 * Das hier sind die Teile der Aufzählungsid an denen man erkennt in welchem geschoss ein Sensor ist
 * Aufzählungsids kann man Staffeln so das z.B. OG einen Raum Bad enthält das kann dann so aussehen
 * enum.rooms.Haus.second_floor ist og / enum.rooms.Haus.second_floor.Bad ist das bad.
 */
const Floors = ['enum.rooms.Haus.ground_floor','enum.rooms.Haus.cellar','enum.rooms.Haus.second_floor'];

/**
 * Das sind die Funktionsauszählungspunkte an denen Fenstersensoren gefunden werden.
 * weitere Infos zu Selectoren: https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#---selector
 */
const Selector = 'state(functions=sensor)(functions=window)';

/**
 * entferne diese Teil des Names ausser der Name ist dann leer
 * z.B. Giebelfenster links wird zu Giebel links
 */
const RemoveFromName = ['fenster'];

/**
 * Entferne alles vom Name was for diesem Zeichen kommt und verwende nur den letzten Zeil des Strings.
 * z.B. og/wohnzimmer/lampe wird zu lampe
 */
const TakeLastPartFromNameDivider = ['/'];


/**
 *  Check configuration
 */


const def = {
    window: {
        open:
        {
            id: 'ACTUAL',
            type: 'boolean',
            role: 'sensor.window',
        },
    }

}

let allWindows: iobJS.QueryResult;

schedule('4 * * * *',() => {main()})
init();

async function init () {
    if (!Username_Path || typeof Username_Path != 'string' || Username_Path.split('.').length <= 3 || !Username_Path.startsWith('0_userdata.0')) {
        log(`Username_Path has a not allowed value! value: ${Username_Path}`,'error');
        return;
    }
    if (!Alias_Path || typeof Alias_Path != 'string' || Alias_Path.split('.').length <= 3 || !Alias_Path.startsWith('alias.0')) {
        log(`Alias_Path has a not allowed value! value: ${Alias_Path}`,'error');
        return;
    }
    if (!Floors || typeof Floors != 'object' || !Array.isArray(Floors) || !Floors.every(a => typeof a == 'string' && a != '')) {
        log(`Floors has a not allowed value! value: ${JSON.stringify(Floors)}`,'error');
        return;
    }
    try {
        if ($(Selector).length == 0) {
            log(`Selector dont find any state! value: ${Selector}`,'error');
            return;
        }
    } catch (e) {
        log(`Syntax error in Selector! value: ${Selector}`,'error');
        return;
    }
    if (!RemoveFromName || typeof RemoveFromName != 'object' || !Array.isArray(RemoveFromName) || !RemoveFromName.every(a => typeof a == 'string')) {
        log(`RemoveFromName has a not allowed value! value: ${JSON.stringify(RemoveFromName)}`,'error');
        return;
    }
    if (!TakeLastPartFromNameDivider || typeof TakeLastPartFromNameDivider != 'object' || !Array.isArray(TakeLastPartFromNameDivider) || !TakeLastPartFromNameDivider.every(a => typeof a == 'string')) {
        log(`TakeLastPartFromNameDivider has a not allowed value! value: ${JSON.stringify(TakeLastPartFromNameDivider)}`,'error');
        return;
    }

    await extendObjectAsync(clearDP(`${Username_Path}`),{type: 'folder',common: {name: "Benutzerdefiniert",},native: {}});
    await extendObjectAsync(clearDP(`${Username_Path}.Fenster`),{type: 'folder',common: {name: "Offene Fenster",},native: {}});
    await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus`),{type: 'folder',common: {name: {de: "Alle Fenster"}},native: {}});
    await extendObjectAsync(clearDP(`${Alias_Path}.Fenster`),{type: 'folder',common: {name: {de: "Alle Fenster"}},native: {}});
    await extendObjectAsync(clearDP(`${Alias_Path}.Fenster.haus`),{type: 'channel',common: {name: {de: 'Haus'},role: 'window'},native: {}});
    await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.open`),{type: 'state',common: {name: {de: 'Geöffnete Fenster'},type: 'boolean',read: true,write: false,role: 'value'},native: {}});
    await extendOneTimeAlias(clearDP(`${Alias_Path}.Fenster.haus`),clearDP(`${Username_Path}.Fenster.haus.open`),'open','window');
    main();
}

async function main () {
    log('Reinit states!')
    let windows = $(Selector);
    let allgood = true;
    if (!allWindows || windows.length != allWindows.length) allgood = false;
    else {
        for (const a in allWindows) {
            if (windows[a] !== allWindows[a]) {
                allgood = false;
                break;
            }
        }
    }
    if (!allgood) {
        for (const a in allWindows) {
            unsubscribe(allWindows[a]);
        }
        let changed = true;
        if (changed) {
            if (await existsObjectAsync(clearDP(`${Username_Path}.Fenster.haus`))) await deleteObjectAsync(clearDP(`${Username_Path}.Fenster.haus`),true);
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus`),{type: 'channel',common: {name: {de: "Alle Fenster"},role: 'window'},native: {}});
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.open`),{type: 'state',common: {name: {de: 'Geöffnete Fenster'},type: 'boolean',read: true,write: false,role: 'value'},native: {}});
            await extendObjectAsync(clearDP(`${Alias_Path}.Fenster.haus`),{type: 'channel',common: {name: {de: 'Haus'},role: 'window'},native: {}});
            await extendOneTimeAlias(clearDP(`${Alias_Path}.Fenster.haus.open`),clearDP(`${Username_Path}.Fenster.haus`),'open','window');
        }
        allWindows = windows;
        for (const a of allWindows) {
            if (!existsState(a)) continue;
            const pos = getRoom(a)
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.${pos.floor}`),{type: 'channel',common: {name: {de: pos.floor},role: 'window'},native: {}});
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}`),{type: 'channel',common: {name: {de: pos.room},role: 'window'},native: {}});
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.open`),{type: 'state',common: {name: {de: "Geöffnete Fenster"},role: 'value',type: 'boolean',read: true,write: false},native: {}});
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}.open`),{type: 'state',common: {name: {de: "Geöffnete Fenster"},role: 'value',type: 'boolean',read: true,write: false},native: {}});

            await extendObjectAsync(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}`),{type: 'channel',common: {name: {de: pos.room},role: 'window'},native: {}});
            await extendObjectAsync(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.room`),{type: 'channel',common: {name: {de: pos.room},role: 'window'},native: {}});
            await extendObjectAsync(clearDP(`${Alias_Path}.Fenster.${pos.floor}.floor`),{type: 'channel',common: {name: {de: pos.floor},role: 'window'},native: {}});
            await extendOneTimeAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.floor`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.open`),'open','window');
            await extendOneTimeAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.room`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}.open`),'open','window');
            await extendButtontextStateAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.floor`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}`),pos.floor);
            await extendButtontextStateAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.room`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}`),pos.room);

            //await extendButtontextStateAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.room`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}`), pos.room)
            const newId = a.split('.').slice(0,3).join('.');

            const {theName,endNameDP} = getNames(newId);
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}.${endNameDP}`),{type: 'channel',common: {name: {de: theName.replace('_',' ')}},native: {}});
            await extendObjectAsync(clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}.${endNameDP}.open`),{type: 'state',common: {name: {de: theName.replace('_',' ')},role: 'value',type: 'boolean',read: true,write: false},native: {}});
            await extendObjectAsync(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.${endNameDP}`),{type: 'channel',common: {name: {de: theName.replace('_',' ')},role: 'window'},native: {}});
            await extendOneTimeAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.${endNameDP}`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}.${endNameDP}.open`),'open','window');
            await extendButtontextStateAlias(clearDP(`${Alias_Path}.Fenster.${pos.floor}.${pos.room}.${endNameDP}`),clearDP(`${Username_Path}.Fenster.haus.${pos.floor}.${pos.room}.${endNameDP}`),theName.replace('_',' '))

            on({id: a,change: 'any'},() => {
                countWindows()
            })


        }
    }
    countWindows()
}

function countWindows () {
    let openWindows = 0;
    const oW = {};
    for (const a of allWindows) {
        if (!existsState(a)) continue;
        const room = getRoom(a);
        oW[room.floor] = oW[room.floor] || {count: 0};
        oW[room.floor][room.room] = oW[room.floor][room.room] || {count: 0};
        let open = false;
        if (getState(a).val) {
            openWindows++
            oW[room.floor][room.room].count++
            oW[room.floor].count++
            open = true;
        }
        const newId = a.split('.').slice(0,3).join('.');
        const {theName,endNameDP} = getNames(newId);
        oW[room.floor][room.room][endNameDP || 'Fenster'] = open;
    }
    for (const floor in oW) {
        if (floor == 'count') continue;

        setState(clearDP(`${Username_Path}.Fenster.haus.${floor}.open`),(oW[floor].count > 0),true);
        for (const room in oW[floor]) {
            if (room == 'count') continue;
            setState(clearDP(`${Username_Path}.Fenster.haus.${floor}.${room}.open`),(oW[floor][room].count > 0),true);
            for (const window in oW[floor][room]) {
                if (window == 'count') continue;
                //log(clearDP(`${Username_Path}.Fenster.haus.${floor}.${room}.${window}.open`))
                setState(clearDP(`${Username_Path}.Fenster.haus.${floor}.${room}.${window}.open`),!!(oW[floor][room][window]),true);
            }
        }
    }
    setState(clearDP(`${Username_Path}.Fenster.haus.open`),(openWindows > 0),true);
}

function getRoom (dp): {room: string,floor: string} {
    //@ts-ignore
    let enums = getObject(dp.replace('.available',''),'rooms').enumIds;//.enumNames[0];
    let levelName: iobJS.StringOrTranslated | undefined;
    let roomName: iobJS.StringOrTranslated | undefined;
    for (const id of enums) {
        for (const floor of Floors) {
            if (id.includes(floor)) {
                levelName = (getObject(floor)).common.name
                levelName = typeof levelName == 'object' ? levelName.de : levelName
                roomName = (getObject(id)).common.name
                roomName = typeof roomName == 'object' ? roomName.de : roomName
                break;
            }
        }
    }

    return {room: roomName as string || 'Technik',floor: levelName as string || 'Hauptgeschoss'}
}

function clearDP (dp: string) {
    return dp.replace(/[^0-9A-Za-z\._-]/gu,'_')
}

async function extendOneTimeAlias (id,dp,key,role) {
    const definition = def[role];
    for (const a in definition) {
        if (key == a) {
            for (const alias of (Array.isArray(definition[a]) ? definition[a] : [definition[a]])) {
                key = alias.id;
                await extendObjectAsync(`alias.0.NSPanel.1.usr`.replace(' ','_'),{_id: '',type: 'folder',common: {name: {en: 'Userdefined Values',de: 'Benutzerdefinierte Werte'}},native: {}});

                const obj = getObject(dp);
                if (!obj) return;
                obj.type = 'state';
                obj.common.alias = obj.common.alias || {};
                obj.common.alias.id = dp;
                obj.common.type = alias.type;
                obj.common.role = alias.role;
                obj.common.states = alias.states;
                obj.common.alias.read = alias.read;
                obj.common.alias.write = alias.write;
                await extendObjectAsync(clearDP(id + '.' + key),obj);
            }
        }
    }
}
async function extendButtontextStateAlias (id,dp,text): Promise<void> {
    const obj: any = {
        _id: '',
        type: 'state',
        common: {
            name: 'Text for Menu',
            type: 'string',
            role: 'text',
            read: true,
            write: false,
        },
        native: {}
    }
    dp = dp + '.BUTTONTEXT';
    await extendObjectAsync(dp,obj);
    await sleep(20);
    await setStateAsync(dp,text,true);
    obj.type = 'state';
    obj.common.alias = obj.common.alias || {};
    obj.common.alias.id = dp;
    obj.common.type = 'string';
    obj.common.role = 'text';
    obj.common.read = true;
    obj.common.write = false;
    await extendObjectAsync(clearDP(id + '.BUTTONTEXT'),obj);

}

function getNames (dp) {
    let theName = ''
    if (existsObject(dp)) theName = getObject(dp).common.name;
    theName = theName && typeof theName == 'object' ? (theName as any).de : theName;
    for (const div of TakeLastPartFromNameDivider) {
        if (theName && typeof name == 'string' && theName.split(div).length > 0)
            theName = theName.split(div)[theName.split(div).length - 1]
    }
    const endNameDP = theName;
    for (const s of RemoveFromName) {
        if (theName && typeof theName == 'string') {
            const newName = theName.replace(s,'');
            theName = newName != '' ? newName : theName;
        }
    }
    if (theName == '') {
        theName = 'empty';
        log(`Then common.name of ${dp} is empty! Not allowed`,'warn');
    }
    return {theName: theName,endNameDP: endNameDP};
}
