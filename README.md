# OmniBattery Dashboard für Home Assistant

Custom-Lovelace-Karte für die [OmniBattery-Integration](https://github.com/ffunes/Omnibattery).
Alle Widgets (Batterie, Energiefluss, Einzelwert, Geräteverbrauch, Verlauf) werden im
**visuellen Editor der Karte** eingestellt – kein YAML nötig. Die gesamte Karte steckt in **einer Datei: `energy.js`**.

## Installation
1. `energy.js` nach `/config/www/energy.js` kopieren.
2. *Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen*: URL `/local/energy.js`, Typ **JavaScript-Modul**.
3. Dashboard bearbeiten → *Karte hinzufügen* → **OmniBattery Dashboard**.

## Update per Knopfdruck
Die Karte hat unten den Button **⟳ Update**. Er lässt Home Assistant die neueste `energy.js`
aus GitHub laden und lädt danach die Seite neu. Voraussetzung: öffentliches Repo.

Einmalige Einrichtung, in `/config/configuration.yaml` ergänzen:
```yaml
shell_command:
  omnibattery_update: >-
    curl -fsSL -o /config/www/energy.js
    https://raw.githubusercontent.com/meisterjosch79-cmd/HomeAssist/main/energy.js
```
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

## Widgets
| Typ | Zweck |
|---|---|
| `battery` | SOC-Ring, Lade-/Entladeleistung, optional kWh |
| `flow` | Solar / Netz / Batterie / Haus mit Einzelwerten aller Sensoren |
| `value` | Beliebiger Einzelwert |
| `devices` | Verbrauchsliste mehrerer Geräte mit Balken |
| `balance` | Energiebilanz: Zufluss minus alle Verbraucher = „Energiemenge nicht zugeordnet“ |
| `history` | Verlaufsdiagramm einer Entität |

Siehe `example-dashboard.yaml`.
