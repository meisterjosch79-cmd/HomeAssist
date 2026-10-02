# OmniBattery Dashboard für Home Assistant

Eine Custom-Lovelace-Karte für die [OmniBattery-Integration](https://github.com/ffunes/Omnibattery).
Alle Widgets werden im **visuellen Editor der Karte** (Config-Seite) eingestellt – kein YAML nötig.

## Installation
1. `omnibattery-dashboard.js` nach `/config/www/omnibattery-dashboard.js` kopieren.
2. *Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen*:
   URL `/local/omnibattery-dashboard.js`, Typ **JavaScript-Modul**.
3. Dashboard bearbeiten → *Karte hinzufügen* → **OmniBattery Dashboard**.
4. Im Editor Widgets hinzufügen, Entitäten wählen, sortieren, Breite (1–4 Spalten) setzen.

## Widgets
| Typ | Zweck |
|---|---|
| `battery` | SOC-Ring, Lade-/Entladeleistung, optional kWh |
| `flow` | Solar / Netz / Haus / Batterie (Haus wird berechnet, falls leer) |
| `value` | Beliebiger Einzelwert |
| `devices` | Verbrauchsliste mehrerer Geräte mit Balken |
| `history` | Verlaufsdiagramm einer Entität |

Vorzeichen: Netz `+` = Bezug, Batterie `+` = Laden – per Schalter umkehrbar. kW/W werden automatisch erkannt.
Siehe `example-dashboard.yaml`. Neue Widget-Typen lassen sich in `omnibattery-dashboard.js` leicht ergänzen.

## Updates ohne Versionsnummer hochzählen
1. `energy-loader.js` einmalig als `/config/www/energy.js` speichern und als Ressource
   (`/local/energy.js`, Typ JavaScript-Modul) eintragen. Den Loader musst du nie wieder ändern.
2. `omnibattery-dashboard.js` unverändert (gleicher Dateiname) nach `/config/www/` legen.
3. Bei einem Update nur `omnibattery-dashboard.js` überschreiben und die Seite neu laden (F5).

## Update per Knopfdruck (ohne Hochladen)
Die Karte hat unten einen Button **⟳ Update**. Er lässt Home Assistant die neueste
`omnibattery-dashboard.js` aus GitHub nach `/config/www/` laden und lädt danach die Seite neu.

### Einrichtung bei öffentlichem Repo (einfach, kein Token)
Voraussetzung: der Loader `energy-loader.js` ist als `/config/www/energy.js` eingerichtet (siehe oben).

1. **`/config/configuration.yaml`** ergänzen:
   ```yaml
   shell_command:
     omnibattery_update: >-
       curl -fsSL -o /config/www/omnibattery-dashboard.js
       https://raw.githubusercontent.com/meisterjosch79-cmd/HomeAssist/main/omnibattery-dashboard.js
   ```
2. Home Assistant einmal neu starten.
3. Die erste Version von `omnibattery-dashboard.js` einmal manuell nach `/config/www/` legen. Danach genügt der Button.

### Einrichtung bei privatem Repo
Zusätzlich nötig: ein GitHub-Token (Fine-grained, nur Repo `HomeAssist`, *Contents: Read-only*).
In `/config/secrets.yaml`:
```yaml
ob_update_cmd: 'curl -fsSL -H "Authorization: Bearer DEIN_TOKEN" -H "Accept: application/vnd.github.raw+json" https://api.github.com/repos/meisterjosch79-cmd/HomeAssist/contents/omnibattery-dashboard.js -o /config/www/omnibattery-dashboard.js'
```
und in `configuration.yaml`:
```yaml
shell_command:
  omnibattery_update: !secret ob_update_cmd
```
Anschließend Home Assistant neu starten.

Der Button kann von jedem Nutzer des Dashboards benutzt werden. Im Editor lässt er sich ausblenden.
