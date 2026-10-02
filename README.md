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

## Widgets
| Typ | Zweck |
|---|---|
| `battery` | SOC-Ring, Lade-/Entladeleistung, optional kWh |
| `flow` | Solar / Netz / Batterie / Haus mit Einzelwerten aller Sensoren |
| `value` | Beliebiger Einzelwert |
| `devices` | Verbrauchsliste mehrerer Geräte mit Balken |
| `history` | Verlaufsdiagramm einer Entität |

Siehe `example-dashboard.yaml`.
