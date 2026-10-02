/*
 * Loader für das OmniBattery Dashboard.
 * Als Ressource (JavaScript-Modul) einmalig eintragen, z. B. /local/energy.js.
 * Er lädt bei jedem Seitenaufruf die aktuelle omnibattery-dashboard.js neu,
 * deshalb muss nach einem Update keine Versionsnummer mehr hochgezählt werden.
 */
import(`/local/omnibattery-dashboard.js?t=${Date.now()}`).catch((e) =>
  console.error("OmniBattery: omnibattery-dashboard.js konnte nicht geladen werden (liegt sie in /config/www/?)", e)
);
