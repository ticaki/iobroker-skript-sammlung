// Anwesenheitserkennung

// diesen Befehle habe ich genutzt um allen die benutzung von hping3 zu erlauben (debian bookworm) sudo setcap cap_net_raw+ep /usr/sbin/hping3
// und dann noch einen Link nach bin ln -s /usr/sbin/hping3 /usr/bin/
export {}

// logausgabe aktivieren
const useLog:boolean = true

const int_face:string = 'ens18' // auf der Konsole ip addr , das ist die Bezeichnung des interfaces - oder unter /etc/network/interfaces gucken

const path:string = /*''*/ '0_userdata.0.Sensoren.Anwesenheit_hping' + '.' // der Punkt ist wichtig :)
//definition der Geräte
let devices: any[] = [ 
    {
        name: 'Tims iPhone', // name des Geräts
        ip: '192.168.178.109',
        mac: '',
        dp: path + 'tim'
        //state wird erstellt
    }/*,{
        name: 'Nochjemand', 
        ip: '192.168.178.11',
        mac: '',
        dp:''
    }*/

]
// Datenpunkt des "irgendwer ist zurhause" Datenpunkts
const anyone_dp:string = '' //path + 'h.anyone'

// nix mehr ändern
let anyone_status:boolean = anyone_dp && existsState(anyone_dp) ? getState(anyone_dp).val : false
let ip:string = ''
let counter:number = -1
let stop1:boolean = false

// alle 30 sekunden
schedule('*/30 * * * * *', start)


async function start() {
    if (++counter >= devices.length){
        // alle geprüft Anyone setzen und alles zurücksetzen
        if (anyone_dp) { 
            try {
                let t:boolean = false
                for (let a of devices) if (a.state !== undefined) t = t || a.state
                if (anyone_status != t) {
                    if (!existsState(anyone_dp)) {
                        await createCustomState(anyone_dp, {"name":"irgendjemand", "type":"boolean", "def":t, "read":true, "write": false})
                    } else setState(anyone_dp, t, true)
                    if (useLog) log('Anyone wurde auf ' + (t ? 'wahr' : 'falsch') + ' gesetzt.')
                }
                anyone_status = t
            } catch(e:any) {log(e)}
        }
        counter = -1
        return
    } 
    ip = devices[counter].ip
    exec('ip neigh flush dev '+int_face+' '+ip,callback2)
}
function callback2(result, error) {
    if (stop1) return
    exec('hping3 -2 -c 10 -p 5353 -i u1 '+ip+' -q', callback3)
}
function callback3(result, error) {
    exec('arp -an '+ip+' | awk '+ip+' | grep "..:..:..:..:..:.."', callback4)
}
async function callback4(error, result) {
    let presence:boolean = false
    if (error) {
        if (useLog) log(devices[counter].name + ' nicht erreichbar')
    } else {
        if (devices[counter].mac && result.lastIndexOf(devices[counter].mac.toLowerCase()) == -1) {
            log(devices[counter].name + ' unter falscher mac Adresse gefunden!', 'warn')
        }
        if (useLog) log(devices[counter].name + ' erreichbar')
        presence = true
        
    }
    if (!devices[counter].hasOwnProperty('state'))devices[counter]["state"] = !presence
    if (devices[counter]["state"] != presence) {
        try {
            if (devices[counter]["dp"]) {
                if (!existsState(devices[counter]["dp"])) {
                    await createCustomState(devices[counter]["dp"],{"name": devices[counter].name, "type":"boolean", "def":presence, "read":true, "write": false})
                }
                setState(devices[counter]["dp"], presence ,true)
            }
        } catch(e:any) {log(e)}
    } 
    devices[counter]["state"] = presence
    start()
}

onStop(function (callback:any) {
    stop1 = true;
    callback();
}, 2000 /*ms*/);

async function createCustomState(id:string, opt:any) {
    if (!(id.startsWith('alias.0') || id.startsWith('0_userdata.0') || id.startsWith('mqtt'))) {
        throw new Error('Fehler in _createObject Parameter 1: ' + id.split('.').slice(0,2).join('.') + ' nicht erlaubt')
    } 
    await createStateAsync(id, opt)
}