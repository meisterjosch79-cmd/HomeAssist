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
Das Repo kann dabei privat bleiben.

Einmalige Einrichtung (benötigt den Loader `energy-loader.js`, siehe oben):

1. **Token anlegen:** GitHub → Settings → Developer settings → Fine-grained tokens → *Generate new token*.
   Nur Repository `HomeAssist`, Berechtigung *Contents: Read-only*. Token kopieren.
2. **`/config/secrets.yaml`** (eine Zeile, `DEIN_TOKEN` ersetzen):
   ```yaml
   ob_update_cmd: 'curl -fsSL -H "Authorization: Bearer DEIN_TOKEN" -H "Accept: application/vnd.github.raw+json" https://api.github.com/repos/meisterjosch79-cmd/HomeAssist/contents/omnibattery-dashboard.js -o /config/www/omnibattery-dashboard.js'
   ```
3. **`/config/configuration.yaml`**:
   ```yaml
   shell_command:
     omnibattery_update: !secret ob_update_cmd
   ```
4. Home Assistant einmal neu starten (Entwicklerwerkzeuge → YAML → *Alle YAML-Konfigurationen neu laden* reicht für shell_command nicht immer).
5. Erste Version von `omnibattery-dashboard.js` einmal manuell nach `/config/www/` legen. Danach genügt der Button.

Der Button kann von jedem Nutzer des Dashboards benutzt werden. Im Editor lässt er sich ausblenden.
