# Übergabe / Projektstand (OmniBattery Dashboard, Version 0.41.1)

Zweck: Wer in einem anderen Account (oder einer neuen Claude-Sitzung) weiterarbeitet, findet hier den Kontext, der nicht im Code steht.
Der gesamte Code liegt in `energy.js` (eine Datei, Vanilla-JS, Home-Assistant-Custom-Card `custom:omnibattery-dashboard`). Bedienung siehe `README.md`.

## Anlage (Nutzer: Kapellenweg 6 und Kapellenweg 4)
- **Speicher:** Sonnenbatterie 145854 (Sensoren `sensor.sonnenbatterie_145854_state_*`), zwei Marstek Venus E 3.0 (Venus01 `…5b00_venus01_*`, Venus02 `…5f7e_venus02_*`, Integration „Marstek Local API“).
- **Netz (Sonnen-Zähler):** `…_state_grid_in` (Bezug, W), `…_state_grid_out` (Einspeisung, W). Ohne echten Energiezähler: kWh in Zeiträumen werden aus der Statistik (Mittelwert × Zeit) hochgerechnet. Der Nutzer will den Netzbezug ausdrücklich von diesen Sensoren.
- **PV:** `…_state_production`, Zähler `sensor.pv_produktionshelfer`.
- **Tuya-Zähler (je L1–L3, kW, plus `*_energie_gesamt` kWh):**
  - „Hausstrom Zähler“ `sensor.hausstrom_*` (hinter Solar/Speicher, Referenzzähler der Bilanz)
  - „Heizstromzähler“ `sensor.warmepumpen_zahler_*` = der separate Bezug zu **25 ct** (Entity-IDs heißen noch „warmepumpen_zahler“)
  - „K4“ = Kapellenweg 4: `sensor.breaker_3_*`
  - Relais: `switch.hausstrom_schalter`, `switch.warmepumpen_zahler_schalter`, `switch.breaker_3_schalter`. Wärmepumpe/K4 hängen wahlweise am Haus- oder Heizstromzähler (Skript `script.hausstrom_ein`).
- **Wärmepumpe:** Luxtronik `sensor.luxtronik_320919_035_*` (Leistung `current_power_consumption`, Energie `heat_energy_input` + `dhw_energy_input`).
- **Geräte K6:** Büro-Steckdosenleiste `antela_smart_power_strip_2a_1c_2_*`, `heizstab_warmwasser_*`, `klimaanlage_*`, `fernseher_*`, Smart Plug `smart_plug_2103…_power/_energy`.
- **Wallbox (Sonnen Charger):** kein Live-Sensor. Ladevorgänge aus dem Sonnen-Portal (TSV: Start, Ende, Wh) sind in `energy.js` (`WALLBOX_DATA`, Stand 05.10.2026) und in `tools/wallbox_sonnen_2026.tsv`; neue Daten lassen sich im Widget „Verbrauch nach Bereichen“ hochladen (landen als `wallbox_data` in der Dashboard-Konfiguration). Energie wird anteilig nach Zeit auf Tage verteilt, nur in Zeiträumen (nicht „Aktuell“) sichtbar.

## Rechenmodell (Szenarien in `CLAUDE_SCENARIOS`, Schlüssel `k6_bilanz`, `k6_verlauf`, `k6_geraete`, `k6_speicher`)
- Helfer: `cl_gesamt` = Solar + Netz − Batterie (Laden +, Entladen −) + Heizstromzähler-Bezug (`cl_hzb`); `cl_k4` = Summe L1–L3 von `breaker_3`; `cl_k6` = Gesamt − K4; `cl_haus` = K6 − Wallbox − Wärmepumpe.
- Finanzen (Preise je kWh, im Widget änderbar, Browser-gespeichert): Netzbezug Sonnenanlage 34 ct (Kosten), Bezug Wärmepumpenzähler 25 ct (Kosten), selbst verbrauchter Sonnenstrom 6 ct (**entgangener Erlös**, nicht echtes Geld), Einspeisung 6 ct (Erlös), Strom an Kapellenweg 4 25 ct (Erlös). Kassen-Saldo = Erlöse − Gesamtbezug; wirtschaftliches Ergebnis = Kassen-Saldo − entgangener Erlös. Mischpreis = (Netz + Heizstrom + entgangener Erlös) ÷ Gesamtverbrauch; er wird für die Beträge hinter den Sensoren und die Zuordnung nach Haus benutzt.
- Autarkie = 1 − Gesamtbezug ÷ Gesamtverbrauch (nur Gesamtanlage, nicht je Haus).
- Wichtig: Wallbox/Wärmepumpe/Geräte sind Verbraucher von K6; K4 wird nur nach Phasen aufgeschlüsselt.

## Wichtige Entscheidungen / Fallstricke
- HA liefert die Karten-Konfiguration schreibgeschützt: der Editor arbeitet mit eigenen Kopien.
- Zeiträume (Tag/Woche/Monat/Jahr/frei): Energiezähler per `recorder/statistics_during_period` (`change`), Leistungssensoren als mean × Stunden; Plausibilitätsgrenze `max_kw` (Standard 100) gegen Zählersprünge.
- `_use(ids)`: bei „Aktuell“ nur Leistungssensoren, in Zeiträumen bevorzugt Energiezähler (nie beides addieren).
- Virtuelle Sensoren: `virtual:unassigned`, `virtual:losses`, Helfer `virtual:helper:<id>`, Wallbox `virtual:helper:wallbox` (`WB`).
- Layout-Modus (✥): Reihenfolge/Breite per Drag & Drop, gespeichert als `layout` in der Karten-Konfiguration (Fallback localStorage).
- Mobile: bei Container < 560 px eine Spalte; die `.w[data-w=…]`-Regeln müssen dort überschrieben werden (sonst entsteht eine zweite, winzige Spalte).
- Aktualisierung: In-Karte ⟳ Update lädt `energy.js` per `shell_command.omnibattery_update` (curl aus GitHub raw, mit `?t=` gegen Cache). Repo muss öffentlich sein oder Token nutzen.
- Datenqualität (aus dem Sensor-Export): `k4_verbrauch_gesamt` (Einheit „kWhh“, 8 Mio.), `heizstab_ww_taglicher_verbruach` (Utility-Meter auf Leistungssensor), `sonnen_akku_laden/entladen` vertauscht benannt, doppelte/tote Entitäten (Wallbox/Modbus/forecast_solar-Instanzen sind keine Messwerte).
- Marstek: Venus02 war zeitweise nicht erreichbar (IP 192.168.68.190/191); Polling 60 s, CT/PV 300 s; Zähler `total_grid_import/export` = Lade-/Entladeenergie.

## Offene Wünsche / Ideen
- Heizstromzähler im Widget „Energiefluss Gesamt“ anzeigen.
- Weitere Szenarien (Heizstrom getrennt, Wallbox live, wenn ein Sensor vorhanden ist).
- Aufräumliste für tote/doppelte Sensoren.

## Tests
Die bisherigen Tests waren Playwright-Skripte (Chromium, Karte per `addScriptTag` laden, `hass`-Objekt mit Fake-Sensoren und Fake-`callWS`), nicht im Repo. Neue Sitzung: gleiches Muster verwenden (`node --check energy.js`, Rendering auf 411 px und 1100 px Breite prüfen, Zeiträume mit gemockter `recorder/statistics_during_period`).
