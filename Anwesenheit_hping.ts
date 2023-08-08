
// logausgabe aktivieren
const useLog:boolean = true

const int_face:string = 'ens18' // auf der Konsole ip addr , das ist die Bezeichnung des interfaces - oder unter /etc/network/interfaces gucken

//definition der Geräte
let devices: any[] = [ 
    {
        name: 'Tims iPhone', // name des Geräts
        ip: '192.168.178.109',
        mac: '',
        dp:''
        //state wird erstellt
    }/*,{
        name: 'Nochjemand', 
        ip: '192.168.178.11',
        mac: '',
        dp:''
    }*/

]
// Datenpunkt des "irgendwer ist zurhause" Datenpunkts
const anyone_dp:string = ''//'0_userdata.0.Sensoren.Anwesenheit.Anyone'

// nix mehr ändern
let anyone_status:boolean = anyone_dp ? getState(anyone_dp).val : false
let ip:string = ''
let counter:number = -1
let stop1:boolean = false

// alle 30 sekunden
schedule('*/30 * * * * *', start)


function start() {
    if (++counter >= devices.length){
        // alle geprüft Anyone setzen und alles zurücksetzen
        if (anyone_dp) { 
            let t:boolean = false
            for (let a of devices) if (a.state !== undefined) t = t || a.state
            if (anyone_status != t) {
                setState(anyone_dp, t, true)
                if (useLog) log('Anyone wurde auf ' + (t ? 'wahr' : 'falsch') + ' gesetzt.')
            }
            anyone_status = t
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
function callback4(error, result) {
    let presence:boolean = false
    let ack:boolean = true
    if (error) {
        if (useLog) log(devices[counter].name + ' nicht erreichbar')
    } else {
        if (devices[counter].mac && !result.lastIndexOf(devices[counter].mac) ) {
            log(devices[counter].name + ' unter falscher mac Adresse gefunden!', 'warn')
            ack = false
        }
        if (useLog) log(devices[counter].name + ' erreichbar')
        presence = true
        
    }
    if (!devices[counter].hasOwnProperty('state'))devices[counter]["state"] = !presence
    if (devices[counter]["state"] != presence) {
        if (devices[counter]["dp"]) setState(devices[counter]["dp"], presence ,ack)
    } 
    devices[counter]["state"] = presence
    start()
}

onStop(function (callback) {
    stop1 = true;
    callback();
}, 2000 /*ms*/);