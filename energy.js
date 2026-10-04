/*
 * OmniBattery Dashboard – Custom Lovelace Card für Home Assistant
 * Frei konfigurierbar über den visuellen Editor (Config-Seite) der Karte.
 * Widgets: battery, flow, value, devices, history
 */
const OB_VERSION = "0.14.0";

const WIDGET_TYPES = {
  battery: { label: "Batterie (Laden / Entladen)", icon: "🔋" , short: "Batterie" },
  flow: { label: "Energiefluss (Solar / Netz / Batterie / Haus)", icon: "⚡" , short: "Energiefluss" },
  value: { label: "Einzelwert", icon: "🔢" , short: "Wert" },
  devices: { label: "Geräteverbrauch (Liste)", icon: "🔌" , short: "Geräte" },
  balance: { label: "Energiebilanz (nicht zugeordnet)", icon: "⚖️", short: "Energiebilanz" },
  history: { label: "Verlauf (Diagramm)", icon: "📈" , short: "Verlauf" },
};

const LABELS = {
  type: "Typ", width: "Breite (1-4 Spalten)", name: "Name", soc: "Ladestand (SOC) Entität",
  power: "Leistung (+ = Laden; Entlade-Sensor mit „abziehen“ markieren)", invert_power: "Vorzeichen umkehren (Standard: + = Laden)",
  capacity_kwh: "Kapazität (kWh, optional)", solar: "Solarproduktion (mehrere Sensoren werden addiert)",
  grid: "Netz: Leistung (+ = Bezug) bzw. Bezug-Sensor", grid_export: "Netz: Einspeisung-Sensor (optional, separater Sensor)",
  battery: "Batterie (+ = Laden; Entlade-Sensor mit „abziehen“ markieren)",
  home: "Hausverbrauch (mehrere Sensoren werden addiert; leer = berechnen)",
  invert_grid: "Netz-Vorzeichen umkehren (wenn Einspeisung als Bezug angezeigt wird)", invert_battery: "Batterie-Vorzeichen umkehren",
  deduct: "Von „nicht zugeordnet“ abziehen (andere Bereiche, z. B. anderes Haus, Wallbox)", entity: "Entität", exclude: "Ignorieren (diese Sensoren nicht mitzählen, optional)", icon: "Icon", decimals: "Nachkommastellen", entities: "Geräte / Entitäten",
  max: "Maximalwert für Balken (leer = automatisch)", hours: "Zeitraum (Stunden)",
};

// Typabhängige Feldbeschriftungen
const LABELS_T = { balance: { entities: "Zusätzliche Verbraucher (optional – Geräte aus den Geräte-Widgets werden automatisch übernommen)" } };
const WIDTH = { name: "width", selector: { number: { min: 1, max: 4, mode: "box" } } };
const NAME = { name: "name", selector: { text: {} } };
// Filter für die Entitätsauswahl: [domain, device_class]. Über "Filter" im Editor abschaltbar.
const U_POWER = ["W", "kW", "MW", "Wh", "kWh", "MWh"];
// [domain, device_classes, units]: ein Sensor passt, wenn Geräteklasse ODER Einheit passt (viele Sensoren haben keine Geräteklasse)
const PW = ["sensor", ["power", "energy"], U_POWER];
const FILTERS = {
  soc: ["sensor", ["battery"], ["%"]], power: PW, solar: PW, grid: PW, grid_export: PW, battery: PW, home: PW, entities: PW,
  entity: [null, null, null], exclude: [null, null, null], deduct: PW,
};
const ENT = (n) => ({ name: n, selector: { entity: {} }, _f: n });
const MULTI = (n) => ({ name: n, selector: { entity: { multiple: true } }, _f: n });
const BOOL = (n) => ({ name: n, selector: { boolean: {} } });

const SCHEMAS = {
  battery: [NAME, ENT("soc"), MULTI("power"), BOOL("invert_power"),
    { name: "capacity_kwh", selector: { number: { min: 0, step: 0.1, mode: "box" } } }, WIDTH],
  flow: [NAME, MULTI("solar"), MULTI("grid"), MULTI("grid_export"), MULTI("battery"), MULTI("home"), MULTI("deduct"), BOOL("invert_grid"), BOOL("invert_battery"), WIDTH],
  value: [NAME, ENT("entity"), { name: "icon", selector: { icon: {} } },
    { name: "decimals", selector: { number: { min: 0, max: 4, mode: "box" } } }, WIDTH],
  devices: [NAME, { name: "entities", selector: { entity: { multiple: true } }, _f: "entities" },
    { name: "max", selector: { number: { min: 0, mode: "box" } } }, WIDTH],
  balance: [NAME, MULTI("entities"), MULTI("exclude"), WIDTH],
  history: [NAME, ENT("entity"), { name: "hours", selector: { number: { min: 1, max: 168, mode: "box" } } }, WIDTH],
};

// Virtueller Sensor: "Nicht zugeordnete Energiemenge" aus der Energiebilanz, nutzbar in Geräteliste und Hausverbrauch
const VIRT = "virtual:unassigned", VIRT_NAME = "Nicht zugeordnete Energiemenge";
const PERIODS = { now: "Aktuell", day: "Tag", week: "Woche", month: "Monat", year: "Jahr" };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

class OmniBatteryDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hist = {};
    this._sig = "";
  }

  static getConfigElement() { return document.createElement("omnibattery-dashboard-editor"); }
  static getStubConfig() {
    return { title: "Energie", widgets: [{ type: "battery", name: "Batterie" }, { type: "flow", name: "Energiefluss", width: 2 }] };
  }

  setConfig(config) {
    if (!config) throw new Error("Ungültige Konfiguration");
    this._config = { title: "Energie", widgets: [], ...config };
    if (!this._period) {
      let st = null;
      try { st = localStorage.getItem("ob_period"); } catch (e) { /* ignore */ }
      this._period = PERIODS[st] ? st : PERIODS[config.default_period] ? config.default_period : "now";
    }
    this._sig = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const ids = this._entityIds();
    const sig = this._period !== "now" ? "p" + this._period
      : ids.map((id) => { const s = hass.states[id]; return s ? s.state + s.attributes.unit_of_measurement : "-"; }).join("|");
    if (sig !== this._sig) { this._sig = sig; this._render(); }
    this._loadHistory();
    this._loadStats();
  }

  getCardSize() { return 3 + (this._config?.widgets?.length || 0); }

  _entityIds() {
    const ids = [];
    for (const w of this._config?.widgets || []) {
      for (const k of ["soc", "entity"]) if (w[k]) ids.push(w[k]);
      for (const k of ["power", "solar", "grid", "grid_export", "battery", "home", "deduct"]) ids.push(...this._ids(w[k]));
      if (Array.isArray(w.entities)) ids.push(...w.entities);
    }
    return ids;
  }

  /** Anzeigename eines Sensors im Widget (eigener Name oder Entity-Name) */
  _label(w, id) { return w.names?.[id] || (id === VIRT ? VIRT_NAME + " (virtuell)" : null) || this._st(id)?.attributes?.friendly_name || id; }
  /** Kleine Einzelwerte aller Sensoren eines Widget-Feldes */
  _parts(w, ids, always = false) {
    ids = ids.filter(Boolean);
    if (!ids.length || (!always && ids.length < 2 && !ids.some((id) => w.names?.[id]))) return "";
    return `<div class="parts">${ids.map((id) => `<div><span title="${esc(id)}">${esc(this._label(w, id))}</span><b>${esc((w.signs?.[id] === -1 ? "− " : "") + this._fmtW(this._watts(id)))}</b></div>`).join("")}</div>`;
  }
  _ids(v) { return Array.isArray(v) ? v : v ? [v] : []; }
  _isEnergy(id) {
    const a = this._st(id)?.attributes || {};
    return ["Wh", "kWh", "MWh"].includes(a.unit_of_measurement) || a.device_class === "energy";
  }
  /** Sensoren eines Feldes, die im aktuellen Zeitraum zählen:
   *  Aktuell = nur Leistungssensoren; Tag/Woche/Monat/Jahr = Energiezähler, sonst Leistung (Statistik-Mittelwert × Zeit). */
  _use(v) {
    const ids = this._ids(v), en = ids.filter((i) => this._isEnergy(i)), virt = ids.filter((i) => i === VIRT);
    if (this._period === "now") return ids.filter((i) => !this._isEnergy(i));
    return en.length ? [...en, ...virt] : ids;
  }
  /** Summe in Watt über einen oder mehrere Sensoren (null, wenn kein Wert verfügbar) */
  _sumW(v, wd) {
    let sum = null;
    for (const id of this._use(v)) { const w = this._sv(wd, id); if (w !== null) sum = (sum || 0) + w; }
    return sum;
  }
  /** Sensorwert mit Vorzeichen-Einstellung des Widgets ("abziehen" = ×−1, z. B. separater Entlade-Sensor) */
  _sv(wd, id) {
    const v = this._watts(id);
    return v === null ? null : wd?.signs?.[id] === -1 ? -v : v;
  }
  _st(id) { return id ? this._hass?.states?.[id] : undefined; }
  _num(id) { const s = this._st(id); const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : v; }
  /** Wert in Watt, berücksichtigt kW/MW */
  _watts(id) {
    if (id === VIRT) return this._unassigned();
    if (this._period !== "now") return this._stat?.[this._period]?.[id] ?? null;  // kWh aus Statistik
    if (this._isEnergy(id)) return null;
    const v = this._num(id); if (v === null) return null;
    const u = this._st(id).attributes.unit_of_measurement;
    return u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
  }
  _fmtW(w) {
    if (this._period !== "now") {
      if (w === null) return this._loading ? "…" : "–";
      return (Math.abs(w) >= 100 ? w.toFixed(0) : w.toFixed(2)) + " kWh";
    }
    return w === null ? "–" : Math.abs(w) >= 1000 ? (w / 1000).toFixed(2) + " kW" : Math.round(w) + " W";
  }
  _fmt(id, decimals) {
    const s = this._st(id); if (!s) return "n/a";
    const v = parseFloat(s.state);
    const u = s.attributes.unit_of_measurement || "";
    // höchstens 2 Nachkommastellen (oder die konfigurierten), ohne unnötige Nullen
    const d = decimals != null ? decimals : 2;
    return isNaN(v) ? s.state : `${decimals != null ? v.toFixed(d) : String(Math.round(v * 10 ** d) / 10 ** d)} ${u}`.trim();
  }
  _name(id, fallback) { return fallback || this._st(id)?.attributes?.friendly_name || id || ""; }

  // ---------- Widgets ----------
  _battery(w) {
    const soc = this._num(w.soc);
    let p = this._sumW(w.power, w);
    if (p !== null && w.invert_power) p = -p;
    const now = this._period === "now", th = now ? 20 : 0.005;
    const state = p === null ? "" : p > th ? (now ? "Laden" : "Netto geladen") : p < -th ? (now ? "Entladen" : "Netto entladen") : now ? "Leerlauf" : "";
    const col = p === null || Math.abs(p) <= th ? "var(--secondary-text-color)" : p > 0 ? "#2e9e5b" : "#e8833a";
    const pct = soc === null ? 0 : Math.max(0, Math.min(100, soc));
    const r = 52, c = 2 * Math.PI * r;
    const kwh = soc !== null && w.capacity_kwh ? ` · ${(w.capacity_kwh * pct / 100).toFixed(2)} kWh` : "";
    return `<div class="batt">
      <svg viewBox="0 0 120 120" style="width:100%;max-width:130px">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="10"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${col === "var(--secondary-text-color)" ? "var(--primary-color)" : col}" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c}" transform="rotate(-90 60 60)"/>
        <text x="60" y="68" text-anchor="middle" font-size="24" font-weight="600" fill="var(--primary-text-color)">${soc === null ? "–" : Math.round(pct) + "%"}</text>
      </svg>
      <div class="big" style="color:${col}">${this._fmtW(p === null ? null : Math.abs(p))}</div>
      <div class="sub">${state}${kwh}</div>${this._parts(w, this._use(w.power))}</div>`;
  }

  _flow(w) {
    const solar = this._sumW(w.solar, w);
    const imp = this._sumW(w.grid, w), exp = this._sumW(w.grid_export, w);
    // Netto: + = Bezug, - = Einspeisung. Mit separatem Einspeise-Sensor: Bezug - Einspeisung.
    let grid = imp === null && exp === null ? null : (imp || 0) - (exp || 0);
    if (grid !== null && w.invert_grid) grid = -grid;
    let bat = this._sumW(w.battery, w); if (bat !== null && w.invert_battery) bat = -bat;
    let home = this._sumW(w.home, w);
    if (home === null && (solar !== null || grid !== null || bat !== null)) {
      home = Math.max(0, (solar || 0) + (grid || 0) - (bat || 0));
    }
    const node = (icon, label, val, note, color, parts = "") =>
      `<div class="node" style="--c:${color}"><div class="nh"><span class="ni">${icon}</span>
        <div class="nt"><div class="nl">${label}</div><div class="sub">${note}</div></div>
        <div class="nv">${this._fmtW(val === null ? null : label === "Haus" ? val : Math.abs(val))}</div></div>${parts}</div>`;
    const now = this._period === "now", th = now ? 10 : 0.005, pt = now ? "" : " (netto)";
    const gridNote = grid === null ? "" : grid > th ? "⬇ Netzbezug" + pt : grid < -th ? "⬆ Einspeisung" + pt : "Ausgeglichen";
    const gridCol = grid > th ? "#c0392b" : grid < -th ? "#2e9e5b" : "var(--secondary-text-color)";
    const gridIds = [...this._use(w.grid), ...this._use(w.grid_export)];
    const hasGrid = this._ids(w.grid).length || this._ids(w.grid_export).length;
    const P = (ids) => this._parts(w, ids, true);
    return `<div class="flow">
      ${this._ids(w.solar).length ? node("☀️", "Solar", solar, solar > th ? (now ? "Produktion" : "Erzeugt") : "Keine Produktion", "#e0a800", P(this._use(w.solar))) : ""}
      ${hasGrid ? node("🏭", "Netz", grid, gridNote, gridCol, P(gridIds)) : ""}
      ${this._ids(w.battery).length ? node("🔋", "Batterie", bat, bat === null ? "" : bat > th * 2 ? (now ? "Laden" : "Netto geladen") : bat < -th * 2 ? (now ? "Entladen" : "Netto entladen") : now ? "Leerlauf" : "", bat > th * 2 ? "#2e9e5b" : bat < -th * 2 ? "#e8833a" : "var(--secondary-text-color)", P(this._use(w.battery))) : ""}
      ${node("🏠", "Haus", home, "Verbrauch", "var(--primary-color)", P(this._use(w.home)))}
    </div>`;
  }

  _value(w) {
    const s = this._st(w.entity);
    const icon = w.icon ? `<ha-icon icon="${esc(w.icon)}"></ha-icon>` : "";
    return `<div class="val">${icon}<div class="big">${esc(this._fmt(w.entity, w.decimals))}</div></div>${s ? "" : '<div class="sub">Entität nicht gefunden</div>'}`;
  }

  _devices(w) {
    // Jedes Gerät ist ein eigener Eintrag (keine Summe): alle gewählten Sensoren anzeigen.
    // Aktuell: Leistungssensoren mit Balken, Energiezähler (z. B. „heute“) mit ihrem eigenen Wert. Tag–Jahr: Verbrauch aus der Statistik.
    const now = this._period === "now";
    const rows = this._ids(w.entities).map((id) => ({ id, v: this._sv(w, id) }));
    const max = w.max || Math.max(1, ...rows.map((r) => Math.abs(r.v || 0)));
    rows.sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));
    return `<div class="devs">${rows.map((r) => `
      <div class="dev"><div class="dl"><span>${esc(this._label(w, r.id))}</span><b>${esc(!now || r.v !== null ? this._fmtW(r.v) : this._fmt(r.id))}</b></div>
      ${r.v !== null ? `<div class="bar"><i style="width:${Math.min(100, Math.abs(r.v) / max * 100)}%"></i></div>` : ""}</div>`).join("") || '<div class="sub">Keine Geräte gewählt</div>'}</div>`;
  }

  /** Sammelt Quellen und Verbraucher automatisch aus den anderen Widgets dieser Karte (jeder Sensor nur einmal). */
  _balanceModel(w) {
    const ws = this._config.widgets || [];
    const sgn = (wd, id) => (wd.signs?.[id] === -1 ? -1 : 1);
    const roles = { solar: new Map(), grid: new Map(), battery: new Map() };
    const seen = new Set();
    const put = (role, wd, id, f) => { if (seen.has(id)) return; seen.add(id); roles[role].set(id, { f, wd }); };
    for (const wd of ws.filter((x) => x.type === "flow")) {
      const ig = wd.invert_grid ? -1 : 1, ib = wd.invert_battery ? -1 : 1;
      this._ids(wd.solar).forEach((id) => put("solar", wd, id, sgn(wd, id)));
      this._ids(wd.grid).forEach((id) => put("grid", wd, id, sgn(wd, id) * ig));
      this._ids(wd.grid_export).forEach((id) => put("grid", wd, id, -sgn(wd, id) * ig));
      this._ids(wd.battery).forEach((id) => put("battery", wd, id, sgn(wd, id) * ib));
    }
    for (const wd of ws.filter((x) => x.type === "battery")) {
      const ib = wd.invert_power ? -1 : 1;
      this._ids(wd.power).forEach((id) => put("battery", wd, id, sgn(wd, id) * ib));
    }
    const skip = new Set([...seen, ...this._ids(w.exclude), VIRT]);
    const cons = new Map();
    const addC = (wd, id) => { if (!skip.has(id) && !cons.has(id)) cons.set(id, { f: sgn(wd, id), wd }); };
    for (const wd of ws.filter((x) => x.type === "devices")) this._ids(wd.entities).forEach((id) => addC(wd, id));
    for (const wd of ws.filter((x) => x.type === "flow")) this._ids(wd.deduct).forEach((id) => addC(wd, id));
    this._ids(w.entities).forEach((id) => addC(w, id));
    const sum = (m) => {
      let t = null;
      for (const id of this._use([...m.keys()])) { const v = this._watts(id); if (v !== null) t = (t || 0) + v * m.get(id).f; }
      return t;
    };
    return { solar: sum(roles.solar), grid: sum(roles.grid), bat: sum(roles.battery), roles, cons, hasSrc: seen.size > 0 };
  }

  /** Rechnet die Bilanz aus (Zufluss, Verbraucher, Rest); null ohne Quellen */
  _balanceCalc(w) {
    const m = this._balanceModel(w);
    if (!m.hasSrc) return null;
    const batIn = m.bat === null ? null : -m.bat;  // Entladen = Zufluss, Laden = Abfluss
    const supply = (m.solar || 0) + (m.grid || 0) + (batIn || 0);
    const rows = [...m.cons].map(([id, c]) => {
      const raw = this._watts(id);
      return { id, wd: c.wd, v: raw === null ? null : raw * c.f };
    });
    const used = rows.reduce((a, r) => a + (r.v || 0), 0);
    return { m, batIn, supply, rows, used, rest: supply - used };
  }
  /** Wert des virtuellen Sensors „nicht zugeordnet“ (W bzw. kWh) */
  _unassigned() {
    const bw = (this._config.widgets || []).find((x) => x.type === "balance") || {};
    const r = this._balanceCalc(bw)?.rest;
    // negativ = Messfehler/Vorzeichenproblem (die Bilanz zeigt das rot); in Listen und Summen nie weniger als 0
    return r == null ? null : Math.max(0, r);
  }

  /** Energiebilanz: Zufluss (Solar + Netz − Batterie) abzüglich aller Verbraucher = nicht zugeordnet */
  _balance(w) {
    const now = this._period === "now", c = this._balanceCalc(w);
    if (!c) return `<div class="sub">Lege ein <b>Energiefluss</b>-Widget mit Solar / Netz / Batterie an – dessen Sensoren übernimmt die Bilanz automatisch.</div>`;
    const { m, batIn, supply, rows, used, rest } = c;
    const uncounted = rows.filter((r) => r.v === null).length;
    const tol = Math.max(Math.abs(supply) * 0.05, now ? 30 : 0.05);
    const col = rest < -tol ? "#c0392b" : Math.abs(rest) <= tol ? "#2e9e5b" : "#e8833a";
    const pct = supply > 0 ? Math.min(100, Math.max(0, used / supply * 100)) : 0;
    const row = (label, v, cls = "") => `<div class="brow ${cls}"><span>${esc(label)}</span><b>${esc(this._fmtW(v))}</b></div>`;
    const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.v || 0)));
    const sorted = [...rows].sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));
    const home = (this._config.widgets || []).filter((x) => x.type === "flow" && this._ids(x.home).length).map((x) => this._sumW(x.home, x)).find((v) => v !== null);
    // Beitrag jedes Quell-Sensors zum Zufluss (mit Vorzeichen) – zeigt, welcher Sensor die Summe verfälscht
    const src = (role, k) => this._use([...m.roles[role].keys()]).map((id) => {
      const raw = this._watts(id), v = raw === null ? null : raw * m.roles[role].get(id).f * k;
      const t = v === null ? "–" : (v > 0 ? "+" : "") + this._fmtW(v);
      return `<div class="brow sub"><span title="${esc(id)}">↳ ${esc(this._label(m.roles[role].get(id).wd, id))}</span><b>${esc(t)}</b></div>`;
    }).join("");
    return `<div class="bal">
      <div class="bsec">Zufluss</div>
      ${m.solar !== null ? row("☀️ Solar", m.solar) + src("solar", 1) : ""}
      ${m.grid !== null ? row(m.grid >= 0 ? "🏭 Netzbezug" : "🏭 Einspeisung (netto)", m.grid) + src("grid", 1) : ""}
      ${batIn !== null ? row(batIn >= 0 ? "🔋 Batterie entlädt" : "🔋 Batterie lädt (netto)", batIn) + src("battery", -1) : ""}
      ${row("Summe verfügbar", supply, "tot")}
      ${home !== undefined ? `<div class="sub">Gemessener Hausverbrauch (Energiefluss): ${esc(this._fmtW(home))}</div>` : ""}
      <div class="bsec">Verbraucher (${rows.length})</div>
      ${sorted.map((r) => `<div class="brow"><span title="${esc(r.id)}">${esc(this._label(r.wd, r.id))}</span><b>${esc(r.v === null ? "–" : this._fmtW(r.v))}</b></div>
        ${r.v !== null ? `<div class="bar"><i style="width:${Math.min(100, Math.abs(r.v) / max * 100)}%"></i></div>` : ""}`).join("") || '<div class="sub">Noch keine Verbraucher: Sensoren im <b>Geräteverbrauch</b>-Widget werden automatisch übernommen.</div>'}
      ${uncounted ? `<div class="sub">${uncounted} Zähler ohne Leistungswert sind in „Aktuell“ nicht eingerechnet (nur Tag–Jahr).</div>` : ""}
      ${row("Verbraucher gesamt", used, "tot")}
      <div class="stack"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="rest" style="--c:${col}"><div><div class="nl">Energiemenge nicht zugeordnet</div>
        <div class="sub">${rest < -tol ? "Verbraucher übersteigen den Zufluss" : Math.abs(rest) <= tol ? "Alles zugeordnet ✓" : supply > 0 ? (100 - pct).toFixed(0) + " % des Zuflusses fehlen in der Zuordnung" : ""}</div></div>
        <div class="nv">${esc(this._fmtW(rest))}</div></div></div>`;
  }

  _history(w) {
    const d = this._hist[w.entity + "|" + (w.hours || 24)];
    if (!d || d.length < 2) return `<div class="sub">Lade Verlauf …</div>`;
    const W = 300, H = 90, xs = d.map((p) => p[0]), ys = d.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys, 0), y1 = Math.max(...ys);
    const X = (x) => ((x - x0) / (x1 - x0 || 1)) * W, Y = (y) => H - ((y - y0) / (y1 - y0 || 1)) * (H - 6) - 3;
    const pts = d.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" class="hist" preserveAspectRatio="none">
      <polygon points="0,${H} ${pts} ${W},${H}" fill="var(--primary-color)" opacity=".15"/>
      <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
      <div class="sub">min ${y0.toFixed(1)} · max ${y1.toFixed(1)} ${esc(this._st(w.entity)?.attributes?.unit_of_measurement || "")}</div>`;
  }

  async _loadHistory() {
    for (const w of this._config?.widgets || []) {
      if (w.type !== "history" || !w.entity) continue;
      const key = w.entity + "|" + (w.hours || 24);
      const last = this._histTs?.[key] || 0;
      if (Date.now() - last < 300000) continue;
      (this._histTs ||= {})[key] = Date.now();
      try {
        const start = new Date(Date.now() - (w.hours || 24) * 3600e3).toISOString();
        const res = await this._hass.callApi("GET", `history/period/${start}?filter_entity_id=${w.entity}&minimal_response&no_attributes`);
        this._hist[key] = (res?.[0] || []).map((s) => [new Date(s.last_changed || s.last_updated).getTime(), parseFloat(s.state)]).filter((p) => !isNaN(p[1]));
        this._render();
      } catch (e) { /* ignore */ }
    }
  }

  _periodStart() {
    const n = new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate();
    switch (this._period) {
      case "day": return new Date(y, m, d);
      case "week": return new Date(y, m, d - ((n.getDay() + 6) % 7));
      case "month": return new Date(y, m, 1);
      case "year": return new Date(y, 0, 1);
    }
  }

  _setPeriod(p) {
    this._period = p;
    try { localStorage.setItem("ob_period", p); } catch (e) { /* ignore */ }
    this._sig = "";
    this._loadStats(true);
    this._render();
  }

  /** Verbrauch je Sensor (kWh) aus den Langzeitstatistiken von Home Assistant */
  async _loadStats(force = false) {
    const p = this._period;
    if (p === "now" || !this._hass || this._statBusy) return;
    this._stat ||= {}; this._statTs ||= {};
    if (!force && this._statTs[p] && Date.now() - this._statTs[p] < (p === "day" ? 60000 : 300000)) return;
    const ids = new Set();
    for (const w of this._config.widgets || [])
      for (const k of ["power", "solar", "grid", "grid_export", "battery", "home", "entities"]) this._use(w[k]).forEach((i) => ids.add(i));
    for (const w of this._config.widgets || []) this._ids(w.deduct).forEach((i) => ids.add(i));
    for (const w of this._config.widgets || []) this._ids(w.entities).forEach((i) => ids.add(i));
    ids.delete(VIRT);
    if (!ids.size) return;
    this._statBusy = true; this._loading = !this._stat[p]; if (this._loading) this._render();
    const T = (v) => (typeof v === "number" ? v : Date.parse(v));
    try {
      const now = Date.now();
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period", start_time: this._periodStart().toISOString(), end_time: new Date(now).toISOString(),
        statistic_ids: [...ids], period: { day: "5minute", week: "hour", month: "hour", year: "day" }[p], types: ["mean", "change"],
      });
      const out = {}, missing = [];
      for (const id of ids) {
        const rows = res?.[id] || [], unit = this._st(id)?.attributes?.unit_of_measurement;
        if (!rows.length) { out[id] = null; missing.push(id); continue; }
        if (this._isEnergy(id)) {
          const f = unit === "Wh" ? 0.001 : unit === "MWh" ? 1000 : 1;
          out[id] = rows.reduce((a, r) => a + (r.change || 0), 0) * f;
        } else {
          const f = unit === "kW" ? 1 : unit === "MW" ? 1000 : 0.001;
          out[id] = rows.reduce((a, r) => a + (r.mean == null ? 0 : r.mean * (Math.min(T(r.end), now) - T(r.start)) / 3.6e6 * f), 0);
        }
      }
      this._stat[p] = out; this._statTs[p] = now; this._statMissing = missing;
    } catch (e) { this._statMissing = []; this._ust = "Statistik-Fehler: " + (e?.message || JSON.stringify(e)); }
    this._statBusy = false; this._loading = false; this._render();
  }

  /** Lässt Home Assistant die neueste Version aus GitHub laden (shell_command) und lädt die Seite neu. */
  async _update() {
    this._ust = "Lade Update …"; this._render();
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "shell_command", service: "omnibattery_update", return_response: true });
      const res = r?.response || {};
      if (res.returncode) throw new Error((res.stderr || `curl-Fehler ${res.returncode}`).toString().trim().slice(0, 200));
      // Tatsächlich geladene Resource-URL ermitteln (kann ein ?v=… oder hacstag enthalten) und deren Browser-Cache auffrischen
      const src = performance.getEntriesByType("resource").map((x) => x.name).find((n) => /\/energy\.js(\?|$)/.test(n)) || "/local/energy.js";
      let ver = null;
      try { ver = /OB_VERSION = "([^"]+)"/.exec(await (await fetch(src, { cache: "reload" })).text())?.[1]; } catch (e) { /* egal */ }
      if (ver === OB_VERSION) {
        this._ust = `Server liefert noch v${ver} – GitHub-Cache (bis ca. 5 Min.), bitte später erneut versuchen`; this._render();
        return;
      }
      this._ust = `v${ver || "?"} geladen – lade neu …`; this._render();
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      const m = e?.message || e?.error || JSON.stringify(e);
      this._ust = /not found|service/i.test(m) ? "Service shell_command.omnibattery_update fehlt – siehe README" : "Fehler: " + m;
      this._render();
    }
  }

  _render() {
    if (!this._config) return;
    const body = (this._config.widgets || []).map((w) => {
      const fn = this["_" + w.type];
      const title = w.name || (w.entity ? this._name(w.entity) : WIDGET_TYPES[w.type]?.short || "");
      const span = Math.min(4, Math.max(1, w.width || 1));
      return `<section class="w" data-w="${span}" style="grid-column: span ${span}">
        <h3>${esc(title)}</h3>${fn ? fn.call(this, w) : `<div class="sub">Unbekannter Typ: ${esc(w.type)}</div>`}</section>`;
    }).join("");
    const seg = this._config.show_periods === false ? "" : `<div class="seg">${Object.entries(PERIODS).map(([k, v]) =>
      `<button data-p="${k}" class="${k === this._period ? "on" : ""}">${v}</button>`).join("")}</div>
      ${this._period !== "now" && this._statMissing?.length ? `<div class="sub warn">Keine Langzeitstatistik für: ${esc(this._statMissing.map((i) => this._label({}, i)).join(", "))} (Sensor braucht eine state_class)</div>` : ""}`;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}
      .seg{display:flex;justify-content:center;gap:4px;flex-wrap:wrap;margin:0 0 12px}
      .seg button{padding:6px 14px;border-radius:16px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer;font:inherit}
      .seg button.on{background:var(--primary-color);color:var(--text-primary-color,#fff);border-color:var(--primary-color)}
      .warn{text-align:center;margin:-4px 0 10px;color:var(--warning-color,#e8833a)}
      ha-card{padding:16px}
      .title{font-size:1.3em;font-weight:600;margin-bottom:12px}
      .wrap{container-type:inline-size}
      .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      @container (max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.w[data-w="3"],.w[data-w="4"]{grid-column:span 2!important}}
      @container (max-width:560px){.grid{grid-template-columns:minmax(0,1fr)}.w{grid-column:span 1!important}}
      .w{background:var(--secondary-background-color);border-radius:12px;padding:12px;min-width:0}
      h3{margin:0 0 8px;font-size:.95em;font-weight:500;color:var(--secondary-text-color)}
      .big{font-size:1.6em;font-weight:600}.sub{font-size:.85em;color:var(--secondary-text-color)}
      .batt{text-align:center}.val{display:flex;align-items:center;gap:10px}
      .flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
      .node{background:var(--card-background-color);border-radius:10px;padding:10px 12px;border-left:4px solid var(--c);min-width:0}
      .nh{display:flex;align-items:center;gap:10px}.ni{font-size:1.6em;line-height:1}
      .nt{flex:1;min-width:0}.nl{font-weight:500}.nv{font-size:1.25em;font-weight:700;color:var(--c);white-space:nowrap}
      .parts{margin-top:8px;padding-top:6px;border-top:1px solid var(--divider-color);font-size:.8em;color:var(--secondary-text-color)}
      .parts div{display:flex;justify-content:space-between;gap:8px;padding:2px 0}
      .parts span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.parts b{font-weight:500;color:var(--primary-text-color);white-space:nowrap}
      .dev{margin-bottom:8px}.dl{display:flex;justify-content:space-between;font-size:.9em;gap:8px}
      .dl span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.dl b{white-space:nowrap}
      .bar{height:6px;border-radius:3px;background:var(--divider-color);margin-top:3px}
      .bar i{display:block;height:100%;border-radius:3px;background:var(--primary-color)}
      .hist{width:100%;height:90px}
      .bal{font-size:.92em}.bsec{margin:8px 0 2px;font-size:.8em;text-transform:uppercase;letter-spacing:.04em;color:var(--secondary-text-color)}
      .brow{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.brow span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .brow b{white-space:nowrap}.brow.sub{font-size:.8em;color:var(--secondary-text-color);padding-left:10px}.brow.sub b{font-weight:500}.brow.tot{border-top:1px solid var(--divider-color);margin-top:4px;padding-top:4px;font-weight:600}
      .stack{height:8px;border-radius:4px;background:var(--c,#e8833a);margin:10px 0;overflow:hidden;background:#e8833a55}
      .stack i{display:block;height:100%;background:var(--primary-color)}
      .rest{display:flex;justify-content:space-between;align-items:center;gap:10px;background:var(--card-background-color);border-radius:10px;padding:10px 12px;border-left:4px solid var(--c)}
      .rest .nv{font-size:1.3em;font-weight:700;color:var(--c);white-space:nowrap}
      .upd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:.8em;color:var(--secondary-text-color)}
      .upd button{padding:4px 10px;border-radius:6px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer}
    </style>
    <ha-card><div class="wrap">${this._config.title ? `<div class="title">${esc(this._config.title)}</div>` : ""}${seg}
      <div class="grid">${body || '<div class="sub">Noch keine Widgets – Karte bearbeiten und Widgets hinzufügen.</div>'}</div>
      ${this._config.show_update === false ? "" : `<div class="upd"><span>OmniBattery v${OB_VERSION}</span><button id="upd">⟳ Update</button><span>${esc(this._ust || "")}</span></div>`}
      </div></ha-card>`;
    this.shadowRoot.getElementById("upd")?.addEventListener("click", () => this._update());
    this.shadowRoot.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => this._setPeriod(b.dataset.p)));
  }
}

/** Entitäts-Auswahl: erst Gerät wählen, dann Sensoren inkl. aktuellem Wert sehen und auswählen. */
class ObEntityPicker extends HTMLElement {
  constructor() { super(); this._open = false; this._device = ""; this._q = ""; }
  set hass(h) { this._hass = h; if (this._open) this._renderList(); if (this._built) this._updateValues(); }
  set signs(g) { this._signs = { ...(g || {}) }; if (this._built) this._renderHead(); }
  set names(n) { this._names = { ...(n || {}) }; if (this._built) this._renderHead(); }
  set value(v) { this._value = v; if (this._built) this._renderHead(); }
  set options(o) { this._opts = o; }  // { label, multiple, domain, classes }

  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this.innerHTML = `<style>
      .p{margin:10px 0}.p .lb{font-size:.85em;color:var(--secondary-text-color);margin-bottom:4px}
      .p .sel{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);margin-bottom:4px}
      .p .sel .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .p .sel .v{font-weight:600}.p .sel .x{cursor:pointer;opacity:.7}
      .p button,.p select,.p input{padding:6px 10px;border-radius:6px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);font:inherit}
      .p button{cursor:pointer}.p .panel{border:1px solid var(--primary-color);border-radius:8px;padding:8px;margin-top:6px}
      .p .panel select,.p .panel input{width:100%;box-sizing:border-box;margin-bottom:6px}
      .p .list{max-height:300px;overflow:auto}
      .p [hidden]{display:none!important}.p .all{display:block;font-size:.85em;margin:0 0 6px}.p .all input{width:auto;margin:0 6px 0 0}
      .p .ph{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
      .p .cl{cursor:pointer;padding:2px 8px;font-size:1.2em;border-radius:6px}.p .cl:hover{background:var(--secondary-background-color)}
      .p .sel{flex-wrap:wrap}.p .sg{flex:1 1 100%;font-size:.85em}.p .sg input{width:auto;margin-right:6px}
      .p .sel input.nm{flex:1 1 100%;box-sizing:border-box;font-size:.85em}
      .p .it{display:flex;justify-content:space-between;gap:8px;padding:8px 6px;border-bottom:1px solid var(--divider-color);cursor:pointer}
      .p .it:hover{background:var(--secondary-background-color)}
      .p .it .n{min-width:0}.p .it small{display:block;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis}
      .p .it .v{white-space:nowrap;font-weight:600}
    </style><div class="p"><div class="lb"></div><div class="head"></div><div class="panel" hidden>
      <div class="ph"><b>Sensor auswählen</b><span class="cl" title="Schließen">✕</span></div>
      <label class="all"><input type="checkbox" class="allcb"> Alle Sensoren anzeigen (Filter aus)</label>
      <label class="all mw">Nur Sensoren, die gerade mindestens <input type="number" class="minw" min="0" step="1" placeholder="z. B. 10" style="width:90px;display:inline-block;margin:0 4px"> W verbrauchen</label>
      <select class="dev"></select><input class="q" placeholder="Durchsuchen …"><div class="list"></div></div></div>`;
    this.querySelector(".lb").textContent = this._opts?.label || "";
    this.querySelector(".cl").addEventListener("click", () => this._toggle(false));
    this.querySelector(".minw").addEventListener("input", (e) => {
      const v = parseFloat(e.target.value); this._minW = isNaN(v) ? null : v;
      this._fillDevices(); this._renderList();
    });
    this.querySelector(".allcb").addEventListener("change", (e) => { this._all = e.target.checked; this._fillDevices(); this._renderList(); });
    this.querySelector(".dev").addEventListener("change", (e) => { this._device = e.target.value; this._renderList(); });
    this.querySelector(".q").addEventListener("input", (e) => { this._q = e.target.value.toLowerCase(); this._renderList(); });
    this.querySelector(".list").addEventListener("click", (e) => {
      const it = e.target.closest(".it"); if (it) this._pick(it.dataset.id);
    });
    this.querySelector(".head").addEventListener("change", (e) => {
      const id = e.target.dataset?.sg; if (!id) return;
      this._signs ||= {};
      if (e.target.checked) this._signs[id] = -1; else delete this._signs[id];
      this.dispatchEvent(new CustomEvent("signed", { detail: { id, neg: e.target.checked } }));
    });
    this.querySelector(".head").addEventListener("input", (e) => {
      const id = e.target.dataset?.nm; if (!id) return;
      this._names ||= {};
      if (e.target.value) this._names[id] = e.target.value; else delete this._names[id];
      this.dispatchEvent(new CustomEvent("renamed", { detail: { id, name: e.target.value } }));
    });
    this.querySelector(".head").addEventListener("click", (e) => {
      const t = e.target;
      if (t.dataset.rm !== undefined) this._set(this._opts.multiple ? this._arr().filter((x) => x !== t.dataset.rm) : "");
      else if (t.dataset.open !== undefined) this._toggle(true);
    });
    this._renderHead();
  }

  _arr() { return Array.isArray(this._value) ? this._value : this._value ? [this._value] : []; }
  _set(v) { this._value = v; this.dispatchEvent(new CustomEvent("picked", { detail: { value: v } })); this._renderHead(); }
  _pick(id) {
    if (this._opts.multiple) { if (!this._arr().includes(id)) this._set([...this._arr(), id]); }
    else { this._set(id); this._toggle(false); }
  }
  _toggle(open) {
    this._open = open;
    this.querySelector(".panel").hidden = !open;
    if (open) { this.querySelector(".all").hidden = !(this._opts.domain || this._opts.classes); this._fillDevices(); this._renderList(); this.querySelector(".q").focus(); }
    this._renderHead();
  }

  _val(id) {
    if (id === VIRT) return "berechnet";
    const st = this._hass?.states?.[id]; if (!st) return "n/a";
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(st); } catch (e) { /* fallback */ }
    return `${st.state} ${st.attributes.unit_of_measurement || ""}`.trim();
  }
  _devName(id) {
    if (id === VIRT) return "Virtuell";
    const did = this._hass?.entities?.[id]?.device_id;
    const d = did && this._hass.devices?.[did];
    return d ? d.name_by_user || d.name || did : "";
  }
  _entName(id) {
    if (id === VIRT) return VIRT_NAME;
    const n = this._hass?.states?.[id]?.attributes?.friendly_name || id;
    const dn = this._devName(id);
    return dn && n.startsWith(dn + " ") ? n.slice(dn.length + 1) : n;
  }
  /** aktueller Wert in Watt (nur Leistungssensoren W/kW/MW, sonst null) */
  _wattsOf(id) {
    const st = this._hass?.states?.[id], u = st?.attributes?.unit_of_measurement, v = parseFloat(st?.state);
    if (isNaN(v) || !["W", "kW", "MW"].includes(u)) return null;
    return u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
  }
  _candidates() {
    const o = this._all ? {} : this._opts || {}, st = this._hass?.states || {};
    const list = Object.keys(st);
    if (this._opts?.virtual && this._minW == null) list.unshift(VIRT);
    return list.filter((id) => {
      if (id === VIRT) return true;
      if (o.domain && !id.startsWith(o.domain + ".")) return false;
      const a = st[id].attributes;
      if (this._minW != null) { const w = this._wattsOf(id); if (w === null || w < this._minW) return false; }
      if (o.classes && !o.classes.includes(a.device_class) && !(o.units && o.units.includes(a.unit_of_measurement))) return false;
      return true;
    });
  }

  _renderHead() {
    const h = this.querySelector(".head"); if (!h) return;
    const rows = this._arr().map((id) => `<div class="sel"><div class="n">${esc(this._entName(id))} <small>${esc(this._devName(id))}</small></div>
      <span class="v" data-v="${esc(id)}">${esc(this._val(id))}</span><span class="x" data-rm="${esc(id)}" title="Entfernen">✕</span>
      <input class="nm" data-nm="${esc(id)}" placeholder="Anzeigename (optional)" value="${esc(this._names?.[id] || "")}">
      ${this._opts.multiple ? `<label class="sg"><input type="checkbox" data-sg="${esc(id)}" ${this._signs?.[id] === -1 ? "checked" : ""}> Wert abziehen (−), z. B. separater Entlade-Sensor</label>` : ""}</div>`).join("");
    h.innerHTML = rows + (this._opts.multiple || !this._arr().length
      ? `<button data-open>${this._opts.multiple ? "+ Sensor hinzufügen" : "Sensor auswählen …"}</button>`
      : `<button data-open>Ändern …</button>`);
  }

  _updateValues() {
    this.querySelectorAll("[data-v]").forEach((el) => { el.textContent = this._val(el.dataset.v); });
  }

  _fillDevices() {
    const sel = this.querySelector(".dev"), cur = this._device;
    const devs = new Map();
    for (const id of this._candidates()) { const n = this._devName(id) || "(ohne Gerät)"; devs.set(n, (devs.get(n) || 0) + 1); }
    const names = [...devs.keys()].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = `<option value="">Alle Geräte (${[...devs.values()].reduce((a, b) => a + b, 0)})</option>` +
      names.map((n) => `<option value="${esc(n)}">${esc(n)} (${devs.get(n)})</option>`).join("");
    sel.value = names.includes(cur) ? cur : "";
    this._device = sel.value;
  }

  _renderList() {
    const l = this.querySelector(".list"); if (!l) return;
    const items = this._candidates().map((id) => ({ id, dev: this._devName(id) || "(ohne Gerät)", name: this._entName(id) }))
      .filter((x) => (!this._device || x.dev === this._device) && (!this._q || (x.name + x.id + x.dev).toLowerCase().includes(this._q)))
      .sort((a, b) => this._minW != null ? (this._wattsOf(b.id) ?? 0) - (this._wattsOf(a.id) ?? 0) : a.name.localeCompare(b.name));
    l.innerHTML = items.slice(0, 300).map((x) => `<div class="it" data-id="${esc(x.id)}"><div class="n">${esc(x.name)}<small>${esc(this._device ? x.id : x.dev + " · " + x.id)}</small></div>
      <div class="v">${esc(this._val(x.id))}</div></div>`).join("") || '<div class="it">Keine passenden Sensoren (Filter im Editor abschaltbar)</div>';
  }
}

class OmniBatteryDashboardEditor extends HTMLElement {
  setConfig(config) {
    const json = JSON.stringify(config);
    if (json === this._emitted) return;  // Echo unserer eigenen Änderung – eigenen Stand behalten
    this._config = JSON.parse(json);
    if (!Array.isArray(this._config.widgets)) this._config.widgets = [];
    this._build();
  }
  set hass(h) {
    this._hass = h;
    this.querySelectorAll("ha-form, ob-entity-picker").forEach((f) => (f.hass = h));
  }

  _fields(type) {
    return (SCHEMAS[type] || []).map((f) => {
      const isEnt = !!f._f;
      const flt = isEnt && this._filterOn !== false ? FILTERS[f._f] : null;
      return { name: f.name, schema: f, isEnt, multiple: !!f.selector?.entity?.multiple, domain: flt?.[0] || null, classes: flt?.[1] || null, units: flt?.[2] || null };
    });
  }

  _emit() {
    // Immer eine frische Kopie senden: Home Assistant hält die Konfiguration als Referenz,
    // in-place geänderte Objekte würden dort als "unverändert" erkannt und nicht gespeichert.
    this._emitted = JSON.stringify(this._config);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: JSON.parse(this._emitted) }, bubbles: true, composed: true }));
  }

  _build() {
    const ws = this._config.widgets || [];
    this.innerHTML = `<style>
      .ob details{border:1px solid var(--divider-color);border-radius:8px;margin:8px 0;padding:4px 8px}
      .ob summary{cursor:pointer;padding:8px 0;font-weight:500}
      .ob .row{display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;align-items:center}
      .ob button,.ob select{padding:6px 10px;border-radius:6px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer}
      .ob input.t{width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
    </style><div class="ob">
      <label>Titel</label><input class="t" id="title" value="${esc(this._config.title)}">
      <label><input type="checkbox" id="flt" ${this._filterOn === false ? "" : "checked"}> Sensorliste vorfiltern (Leistung / Batterie)</label>
      <label><input type="checkbox" id="sp" ${this._config.show_periods === false ? "" : "checked"}> Zeitraum-Umschalter (Aktuell / Tag / Woche / Monat / Jahr) anzeigen</label><br>
      <label><input type="checkbox" id="su" ${this._config.show_update === false ? "" : "checked"}> Update-Button in der Karte anzeigen</label>
      <div id="list"></div>
      <div class="row"><select id="newtype">${Object.entries(WIDGET_TYPES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
        <button id="add">+ Widget hinzufügen</button></div>
      <div class="row" style="opacity:.8;font-size:.85em">Version ${OB_VERSION} <button id="reload">↻ Neu laden</button></div></div>`;
    this.querySelector("#reload").addEventListener("click", () => location.reload());
    this.querySelector("#title").addEventListener("input", (e) => { this._config.title = e.target.value; this._emit(); });
    this.querySelector("#sp").addEventListener("change", (e) => {
      if (e.target.checked) delete this._config.show_periods; else this._config.show_periods = false;
      this._emit();
    });
    this.querySelector("#su").addEventListener("change", (e) => {
      if (e.target.checked) delete this._config.show_update; else this._config.show_update = false;
      this._emit();
    });
    this.querySelector("#flt").addEventListener("change", (e) => { this._filterOn = e.target.checked; this._build(); });
    this.querySelector("#add").addEventListener("click", () => {
      this._config.widgets = [...ws, { type: this.querySelector("#newtype").value }];
      this._emit(); this._build();
    });
    const list = this.querySelector("#list");
    ws.forEach((w, i) => {
      const d = document.createElement("details");
      d.open = !!this._open?.has(i);
      d.addEventListener("toggle", () => { (this._open ||= new Set())[d.open ? "add" : "delete"](i); });
      const t = WIDGET_TYPES[w.type] || { icon: "?", label: w.type };
      d.innerHTML = `<summary>${t.icon} ${esc(w.name || t.label)}</summary>`;
      const fields = this._fields(w.type);
      const plain = fields.filter((f) => !f.isEnt);
      const upd = (patch) => {
        this._config.widgets = this._config.widgets.map((x, j) => {
          if (j !== i) return x;
          const nw = { ...x, ...patch };
          for (const k of Object.keys(nw)) if (nw[k] === "" || nw[k] === undefined || (Array.isArray(nw[k]) && !nw[k].length) || ((k === "names" || k === "signs") && !Object.keys(nw[k]).length)) delete nw[k];
          return nw;
        });
        this._emit();
      };
      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.data = Object.fromEntries(plain.map((f) => [f.name, w[f.name]]));
      form.schema = plain.map((f) => f.schema).map(({ _f, ...f }) => f);
      form.computeLabel = (s) => LABELS[s.name] || s.name;
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        upd(Object.fromEntries(plain.map((f) => [f.name, ev.detail.value[f.name]])));
      });
      d.appendChild(form);
      for (const f of fields.filter((x) => x.isEnt)) {
        const pk = document.createElement("ob-entity-picker");
        pk.options = { virtual: f.name === "home" || (f.name === "entities" && w.type === "devices"), label: LABELS_T[w.type]?.[f.name] || LABELS[f.name] || f.name, multiple: f.multiple, domain: f.domain, classes: f.classes, units: f.units };
        pk.value = w[f.name];
        pk.names = w.names;
        pk.signs = w.signs;
        pk.addEventListener("signed", (ev) => {
          ev.stopPropagation();
          const signs = { ...(this._config.widgets[i].signs || {}) };
          if (ev.detail.neg) signs[ev.detail.id] = -1; else delete signs[ev.detail.id];
          upd({ signs });
        });
        pk.addEventListener("renamed", (ev) => {
          ev.stopPropagation();
          const names = { ...(this._config.widgets[i].names || {}) };
          if (ev.detail.name) names[ev.detail.id] = ev.detail.name; else delete names[ev.detail.id];
          upd({ names });
        });
        pk.hass = this._hass;
        pk.addEventListener("picked", (ev) => { ev.stopPropagation(); upd({ [f.name]: ev.detail.value }); });
        d.appendChild(pk);
      }
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<button data-a="up">↑</button><button data-a="down">↓</button><button data-a="del">🗑 Entfernen</button>`;
      row.addEventListener("click", (ev) => {
        const a = ev.target.dataset?.a; if (!a) return;
        const arr = [...this._config.widgets];
        if (a === "del") arr.splice(i, 1);
        else { const j = a === "up" ? i - 1 : i + 1; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
        this._config.widgets = arr; this._open = new Set(); this._emit(); this._build();
      });
      d.appendChild(row);
      list.appendChild(d);
    });
  }
}

const defineOnce = (n, c) => { if (!customElements.get(n)) customElements.define(n, c); };
defineOnce("ob-entity-picker", ObEntityPicker);
defineOnce("omnibattery-dashboard", OmniBatteryDashboard);
defineOnce("omnibattery-dashboard-editor", OmniBatteryDashboardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "omnibattery-dashboard",
  name: "OmniBattery Dashboard",
  description: "Frei konfigurierbares Energie-Dashboard (Batterie, Solar, Netz, Geräte, Verlauf)",
});
console.info(`%c OMNIBATTERY-DASHBOARD %c v${OB_VERSION}`, "background:#2e9e5b;color:#fff", "");
