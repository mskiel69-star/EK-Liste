# Maiks Einkaufsliste – GitHub-Pages-Paket

## Bereitstellen
1. Dieses ZIP auf dem Computer entpacken.
2. Alle enthaltenen Dateien gemeinsam in den Hauptordner deines GitHub-Repositorys hochladen. Nicht nur die ZIP-Datei hochladen.
3. In den Repository-Einstellungen GitHub Pages für den gewünschten Branch und den Hauptordner aktivieren.
4. Die HTTPS-Adresse deiner GitHub-Pages-Seite öffnen.
5. Beim ersten Besuch online bleiben, bis die App die Offline-Bereitschaft bestätigt. Erst danach den Offline-Start testen.

Alle Dateiverweise sind relativ. Damit funktioniert die App auch unter einer Projekt-Adresse wie https://BENUTZER.github.io/REPOSITORY/.

## Dateien
- index.html: Oberfläche und Gestaltung
- app.js: Artikelerfassung, Märkte, Laufwege, Sprache, Speicherung und Synchronisation
- sw.js: Offline-Cache und Freigabe neuer App-Versionen
- mqtt.min.js: lokal mitgelieferte MQTT-Bibliothek, Version 5.10.4
- manifest.webmanifest und icon.svg: installierbare Web-App
- .nojekyll: statische Dateien ohne Jekyll verarbeiten

## Updates
Bei jeder neuen Veröffentlichung mit geänderten App-Dateien in sw.js den Wert VERSION auf einen neuen eindeutigen Wert ändern. Dann alle geänderten Dateien zusammen hochladen. Der Browser lädt die neue Version im Hintergrund. Die App fragt, bevor diese aktiviert wird. „Später“ lässt die bisherige Version aktiv. Einkaufsliste und Laufwege werden durch ein App-Update nicht gelöscht.

## Geräte verknüpfen
Auf dem ersten Gerät den geheimen Verknüpfungslink über das Kettensymbol kopieren. Den Link auf dem zweiten Gerät öffnen und dem Wechsel zur gemeinsamen Liste zustimmen. Auf GitHub Pages gibt es keine ChatGPT-Anmeldung. Die Veröffentlichung dieser Dateien enthält keine Einkaufsdaten. Die Liste liegt im jeweiligen Browser; übertragen wird sie verschlüsselt über den öffentlichen HiveMQ-Testbroker. Wer den geheimen Link besitzt, kann die gemeinsame Liste lesen und ändern. Den Link nur vertraut teilen.

Internet wird zum Geräteabgleich benötigt. Offline bearbeitete Artikel werden nach Wiederverbindung zusammengeführt. Bei gleichzeitiger Änderung desselben Artikels gewinnt die neuere Änderungsmarke. Laufwege werden je Markt als Einheit abgeglichen. Der öffentliche Testbroker bietet keine garantierte Verfügbarkeit oder dauerhafte Datensicherung; die Export-Funktion dient als zusätzliche Sicherung.

## Offline und Sprache
Die Listeneingabe per Tastatur, Bearbeitung, Marktauswahl und Laufwege funktionieren nach dem ersten vollständigen Laden offline. Sprachverarbeitung des Fließtexts erfolgt lokal. Die eigentliche Spracherkennung ist eine Browserfunktion und benötigt je nach Browser Internet; für lokale Erkennung muss der Browser ein deutsches Offline-Sprachpaket unterstützen und installiert haben. Mikrofonzugriff benötigt eine Freigabe. Die App über HTTPS öffnen, nicht per Doppelklick als lokale HTML-Datei.

## Daten
Beim Wechsel von der privaten Testadresse zur GitHub-Adresse werden Browserdaten nicht automatisch übertragen. Bei Bedarf in der bisherigen App unter Optionen eine Sicherung exportieren und auf der GitHub-Seite importieren. Löschen von Browserdaten oder privater Browsermodus kann lokale Daten entfernen. Die App enthält keine fest eingebauten persönlichen Verknüpfungscodes oder Kontodaten.

## Prüfstand
Syntax, Artikelerfassung, Dezimalkomma, Mengen, Varianten, Reaktivierung, Marktwechsel, Zusammenführung und Löschkonflikte wurden automatisiert geprüft. Offline-Cache und ausdrückliche Update-Aktivierung wurden mit einem simulierten Service-Worker-Lauf geprüft. Die Oberfläche wurde im Browser bedient. Echter Offline-Neustart, Mikrofon und Geräteabgleich zwischen zwei physischen Geräten müssen auf den Zielgeräten geprüft werden.
