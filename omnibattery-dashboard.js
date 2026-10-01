/*
 * OmniBattery Dashboard – Custom Lovelace Card für Home Assistant
 * Frei konfigurierbar über den visuellen Editor (Config-Seite) der Karte.
 * Widgets: battery, flow, value, devices, history
 */
const OB_VERSION = "0.3.0";

const WIDGET_TYPES = {
  battery: { label: "Batterie (Laden / Entladen)", icon: "🔋" },
  flow: { label: "Energiefluss (Solar / Netz / Batterie / Haus)", icon: "⚡" },
  value: { label: "Einzelwert", icon: "🔢" },
  devices: { label: "Geräteverbrauch (Liste)", icon: "🔌" },
  history: { label: "Verlauf (Diagramm)", icon: "📈" },
};

const LABELS = {
  type: "Typ", width: "Breite (1-4 Spalten)", name: "Name", soc: "Ladestand (SOC) Entität",
  power: "Leistung (mehrere Sensoren werden addiert)", invert_power: "Vorzeichen umkehren (Standard: + = Laden)",
  capacity_kwh: "Kapazität (kWh, optional)", solar: "Solarproduktion (mehrere Sensoren werden addiert)",
  grid: "Netz: Leistung (+ = Bezug) bzw. Bezug-Sensor", grid_export: "Netz: Einspeisung-Sensor (optional, separater Sensor)",
  battery: "Batterie (+ = Laden, mehrere werden addiert)",
  home: "Hausverbrauch (mehrere Sensoren werden addiert; leer = berechnen)",
  invert_grid: "Netz-Vorzeichen umkehren (wenn Einspeisung als Bezug angezeigt wird)", invert_battery: "Batterie-Vorzeichen umkehren",
  entity: "Entität", icon: "Icon", decimals: "Nachkommastellen", entities: "Geräte / Entitäten",
  max: "Maximalwert für Balken (leer = automatisch)", hours: "Zeitraum (Stunden)",
};

const WIDTH = { name: "width", selector: { number: { min: 1, max: 4, mode: "box" } } };
const NAME = { name: "name", selector: { text: {} } };
// Filter für die Entitätsauswahl: [domain, device_class]. Über "Filter" im Editor abschaltbar.
const FILTERS = {
  soc: ["sensor", ["battery"]], power: ["sensor", ["power"]], solar: ["sensor", ["power"]],
  grid: ["sensor", ["power"]], grid_export: ["sensor", ["power"]], battery: ["sensor", ["power"]], home: ["sensor", ["power"]],
  entities: ["sensor", ["power", "energy"]], entity: [null, null],
};
const ENT = (n) => ({ name: n, selector: { entity: {} }, _f: n });
const MULTI = (n) => ({ name: n, selector: { entity: { multiple: true } }, _f: n });
const BOOL = (n) => ({ name: n, selector: { boolean: {} } });

const SCHEMAS = {
  battery: [NAME, ENT("soc"), MULTI("power"), BOOL("invert_power"),
    { name: "capacity_kwh", selector: { number: { min: 0, step: 0.1, mode: "box" } } }, WIDTH],
  flow: [NAME, MULTI("solar"), MULTI("grid"), MULTI("grid_export"), MULTI("battery"), MULTI("home"), BOOL("invert_grid"), BOOL("invert_battery"), WIDTH],
  value: [NAME, ENT("entity"), { name: "icon", selector: { icon: {} } },
    { name: "decimals", selector: { number: { min: 0, max: 4, mode: "box" } } }, WIDTH],
  devices: [NAME, { name: "entities", selector: { entity: { multiple: true } }, _f: "entities" },
    { name: "max", selector: { number: { min: 0, mode: "box" } } }, WIDTH],
  history: [NAME, ENT("entity"), { name: "hours", selector: { number: { min: 1, max: 168, mode: "box" } } }, WIDTH],
};

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
    this._sig = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const ids = this._entityIds();
    const sig = ids.map((id) => { const s = hass.states[id]; return s ? s.state + s.attributes.unit_of_measurement : "-"; }).join("|");
    if (sig !== this._sig) { this._sig = sig; this._render(); }
    this._loadHistory();
  }

  getCardSize() { return 3 + (this._config?.widgets?.length || 0); }

  _entityIds() {
    const ids = [];
    for (const w of this._config?.widgets || []) {
      for (const k of ["soc", "entity"]) if (w[k]) ids.push(w[k]);
      for (const k of ["power", "solar", "grid", "grid_export", "battery", "home"]) ids.push(...this._ids(w[k]));
      if (Array.isArray(w.entities)) ids.push(...w.entities);
    }
    return ids;
  }

  _ids(v) { return Array.isArray(v) ? v : v ? [v] : []; }
  /** Summe in Watt über einen oder mehrere Sensoren (null, wenn kein Wert verfügbar) */
  _sumW(v) {
    let sum = null;
    for (const id of this._ids(v)) { const w = this._watts(id); if (w !== null) sum = (sum || 0) + w; }
    return sum;
  }
  _st(id) { return id ? this._hass?.states?.[id] : undefined; }
  _num(id) { const s = this._st(id); const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : v; }
  /** Wert in Watt, berücksichtigt kW/MW */
  _watts(id) {
    const v = this._num(id); if (v === null) return null;
    const u = this._st(id).attributes.unit_of_measurement;
    return u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
  }
  _fmtW(w) { return w === null ? "–" : Math.abs(w) >= 1000 ? (w / 1000).toFixed(2) + " kW" : Math.round(w) + " W"; }
  _fmt(id, decimals) {
    const s = this._st(id); if (!s) return "n/a";
    const v = parseFloat(s.state);
    const u = s.attributes.unit_of_measurement || "";
    return isNaN(v) ? s.state : `${decimals != null ? v.toFixed(decimals) : v} ${u}`.trim();
  }
  _name(id, fallback) { return fallback || this._st(id)?.attributes?.friendly_name || id || ""; }

  // ---------- Widgets ----------
  _battery(w) {
    const soc = this._num(w.soc);
    let p = this._sumW(w.power);
    if (p !== null && w.invert_power) p = -p;
    const state = p === null ? "" : p > 20 ? "Laden" : p < -20 ? "Entladen" : "Leerlauf";
    const col = p === null || Math.abs(p) <= 20 ? "var(--secondary-text-color)" : p > 0 ? "#2e9e5b" : "#e8833a";
    const pct = soc === null ? 0 : Math.max(0, Math.min(100, soc));
    const r = 52, c = 2 * Math.PI * r;
    const kwh = soc !== null && w.capacity_kwh ? ` · ${(w.capacity_kwh * pct / 100).toFixed(2)} kWh` : "";
    return `<div class="batt">
      <svg viewBox="0 0 120 120" width="130" height="130">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="10"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${col === "var(--secondary-text-color)" ? "var(--primary-color)" : col}" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c}" transform="rotate(-90 60 60)"/>
        <text x="60" y="68" text-anchor="middle" font-size="24" font-weight="600" fill="var(--primary-text-color)">${soc === null ? "–" : Math.round(pct) + "%"}</text>
      </svg>
      <div class="big" style="color:${col}">${this._fmtW(p === null ? null : Math.abs(p))}</div>
      <div class="sub">${state}${kwh}</div></div>`;
  }

  _flow(w) {
    const solar = this._sumW(w.solar);
    const imp = this._sumW(w.grid), exp = this._sumW(w.grid_export);
    // Netto: + = Bezug, - = Einspeisung. Mit separatem Einspeise-Sensor: Bezug - Einspeisung.
    let grid = imp === null && exp === null ? null : (imp || 0) - (exp || 0);
    if (grid !== null && w.invert_grid) grid = -grid;
    let bat = this._sumW(w.battery); if (bat !== null && w.invert_battery) bat = -bat;
    let home = this._sumW(w.home);
    if (home === null && (solar !== null || grid !== null || bat !== null)) {
      home = Math.max(0, (solar || 0) + (grid || 0) - (bat || 0));
    }
    const node = (icon, label, val, note, color) =>
      `<div class="node"><div class="ni">${icon}</div><div class="nl">${label}</div><div class="nv" style="color:${color}">${this._fmtW(val === null ? null : Math.abs(val))}</div><div class="sub">${note}</div></div>`;
    const gridNote = grid === null ? "" : grid > 10 ? "⬇ Netzbezug" : grid < -10 ? "⬆ Einspeisung" : "Ausgeglichen";
    const gridCol = grid > 10 ? "#c0392b" : grid < -10 ? "#2e9e5b" : "var(--secondary-text-color)";
    const hasGrid = this._ids(w.grid).length || this._ids(w.grid_export).length;
    return `<div class="flow">
      ${this._ids(w.solar).length ? node("☀️", "Solar", solar, solar > 10 ? "Produktion" : "Keine Produktion", "#e0a800") : "<div></div>"}
      ${hasGrid ? node("🏭", "Netz", grid, gridNote, gridCol) : "<div></div>"}
      ${node("🏠", "Haus", home, "Verbrauch", "var(--primary-text-color)")}
      ${this._ids(w.battery).length ? node("🔋", "Batterie", bat, bat === null ? "" : bat > 20 ? "Laden" : bat < -20 ? "Entladen" : "Leerlauf", bat > 20 ? "#2e9e5b" : bat < -20 ? "#e8833a" : "var(--secondary-text-color)") : "<div></div>"}
    </div>`;
  }

  _value(w) {
    const s = this._st(w.entity);
    const icon = w.icon ? `<ha-icon icon="${esc(w.icon)}"></ha-icon>` : "";
    return `<div class="val">${icon}<div class="big">${esc(this._fmt(w.entity, w.decimals))}</div></div>${s ? "" : '<div class="sub">Entität nicht gefunden</div>'}`;
  }

  _devices(w) {
    const rows = (w.entities || []).map((id) => ({ id, v: this._watts(id) }));
    const max = w.max || Math.max(1, ...rows.map((r) => Math.abs(r.v || 0)));
    rows.sort((a, b) => (b.v || 0) - (a.v || 0));
    return `<div class="devs">${rows.map((r) => `
      <div class="dev"><div class="dl"><span>${esc(this._name(r.id))}</span><b>${esc(this._fmt(r.id))}</b></div>
      <div class="bar"><i style="width:${Math.min(100, Math.abs(r.v || 0) / max * 100)}%"></i></div></div>`).join("") || '<div class="sub">Keine Geräte gewählt</div>'}</div>`;
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

  _render() {
    if (!this._config) return;
    const body = (this._config.widgets || []).map((w) => {
      const fn = this["_" + w.type];
      const title = w.name || (w.entity ? this._name(w.entity) : WIDGET_TYPES[w.type]?.label || "");
      return `<section class="w" style="grid-column: span ${Math.min(4, Math.max(1, w.width || 1))}">
        <h3>${esc(title)}</h3>${fn ? fn.call(this, w) : `<div class="sub">Unbekannter Typ: ${esc(w.type)}</div>`}</section>`;
    }).join("");
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}
      ha-card{padding:16px}
      .title{font-size:1.3em;font-weight:600;margin-bottom:12px}
      .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      @media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.w{grid-column:span 2!important}}
      @media(max-width:520px){.grid{grid-template-columns:1fr}.w{grid-column:span 1!important}}
      .w{background:var(--secondary-background-color);border-radius:12px;padding:12px;min-width:0}
      h3{margin:0 0 8px;font-size:.95em;font-weight:500;color:var(--secondary-text-color)}
      .big{font-size:1.6em;font-weight:600}.sub{font-size:.85em;color:var(--secondary-text-color)}
      .batt{text-align:center}.val{display:flex;align-items:center;gap:10px}
      .flow{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      .node{background:var(--card-background-color);border-radius:10px;padding:8px;text-align:center}
      .ni{font-size:1.5em}.nl{font-size:.8em;color:var(--secondary-text-color)}.nv{font-size:1.2em;font-weight:600}
      .arrow{display:none}
      .dev{margin-bottom:8px}.dl{display:flex;justify-content:space-between;font-size:.9em;gap:8px}
      .dl span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bar{height:6px;border-radius:3px;background:var(--divider-color);margin-top:3px}
      .bar i{display:block;height:100%;border-radius:3px;background:var(--primary-color)}
      .hist{width:100%;height:90px}
    </style>
    <ha-card>${this._config.title ? `<div class="title">${esc(this._config.title)}</div>` : ""}
      <div class="grid">${body || '<div class="sub">Noch keine Widgets – Karte bearbeiten und Widgets hinzufügen.</div>'}</div></ha-card>`;
  }
}

/** Entitäts-Auswahl: erst Gerät wählen, dann Sensoren inkl. aktuellem Wert sehen und auswählen. */
class ObEntityPicker extends HTMLElement {
  constructor() { super(); this._open = false; this._device = ""; this._q = ""; }
  set hass(h) { this._hass = h; if (this._open) this._renderList(); else if (this._built) this._renderHead(); }
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
      .p .it{display:flex;justify-content:space-between;gap:8px;padding:8px 6px;border-bottom:1px solid var(--divider-color);cursor:pointer}
      .p .it:hover{background:var(--secondary-background-color)}
      .p .it .n{min-width:0}.p .it small{display:block;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis}
      .p .it .v{white-space:nowrap;font-weight:600}
    </style><div class="p"><div class="lb"></div><div class="head"></div><div class="panel" hidden>
      <select class="dev"></select><input class="q" placeholder="Durchsuchen …"><div class="list"></div></div></div>`;
    this.querySelector(".lb").textContent = this._opts?.label || "";
    this.querySelector(".dev").addEventListener("change", (e) => { this._device = e.target.value; this._renderList(); });
    this.querySelector(".q").addEventListener("input", (e) => { this._q = e.target.value.toLowerCase(); this._renderList(); });
    this.querySelector(".list").addEventListener("click", (e) => {
      const it = e.target.closest(".it"); if (it) this._pick(it.dataset.id);
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
    if (open) { this._fillDevices(); this._renderList(); this.querySelector(".q").focus(); }
    this._renderHead();
  }

  _val(id) {
    const st = this._hass?.states?.[id]; if (!st) return "n/a";
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(st); } catch (e) { /* fallback */ }
    return `${st.state} ${st.attributes.unit_of_measurement || ""}`.trim();
  }
  _devName(id) {
    const did = this._hass?.entities?.[id]?.device_id;
    const d = did && this._hass.devices?.[did];
    return d ? d.name_by_user || d.name || did : "";
  }
  _entName(id) {
    const n = this._hass?.states?.[id]?.attributes?.friendly_name || id;
    const dn = this._devName(id);
    return dn && n.startsWith(dn + " ") ? n.slice(dn.length + 1) : n;
  }
  _candidates() {
    const o = this._opts || {}, st = this._hass?.states || {};
    return Object.keys(st).filter((id) => {
      if (o.domain && !id.startsWith(o.domain + ".")) return false;
      if (o.classes && !o.classes.includes(st[id].attributes.device_class)) return false;
      return true;
    });
  }

  _renderHead() {
    const h = this.querySelector(".head"); if (!h) return;
    const rows = this._arr().map((id) => `<div class="sel"><div class="n">${esc(this._entName(id))} <small>${esc(this._devName(id))}</small></div>
      <span class="v">${esc(this._val(id))}</span><span class="x" data-rm="${esc(id)}" title="Entfernen">✕</span></div>`).join("");
    h.innerHTML = rows + (this._opts.multiple || !this._arr().length
      ? `<button data-open>${this._opts.multiple ? "+ Sensor hinzufügen" : "Sensor auswählen …"}</button>`
      : `<button data-open>Ändern …</button>`);
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
      .sort((a, b) => a.name.localeCompare(b.name));
    l.innerHTML = items.slice(0, 300).map((x) => `<div class="it" data-id="${esc(x.id)}"><div class="n">${esc(x.name)}<small>${esc(this._device ? x.id : x.dev + " · " + x.id)}</small></div>
      <div class="v">${esc(this._val(x.id))}</div></div>`).join("") || '<div class="it">Keine passenden Sensoren (Filter im Editor abschaltbar)</div>';
  }
}

class OmniBatteryDashboardEditor extends HTMLElement {
  setConfig(config) {
    const json = JSON.stringify(config);
    if (json === this._emitted) { this._config = config; return; }
    this._config = { widgets: [], ...config };
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
      return { name: f.name, schema: f, isEnt, multiple: !!f.selector?.entity?.multiple, domain: flt?.[0] || null, classes: flt?.[1] || null };
    });
  }

  _emit() {
    this._emitted = JSON.stringify(this._config);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
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
      <div id="list"></div>
      <div class="row"><select id="newtype">${Object.entries(WIDGET_TYPES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
        <button id="add">+ Widget hinzufügen</button></div></div>`;
    this.querySelector("#title").addEventListener("input", (e) => { this._config.title = e.target.value; this._emit(); });
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
          for (const k of Object.keys(nw)) if (nw[k] === "" || nw[k] === undefined || (Array.isArray(nw[k]) && !nw[k].length)) delete nw[k];
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
        pk.options = { label: LABELS[f.name] || f.name, multiple: f.multiple, domain: f.domain, classes: f.classes };
        pk.value = w[f.name];
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

customElements.define("ob-entity-picker", ObEntityPicker);
customElements.define("omnibattery-dashboard", OmniBatteryDashboard);
customElements.define("omnibattery-dashboard-editor", OmniBatteryDashboardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "omnibattery-dashboard",
  name: "OmniBattery Dashboard",
  description: "Frei konfigurierbares Energie-Dashboard (Batterie, Solar, Netz, Geräte, Verlauf)",
});
console.info(`%c OMNIBATTERY-DASHBOARD %c v${OB_VERSION}`, "background:#2e9e5b;color:#fff", "");
