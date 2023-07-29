# iobroker-skript-sammlung
Meine kleine Skriptsammlung zu iobroker

Das wird im laufen der Zeit immer mehrs und ist nicht immer fertig, ausser unten erwähnt

Fertig ist aktuell 

GlobalCreateFunktionen.js
Damit erstellt man sicher Folder, Device, Channel

Sensorüberwachung.js
Überwacht Adapter, States und Scripte. Erzeugt dazu im Ordner 0_userdata.0.  ein Verzeichnis an dessen  Ende sich die jeweilige Datenpunkte/Skripte/Adapterüberwachung aktiviern/deaktivierne lässt.
Adapter und Skripte werden alle erfasst, ansonsten nur Datenpunkte die die gleiche Funktion haben wie in enumFunctions steht. 

offline bedeutet ... ist älter als datenpunkt.zeit

... true Zeitstempel 
... false Zeitstempel
... Zeitsstempel 
... letze Änderung 

Zeit wird z.B. als 1m oder 2h oder 5d eingestellt - 1 Minute, 2 Stunden, 5 Tage. Nur eine Angabe erlaubt.

ts_langzeit_prüfung ist eine Prüfung des Zeitstempels nach Zeit X 
langzeit ist die Zeiteinsstellung dazu

Keine Ähnung ob man das braucht, der gedanke war einen  true/false Wert auf aktualisierung zu prüfen, macht aber wohl keine Sinn, weil der nie aktualisiert wird und man draus nicht einen "Einfrieren des Adapters erkennt" Da ist es besser sich z.B Temperaturwert/Voltwert/RSSIwert mit der Zeit einstellung 48h und lc zu nehmen.