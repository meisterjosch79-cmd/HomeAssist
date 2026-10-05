# OmniBattery Dashboard für Home Assistant

Custom-Lovelace-Karte für die [OmniBattery-Integration](https://github.com/ffunes/Omnibattery).
Alle Widgets (Batterie, Energiefluss, Einzelwert, Geräteverbrauch, Verlauf) werden im
**visuellen Editor der Karte** eingestellt – kein YAML nötig. Die gesamte Karte steckt in **einer Datei: `energy.js`**.

## Installation
1. `energy.js` nach `/config/www/energy.js` kopieren.
2. *Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen*: URL `/local/energy.js`, Typ **JavaScript-Modul**.
3. Dashboard bearbeiten → *Karte hinzufügen* → **OmniBattery Dashboard**.

## Browser-Cache
Home Assistant liefert Dateien aus `/config/www/` mit langer Cache-Zeit aus. Jeder Browser kann deshalb eine alte `energy.js` behalten. Die Karte prüft beim Laden
selbst, ob der Server eine neuere Version hat, frischt dann den Cache auf und lädt die Seite einmal neu. Hat ein Browser noch eine **sehr alte** Version ohne diese Prüfung
(erkennbar an „Unbekannter Typ: …“ in der Karte), einmal **Strg+Shift+R** drücken bzw. den Cache der Seite löschen.

## Update per Knopfdruck
Die Karte hat unten den Button **⟳ Update**. Er lässt Home Assistant die neueste `energy.js`
aus GitHub laden und lädt danach die Seite neu. Voraussetzung: öffentliches Repo.

Einmalige Einrichtung, in `/config/configuration.yaml` ergänzen:
```yaml
shell_command:
  omnibattery_update: >-
    curl -fsSL -H "Cache-Control: no-cache" -o /config/www/energy.js
    "https://raw.githubusercontent.com/meisterjosch79-cmd/HomeAssist/main/energy.js?t={{ now().timestamp() | int }}"
```
(`?t=…` umgeht den GitHub-Cache, der Änderungen sonst bis zu 5 Minuten verzögert.)
Danach Home Assistant neu starten. Der Button ist im Karten-Editor abschaltbar.

Bei privatem Repo braucht der Befehl einen GitHub-Token (Fine-grained, nur dieses Repo, *Contents: Read-only*):
```yaml
# secrets.yaml
ob_update_cmd: 'curl -fsSL -H "Authorization: Bearer DEIN_TOKEN" -H "Accept: application/vnd.github.raw+json" https://api.github.com/repos/meisterjosch79-cmd/HomeAssist/contents/energy.js -o /config/www/energy.js'
# configuration.yaml
shell_command:
  omnibattery_update: !secret ob_update_cmd
```

## Zeitraum-Umschalter (Aktuell / Tag / Woche / Monat / Jahr)
Oben in der Karte (mittig) stehen die Schalter **Aktuell · Tag · Woche · Monat · Jahr**. Die Auswahl wird im Browser gemerkt.
Tag = seit 0 Uhr, Woche = seit Montag, Monat = seit dem 1., Jahr = seit 1. Januar.
Die Werte kommen aus den Langzeitstatistiken von Home Assistant:

- **Energiezähler (kWh/Wh, z. B. „Tagesertrag“, „Gesamtenergie“)** werden exakt über die Änderung im Zeitraum berechnet.
- **Leistungssensoren (W/kW)** werden aus dem Mittelwert × Zeit in kWh umgerechnet (Näherung; Netto bei Vorzeichen, z. B. Netz ± oder Batterie ±).
- Du kannst in **ein Feld beides eintragen**, den Leistungs- *und* den Energiesensor: „Aktuell“ nutzt nur die Leistungssensoren, die anderen Zeiträume bevorzugt die Energiezähler.
- Für genaue Bezug/Einspeisung-Summen trage Bezug und Einspeisung getrennt ein (Felder *Netz* und *Netz: Einspeisung*).
- Der Sensor braucht eine `state_class` (measurement / total_increasing), sonst gibt es keine Statistik – die Karte weist darauf hin.
- Der laufende Zeitraum hängt der aktuellen Stunde bis zu ca. 1 h hinterher (Statistik wird stündlich geschrieben); „Tag“ ist minutengenau.
- Im Editor lässt sich der Umschalter ausblenden.

## Batterien mit getrennten Sensoren für Laden / Entladen
Das Feld **Leistung** (Batterie-Widget) bzw. **Batterie** (Energiefluss) addiert alle eingetragenen Sensoren. Vorzeichen: **+ = Laden, − = Entladen**.

- Batterie mit **einem** Sensor (±): normal eintragen.
- Batterie mit **getrennten** Sensoren: den Lade-Sensor normal eintragen, den Entlade-Sensor ebenfalls eintragen und bei ihm
  **„Wert abziehen (−)“** anhaken. Die Karte rechnet dann: Batterie A (±) + Laden B − Entladen B.
- Liefert ein Sensor das Vorzeichen genau umgekehrt, den Schalter *Batterie-Vorzeichen umkehren* verwenden (wirkt auf die Summe).

„Wert abziehen“ gibt es bei jedem Feld mit mehreren Sensoren, z. B. auch beim Hausverbrauch.

## Virtueller Sensor „Nicht zugeordnete Energiemenge“
Im Auswahldialog der Felder **Geräte** (Geräteverbrauch-Widget) und **Hausverbrauch** (Energiefluss) steht ganz oben der Eintrag
**„Nicht zugeordnete Energiemenge (Virtuell)“**. Er liefert den Rest aus der Energiebilanz (Zufluss minus alle Verbraucher aus den Geräteverbrauch-Widgets)
und lässt sich wie ein normaler Sensor in Listen anzeigen und zur Hausverbrauch-Summe addieren. Er funktioniert in allen Zeiträumen (W bzw. kWh).
Er zählt selbst nicht als Verbraucher der Bilanz, damit keine Rückkopplung entsteht.

### So rechnet die Energiebilanz (Haus mit Nachbarbereich)
1. **Hausverbrauch gesamt** = Solar + Netzbezug + Batterie-Entladung − Einspeisung − Batterie-Ladung.
2. **− Andere Bereiche** (Feld „Von ‚nicht zugeordnet‘ abziehen“ im Energiefluss, z. B. Kapellenweg 4) = **Verbrauch dieses Hauses**.
3. **− Geräte** (Sensoren aus den Geräteverbrauch-Widgets) = **Energiemenge nicht zugeordnet**.

Was „nicht zugeordnet“ ist, lässt sich nicht messen, sondern nur als Differenz berechnen: Verbraucher ohne eigenen Sensor (Licht, Steckdosen, Standby, Geräte ohne Messung),
Wandlungsverluste (Wechselrichter, Batterie) und Messabweichungen der Zähler. Willst du den Rest weiter aufteilen, hilft ein zusätzlicher Messsensor (Zwischenstecker, Unterzähler)
oder ein Helfer, der bekannte Teilbereiche zusammenfasst.

### Referenz-Zähler (Zähler hinter Solar/Speicher)
Hängt Solar und Speicher **vor** dem Hausstrom-Zähler (dieser misst nur den Verbrauch dahinter), trägst du im Editor in der Sektion „Nicht zugeordnet — Zusammensetzung“ unter
**Referenz-Zähler** den gemessenen Gesamtverbrauch ein (z. B. Hausstrom L1–L3). Dann gilt:

- Du kannst **mehrere Referenz-Zähler** eintragen (z. B. Hausstrom- und Heizstrom-Zähler). Ihre Werte werden addiert; ein Zähler mit geöffnetem Relais liefert 0 W. So stimmt die Rechnung unabhängig davon, an welchem Zähler K4 und die Wärmepumpe gerade hängen. Die Zähler lassen sich benennen und werden im Widget Energiebilanz einzeln aufgeführt.
- **Verbrauch gesamt = Referenz-Zähler** (statt aus Solar/Netz/Batterie berechnet).
- **Nicht zugeordnet** = Referenz − andere Bereiche (z. B. K4) − Geräte.
- Neuer virtueller Sensor **„Anlagenverluste & Messabweichung“** = berechneter Verbrauch aus den Quellen − Referenz-Zähler (Wechselrichter-/Batterieverluste, Standby, Messabweichungen). Er ist wie „nicht zugeordnet“ in den Listen wählbar.

### Zusammensetzung von „Nicht zugeordnet“ einstellen
Im Karten-Editor gibt es die Sektion **„⚖️ Nicht zugeordnet — Zusammensetzung“**. Sie listet alle Sensoren, aus denen sich die nicht zugeordnete Energiemenge ergibt
(Solar, Netz, Batterie und alle Verbraucher aus den Widgets), sortiert nach Leistung und mit Live-Wert. Pro Sensor wählst du **Addieren**, **Subtrahieren** oder **Ignorieren**
(Standard: Solar/Netz addieren, Batterie-Entladen addieren bzw. Laden subtrahieren, Verbraucher subtrahieren). Die Einstellung gilt für den virtuellen Sensor und das Widget Energiebilanz.

### Andere Bereiche von „nicht zugeordnet“ abziehen
Im Energiefluss-Widget gibt es das Feld **„Von ‚nicht zugeordnet‘ abziehen“**. Dort eingetragene Sensoren (z. B. ein zweites Haus, Wallbox, Werkstatt)
zählen als Verbraucher der Energiebilanz. Sie verkleinern die nicht zugeordnete Energiemenge und den virtuellen Sensor, ohne in der Haus-Kachel selbst zu erscheinen.
Im Bilanz-Widget werden sie unter „Verbraucher“ aufgeführt.

## Helfer anlegen (virtuelle Sensoren)
Im Karten-Editor gibt es ganz unten die Sektion **„🧮 Helfer anlegen“**. Ein Helfer kombiniert mehrere Sensoren zu einem neuen Wert:

- Bestandteile auswählen: echte Sensoren **und andere Helfer**. Bei jedem Bestandteil legst du fest, ob er **dazugerechnet (＋)** oder **abgezogen (−)** wird. Ein Helfer darf sich nicht selbst (auch nicht über andere Helfer) enthalten; solche Helfer werden in der Auswahl nicht angeboten.
- Der Helfer steht danach in **allen Sensor-Listen** der Karte (Auswahlfenster, ganz oben unter „Helfer“) und verhält sich wie ein Sensor:
  in Energiefluss, Geräteliste, Bilanz, „abziehen“-Feld usw., auch bei Tag/Woche/Monat/Jahr (aus den Statistiken der Einzelsensoren).
- Im Editor wird der aktuelle Wert des Helfers angezeigt.
- **➕ In Home Assistant anlegen** erstellt zusätzlich einen echten Template-Sensor (Helfer) in Home Assistant (Einheit W bzw. kWh),
  den du auch außerhalb der Karte nutzen kannst. Das braucht Administratorrechte. Klappt es nicht, zeigt **📋 Vorlage anzeigen**
  die fertige Template-Vorlage zum Einfügen unter *Einstellungen → Geräte & Dienste → Helfer → Template → Sensor*.
- Leistungs- und Energiesensoren lassen sich in einem Helfer nicht mischen.

## Top-Verbraucher
Das Widget **Top-Verbraucher** durchsucht alle Sensoren im System (nicht nur die in den Widgets eingetragenen) und zeigt die größten Verbraucher.
- **Aktuell:** alle Leistungssensoren (W/kW) mit dem höchsten Wert im Moment.
- **Tag/Woche/Monat/Jahr:** Energiezähler (kWh) aus den Langzeitstatistiken; Leistungssensoren nur, wenn das Gerät keinen Energiezähler hat.
- Die Quellen (Solar/Netz/Batterie aus den Energiefluss-/Batterie-Widgets) werden ausgeblendet, damit sie die Liste nicht anführen. Über die Option *Quellen ebenfalls anzeigen* einblendbar.
- Mit **Ignorieren** blendest du weitere Gesamtwerte aus (z. B. „Gesamtverbrauch“ oder Summenzähler).
- Anzahl der Einträge einstellbar (Standard 10).
- **Häkchen vor jedem Eintrag** blendet den Sensor „für den Moment“ aus (gilt nur in diesem Browser, bleibt nach Neuladen erhalten). Mit **„👁 Ausgeblendete anzeigen“** über der Liste blendest du sie zum Zurückholen wieder ein, **„Zurücksetzen“** löscht alle Häkchen.
- Das **Auswahlfeld „＋ zu Gerät …“** rechts neben dem Balken ordnet den Sensor direkt einem **Geräteverbrauch-Widget** der Karte zu. Die Zuordnung wird in der Dashboard-Konfiguration gespeichert
  (braucht Administratorrechte und ein Dashboard im Storage-Modus, nicht YAML). Ist ein Sensor schon zugeordnet, steht stattdessen „✓ Widgetname“.
- „Aktuell“ ist eine **Momentaufnahme** der aktuellen Sensorwerte (kein Mittelwert). Die Liste wird höchstens alle *refresh_s* Sekunden neu berechnet (Standard 5, im Editor einstellbar).

## Live-Abfrage (z. B. Marstek)
Manche Integrationen aktualisieren ihre Sensoren nur in festen Abständen (Marstek: Batterie-Werte alle 60 s, CT/PV alle 300 s). Im Editor kannst du unter
**„Live-Abfrage alle … Sekunden“** einstellen, dass die Karte einen Home-Assistant-Dienst regelmäßig aufruft (Standard: `marstek_local_api.request_data_sync`).
Das passiert nur, **solange das Dashboard im Browser offen und sichtbar ist** (mindestens 5 Sekunden Abstand), also ohne dauerhafte Automatisierung.
Beginne mit 15–30 Sekunden, sehr kurze Abstände können die Batterie belasten.

## Unplausible Statistikwerte
Defekte Zähler (z. B. Marstek mit 4.294.967.296 = 32-Bit-Überlauf) schreiben riesige Sprünge in die Langzeitstatistik von Home Assistant. In den Zeiträumen Tag bis Jahr ignoriert die Karte
Zählerschritte und Mittelwerte, die eine **Plausibilitätsgrenze** überschreiten (Standard 100 kW, im Editor einstellbar), und weist oben auf die betroffenen Sensoren hin.
Die Daten in Home Assistant selbst bleiben unverändert; dauerhaft korrigieren lassen sie sich unter *Entwicklerwerkzeuge → Statistiken*.

## Sensorliste exportieren
Im Auswahlfenster für Sensoren (Schaltflächen **„⬇ Liste als CSV“** und **„⬇ als JSON“**) lässt sich die aktuell aufgelistete Sensorliste als Datei speichern (mit „Alle Sensoren anzeigen“ also alles).
Pro Sensor stehen darin: Entitäts-ID, Name, Gerät, Hersteller, Modell, Integration, Geräte-/Zustandsklasse, Einheit, aktueller Zustand, ob er einen Wert liefert, Alter der letzten Aktualisierung und ob eine Langzeitstatistik besteht.
Die Datei enthält nur Namen und aktuelle Werte deiner Sensoren, keine Zugangsdaten.

## Szenario by Claude (fertige Ansichten per Update)
Das Widget **„Szenario by Claude“** bringt komplette, auf dieses Haus zugeschnittene Ansichten mit. Du wählst nur das Szenario aus; Widgets, Helfer, Referenz-Zähler und Beschriftungen kommen fertig mit.
Neue oder geänderte Szenarien kommen mit einem **⟳ Update** in `energy.js`.

Enthaltene Szenarien:
- **Kapellenweg 6 · Energiefluss & Bilanz:** Energiefluss (Sonnen + 2× Marstek), Speicher, Geräte und Energiebilanz mit Hausstrom-/Heizstrom-Zähler als Referenz, K4 als anderer Bereich.
- **Kapellenweg 6 · Verlauf:** Diagramm mit PV, Netz (±), Speicher (±), Hausstrom und K4.
- **Kapellenweg 6 · Geräte & Top-Verbraucher.**

Im Editor des Widgets gibt es ein Feld **„Dein Änderungswunsch an Claude“** und den Knopf **„Wunsch + Konfiguration für Claude kopieren“**: Der Inhalt (Wunsch, Szenario, Version, komplette Kartenkonfiguration) landet in der Zwischenablage und kann im Chat eingefügt werden.
Tipp: Ein Szenario am besten in einer **eigenen Karte** einsetzen, damit es sich nicht mit eigenen Energiefluss-Widgets derselben Karte überschneidet.

## Widgets
| Typ | Zweck |
|---|---|
| `battery` | SOC-Ring, Lade-/Entladeleistung, optional kWh |
| `flow` | Solar / Netz / Batterie / Haus mit Einzelwerten aller Sensoren |
| `value` | Beliebiger Einzelwert |
| `devices` | Verbrauchsliste mehrerer Geräte mit Balken |
| `balance` | Energiebilanz (automatisch): Quellen aus den Energiefluss-/Batterie-Widgets, Verbraucher aus den Geräteverbrauch-Widgets, Rest = „Energiemenge nicht zugeordnet“ |
| `top` | Top-Verbraucher (Standard 10) aus **allen** Sensoren des Systems, nicht nur den eingetragenen |
| `history` | Verlaufsdiagramm mit beliebig vielen Datenreihen (Sensoren oder Helfer), je Reihe Farbe und Darstellung **Linie** oder **gestapelt (addierend)**; Achsen, Nulllinie, Legende und Hover-Anzeige mit allen Werten |

Siehe `example-dashboard.yaml`.
