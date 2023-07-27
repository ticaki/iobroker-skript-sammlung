
// id muß ein gültiger String sein, alles weitere is optional
async function createFolderAsync(id, name='', desc='') {
    return Promise.resolve(await _createObject(id, 'folder', name, desc))
}
 
async function createChannelAsync(id, name='', desc='') {
    return Promise.resolve(await _createObject(id, 'channel', name, desc))
}
 
async function createDeviceAsync(id, name='', desc='') {
     return Promise.resolve(await _createObject(id, 'device', name, desc))
}
async function _createObject(id, typ, name='', desc='') {
    try {
        if(existsObject(id)) log('Objekt: ' + id + ' existiert bereits!', 'warn');
        else {
            const obj = {
                type: typ,
                common: {
                    name: name,
                    desc: desc
                },
                native: {}
            }
            if (!id || typeof id !== 'string') {
                throw new Error('Fehler in _createObject Parameter 1 ist kein string')
            }
            if (!(id.startsWith('alias.0') || id.startsWith('0_userdata.0') || id.startsWith('mqtt'))) {
                throw new Error('Fehler in _createObject Parameter 1: ' + id.split('.').slice(0,2).join('.') + ' nicht erlaubt')
            } 
            await setObjectAsync(id, obj);
        }
        return Promise.resolve(true);
    } catch (error) {
        log(error + '!', 'error')
    }
    return Promise.resolve(false);
}
