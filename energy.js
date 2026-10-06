/*
 * OmniBattery Dashboard – Custom Lovelace Card für Home Assistant
 * Frei konfigurierbar über den visuellen Editor (Config-Seite) der Karte.
 * Widgets: battery, flow, value, devices, history
 */
const OB_VERSION = "0.39.0";

const WIDGET_TYPES = {
  battery: { label: "Batterie (Laden / Entladen)", icon: "🔋" , short: "Batterie" },
  flow: { label: "Energiefluss (Solar / Netz / Batterie / Haus)", icon: "⚡" , short: "Energiefluss" },
  value: { label: "Einzelwert", icon: "🔢" , short: "Wert" },
  devices: { label: "Geräteverbrauch (Liste)", icon: "🔌" , short: "Geräte" },
  balance: { label: "Energiebilanz (nicht zugeordnet)", icon: "⚖️", short: "Energiebilanz" },
  top: { label: "Top-Verbraucher (alle Sensoren im System)", icon: "🏆", short: "Top-Verbraucher" },
  history: { label: "Verlauf (Diagramm)", icon: "📈" , short: "Verlauf" },
  claude: { label: "Szenario by Claude (fertige Ansicht)", icon: "✨", short: "Szenario" },
  storage: { label: "", icon: "🔋", short: "Speicher-Bilanz", hidden: true },
  autarky: { label: "", icon: "🛡️", short: "Netzbezug & Autarkie", hidden: true },
  pvsplit: { label: "", icon: "☀️", short: "Solar: direkt / über Speicher", hidden: true },
  finance: { label: "", icon: "💶", short: "Finanzübersicht", hidden: true },
  areas: { label: "", icon: "🏘️", short: "Bereiche", hidden: true },
  claudeinfo: { label: "", icon: "✨", short: "Szenario by Claude", hidden: true },
};


const VIRT = "virtual:unassigned", VIRT_NAME = "Nicht zugeordnete Energiemenge";
const VIRT_LOSS = "virtual:losses", VIRT_LOSS_NAME = "Anlagenverluste & Messabweichung";
const HELP_PREFIX = "virtual:helper:";
const WB = HELP_PREFIX + "wallbox";  // virtueller Sensor „Wallbox“ aus WALLBOX_DATA
// ---------- Wallbox (Sonnen Charger): heruntergeladene Ladevorgänge [Start s, Ende s, Wh]; Stand 05.10.2026 ----------
const WALLBOX_DATA = [
  [1767290191,1767448460,18535],
  [1767526768,1767893966,24342],
  [1767904949,1767956597,7714],
  [1768117552,1768120463,7937],
  [1768143129,1768232752,20855],
  [1768320752,1768388511,22951],
  [1768418200,1768461361,10664],
  [1768514397,1768547892,17114],
  [1768844237,1768935169,14292],
  [1768993873,1769013011,10760],
  [1769068870,1769103422,5100],
  [1769152319,1769166177,4891],
  [1769167066,1769176195,7082],
  [1769181656,1769247423,904],
  [1769253118,1769336925,7652],
  [1769512748,1769696340,24593],
  [1769869965,1769940378,20760],
  [1769957223,1770022212,14056],
  [1770326324,1770361346,25867],
  [1770551181,1770621335,3374],
  [1770639178,1770652091,362],
  [1770658612,1770707102,2066],
  [1770719162,1770721907,2080],
  [1770722798,1770727489,8057],
  [1770882642,1770893379,2104],
  [1770894174,1770967225,407],
  [1770984289,1770990448,8238],
  [1770995653,1771067120,24460],
  [1771105018,1771144668,22980],
  [1771156249,1771231874,6186],
  [1771326228,1771353867,14234],
  [1771434258,1771497254,28181],
  [1771522038,1771602847,20320],
  [1771674699,1771749368,10269],
  [1771886656,1771916653,20247],
  [1771964715,1772002850,10469],
  [1772136988,1772194920,10945],
  [1772263440,1772278675,12431],
  [1772287164,1772355417,1386],
  [1772358083,1772364920,3817],
  [1772373112,1772441160,3826],
  [1772546511,1772563756,1855],
  [1772608512,1772612253,1654],
  [1772612254,1772634035,17835],
  [1772642845,1772720718,4691],
  [1772728194,1772805783,5120],
  [1772896756,1772973303,10841],
  [1772980142,1773046040,4384],
  [1773136978,1773140211,5870],
  [1773213538,1773301131,20444],
  [1773306903,1773330047,9899],
  [1773349466,1773411887,10248],
  [1773571820,1773645048,8628],
  [1773659677,1773669135,7660],
  [1773674281,1773675916,315],
  [1773741872,1773745407,1452],
  [1773746167,1773755495,11863],
  [1773760721,1773772576,379],
  [1773818975,1773904200,29255],
  [1773953688,1774013127,11370],
  [1774111440,1774170006,7059],
  [1774181281,1774195964,6527],
  [1774215654,1774249712,919],
  [1774271567,1774349902,12933],
  [1774437025,1774446232,10943],
  [1774450919,1774522618,29305],
  [1774559266,1774594558,29496],
  [1774622737,1774684533,5982],
  [1774707326,1774853039,23400],
  [1774864331,1774870274,9579],
  [1774874993,1774875136,409],
  [1774882395,1774943659,4729],
  [1775027113,1775027113,790],
  [1775046806,1775114755,7724],
  [1775136808,1775142225,12931],
  [1775498468,1775562385,25977],
  [1775590155,1775644783,16675],
  [1775674948,1775818919,14587],
  [1775827176,1775902532,1714],
  [1776162058,1776188925,6132],
  [1776195262,1776262065,31055],
  [1776270462,1776333152,6920],
  [1776422691,1776430466,7561],
  [1776435355,1776512000,6946],
  [1776604711,1776675301,22297],
  [1776675583,1776679427,4894],
  [1776708903,1776781408,7073],
  [1776785164,1776793543,1383],
  [1776799901,1776955282,6768],
  [1776968117,1777028787,5803],
  [1777053053,1777107764,20212],
  [1777135608,1777184372,8666],
  [1777226198,1777302425,30617],
  [1777371674,1777381375,6035],
  [1777404735,1777443401,3092],
  [1777445355,1777451497,9045],
  [1777543993,1777553040,9244],
  [1777571586,1777626087,10101],
  [1777654185,1777724018,14683],
  [1777930802,1777967156,3482],
  [1777976069,1777988631,20699],
  [1778000178,1778133420,5679],
  [1778399007,1778411893,7455],
  [1778432081,1778498973,6604],
  [1778517834,1778565922,1185],
  [1778614345,1778651711,562],
  [1778667116,1778672241,2065],
  [1778679929,1778849502,26234],
  [1778854607,1779017101,5358],
  [1779035948,1779103999,6504],
  [1779171608,1779194931,13856],
  [1779260889,1779271077,12661],
  [1779359273,1779371448,26938],
  [1779393083,1779436205,15275],
  [1780739384,1780739384,9425],
  [1780757623,1780831371,6175],
  [1780848398,1780918049,6666],
  [1781073440,1781172189,17103],
  [1781283473,1781339012,16246],
  [1781371241,1781420303,3119],
  [1781445745,1781504125,15907],
  [1781591420,1781694833,12348],
  [1781710938,1781767226,10846],
  [1781797578,1781863252,5774],
  [1782118871,1782122306,9170],
  [1782123171,1782194324,8009],
  [1782234061,1782295298,20876],
  [1782317285,1782381682,5658],
  [1782483264,1782545255,11917],
  [1782557878,1782726996,5035],
  [1782760580,1782836731,6489],
  [1782901112,1782911952,13304],
  [1783017694,1783062781,8875],
  [1783107161,1783162423,21036],
  [1783194075,1783241884,8737],
  [1783263328,1783317601,6876],
  [1783332808,1783346387,9733],
  [1783356233,1783404934,2440],
  [1783406271,1783406942,419],
  [1783414952,1783418922,7868],
  [1783491895,1783504771,7585],
  [1783532297,1783603146,9446],
  [1783621513,1783671212,19229],
  [1783696307,1783756812,12162],
  [1783797334,1783868353,7599],
  [1783879545,1783923784,2982],
  [1784011593,1784023235,16237],
  [1784097865,1784109389,5994],
  [1784111076,1784126217,1448],
  [1784184963,1784195661,6936],
  [1784276733,1784282113,14026],
  [1784293222,1784303507,5746],
  [1784377080,1784445145,10240],
  [1784474183,1784528324,9816],
  [1784551820,1784557678,12440],
  [1784565309,1784614142,350],
  [1784615432,1784628226,12269],
  [1784701398,1784713685,10858],
  [1784839898,1784874297,1120],
  [1784883699,1784886795,8786],
  [1784888076,1784896860,21217],
  [1784914641,1784966604,8579],
  [1785075660,1785163443,20447],
  [1785245420,1785252602,12758],
  [1785310604,1785318784,6203],
  [1785394861,1785405303,7956],
  [1785422536,1785478171,9127],
  [1785479567,1785491309,6421],
  [1785509755,1785565661,3819],
  [1785565761,1785566513,2075],
  [1785589458,1785592748,9385],
  [1785594808,1785598298,10034],
  [1785614588,1785743672,23983],
  [1785758136,1785824082,27416],
  [1785912290,1785922845,8672],
  [1785925043,1785999711,1626],
  [1786045509,1786088807,7924],
  [1786098378,1786109879,7136],
  [1786131842,1786181485,21609],
  [1786218209,1786261698,2742],
  [1786270320,1786339696,17328],
  [1786706237,1786715836,26842],
  [1786720182,1786775641,6803],
  [1786871849,1786878080,14328],
  [1787041312,1787063846,6712],
  [1787081016,1787121325,712],
  [1787122529,1787135629,15221],
  [1787157120,1787215100,7313],
  [1787238603,1787320878,18467],
  [1787329867,1787391013,2923],
  [1787395114,1787473386,3319],
  [1787483307,1787548535,5691],
  [1787576754,1787590288,6953],
  [1787677591,1787752605,22913],
  [1787769233,1787816585,6241],
  [1787851649,1787919272,7154],
  [1787921415,1787988407,2090],
  [1788103922,1788168863,19259],
  [1788182781,1788250622,8269],
  [1788289962,1788346574,19517],
  [1788348012,1788359438,1068],
  [1788453133,1788595503,34712],
  [1788598987,1788701352,2582],
  [1788712727,1788779968,5830],
  [1788818229,1788868038,11753],
  [1788896800,1788961273,13514],
  [1788977037,1789031862,14596],
  [1789041071,1789050665,11412],
  [1789068175,1789122903,5388],
  [1789133770,1789219629,5688],
  [1789231862,1789306589,3610],
  [1789310414,1789366743,18358],
  [1789383110,1789397086,9552],
  [1789398331,1789451928,1736],
  [1789453177,1789473860,19025],
  [1789539711,1789552528,6274],
  [1789567108,1789654097,22275],
  [1789713649,1789725418,2147],
  [1789813788,1789970832,5786],
  [1790065791,1790088274,17727],
  [1790144696,1790172635,7670],
  [1790270116,1790319893,1041],
  [1790325603,1790340570,13217],
  [1790362433,1790410731,5974],
  [1790529356,1790604859,18248],
  [1790663583,1790694205,6556],
  [1790711469,1790776935,6022],
  [1790836513,1791019968,6581],
  [1791032830,1791094303,2865],
  [1791118013,1791178709,7104]
];
// ---------- Szenarien by Claude: fertige, auf dieses Haus zugeschnittene Ansichten. Neue/angepasste Szenarien kommen per Update. ----------
const CLAUDE_SCENARIOS = (() => {
  const S = "sensor.sonnenbatterie_145854_state_", M1 = "sensor.technik_marstek_venuse_3_0_5b00_venus01_", M2 = "sensor.technik_marstek_venuse_3_0_5f7e_venus02_";
  const I = {
    prod: S + "production", gin: S + "grid_in", gout: S + "grid_out", bin: S + "battery_in", bout: S + "battery_out", soc: S + "battery_percentage_user",
    m1in: M1 + "power_in", m1out: M1 + "power_out", m2in: M2 + "power_in", m2out: M2 + "power_out", msoc: "sensor.marstek_system_average_state_of_charge",
    hs: ["l1", "l2", "l3"].map((l) => "sensor.hausstrom_leistung_" + l), hz: ["l1", "l2", "l3"].map((l) => "sensor.warmepumpen_zahler_leistung_" + l), k4: ["l1", "l2", "l3"].map((l) => "sensor.breaker_3_leistung_" + l),
    buro: "sensor.antela_smart_power_strip_2a_1c_2_leistung", heiz: "sensor.heizstab_warmwasser_leistung", klima: "sensor.klimaanlage_leistung", tv: "sensor.fernseher_leistung", wp: "sensor.luxtronik_320919_035_current_power_consumption",
    pvE: "sensor.pv_produktionshelfer", impE: "sensor.netzbezug_sonnen_2", expE: "sensor.einspeisung_sonnen", hsE: "sensor.hausstrom_energie_gesamt", hzE: "sensor.warmepumpen_zahler_energie_gesamt", k4E: "sensor.breaker_3_energie_gesamt",
    buroE: "sensor.antela_smart_power_strip_2a_1c_2_energie_gesamt", heizE: "sensor.heizstab_warmwasser_energie_gesamt", klimaE: "sensor.klimaanlage_energie_gesamt", tvE: "sensor.fernseher_energie_gesamt",
    wpE1: "sensor.luxtronik_320919_035_heat_energy_input", wpE2: "sensor.luxtronik_320919_035_dhw_energy_input",
  };
  const H = (id, name, entities, signs) => ({ id, name, entities, ...(signs ? { signs } : {}) });
  const hp = (id) => HELP_PREFIX + id;
  const helpers = [
    H("cl_hausstrom", "Hausstrom Zähler (L1–L3)", I.hs), H("cl_heizstrom", "Heizstromzähler (L1–L3)", I.hz), H("cl_k4", "Kapellenweg 4 (K4, L1–L3)", I.k4),
    H("cl_netz", "Netz (Bezug +, Einspeisung −)", [I.gin, I.gout], { [I.gout]: -1 }),
    H("cl_bat", "Batterien gesamt (Laden +, Entladen −)", [I.bin, I.m1in, I.m2in, I.bout, I.m1out, I.m2out], { [I.bout]: -1, [I.m1out]: -1, [I.m2out]: -1 }),
    H("cl_pv", "Solar gesamt", [I.prod, I.pvE]),
    H("cl_gesamt", "Verbrauch Gesamt (K6 + K4)", [hp("cl_pv"), hp("cl_netz"), hp("cl_bat")], { [hp("cl_bat")]: -1 }),
    H("cl_k6", "Verbrauch Kapellenweg 6 gesamt (Gesamt − K4)", [hp("cl_gesamt"), hp("cl_k4")], { [hp("cl_k4")]: -1 }),
    H("cl_wp", "Wärmepumpe", [I.wp, I.wpE1, I.wpE2]),
    H("cl_wbwp", "Wallbox & Wärmepumpe", [WB, hp("cl_wp")]),
    H("cl_haus", "Kapellenweg 6 Hausverbrauch (ohne Wallbox & Wärmepumpe)", [hp("cl_k6"), hp("cl_wbwp")], { [hp("cl_wbwp")]: -1 }),
  ];
  const det = { detail_total: [hp("cl_k6")], detail: [
    { name: "Wallbox", id: WB }, { name: "Wärmepumpe", id: hp("cl_wp") },
    { name: "Büro Steckdosenleiste", id: [I.buro, I.buroE] }, { name: "Heizstab Warmwasser", id: [I.heiz, I.heizE] },
    { name: "Klimaanlage", id: [I.klima, I.klimaE] }, { name: "Fernseher", id: [I.tv, I.tvE] },
    { name: "Smart Plug", id: ["sensor.smart_plug_2103098693615790845048e1e960b77a_power", "sensor.smart_plug_2103098693615790845048e1e960b77a_energy"] },
  ] };
  const aut = { type: "autarky", ...det, k4: [hp("cl_k4")], name: "Gesamt · Netzbezug & Autarkie", width: 2, home: [hp("cl_gesamt")], breakdown: [hp("cl_k6"), hp("cl_haus"), WB, hp("cl_wp"), hp("cl_k4")], solar: [I.prod, I.pvE], grid: [I.gin], grid_export: [I.gout],
    names: { [hp("cl_k6")]: "↳ Kapellenweg 6 gesamt", [hp("cl_haus")]: "     · Hausverbrauch", [WB]: "     · Wallbox", [hp("cl_wp")]: "     · Wärmepumpe", [hp("cl_k4")]: "↳ Kapellenweg 4 gesamt", [I.gin]: "Sonnen Netzbezug (Leistung)", [I.impE]: "Sonnen Netzbezug (Zähler)", [I.gout]: "Sonnen Einspeisung (Leistung)", [I.expE]: "Sonnen Einspeisung (Zähler)", [I.prod]: "Sonnen PV-Produktion (Leistung)", [I.pvE]: "PV-Produktion (Zähler)" } };
  const fin = { type: "finance", name: "Finanzübersicht", width: 2, home: [hp("cl_gesamt")], solar: [I.prod, I.pvE], grid: [I.gin], grid_export: [I.gout], k4: [hp("cl_k4")], k6: [hp("cl_k6")], prices: { solar_use: 0.06, feed_in: 0.06, grid: 0.34, k4: 0.25 } };
  const split = { type: "areas", ...det, name: "Verbrauch nach Bereichen", width: 2, wallbox_upload: true,
    note: "Wallbox: aus den heruntergeladenen Ladevorgängen (nur in Zeiträumen, anteilig nach Zeit verteilt). Hausverbrauch = Kapellenweg 6 − Wallbox − Wärmepumpe.",
    groups: [
      { name: "Gesamt (Kapellenweg 6 + 4)", id: hp("cl_gesamt") },
      { name: "Kapellenweg 6 gesamt", id: hp("cl_k6"), toggle: "k6", parts: [{ name: "Hausverbrauch", id: hp("cl_haus") }, { name: "Wallbox", id: WB }, { name: "Wärmepumpe", id: hp("cl_wp") }] },
      { name: "Kapellenweg 4 gesamt", id: hp("cl_k4"), rate: "k4", parts: I.k4.map((id, n) => ({ name: "Phase L" + (n + 1), id })) },
    ] };
  const batIds = [I.bin, I.bout, I.m1in, I.m1out, I.m2in, I.m2out], batSigns = { [I.bout]: -1, [I.m1out]: -1, [I.m2out]: -1 };
  const names = {
    [I.prod]: "PV-Produktion (Sonnen)", [I.gin]: "Netzbezug (Sonnen)", [I.gout]: "Einspeisung (Sonnen)", [I.bin]: "Sonnen lädt", [I.bout]: "Sonnen entlädt",
    [I.m1in]: "Marstek 1 lädt", [I.m1out]: "Marstek 1 entlädt", [I.m2in]: "Marstek 2 lädt", [I.m2out]: "Marstek 2 entlädt",
    [I.buro]: "Büro Steckdosenleiste", [I.heiz]: "Heizstab Warmwasser", [I.klima]: "Klimaanlage", [I.tv]: "Fernseher", [I.wp]: "Wärmepumpe",
    [I.buroE]: "Büro Steckdosenleiste", [I.heizE]: "Heizstab Warmwasser", [I.klimaE]: "Klimaanlage", [I.tvE]: "Fernseher", [I.wpE1]: "Wärmepumpe Heizen", [I.wpE2]: "Wärmepumpe Warmwasser",
    [I.pvE]: "PV-Produktion (Zähler)", [I.impE]: "Netzbezug (Zähler)", [I.expE]: "Einspeisung (Zähler)", [I.hsE]: "Hausstrom-Zähler (Energie)", [I.hzE]: "Heizstromzähler (Energie)", [I.k4E]: "K4 (Energie)",
  };
  const devices = [I.buro, I.heiz, I.klima, I.tv, I.wp];
  return {
    k6_bilanz: {
      title: "Gesamt · Kapellenweg 6 · Kapellenweg 4 – Energiefluss & Bilanz",
      desc: "Quellen (Sonnenbatterie, 2× Marstek) → Hausstrom-/Heizstrom-Zähler → K4 und Geräte. Zeigt den Rest als „nicht zugeordnet“ und die Anlagenverluste. Umschalter oben wirkt auf alle Teile.",
      requires: [I.prod, I.gin, I.gout, ...I.hs, ...I.hz, ...I.k4, ...devices, I.hsE, I.hzE, I.k4E],
      build: () => ({
        helpers, balance_ref: [hp("cl_hausstrom"), I.hsE, hp("cl_heizstrom"), I.hzE], balance_ref_names: { [hp("cl_hausstrom")]: "Hausstrom Zähler", [I.hsE]: "Hausstrom Zähler", [hp("cl_heizstrom")]: "Heizstromzähler", [I.hzE]: "Heizstromzähler" },
        widgets: [
          { type: "flow", name: "Gesamt (Kapellenweg 6 + 4)", width: 3, names, solar: [I.prod, I.pvE], grid: [I.gin], grid_export: [I.gout], battery: batIds, signs: batSigns },
          { ...aut, width: 1 },
          { ...split, width: 2 },
          { ...fin },
          { type: "flow", name: "Kapellenweg 6", width: 3, names, solar: [I.prod, I.pvE], grid: [I.gin], grid_export: [I.gout], battery: batIds, signs: batSigns,
            home: [I.buro, I.buroE, I.heiz, I.heizE, I.klima, I.klimaE, I.tv, I.tvE, I.wp, I.wpE1, I.wpE2, VIRT], deduct: [hp("cl_k4"), I.k4E, WB] },
          { type: "battery", name: "Speicher (Sonnen)", width: 1, soc: I.soc, power: [I.bin, I.bout], signs: { [I.bout]: -1 }, names },
          { type: "balance", name: "Bilanz Kapellenweg 6", width: 2 },
          { type: "devices", name: "Geräte Kapellenweg 6", width: 1, names, entities: devices },
          { type: "devices", name: "Kapellenweg 4 (K4)", width: 1, names: { [hp("cl_k4")]: "K4 gesamt" }, entities: [hp("cl_k4"), ...I.k4] },
          { type: "battery", name: "Speicher (Marstek)", width: 1, soc: I.msoc, power: [I.m1in, I.m1out, I.m2in, I.m2out], signs: { [I.m1out]: -1, [I.m2out]: -1 }, names },
        ],
      }),
    },
    k6_verlauf: {
      title: "Gesamt · Kapellenweg 6 · Kapellenweg 4 – Verlauf",
      desc: "Drei Diagramme: Gesamtanlage (PV, Netz, Speicher, Gesamtverbrauch), Kapellenweg 6 (= Gesamt − K4) und Kapellenweg 4. Zeitraum im Widget einstellbar.",
      requires: [I.prod, I.gin, I.gout, ...I.hs],
      build: () => ({
        helpers,
        widgets: [
          { ...aut, width: 4 },
          { type: "history", name: "Gesamt: Solar, Netz, Speicher, Verbrauch (24 h)", hours: 24, width: 4, series: [
            { entity: I.prod, name: "PV-Produktion", color: "#e0a800" },
            { entity: hp("cl_netz"), name: "Netz (Bezug + / Einspeisung −)", color: "#03a9f4" },
            { entity: hp("cl_bat"), name: "Speicher (Laden + / Entladen −)", color: "#2e9e5b" },
            { entity: hp("cl_gesamt"), name: "Verbrauch Gesamt", color: "#9c27b0" },
          ] },
          { type: "history", name: "Kapellenweg 6 (Haus & Wärmepumpe)", hours: 24, width: 2, series: [
            { entity: hp("cl_haus"), name: "K6 Hausverbrauch", color: "#03a9f4" },
            { entity: hp("cl_wp"), name: "Wärmepumpe", color: "#e8833a" },
            { entity: hp("cl_hausstrom"), name: "Hausstrom Zähler", color: "#9c27b0" },
          ] },
          { type: "history", name: "Kapellenweg 4 (K4)", hours: 24, width: 2, series: [
            { entity: hp("cl_k4"), name: "Verbrauch K4", color: "#e8833a" },
          ] },
        ],
      }),
    },
    k6_speicher: {
      title: "Gesamt · Kapellenweg 6 · Kapellenweg 4 – Speicher & Solar-Verwendung",
      desc: "Pro Speicher (Sonnen, Marstek Venus01/Venus02) und in Summe: geladen, entladen, Ladestand. Darunter: Wie viel Solarstrom direkt verbraucht wurde, wie viel über die Speicher lief und wie viel eingespeist wurde. Oben zusätzlich der Verbrauch getrennt nach Gesamt, Kapellenweg 6 und Kapellenweg 4 (Speicher und Solaranlage gehören zur Gesamtanlage und lassen sich nicht auf ein Haus aufteilen). Umschalter oben (Aktuell/Tag/Woche/Monat/Jahr) wirkt auf alle Teile.",
      requires: [I.prod, I.gout, I.bin, I.bout, I.m1in, I.m1out, I.m2in, I.m2out, I.soc, M1 + "state_of_charge", M2 + "state_of_charge"],
      build: () => ({
        helpers,
        widgets: [
          { ...aut, width: 2 },
          { ...split, width: 2 },
          { ...fin },
          { type: "storage", name: "Gesamt · Speicher: geladen / entladen / Ladestand (versorgen beide Häuser)", width: 4, units: [
            { name: "Sonnenbatterie", soc: I.soc, capacity_kwh: 5.12, charge: [I.bin], discharge: [I.bout] },
            { name: "Marstek Venus01", soc: M1 + "state_of_charge", capacity_kwh: 5.12, charge: [I.m1in, M1 + "total_grid_import"], discharge: [I.m1out, M1 + "total_grid_export"] },
            { name: "Marstek Venus02", soc: M2 + "state_of_charge", capacity_kwh: 5.12, charge: [I.m2in, M2 + "total_grid_import"], discharge: [I.m2out, M2 + "total_grid_export"] },
          ] },
          { type: "pvsplit", name: "Gesamt · Solarstrom: direkt verbraucht · über Speicher · eingespeist", width: 4,
            solar: [I.prod, I.pvE], grid_export: [I.gout, I.expE],
            units: [{ charge: [I.bin] }, { charge: [I.m1in, M1 + "total_grid_import"] }, { charge: [I.m2in, M2 + "total_grid_import"] }] },
        ],
      }),
    },
    k6_geraete: {
      title: "Gesamt · Kapellenweg 6 · Kapellenweg 4 – Geräte & Top-Verbraucher",
      desc: "Messbare Geräte nebeneinander und darunter die größten Verbraucher im ganzen System (Prognose-, Gesamt- und Quellen-Sensoren sind ausgeblendet).",
      requires: devices,
      build: () => ({
        helpers,
        widgets: [
          { ...aut, width: 2 },
          { ...split, width: 2 },
          { ...fin },
          { type: "devices", name: "Geräte Kapellenweg 6", width: 2, names, entities: devices },
          { type: "devices", name: "Kapellenweg 4 (K4)", width: 2, names: { [hp("cl_k4")]: "K4 gesamt" }, entities: [hp("cl_k4"), ...I.k4] },
          { type: "top", name: "Top-Verbraucher (gesamtes System)", width: 4, count: 15, exclude_match: "forecast|geschätzt|marstek system|sonnenbatterie|hausstrom zähler|heizstromzähler|ct phase|ct total|helper|helfer|täglich" },
        ],
      }),
    },
  };
})();
const CLAUDE_OPTIONS = Object.entries(CLAUDE_SCENARIOS).map(([value, sc]) => ({ value, label: sc.title }));

/** Ersetzt „Szenario by Claude“-Widgets durch ihre fertigen Widgets (nur im Speicher, die gespeicherte Konfiguration bleibt unverändert) */
function expandClaude(cfg) {
  if (!(cfg.widgets || []).some((w) => w.type === "claude")) return cfg;
  const ws = [], helpers = [...(cfg.helpers || [])], extra = {};
  (cfg.widgets || []).forEach((w, ix) => {
    if (w.type !== "claude") { ws.push({ ...w, _ix: ix, _k: "w" + ix }); return; }
    const sc = CLAUDE_SCENARIOS[w.scenario];
    if (!sc) { ws.push({ type: "claudeinfo", title: "Szenario by Claude", desc: "Dieses Szenario ist in dieser Version nicht enthalten. Bitte ⟳ Update ausführen oder ein anderes Szenario wählen.", width: 4, _cl: true }); return; }
    const b = sc.build();
    ws.push({ type: "claudeinfo", title: w.name || sc.title, desc: sc.desc, requires: sc.requires, width: Math.min(4, Math.max(1, w.width || 4)), _cl: true, _k: "c" + ix + ".i" });
    b.widgets.forEach((x, n) => ws.push({ ...x, _cl: true, _k: "c" + ix + "." + n }));
    (b.helpers || []).forEach((h) => { if (!helpers.some((x) => x.id === h.id)) helpers.push(h); });
    ["balance_ref", "balance_ref_names", "unassigned_ov"].forEach((k) => { if (b[k] && !cfg[k] && !extra[k]) extra[k] = b[k]; });
  });
  return { ...cfg, ...extra, widgets: ws, ...(helpers.length ? { helpers } : {}) };
}

const LABELS = {
  scenario: "Szenario", type: "Typ", width: "Breite (1-4 Spalten)", name: "Name", soc: "Ladestand (SOC) — Sensor für den Ring (nur einer)",
  power: "Leistung — + = Laden; Entlade-Sensor mit „abziehen“ markieren", invert_power: "Vorzeichen umkehren (Standard: + = Laden)",
  capacity_kwh: "Kapazität (kWh, optional)", solar: "Solarproduktion — mehrere Sensoren werden addiert",
  grid: "Netz: Bezug — + = Bezug, − = Einspeisung (oder reiner Bezug-Sensor)", grid_export: "Netz: Einspeisung — optional, nur bei separatem Sensor",
  battery: "Batterie — + = Laden; Entlade-Sensor mit „abziehen“ markieren",
  home: "Hausverbrauch — mehrere Sensoren werden addiert; leer = berechnen",
  invert_grid: "Netz-Vorzeichen umkehren (wenn Einspeisung als Bezug angezeigt wird)", invert_battery: "Batterie-Vorzeichen umkehren",
  refresh_s: "Aktualisierung alle … Sekunden (Standard 5, nur Ansicht „Aktuell“)", exclude_match: "Ausblenden per Textmuster (Name oder ID, mehrere mit | trennen, z. B. forecast|total)", count: "Anzahl der Einträge (Standard 10, bis 1000; lange Listen scrollen)", include_sources: "Quellen (Solar/Netz/Batterie aus den Energiefluss-/Batterie-Widgets) ebenfalls anzeigen",
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
  top: [NAME, { name: "count", selector: { number: { min: 1, max: 1000, mode: "box" } } }, { name: "refresh_s", selector: { number: { min: 1, max: 3600, mode: "box", unit_of_measurement: "s" } } }, MULTI("exclude"), { name: "exclude_match", selector: { text: {} } }, BOOL("include_sources"), WIDTH],
  claude: [NAME, { name: "scenario", selector: { select: { mode: "dropdown", options: CLAUDE_OPTIONS } } }, WIDTH],
  history: [NAME, { name: "hours", selector: { number: { min: 1, max: 168, mode: "box" } } }, WIDTH],
};

// Virtueller Sensor: "Nicht zugeordnete Energiemenge" aus der Energiebilanz, nutzbar in Geräteliste und Hausverbrauch
// zweiter virtueller Sensor: Differenz zwischen berechnetem Verbrauch (Quellen) und dem gemessenen Referenz-Zähler
// Helfer = vom Nutzer definierte virtuelle Sensoren (Summe/Differenz mehrerer Sensoren), Id "virtual:helper:<id>"
const PAL = ["#03a9f4", "#e8833a", "#2e9e5b", "#9c27b0", "#e0a800", "#d81b60", "#00897b", "#6d4c41"];
const toIds = (v) => (Array.isArray(v) ? v : v ? [v] : []);
/** Sammelt Quellen (Solar/Netz/Batterie) und Verbraucher der Energiebilanz aus allen Widgets der Karte (jeder Sensor nur einmal) */
function balanceCollect(ws, bw, refIds = []) {
  const sgn = (wd, id) => (wd.signs?.[id] === -1 ? -1 : 1);
  const roles = { solar: new Map(), grid: new Map(), battery: new Map() };
  const seen = new Set();
  const put = (role, wd, id, f) => { if (seen.has(id)) return; seen.add(id); roles[role].set(id, { f, wd }); };
  for (const wd of ws.filter((x) => x.type === "flow")) {
    const ig = wd.invert_grid ? -1 : 1, ib = wd.invert_battery ? -1 : 1;
    toIds(wd.solar).forEach((id) => put("solar", wd, id, sgn(wd, id)));
    toIds(wd.grid).forEach((id) => put("grid", wd, id, sgn(wd, id) * ig));
    toIds(wd.grid_export).forEach((id) => put("grid", wd, id, -sgn(wd, id) * ig));
    toIds(wd.battery).forEach((id) => put("battery", wd, id, sgn(wd, id) * ib));
  }
  for (const wd of ws.filter((x) => x.type === "battery")) {
    const ib = wd.invert_power ? -1 : 1;
    toIds(wd.power).forEach((id) => put("battery", wd, id, sgn(wd, id) * ib));
  }
  const skip = new Set([...seen, ...toIds(bw.exclude), ...toIds(refIds), VIRT, VIRT_LOSS]);
  const cons = new Map();
  const addC = (wd, id, kind) => { if (!skip.has(id) && !cons.has(id)) cons.set(id, { f: sgn(wd, id), wd, kind }); };
  for (const wd of ws.filter((x) => x.type === "devices")) toIds(wd.entities).forEach((id) => addC(wd, id, "device"));
  for (const wd of ws.filter((x) => x.type === "flow")) toIds(wd.deduct).forEach((id) => addC(wd, id, "area"));
  toIds(bw.entities).forEach((id) => addC(bw, id, "device"));
  return { roles, cons, seen };
}
/** Wendet die Einstellungen „Ignorieren / Addieren / Subtrahieren“ auf die gesammelten Quellen und Verbraucher an */
function balanceApply(roles, cons, ov) {
  for (const role of Object.keys(roles)) for (const [id, it] of [...roles[role]]) {
    const o = ov[id]; if (!o) continue;
    if (o === "ignore") roles[role].delete(id);
    else if ((role !== "battery" && o === "sub") || (role === "battery" && o === "add")) it.f = -it.f;
  }
  for (const [id, it] of [...cons]) {
    const o = ov[id]; if (!o) continue;
    if (o === "ignore") cons.delete(id); else if (o === "add") it.f = -it.f;
  }
}
const BAL_DEFAULT = { solar: "add", grid: "add", battery: "sub", area: "sub", consumer: "sub" };
const PERIODS = { now: "Aktuell", day: "Tag", week: "Woche", month: "Monat", year: "Jahr", range: "📅 Zeitraum" };
const hashStr = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
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
    this._rawCanon = canon(config);
    { const { layout: _l, wallbox_data: _w, ...base } = config; this._rawBase = canon(base);
      let lay = config.layout;
      if (!lay) { try { lay = JSON.parse(localStorage.getItem("ob_layout:" + hashStr(this._rawBase)) || "null"); } catch (e) { lay = null; } }
      this._layout = lay || {}; }
    this._config = expandClaude({ title: "Energie", widgets: [], ...config });
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
      for (const k of ["power", "solar", "grid", "grid_export", "battery", "home", "deduct", "k4", "k6"]) ids.push(...this._ids(w[k]));
      if (Array.isArray(w.entities)) ids.push(...w.entities);
      for (const it of w.detail || []) ids.push(...this._ids(it.id));
      ids.push(...this._ids(w.detail_total));
      for (const g of w.groups || []) for (const x of [g.id, ...(g.parts || []).map((p) => p.id)]) ids.push(...this._ids(x));
    }
    for (const h of this._config?.helpers || []) ids.push(...this._ids(h.entities));
    return ids;
  }

  /** Anzeigename eines Sensors im Widget (eigener Name oder Entity-Name) */
  _label(w, id) { return w.names?.[id] || (id === WB ? "Wallbox" : null) || (id === VIRT ? VIRT_NAME + " (virtuell)" : id === VIRT_LOSS ? VIRT_LOSS_NAME + " (virtuell)" : null) || this._helper(id)?.name || this._st(id)?.attributes?.friendly_name || id; }
  /** Kleine Einzelwerte aller Sensoren eines Widget-Feldes */
  _parts(w, ids, always = false) {
    ids = ids.filter(Boolean);
    if (!ids.length || (!always && ids.length < 2 && !ids.some((id) => w.names?.[id]))) return "";
    return `<div class="parts">${ids.map((id) => `<div><span title="${esc(id)}">${esc(this._label(w, id))}</span><b>${esc(id === VIRT && (this._unassigned(true) ?? 0) < 0 ? "⚠ " + this._fmtW(this._unassigned(true)) : (w.signs?.[id] === -1 ? "− " : "") + this._fmtW(this._watts(id)))}</b></div>`).join("")}</div>`;
  }
  _ids(v) { return Array.isArray(v) ? v : v ? [v] : []; }
  _helper(id) { return typeof id === "string" && id.startsWith(HELP_PREFIX) ? (this._config?.helpers || []).find((h) => h.id === id.slice(HELP_PREFIX.length)) : null; }
  _isEnergy(id) {
    if (id === WB) return true;
    if (this._helper(id)) { const f = this._hflat(id); return f.length > 0 && f.every((x) => this._isEnergy(x.id)); }
    const a = this._st(id)?.attributes || {};
    return ["Wh", "kWh", "MWh"].includes(a.unit_of_measurement) || a.device_class === "energy";
  }
  /** Sensoren eines Feldes, die im aktuellen Zeitraum zählen:
   *  Aktuell = nur Leistungssensoren; Tag/Woche/Monat/Jahr = Energiezähler, sonst Leistung (Statistik-Mittelwert × Zeit). */
  _use(v) {
    const ids = this._ids(v), en = ids.filter((i) => this._isEnergy(i)), virt = ids.filter((i) => i === VIRT || i === VIRT_LOSS);
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
    if (id === WB) return this._period === "now" ? null : this._wallbox();
    if (id === VIRT) return this._unassigned();
    if (id === VIRT_LOSS) return this._losses();
    const hp = this._helper(id);
    if (hp) {  // Helfer: Komponenten (Sensoren und andere Helfer) addieren bzw. (bei „abziehen“) subtrahieren
      const seen = (this._hseen ||= new Set());
      if (seen.has(id)) return null;  // Zyklus: Helfer enthält sich selbst
      seen.add(id);
      try {
        const comps = hp.entities || [];
        let t = null;
        const add = (c, v) => { if (v !== null) t = (t || 0) + (hp.signs?.[c] === -1 ? -v : v); };
        for (const c of this._use(comps.filter((x) => !String(x).startsWith("virtual:")))) add(c, this._watts(c));
        for (const c of comps.filter((x) => String(x).startsWith(HELP_PREFIX))) add(c, this._watts(c));
        return t;
      } finally { seen.delete(id); }
    }
    if (this._period !== "now") return this._stat?.[this._statKey()]?.[id] ?? null;  // kWh aus Statistik
    if (this._isEnergy(id)) return null;
    const v = this._num(id); if (v === null) return null;
    const u = this._st(id).attributes.unit_of_measurement;
    // nur echte Leistungseinheiten zählen; Sensoren mit anderer/falscher Einheit (z. B. „kWhh“, „%“) liefern keinen Leistungswert
    if (!["W", "kW", "MW"].includes(u)) return null;
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
      <div class="dev"><div class="dl"><span>${esc(this._label(w, r.id))}</span><b>${esc(!now || r.v !== null ? this._fmtW(r.v) : this._fmt(r.id))}${this._amt(r.v, this._ids(this._config.widgets.find((x) => x.type === "finance")?.k4).includes(r.id))}</b></div>
      ${r.v !== null ? `<div class="bar"><i style="width:${Math.min(100, Math.abs(r.v) / max * 100)}%"></i></div>` : ""}</div>`).join("") || '<div class="sub">Keine Geräte gewählt</div>'}</div>`;
  }

  /** Sammelt Quellen und Verbraucher automatisch aus den anderen Widgets dieser Karte (jeder Sensor nur einmal). */
  _balanceModel(w) {
    const { roles, cons, seen } = balanceCollect(this._config.widgets || [], w, this._config.balance_ref);
    // Einstellungen „Nicht zugeordnet – Zusammensetzung“: ignorieren / addieren / subtrahieren je Sensor
    balanceApply(roles, cons, this._config.unassigned_ov || {});
    const sum = (m) => {
      let t = null;
      for (const id of this._use([...m.keys()])) { const v = this._watts(id); if (v !== null) t = (t || 0) + v * m.get(id).f; }
      return t;
    };
    return { solar: sum(roles.solar), grid: sum(roles.grid), bat: sum(roles.battery), roles, cons, hasSrc: seen.size > 0 };
  }

  /** Kopf eines Szenarios by Claude: Titel, Beschreibung, fehlende Sensoren */
  _storage(w) {
    const units = (w.units || []).map((u) => {
      const ch = this._sumW(u.charge, u), dis = this._sumW(u.discharge, u), soc = this._num(u.soc);
      return { u, ch, dis, soc, cap: Number(u.capacity_kwh) || 0 };
    });
    const add = (k) => units.reduce((a, r) => (r[k] === null ? a : (a || 0) + r[k]), null);
    const tch = add("ch"), tdis = add("dis");
    const withCap = units.filter((r) => r.soc !== null && r.cap), withSoc = units.filter((r) => r.soc !== null);
    const tsoc = withCap.length === withSoc.length && withCap.length ? withCap.reduce((a, r) => a + r.soc * r.cap, 0) / withCap.reduce((a, r) => a + r.cap, 0) : withSoc.length ? withSoc.reduce((a, r) => a + r.soc, 0) / withSoc.length : null;
    const tcap = units.reduce((a, r) => a + r.cap, 0);
    const bar = (v) => `<div style="height:8px;border-radius:4px;background:var(--divider-color);overflow:hidden;margin:4px 0"><div style="height:100%;width:${v === null ? 0 : Math.max(0, Math.min(100, v))}%;background:${v !== null && v < 20 ? "#c0392b" : "#2e9e5b"}"></div></div>`;
    const now = this._period === "now";
    const row = (name, r, bold) => `<div class="node" style="--c:${bold ? "var(--primary-color)" : "#2e9e5b"}"><div class="nh"><div class="nt"><div class="nl">${esc(name)}</div>
      <div class="sub">${r.soc === null ? "Ladestand –" : "Ladestand " + Math.round(r.soc) + " %" + (r.cap ? " · " + (r.cap * r.soc / 100).toFixed(2) + " / " + r.cap.toFixed(2) + " kWh" : "")}</div></div></div>${bar(r.soc)}
      <div class="parts"><div><span>${now ? "lädt gerade" : "geladen"}</span><b>${esc(this._fmtW(r.ch))}</b></div><div><span>${now ? "entlädt gerade" : "entladen"}</span><b>${esc(this._fmtW(r.dis))}</b></div></div></div>`;
    return `<div class="flow">${units.map((r) => row(r.u.name || r.u.soc, r)).join("")}${units.length > 1 ? row("Summe aller Speicher", { soc: tsoc, ch: tch, dis: tdis, cap: tcap }, true) : ""}</div>
      ${now ? "" : '<div class="sub" style="margin-top:6px">Zeiträume: Zähler (kWh) wo vorhanden, sonst aus der Leistung hochgerechnet (Sonnen).</div>'}`;
  }
  /** Liste aller Verbraucher von Kapellenweg 6 (nach Verbrauch sortiert), Summe und nicht zuordenbarer Rest */
  _k6detail(w) {
    const now = this._period === "now", thr = now ? 5 : 0.01, zero = !!this._showZero;
    const total = this._sumW(w.detail_total, w);
    const rows = (w.detail || []).map((it) => ({ it, v: this._sumW(it.id, w) })).filter((r) => r.v !== null).sort((a, b) => b.v - a.v);
    const shown = rows.filter((r) => zero || Math.abs(r.v) >= thr), hidden = rows.length - shown.length;
    const sum = rows.reduce((a, r) => a + r.v, 0), rest = total === null ? null : total - sum;
    const line = (n, v, cls = "") => `<div class="brow ${cls}"><span>${esc(n)}</span><b>${esc(this._fmtW(v))}${this._amt(v)}</b></div>`;
    return `<div class="k6d" style="margin:4px 0 8px 12px;padding:6px 10px;border-left:3px solid var(--primary-color);background:var(--secondary-background-color,rgba(0,0,0,.04));border-radius:6px">
      <div class="sub" style="text-align:left;margin-bottom:4px">Verbraucher Kapellenweg 6, größte zuerst${now ? " (aktuelle Leistung)" : ""}</div>
      ${shown.map((r) => line(r.it.name, r.v)).join("") || '<div class="sub">Aktuell kein relevanter Verbrauch.</div>'}
      <div class="bsec" style="margin-top:4px">${line("Summe erfasster Verbraucher", sum)}${line("Kapellenweg 6 gesamt", total)}${line("Nicht zuordenbarer Verbrauch (Rest)", rest, "rest")}</div>
      <label class="sub" style="display:block;margin-top:4px"><input type="checkbox" class="zt" ${zero ? "checked" : ""}> auch Sensoren ohne Verbrauch zeigen${hidden && !zero ? " (" + hidden + " ausgeblendet)" : ""}</label></div>`;
  }
  /** Preise (€/kWh): Standard aus der Konfiguration, im Widget änderbar (im Browser gespeichert) */
  _prices(w) {
    const def = { solar_use: 0.06, feed_in: 0.06, grid: 0.34, k4: 0.25, ...(w.prices || {}) };
    let ov = {}; try { ov = JSON.parse(localStorage.getItem("ob_prices") || "{}"); } catch (e) { ov = {}; }
    return { ...def, ...ov };
  }
  /** Rechenkern der Finanzübersicht (Mengen, Beträge, Mischpreis) */
  _finCalc(w) {
    const now = this._period === "now", pr = this._prices(w), k = now ? 1e-3 : 1;  // Aktuell: W → kW, € pro Stunde
    const g = (v) => { const x = this._sumW(v, w); return x === null ? null : x * k; };
    const S = g(w.solar), E = g(w.grid_export), G = g(w.grid), C = g(w.home), K4 = g(w.k4), K6 = g(w.k6);
    if (G === null || C === null) return null;
    const used = Math.max(0, C - G), e = Math.max(0, E || 0), k4 = Math.max(0, K4 || 0);
    const cGrid = G * pr.grid, cSolar = used * pr.solar_use, rFeed = e * pr.feed_in, rK4 = k4 * pr.k4;
    const cost = cGrid + cSolar, rev = rFeed + rK4;
    return { now, pr, S, E, G, C, K4, K6, used, e, k4, cGrid, cSolar, rFeed, rK4, cost, rev, mix: C > 0 ? cost / C : 0 };
  }
  /** Mischpreis (€/kWh) der Gesamtanlage für Beträge hinter Sensoren; null ohne Finanz-/Autarkie-Widget */
  _mixInfo() {
    if (this._mixC === undefined) {
      const fw = (this._config?.widgets || []).find((x) => x.type === "finance") || (this._config?.widgets || []).find((x) => x.type === "autarky");
      const c = fw ? this._finCalc(fw) : null;
      this._mixC = c ? { mix: c.mix, k4: c.pr.k4, now: c.now, k4ids: this._ids(fw.k4) } : null;
    }
    return this._mixC;
  }
  /** Betrag hinter einem Verbrauchswert: Kosten zum Mischpreis (inkl. entgangenem Erlös) bzw. Erlös bei Kapellenweg 4 */
  _amt(v, rev = false) {
    const m = this._mixInfo(); if (m === null || v === null || v === undefined || isNaN(v)) return "";
    const x = v * (m.now ? 1e-3 : 1) * (rev ? m.k4 : m.mix);
    const t = Math.abs(x).toFixed(2).replace(".", ",") + " €" + (m.now ? "/h" : "");
    return ` <small class="eur" title="${rev ? "Erlös: " + (m.k4 * 100).toFixed(0) + " ct/kWh" : "Kosten zum Mischpreis " + (m.mix * 100).toFixed(1).replace(".", ",") + " ct/kWh (Netzbezug + entgangener Erlös Sonnenstrom)"}" style="font-weight:normal;opacity:.8;color:${rev ? "#2e9e5b" : "inherit"}">· ${rev ? "+ " : ""}${t}</small>`;
  }
  _finance(w) {
    const c = this._finCalc(w);
    if (!c) return '<div class="sub">Keine Werte verfügbar</div>';
    const { now, pr, G, C, K4, K6, used, e, k4, cGrid, cSolar, rFeed, rK4, mix } = c;
    const unit = now ? "kW" : "kWh", eur = (v) => (v === null || isNaN(v) ? "–" : v.toFixed(2).replace(".", ",") + " €" + (now ? "/h" : ""));
    const qty = (v) => (v === null ? "–" : v.toFixed(2).replace(".", ",") + " " + unit);
    const pc = (p) => (p * 100).toFixed(0) + " ct";
    const cash = rFeed + rK4 - cGrid, eco = cash - cSolar;
    const line = (label, q, p, v, sign, hint = "") => `<div class="brow"${hint ? ` title="${esc(hint)}"` : ""}><span>${esc(label)} <small class="sub">${qty(q)} × ${pc(p)}</small></span><b style="color:${sign < 0 ? "#c0392b" : "#2e9e5b"}">${sign < 0 ? "− " : "+ "}${esc(eur(v))}</b></div>`;
    const sum = (label, v, big) => `<div class="brow" style="border-top:1px solid var(--divider-color);margin-top:2px;padding-top:3px"><span><b>${esc(label)}</b></span><b style="${big ? "font-size:1.35em;" : ""}color:${v < 0 ? "#c0392b" : "#2e9e5b"}">${esc((v > 0 ? "+ " : v < 0 ? "− " : "") + eur(Math.abs(v)))}</b></div>`;
    const k6c = (K6 || 0) * mix, k4c = k4 * mix;
    const inp = (key, label) => `<label class="sub" style="display:flex;justify-content:space-between;gap:8px;align-items:center">${esc(label)}<span><input type="number" step="0.01" min="0" class="pi" data-k="${key}" value="${pr[key]}" style="width:70px"> €/kWh</span></label>`;
    return `<div class="bsec">Kosten (Geld, das fließt)</div>
      ${line("Netzbezug", G, pr.grid, cGrid, -1)}
      <div class="bsec" style="margin-top:8px">Erlöse (Geld, das fließt)</div>
      ${line("Eingespeister Sonnenstrom", e, pr.feed_in, rFeed, 1)}${line("Strom an Kapellenweg 4", k4, pr.k4, rK4, 1)}
      ${sum("Kassen-Saldo (Erlöse − Netzbezug)", cash, false)}
      <div class="bsec" style="margin-top:8px">Entgangener Erlös</div>
      ${line("Selbst verbrauchter Sonnenstrom", used, pr.solar_use, cSolar, -1, "Strom, der nicht eingespeist wurde und deshalb keine Einspeisevergütung bringt")}
      <div class="bsec" style="margin-top:8px">${sum("Wirtschaftliches Ergebnis (nach entgangenem Erlös)", eco, true)}</div>
      <div class="bsec" style="margin-top:8px">Aufteilung nach Haus <small class="sub">Mischpreis ${esc((mix * 100).toFixed(1).replace(".", ","))} ct/kWh = (Netzbezug + entgangener Erlös) ÷ Gesamtverbrauch</small></div>
      <div class="brow"><span>Kapellenweg 6 <small class="sub">${qty(K6)} Verbrauch</small></span><b>Kosten ${esc(eur(k6c))}</b></div>
      <div class="brow"><span>Kapellenweg 4 <small class="sub">${qty(k4)} × ${pc(pr.k4)} − Kosten ${esc(eur(k4c))}</small></span><b style="color:${rK4 - k4c < 0 ? "#c0392b" : "#2e9e5b"}">Ergebnis ${esc(eur(rK4 - k4c))}</b></div>
      <details class="pd" ${this._piOpen ? "open" : ""} style="margin-top:8px"><summary class="sub" style="cursor:pointer">Preise anpassen</summary>${inp("grid", "Netzbezug (Kosten)")}${inp("solar_use", "Selbst verbrauchter Sonnenstrom (entgangener Erlös)")}${inp("feed_in", "Eingespeister Sonnenstrom (Erlös)")}${inp("k4", "Strom an Kapellenweg 4 (Erlös)")}</details>
      <div class="sub" style="margin-top:6px">Selbst verbrauchter Sonnenstrom = Gesamtverbrauch − Netzbezug (inkl. über die Speicher). Die Beträge hinter den Sensoren in den anderen Übersichten sind Kosten zum Mischpreis${now ? "; „Aktuell“ in € pro Stunde" : ""}.</div>`;
  }
  _tg(k) { return !!(this._openTg ||= {})[k]; }
  _areas(w) {
    const now = this._period === "now";
    const row = (name, id, cls, tg, rev) => { const v = this._sumW(id, w); const wbOnly = this._ids(id).includes(WB) && now; return `<div class="brow ${cls}"${tg ? ` data-tg="${tg}" style="cursor:pointer" title="Klicken: Verbraucher-Liste ein-/ausklappen"` : ""}><span>${tg ? (this._tg(tg) ? "▾ " : "▸ ") : ""}${esc(name)}</span><b>${esc(wbOnly ? "nur in Zeiträumen" : this._fmtW(v))}${wbOnly ? "" : this._amt(v, rev)}</b></div>`; };
    return (w.groups || []).map((g) => `<div class="bsec" style="margin-top:8px">${row(g.name, g.id, "", g.toggle, g.rate === "k4")}</div>${g.toggle && this._tg(g.toggle) ? this._k6detail(w) : ""}${(g.parts || []).map((p) => row("↳ " + p.name, p.id, "sub", "", g.rate === "k4")).join("")}`).join("")
      + (w.note ? `<div class="sub" style="margin-top:6px">${esc(w.note)}</div>` : "")
      + (w.wallbox_upload ? (() => { const d = this._wbData(), last = d.length ? new Date(d[d.length - 1][1] * 1000).toLocaleDateString("de-DE") : "–";
        return `<div class="sub" style="margin-top:8px">Wallbox-Daten: ${d.length} Ladevorgänge, letzter bis ${esc(last)}</div>
          <div class="row"><button class="wbu">📤 Neue Wallbox-Daten hochladen (TSV/CSV)</button><input type="file" class="wbf" accept=".tsv,.csv,.txt,text/*" hidden></div>${this._wbMsg ? `<div class="sub warn" style="text-align:left">${esc(this._wbMsg)}</div>` : ""}`; })() : "");
  }
  _breakdown(w) {
    const ids = this._ids(w.breakdown); if (!ids.length) return "";
    const one = (id) => { const tg = id === (w.detail_total || [])[0] && (w.detail || []).length ? "k6" : ""; const v = this._sumW(id, w);
      return `<div${tg ? ` data-tg="k6" style="cursor:pointer" title="Klicken: Verbraucher-Liste ein-/ausklappen"` : ""}><span title="${esc(id)}">${tg ? (this._tg("k6") ? "▾ " : "▸ ") : ""}${esc(this._label(w, id))}</span><b>${esc(this._ids(id).includes(WB) && this._period === "now" ? "–" : this._fmtW(v))}${this._amt(v, this._ids(w.k4).includes(id))}</b></div>${tg && this._tg("k6") ? "</div>" + this._k6detail(w) + '<div class="parts">' : ""}`; };
    return `<div class="parts">${ids.map(one).join("")}</div>`;
  }
  _autarky(w) {
    const cons = this._sumW(w.home, w), imp = this._sumW(w.grid, w), exp = this._sumW(w.grid_export, w), sol = this._sumW(w.solar, w);
    if (cons === null || imp === null) return '<div class="sub">Keine Werte verfügbar</div>';
    const aut = cons > 0 ? Math.max(0, Math.min(100, (1 - imp / cons) * 100)) : null;
    const eig = sol !== null && sol > 0 ? Math.max(0, Math.min(100, (1 - (exp || 0) / sol) * 100)) : null;
    const col = aut === null ? "var(--secondary-text-color)" : aut >= 66 ? "#2e9e5b" : aut >= 33 ? "#e0a800" : "#c0392b";
    const pc = (v) => (v === null ? "–" : Math.round(v) + " %");
    return `<div class="val"><div class="big" style="color:${col}">${pc(aut)}</div><div class="sub">Autarkie (Anteil des Verbrauchs ohne Netzbezug)</div></div>
      <div style="height:8px;border-radius:4px;background:var(--divider-color);overflow:hidden;margin:6px 0 10px"><div style="height:100%;width:${aut || 0}%;background:${col}"></div></div>
      <div class="brow"><span>🏭 Netzbezug</span><b>${esc(this._fmtW(imp))}</b></div>${this._parts(w, this._use(w.grid), true)}
      <div class="brow"><span>⬆ Einspeisung</span><b>${esc(this._fmtW(exp))}</b></div>${this._parts(w, this._use(w.grid_export), true)}
      <div class="brow"><span>🏠 Verbrauch Gesamt</span><b>${esc(this._fmtW(cons))}</b></div>${this._breakdown(w)}
      <div class="brow"><span>☀️ Eigenverbrauchsquote Solar</span><b>${pc(eig)}</b></div>
      <div class="sub" style="margin-top:6px">Gilt für die Gesamtanlage (Kapellenweg 6 + 4). Die Netz-Zähler hängen vor beiden Häusern, daher gibt es keine getrennte Autarkie pro Haus. Netzladung der Speicher zählt als Netzbezug. Quelle: Sonnenbatterie „Netz import“ / „Netz export“; in Zeiträumen aus dem Leistungsverlauf (Statistik) hochgerechnet.</div>`;
  }
  _pvsplit(w) {
    const sol = this._sumW(w.solar, w), exp = this._sumW(w.grid_export, w);
    let ch = this._sumW(w.battery, w);
    if (w.units) ch = w.units.reduce((a, u) => { const v = this._sumW(u.charge, u); return v === null ? a : (a || 0) + v; }, null);
    if (sol === null) return '<div class="sub">Keine Solarwerte verfügbar</div>';
    const S = Math.max(0, sol), E = Math.min(S, Math.max(0, exp || 0)), avail = S - E;
    const via = Math.min(Math.max(0, ch || 0), avail), direct = avail - via;
    const pct = (v) => (S > 0 ? Math.round(v / S * 100) : 0);
    const seg = (v, c) => `<div style="width:${S > 0 ? v / S * 100 : 0}%;background:${c}"></div>`;
    const line = (c, label, v) => `<div class="brow"><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:6px"></i>${label}</span><b>${esc(this._fmtW(v))} · ${pct(v)} %</b></div>`;
    return `<div style="display:flex;height:16px;border-radius:8px;overflow:hidden;background:var(--divider-color);margin:4px 0 10px">${seg(direct, "#e0a800")}${seg(via, "#2e9e5b")}${seg(E, "#03a9f4")}</div>
      <div class="brow"><span>☀️ Solar erzeugt</span><b>${esc(this._fmtW(S))}</b></div>
      ${line("#e0a800", "direkt im Haus verbraucht", direct)}${line("#2e9e5b", "über Speicher (geladen)", via)}${line("#03a9f4", "eingespeist", E)}
      <div class="sub" style="margin-top:6px">Eigenverbrauch (direkt + Speicher): ${pct(direct + via)} %. Näherung: Alles, was die Speicher laden, wird als Solarstrom gewertet (Netzladung kann nicht unterschieden werden).</div>`;
  }
  _claudeinfo(w) {
    const miss = (w.requires || []).filter((id) => !this._st(id) || ["unavailable", "unknown"].includes(this._st(id).state));
    return `<div class="sub">${esc(w.desc || "")}</div>
      ${miss.length ? `<div class="sub warn" style="text-align:left;margin-top:6px">⚠ ${miss.length} benötigte Sensoren liefern gerade nichts: ${esc(miss.slice(0, 4).map((i) => this._label({}, i)).join(", "))}${miss.length > 4 ? " …" : ""}</div>` : `<div class="sub" style="margin-top:6px">✓ Alle benötigten Sensoren sind vorhanden.</div>`}
      <div class="sub" style="margin-top:6px">Szenario-Stand: v${OB_VERSION} · Änderungswünsche an Claude im Editor unter „Szenario by Claude“.</div>`;
  }

  /** Rechnet die Bilanz aus (Zufluss, Verbraucher, Rest); null ohne Quellen */
  _balanceCalc(w) {
    const m = this._balanceModel(w);
    if (!m.hasSrc) return null;
    const batIn = m.bat === null ? null : -m.bat;  // Entladen = Zufluss, Laden = Abfluss
    const supply = (m.solar || 0) + (m.grid || 0) + (batIn || 0);
    let rows = [...m.cons].map(([id, c]) => {
      const raw = this._watts(id);
      return { id, wd: c.wd, kind: c.kind, v: raw === null ? null : raw * c.f };
    });
    // „Andere Bereiche“ (Abzug-Feld): Leistungs- und Energiesensor desselben Bereichs sind Alternativen – je nach Ansicht zählt nur eine Art
    const byWd = new Map(), keepArea = new Set();
    for (const [id, c] of m.cons) if (c.kind === "area") { if (!byWd.has(c.wd)) byWd.set(c.wd, []); byWd.get(c.wd).push(id); }
    for (const ids of byWd.values()) this._use(ids).forEach((i) => keepArea.add(i));
    rows = rows.filter((r) => r.kind !== "area" || keepArea.has(r.id));
    if (this._period === "now") rows = rows.filter((r) => !this._isEnergy(r.id));  // Zähler lassen sich in „Aktuell“ nicht einrechnen
    // Zeiträume: hat ein Gerät einen Energiezähler UND einen Leistungssensor in der Liste, zählt nur der Zähler (sonst doppelt gezählt)
    const skipped = [];
    if (this._period !== "now") {
      const dev = (id) => this._hass?.entities?.[id]?.device_id;
      const hasEn = new Set(rows.filter((r) => this._isEnergy(r.id) && dev(r.id)).map((r) => dev(r.id)));
      rows = rows.filter((r) => { const dup = !this._isEnergy(r.id) && dev(r.id) && hasEn.has(dev(r.id)); if (dup) skipped.push(r); return !dup; });
    }
    const areaRows = rows.filter((r) => r.kind === "area"), devRows = rows.filter((r) => r.kind !== "area");
    const areaUsed = areaRows.reduce((a, r) => a + (r.v || 0), 0), devUsed = devRows.reduce((a, r) => a + (r.v || 0), 0);
    // Referenz-Zähler (z. B. Hausstrom-Zähler hinter Solar/Speicher): gemessener Gesamtverbrauch ersetzt den aus den Quellen berechneten
    const refIds = this._ids(this._config.balance_ref);
    const refSum = refIds.length ? this._sumW(refIds, {}) : null;
    const hasRef = refSum !== null;
    const houseTotal = hasRef ? refSum : supply, loss = hasRef ? supply - refSum : null;
    const used = areaUsed + devUsed, houseUse = houseTotal - areaUsed;
    return { m, batIn, supply, hasRef, refSum, loss, houseTotal, rows, areaRows, devRows, areaUsed, devUsed, houseUse, used, rest: houseTotal - used, skipped };
  }
  /** Wert des virtuellen Sensors „Anlagenverluste & Messabweichung“ = Quellen − Referenz-Zähler (null ohne Referenz) */
  _losses() {
    const bw = (this._config.widgets || []).find((x) => x.type === "balance") || {};
    return this._balanceCalc(bw)?.loss ?? null;
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
    const { m, batIn, supply, hasRef, refSum, loss, houseTotal, areaRows, devRows, areaUsed, devUsed, houseUse, rest } = c;
    const rows = [...areaRows, ...devRows];
    const uncounted = rows.filter((r) => r.v === null).length;
    const tol = Math.max(Math.abs(houseUse) * 0.05, now ? 30 : 0.05);
    const col = rest < -tol ? "#c0392b" : Math.abs(rest) <= tol ? "#2e9e5b" : "#e8833a";
    const pct = houseUse > 0 ? Math.min(100, Math.max(0, devUsed / houseUse * 100)) : 0;
    const row = (label, v, cls = "") => `<div class="brow ${cls}"><span>${esc(label)}</span><b>${esc(this._fmtW(v))}</b></div>`;
    const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.v || 0)));
    const list = (rs, base) => [...rs].sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity)).map((r) => {
      const big = r.v !== null && base > 0 && r.v > base;
      return `<div class="brow"><span title="${esc(r.id)}${big ? " – größer als der gesamte Zufluss: vermutlich ein Gesamtzähler" : ""}">${big ? "⚠ " : ""}${esc(this._label(r.wd, r.id))}</span><b>${esc(r.v === null ? "–" : this._fmtW(r.v))}</b></div>
        ${r.v !== null ? `<div class="bar"><i style="width:${Math.min(100, Math.abs(r.v) / max * 100)}%"></i></div>` : ""}`;
    }).join("");
    const home = (this._config.widgets || []).filter((x) => x.type === "flow" && this._ids(x.home).length).map((x) => this._sumW(x.home, x)).find((v) => v !== null);
    // Beitrag jedes Quell-Sensors zum Zufluss (mit Vorzeichen) – zeigt, welcher Sensor die Summe verfälscht
    const src = (role, k) => this._use([...m.roles[role].keys()]).map((id) => {
      const raw = this._watts(id), v = raw === null ? null : raw * m.roles[role].get(id).f * k;
      const t = v === null ? "–" : (v > 0 ? "+" : "") + this._fmtW(v);
      return `<div class="brow sub"><span title="${esc(id)}">↳ ${esc(this._label(m.roles[role].get(id).wd, id))}</span><b>${esc(t)}</b></div>`;
    }).join("");
    return `<div class="bal">
      <div class="bsec">1 · Hausverbrauch aus den Quellen</div>
      <div class="sub">Solar + Netzbezug + Batterie-Entladung − Einspeisung − Batterie-Ladung</div>
      ${m.solar !== null ? row("☀️ Solar", m.solar) + src("solar", 1) : ""}
      ${m.grid !== null ? row(m.grid >= 0 ? "🏭 Netzbezug" : "🏭 Einspeisung (netto)", m.grid) + src("grid", 1) : ""}
      ${batIn !== null ? row(batIn >= 0 ? "🔋 Batterie entlädt" : "🔋 Batterie lädt (netto)", batIn) + src("battery", -1) : ""}
      ${row("= Hausverbrauch gesamt (berechnet)", supply, "tot")}
      ${hasRef ? `<div class="bsec">Referenz-Zähler (gemessen hinter den Quellen)</div>${this._use(this._ids(this._config.balance_ref)).map((id) => { const v = this._watts(id); return `<div class="brow sub"><span title="${esc(id)}">↳ ${esc(this._label({ names: this._config.balance_ref_names }, id))}</span><b>${esc(this._fmtW(v))}</b></div>`; }).join("")}${row("Gemessen am Referenz-Zähler", refSum)}${row("Differenz Quellen − Zähler: Verluste, Standby, Messabweichung", loss)}` : ""}
      ${home !== undefined && !hasRef ? `<div class="sub">Gemessener Hausverbrauch (Energiefluss): ${esc(this._fmtW(home))}</div>` : ""}
      ${areaRows.length ? `<div class="bsec">2 · Abzüglich anderer Bereiche (${areaRows.length})</div>${list(areaRows, houseTotal)}${row("= Verbrauch dieses Hauses", houseUse, "tot")}` : ""}
      <div class="bsec">${areaRows.length ? "3" : "2"} · Davon erklärt durch Geräte (${devRows.length})</div>
      ${list(devRows, houseUse) || '<div class="sub">Noch keine Geräte: Sensoren im <b>Geräteverbrauch</b>-Widget werden automatisch übernommen.</div>'}
      ${areaRows.some((r) => r.v !== null && houseTotal > 0 && r.v > houseTotal) || devRows.some((r) => r.v !== null && houseUse > 0 && r.v > houseUse) ? `<div class="sub">⚠ Ein Eintrag ist größer als der gesamte Zufluss – vermutlich ein Gesamt- oder Hauptzähler. Blende ihn über „Ignorieren“ aus.</div>` : ""}
      ${c.skipped.length ? `<div class="sub">Nicht doppelt gezählt (Gerät hat Energiezähler): ${esc(c.skipped.map((r) => this._label(r.wd, r.id)).join(", "))}</div>` : ""}
      ${uncounted ? `<div class="sub">${uncounted} Zähler ohne Leistungswert sind in „Aktuell“ nicht eingerechnet (nur Tag–Jahr).</div>` : ""}
      ${row("Geräte gesamt", devUsed, "tot")}
      <div class="stack"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="rest" style="--c:${col}"><div><div class="nl">Energiemenge nicht zugeordnet</div>
        <div class="sub">${rest < -tol ? "Geräte übersteigen den Verbrauch des Hauses" : Math.abs(rest) <= tol ? "Alles zugeordnet ✓" : houseUse > 0 ? (100 - pct).toFixed(0) + " % des Hausverbrauchs: ungemessene Verbraucher, Standby, Verluste oder Messabweichung" : ""}</div></div>
        <div class="nv">${esc(this._fmtW(rest))}</div></div></div>`;
  }

  /** Layout-Modus: Widgets per Drag & Drop umsortieren (⠿) und die Breite ändern (⇔) */
  _bindLayout() {
    const root = this.shadowRoot;
    root.getElementById("ldone")?.addEventListener("click", () => { this._layoutMode = false; this._render(); });
    root.getElementById("lreset")?.addEventListener("click", () => { this._layout = {}; this._persistLayout(); this._render(); });
    root.querySelectorAll(".hdl").forEach((h) => h.addEventListener("pointerdown", (ev) => this._dragStart(ev, h.closest(".w"))));
    root.querySelectorAll(".rsz").forEach((h) => h.addEventListener("pointerdown", (ev) => this._resizeStart(ev, h.closest(".w"))));
  }
  _dragStart(ev, el) {
    ev.preventDefault();
    const root = this.shadowRoot, grid = root.querySelector(".grid"), d = (this._drag = { k: el.dataset.k, sx: ev.clientX, sy: ev.clientY, target: null, before: true });
    el.classList.add("drag");
    const clear = () => root.querySelectorAll(".w").forEach((x) => x.classList.remove("dbef", "daft"));
    const move = (e) => {
      el.style.transform = `translate(${e.clientX - d.sx}px, ${e.clientY - d.sy}px)`;
      clear(); d.target = null;
      const t = root.elementFromPoint(e.clientX, e.clientY)?.closest(".w");
      if (t && t !== el) {
        const r = t.getBoundingClientRect(), wide = r.width > grid.clientWidth * 0.8;
        d.before = wide ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
        d.target = t.dataset.k; t.classList.add(d.before ? "dbef" : "daft");
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      if (d.target) {
        const order = [...root.querySelectorAll(".w")].map((x) => x.dataset.k).filter((k) => k !== d.k);
        const idx = order.indexOf(d.target);
        order.splice(d.before ? idx : idx + 1, 0, d.k);
        this._layout = { ...(this._layout || {}), order };
        this._persistLayout();
      }
      this._drag = null; this._render();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  _resizeStart(ev, el) {
    ev.preventDefault();
    const root = this.shadowRoot, grid = root.querySelector(".grid"), colW = (grid.getBoundingClientRect().width + 12) / 4, left = el.getBoundingClientRect().left, k = el.dataset.k;
    this._drag = { k }; let n = +el.dataset.w;
    const move = (e) => { n = Math.max(1, Math.min(4, Math.round((e.clientX - left) / colW))); el.style.gridColumn = `span ${n}`; el.dataset.w = n; };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      this._layout = { ...(this._layout || {}), widths: { ...(this._layout?.widths || {}), [k]: n } };
      this._persistLayout(); this._drag = null; this._render();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  /** Layout speichern: in der Dashboard-Konfiguration (Administrator, Storage-Modus), sonst nur in diesem Browser */
  async _persistLayout() {
    const lay = this._layout || {}, empty = !(lay.order || []).length && !Object.keys(lay.widths || {}).length;
    const lsKey = "ob_layout:" + hashStr(this._rawBase || "");
    try {
      await this._patchDashboardCard((n) => { if (empty) delete n.layout; else n.layout = JSON.parse(JSON.stringify(lay)); });
      try { localStorage.removeItem(lsKey); } catch (e) { /* ignore */ }
      this._lst = empty ? "Layout zurückgesetzt" : "Layout gespeichert";
    } catch (e) {
      try { if (empty) localStorage.removeItem(lsKey); else localStorage.setItem(lsKey, JSON.stringify(lay)); } catch (e2) { /* ignore */ }
      this._lst = "Nur in diesem Browser gespeichert (" + (e?.message || e?.error?.message || e?.code || "kein Zugriff auf die Dashboard-Konfiguration") + ")";
    }
    this._render();
  }
  /** Ändert diese Karte in der gespeicherten Dashboard-Konfiguration (Lovelace-API) */
  async _patchDashboardCard(mutate) {
    const seg = location.pathname.split("/")[1], url_path = seg === "lovelace" ? null : seg;
    const cfg = await this._hass.callWS({ type: "lovelace/config", url_path });
    let hit = null;
    const walk = (n) => { if (hit || !n || typeof n !== "object") return; if (n.type === "custom:omnibattery-dashboard" && canon(n) === this._rawCanon) { hit = n; return; } Object.values(n).forEach(walk); };
    walk(cfg);
    if (!hit) throw new Error("Karte in der Dashboard-Konfiguration nicht gefunden");
    mutate(hit);
    await this._hass.callWS({ type: "lovelace/config/save", url_path, config: cfg });
    this._rawCanon = canon(hit);
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
      const lw = this._config.widgets.find((x) => (x._ix ?? -1) === wi) || this._config.widgets[wi]; lw.entities = [...list];
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
    let rx = null;
    try { if (w.exclude_match) rx = new RegExp(w.exclude_match, "i"); } catch (e) { /* ungültiges Muster ignorieren */ }
    const matchEx = (id) => rx && (rx.test(id) || rx.test(this._st(id)?.attributes?.friendly_name || ""));
    let rows;
    const info = { total: 0, active: 0, excluded: 0, hidden: 0 };
    if (now) {
      const all = Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("sensor.")).map((id) => ({ id, v: this._pw(id) })).filter((r) => r.v !== null);
      info.total = all.length;
      const act = all.filter((r) => r.v >= 1); info.active = act.length;
      rows = act.filter((r) => !ex.has(r.id) && !matchEx(r.id)); info.excluded = act.length - rows.length;
    } else {
      const st = this._stat?.[this._statKey()] || {}, cand = this._topCandidates();
      info.total = cand.length;
      const act = cand.map((id) => ({ id, v: st[id] ?? null })).filter((r) => r.v !== null && r.v >= 0.01); info.active = act.length;
      rows = act.filter((r) => !ex.has(r.id) && !matchEx(r.id)); info.excluded = act.length - rows.length;
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
    const opts = devs.filter((d) => !d.x._cl).map((d, k) => `<option value="${d.x._ix ?? d.i}">${esc(d.x.name || "Geräte " + (k + 1))}</option>`).join("");
    const bar = (r) => `<div class="tb"><div class="bar"><i style="width:${Math.min(100, r.v / max * 100)}%"></i></div>${
      assigned(r.id) ? `<span class="tag">✓ ${esc(assigned(r.id).x.name || "Geräte")}</span>`
        : devs.length ? `<select class="ta" data-id="${esc(r.id)}"><option value="">＋ zu Gerät …</option>${opts}</select>` : ""}</div>`;
    return `<div class="tt"><button class="tf">${this._showHidden ? "🙈 Ausblenden" : `👁 Ausgeblendete anzeigen (${nHide})`}</button>${nHide ? `<button class="tr">Zurücksetzen</button>` : ""}</div>
      <div class="devs${rows.length > 12 ? " long" : ""}">${rows.map((r, i) => `
      <div class="dev${r.hidden ? " hid" : ""}"><div class="dl"><label title="${esc(r.id)}"><input type="checkbox" class="tk" data-id="${esc(r.id)}" ${r.hidden ? "checked" : ""}> ${i + 1}. ${esc(this._label(w, r.id))}</label><b>${esc(this._fmtW(r.v))}${this._amt(r.v)}</b></div>
      ${bar(r)}</div>`).join("") || `<div class="sub">${this._period !== "now" && this._statErr ? esc(this._statErr) : `Keine Verbraucher gefunden. ${this._topInfo ? `${this._topInfo.total} ${this._period === "now" ? "Leistungssensoren" : "Sensoren mit Statistik"} im System, ${this._topInfo.active} davon aktiv, ${this._topInfo.excluded} als Quelle/„Ignorieren“ ausgeblendet, ${this._topInfo.hidden} per Häkchen ausgeblendet.` : ""}`}</div>`}</div>
      ${rows.length ? `<div class="sub" style="margin-top:6px">Summe ${rows.filter((r) => !r.hidden).length} sichtbar: ${esc(this._fmtW(rows.filter((r) => !r.hidden).reduce((a, r) => a + r.v, 0)))}${w.include_sources ? "" : " · Quellen ausgeblendet"}</div>` : ""}
      <div class="sub" style="margin-top:4px">Häkchen = für den Moment ausblenden (nur in diesem Browser).</div>`;
  }

  /** Datenreihen eines Verlauf-Widgets (Abwärtskompatibel: einzelnes `entity`) */
  _series(w) {
    const l = Array.isArray(w.series) && w.series.length ? w.series : w.entity ? [{ entity: w.entity }] : [];
    return l.filter((x) => x && x.entity).map((x, k) => ({ entity: x.entity, name: x.name, color: x.color || PAL[k % PAL.length], hasColor: !!x.color, mode: x.mode === "stack" ? "stack" : "line", k }));
  }
  /** Helfer zu echten Sensoren mit Vorzeichen auflösen */
  _hflat(id, sign = 1, seen = new Set()) {
    const hp = this._helper(id);
    if (!hp) return [{ id, sign }];
    if (seen.has(id)) return [];
    seen.add(id);
    const out = [];
    for (const c of hp.entities || []) out.push(...this._hflat(c, (hp.signs?.[c] === -1 ? -1 : 1) * sign, seen));
    seen.delete(id);
    return out;
  }
  _histIds(w) { return [...new Set(this._series(w).flatMap((s) => this._hflat(s.entity).map((x) => x.id)))].filter((i) => !String(i).startsWith("virtual:")); }
  _histKey(wi, w) { return wi + "|" + (w.hours || 24) + "|" + this._histIds(w).sort().join(","); }
  /** Zeitreihe [[t, wert]] einer Datenreihe (Leistung wird in W umgerechnet, Helfer aus ihren Sensoren zusammengesetzt) */
  _seriesPts(w, wi, s) {
    const data = this._hist[this._histKey(wi, w)]; if (!data) return [];
    const comps = this._hflat(s.entity).filter((x) => data[x.id]);
    const conv = (id) => { const u = this._st(id)?.attributes?.unit_of_measurement; return u === "kW" ? 1000 : u === "MW" ? 1e6 : 1; };
    if (comps.length === 1) return data[comps[0].id].map((p) => [p[0], p[1] * conv(comps[0].id) * comps[0].sign]);
    const times = [...new Set(comps.flatMap((c) => data[c.id].map((p) => p[0])))].sort((a, b) => a - b);
    const idx = comps.map(() => -1), out = [];
    for (const t of times) {
      let sum = 0;
      comps.forEach((c, j) => {
        const arr = data[c.id];
        while (idx[j] + 1 < arr.length && arr[idx[j] + 1][0] <= t) idx[j]++;
        if (idx[j] >= 0) sum += arr[idx[j]][1] * conv(c.id) * c.sign;
      });
      out.push([t, sum]);
    }
    return out;
  }
  _seriesName(w, s) { return s.name || this._helper(s.entity)?.name || this._label(w, s.entity); }

  _history(w) {
    const ser = this._series(w), wi = (this._config.widgets || []).indexOf(w);
    if (!ser.length) return `<div class="sub">Datenreihen im Editor hinzufügen.</div>`;
    if (!this._hist[this._histKey(wi, w)]) return `<div class="sub">Lade Verlauf …</div>`;
    return `<div class="chart" data-wi="${wi}"></div>
      <div class="leg">${ser.map((s) => `<span><i class="sw" style="background:${s.color}"></i>${esc(this._seriesName(w, s))}${s.mode === "stack" ? " ▤" : ""}</span>`).join("")}</div>
      <div class="sub">Maus über das Diagramm zeigt Zeit und Werte${ser.some((s) => s.mode === "stack") ? " · ▤ = gestapelt (addierend)" : ""}</div>`;
  }

  /** Zeichnet das Diagramm mit Achsen, Nulllinie, gestapelten Flächen, Linien und Hover-Anzeige in der tatsächlichen Pixelbreite */
  _drawCharts() {
    this.shadowRoot.querySelectorAll(".chart").forEach((el) => {
      const wi = +el.dataset.wi, w = (this._config.widgets || [])[wi]; if (!w) return;
      const ser = this._series(w).map((s) => ({ ...s, pts: this._seriesPts(w, wi, s) })).filter((s) => s.pts.length);
      if (!ser.length) return;
      const first = this._hflat(ser[0].entity)[0]?.id, ou = this._st(first)?.attributes?.unit_of_measurement || "";
      const unit = ["W", "kW", "MW"].includes(ou) ? "W" : ou;
      const W = Math.max(240, el.clientWidth || 300), H = 200, L = 52, R = 8, T = 10, B = 26, PW = W - L - R, PH = H - T - B;
      const t1 = Date.now(), t0 = t1 - (w.hours || 24) * 3600e3;
      // Wert zum Zeitpunkt t (Stufenfunktion)
      const at = (pts, t) => { let a = 0, b = pts.length - 1; if (t < pts[0][0]) return pts[0][1]; while (b - a > 1) { const m = (a + b) >> 1; if (pts[m][0] <= t) a = m; else b = m; } return pts[b][0] <= t ? pts[b][1] : pts[a][1]; };
      const stacked = ser.filter((s) => s.mode === "stack"), lines = ser.filter((s) => s.mode !== "stack");
      // gemeinsame Zeitachse der gestapelten Reihen
      const ts = [...new Set([t0, t1, ...stacked.flatMap((s) => s.pts.map((p) => p[0]).filter((t) => t >= t0 && t <= t1))])].sort((a, b) => a - b);
      const layers = []; let cumP = ts.map(() => 0), cumN = ts.map(() => 0);
      for (const s of stacked) {
        const v = ts.map((t) => at(s.pts, t)), loP = cumP, loN = cumN;
        cumP = cumP.map((c, i) => c + Math.max(v[i], 0)); cumN = cumN.map((c, i) => c + Math.min(v[i], 0));
        layers.push({ s, loP, hiP: cumP, loN, hiN: cumN });
      }
      let lo = 0, hi = 0;
      for (const v of cumN) if (v < lo) lo = v;
      for (const v of cumP) if (v > hi) hi = v;
      for (const s of lines) for (const p of s.pts) if (p[0] >= t0) { if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; }
      if (lo === hi) hi = lo + 1;
      const raw = (hi - lo) / 4, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw);
      lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
      const kw = unit === "W" && Math.max(Math.abs(lo), Math.abs(hi)) >= 2000;
      const tick = (v) => (kw ? (v / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " kW" : v.toLocaleString("de-DE", { maximumFractionDigits: 2 }) + (unit ? " " + unit : ""));
      const X = (t) => L + ((t - t0) / (t1 - t0)) * PW, Y = (v) => T + (1 - (v - lo) / (hi - lo)) * PH, Y0 = Y(0);
      const f1 = (n) => n.toFixed(1);
      // Stufenlinie: Wert bleibt bis zum nächsten Punkt
      const stepPts = (xs, ys) => { const o = []; xs.forEach((x, i) => { if (i) o.push([x, ys[i - 1]]); o.push([x, ys[i]]); }); return o; };
      const poly = (top, bot) => [...top, ...bot.slice().reverse()].map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(" ");
      let grid = "";
      for (let v = lo; v <= hi + step / 1000; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="var(--divider-color)"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--secondary-text-color)">${esc(tick(v))}</text>`;
      const span = t1 - t0, steps = [3600e3, 2 * 3600e3, 3 * 3600e3, 6 * 3600e3, 12 * 3600e3, 24 * 3600e3, 2 * 24 * 3600e3, 7 * 24 * 3600e3], ti = steps.find((x) => span / x <= 7) || steps[steps.length - 1];
      const dt = new Date(t0); dt.setMinutes(0, 0, 0); if (ti >= 24 * 3600e3) dt.setHours(0);
      let xt = "", tt = dt.getTime(); while (tt < t0) tt += ti;
      for (; tt <= t1; tt += ti) {
        const dd = new Date(tt), lab = ti >= 24 * 3600e3 || (dd.getHours() === 0 && span > 24 * 3600e3) ? dd.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : dd.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        xt += `<line x1="${f1(X(tt))}" x2="${f1(X(tt))}" y1="${T}" y2="${T + PH}" stroke="var(--divider-color)" stroke-dasharray="2 3"/><text x="${f1(X(tt))}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--secondary-text-color)">${lab}</text>`;
      }
      let body = "";
      for (const l of layers) {
        const c = l.s.color;
        body += `<polygon points="${poly(stepPts(ts, l.hiP), stepPts(ts, l.loP))}" fill="${c}" opacity=".5"/><polygon points="${poly(stepPts(ts, l.hiN), stepPts(ts, l.loN))}" fill="${c}" opacity=".5"/>`;
        body += `<polyline points="${stepPts(ts, l.hiP).map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(" ")}" fill="none" stroke="${c}" stroke-width="1.2"/>`;
      }
      const legacy = ser.length === 1 && !ser[0].hasColor && ser[0].mode !== "stack";
      for (const s of lines) {
        const pts = s.pts.filter((p) => p[0] > t0);
        const xs = [t0, ...pts.map((p) => p[0]), t1], ys = [at(s.pts, t0), ...pts.map((p) => p[1]), pts.length ? pts[pts.length - 1][1] : at(s.pts, t0)];
        const sp = stepPts(xs, ys), line = sp.map((p) => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(" ");
        if (legacy) {
          const area = `${f1(X(t0))},${f1(Y0)} ${line} ${f1(X(t1))},${f1(Y0)}`;
          body += `<clipPath id="cu${wi}"><rect x="${L}" y="${T}" width="${PW}" height="${Math.max(0, Y0 - T).toFixed(1)}"/></clipPath><clipPath id="cd${wi}"><rect x="${L}" y="${f1(Y0)}" width="${PW}" height="${Math.max(0, T + PH - Y0).toFixed(1)}"/></clipPath>
            <polygon points="${area}" fill="var(--primary-color)" opacity=".28" clip-path="url(#cu${wi})"/><polygon points="${area}" fill="#e8833a" opacity=".28" clip-path="url(#cd${wi})"/>
            <polyline points="${line}" fill="none" stroke="var(--primary-color)" stroke-width="1.6" clip-path="url(#cu${wi})"/><polyline points="${line}" fill="none" stroke="#e8833a" stroke-width="1.6" clip-path="url(#cd${wi})"/>`;
        } else body += `<polyline points="${line}" fill="none" stroke="${s.color}" stroke-width="1.8"/>`;
      }
      el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="touch-action:pan-y;display:block">
        ${grid}${xt}${body}
        <line x1="${L}" x2="${W - R}" y1="${f1(Y0)}" y2="${f1(Y0)}" stroke="var(--primary-text-color)" stroke-width="1.5"/>
        <line class="cx" y1="${T}" y2="${T + PH}" stroke="var(--primary-text-color)" stroke-width="1" opacity=".6" style="display:none"/>
        <rect class="ov" x="${L}" y="${T}" width="${PW}" height="${PH}" fill="transparent"/></svg><div class="tip" style="display:none"></div>`;
      const svg = el.querySelector("svg"), cx = el.querySelector(".cx"), tip = el.querySelector(".tip");
      const val = (v) => v.toLocaleString("de-DE", { maximumFractionDigits: unit === "W" ? 0 : 2 }) + (unit ? " " + unit : "");
      const leave = () => { cx.style.display = "none"; tip.style.display = "none"; };
      const move = (ev) => {
        const r = svg.getBoundingClientRect(), x = ev.clientX - r.left;
        if (x < L || x > W - R) { leave(); return; }
        const t = t0 + ((x - L) / PW) * (t1 - t0), px = X(t);
        cx.style.display = ""; cx.setAttribute("x1", px); cx.setAttribute("x2", px);
        const when = new Date(t);
        let rows = ser.map((s) => `<div><i class="sw" style="background:${s.color}"></i>${esc(this._seriesName(w, s))}: <b>${esc(val(at(s.pts, t)))}</b></div>`).join("");
        if (stacked.length > 1) rows += `<div style="border-top:1px solid var(--divider-color);margin-top:3px;padding-top:3px">Σ gestapelt: <b>${esc(val(stacked.reduce((a, s) => a + at(s.pts, t), 0)))}</b></div>`;
        tip.innerHTML = `<div style="opacity:.7">${esc(when.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }))} ${esc(when.toLocaleTimeString("de-DE"))}</div>${rows}`;
        tip.style.display = "";
        const tw = tip.offsetWidth; tip.style.left = Math.min(W - tw - 2, Math.max(2, px + 10)) + "px"; tip.style.top = "8px";
      };
      svg.addEventListener("pointermove", move); svg.addEventListener("pointerdown", move); svg.addEventListener("pointerleave", leave);
    });
  }

  async _loadHistory() {
    const ws = this._config?.widgets || [];
    for (let wi = 0; wi < ws.length; wi++) {
      const w = ws[wi]; if (w.type !== "history") continue;
      const ids = this._histIds(w); if (!ids.length) continue;
      const key = this._histKey(wi, w), last = this._histTs?.[key] || 0;
      if (Date.now() - last < 300000) continue;
      (this._histTs ||= {})[key] = Date.now();
      try {
        const start = new Date(Date.now() - (w.hours || 24) * 3600e3).toISOString();
        const res = await this._hass.callApi("GET", `history/period/${start}?filter_entity_id=${ids.join(",")}&minimal_response&no_attributes`);
        const out = {};
        (res || []).forEach((arr, j) => {
          const id = arr?.[0]?.entity_id || ids[j];
          out[id] = arr.map((x) => [new Date(x.last_changed || x.last_updated).getTime(), parseFloat(x.state)]).filter((p) => !isNaN(p[1]));
        });
        ids.forEach((id) => { out[id] ||= []; });
        this._hist[key] = out;
        this._render();
      } catch (e) { /* ignore */ }
    }
  }

  /** Zeitraum „Zeitraum“ (frei wählbar): Von/Bis als Datum JJJJ-MM-TT, gespeichert im Browser */
  _rng() {
    if (!this._range) {
      try { this._range = JSON.parse(localStorage.getItem("ob_range") || "null"); } catch (e) { this._range = null; }
      if (!this._range?.from) { const t = this._iso(new Date()); this._range = { from: t, to: t }; }
    }
    return this._range;
  }
  _iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  _pd(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
  _statKey() { if (this._period !== "range") return this._period; const r = this._rng(); return "range:" + r.from + ":" + r.to; }
  _setRange(from, to) {
    if (!from) from = this._rng().from;
    if (!to || to < from) to = from;
    this._range = { from, to };
    try { localStorage.setItem("ob_range", JSON.stringify(this._range)); } catch (e) { /* ignore */ }
    this._sig = ""; this._loadStats(true); this._render();
  }
  _shiftRange(dir) {
    const r = this._rng(), a = this._pd(r.from), b = this._pd(r.to), n = Math.round((b - a) / 864e5) + 1;
    a.setDate(a.getDate() + dir * n); b.setDate(b.getDate() + dir * n);
    this._setRange(this._iso(a), this._iso(b));
  }
  _periodEnd() {
    if (this._period !== "range") return new Date();
    const e = this._pd(this._rng().to); e.setDate(e.getDate() + 1);
    return e > new Date() ? new Date() : e;
  }
  _periodStart() {
    const n = new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate();
    switch (this._period) {
      case "range": return this._pd(this._rng().from);
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
    const p = this._statKey();
    if (this._period === "now" || !this._hass || this._statBusy) return;
    this._stat ||= {}; this._statTs ||= {};
    if (!force && this._statTs[p] && Date.now() - this._statTs[p] < (p === "day" || this._period === "range" ? 60000 : 300000)) return;
    const ids = new Set();
    for (const w of this._config.widgets || [])
      for (const k of ["power", "solar", "grid", "grid_export", "battery", "home", "entities", "breakdown", "k4", "k6"]) this._use(w[k]).forEach((i) => ids.add(i));
    for (const w of this._config.widgets || []) this._ids(w.deduct).forEach((i) => ids.add(i));
    for (const w of this._config.widgets || []) { for (const it of w.detail || []) this._use(it.id).forEach((i) => ids.add(i)); this._use(w.detail_total).forEach((i) => ids.add(i)); }
    for (const w of this._config.widgets || []) for (const g of w.groups || []) [g.id, ...(g.parts || []).map((p) => p.id)].forEach((x) => this._use(x).forEach((i) => ids.add(i)));
    for (const w of this._config.widgets || []) for (const u of w.units || []) for (const k of ["charge", "discharge"]) this._use(u[k]).forEach((i) => ids.add(i));
    for (const w of this._config.widgets || []) this._ids(w.entities).forEach((i) => ids.add(i));
    const essential = new Set(ids);
    if ((this._config.widgets || []).some((w) => w.type === "top")) this._topCandidates().forEach((i) => ids.add(i));
    const expand = (id, seen = new Set()) => {  // Helfer (auch verschachtelt) durch ihre Sensoren ersetzen
      const hp = this._helper(id); if (!hp || seen.has(id)) return;
      seen.add(id);
      const comps = hp.entities || [];
      this._use(comps.filter((x) => !String(x).startsWith("virtual:"))).forEach((i) => ids.add(i));
      comps.filter((x) => String(x).startsWith(HELP_PREFIX)).forEach((x) => expand(x, seen));
    };
    for (const id of [...ids]) if (this._helper(id)) { ids.delete(id); expand(id); }
    ids.delete(VIRT); ids.delete(VIRT_LOSS); ids.delete(WB);
    if (!ids.size) return;
    this._statBusy = true; this._loading = !this._stat[p]; if (this._loading) this._render();
    const T = (v) => (typeof v === "number" ? v : Date.parse(v));
    try {
      const now = Date.now();
      // in Blöcken abfragen (hunderte Sensoren auf einmal können Zeitüberschreitungen verursachen)
      const all = [...ids], chunks = [];
      for (let i = 0; i < all.length; i += 100) chunks.push(all.slice(i, i + 100));
      const parts = await Promise.allSettled(chunks.map((c) => this._hass.callWS({
        type: "recorder/statistics_during_period", start_time: this._periodStart().toISOString(), end_time: this._periodEnd().toISOString(),
        statistic_ids: c, period: this._period === "range" ? ((this._periodEnd() - this._periodStart()) / 864e5 <= 3 ? "5minute" : (this._periodEnd() - this._periodStart()) / 864e5 <= 14 ? "hour" : "day") : { day: "5minute", week: "hour", month: "day", year: "day" }[p], types: ["mean", "change"],
      })));
      const res = Object.assign({}, ...parts.filter((x) => x.status === "fulfilled").map((x) => x.value || {}));
      const bad = parts.find((x) => x.status === "rejected");
      this._statErr = bad ? "Statistik-Fehler: " + (bad.reason?.message || JSON.stringify(bad.reason)) : "";
      if (bad && parts.every((x) => x.status === "rejected")) throw bad.reason;
      const out = {}, missing = [], glitch = [], maxKw = Number(this._config.max_kw) || 100;
      for (const id of ids) {
        const rows = res?.[id] || [], unit = this._st(id)?.attributes?.unit_of_measurement;
        if (!rows.length) { out[id] = null; if (essential.has(id)) missing.push(id); continue; }
        // Plausibilitätsgrenze: Sprünge in Zählern (z. B. 4.294.967.296 = 32-Bit-Überlauf) oder Mittelwerte über maxKw gelten als Messfehler und werden ignoriert
        let tot = 0, bad = 0;
        const hrs = (r) => Math.max(1 / 3600, (Math.min(T(r.end), now) - T(r.start)) / 3.6e6);
        if (this._isEnergy(id)) {
          const f = unit === "Wh" ? 0.001 : unit === "MWh" ? 1000 : 1;
          for (const r of rows) { const d = (r.change || 0) * f; if (d < 0 || d > maxKw * hrs(r)) { bad++; continue; } tot += d; }
        } else {
          const f = unit === "kW" ? 1 : unit === "MW" ? 1000 : 0.001;
          for (const r of rows) { if (r.mean == null) continue; const kw = r.mean * f; if (Math.abs(kw) > maxKw) { bad++; continue; } tot += kw * hrs(r); }
        }
        out[id] = tot;
        if (bad) glitch.push(id);
      }
      this._stat[p] = out; this._statTs[p] = now; this._statMissing = missing; this._statGlitch = glitch;
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
    if (this._drag) { this._pendingRender = true; return; }
    this._mixC = undefined;  // während des Ziehens nicht neu zeichnen
    const lm = !!this._layoutMode, lay = this._layout || {}, ord = lay.order || [];
    const items = (this._config.widgets || []).map((w, i) => ({ w, i, k: w._k || "w" + i }));
    items.sort((a, b) => { const ia = ord.indexOf(a.k), ib = ord.indexOf(b.k); return (ia < 0 ? 1e6 + a.i : ia) - (ib < 0 ? 1e6 + b.i : ib); });
    const body = items.map(({ w, k }) => {
      const fn = this["_" + w.type];
      const title = w.name || w.title || (w.entity ? this._name(w.entity) : WIDGET_TYPES[w.type]?.short || "");
      const span = Math.min(4, Math.max(1, lay.widths?.[k] ?? w.width ?? 1));
      return `<section class="w${lm ? " lm" : ""}" data-k="${esc(k)}" data-w="${span}" style="grid-column: span ${span}">${lm ? `<span class="hdl" title="Verschieben">⠿</span><span class="rsz" title="Breite ändern">⇔</span>` : ""}
        <h3>${esc(title)}</h3>${fn ? fn.call(this, w) : `<div class="sub">Unbekannter Typ: ${esc(w.type)}</div>`}</section>`;
    }).join("");
    const seg = this._config.show_periods === false ? "" : `<div class="seg">${Object.entries(PERIODS).map(([k, v]) =>
      `<button data-p="${k}" class="${k === this._period ? "on" : ""}">${v}</button>`).join("")}</div>
      ${this._period === "range" ? (() => { const r = this._rng(), t = this._iso(new Date()); return `<div class="seg rng"><button id="rprev" title="Zeitraum zurück">‹</button><input type="date" id="rfrom" value="${r.from}" max="${t}"><span>bis</span><input type="date" id="rto" value="${r.to}" max="${t}"><button id="rnext" title="Zeitraum vor">›</button><button id="rday" title="Nur ein Tag">1 Tag</button></div>`; })() : ""}
      ${this._period !== "now" && this._statGlitch?.length ? `<div class="sub warn">Unplausible Statistikwerte (über ${Number(this._config.max_kw) || 100} kW) ignoriert bei: ${esc(this._statGlitch.slice(0, 4).map((i) => this._label({}, i)).join(", "))}${this._statGlitch.length > 4 ? ` … (+${this._statGlitch.length - 4})` : ""}</div>` : ""}
      ${this._period !== "now" && this._statMissing?.length ? `<div class="sub warn">Keine Langzeitstatistik für: ${esc(this._statMissing.map((i) => this._label({}, i)).join(", "))} (Sensor braucht eine state_class)</div>` : ""}`;
    const keep = this._keepScroll();
    this.shadowRoot.innerHTML = `<style>
      :host{display:block}
      .seg{display:flex;justify-content:center;gap:4px;flex-wrap:wrap;margin:0 0 12px}
      .seg button{padding:6px 14px;border-radius:16px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer;font:inherit}
      .seg input[type=date]{padding:5px 8px;border-radius:10px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);font:inherit}
      .seg.rng{align-items:center;margin-top:-6px}
      .seg button.on{background:var(--primary-color);color:var(--text-primary-color,#fff);border-color:var(--primary-color)}
      .warn{text-align:center;margin:-4px 0 10px;color:var(--warning-color,#e8833a)}
      ha-card{padding:16px}
      .title{font-size:1.3em;font-weight:600;margin-bottom:12px}
      .wrap{container-type:inline-size}
      .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      @container (max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.w[data-w="3"],.w[data-w="4"]{grid-column:span 2!important}}
      @container (max-width:560px){.grid{grid-template-columns:minmax(0,1fr)}.w{grid-column:span 1!important}}
      .lbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px;padding:8px 12px;border:1px dashed var(--primary-color);border-radius:10px;font-size:.85em}
      .lbar button,#lay{padding:4px 10px;border-radius:14px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer;font:inherit;font-size:.9em}
      #lay.on{background:var(--primary-color);color:var(--text-primary-color,#fff)}
      .w.lm{position:relative;outline:2px dashed var(--divider-color);outline-offset:-2px}
      .hdl,.rsz{position:absolute;z-index:3;background:var(--card-background-color);border-radius:6px;padding:2px 8px;user-select:none;touch-action:none;box-shadow:0 1px 4px rgba(0,0,0,.25)}
      .hdl{top:6px;right:8px;cursor:grab;font-size:1.3em}.rsz{right:8px;bottom:8px;cursor:ew-resize}
      @container (max-width:900px){.rsz{display:none}}
      .w.drag{opacity:.75;z-index:10;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none}
      .w.dbef{box-shadow:inset 6px 0 0 var(--primary-color)}.w.daft{box-shadow:inset -6px 0 0 var(--primary-color)}
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
      .leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.85em;margin:6px 0 2px}.leg span{display:inline-flex;align-items:center;gap:5px}
      .sw{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px}.leg .sw{margin-right:0}
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
      ${lm ? `<div class="lbar"><span>✥ Layout bearbeiten: Widgets am <b>⠿</b> ziehen, Breite am <b>⇔</b> ändern.</span><button id="ldone">Fertig</button><button id="lreset">Zurücksetzen</button><span class="sub">${esc(this._lst || "")}</span></div>` : ""}
      <div class="grid">${body || '<div class="sub">Noch keine Widgets – Karte bearbeiten und Widgets hinzufügen.</div>'}</div>
      ${this._config.show_update === false && this._config.show_layout === false ? "" : `<div class="upd">${this._config.show_update === false ? "" : `<span>OmniBattery v${OB_VERSION}</span><button id="upd">⟳ Update</button><span>${esc(this._ust || this._pollErr || "")}</span>${Number(this._config.poll_s) >= 5 ? `<span>⟳ Live-Abfrage alle ${Number(this._config.poll_s)} s</span>` : ""}`}${this._config.show_layout === false ? "" : `<button id="lay" class="${lm ? "on" : ""}">✥ Layout${lm ? " beenden" : ""}</button>`}</div>`}
      </div></ha-card>`;
    this.shadowRoot.getElementById("upd")?.addEventListener("click", () => this._update());
    this.shadowRoot.getElementById("lay")?.addEventListener("click", () => { this._layoutMode = !this._layoutMode; this._lst = ""; this._render(); });
    this._bindLayout();
    const R = (sel, ev, fn) => this.shadowRoot.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, () => fn(el)));
    R(".tk", "change", (cb) => this._toggleHide(cb.dataset.id, cb.checked));
    R(".ta", "change", (sel) => { if (sel.value !== "") this._assign(sel.dataset.id, +sel.value); });
    R(".ta", "blur", () => { if (this._pendingRender) { this._pendingRender = false; this._sig = ""; this._render(); } });
    R(".tf", "click", () => { this._showHidden = !this._showHidden; this._topCache = {}; this._sig = ""; this._render(); });
    R(".tr", "click", () => { this._hideSet().clear(); this._saveHide(); this._topCache = {}; this._sig = ""; this._render(); });
    const sr = this.shadowRoot;
    sr.getElementById("rfrom")?.addEventListener("change", (e) => this._setRange(e.target.value, this._rng().to));
    sr.getElementById("rto")?.addEventListener("change", (e) => this._setRange(this._rng().from, e.target.value));
    sr.getElementById("rprev")?.addEventListener("click", () => this._shiftRange(-1));
    sr.getElementById("rnext")?.addEventListener("click", () => this._shiftRange(1));
    sr.getElementById("rday")?.addEventListener("click", () => this._setRange(this._rng().from, this._rng().from));
    R("[data-tg]", "click", (el) => { const k = el.dataset.tg; (this._openTg ||= {})[k] = !this._openTg[k]; this._render(); });
    R(".pi", "change", (inp) => { let ov = {}; try { ov = JSON.parse(localStorage.getItem("ob_prices") || "{}"); } catch (e) { ov = {}; } ov[inp.dataset.k] = Math.max(0, parseFloat(inp.value) || 0); try { localStorage.setItem("ob_prices", JSON.stringify(ov)); } catch (e) { /* ignore */ } this._render(); });
    R(".pd", "toggle", (d) => { this._piOpen = d.open; });
    R(".zt", "change", (cb) => { this._showZero = cb.checked; this._render(); });
    R(".wbu", "click", () => sr.querySelector(".wbf").click());
    R(".wbf", "change", (inp) => { const f = inp.files?.[0]; if (f) this._wbUpload(f); });
    this.shadowRoot.querySelectorAll(".seg button[data-p]").forEach((b) => b.addEventListener("click", () => this._setPeriod(b.dataset.p)));
    this._drawCharts();
    keep();
  }
  /** Wallbox-Ladevorgänge: hochgeladene Daten (Dashboard-Konfiguration oder Browser) ergänzen die eingebauten, gleiche Startzeit = überschrieben */
  _wbData() {
    let up = this._config?.wallbox_data;
    if (!Array.isArray(up)) { try { up = JSON.parse(localStorage.getItem("ob_wallbox") || "null"); } catch (e) { up = null; } }
    if (this._wbKey === up && this._wbMerged) return this._wbMerged;
    const m = new Map(WALLBOX_DATA.map((r) => [r[0], r]));
    (Array.isArray(up) ? up : []).forEach((r) => { if (Array.isArray(r) && r.length >= 3) m.set(r[0], r); });
    this._wbKey = up; return (this._wbMerged = [...m.values()].sort((a, b) => a[0] - b[0]));
  }
  /** TSV/CSV aus dem Sonnen-Portal (Start, Ende, Wh, …) einlesen */
  _wbParse(txt) {
    const out = [];
    for (const line of String(txt).replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const c = line.split(/\t|;|,(?=\d{4}-)|,(?!\d)/).map((x) => x.trim());
      if (c.length < 3) continue;
      const a = Date.parse(c[0]), b = Date.parse(c[1]), wh = parseFloat(String(c[2]).replace(",", "."));
      if (isNaN(a) || isNaN(b) || isNaN(wh)) continue;
      out.push([Math.round(a / 1000), Math.round(b / 1000), Math.round(wh)]);
    }
    return out;
  }
  async _wbUpload(file) {
    const st = (t) => { this._wbMsg = t; this._render(); };
    try {
      const rows = this._wbParse(await file.text());
      if (!rows.length) return st("Keine Ladevorgänge erkannt – erwartet: Start, Ende, Energie in Wh (Tab-getrennt, wie vom Sonnen-Portal).");
      const m = new Map((this._config.wallbox_data || []).map((r) => [r[0], r]));
      rows.forEach((r) => m.set(r[0], r));
      const all = [...m.values()].sort((a, b) => a[0] - b[0]);
      let where = "in der Dashboard-Konfiguration (für alle Geräte)";
      try { await this._patchDashboardCard((n) => { n.wallbox_data = all; }); try { localStorage.removeItem("ob_wallbox"); } catch (e) { /* ignore */ } }
      catch (e) { where = "nur in diesem Browser (" + (e?.message || e?.code || "kein Zugriff auf die Dashboard-Konfiguration") + ")"; try { localStorage.setItem("ob_wallbox", JSON.stringify(all)); } catch (e2) { /* ignore */ } }
      this._config = { ...this._config, wallbox_data: all }; this._wbKey = null; this._sig = "";
      st(`${rows.length} Ladevorgänge eingelesen, gespeichert ${where}.`);
    } catch (e) { st("Datei konnte nicht gelesen werden: " + (e?.message || e)); }
  }
  /** Wallbox-Energie (kWh) im gewählten Zeitraum: jeder Ladevorgang wird anteilig nach Zeit auf den Zeitraum verteilt */
  _wallbox() {
    const a = this._periodStart().getTime(), b = this._periodEnd().getTime();
    let wh = 0;
    for (const [s, e, w] of this._wbData()) {
      const s0 = s * 1000, e0 = e * 1000;
      if (e0 <= s0) { if (s0 >= a && s0 < b) wh += w; continue; }
      const ov = Math.min(e0, b) - Math.max(s0, a);
      if (ov > 0) wh += w * ov / (e0 - s0);
    }
    return wh / 1000;
  }
  /** Scrollposition (Seite und scrollbare Container) beim Neuzeichnen halten: Höhe vorübergehend festhalten, danach Position wiederherstellen */
  _keepScroll() {
    const saved = [];
    for (let n = this; n; n = n.parentNode ? (n.parentNode.host || n.parentNode) : null) {
      if (n.nodeType === 1 && n.scrollTop > 0) saved.push([n, n.scrollTop]);
    }
    if (window.scrollY > 0) saved.push([window, window.scrollY]);
    const inner = [...(this.shadowRoot?.querySelectorAll(".dev,.scroll,.list,[class*=scroll]") || [])].filter((e) => e.scrollTop > 0).map((e) => [e.className, e.scrollTop]);
    const h = this.offsetHeight;
    if (h) this.style.minHeight = h + "px";
    return () => {
      const restore = () => {
        saved.forEach(([n, t]) => { if (n === window) window.scrollTo(window.scrollX, t); else n.scrollTop = t; });
        inner.forEach(([c, t]) => { const e = this.shadowRoot.querySelector("." + String(c).trim().split(/\s+/).join(".")); if (e) e.scrollTop = t; });
      };
      restore();
      requestAnimationFrame(restore);
      clearTimeout(this._mh);
      clearTimeout(this._mr); this._mr = setTimeout(restore, 300);
      this._mh = setTimeout(() => { this.style.minHeight = ""; restore(); }, 1500);
    };
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
      .p [hidden]{display:none!important}.p .exp{margin:0 0 8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.p .exp .exs{font-size:.85em;color:var(--secondary-text-color)}
      .p .all{display:block;font-size:.85em;margin:0 0 6px}.p .all input{width:auto;margin:0 6px 0 0}
      .p .ph{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
      .p .cl{cursor:pointer;padding:2px 8px;font-size:1.2em;border-radius:6px}.p .cl:hover{background:var(--secondary-background-color)}
      .p .sel{flex-wrap:wrap}.p .sg{flex:1 1 100%;font-size:.85em}.p .sg input{width:auto;margin-right:6px}.p .sg select{width:auto;margin:0 0 0 6px;padding:4px 8px}
      .p .sel input.nm{flex:1 1 100%;box-sizing:border-box;font-size:.85em}
      .p .it{display:flex;justify-content:space-between;gap:8px;padding:8px 6px;border-bottom:1px solid var(--divider-color);cursor:pointer}
      .p .it:hover{background:var(--secondary-background-color)}
      .p .it .n{min-width:0}.p .it small{display:block;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis}
      .p .it .v{white-space:nowrap;font-weight:600}
    </style><div class="p"><div class="lb"></div><div class="head"></div><div class="panel" hidden>
      <div class="ph"><b>Sensor auswählen</b><span class="cl" title="Schließen">✕</span></div>
      <label class="all"><input type="checkbox" class="allcb"> Alle Sensoren anzeigen (Filter aus)</label>
      <label class="all mw">Nur Sensoren, die gerade mindestens <input type="number" class="minw" min="0" step="1" placeholder="z. B. 10" style="width:90px;display:inline-block;margin:0 4px"> W verbrauchen</label>
      <div class="exp"><button class="ex-csv" title="Alle aktuell aufgelisteten Sensoren mit Beschreibung und Zustand">⬇ Liste als CSV</button> <button class="ex-json">⬇ als JSON</button> <span class="exs"></span></div>
      <select class="dev"></select><input class="q" placeholder="Durchsuchen …"><div class="list"></div></div></div>`;
    const [lt, lh] = String(this._opts?.label || "").split(" — ");
    this.querySelector(".lb").innerHTML = `<b>${esc(lt)}</b>${lh ? `<small>${esc(lh)}</small>` : ""}`;
    this.querySelector(".cl").addEventListener("click", () => this._toggle(false));
    this.querySelector(".ex-csv").addEventListener("click", () => this._export("csv"));
    this.querySelector(".ex-json").addEventListener("click", () => this._export("json"));
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
    this.querySelector(".head").addEventListener("change", (e) => {
      const id = e.target.dataset?.op; if (!id) return;
      this._signs ||= {};
      if (e.target.value === "-1") this._signs[id] = -1; else delete this._signs[id];
      this.dispatchEvent(new CustomEvent("signed", { detail: { id, neg: e.target.value === "-1" } }));
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
    if (id === VIRT || id === VIRT_LOSS || String(id).startsWith(HELP_PREFIX)) return "berechnet";
    const st = this._hass?.states?.[id]; if (!st) return "n/a";
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(st); } catch (e) { /* fallback */ }
    return `${st.state} ${st.attributes.unit_of_measurement || ""}`.trim();
  }
  _devName(id) {
    if (id === VIRT || id === VIRT_LOSS) return "Virtuell";
    if (String(id).startsWith(HELP_PREFIX)) return "Helfer";
    const did = this._hass?.entities?.[id]?.device_id;
    const d = did && this._hass.devices?.[did];
    return d ? d.name_by_user || d.name || did : "";
  }
  _entName(id) {
    if (id === VIRT) return VIRT_NAME;
    if (id === VIRT_LOSS) return VIRT_LOSS_NAME;
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
    if (this._opts?.virtual && this._minW == null) list.unshift(VIRT, VIRT_LOSS);
    if (this._opts?.getHelpers && this._minW == null) list.unshift(...this._opts.getHelpers().map((x) => x.id));
    return list.filter((id) => {
      if (id === VIRT || id === VIRT_LOSS || id.startsWith(HELP_PREFIX)) return true;
      if (o.domain && !id.startsWith(o.domain + ".")) return false;
      const a = st[id].attributes;
      if (this._minW != null) { const w = this._wattsOf(id); if (w === null || w < this._minW) return false; }
      if (o.classes && !o.classes.includes(a.device_class) && !(o.units && o.units.includes(a.unit_of_measurement))) return false;
      return true;
    });
  }

  /** Exportiert alle aktuell aufgelisteten Sensoren mit Beschreibung, Einheit, Zustand und Statistik-Info als Datei */
  async _export(fmt) {
    const out = this.querySelector(".exs"), h = this._hass;
    out.textContent = "Erstelle Datei …";
    let stat = {};
    try { (await h.callWS({ type: "recorder/list_statistic_ids" })).forEach((x) => (stat[x.statistic_id] = x)); } catch (e) { /* Statistik optional */ }
    const now = Date.now();
    const ids = this._candidates().filter((id) => h.states[id]);
    const rows = ids.map((id) => {
      const st = h.states[id], a = st.attributes || {}, reg = h.entities?.[id] || {}, dev = reg.device_id ? h.devices?.[reg.device_id] : null;
      const bad = ["unknown", "unavailable", "", "none"].includes(String(st.state).toLowerCase());
      const sx = stat[id];
      return {
        entity_id: id, name: a.friendly_name || "", domain: id.split(".")[0], device: dev ? dev.name_by_user || dev.name || "" : "",
        manufacturer: dev?.manufacturer || "", model: dev?.model || "", integration: reg.platform || "",
        device_class: a.device_class || "", state_class: a.state_class || "", unit: a.unit_of_measurement || "",
        state: st.state, numeric: !isNaN(parseFloat(st.state)), delivers_value: !bad,
        last_updated: st.last_updated || "", age_seconds: st.last_updated ? Math.round((now - Date.parse(st.last_updated)) / 1000) : "",
        statistics: sx ? [sx.has_mean ? "mean" : "", sx.has_sum ? "sum" : ""].filter(Boolean).join("+") : "",
      };
    });
    let text, type, ext;
    if (fmt === "json") { text = JSON.stringify({ exported: new Date().toISOString(), count: rows.length, sensors: rows }, null, 1); type = "application/json"; ext = "json"; }
    else {
      const cols = Object.keys(rows[0] || { entity_id: 1 }), q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      text = "\ufeff" + [cols.join(";"), ...rows.map((r) => cols.map((c) => q(r[c])).join(";"))].join("\r\n"); type = "text/csv;charset=utf-8"; ext = "csv";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = `sensoren_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    out.textContent = `${rows.length} Sensoren exportiert (${rows.filter((r) => r.delivers_value).length} mit Wert).`;
  }

  _renderHead() {
    const h = this.querySelector(".head"); if (!h) return;
    const rows = this._arr().map((id) => `<div class="sel"><div class="n">${esc(this._entName(id))} <small>${esc(this._devName(id))}</small></div>
      <span class="v" data-v="${esc(id)}">${esc(this._val(id))}</span><span class="x" data-rm="${esc(id)}" title="Entfernen">✕</span>
      ${this._opts.noNames ? "" : `<input class="nm" data-nm="${esc(id)}" placeholder="Anzeigename (optional)" value="${esc(this._names?.[id] || "")}">`}
      ${this._opts.opSelect ? `<label class="sg">Rechnung: <select class="op" data-op="${esc(id)}"><option value="1">＋ dazurechnen</option><option value="-1" ${this._signs?.[id] === -1 ? "selected" : ""}>− abziehen</option></select></label>`
        : this._opts.multiple ? `<label class="sg"><input type="checkbox" data-sg="${esc(id)}" ${this._signs?.[id] === -1 ? "checked" : ""}> Wert abziehen (−), z. B. separater Entlade-Sensor</label>` : ""}</div>`).join("");
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
    const first = !this._hass;
    this._hass = h;
    if (first && this._config && this.querySelector("#usec")) this._build();  // Namen/Werte erst mit hass verfügbar
    this.querySelectorAll("ha-form, ob-entity-picker").forEach((f) => (f.hass = h));
    if (this._unow) this._refreshUn();
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
  /** Editor-Teil „Szenario by Claude“: Beschreibung und „Wunsch an Claude“ (kopiert Wunsch + Konfiguration für den Chat) */
  _claudeEditor(w, i, upd) {
    const box = document.createElement("div");
    box.className = "sered";
    const sc = CLAUDE_SCENARIOS[w.scenario];
    box.innerHTML = `<div class="sh"><b>✨ Szenario by Claude</b><small>${esc(sc ? sc.desc : "Wähle oben ein Szenario. Weitere und angepasste Szenarien liefere ich per ⟳ Update – sag mir im Chat, was du dir wünschst.")}</small></div>
      <label>Dein Änderungswunsch an Claude (optional)</label>
      <textarea class="t cw" rows="4" style="width:100%;box-sizing:border-box" placeholder="z. B. Heizstrom getrennt anzeigen, Wallbox ergänzen, Diagramm auf 7 Tage …">${esc(w.wish || "")}</textarea>
      <div class="row"><button class="cp">📋 Wunsch + Konfiguration für Claude kopieren</button><span class="sub cs"></span></div>`;
    box.querySelector(".cw").addEventListener("input", (e) => upd({ wish: e.target.value }));
    box.querySelector(".cp").addEventListener("click", async () => {
      const txt = `Wunsch an Claude: ${w.wish || "(keiner)"}\nSzenario: ${w.scenario || "-"} · Kartenversion ${OB_VERSION}\n\nKonfiguration der Karte:\n${JSON.stringify(this._config, null, 1)}`;
      const out = box.querySelector(".cs");
      try { await navigator.clipboard.writeText(txt); out.textContent = "Kopiert – im Chat einfügen."; }
      catch (e) { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); out.textContent = "Kopiert – im Chat einfügen."; } catch (e2) { out.textContent = "Kopieren nicht möglich."; } ta.remove(); }
    });
    return box;
  }

  /** Aktueller Wert eines Sensors als Text (Editor-Anzeige) */
  _valText(id) {
    if (String(id).startsWith("virtual:")) return "Helfer";
    const st = this._hass?.states?.[id]; if (!st) return "n/a";
    const v = parseFloat(st.state), u = st.attributes.unit_of_measurement || "";
    return isNaN(v) ? st.state : `${v.toLocaleString("de-DE", { maximumFractionDigits: 2 })} ${u}`.trim();
  }
  /** Leistung in W (nur W/kW/MW-Sensoren, Helfer aus ihren Bestandteilen); null wenn kein Leistungswert */
  _pwr(id) {
    if (String(id).startsWith(HELP_PREFIX)) {
      const h = (this._config.helpers || []).find((x) => HELP_PREFIX + x.id === id); if (!h) return null;
      let t = null;
      for (const x of this._flatH(h)) { const v = this._pwr(x.id); if (v !== null) t = (t || 0) + v * x.sign; }
      return t;
    }
    const st = this._hass?.states?.[id], v = parseFloat(st?.state), u = st?.attributes?.unit_of_measurement;
    return isNaN(v) || !["W", "kW", "MW"].includes(u) ? null : u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
  }
  _valW(id) { const v = this._pwr(id); return v === null ? -1 : Math.abs(v); }
  _fW(w) { return w === null ? "–" : Math.abs(w) >= 1000 ? (w / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " kW" : Math.round(w).toLocaleString("de-DE") + " W"; }
  /** Beiträge aller Sensoren zu „nicht zugeordnet“ (jetziger Wert, in W) */
  _unCalc() {
    const bw = (this._config.widgets || []).find((x) => x.type === "balance") || {};
    const { roles, cons } = balanceCollect(this._config.widgets || [], bw, this._config.balance_ref);
    balanceApply(roles, cons, this._config.unassigned_ov || {});
    const contrib = new Map(); let supply = 0, used = 0;
    const refIds = toIds(this._config.balance_ref); let refW = null;
    for (const id of refIds) { const v = this._pwr(id); if (v !== null) refW = (refW || 0) + v; }
    for (const [role, m] of Object.entries(roles)) for (const [id, it] of m) {
      const v = this._pwr(id); if (v === null) { contrib.set(id, null); continue; }
      const c = (role === "battery" ? -1 : 1) * it.f * v; contrib.set(id, c); supply += c;
    }
    for (const [id, it] of cons) {
      const v = this._pwr(id); if (v === null) { contrib.set(id, null); continue; }
      const c = -it.f * v; contrib.set(id, c); used += -c;
    }
    const base = refW !== null ? refW : supply;
    return { contrib, supply, used, refW, rest: base - used };
  }
  _refreshUn() {
    const c = this._unCalc();
    (this._unow || []).forEach(({ id, el, cel }) => {
      el.textContent = String(id).startsWith(HELP_PREFIX) ? this._fW(this._pwr(id)) : this._valText(id);
      const v = c.contrib.get(id);
      cel.textContent = v === undefined ? "ignoriert" : v === null ? "–" : (v > 0 ? "+" : "") + this._fW(v);
      cel.style.opacity = v === undefined || v === null ? ".5" : "";
    });
    if (this._unsum) this._unsum.innerHTML = c.refW !== null
      ? `Jetzt: Referenz-Zähler <b>${esc(this._fW(c.refW))}</b> − Verbraucher <b>${esc(this._fW(c.used))}</b> = nicht zugeordnet <b>${esc(this._fW(c.rest))}</b><br>Quellen (Zufluss) <b>${esc(this._fW(c.supply))}</b> − Referenz = Verluste &amp; Messabweichung <b>${esc(this._fW(c.supply - c.refW))}</b>`
      : `Jetzt: Zufluss <b>${esc(this._fW(c.supply))}</b> − Verbraucher <b>${esc(this._fW(c.used))}</b> = nicht zugeordnet <b>${esc(this._fW(c.rest))}</b>`;
  }

  /** Sektion „Nicht zugeordnet – Zusammensetzung“: alle Sensoren, aus denen sich der Wert ergibt, mit Auswahl Ignorieren / Addieren / Subtrahieren */
  _buildUnassigned() {
    const host = this.querySelector("#usec"); if (!host) return;
    this._unow = [];
    const bw = (this._config.widgets || []).find((x) => x.type === "balance") || {};
    const { roles, cons } = balanceCollect(this._config.widgets || [], bw, this._config.balance_ref);
    const groups = [
      ["☀️ Solar (Zufluss)", "solar", [...roles.solar.entries()]],
      ["🏭 Netz (Zufluss)", "grid", [...roles.grid.entries()]],
      ["🔋 Batterie (Entladen = Zufluss, Laden = Abfluss)", "battery", [...roles.battery.entries()]],
      ["🏘 Andere Bereiche (werden vom Zufluss abgezogen)", "area", [...cons.entries()].filter(([, it]) => it.kind === "area")],
      ["🏠 Geräte dieses Hauses (erklären den Verbrauch)", "consumer", [...cons.entries()].filter(([, it]) => it.kind !== "area")],
    ];
    const sec = document.createElement("details");
    sec.open = !!this._uopen;
    sec.addEventListener("toggle", () => { this._uopen = sec.open; });
    sec.innerHTML = `<summary>⚖️ Nicht zugeordnet — Zusammensetzung</summary>
      <div class="sub" style="margin:6px 0">Spalte 2 = aktueller Messwert, Spalte 3 = <b>Beitrag zu „nicht zugeordnet“</b> (+ erhöht, − verringert). Helfer zeigen ihren berechneten Wert. „Nicht zugeordnet“ = Zufluss (Solar + Netz + Batterie-Entladung) − alle Verbraucher. Die Sensoren werden automatisch aus den Widgets übernommen. Hier legst du je Sensor fest, ob er <b>addiert</b>, <b>subtrahiert</b> oder <b>ignoriert</b> wird. Die Standardeinstellung steht jeweils dabei; sortiert nach der größten Leistung.</div>`;
    const sum = document.createElement("div"); sum.className = "usum"; this._unsum = sum; sec.appendChild(sum);
    const rp = document.createElement("ob-entity-picker");
    rp.options = { label: "Referenz-Zähler — gemessener Gesamtverbrauch hinter Solar/Speicher (z. B. Hausstrom- und Heizstrom-Zähler; ein Zähler mit geöffnetem Relais liefert 0 W, die Werte werden addiert). Leer = Verbrauch aus den Quellen berechnen", multiple: true, domain: "sensor", classes: ["power", "energy"], units: U_POWER, getHelpers: () => this._helperList() };
    rp.value = this._config.balance_ref; rp.names = this._config.balance_ref_names; rp.hass = this._hass;
    rp.addEventListener("renamed", (ev) => {
      ev.stopPropagation();
      const n = { ...(this._config.balance_ref_names || {}) };
      if (ev.detail.name) n[ev.detail.id] = ev.detail.name; else delete n[ev.detail.id];
      if (Object.keys(n).length) this._config.balance_ref_names = n; else delete this._config.balance_ref_names;
      this._emit();
    });
    rp.addEventListener("picked", (ev) => {
      ev.stopPropagation();
      if (ev.detail.value.length) this._config.balance_ref = ev.detail.value; else delete this._config.balance_ref;
      this._emit(); this._refreshUn();
    });
    sec.appendChild(rp);
    const OPT = { add: "＋ Addieren", sub: "− Subtrahieren", ignore: "⊘ Ignorieren" };
    if (!groups.some((g) => g[2].length)) {
      const e = document.createElement("div"); e.className = "sub"; e.textContent = "Noch keine Quellen: Lege ein Energiefluss-Widget mit Solar / Netz / Batterie an.";
      sec.appendChild(e);
    }
    for (const [title, role, items] of groups) {
      if (!items.length) continue;
      const g = document.createElement("div"); g.className = "ug";
      g.innerHTML = `<div class="ugt">${esc(title)}</div>`;
      items.sort((a, b) => this._valW(b[0]) - this._valW(a[0]));
      for (const [id, it] of items) {
        const def = BAL_DEFAULT[role], cur = this._config.unassigned_ov?.[id] || def;
        const row = document.createElement("div"); row.className = "ur";
        const nm = it.wd?.names?.[id] || this._hass?.states?.[id]?.attributes?.friendly_name || this._config.helpers?.find((h) => HELP_PREFIX + h.id === id)?.name || id;
        row.innerHTML = `<span class="un" title="${esc(id)}">${esc(nm)}</span><b class="uv"></b><b class="uc" title="Beitrag zu „nicht zugeordnet“"></b>
          <select>${["add", "sub", "ignore"].map((o) => `<option value="${o}" ${o === cur ? "selected" : ""}>${OPT[o]}${o === def ? " (Standard)" : ""}</option>`).join("")}</select>`;
        this._unow.push({ id, el: row.querySelector(".uv"), cel: row.querySelector(".uc") });
        row.querySelector("select").addEventListener("change", (e) => {
          const ov = { ...(this._config.unassigned_ov || {}) };
          if (e.target.value === def) delete ov[id]; else ov[id] = e.target.value;
          if (Object.keys(ov).length) this._config.unassigned_ov = ov; else delete this._config.unassigned_ov;
          this._emit(); this._refreshUn();
        });
        g.appendChild(row);
      }
      sec.appendChild(g);
    }
    host.appendChild(sec);
    this._refreshUn();
  }

  /** Editor für die Datenreihen eines Verlauf-Diagramms: beliebig viele Sensoren/Helfer mit Farbe und Darstellung (Linie / gestapelt) */
  _seriesEditor(w, i, upd) {
    const box = document.createElement("div");
    box.className = "sered";
    const list = (Array.isArray(w.series) && w.series.length ? w.series : w.entity ? [{ entity: w.entity }] : []).map((x) => ({ ...x }));
    const save = (rebuild) => {
      upd({ series: list.map(({ entity, name, color, mode }) => ({ entity, ...(name ? { name } : {}), ...(color ? { color } : {}), ...(mode === "stack" ? { mode } : {}) })), entity: undefined });
      if (rebuild) this._build();
    };
    box.innerHTML = `<div class="sh"><b>Datenreihen</b><small>Beliebig viele Sensoren oder Helfer. Darstellung je Reihe: <b>Linie</b> (einzeln) oder <b>gestapelt</b> (addierend, Flächen liegen übereinander).</small></div>`;
    list.forEach((s, k) => {
      const row = document.createElement("div");
      row.className = "sr";
      const pk = document.createElement("ob-entity-picker");
      pk.options = { label: `Datenreihe ${k + 1} — Sensor oder Helfer`, multiple: false, noNames: true, domain: "sensor", getHelpers: () => this._helperList() };
      pk.value = s.entity; pk.hass = this._hass;
      pk.addEventListener("picked", (ev) => { ev.stopPropagation(); s.entity = ev.detail.value; save(false); });
      const ctl = document.createElement("div");
      ctl.className = "sc";
      ctl.innerHTML = `<label>Farbe <input type="color" class="co" value="${esc(s.color || PAL[k % PAL.length])}"></label>
        <label>Darstellung <select class="mo"><option value="line">Linie</option><option value="stack" ${s.mode === "stack" ? "selected" : ""}>Gestapelt (addierend)</option></select></label>
        <input class="t nm" placeholder="Name in der Legende (optional)" value="${esc(s.name || "")}">
        <button class="rm">🗑 Reihe entfernen</button>`;
      ctl.querySelector(".co").addEventListener("input", (e) => { s.color = e.target.value; save(false); });
      ctl.querySelector(".mo").addEventListener("change", (e) => { s.mode = e.target.value; save(false); });
      ctl.querySelector(".nm").addEventListener("input", (e) => { s.name = e.target.value; save(false); });
      ctl.querySelector(".rm").addEventListener("click", () => { list.splice(k, 1); save(true); });
      row.append(pk, ctl);
      box.appendChild(row);
    });
    const add = document.createElement("button");
    add.textContent = "+ Datenreihe hinzufügen";
    add.addEventListener("click", () => { list.push({ entity: "" }); (this._open ||= new Set()).add(i); upd({ series: list.map((x) => ({ ...x })), entity: undefined }); this._build(); });
    const wrap = document.createElement("div"); wrap.className = "row"; wrap.appendChild(add);
    box.appendChild(wrap);
    return box;
  }

  /** Helfer (auch verschachtelt) zu einer flachen Liste {id, sign} echter Sensoren auflösen */
  _flatH(h, sign = 1, seen = new Set()) {
    const out = [];
    if (seen.has(h.id)) return out;
    seen.add(h.id);
    for (const c of h.entities || []) {
      const sg = (h.signs?.[c] === -1 ? -1 : 1) * sign;
      if (String(c).startsWith(HELP_PREFIX)) {
        const sub = (this._config.helpers || []).find((x) => x.id === String(c).slice(HELP_PREFIX.length));
        if (sub) out.push(...this._flatH(sub, sg, seen));
      } else out.push({ id: c, sign: sg });
    }
    seen.delete(h.id);
    return out;
  }
  /** Hängt Helfer `hid` (direkt oder indirekt) von Helfer `target` ab? (Zyklenschutz) */
  _helperDepends(hid, target, seen = new Set()) {
    if (hid === target) return true;
    if (seen.has(hid)) return false;
    seen.add(hid);
    const h = (this._config.helpers || []).find((x) => x.id === hid);
    return (h?.entities || []).some((c) => String(c).startsWith(HELP_PREFIX) && this._helperDepends(String(c).slice(HELP_PREFIX.length), target, seen));
  }

  _helperTemplate(h) {
    const st = this._hass?.states || {}, flat = this._flatH(h);
    if (!flat.length) return { error: "Keine Sensoren gewählt." };
    const kind = (id) => { const a = st[id]?.attributes || {}; return ["Wh", "kWh", "MWh"].includes(a.unit_of_measurement) || a.device_class === "energy" ? "energy" : "power"; };
    const kinds = new Set(flat.map((x) => kind(x.id)));
    if (kinds.size > 1) return { error: "Der Helfer mischt Leistung (W) und Energie (kWh). Bitte getrennt anlegen." };
    const energy = kinds.has("energy");
    const factor = (id) => { const u = st[id]?.attributes?.unit_of_measurement; return energy ? (u === "Wh" ? 0.001 : u === "MWh" ? 1000 : 1) : (u === "kW" ? 1000 : u === "MW" ? 1e6 : 1); };
    const terms = flat.map((x, k) => `${x.sign === -1 ? "- " : k ? "+ " : ""}(states('${x.id}') | float(0) * ${factor(x.id)})`).join(" ");
    return { template: `{{ (${terms}) | round(${energy ? 3 : 1}) }}`, unit: energy ? "kWh" : "W", dc: energy ? "energy" : "power", sc: energy ? "total" : "measurement" };
  }

  /** Aktueller Wert des Helfers (nur Anzeige im Editor) */
  _helperNow(h) {
    const t = this._helperTemplate(h); if (t.error) return "";
    const st = this._hass?.states || {};
    let sum = 0, any = false;
    for (const x of this._flatH(h)) {
      const a = st[x.id]?.attributes || {}, v = parseFloat(st[x.id]?.state);
      if (isNaN(v)) continue;
      const u = a.unit_of_measurement, f = t.unit === "W" ? (u === "kW" ? 1000 : u === "MW" ? 1e6 : 1) : (u === "Wh" ? 0.001 : u === "MWh" ? 1000 : 1);
      sum += v * f * x.sign; any = true;
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
      pk.options = { label: "Bestandteile — Sensoren und andere Helfer, je „dazurechnen“ oder „abziehen“", multiple: true, noNames: true, opSelect: true, domain: "sensor", classes: ["power", "energy"], units: U_POWER,
        getHelpers: () => this._helperList().filter((x) => !this._helperDepends(x.id.slice(HELP_PREFIX.length), h.id)) };
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
      .ob .ug{margin:10px 0;padding:8px 10px;background:var(--secondary-background-color);border-left:4px solid var(--primary-color);border-radius:8px}
      .ob .ugt{font-weight:700;margin-bottom:6px}.ob .ur{display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--divider-color)}
      .ob .usum{margin:8px 0;padding:8px 10px;border-radius:8px;background:var(--card-background-color);border:1px solid var(--divider-color)}
      .ob .ur .uc{min-width:78px;text-align:right;white-space:nowrap}
      .ob .ur .un{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ob .ur .uv{white-space:nowrap}
      .ob .sered{margin:14px 0}.ob .sh>b{font-size:1.15em;display:block}.ob .sh small{display:block}.ob .sh small{color:var(--secondary-text-color)}
      .ob .sr{border-left:4px solid var(--primary-color);padding-left:8px;margin:10px 0}.ob .sc{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:4px 0 8px}
      .ob .sc input.co{width:44px;height:30px;padding:0;border:none;background:none;vertical-align:middle}.ob .sc input.nm{flex:1 1 180px;width:auto}
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
      <div class="row" style="margin:6px 0"><span>Plausibilitätsgrenze für Zeiträume</span> <input class="t" id="mk" type="number" min="1" step="1" style="width:90px" value="${esc(this._config.max_kw || "")}" placeholder="100"> <span>kW – größere Sprünge in Zählern gelten als Messfehler</span></div>
      <div class="row" style="margin:0 0 6px"><span>Dienst dafür</span> <input class="t" id="psv" style="width:100%;max-width:340px" value="${esc(this._config.poll_service || "")}" placeholder="marstek_local_api.request_data_sync"></div>
      <label><input type="checkbox" id="sl" ${this._config.show_layout === false ? "" : "checked"}> Layout-Bearbeitung (✥ Drag &amp; Drop) in der Karte anbieten</label><br>
      <label><input type="checkbox" id="su" ${this._config.show_update === false ? "" : "checked"}> Update-Button in der Karte anzeigen</label>
      <div id="list"></div>
      <div class="row"><select id="newtype">${Object.entries(WIDGET_TYPES).filter(([, v]) => !v.hidden).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
        <button id="add">+ Widget hinzufügen</button></div>
      <div id="hsec"></div>
      <div id="usec"></div>
      <div class="row" style="opacity:.8;font-size:.85em">Version ${OB_VERSION} <button id="reload">↻ Neu laden</button></div></div>`;
    this.querySelector("#reload").addEventListener("click", () => location.reload());
    this.querySelector("#title").addEventListener("input", (e) => { this._config.title = e.target.value; this._emit(); });
    this.querySelector("#sp").addEventListener("change", (e) => {
      if (e.target.checked) delete this._config.show_periods; else this._config.show_periods = false;
      this._emit();
    });
    const setNum = (k, v) => { if (v === "" || !(Number(v) > 0)) delete this._config[k]; else this._config[k] = Number(v); this._emit(); };
    this.querySelector("#ps").addEventListener("input", (e) => setNum("poll_s", e.target.value));
    this.querySelector("#mk").addEventListener("input", (e) => setNum("max_kw", e.target.value));
    this.querySelector("#psv").addEventListener("input", (e) => { if (e.target.value.trim()) this._config.poll_service = e.target.value.trim(); else delete this._config.poll_service; this._emit(); });
    this.querySelector("#sl").addEventListener("change", (e) => {
      if (e.target.checked) delete this._config.show_layout; else this._config.show_layout = false;
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
    this._buildHelpers();
    this._buildUnassigned();
    const list = this.querySelector("#list");
    ws.forEach((w, i) => {
      const d = document.createElement("details");
      d.open = !!this._open?.has(i);
      d.addEventListener("toggle", () => { (this._open ||= new Set())[d.open ? "add" : "delete"](i); });
      const t = WIDGET_TYPES[w.type] || { icon: "?", label: w.type };
      d.innerHTML = `<summary>${t.icon} ${esc(w.name || (w.type === "claude" && CLAUDE_SCENARIOS[w.scenario]?.title) || t.label)}</summary>`;
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
        const sm = d.querySelector("summary"), nw = this._config.widgets[i];
        if (sm && nw) sm.textContent = `${t.icon} ${nw.name || (nw.type === "claude" && CLAUDE_SCENARIOS[nw.scenario]?.title) || t.label}`;
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
      if (w.type === "history") d.appendChild(this._seriesEditor(w, i, upd));
      if (w.type === "claude") d.appendChild(this._claudeEditor(w, i, upd));
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
