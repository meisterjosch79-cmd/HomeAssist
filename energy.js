/*
 * OmniBattery Dashboard – Custom Lovelace Card für Home Assistant
 * Frei konfigurierbar über den visuellen Editor (Config-Seite) der Karte.
 * Widgets: battery, flow, value, devices, history
 */
const OB_VERSION = "0.21.0";

const WIDGET_TYPES = {
  battery: { label: "Batterie (Laden / Entladen)", icon: "🔋" , short: "Batterie" },
  flow: { label: "Energiefluss (Solar / Netz / Batterie / Haus)", icon: "⚡" , short: "Energiefluss" },
  value: { label: "Einzelwert", icon: "🔢" , short: "Wert" },
  devices: { label: "Geräteverbrauch (Liste)", icon: "🔌" , short: "Geräte" },
  balance: { label: "Energiebilanz (nicht zugeordnet)", icon: "⚖️", short: "Energiebilanz" },
  top: { label: "Top-Verbraucher (alle Sensoren im System)", icon: "🏆", short: "Top-Verbraucher" },
  history: { label: "Verlauf (Diagramm)", icon: "📈" , short: "Verlauf" },
};

const LABELS = {
  type: "Typ", width: "Breite (1-4 Spalten)", name: "Name", soc: "Ladestand (SOC) — Sensor für den Ring (nur einer)",
  power: "Leistung — + = Laden; Entlade-Sensor mit „abziehen“ markieren", invert_power: "Vorzeichen umkehren (Standard: + = Laden)",
  capacity_kwh: "Kapazität (kWh, optional)", solar: "Solarproduktion — mehrere Sensoren werden addiert",
  grid: "Netz: Bezug — + = Bezug, − = Einspeisung (oder reiner Bezug-Sensor)", grid_export: "Netz: Einspeisung — optional, nur bei separatem Sensor",
  battery: "Batterie — + = Laden; Entlade-Sensor mit „abziehen“ markieren",
  home: "Hausverbrauch — mehrere Sensoren werden addiert; leer = berechnen",
  invert_grid: "Netz-Vorzeichen umkehren (wenn Einspeisung als Bezug angezeigt wird)", invert_battery: "Batterie-Vorzeichen umkehren",
  refresh_s: "Aktualisierung alle … Sekunden (Standard 5, nur Ansicht „Aktuell“)", count: "Anzahl der Einträge (Standard 10, bis 1000; lange Listen scrollen)", include_sources: "Quellen (Solar/Netz/Batterie aus den Energiefluss-/Batterie-Widgets) ebenfalls anzeigen",
  deduct: "Von „nicht zugeordnet“ abziehen — andere Bereiche, z. B. anderes Haus, Wallbox", entity: "Sensor", exclude: "Ignorieren — diese Sensoren nicht mitzählen (optional)", icon: "Icon", decimals: "Nachkommastellen", entities: "Geräte — jeder Sensor ist ein eigener Eintrag",
  max: "Maximalwert für Balken (leer = automatisch)", hours: "Zeitraum (Stunden)",
};

// Typabhängige Feldbeschriftungen
const LABELS_T = { balance: { entities: "Zusätzliche Verbraucher — optional; Geräte aus den Geräte-Widgets werden automatisch übernommen" } };
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
  top: [NAME, { name: "count", selector: { number: { min: 1, max: 1000, mode: "box" } } }, { name: "refresh_s", selector: { number: { min: 1, max: 3600, mode: "box", unit_of_measurement: "s" } } }, MULTI("exclude"), BOOL("include_sources"), WIDTH],
  history: [NAME, ENT("entity"), { name: "hours", selector: { number: { min: 1, max: 168, mode: "box" } } }, WIDTH],
};

// Virtueller Sensor: "Nicht zugeordnete Energiemenge" aus der Energiebilanz, nutzbar in Geräteliste und Hausverbrauch
const VIRT = "virtual:unassigned", VIRT_NAME = "Nicht zugeordnete Energiemenge";
// Helfer = vom Nutzer definierte virtuelle Sensoren (Summe/Differenz mehrerer Sensoren), Id "virtual:helper:<id>"
const HELP_PREFIX = "virtual:helper:";
const PERIODS = { now: "Aktuell", day: "Tag", week: "Woche", month: "Monat", year: "Jahr" };
const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));
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
    this._rawCanon = canon(config);
    if (!this._period) {
      let st = null;
      try { st = localStorage.getItem("ob_period"); } catch (e) { /* ignore */ }
      this._period = PERIODS[st] ? st : PERIODS[config.default_period] ? config.default_period : "now";
    }
    this._sig = "";
    this._topCache = {};
    this._render();
    this._startPoll();
  }

  set hass(hass) {
    this._hass = hass;
    const ids = this._entityIds();
    const tops = (this._config?.widgets || []).filter((w) => w.type === "top");
    const sig = this._period !== "now" ? "p" + this._period + "|" + (this._topTs || 0)
      : ids.map((id) => { const s = hass.states[id]; return s ? s.state + s.attributes.unit_of_measurement : "-"; }).join("|")
        + tops.map((w) => "T" + this._topRows(w).map((r) => r.id + Math.round(r.v)).join(",")).join("");
    if (tops.length && this._period !== "now") this._ensureStatIds();
    if (sig !== this._sig) {
      // Auswahlfeld in der Top-Liste geöffnet: nicht neu zeichnen, sonst klappt es zu
      if (this.shadowRoot?.activeElement?.classList?.contains("ta")) this._pendingRender = true;
      else { this._sig = sig; this._render(); }
    }
    this._loadHistory();
    this._loadStats();
  }

  connectedCallback() { this._startPoll(); }
  disconnectedCallback() { clearInterval(this._pollTimer); this._pollTimer = null; }
  /** Live-Abfrage: ruft einen Home-Assistant-Dienst (z. B. Marstek „Daten sofort abfragen“) regelmäßig auf, solange das Dashboard offen ist */
  _startPoll() {
    clearInterval(this._pollTimer); this._pollTimer = null;
    const sec = Number(this._config?.poll_s), svc = String(this._config?.poll_service || "marstek_local_api.request_data_sync");
    if (!(sec >= 5) || !svc.includes(".") || !this.isConnected) return;
    const [dom, name] = svc.split(".");
    this._pollTimer = setInterval(async () => {
      if (document.visibilityState !== "visible" || this._pollBusy || !this._hass) return;
      this._pollBusy = true;
      try { await this._hass.callService(dom, name, {}); this._pollErr = ""; } catch (e) { this._pollErr = "Live-Abfrage fehlgeschlagen: " + (e?.message || "Dienst nicht gefunden"); this._render(); }
      this._pollBusy = false;
    }, sec * 1000);
  }

  getCardSize() { return 3 + (this._config?.widgets?.length || 0); }

  _entityIds() {
    const ids = [];
    for (const w of this._config?.widgets || []) {
      for (const k of ["soc", "entity"]) if (w[k]) ids.push(w[k]);
      for (const k of ["power", "solar", "grid", "grid_export", "battery", "home", "deduct"]) ids.push(...this._ids(w[k]));
      if (Array.isArray(w.entities)) ids.push(...w.entities);
    }
    for (const h of this._config?.helpers || []) ids.push(...this._ids(h.entities));
    return ids;
  }

  /** Anzeigename eines Sensors im Widget (eigener Name oder Entity-Name) */
  _label(w, id) { return w.names?.[id] || (id === VIRT ? VIRT_NAME + " (virtuell)" : null) || this._helper(id)?.name || this._st(id)?.attributes?.friendly_name || id; }
  /** Kleine Einzelwerte aller Sensoren eines Widget-Feldes */
  _parts(w, ids, always = false) {
    ids = ids.filter(Boolean);
    if (!ids.length || (!always && ids.length < 2 && !ids.some((id) => w.names?.[id]))) return "";
    return `<div class="parts">${ids.map((id) => `<div><span title="${esc(id)}">${esc(this._label(w, id))}</span><b>${esc(id === VIRT && (this._unassigned(true) ?? 0) < 0 ? "⚠ " + this._fmtW(this._unassigned(true)) : (w.signs?.[id] === -1 ? "− " : "") + this._fmtW(this._watts(id)))}</b></div>`).join("")}</div>`;
  }
  _ids(v) { return Array.isArray(v) ? v : v ? [v] : []; }
  _helper(id) { return typeof id === "string" && id.startsWith(HELP_PREFIX) ? (this._config?.helpers || []).find((h) => h.id === id.slice(HELP_PREFIX.length)) : null; }
  _isEnergy(id) {
    const a = this._st(id)?.attributes || {};
    return ["Wh", "kWh", "MWh"].includes(a.unit_of_measurement) || a.device_class === "energy";
  }
  /** Sensoren eines Feldes, die im aktuellen Zeitraum zählen:
   *  Aktuell = nur Leistungssensoren; Tag/Woche/Monat/Jahr = Energiezähler, sonst Leistung (Statistik-Mittelwert × Zeit). */
  _use(v) {
    const ids = this._ids(v), en = ids.filter((i) => this._isEnergy(i)), virt = ids.filter((i) => i === VIRT || String(i).startsWith(HELP_PREFIX));
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
    const hp = this._helper(id);
    if (hp) {  // Helfer: Komponenten addieren bzw. (bei „abziehen“) subtrahieren
      let t = null;
      for (const c of this._use((hp.entities || []).filter((x) => !String(x).startsWith("virtual:")))) {
        const v = this._watts(c);
        if (v !== null) t = (t || 0) + (hp.signs?.[c] === -1 ? -v : v);
      }
      return t;
    }
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
    let rows = [...m.cons].map(([id, c]) => {
      const raw = this._watts(id);
      return { id, wd: c.wd, v: raw === null ? null : raw * c.f };
    });
    // Zeiträume: hat ein Gerät einen Energiezähler UND einen Leistungssensor in der Liste, zählt nur der Zähler (sonst doppelt gezählt)
    const skipped = [];
    if (this._period !== "now") {
      const dev = (id) => this._hass?.entities?.[id]?.device_id;
      const hasEn = new Set(rows.filter((r) => this._isEnergy(r.id) && dev(r.id)).map((r) => dev(r.id)));
      rows = rows.filter((r) => { const dup = !this._isEnergy(r.id) && dev(r.id) && hasEn.has(dev(r.id)); if (dup) skipped.push(r); return !dup; });
    }
    const used = rows.reduce((a, r) => a + (r.v || 0), 0);
    return { m, batIn, supply, rows, used, rest: supply - used, skipped };
  }
  /** Wert des virtuellen Sensors „nicht zugeordnet“ (W bzw. kWh) */
  _unassigned(raw = false) {
    const bw = (this._config.widgets || []).find((x) => x.type === "balance") || {};
    const r = this._balanceCalc(bw)?.rest;
    // negativ = zu viele/doppelte Verbraucher oder Vorzeichenproblem; in Summen nie weniger als 0, in der Einzelzeile (raw) sichtbar
    return r == null ? null : raw ? r : Math.max(0, r);
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
      <div class="bsec">Hausverbrauch aus den Quellen</div>
      <div class="sub">Solar + Netzbezug + Batterie-Entladung − Einspeisung − Batterie-Ladung</div>
      ${m.solar !== null ? row("☀️ Solar", m.solar) + src("solar", 1) : ""}
      ${m.grid !== null ? row(m.grid >= 0 ? "🏭 Netzbezug" : "🏭 Einspeisung (netto)", m.grid) + src("grid", 1) : ""}
      ${batIn !== null ? row(batIn >= 0 ? "🔋 Batterie entlädt" : "🔋 Batterie lädt (netto)", batIn) + src("battery", -1) : ""}
      ${row("= Hausverbrauch (berechnet)", supply, "tot")}
      ${home !== undefined ? `<div class="sub">Gemessener Hausverbrauch (Energiefluss): ${esc(this._fmtW(home))}</div>` : ""}
      <div class="bsec">Davon erklärt durch Verbraucher (${rows.length})</div>
      ${sorted.map((r) => `<div class="brow"><span title="${esc(r.id)}${r.v !== null && supply > 0 && r.v > supply ? " – größer als der gesamte Zufluss: vermutlich ein Gesamtzähler" : ""}">${r.v !== null && supply > 0 && r.v > supply ? "⚠ " : ""}${esc(this._label(r.wd, r.id))}</span><b>${esc(r.v === null ? "–" : this._fmtW(r.v))}</b></div>
        ${r.v !== null ? `<div class="bar"><i style="width:${Math.min(100, Math.abs(r.v) / max * 100)}%"></i></div>` : ""}`).join("") || '<div class="sub">Noch keine Verbraucher: Sensoren im <b>Geräteverbrauch</b>-Widget werden automatisch übernommen.</div>'}
      ${rows.some((r) => r.v !== null && supply > 0 && r.v > supply) ? `<div class="sub">⚠ Dieser Verbraucher ist größer als der gesamte Zufluss – vermutlich ein Gesamt- oder Hauptzähler. Blende ihn über „Ignorieren“ aus.</div>` : ""}
      ${c.skipped.length ? `<div class="sub">Nicht doppelt gezählt (Gerät hat Energiezähler): ${esc(c.skipped.map((r) => this._label(r.wd, r.id)).join(", "))}</div>` : ""}
      ${uncounted ? `<div class="sub">${uncounted} Zähler ohne Leistungswert sind in „Aktuell“ nicht eingerechnet (nur Tag–Jahr).</div>` : ""}
      ${row("Verbraucher gesamt", used, "tot")}
      <div class="stack"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="rest" style="--c:${col}"><div><div class="nl">Energiemenge nicht zugeordnet</div>
        <div class="sub">${rest < -tol ? "Verbraucher übersteigen den Zufluss" : Math.abs(rest) <= tol ? "Alles zugeordnet ✓" : supply > 0 ? (100 - pct).toFixed(0) + " % des Zuflusses fehlen in der Zuordnung" : ""}</div></div>
        <div class="nv">${esc(this._fmtW(rest))}</div></div></div>`;
  }

  _hideSet() {
    if (!this._hide) {
      try { this._hide = new Set(JSON.parse(localStorage.getItem("ob_top_hide") || "[]")); } catch (e) { this._hide = new Set(); }
    }
    return this._hide;
  }
  _saveHide() { try { localStorage.setItem("ob_top_hide", JSON.stringify([...this._hide])); } catch (e) { /* ignore */ } }
  _toggleHide(id, on) {
    const h = this._hideSet(); if (on) h.add(id); else h.delete(id);
    this._saveHide(); this._topCache = {}; this._sig = ""; this._render();
  }

  /** Sensor aus der Top-Liste einem Geräteverbrauch-Widget zuordnen: speichert direkt in der Dashboard-Konfiguration */
  async _assign(id, wi) {
    this._ust = "Ordne zu …"; this._render();
    try {
      const seg = location.pathname.split("/")[1], url_path = seg === "lovelace" ? null : seg;
      const cfg = await this._hass.callWS({ type: "lovelace/config", url_path });
      let hit = null;
      const walk = (n) => { if (hit || !n || typeof n !== "object") return; if (n.type === "custom:omnibattery-dashboard" && canon(n) === this._rawCanon) { hit = n; return; } Object.values(n).forEach(walk); };
      walk(cfg);
      if (!hit) throw new Error("Karte in der Dashboard-Konfiguration nicht gefunden");
      const t = hit.widgets?.[wi];
      if (!t || t.type !== "devices") throw new Error("Ziel-Widget nicht gefunden");
      const list = this._ids(t.entities).filter((x) => x !== id); list.push(id); t.entities = list;
      await this._hass.callWS({ type: "lovelace/config/save", url_path, config: cfg });
      this._rawCanon = canon(hit);
      const lw = this._config.widgets[wi]; lw.entities = [...list];
      this._ust = `Zugeordnet: ${this._label(lw, id)} → ${lw.name || "Geräte"}`;
    } catch (e) {
      this._ust = "Zuordnen nicht möglich: " + (e?.message || e?.error?.message || e?.code || JSON.stringify(e)) + " (braucht Administratorrechte und ein Dashboard im Storage-Modus)";
    }
    this._topCache = {}; this._sig = ""; this._render();
  }

  /** Leistung in Watt, nur echte Leistungssensoren (W/kW/MW) */
  _pw(id) {
    const st = this._hass?.states?.[id], u = st?.attributes?.unit_of_measurement, v = parseFloat(st?.state);
    if (isNaN(v) || !["W", "kW", "MW"].includes(u)) return null;
    return u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
  }
  /** Statistik-Kandidaten für Top-Verbraucher: Energiezähler, Leistungssensoren nur von Geräten ohne Energiezähler */
  _topCandidates() {
    const list = this._statIdList || [], dev = (id) => this._hass?.entities?.[id]?.device_id;
    const en = [], pw = [];
    for (const x of list) {
      if (!x.statistic_id.startsWith("sensor.")) continue;
      // Einheit: aktueller Zustand, sonst Felder der Statistik-Liste (Name je nach HA-Version verschieden)
      const u = this._st(x.statistic_id)?.attributes?.unit_of_measurement ?? x.display_unit_of_measurement ?? x.statistics_unit_of_measurement ?? x.unit_of_measurement;
      if (["Wh", "kWh", "MWh"].includes(u)) en.push(x.statistic_id);
      else if (["W", "kW", "MW"].includes(u)) pw.push(x.statistic_id);
    }
    const devEn = new Set(en.map(dev).filter(Boolean));
    return [...en, ...pw.filter((id) => !dev(id) || !devEn.has(dev(id)))];
  }
  async _ensureStatIds() {
    if (this._statIdList || this._statIdBusy || !this._hass) return;
    this._statIdBusy = true;
    try {
      this._statIdList = (await this._hass.callWS({ type: "recorder/list_statistic_ids" })) || [];
      this._topTs = Date.now();
      if (this._statBusy) this._again = true; else this._loadStats(true);
    } catch (e) { this._statIdList = []; this._ust = "Statistik-Liste nicht verfügbar: " + (e?.message || ""); }
    this._statIdBusy = false;
  }
  /** Sortierte Verbraucher aller Sensoren des Systems (W in „Aktuell“, kWh in den Zeiträumen) */
  _topRows(w) {
    if (this._period !== "now") return this._topCompute(w);
    // Momentaufnahme, höchstens alle refresh_s Sekunden neu berechnet
    if (!this._hass) return [];
    const key = (this._config?.widgets || []).indexOf(w), c = (this._topCache ||= {})[key];
    if (c && (Date.now() - c.ts) / 1000 < (w.refresh_s || 5)) return c.rows;
    const rows = this._topCompute(w);
    this._topCache[key] = { ts: Date.now(), rows };
    return rows;
  }
  _topCompute(w) {
    const now = this._period === "now", ex = new Set([...this._ids(w.exclude), VIRT]);
    if (!w.include_sources) {
      for (const x of this._config?.widgets || []) {
        if (x.type === "flow") ["solar", "grid", "grid_export", "battery"].forEach((k) => this._ids(x[k]).forEach((i) => ex.add(i)));
        if (x.type === "battery") this._ids(x.power).forEach((i) => ex.add(i));
      }
    }
    let rows;
    const info = { total: 0, active: 0, excluded: 0, hidden: 0 };
    if (now) {
      const all = Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("sensor.")).map((id) => ({ id, v: this._pw(id) })).filter((r) => r.v !== null);
      info.total = all.length;
      const act = all.filter((r) => r.v >= 1); info.active = act.length;
      rows = act.filter((r) => !ex.has(r.id)); info.excluded = act.length - rows.length;
    } else {
      const st = this._stat?.[this._period] || {}, cand = this._topCandidates();
      info.total = cand.length;
      const act = cand.map((id) => ({ id, v: st[id] ?? null })).filter((r) => r.v !== null && r.v >= 0.01); info.active = act.length;
      rows = act.filter((r) => !ex.has(r.id)); info.excluded = act.length - rows.length;
    }
    const hide = this._hideSet();
    info.hidden = rows.filter((r) => hide.has(r.id)).length;
    this._topInfo = info;
    rows = rows.map((r) => ({ ...r, hidden: hide.has(r.id) }));
    if (!this._showHidden) rows = rows.filter((r) => !r.hidden);
    return rows.sort((a, b) => b.v - a.v).slice(0, w.count || 10);
  }
  _top(w) {
    const rows = this._topRows(w), max = Math.max(1e-9, ...rows.map((r) => r.v));
    if (this._period !== "now" && !this._statIdList) return `<div class="sub">Lade Statistik …</div>`;
    const nHide = this._hideSet().size;
    const devs = (this._config.widgets || []).map((x, i) => ({ x, i })).filter((o) => o.x.type === "devices");
    const assigned = (id) => devs.find((d) => this._ids(d.x.entities).includes(id));
    const opts = devs.map((d, k) => `<option value="${d.i}">${esc(d.x.name || "Geräte " + (k + 1))}</option>`).join("");
    const bar = (r) => `<div class="tb"><div class="bar"><i style="width:${Math.min(100, r.v / max * 100)}%"></i></div>${
      assigned(r.id) ? `<span class="tag">✓ ${esc(assigned(r.id).x.name || "Geräte")}</span>`
        : devs.length ? `<select class="ta" data-id="${esc(r.id)}"><option value="">＋ zu Gerät …</option>${opts}</select>` : ""}</div>`;
    return `<div class="tt"><button class="tf">${this._showHidden ? "🙈 Ausblenden" : `👁 Ausgeblendete anzeigen (${nHide})`}</button>${nHide ? `<button class="tr">Zurücksetzen</button>` : ""}</div>
      <div class="devs${rows.length > 12 ? " long" : ""}">${rows.map((r, i) => `
      <div class="dev${r.hidden ? " hid" : ""}"><div class="dl"><label title="${esc(r.id)}"><input type="checkbox" class="tk" data-id="${esc(r.id)}" ${r.hidden ? "checked" : ""}> ${i + 1}. ${esc(this._label(w, r.id))}</label><b>${esc(this._fmtW(r.v))}</b></div>
      ${bar(r)}</div>`).join("") || `<div class="sub">${this._period !== "now" && this._statErr ? esc(this._statErr) : `Keine Verbraucher gefunden. ${this._topInfo ? `${this._topInfo.total} ${this._period === "now" ? "Leistungssensoren" : "Sensoren mit Statistik"} im System, ${this._topInfo.active} davon aktiv, ${this._topInfo.excluded} als Quelle/„Ignorieren“ ausgeblendet, ${this._topInfo.hidden} per Häkchen ausgeblendet.` : ""}`}</div>`}</div>
      ${rows.length ? `<div class="sub" style="margin-top:6px">Summe ${rows.filter((r) => !r.hidden).length} sichtbar: ${esc(this._fmtW(rows.filter((r) => !r.hidden).reduce((a, r) => a + r.v, 0)))}${w.include_sources ? "" : " · Quellen ausgeblendet"}</div>` : ""}
      <div class="sub" style="margin-top:4px">Häkchen = für den Moment ausblenden (nur in diesem Browser).</div>`;
  }

  _history(w) {
    const d = this._hist[w.entity + "|" + (w.hours || 24)];
    if (!d || d.length < 2) return `<div class="sub">Lade Verlauf …</div>`;
    const ys = d.map((p) => p[1]), unit = this._st(w.entity)?.attributes?.unit_of_measurement || "";
    const f = (v) => v.toLocaleString("de-DE", { maximumFractionDigits: unit === "W" ? 0 : 2 }) + (unit ? " " + unit : "");
    return `<div class="chart" data-wi="${(this._config.widgets || []).indexOf(w)}"></div>
      <div class="sub">min ${esc(f(Math.min(...ys)))} · max ${esc(f(Math.max(...ys)))} · Maus über das Diagramm zeigt Zeit und Wert</div>`;
  }

  /** Zeichnet die Diagramme mit Achsen, Nulllinie und Hover-Anzeige in der tatsächlichen Pixelbreite */
  _drawCharts() {
    this.shadowRoot.querySelectorAll(".chart").forEach((el) => {
      const w = (this._config.widgets || [])[+el.dataset.wi]; if (!w) return;
      const d = this._hist[w.entity + "|" + (w.hours || 24)]; if (!d || d.length < 2) return;
      const unit = this._st(w.entity)?.attributes?.unit_of_measurement || "";
      const W = Math.max(240, el.clientWidth || 300), H = 190, L = 52, R = 8, T = 10, B = 26, PW = W - L - R, PH = H - T - B;
      const t1 = Date.now(), t0 = t1 - (w.hours || 24) * 3600e3;
      let ys = d.map((p) => p[1]);
      let lo = Math.min(...ys, 0), hi = Math.max(...ys, 0);
      if (lo === hi) hi = lo + 1;
      // „schöne“ Achsenschritte
      const raw = (hi - lo) / 4, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw);
      lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
      const kw = unit === "W" && Math.max(Math.abs(lo), Math.abs(hi)) >= 2000;
      const tick = (v) => (kw ? (v / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " kW" : v.toLocaleString("de-DE", { maximumFractionDigits: 2 }) + (unit ? " " + unit : ""));
      const X = (t) => L + ((t - t0) / (t1 - t0)) * PW, Y = (v) => T + (1 - (v - lo) / (hi - lo)) * PH, Y0 = Y(0);
      const pts = d.filter((p) => p[0] >= t0 - 1).map((p) => [Math.max(p[0], t0), p[1]]);
      if (!pts.length) pts.push([t0, d[0][1]]);
      pts.push([t1, pts[pts.length - 1][1]]);
      const line = pts.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
      const area = `${X(pts[0][0]).toFixed(1)},${Y0.toFixed(1)} ${line} ${X(t1).toFixed(1)},${Y0.toFixed(1)}`;
      let grid = "";
      for (let v = lo; v <= hi + step / 1000; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--divider-color)" stroke-width="1"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--secondary-text-color)">${esc(tick(v))}</text>`;
      // Zeitachse: runde Uhrzeiten
      const span = t1 - t0, steps = [3600e3, 2 * 3600e3, 3 * 3600e3, 6 * 3600e3, 12 * 3600e3, 24 * 3600e3, 2 * 24 * 3600e3, 7 * 24 * 3600e3], ti = steps.find((x) => span / x <= 7) || steps[steps.length - 1];
      const dt = new Date(t0); dt.setMinutes(0, 0, 0); if (ti >= 24 * 3600e3) dt.setHours(0);
      let xt = "", tt = dt.getTime(); while (tt < t0) tt += ti;
      for (; tt <= t1; tt += ti) {
        const dd = new Date(tt), lab = ti >= 24 * 3600e3 ? dd.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : dd.getHours() === 0 && span > 24 * 3600e3 ? dd.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : dd.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        xt += `<line x1="${X(tt).toFixed(1)}" x2="${X(tt).toFixed(1)}" y1="${T}" y2="${T + PH}" stroke="var(--divider-color)" stroke-width="1" stroke-dasharray="2 3"/><text x="${X(tt).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--secondary-text-color)">${lab}</text>`;
      }
      el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="touch-action:pan-y;display:block">
        <defs><clipPath id="cu${el.dataset.wi}"><rect x="${L}" y="${T}" width="${PW}" height="${Math.max(0, Y0 - T).toFixed(1)}"/></clipPath><clipPath id="cd${el.dataset.wi}"><rect x="${L}" y="${Y0.toFixed(1)}" width="${PW}" height="${Math.max(0, T + PH - Y0).toFixed(1)}"/></clipPath></defs>
        ${grid}${xt}
        <polygon points="${area}" fill="var(--primary-color)" opacity=".28" clip-path="url(#cu${el.dataset.wi})"/>
        <polygon points="${area}" fill="#e8833a" opacity=".28" clip-path="url(#cd${el.dataset.wi})"/>
        <polyline points="${line}" fill="none" stroke="var(--primary-color)" stroke-width="1.6" clip-path="url(#cu${el.dataset.wi})"/>
        <polyline points="${line}" fill="none" stroke="#e8833a" stroke-width="1.6" clip-path="url(#cd${el.dataset.wi})"/>
        <line x1="${L}" x2="${W - R}" y1="${Y0.toFixed(1)}" y2="${Y0.toFixed(1)}" stroke="var(--primary-text-color)" stroke-width="1.5"/>
        <g class="cx" style="display:none"><line y1="${T}" y2="${T + PH}" stroke="var(--primary-text-color)" stroke-width="1" opacity=".6"/><circle r="4" fill="var(--card-background-color)" stroke="var(--primary-text-color)" stroke-width="2"/></g>
        <rect class="ov" x="${L}" y="${T}" width="${PW}" height="${PH}" fill="transparent"/></svg><div class="tip" style="display:none"></div>`;
      const svg = el.querySelector("svg"), cx = el.querySelector(".cx"), tip = el.querySelector(".tip");
      const val = (v) => v.toLocaleString("de-DE", { maximumFractionDigits: unit === "W" ? 0 : 2 }) + (unit ? " " + unit : "");
      const move = (ev) => {
        const r = svg.getBoundingClientRect(), x = ev.clientX - r.left;
        if (x < L || x > W - R) { leave(); return; }
        const t = t0 + ((x - L) / PW) * (t1 - t0);
        let a = 0, b2 = pts.length - 1;
        while (b2 - a > 1) { const m = (a + b2) >> 1; if (pts[m][0] <= t) a = m; else b2 = m; }
        const pt = pts[a], px = X(t), py = Y(pt[1]);
        cx.style.display = ""; cx.querySelector("line").setAttribute("x1", px); cx.querySelector("line").setAttribute("x2", px);
        cx.querySelector("circle").setAttribute("cx", px); cx.querySelector("circle").setAttribute("cy", py);
        const when = new Date(t);
        tip.innerHTML = `<b>${esc(val(pt[1]))}</b><br>${esc(when.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }))} ${esc(when.toLocaleTimeString("de-DE"))}`;
        tip.style.display = "";
        const tw = tip.offsetWidth; tip.style.left = Math.min(W - tw - 2, Math.max(2, px + 10)) + "px"; tip.style.top = Math.max(0, py - 44) + "px";
      };
      const leave = () => { cx.style.display = "none"; tip.style.display = "none"; };
      svg.addEventListener("pointermove", move); svg.addEventListener("pointerdown", move); svg.addEventListener("pointerleave", leave);
    });
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
    if (p !== "now" && (this._config?.widgets || []).some((w) => w.type === "top")) this._ensureStatIds();
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
    const essential = new Set(ids);
    if ((this._config.widgets || []).some((w) => w.type === "top")) this._topCandidates().forEach((i) => ids.add(i));
    for (const id of [...ids]) {  // Helfer durch ihre Komponenten ersetzen
      const hp = this._helper(id);
      if (hp) { ids.delete(id); this._use(hp.entities || []).forEach((i) => ids.add(i)); }
    }
    ids.delete(VIRT);
    if (!ids.size) return;
    this._statBusy = true; this._loading = !this._stat[p]; if (this._loading) this._render();
    const T = (v) => (typeof v === "number" ? v : Date.parse(v));
    try {
      const now = Date.now();
      // in Blöcken abfragen (hunderte Sensoren auf einmal können Zeitüberschreitungen verursachen)
      const all = [...ids], chunks = [];
      for (let i = 0; i < all.length; i += 100) chunks.push(all.slice(i, i + 100));
      const parts = await Promise.allSettled(chunks.map((c) => this._hass.callWS({
        type: "recorder/statistics_during_period", start_time: this._periodStart().toISOString(), end_time: new Date(now).toISOString(),
        statistic_ids: c, period: { day: "5minute", week: "hour", month: "day", year: "day" }[p], types: ["mean", "change"],
      })));
      const res = Object.assign({}, ...parts.filter((x) => x.status === "fulfilled").map((x) => x.value || {}));
      const bad = parts.find((x) => x.status === "rejected");
      this._statErr = bad ? "Statistik-Fehler: " + (bad.reason?.message || JSON.stringify(bad.reason)) : "";
      if (bad && parts.every((x) => x.status === "rejected")) throw bad.reason;
      const out = {}, missing = [];
      for (const id of ids) {
        const rows = res?.[id] || [], unit = this._st(id)?.attributes?.unit_of_measurement;
        if (!rows.length) { out[id] = null; if (essential.has(id)) missing.push(id); continue; }
        if (this._isEnergy(id)) {
          const f = unit === "Wh" ? 0.001 : unit === "MWh" ? 1000 : 1;
          out[id] = rows.reduce((a, r) => a + (r.change || 0), 0) * f;
        } else {
          const f = unit === "kW" ? 1 : unit === "MW" ? 1000 : 0.001;
          out[id] = rows.reduce((a, r) => a + (r.mean == null ? 0 : r.mean * (Math.min(T(r.end), now) - T(r.start)) / 3.6e6 * f), 0);
        }
      }
      this._stat[p] = out; this._statTs[p] = now; this._statMissing = missing;
    } catch (e) { this._statMissing = []; this._statErr = "Statistik-Fehler: " + (e?.message || JSON.stringify(e)); this._ust = this._statErr; }
    this._statBusy = false; this._loading = false; this._render();
    if (this._again) { this._again = false; this._loadStats(true); }
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
      .chart{position:relative}.tip{position:absolute;pointer-events:none;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:8px;padding:5px 9px;font-size:.8em;line-height:1.35;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;z-index:2}
      .tt{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
      .tt button{padding:4px 10px;border-radius:14px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer;font:inherit;font-size:.85em}
      .dev.hid{opacity:.5}.dl label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
      .dl input.tk{margin:0 6px 0 0;vertical-align:middle}
      .tb{display:flex;align-items:center;gap:8px;margin-top:3px}.tb .bar{flex:1;margin-top:0}
      .tb select.ta{max-width:42%;font:inherit;font-size:.75em;padding:2px 4px;border-radius:6px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
      .tag{font-size:.75em;color:var(--secondary-text-color);white-space:nowrap;max-width:42%;overflow:hidden;text-overflow:ellipsis}
      .devs.long{max-height:520px;overflow-y:auto;padding-right:6px}
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
      ${this._config.show_update === false ? "" : `<div class="upd"><span>OmniBattery v${OB_VERSION}</span><button id="upd">⟳ Update</button><span>${esc(this._ust || this._pollErr || "")}</span>${Number(this._config.poll_s) >= 5 ? `<span>⟳ Live-Abfrage alle ${Number(this._config.poll_s)} s</span>` : ""}</div>`}
      </div></ha-card>`;
    this.shadowRoot.getElementById("upd")?.addEventListener("click", () => this._update());
    const R = (sel, ev, fn) => this.shadowRoot.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, () => fn(el)));
    R(".tk", "change", (cb) => this._toggleHide(cb.dataset.id, cb.checked));
    R(".ta", "change", (sel) => { if (sel.value !== "") this._assign(sel.dataset.id, +sel.value); });
    R(".ta", "blur", () => { if (this._pendingRender) { this._pendingRender = false; this._sig = ""; this._render(); } });
    R(".tf", "click", () => { this._showHidden = !this._showHidden; this._topCache = {}; this._sig = ""; this._render(); });
    R(".tr", "click", () => { this._hideSet().clear(); this._saveHide(); this._topCache = {}; this._sig = ""; this._render(); });
    this.shadowRoot.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => this._setPeriod(b.dataset.p)));
    this._drawCharts();
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
      .p{margin:18px 0;padding:12px 14px 14px;background:var(--secondary-background-color);border-left:4px solid var(--primary-color);border-radius:10px}
      .p .lb{margin-bottom:10px}.p .lb b{display:block;font-size:1.15em;font-weight:700;color:var(--primary-text-color)}
      .p .lb small{display:block;margin-top:2px;font-size:.85em;color:var(--secondary-text-color)}
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
    const [lt, lh] = String(this._opts?.label || "").split(" — ");
    this.querySelector(".lb").innerHTML = `<b>${esc(lt)}</b>${lh ? `<small>${esc(lh)}</small>` : ""}`;
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

  _hp(id) { return String(id).startsWith(HELP_PREFIX) ? (this._opts?.getHelpers?.() || []).find((x) => x.id === id) || { id, name: "Helfer (gelöscht)" } : null; }
  _val(id) {
    if (id === VIRT || String(id).startsWith(HELP_PREFIX)) return "berechnet";
    const st = this._hass?.states?.[id]; if (!st) return "n/a";
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(st); } catch (e) { /* fallback */ }
    return `${st.state} ${st.attributes.unit_of_measurement || ""}`.trim();
  }
  _devName(id) {
    if (id === VIRT) return "Virtuell";
    if (String(id).startsWith(HELP_PREFIX)) return "Helfer";
    const did = this._hass?.entities?.[id]?.device_id;
    const d = did && this._hass.devices?.[did];
    return d ? d.name_by_user || d.name || did : "";
  }
  _entName(id) {
    if (id === VIRT) return VIRT_NAME;
    if (String(id).startsWith(HELP_PREFIX)) return this._hp(id).name;
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
    if (this._opts?.getHelpers && this._minW == null) list.unshift(...this._opts.getHelpers().map((x) => x.id));
    return list.filter((id) => {
      if (id === VIRT || id.startsWith(HELP_PREFIX)) return true;
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
      ${this._opts.noNames ? "" : `<input class="nm" data-nm="${esc(id)}" placeholder="Anzeigename (optional)" value="${esc(this._names?.[id] || "")}">`}
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
    (this._hnow || []).forEach(({ i, el }) => { const hp = this._config?.helpers?.[i]; if (hp) el.textContent = this._helperNow(hp); });
  }

  _fields(type) {
    return (SCHEMAS[type] || []).map((f) => {
      const isEnt = !!f._f;
      const flt = isEnt && this._filterOn !== false ? FILTERS[f._f] : null;
      return { name: f.name, schema: f, isEnt, multiple: !!f.selector?.entity?.multiple, domain: flt?.[0] || null, classes: flt?.[1] || null, units: flt?.[2] || null };
    });
  }

  _helperList() { return (this._config.helpers || []).map((h) => ({ id: HELP_PREFIX + h.id, name: h.name || "Helfer" })); }

  /** Template-Definition für einen echten Home-Assistant-Helfer (Template-Sensor) aus den Komponenten */
  _helperTemplate(h) {
    const st = this._hass?.states || {}, comps = h.entities || [];
    if (!comps.length) return { error: "Keine Sensoren gewählt." };
    const kind = (id) => { const a = st[id]?.attributes || {}; return ["Wh", "kWh", "MWh"].includes(a.unit_of_measurement) || a.device_class === "energy" ? "energy" : "power"; };
    const kinds = new Set(comps.map(kind));
    if (kinds.size > 1) return { error: "Der Helfer mischt Leistung (W) und Energie (kWh). Bitte getrennt anlegen." };
    const energy = kinds.has("energy");
    const factor = (id) => { const u = st[id]?.attributes?.unit_of_measurement; return energy ? (u === "Wh" ? 0.001 : u === "MWh" ? 1000 : 1) : (u === "kW" ? 1000 : u === "MW" ? 1e6 : 1); };
    const terms = comps.map((id, k) => `${h.signs?.[id] === -1 ? "- " : k ? "+ " : ""}(states('${id}') | float(0) * ${factor(id)})`).join(" ");
    return { template: `{{ (${terms}) | round(${energy ? 3 : 1}) }}`, unit: energy ? "kWh" : "W", dc: energy ? "energy" : "power", sc: energy ? "total" : "measurement" };
  }

  /** Aktueller Wert des Helfers (nur Anzeige im Editor) */
  _helperNow(h) {
    const t = this._helperTemplate(h); if (t.error) return "";
    const st = this._hass?.states || {};
    let sum = 0, any = false;
    for (const id of h.entities || []) {
      const a = st[id]?.attributes || {}, v = parseFloat(st[id]?.state);
      if (isNaN(v)) continue;
      const u = a.unit_of_measurement, f = t.unit === "W" ? (u === "kW" ? 1000 : u === "MW" ? 1e6 : 1) : (u === "Wh" ? 0.001 : u === "MWh" ? 1000 : 1);
      sum += v * f * (h.signs?.[id] === -1 ? -1 : 1); any = true;
    }
    return any ? `Aktuell: ${Math.abs(sum) >= 100 ? sum.toFixed(0) : sum.toFixed(2)} ${t.unit}` : "";
  }

  async _createInHA(h, out) {
    const t = this._helperTemplate(h);
    if (t.error) { out.textContent = t.error; return; }
    if (!h.name) { out.textContent = "Bitte zuerst einen Namen vergeben."; return; }
    out.textContent = "Lege Helfer in Home Assistant an …";
    try {
      let r = await this._hass.callApi("POST", "config/config_entries/flow", { handler: "template", show_advanced_options: false });
      if (r.type === "menu") r = await this._hass.callApi("POST", `config/config_entries/flow/${r.flow_id}`, { next_step_id: "sensor" });
      if (r.type !== "form") throw new Error("unerwarteter Ablauf: " + r.type);
      r = await this._hass.callApi("POST", `config/config_entries/flow/${r.flow_id}`, {
        name: h.name, state: t.template, unit_of_measurement: t.unit, device_class: t.dc, state_class: t.sc,
      });
      if (r.type === "form" && r.errors && Object.keys(r.errors).length) throw new Error(JSON.stringify(r.errors));
      if (r.type !== "create_entry") throw new Error("nicht angelegt (" + r.type + ")");
      const slug = h.name.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      out.textContent = `Angelegt: sensor.${slug} (prüfen unter Einstellungen → Geräte & Dienste → Helfer).`;
    } catch (e) {
      out.textContent = "Anlegen fehlgeschlagen: " + (e?.message || e?.body?.message || JSON.stringify(e)) + " – nutze „Vorlage anzeigen“ und lege den Helfer manuell an.";
    }
  }

  _buildHelpers() {
    const host = this.querySelector("#hsec"); if (!host) return;
    const hs = this._config.helpers || [];
    this._hnow = [];
    const sec = document.createElement("details");
    sec.open = !!this._hopen;
    sec.addEventListener("toggle", () => { this._hopen = sec.open; });
    sec.innerHTML = `<summary>🧮 Helfer anlegen (virtuelle Sensoren)</summary>
      <div class="sub" style="margin:6px 0">Kombiniere mehrere Sensoren zu einem neuen Wert: addieren oder (Haken „abziehen“) subtrahieren. Der Helfer erscheint in allen Sensor-Listen unter „Helfer“ und verhält sich wie ein Sensor – auch bei Tag/Woche/Monat/Jahr.</div>`;
    const updH = (i, patch, rebuild) => {
      this._config.helpers = (this._config.helpers || []).map((x, j) => (j === i ? { ...x, ...patch } : x));
      this._config.helpers.forEach((x) => { if (x.signs && !Object.keys(x.signs).length) delete x.signs; });
      this._emit();
      if (rebuild) this._build();
    };
    hs.forEach((h, i) => {
      const d = document.createElement("details");
      d.open = !!this._hopenI?.has(h.id);
      d.addEventListener("toggle", () => { (this._hopenI ||= new Set())[d.open ? "add" : "delete"](h.id); });
      d.innerHTML = `<summary>${esc(h.name || "Neuer Helfer")}</summary>
        <label>Name</label><input class="t hn" value="${esc(h.name || "")}" placeholder="z. B. Verbrauch Werkstatt">`;
      const now = document.createElement("div"); now.className = "sub"; now.textContent = this._helperNow(h); this._hnow.push({ i, el: now });
      d.querySelector(".hn").addEventListener("input", (e) => {
        updH(i, { name: e.target.value });
        d.querySelector("summary").textContent = e.target.value || "Neuer Helfer";
      });
      const pk = document.createElement("ob-entity-picker");
      pk.options = { label: "Sensoren — ohne Haken addieren, mit Haken abziehen", multiple: true, noNames: true, domain: "sensor", classes: ["power", "energy"], units: U_POWER };
      pk.value = h.entities; pk.signs = h.signs; pk.hass = this._hass;
      pk.addEventListener("picked", (ev) => { ev.stopPropagation(); updH(i, { entities: ev.detail.value }); now.textContent = this._helperNow(this._config.helpers[i]); });
      pk.addEventListener("signed", (ev) => {
        ev.stopPropagation();
        const signs = { ...(this._config.helpers[i].signs || {}) };
        if (ev.detail.neg) signs[ev.detail.id] = -1; else delete signs[ev.detail.id];
        updH(i, { signs }); now.textContent = this._helperNow(this._config.helpers[i]);
      });
      const out = document.createElement("div"); out.className = "sub";
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `<button data-a="ha">➕ In Home Assistant anlegen</button><button data-a="tpl">📋 Vorlage anzeigen</button><button data-a="del">🗑 Entfernen</button>`;
      row.addEventListener("click", (ev) => {
        const a = ev.target.dataset?.a; if (!a) return;
        if (a === "del") { this._config.helpers = this._config.helpers.filter((_, j) => j !== i); if (!this._config.helpers.length) delete this._config.helpers; this._emit(); this._build(); }
        if (a === "ha") this._createInHA(this._config.helpers[i], out);
        if (a === "tpl") {
          const t = this._helperTemplate(this._config.helpers[i]);
          out.innerHTML = t.error ? esc(t.error) : `Einstellungen → Geräte & Dienste → Helfer → Helfer erstellen → Template → <b>Sensor</b>, Zustandsvorlage:<br><textarea readonly rows="4" style="width:100%;box-sizing:border-box">${esc(t.template)}</textarea>Einheit: <b>${t.unit}</b>, Geräteklasse: <b>${t.dc}</b>, Zustandsklasse: <b>${t.sc}</b>`;
        }
      });
      d.append(pk, now, row, out);
      sec.appendChild(d);
    });
    const add = document.createElement("button");
    add.textContent = "+ Helfer hinzufügen";
    add.addEventListener("click", () => {
      const id = "h" + Date.now().toString(36);
      this._config.helpers = [...(this._config.helpers || []), { id, name: "", entities: [] }];
      (this._hopenI ||= new Set()).add(id); this._hopen = true;
      this._emit(); this._build();
    });
    const wrap = document.createElement("div"); wrap.className = "row"; wrap.appendChild(add);
    sec.appendChild(wrap);
    host.appendChild(sec);
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
      <div class="row" style="margin:6px 0"><span>Live-Abfrage alle</span> <input class="t" id="ps" type="number" min="0" step="5" style="width:90px" value="${esc(this._config.poll_s || "")}" placeholder="0 = aus"> <span>Sekunden, nur solange das Dashboard offen ist</span></div>
      <div class="row" style="margin:0 0 6px"><span>Dienst dafür</span> <input class="t" id="psv" style="width:100%;max-width:340px" value="${esc(this._config.poll_service || "")}" placeholder="marstek_local_api.request_data_sync"></div>
      <label><input type="checkbox" id="su" ${this._config.show_update === false ? "" : "checked"}> Update-Button in der Karte anzeigen</label>
      <div id="list"></div>
      <div class="row"><select id="newtype">${Object.entries(WIDGET_TYPES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
        <button id="add">+ Widget hinzufügen</button></div>
      <div id="hsec"></div>
      <div class="row" style="opacity:.8;font-size:.85em">Version ${OB_VERSION} <button id="reload">↻ Neu laden</button></div></div>`;
    this.querySelector("#reload").addEventListener("click", () => location.reload());
    this.querySelector("#title").addEventListener("input", (e) => { this._config.title = e.target.value; this._emit(); });
    this.querySelector("#sp").addEventListener("change", (e) => {
      if (e.target.checked) delete this._config.show_periods; else this._config.show_periods = false;
      this._emit();
    });
    const setNum = (k, v) => { if (v === "" || !(Number(v) > 0)) delete this._config[k]; else this._config[k] = Number(v); this._emit(); };
    this.querySelector("#ps").addEventListener("input", (e) => setNum("poll_s", e.target.value));
    this.querySelector("#psv").addEventListener("input", (e) => { if (e.target.value.trim()) this._config.poll_service = e.target.value.trim(); else delete this._config.poll_service; this._emit(); });
    this.querySelector("#su").addEventListener("change", (e) => {
      if (e.target.checked) delete this._config.show_update; else this._config.show_update = false;
      this._emit();
    });
    this.querySelector("#flt").addEventListener("change", (e) => { this._filterOn = e.target.checked; this._build(); });
    this.querySelector("#add").addEventListener("click", () => {
      this._config.widgets = [...ws, { type: this.querySelector("#newtype").value }];
      this._emit(); this._build();
    });
    this._buildHelpers();
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
        pk.options = { getHelpers: f.name === "exclude" ? null : () => this._helperList(), virtual: f.name === "home" || (f.name === "entities" && w.type === "devices"), label: LABELS_T[w.type]?.[f.name] || LABELS[f.name] || f.name, multiple: f.multiple, domain: f.domain, classes: f.classes, units: f.units };
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

// Selbstheilung gegen alten Browser-Cache (v. a. Firefox): prüft beim Laden, ob der Server eine neuere energy.js hat,
// frischt dann den Cache auf und lädt die Seite einmal neu.
(async () => {
  try {
    const src = performance.getEntriesByType("resource").map((x) => x.name).find((n) => /\/energy\.js(\?|$)/.test(n));
    if (!src) return;
    const txt = await (await fetch(src, { cache: "no-cache" })).text();
    const v = /OB_VERSION = "([^"]+)"/.exec(txt)?.[1];
    if (!v || v === OB_VERSION) return;
    if (sessionStorage.getItem("ob_reloaded") === v) return;  // nur einmal pro Version, kein Reload-Loop
    sessionStorage.setItem("ob_reloaded", v);
    await fetch(src, { cache: "reload" });
    location.reload();
  } catch (e) { /* kein Netz/Storage: ignorieren */ }
})();
