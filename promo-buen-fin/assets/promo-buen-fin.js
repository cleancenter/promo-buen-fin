/* ============================================================
   Promociones Buen Fin · Clean Center  (v4)
   Catálogo para armar una COTIZACIÓN (no es compra en línea).
   El cliente arma su lista → la manda por WhatsApp a su sucursal →
   un asesor le confirma existencias, envío y forma de pago.
   Cada prospecto se guarda en Google Sheets vía Apps Script
   (también los que dejan su WhatsApp y no terminan: estatus «Sin enviar»).

   Configuración desde Webflow (opcional), ANTES de cargar este archivo:
     <script>window.CC_BF_CONFIG = { ENDPOINT: 'https://script.google.com/macros/s/XXXX/exec' };</script>
   ============================================================ */
(function () {
  'use strict';

  var SCRIPT = document.currentScript || document.querySelector('script[src*="promo-buen-fin"]');
  var BASE = '';
  try { if (SCRIPT && SCRIPT.src) BASE = new URL('../', SCRIPT.src).href; } catch (e) {}

  /* ---------------- CONFIGURACIÓN ---------------- */
  var CONFIG = {
    ENDPOINT: '',                       // URL del Web App de Apps Script (Google Sheets). Vacío = no registra.
    WHATSAPP: { gdl: '523314098308', cdmx: '525535493976', cun: '529981098218' },
    IMG_BASE: BASE + 'img/',
    ENVIO_MINIMO: 5000,
    ESCALAS: [{ min: 1, pct: 0 }, { min: 5, pct: 5 }, { min: 10, pct: 10 }, { min: 20, pct: 15 }],
    VIGENCIA: 'hasta el 23 de noviembre de 2026',
    VIGENCIA_CORTA: 'hasta el 23 de noviembre',
    PILL: 'Ahora hasta el 23 de noviembre de 2026',
    SUCURSAL_DEFAULT: 'gdl',            // si el cliente no elige estado
    SHOW_HEADER: true,
    SHOW_FOOTER: true,
    MOUNT: '#ccbf-app'
  };
  var USER = window.CC_BF_CONFIG || {};
  Object.keys(USER).forEach(function (k) {
    if (k === 'WHATSAPP' && USER.WHATSAPP) { Object.keys(USER.WHATSAPP).forEach(function (s) { CONFIG.WHATSAPP[s] = USER.WHATSAPP[s]; }); }
    else CONFIG[k] = USER[k];
  });

  /* ---------------- DATOS ---------------- */
  var CATS = {
    eq: { name: 'Equipos', subs: ['Lava Alfombras', 'Aspiradoras', 'Pulidoras'] },
    qu: { name: 'Químicos', subs: ['Pre Lavadores', 'Detergentes', 'Enjuagues', 'Desmanchadores', 'Protectores', 'Desinfectantes'] }
  };
  var SUCURSALES = [
    { id: 'gdl', nombre: 'Guadalajara', tipo: 'Matriz', dir: 'Paulino Navarro 1355, Col. Los Maestros, C.P. 45150, Zapopan, Jal.' },
    { id: 'cdmx', nombre: 'Ciudad de México', tipo: 'Sucursal', dir: 'Manzanillo 68, Col. Roma Sur, Cuauhtémoc, C.P. 06760, Ciudad de México' },
    { id: 'cun', nombre: 'Cancún', tipo: 'Sucursal', dir: 'Av. Chichén Itzá 737, Mz. 7, C.P. 77520, Cancún, Q.R.' }
  ];
  var SUC = {}; SUCURSALES.forEach(function (s) { SUC[s.id] = s; });
  // Estado → sucursal que lo atiende (ajustable)
  var ESTADOS = {
    'Aguascalientes': 'gdl', 'Baja California': 'gdl', 'Baja California Sur': 'gdl', 'Campeche': 'cun', 'Chiapas': 'cun',
    'Chihuahua': 'gdl', 'Ciudad de México': 'cdmx', 'Coahuila': 'gdl', 'Colima': 'gdl', 'Durango': 'gdl',
    'Estado de México': 'cdmx', 'Guanajuato': 'gdl', 'Guerrero': 'cdmx', 'Hidalgo': 'cdmx', 'Jalisco': 'gdl',
    'Michoacán': 'gdl', 'Morelos': 'cdmx', 'Nayarit': 'gdl', 'Nuevo León': 'gdl', 'Oaxaca': 'cdmx', 'Puebla': 'cdmx',
    'Querétaro': 'cdmx', 'Quintana Roo': 'cun', 'San Luis Potosí': 'gdl', 'Sinaloa': 'gdl', 'Sonora': 'gdl',
    'Tabasco': 'cun', 'Tamaulipas': 'gdl', 'Tlaxcala': 'cdmx', 'Veracruz': 'cdmx', 'Yucatán': 'cun', 'Zacatecas': 'gdl'
  };
  if (USER.ESTADOS) Object.keys(USER.ESTADOS).forEach(function (k) { ESTADOS[k] = USER.ESTADOS[k]; });
  var NEGOCIOS = ['Limpieza profesional', 'Hotel', 'Restaurante', 'Oficina', 'Escuela', 'Hospital', 'Otro'];
  var CUANDO = ['Esta semana', 'Este mes', 'Solo estoy cotizando'];

  // Precio promo con IVA incluido · regular = precio de lista · stock = piezas
  var PRODUCTOS = [{"id": "8070-SS", "cat": "eq", "sub": "Lava Alfombras", "nombre": "Mytee Lite / Power Heat 4 gal 120 PSI", "foto": "mytee-lite-power-heat-4-gal-120-psi.webp", "precio": 37680, "regular": 43815.52, "stock": 4, "codigo": "8070-SS"}, {"id": "71-401", "cat": "eq", "sub": "Lava Alfombras", "nombre": "Rocket 80 Spotter 80 PSI con calentamiento", "foto": "rocket-80-spotter-80-psi-con-calentamiento.webp", "precio": 18710, "regular": 22113.08, "stock": 2, "codigo": "71-401"}, {"id": "S-300H", "cat": "eq", "sub": "Lava Alfombras", "nombre": "Basic S Hot 1 gal 55 PSI con calentamiento", "desc": "Desmanchadora con calentamiento.", "foto": "basic-s-hot-1-gal-55-psi-con-calentamiento.webp", "precio": 24940, "regular": 31910.44, "stock": 4, "codigo": "S-300H"}, {"id": "S-300", "cat": "eq", "sub": "Lava Alfombras", "nombre": "Basic Spotter 1 gal 55 PSI", "desc": "Desmanchadora.", "foto": "basic-s-hot-1-gal-55-psi-con-calentamiento.webp", "precio": 19140, "regular": 26525.72, "stock": 3, "codigo": "S-300"}, {"id": "SHA-ITALY", "cat": "eq", "sub": "Lava Alfombras", "nombre": "Sharon Brush 120V", "foto": "sharon-brush-120v.webp", "demo": true, "precio": 20880, "regular": 42550, "stock": 1, "codigo": "SHA-ITALY"}, {"id": "Z100007", "cat": "eq", "sub": "Pulidoras", "nombre": "Pulidora TVX 20\" 1.5 HP con porta pad", "foto": "pulidora-tvx-20-1-5-hp-con-porta-pad.webp", "precio": 19720, "regular": 28652, "stock": 12, "codigo": "Z100007"}, {"id": "SM18H", "cat": "eq", "sub": "Lava Alfombras", "nombre": "SanitMax", "desc": "Bomba de 160 PSI, calentamiento de 1300 W y 2 cables.", "foto": "sanitmax.webp", "demo": true, "precio": 20880, "regular": 41500, "stock": 0, "codigo": "SM18H"}, {"id": "ranger-12", "cat": "eq", "sub": "Aspiradoras", "nombre": "Aspiradora vertical Ranger 12", "foto": "aspiradora-vertical-ranger-12.webp", "precio": 6230, "regular": 11677, "stock": 8, "codigo": ""}, {"id": "112252", "cat": "qu", "sub": "Pre Lavadores", "nombre": "S785 UltraPac Extreme 6 lb", "foto": "s785-ultrapac-extreme-6-lb.webp", "precio": 1453.46, "stock": 88, "regular": 1529.96, "codigo": "112252"}, {"id": "181005075", "cat": "qu", "sub": "Pre Lavadores", "nombre": "Rhino One Prelavador 6.5 lb", "foto": "rhino-one-prelavador-6-5-lb.webp", "precio": 1228.81, "stock": 89, "regular": 1365.34, "codigo": "181005075"}, {"id": "112257", "cat": "qu", "sub": "Pre Lavadores", "nombre": "S789 Power Burst 6 lb", "foto": "s789-power-burst-6-lb.webp", "precio": 1500.07, "stock": 83, "regular": 1579.02, "codigo": "112257"}, {"id": "119323", "cat": "qu", "sub": "Pre Lavadores", "nombre": "S711 UltraPac TraffiClean 1 gal", "foto": "s711-ultrapac-trafficlean-1-gal.webp", "precio": 1599.33, "stock": 37, "regular": 1738.4, "codigo": "119323"}, {"id": "114338", "cat": "qu", "sub": "Pre Lavadores", "nombre": "S783 Citrus Crush 6 lb", "foto": "s783-citrus-crush-6-lb.webp", "precio": 1395.26, "stock": 42, "regular": 1468.69, "codigo": "114338"}, {"id": "RHULTRA", "cat": "qu", "sub": "Pre Lavadores", "nombre": "Rhino Ultra Prespray 1 gal", "foto": "rhino-ultra-prespray-1-gal.webp", "precio": 1276.57, "stock": 18, "regular": 1387.58, "codigo": "RHULTRA"}, {"id": "112184", "cat": "qu", "sub": "Detergentes", "nombre": "S776 Dry Slurry 6 lb", "foto": "s776-dry-slurry-6-lb.webp", "precio": 1241.27, "stock": 102, "regular": 1349.21, "codigo": "112184"}, {"id": "112406", "cat": "qu", "sub": "Detergentes", "nombre": "S876 Liquid Slurry 1 gal", "foto": "s876-liquid-slurry-1-gal.webp", "precio": 1954.98, "stock": 34, "regular": 2124.98, "codigo": "112406"}, {"id": "6536190984294", "cat": "qu", "sub": "Detergentes", "nombre": "Rhino Force Detergente 6.5 lb", "foto": "rhino-force-detergente-6-5-lb.webp", "precio": 930.95, "stock": 18, "regular": 1011.9, "codigo": "6536190984294"}, {"id": "121599", "cat": "qu", "sub": "Enjuagues", "nombre": "S112 All Fiber Rinse 6 lb", "foto": "s112-all-fiber-rinse-6-lb.webp", "precio": 1269.11, "stock": 60, "regular": 1335.91, "codigo": "121599"}, {"id": "105844", "cat": "qu", "sub": "Enjuagues", "nombre": "B109 All Fiber Rinse 1 gal", "foto": "b109-all-fiber-rinse-1-gal.webp", "precio": 684.37, "stock": 75, "regular": 720.39, "codigo": "105844"}, {"id": "6536192032870", "cat": "qu", "sub": "Enjuagues", "nombre": "Rhino Rinse Enjuague 1 gal", "foto": "rhino-rinse-enjuague-1-gal.webp", "precio": 584.53, "stock": 39, "regular": 635.36, "codigo": "6536192032870"}, {"id": "119317", "cat": "qu", "sub": "Enjuagues", "nombre": "S103 All Fiber Deep Clean 1 gal", "foto": "s103-all-fiber-deep-clean-1-gal.webp", "precio": 1139.46, "stock": 9, "codigo": "119317"}, {"id": "114799", "cat": "qu", "sub": "Desmanchadores", "nombre": "Un-Duz-It Unleashed 1 gal", "foto": "un-duz-it-unleashed-1-gal.webp", "precio": 1012.19, "stock": 13, "regular": 1100.21, "codigo": "114799"}, {"id": "105851", "cat": "qu", "sub": "Desmanchadores", "nombre": "B167 Power Solvent 1 qt", "foto": "b167-power-solvent-1-qt.webp", "precio": 846.9, "stock": 27, "regular": 920.55, "codigo": "105851"}, {"id": "101272", "cat": "qu", "sub": "Desmanchadores", "nombre": "B195 Yellow Rx 1 gal", "foto": "b195-yellow-rx-1-gal.webp", "precio": 723.14, "stock": 19, "regular": 786.02, "codigo": "101272"}, {"id": "101200", "cat": "qu", "sub": "Desmanchadores", "nombre": "B114 Urine Rescue 1 gal", "foto": "b114-urine-rescue-1-gal.webp", "precio": 958.0, "stock": 12, "regular": 1008.42, "codigo": "101200"}, {"id": "51004", "cat": "qu", "sub": "Desmanchadores", "nombre": "Pet Stainoff 1 gal", "foto": "pet-stainoff-1-gal.webp", "precio": 650.52, "stock": 1, "regular": 707.09, "codigo": "51004"}, {"id": "6644369326182", "cat": "qu", "sub": "Desmanchadores", "nombre": "Just Like Magic 950 ml", "foto": "just-like-magic-950-ml.webp", "precio": 320.55, "stock": 0, "regular": 348.42, "codigo": "6644369326182"}, {"id": "101270", "cat": "qu", "sub": "Desmanchadores", "nombre": "B173 Paint Oil Grease Remover 1 qt", "foto": "b173-paint-oil-grease-remover-1-qt.webp", "precio": 871.0, "stock": 8, "regular": 916.84, "codigo": "101270"}, {"id": "181005008", "cat": "qu", "sub": "Desmanchadores", "nombre": "De-Zov-All Clear 1 qt", "foto": "de-zov-all-clear-1-qt.webp", "precio": 1137.36, "stock": 14, "regular": 1236.26, "codigo": "181005008"}, {"id": "101271", "cat": "qu", "sub": "Desmanchadores", "nombre": "B182 Coffee/Tannin Spotter 1 qt", "foto": "b182-coffee-tannin-spotter-1-qt.webp", "precio": 522.39, "stock": 22, "regular": 549.89, "codigo": "101271"}, {"id": "50404", "cat": "qu", "sub": "Desmanchadores", "nombre": "De-Zov-All Clear 1 gal", "foto": "de-zov-all-clear-1-gal.webp", "precio": 3791.41, "stock": 13, "regular": 4121.1, "codigo": "50404"}, {"id": "1681-2618", "cat": "qu", "sub": "Desmanchadores", "nombre": "Perky Spotter", "foto": "perky-spotter.webp", "precio": 743.4, "stock": 12, "regular": 808.04, "codigo": "1681-2618"}, {"id": "1629-0773 / 2696-4306", "cat": "qu", "sub": "Protectores", "nombre": "Protector Advanced (antes Teflon)", "foto": "protector-advanced-antes-teflon.webp", "precio": 2738.1, "stock": 13, "regular": 2976.19, "codigo": "1629-0773 / 2696-4306"}, {"id": "6536193048678", "cat": "qu", "sub": "Protectores", "nombre": "Rhino Armor 1 gal", "foto": "rhino-armor-1-gal.webp", "precio": 1084.21, "stock": 20, "regular": 1178.48, "codigo": "6536193048678"}, {"id": "62404", "cat": "qu", "sub": "Desinfectantes", "nombre": "Desinfectante uso profesional Milban 123", "foto": "desinfectante-uso-profesional-milban-123.webp", "precio": 1024.07, "stock": 43, "regular": 1706.79, "codigo": "62404"}, {"id": "32004", "cat": "qu", "sub": "Desinfectantes", "nombre": "Desinfectante uso profesional Sani 256", "foto": "desinfectante-uso-profesional-sani-256.webp", "precio": 920.24, "stock": 43, "regular": 2300.59, "codigo": "32004"}, {"id": "4848660217958", "cat": "qu", "sub": "Desinfectantes", "nombre": "Desinfectante uso profesional Lemon Slam", "foto": "desinfectante-uso-profesional-lemon-slam.webp", "precio": 473.28, "stock": 12, "regular": 1183.2, "codigo": "4848660217958"}, {"id": "4848659202150", "cat": "qu", "sub": "Desinfectantes", "nombre": "Neutral desinfectante uso profesional 1 gal", "foto": "neutral-desinfectante-uso-profesional-1-gal.webp", "precio": 359.6, "stock": 16, "regular": 899.0, "codigo": "4848659202150"}];
  var POR_ID = {}; PRODUCTOS.forEach(function (p) { POR_ID[p.id] = p; });
  PRODUCTOS.sort(function (a, b) {
    if (a.cat !== b.cat) return a.cat === 'eq' ? -1 : 1;
    return CATS[a.cat].subs.indexOf(a.sub) - CATS[b.cat].subs.indexOf(b.sub);
  });

  /* ---------------- UTILIDADES ---------------- */
  var LS = 'ccbf_cotizacion_v4';
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function maxDe(p) { return typeof p.stock === 'number' ? Math.max(0, p.stock) : 99; }
  function nuevoFolio() {
    var n = Math.max(0, Math.floor((Date.now() - Date.UTC(2026, 10, 1, 6)) / 10000));
    return 'BF26-' + String(n).padStart(6, '0') + String(Math.floor(Math.random() * 90) + 10);
  }
  function waLink(num, msg) { return 'https://wa.me/' + String(num).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg); }
  function soloDigitos(s) { return String(s || '').replace(/\D/g, ''); }
  function telOk(s) { return soloDigitos(s).length >= 10; }
  function emailOk(s) { return !s || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function dl(ev, extra) { try { var o = { event: ev, folio: S.folio }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); (window.dataLayer = window.dataLayer || []).push(o); } catch (e) {} }

  var I = {
    clip: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>',
    wa: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.4-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 6 6 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4 4 0 0 0 1.9.1 3 3 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4ZM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.8 9.8 0 1 1 8.3 4.6Zm8.4-18.2A11.8 11.8 0 0 0 1.8 17.9L.1 24l6.3-1.6A11.8 11.8 0 0 0 23.8 12a11.7 11.7 0 0 0-3.4-8.4Z"/></svg>',
    truck: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="14" height="10" rx="2"/><path d="M17 9h2.5l1.5 3v4h-4"/><circle cx="7.5" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><path d="M6 6V3h6"/></svg>',
    flask: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.5a2 2 0 0 1-.2.9L4.7 20.6a1 1 0 0 0 .9 1.4h12.8a1 1 0 0 0 .9-1.4l-5.1-10.2a2 2 0 0 1-.2-.9V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>',
    plus: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5v14"/></svg>',
    arrow: '<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    x: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    van: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047ba" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
    info: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };

  /* ---------------- ESTADO ---------------- */
  var saved = store(LS) || {};
  var CAMPOS = ['nombre', 'empresa', 'telefono', 'correo', 'estado', 'sucursalManual', 'negocio', 'cuando'];
  var S = { cat: 'eq', sub: 'all', panel: false, cart: {}, folio: saved.folio || nuevoFolio(), intento: false, enviado: false, cambiarSuc: false,
    iniciado: false, parcialFirma: saved.parcialFirma || '', enviadoFolio: saved.enviadoFolio || '' };
  CAMPOS.forEach(function (k) { S[k] = saved[k] || ''; });
  if (saved.cart) Object.keys(saved.cart).forEach(function (id) { if (POR_ID[id]) S.cart[id] = Math.min(saved.cart[id], maxDe(POR_ID[id])); });
  function persist() {
    var o = { cart: S.cart, folio: S.folio, parcialFirma: S.parcialFirma, enviadoFolio: S.enviadoFolio };
    CAMPOS.forEach(function (k) { o[k] = S[k]; });
    store(LS, o);
  }
  function sucursal() { return S.sucursalManual || ESTADOS[S.estado] || CONFIG.SUCURSAL_DEFAULT; }

  /* ---------------- CÁLCULOS ---------------- */
  function calc() {
    var esc_ = CONFIG.ESCALAS, quPiezas = 0;
    Object.keys(S.cart).forEach(function (id) { if (POR_ID[id].cat === 'qu') quPiezas += S.cart[id]; });
    var pct = 0, idx = -1;
    esc_.forEach(function (e, i) { if (quPiezas >= e.min) { pct = e.pct; idx = i; } });
    var sig = esc_[idx + 1], maxPct = esc_[esc_.length - 1].pct;
    var count = 0, total = 0, descuento = 0, ahorroBF = 0;
    var items = Object.keys(S.cart).map(function (id) {
      var p = POR_ID[id], q = S.cart[id], d = p.cat === 'qu' ? pct : 0;
      var pu = Math.round(p.precio * (100 - d)) / 100;
      count += q; total += pu * q; descuento += (p.precio - pu) * q;
      if (p.regular && p.regular > p.precio) ahorroBF += (p.regular - p.precio) * q;
      return { p: p, id: id, q: q, d: d, pu: pu, linea: pu * q, puTxt: d ? fmt(pu) + ' c/u (−' + d + '% sobre ' + fmt(p.precio) + ')' : fmt(pu) + ' c/u' };
    });
    var volTxt = quPiezas === 0 ? 'Agrega químicos a tu cotización y ve cómo baja el precio.'
      : 'Llevas ' + quPiezas + (quPiezas === 1 ? ' pieza' : ' piezas') + ' de químicos' + (pct ? ': −' + pct + '% en todos.' : '.')
        + (sig ? ' Agrega ' + (sig.min - quPiezas) + ' más y obtén −' + sig.pct + '%.' : ' ¡Ya tienes el máximo descuento!');
    return { quPiezas: quPiezas, pct: pct, idx: idx, maxPct: maxPct, items: items, count: count, total: total, descuento: descuento, ahorro: ahorroBF + descuento, volTxt: volTxt };
  }

  function errores() {
    var e = {};
    if (!S.nombre.trim()) e.nombre = 'Escribe tu nombre.';
    if (!telOk(S.telefono)) e.telefono = 'Escribe tu WhatsApp a 10 dígitos.';
    if (!emailOk(S.correo.trim())) e.correo = 'Revisa tu correo.';
    return e;
  }

  function datosCliente() {
    return '\n\nNombre: ' + S.nombre.trim()
      + (S.empresa.trim() ? '\nEmpresa: ' + S.empresa.trim() : '')
      + '\nWhatsApp: ' + soloDigitos(S.telefono)
      + (S.correo.trim() ? '\nCorreo: ' + S.correo.trim() : '')
      + (S.estado ? '\nEstado: ' + S.estado : '')
      + (S.negocio ? '\nTipo de negocio: ' + S.negocio : '')
      + (S.cuando ? '\nLo necesito: ' + S.cuando : '');
  }
  function mensaje(c) {
    if (!c.items.length) {
      return 'Hola, vi las promociones Buen Fin de Clean Center y me gustaría que un asesor me recomiende qué necesito (Folio ' + S.folio + ').' + datosCliente();
    }
    var lineas = c.items.map(function (it) { return '• ' + it.q + ' × ' + it.p.nombre + ' — ' + it.puTxt + ' = ' + fmt(it.linea); });
    return 'Hola, me interesa cotizar estos productos de las promociones Buen Fin de Clean Center (Cotización No. ' + S.folio + '):\n\n'
      + lineas.join('\n')
      + (c.pct ? '\n\nDescuento por volumen en químicos: −' + c.pct + '%' : '')
      + '\n\nTotal estimado: ' + fmt(c.total) + ' (IVA incluido)'
      + datosCliente()
      + '\n\n¿Me ayudan a confirmar existencias, envío y forma de pago?';
  }

  /* ---------------- REGISTRO EN GOOGLE SHEETS ---------------- */
  function postear(payload) {
    if (!CONFIG.ENDPOINT) return;
    var body = JSON.stringify(payload);
    try { fetch(CONFIG.ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }); }
    catch (e) { try { navigator.sendBeacon(CONFIG.ENDPOINT, new Blob([body], { type: 'text/plain' })); } catch (e2) {} }
  }
  function payloadBase(tipo, folio, c) {
    var suc = sucursal();
    return {
      tipo: tipo, folio: folio, fecha: new Date().toISOString(),
      nombre: S.nombre.trim(), empresa: S.empresa.trim(), telefono: soloDigitos(S.telefono), correo: S.correo.trim(),
      estado: S.estado, negocio: S.negocio, cuando: S.cuando, sucursal: suc, sucursalNombre: SUC[suc].nombre,
      items: c ? c.items.map(function (it) { return { codigo: it.p.codigo || it.p.id, nombre: it.p.nombre, cantidad: it.q, importe: Math.round(it.linea * 100) / 100 }; }) : [],
      piezas: c ? c.count : 0, descuentoVolumenPct: c ? c.pct : 0, ahorroTotal: c ? Math.round(c.ahorro * 100) / 100 : 0,
      total: c ? Math.round(c.total * 100) / 100 : 0, envioIncluido: c ? c.total > CONFIG.ENVIO_MINIMO : false,
      pagina: location.href.split('#')[0], website: (root.querySelector('.ccbf-hp input') || {}).value || ''
    };
  }
  // Lead parcial: en cuanto hay un WhatsApp válido (aunque no envíe). Solo si cambió algo y no se ha enviado este folio.
  var tParcial;
  function programarParcial() {
    clearTimeout(tParcial);
    tParcial = setTimeout(enviarParcial, 1500);
  }
  function enviarParcial() {
    if (!telOk(S.telefono) || S.enviadoFolio === S.folio) return;
    var c = calc(), p = payloadBase('parcial', S.folio, c);
    var firma = [p.nombre, p.telefono, p.correo, p.empresa, p.estado, p.negocio, p.cuando, p.sucursal, JSON.stringify(p.items)].join('|');
    if (firma === S.parcialFirma) return;
    if (!S.parcialFirma) dl('cc_bf_lead_parcial', { sucursal: p.sucursal });
    S.parcialFirma = firma; persist();
    postear(p);
  }

  /* ---------------- PLANTILLAS ---------------- */
  function tplPasos(extra) {
    return '<ol class="ccbf-pasos' + (extra || '') + '">'
      + '<li><b>1</b><span><strong>Arma tu lista</strong>Elige equipos y químicos.</span></li>'
      + '<li><b>2</b><span><strong>Un asesor te contacta</strong>Te confirma existencias, envío y forma de pago.</span></li>'
      + '<li><b>3</b><span><strong>Tú decides</strong>Compras solo si te convence.</span></li></ol>';
  }
  function tplShell() {
    var h = '';
    if (CONFIG.SHOW_HEADER) h += '<header class="ccbf-header"><div class="ccbf-wrap">'
      + '<img class="ccbf-logo" src="' + CONFIG.IMG_BASE + 'logo-clean-center.png" alt="Clean Center" width="176" height="44">'
      + '<nav class="ccbf-nav" aria-label="Principal"><a href="#ccbf-catalogo" data-go="ccbf-catalogo">Catálogo</a><a href="#ccbf-sucursales" data-go="ccbf-sucursales">Sucursales</a>'
      + '<button type="button" class="ccbf-cartbtn" data-a="open">' + I.clip + '<span class="ccbf-cartbtn__lbl">Mi cotización</span> <b data-r="count">0</b></button></nav></div></header>';
    h += '<section class="ccbf-hero"><div class="ccbf-wrap"><div class="ccbf-hero__txt">'
      + '<p class="ccbf-eyebrow ccbf-hero__eyebrow">Equipos · Químicos</p>'
      + '<h1 class="ccbf-h1">Extendimos el<br><span>Buen Fin</span></h1>'
      + '<p class="ccbf-hero__lead">Arma tu cotización sin compromiso y un asesor de Clean Center te ayuda a elegir, con el respaldo de capacitación y servicio post venta.</p>'
      + '<p class="ccbf-pill">' + esc(CONFIG.PILL) + '</p>'
      + '<div class="ccbf-hero__ctas"><a class="ccbf-btn ccbf-btn--blue" href="#ccbf-catalogo" data-go="ccbf-catalogo">Ver promociones</a>'
      + '<button type="button" class="ccbf-btn ccbf-btn--ghost" data-a="open" data-src="hero">' + I.wa + 'Pide asesoría sin compromiso</button></div>'
      + '</div><div class="ccbf-hero__img"><img src="' + CONFIG.IMG_BASE + 'buen-fin.webp" alt="Buen Fin, el fin de semana más barato del año" width="360" height="360"></div></div></section>';
    h += '<section class="ccbf-stats"><div class="ccbf-wrap">'
      + '<div class="ccbf-stat"><strong>30+ años</strong><span>en el mercado de la limpieza profesional</span></div>'
      + '<div class="ccbf-stat"><strong>+300</strong><span>químicos especializados</span></div>'
      + '<div class="ccbf-stat"><strong>3 sucursales</strong><span>CDMX, Guadalajara y Cancún</span></div>'
      + '<div class="ccbf-stat"><strong>Solución 360</strong><span>capacitación y servicio post venta</span></div></div></section>';
    h += '<section class="ccbf-como"><div class="ccbf-wrap"><p class="ccbf-eyebrow">Así funciona · Sin pago en línea</p>' + tplPasos() + '</div></section>';
    h += '<section id="ccbf-catalogo" class="ccbf-wrap ccbf-cat">'
      + '<div class="ccbf-head"><p class="ccbf-eyebrow">Elige una categoría</p><h2 class="ccbf-h2">Ofertas Buen Fin</h2></div>'
      + '<div class="ccbf-cats">'
      + '<button type="button" class="ccbf-catbtn ccbf-catbtn--eq" data-a="cat" data-v="eq" aria-pressed="true"><span class="ccbf-catbtn__ico">' + I.truck + '</span><span class="ccbf-catbtn__txt"><b>Equipos</b><small>' + CATS.eq.subs.length + ' subcategorías</small></span><span class="ccbf-viendo">Viendo</span></button>'
      + '<button type="button" class="ccbf-catbtn ccbf-catbtn--qu" data-a="cat" data-v="qu" aria-pressed="false"><span class="ccbf-catbtn__ico">' + I.flask + '</span><span class="ccbf-catbtn__txt"><b>Químicos</b><small>' + CATS.qu.subs.length + ' subcategorías</small></span><span class="ccbf-viendo">Viendo</span></button>'
      + '</div>'
      + '<div class="ccbf-subs-wrap"><h3 class="ccbf-h3" data-r="catname"></h3><div class="ccbf-subs" role="group" aria-label="Subcategorías" data-r="subs"></div></div>'
      + '<div class="ccbf-vol" data-r="vol" hidden></div>'
      + '<div class="ccbf-grid" data-r="grid"></div>'
      + '<div data-r="next"></div>'
      + '</section>';
    h += '<section id="ccbf-sucursales" class="ccbf-sucs"><div class="ccbf-wrap"><div class="ccbf-head"><p class="ccbf-eyebrow">Estamos listos para ayudarte</p><h2 class="ccbf-h2">Nuestras sucursales</h2></div><div class="ccbf-sucgrid">'
      + SUCURSALES.map(function (s) { return '<div class="ccbf-suc"><small' + (s.tipo === 'Matriz' ? ' class="is-matriz"' : '') + '>' + s.tipo + '</small><h3>' + s.nombre + '</h3><p>' + s.dir + '</p></div>'; }).join('')
      + '</div></div></section>';
    if (CONFIG.SHOW_FOOTER) h += '<footer class="ccbf-footer"><div class="ccbf-wrap"><img src="' + CONFIG.IMG_BASE + 'logo-clean-center-blanco.png" alt="Clean Center" width="160" height="40">'
      + '<div class="ccbf-footer__txt"><a href="https://www.cleancenter.com.mx">www.cleancenter.com.mx</a><p>Promoción válida ' + esc(CONFIG.VIGENCIA) + '. Precios en pesos mexicanos con IVA incluido. Precios válidos únicamente en pago de contado. Envío incluido en compras mayores a ' + fmt(CONFIG.ENVIO_MINIMO).replace('.00', '') + '. Hasta agotar existencias. Por la alta demanda, los pedidos se surten en orden de facturación y la entrega puede tardar más de lo habitual.</p></div></div></footer>';
    h += '<button type="button" class="ccbf-fab" data-a="open" data-r="fab" hidden></button>';
    h += '<div class="ccbf-panel" data-r="panel" hidden></div>';
    return h;
  }

  function tplCard(p, c) {
    var n = p.stock, ag = n <= 0, ult = n > 0 && n <= 3, q = S.cart[p.id] || 0;
    var stock = ag ? '<div class="ccbf-stock is-out"><i></i>Agotado</div>'
      : '<div class="ccbf-stock' + (ult ? ' is-low' : '') + '"><i></i>' + (ult ? '¡Últimas ' + n + (n === 1 ? ' pieza!' : ' piezas!') : n + ' piezas disponibles') + '</div>';
    var off = '';
    if (p.cat === 'qu') {
      var o = Math.round((1 - p.precio * (100 - c.maxPct) / 100 / (p.regular || p.precio)) * 100);
      off = '<span class="ccbf-badge-off" aria-label="Hasta ' + o + '% de descuento máximo, sumando Buen Fin y volumen"><small>Hasta</small><strong>' + o + '%</strong><em>de descuento máximo</em></span>';
    }
    var badge = p.cat === 'eq' ? '<span class="ccbf-badge-bf"><small>Precio especial</small><strong>Buen Fin</strong></span>' : '<span class="ccbf-badge-promo">Promo</span>';
    var ctl;
    if (ag) ctl = '<button type="button" class="ccbf-add" disabled>Agotado</button>';
    else if (!q) ctl = '<button type="button" class="ccbf-add" data-a="add" data-v="' + esc(p.id) + '">' + I.plus + 'Agregar a mi cotización</button>';
    else ctl = '<div class="ccbf-qty"><button type="button" class="ccbf-qbtn" aria-label="Quitar una pieza" data-a="minus" data-v="' + esc(p.id) + '">−</button><span>' + q + ' en tu cotización</span><button type="button" class="ccbf-qbtn ccbf-qbtn--plus" aria-label="Agregar una pieza" data-a="add" data-v="' + esc(p.id) + '"' + (q >= maxDe(p) ? ' disabled' : '') + '>+</button></div>';
    var ask = '<a class="ccbf-ask" href="#" target="_blank" rel="noopener" data-a="ask" data-v="' + esc(p.id) + '">' + I.wa + 'Preguntar por este producto</a>';
    return '<article class="ccbf-card"><div class="ccbf-card__media"><img loading="lazy" decoding="async" src="' + CONFIG.IMG_BASE + esc(p.foto) + '" alt="' + esc(p.nombre) + '" width="800" height="600">' + badge + off + '</div>'
      + '<div class="ccbf-card__body"><p class="ccbf-card__sub">' + esc(p.sub) + '</p><h4 class="ccbf-card__name">' + esc(p.nombre) + '</h4>'
      + (p.codigo ? '<p class="ccbf-card__code">Código: ' + esc(p.codigo) + '</p>' : '')
      + (p.demo ? '<p class="ccbf-tag ccbf-tag--demo">Equipo demo · Prácticamente nuevo</p>' : '')
      + (p.desc ? '<p class="ccbf-card__desc">' + esc(p.desc) + '</p>' : '')
      + stock
      + (p.cat === 'qu' ? '<p class="ccbf-tag ccbf-tag--vol">' + (c.pct ? 'En tu cotización: −' + c.pct + '% por volumen' : 'Por volumen: hasta −' + c.maxPct + '%') + '</p>' : '')
      + '<div class="ccbf-price"><div class="ccbf-price__row"><span class="ccbf-price__now">' + fmt(p.precio) + '</span>' + (p.regular ? '<span class="ccbf-price__old">' + fmt(p.regular) + '</span>' : '') + '</div><span class="ccbf-price__iva">IVA incluido</span>'
      + (p.cat === 'qu' && p.regular > p.precio ? '<span class="ccbf-price__save">Ahorras ' + fmt(p.regular - p.precio) + '</span>' : '') + '</div>'
      + ctl + ask + '</div></article>';
  }

  /* ---------------- RENDER ---------------- */
  var root, R = {};

  function renderCatalogo(c) {
    root.querySelectorAll('[data-a="cat"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === S.cat)); });
    R.catname.textContent = CATS[S.cat].name;
    R.subs.innerHTML = [{ id: 'all', name: 'Todas' }].concat(CATS[S.cat].subs.map(function (s) { return { id: s, name: s }; }))
      .map(function (s) { return '<button type="button" class="ccbf-chip" data-a="sub" data-v="' + esc(s.id) + '" aria-pressed="' + (s.id === S.sub) + '">' + esc(s.name) + '</button>'; }).join('');
    renderVol(c);
    renderGrid(c);
    R.next.innerHTML = S.cat === 'eq'
      ? '<button type="button" class="ccbf-next ccbf-next--qu" data-a="ir" data-v="qu"><span><small>Complementa tu cotización</small><b>Ver Químicos</b></span>' + I.arrow + '</button>'
      : '<button type="button" class="ccbf-next ccbf-next--eq" data-a="ir" data-v="eq"><span><small>Complementa tu cotización</small><b>Ver Equipos</b></span>' + I.arrow + '</button>';
  }
  function renderVol(c) {
    R.vol.hidden = S.cat !== 'qu';
    if (S.cat !== 'qu') return;
    var esc_ = CONFIG.ESCALAS;
    R.vol.innerHTML = '<div><p class="ccbf-vol__eyebrow">Compra más, paga menos</p><p class="ccbf-vol__title">Descuento por volumen en químicos</p><p class="ccbf-vol__lead">Suma las piezas de cualquier químico en tu cotización y obtén mejor precio en todos.</p></div>'
      + '<div class="ccbf-tiers">' + esc_.map(function (e, i) {
        var sig = esc_[i + 1];
        return '<div class="ccbf-tier' + (i === c.idx ? ' is-on' : '') + '"><span>' + (sig ? e.min + '–' + (sig.min - 1) + ' piezas' : e.min + '+ piezas') + '</span><strong>' + (e.pct ? '−' + e.pct + '%' : 'Precio Buen Fin') + '</strong></div>';
      }).join('') + '</div><p class="ccbf-vol__txt">' + esc(c.volTxt) + '</p>';
  }
  function renderGrid(c) {
    R.grid.innerHTML = PRODUCTOS.filter(function (p) { return p.cat === S.cat && (S.sub === 'all' || p.sub === S.sub); })
      .map(function (p) { return tplCard(p, c); }).join('');
  }
  function renderCount(c) {
    var cnt = root.querySelector('[data-r="count"]');
    if (cnt) cnt.textContent = c.count;
    R.fab.hidden = !c.count || S.panel;
    R.fab.innerHTML = '<span style="display:inline-flex;align-items:center;gap:10px">' + I.clip + 'Ver mi cotización (' + c.count + ')</span><span class="ccbf-fab__total">' + fmt(c.total) + '</span>';
  }

  function tplField(id, label, attrs, err, nota) {
    return '<label class="ccbf-field' + (err ? ' is-err' : '') + '" data-f="' + id + '">' + label + '<input ' + attrs + ' data-in="' + id + '" value="' + esc(S[id]) + '">'
      + (err ? '<em>' + esc(err) + '</em>' : '') + (nota ? '<small class="ccbf-nota">' + nota + '</small>' : '') + '</label>';
  }
  function tplOpts(k, label, list) {
    return '<div class="ccbf-opts" role="group" aria-label="' + esc(label) + '"><p class="ccbf-opts__lbl">' + label + ' <i>(opcional)</i></p><div class="ccbf-opts__row">'
      + list.map(function (v) { return '<button type="button" class="ccbf-opt" data-a="opt" data-k="' + k + '" data-v="' + esc(v) + '" aria-pressed="' + (S[k] === v) + '">' + esc(v) + '</button>'; }).join('')
      + '</div></div>';
  }
  function tplSucursal() {
    var suc = sucursal();
    if (S.cambiarSuc) {
      return '<label class="ccbf-field">Sucursal que te atiende<select data-in="sucursalManual"><option value="">Según mi estado</option>'
        + SUCURSALES.map(function (s) { return '<option value="' + s.id + '"' + (S.sucursalManual === s.id ? ' selected' : '') + '>' + s.nombre + '</option>'; }).join('')
        + '</select></label>';
    }
    return '<p class="ccbf-suctxt">Te atiende: <b>Sucursal ' + esc(SUC[suc].nombre) + '</b> <button type="button" class="ccbf-link" data-a="cambiarsuc">Cambiar</button></p>';
  }
  function renderPanel() {
    if (!S.panel) { R.panel.hidden = true; document.documentElement.classList.remove('ccbf-lock'); return; }
    var e = S.intento ? errores() : {};
    R.panel.hidden = false;
    document.documentElement.classList.add('ccbf-lock');
    R.panel.innerHTML = '<button type="button" class="ccbf-panel__bg" aria-label="Cerrar" data-a="close"></button>'
      + '<aside class="ccbf-panel__box" role="dialog" aria-modal="true" aria-label="Mi cotización">'
      + '<div class="ccbf-panel__top"><div><h2>Mi cotización</h2><p>Sin compromiso · Promociones ' + esc(CONFIG.VIGENCIA_CORTA) + '</p><p class="ccbf-folio">Folio <span>' + esc(S.folio) + '</span></p></div>'
      + '<button type="button" class="ccbf-x" aria-label="Cerrar" data-a="close">' + I.x + '</button></div>'
      + '<div class="ccbf-panel__scroll">' + tplPasos(' ccbf-pasos--mini')
      + '<div data-r="items"></div><div class="ccbf-sum" data-r="sum"></div>'
      + '<div class="ccbf-form"><p class="ccbf-form__title">¿A quién le mandamos la cotización?</p>'
      + tplField('nombre', 'Nombre *', 'type="text" autocomplete="name"', e.nombre)
      + tplField('telefono', 'WhatsApp *', 'type="tel" inputmode="tel" autocomplete="tel" placeholder="10 dígitos"', e.telefono, 'Al dejar tu número aceptas que un asesor de Clean Center te contacte por WhatsApp.')
      + '<label class="ccbf-field">¿En qué estado estás?<select data-in="estado"><option value="">Elige tu estado</option>'
      + Object.keys(ESTADOS).map(function (st) { return '<option' + (S.estado === st ? ' selected' : '') + '>' + st + '</option>'; }).join('')
      + '</select></label>'
      + '<div data-r="suc">' + tplSucursal() + '</div>'
      + tplOpts('negocio', 'Tipo de negocio', NEGOCIOS)
      + tplOpts('cuando', '¿Cuándo lo necesitas?', CUANDO)
      + tplField('empresa', 'Empresa <i>(opcional)</i>', 'type="text" autocomplete="organization"', '')
      + tplField('correo', 'Correo <i>(opcional)</i>', 'type="email" inputmode="email" autocomplete="email"', e.correo)
      + '<div class="ccbf-hp" aria-hidden="true"><input type="text" tabindex="-1" autocomplete="off" name="website"></div>'
      + '<details class="ccbf-cond"><summary>Ver condiciones</summary><p>Precios con IVA incluido, válidos ' + esc(CONFIG.VIGENCIA) + ' y únicamente en pago de contado. Esta cotización no garantiza el suministro: las existencias se apartan con la confirmación de nuestro equipo de ventas y el pago correspondiente. Por la alta demanda, los pedidos se surten en el orden en que se emiten las facturas y la entrega puede tardar más de lo habitual.</p></details>'
      + '</div></div>'
      + '<div class="ccbf-panel__foot" data-r="foot"></div></aside>';
    renderPanelDyn(calc());
  }
  function renderPanelDyn(c) {
    if (!S.panel) return;
    var items = R.panel.querySelector('[data-r="items"]'), sum = R.panel.querySelector('[data-r="sum"]'), foot = R.panel.querySelector('[data-r="foot"]');
    items.innerHTML = !c.items.length
      ? '<div class="ccbf-empty"><p>Aún no agregas productos. Puedes elegirlos del catálogo, o dejarnos tus datos y un asesor te recomienda qué necesitas.</p><button type="button" class="ccbf-link" data-a="close" data-go="ccbf-catalogo">Ver el catálogo</button></div>'
      : c.items.map(function (it) {
        return '<div class="ccbf-item"><div class="ccbf-item__top"><div class="ccbf-item__info"><small>' + CATS[it.p.cat].name + ' · ' + esc(it.p.sub) + '</small><b>' + esc(it.p.nombre) + '</b><span>' + esc(it.puTxt) + '</span></div><span class="ccbf-item__line">' + fmt(it.linea) + '</span></div>'
          + '<div class="ccbf-item__ctl"><div class="ccbf-item__qty"><button type="button" class="ccbf-qbtn" aria-label="Quitar una pieza" data-a="minus" data-v="' + esc(it.id) + '">−</button><b>' + it.q + '</b><button type="button" class="ccbf-qbtn" aria-label="Agregar una pieza" data-a="add" data-v="' + esc(it.id) + '"' + (it.q >= maxDe(it.p) ? ' disabled' : '') + '>+</button></div>'
          + '<button type="button" class="ccbf-link" data-a="rm" data-v="' + esc(it.id) + '">Quitar</button></div></div>';
      }).join('');
    var s = '';
    if (c.items.length) {
      var min = CONFIG.ENVIO_MINIMO;
      s += c.total > min ? '<p class="ccbf-envio-ok">' + I.check + 'Tu cotización incluye envío</p>'
        : '<div class="ccbf-envio"><p>' + I.van + 'Te faltan ' + fmt(Math.max(0, min - c.total)) + ' para envío incluido</p><div class="ccbf-bar"><i style="width:' + Math.min(100, Math.round(c.total / min * 100)) + '%"></i></div></div>';
      if (c.pct) s += '<div class="ccbf-row"><span>Descuento por volumen en químicos (−' + c.pct + '%)</span><strong>−' + fmt(c.descuento) + '</strong></div>';
      if (c.quPiezas) s += '<p class="ccbf-volnote">' + esc(c.volTxt) + '</p>';
      if (c.ahorro > 0) s += '<div class="ccbf-ahorro"><div><small>Tu ahorro estimado</small><span>Buen Fin + descuento por volumen</span></div><strong>' + fmt(c.ahorro) + '</strong></div>';
    }
    sum.innerHTML = s;
    var listo = !Object.keys(errores()).length;
    // El pie se actualiza en su lugar (sin reemplazar el botón) para que el toque no se pierda
    if (!foot.firstChild) foot.innerHTML = '<div class="ccbf-total" data-r="totalrow"><span>Total estimado <i>(IVA incluido)</i></span><strong data-r="total"></strong></div>'
      + '<p class="ccbf-ok" data-r="ok" hidden></p>'
      + '<a class="ccbf-send" data-a="send" target="_blank" rel="noopener" href="#">' + I.wa + '<span data-r="sendlbl"></span></a>'
      + '<p class="ccbf-tranq">' + I.check + '<span>Sin compromiso · No pagas nada aquí · Un asesor te confirma existencias, envío y forma de pago</span></p>';
    foot.querySelector('[data-r="totalrow"]').hidden = !c.items.length;
    foot.querySelector('[data-r="total"]').textContent = fmt(c.total);
    foot.querySelector('[data-r="sendlbl"]').textContent = c.items.length ? 'Pedir mi cotización por WhatsApp' : 'Quiero que un asesor me recomiende';
    var ok = foot.querySelector('[data-r="ok"]');
    ok.hidden = !S.enviado; ok.textContent = '¡Listo! Tu solicitud ' + S.folio + ' se abrió en WhatsApp. Si no se envió, toca el botón otra vez.';
    foot.querySelector('[data-a="send"]').setAttribute('href', listo ? waLink(CONFIG.WHATSAPP[sucursal()], mensaje(c)) : '#');
  }
  function renderSuc() { var el = R.panel.querySelector('[data-r="suc"]'); if (el) el.innerHTML = tplSucursal(); }

  function renderAll() { var c = calc(); renderCatalogo(c); renderCount(c); renderPanelDyn(c); }

  /* ---------------- ACCIONES ---------------- */
  function setQty(id, q) {
    var p = POR_ID[id]; if (!p) return;
    var antes = S.cart[id] || 0;
    q = Math.max(0, Math.min(q, maxDe(p)));
    if (q === 0) delete S.cart[id]; else S.cart[id] = q;
    if (q > antes) dl('cc_bf_agregar', { producto: p.nombre, codigo: p.codigo || p.id, precio: p.precio, categoria: CATS[p.cat].name });
    S.enviado = false; persist();
    var c = calc();
    renderVol(c); renderGrid(c); renderCount(c); renderPanelDyn(c);
    if (telOk(S.telefono)) programarParcial();
  }
  function scrollA(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function abrir(src) {
    S.panel = true; renderPanel(); renderCount(calc());
    dl('cc_bf_abrir_cotizacion', { origen: src || 'boton' });
    var x = R.panel.querySelector('.ccbf-x'); if (x) x.focus({ preventScroll: true });
  }
  function cerrar() {
    S.panel = false; renderPanel(); renderCount(calc());
    if (telOk(S.telefono)) { clearTimeout(tParcial); enviarParcial(); }
  }
  function preguntar(b) {
    var p = POR_ID[b.getAttribute('data-v')]; if (!p) return;
    var msg = 'Hola, me interesa el ' + p.nombre + (p.codigo ? ' (Código ' + p.codigo + ')' : '') + ' de las promociones Buen Fin de Clean Center, a ' + fmt(p.precio) + '. ¿Me dan más información?'
      + (S.nombre.trim() ? '\n\nSoy ' + S.nombre.trim() + (S.empresa.trim() ? ', de ' + S.empresa.trim() : '') + (S.estado ? ' (' + S.estado + ')' : '') + '.' : '');
    b.setAttribute('href', waLink(CONFIG.WHATSAPP[sucursal()], msg));
    dl('cc_bf_pregunta_producto', { producto: p.nombre, codigo: p.codigo || p.id });
    // Si ya conocemos su WhatsApp, también queda registrado en la hoja
    if (telOk(S.telefono) && S.nombre.trim()) {
      var pl = payloadBase('pregunta', nuevoFolio(), null);
      pl.items = [{ codigo: p.codigo || p.id, nombre: p.nombre, cantidad: 1, importe: p.precio }];
      pl.total = p.precio; pl.piezas = 1;
      postear(pl);
    }
  }

  function onClick(ev) {
    var go = ev.target.closest('[data-go]');
    if (go && root.contains(go)) {
      ev.preventDefault();
      if (go.getAttribute('data-a') === 'close') cerrar();
      scrollA(go.getAttribute('data-go')); return;
    }
    var b = ev.target.closest('[data-a]'); if (!b || !root.contains(b)) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
    if (a === 'cat') { S.cat = v; S.sub = 'all'; renderCatalogo(calc()); }
    else if (a === 'sub') { S.sub = v; renderCatalogo(calc()); }
    else if (a === 'ir') { S.cat = v; S.sub = 'all'; renderCatalogo(calc()); scrollA('ccbf-catalogo'); }
    else if (a === 'add') setQty(v, (S.cart[v] || 0) + 1);
    else if (a === 'minus') setQty(v, (S.cart[v] || 0) - 1);
    else if (a === 'rm') setQty(v, 0);
    else if (a === 'open') { ev.preventDefault(); abrir(b.getAttribute('data-src')); }
    else if (a === 'close') cerrar();
    else if (a === 'ask') preguntar(b);
    else if (a === 'cambiarsuc') { S.cambiarSuc = true; renderSuc(); var sel = R.panel.querySelector('[data-in="sucursalManual"]'); if (sel) sel.focus(); }
    else if (a === 'opt') {
      var k = b.getAttribute('data-k');
      S[k] = S[k] === v ? '' : v;
      b.parentNode.querySelectorAll('.ccbf-opt').forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-v') === S[k])); });
      S.enviado = false; persist(); renderPanelDyn(calc());
      if (telOk(S.telefono)) programarParcial();
    }
    else if (a === 'send') {
      var c = calc();
      if (Object.keys(errores()).length) {
        ev.preventDefault(); S.intento = true;
        renderPanel();
        var first = R.panel.querySelector('.ccbf-field.is-err input, .ccbf-field.is-err select');
        if (first) { first.scrollIntoView({ block: 'center' }); first.focus({ preventScroll: true }); }
        return;
      }
      clearTimeout(tParcial);
      var tipo = c.items.length ? 'cotizacion' : 'asesoria';
      postear(payloadBase(tipo, S.folio, c));
      dl('cc_bf_pedido_whatsapp', { tipo: tipo, value: Math.round(c.total * 100) / 100, currency: 'MXN', sucursal: sucursal() });
      S.enviadoFolio = S.folio; S.enviado = true; persist();
      setTimeout(function () { renderPanelDyn(calc()); }, 400);
    }
  }
  function onInput(ev) {
    var k = ev.target.getAttribute && ev.target.getAttribute('data-in'); if (!k) return;
    if (S[k] === ev.target.value) return;
    S[k] = ev.target.value; S.enviado = false; persist();
    if (!S.iniciado) { S.iniciado = true; dl('cc_bf_inicia_formulario'); }
    if (k === 'estado' && !S.cambiarSuc) renderSuc();
    if (S.intento) {
      var e = errores(), f = R.panel.querySelector('[data-f="' + k + '"]');
      if (f) { f.classList.toggle('is-err', !!e[k]); var em = f.querySelector('em'); if (!e[k] && em) em.remove(); }
    }
    renderPanelDyn(calc());
    if (telOk(S.telefono)) programarParcial();
  }

  /* ---------------- INICIO ---------------- */
  function init() {
    var mount = document.querySelector(CONFIG.MOUNT);
    if (!mount) { mount = document.createElement('div'); if (SCRIPT && SCRIPT.parentNode) SCRIPT.parentNode.insertBefore(mount, SCRIPT); else document.body.appendChild(mount); }
    root = document.createElement('div'); root.id = 'ccbf';
    root.innerHTML = tplShell();
    mount.appendChild(root);
    ['catname', 'subs', 'vol', 'grid', 'next', 'fab', 'panel'].forEach(function (k) { R[k] = root.querySelector('[data-r="' + k + '"]'); });
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.panel) cerrar(); });
    window.addEventListener('pagehide', function () { if (telOk(S.telefono)) { clearTimeout(tParcial); enviarParcial(); } });
    renderAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
