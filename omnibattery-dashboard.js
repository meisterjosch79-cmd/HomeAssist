/*
 * OmniBattery Dashboard – Custom Lovelace Card für Home Assistant
 * Frei konfigurierbar über den visuellen Editor (Config-Seite) der Karte.
 * Widgets: battery, flow, value, devices, history
 */
const OB_VERSION = "0.1.0";

const WIDGET_TYPES = {
  battery: { label: "Batterie (Laden / Entladen)", icon: "🔋" },
  flow: { label: "Energiefluss (Solar / Netz / Batterie / Haus)", icon: "⚡" },
  value: { label: "Einzelwert", icon: "🔢" },
  devices: { label: "Geräteverbrauch (Liste)", icon: "🔌" },
  history: { label: "Verlauf (Diagramm)", icon: "📈" },
};

const LABELS = {
  type: "Typ", width: "Breite (1-4 Spalten)", name: "Name", soc: "Ladestand (SOC) Entität",
  power: "Leistung Entität", invert_power: "Vorzeichen umkehren (Standard: + = Laden)",
  capacity_kwh: "Kapazität (kWh, optional)", solar: "Solarproduktion", grid: "Netz (+ = Bezug)",
  battery: "Batterie (+ = Laden)", home: "Hausverbrauch (leer = berechnen)",
  invert_grid: "Netz-Vorzeichen umkehren", invert_battery: "Batterie-Vorzeichen umkehren",
  entity: "Entität", icon: "Icon", decimals: "Nachkommastellen", entities: "Geräte / Entitäten",
  max: "Maximalwert für Balken (leer = automatisch)", hours: "Zeitraum (Stunden)",
};

const WIDTH = { name: "width", selector: { number: { min: 1, max: 4, mode: "box" } } };
const NAME = { name: "name", selector: { text: {} } };
// Filter für die Entitätsauswahl: [domain, device_class]. Über "Filter" im Editor abschaltbar.
const FILTERS = {
  soc: ["sensor", ["battery"]], power: ["sensor", ["power"]], solar: ["sensor", ["power"]],
  grid: ["sensor", ["power"]], battery: ["sensor", ["power"]], home: ["sensor", ["power"]],
  entities: ["sensor", ["power", "energy"]], entity: ["sensor", null],
};
const ENT = (n) => ({ name: n, selector: { entity: {} }, _f: n });
const BOOL = (n) => ({ name: n, selector: { boolean: {} } });

const SCHEMAS = {
  battery: [NAME, ENT("soc"), ENT("power"), BOOL("invert_power"),
    { name: "capacity_kwh", selector: { number: { min: 0, step: 0.1, mode: "box" } } }, WIDTH],
  flow: [NAME, ENT("solar"), ENT("grid"), ENT("battery"), ENT("home"), BOOL("invert_grid"), BOOL("invert_battery"), WIDTH],
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
      for (const k of ["soc", "power", "solar", "grid", "battery", "home", "entity"]) if (w[k]) ids.push(w[k]);
      if (Array.isArray(w.entities)) ids.push(...w.entities);
    }
    return ids;
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
    let p = this._watts(w.power);
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
    const solar = this._watts(w.solar);
    let grid = this._watts(w.grid); if (grid !== null && w.invert_grid) grid = -grid;
    let bat = this._watts(w.battery); if (bat !== null && w.invert_battery) bat = -bat;
    let home = this._watts(w.home);
    if (home === null && (solar !== null || grid !== null || bat !== null)) {
      home = Math.max(0, (solar || 0) + (grid || 0) - (bat || 0));
    }
    const node = (icon, label, val, note, color) =>
      `<div class="node"><div class="ni">${icon}</div><div class="nl">${label}</div><div class="nv" style="color:${color}">${this._fmtW(val === null ? null : Math.abs(val))}</div><div class="sub">${note}</div></div>`;
    const arrow = (dir) => `<div class="arrow">${dir}</div>`;
    return `<div class="flow">
      ${w.solar ? node("☀️", "Solar", solar, solar > 10 ? "Produktion" : "Keine Produktion", "#e0a800") : "<div></div>"}
      ${arrow(solar > 10 ? "↓" : "")}
      ${w.grid ? node("🏭", "Netz", grid, grid === null ? "" : grid > 10 ? "Bezug" : grid < -10 ? "Einspeisung" : "Ausgeglichen", grid > 10 ? "#c0392b" : "#2e9e5b") : "<div></div>"}
      ${node("🏠", "Haus", home, "Verbrauch", "var(--primary-text-color)")}
      ${w.battery ? node("🔋", "Batterie", bat, bat === null ? "" : bat > 20 ? "Laden" : bat < -20 ? "Entladen" : "Leerlauf", bat > 20 ? "#2e9e5b" : bat < -20 ? "#e8833a" : "var(--secondary-text-color)") : "<div></div>"}
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

class OmniBatteryDashboardEditor extends HTMLElement {
  setConfig(config) {
    const json = JSON.stringify(config);
    if (json === this._emitted) { this._config = config; return; }
    this._config = { widgets: [], ...config };
    this._build();
  }
  set hass(h) {
    this._hass = h;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = h));
  }

  _schema(type) {
    return (SCHEMAS[type] || []).map(({ _f, ...f }) => {
      const flt = this._filterOn !== false && _f && FILTERS[_f];
      if (!flt) return f;
      const sel = { domain: flt[0] };
      if (flt[1]) sel.device_class = flt[1];
      return { ...f, selector: { entity: { ...f.selector.entity, ...sel } } };
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
      <label><input type="checkbox" id="flt" ${this._filterOn === false ? "" : "checked"}> Entitäten-Liste vorfiltern (Leistung / Batterie)</label>
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
      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.data = w;
      form.schema = this._schema(w.type);
      form.computeLabel = (s) => LABELS[s.name] || s.name;
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const nw = { ...ev.detail.value, type: w.type };
        for (const k of Object.keys(nw)) if (nw[k] === "" || nw[k] === undefined) delete nw[k];
        this._config.widgets = this._config.widgets.map((x, j) => (j === i ? nw : x));
        this._emit();
      });
      d.appendChild(form);
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

customElements.define("omnibattery-dashboard", OmniBatteryDashboard);
customElements.define("omnibattery-dashboard-editor", OmniBatteryDashboardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "omnibattery-dashboard",
  name: "OmniBattery Dashboard",
  description: "Frei konfigurierbares Energie-Dashboard (Batterie, Solar, Netz, Geräte, Verlauf)",
});
console.info(`%c OMNIBATTERY-DASHBOARD %c v${OB_VERSION}`, "background:#2e9e5b;color:#fff", "");
