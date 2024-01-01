
## Verwaltung von Nachrichten für Nspanel Screensaver.
### Konfiguration
#### `nspanelPath` 
enthält ein Array aus Strings die auf den Ordner verweist, der die Datenpunkte die auf `popupNotifyHeading` und `popupNotifyText` enden enthält.

z.B.
ganzer Datenpfad ist `0_userdata.0.NSPanel.1.ScreensaverInfo.popupNotifyHeading` dann wird dort `0_userdata.0.NSPanel.1.ScreensaverInfo` eingetragen. Mehrere Einträge sehen so aus:
```
const nspanelPath: string[] = [
    '0_userdata.0.NSPanel.1.ScreensaverInfo',
    '0_userdata.0.NSPanel.2.ScreensaverInfo',
    '0_userdata.0.NSPanel.3.ScreensaverInfo',
];
```

#### `userPath`

das ist der Oberordner in dem das Skript einen Unterordner erstellt in dem alles erstellt wird. Muß mit `0_userdata.0` oder `javascript` beginnen.

z.B.
`0_userdata.0.NSPanel` in diesem wird dann `0_userdata.0.NSPanel.screen_messages` erstellt. Darunter finden sich die zugehörigen Datenpunkte

### Verhalten
Nachrichten werden gesendet in dem ein Text oder Json in die Datenpunkt die auf `IncomingMessage` enden geschrieben wird.
Der Datenpunkt der mit `global` beginnt, schreibt die Eingabe auf alle Datenpunkte die mit `panel` beginnen. Einfacher gesagt - global schreibt die Nachricht auf alle Panels die in `nspnalePath` stehen.

#### TEXT: 
Kann nach dem Muster `headline#text` verwendet werden. z.B. `nur headline`, `#nur text` oder `headline#text`. Nur ein `#` möglich, wenn mehr als eins in der Zeichenkette sind, wird eine Warnung ins Log geschrieben, so das wichtige Information nicht unbemerkt verworfen werden.

#### JSON: 
Das Json hat folgendes Format: {id: string, headline: string, msg: string, clear: number, change: number}

##### Normale Nachricht: 

Alle Datenpunkte sind optional. Für `clear` und `change` gibt es Defaultwerte unter `userPath.config`
``` 
{ 
headline: Die Überschrift - 1. Zeile. 
msg: Der Nachrichtentext - 2. Zeile. 
clear: Zeit in Sekunden, die die Nachricht maximal angezeigt werden soll.
change: Wenn mehrere Nachrichten für dieses Panel anstehen, die Zeit die diese Nachricht angezeigt werden soll, bevor die Nächste angezeigt wird. Rotierend!
}
``````
##### Nachrichten die permanent angezeigt werden sollen:
Wenn eine Nachricht die Eigenschaft `id` hat, wird sie solange angezeigt bis eine leere Nachricht mit derselben Eigenschaft `id` geschickt wird. 

z.B. 
- Nachricht: `{id: 'Haustür steht offen', headline: 'Haustür', msg: 'Ist offen!'}` 
- Löschen: `{id: 'Haustür steht offen'}` 


