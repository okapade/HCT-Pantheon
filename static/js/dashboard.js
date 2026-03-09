/* ═══ AUTH: Handled by Flask /login — old gate removed ═══ */

/* ═══ PANTHEON — Platform JS ═══ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
let D = {};
let simMode = null, simRunning = false, simAbort = null;
let chatHistory = [];
let currentView = 'home';
let facilityConfig = null;
let configStep = 0;
let userRole = null;
let emStep = 0, emData = {};

/* ═══ SVG ICONS ═══ */
const ICONS = {
  datacenter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="6" rx="1.5"/><rect x="3" y="11" width="18" height="6" rx="1.5"/><circle cx="7" cy="6" r=".8" fill="currentColor"/><circle cx="7" cy="14" r=".8" fill="currentColor"/><line x1="11" y1="6" x2="17" y2="6"/><line x1="11" y1="14" x2="17" y2="14"/><line x1="3" y1="20" x2="9" y2="20"/><line x1="15" y1="20" x2="21" y2="20"/></svg>`,
  ev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M13 2L3 14h8l-1 8 10-12h-8z"/></svg>`,
  solar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="6" r="3.5"/><line x1="12" y1="1" x2="12" y2="2"/><line x1="12" y1="10" x2="12" y2="11"/><line x1="7" y1="6" x2="6" y2="6"/><line x1="18" y1="6" x2="17" y2="6"/><rect x="2" y="14" width="20" height="7" rx="1.5"/><line x1="2" y1="17.5" x2="22" y2="17.5"/><line x1="8" y1="14" x2="8" y2="21"/><line x1="16" y1="14" x2="16" y2="21"/></svg>`,
  warehouse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 10L12 4l10 6v10H2z"/><rect x="8" y="14" width="8" height="6"/><line x1="12" y1="14" x2="12" y2="20"/></svg>`,
  manufacturing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 20V8l6 4V8l6 4V8l6 4v8z"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  telecom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><line x1="12" y1="2" x2="12" y2="22"/><path d="M8 6l4-4 4 4"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="6" y1="14" x2="18" y2="14"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
  marine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M4 16l2-10h12l2 10"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="9" y1="2" x2="15" y2="2"/></svg>`,
  aviation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2L8 8h-5l3 4-2 8h2l6-5 6 5h2l-2-8 3-4h-5z"/></svg>`,
  hospital: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 9h18"/><rect x="9" y="13" width="6" height="8"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="10" y1="3.5" x2="14" y2="3.5"/></svg>`,
  custom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2c1 4-2 6-2 10a4 4 0 008 0c0-3-2-4-2-6"/><path d="M12 18a2 2 0 01-2-2c0-1.5 2-3 2-3s2 1.5 2 3a2 2 0 01-2 2z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2l8 4v6c0 5.5-3.8 9.7-8 11-4.2-1.3-8-5.5-8-11V6z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20" stroke-linecap="round"/></svg>`,
  drone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="6" cy="6" rx="4" ry="1.5"/><ellipse cx="18" cy="6" rx="4" ry="1.5"/><ellipse cx="6" cy="18" rx="4" ry="1.5"/><ellipse cx="18" cy="18" rx="4" ry="1.5"/><line x1="6" y1="7.5" x2="10" y2="10"/><line x1="18" y1="7.5" x2="14" y2="10"/><line x1="6" y1="16.5" x2="10" y2="14"/><line x1="18" y1="16.5" x2="14" y2="14"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  suppression: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2c0 6-8 9-8 16h16c0-7-8-10-8-16z"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
  detection: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/><path d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/></svg>`,
  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><line x1="12" y1="13" x2="12" y2="21"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2l3 6h6.5l-5 4 2 6.5L12 15l-6.5 3.5 2-6.5-5-4H9z"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>`,
};
function icon(name, cls) { return `<span class="ico${cls ? ' ' + cls : ''}">${ICONS[name] || ''}</span>` }

/* ═══ BOOT ═══ */

/* ═══ TELEMETRY ═══ */
function _logAction(action, d1, d2, d3) {
  try { fetch('/api/telemetry/action', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:action,detail1:d1||'',detail2:d2||'',detail3:d3||''}) }).catch(()=>{}) } catch(e){}
}
function _logSim(mode, fc) {
  try { fetch('/api/telemetry/simulation', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({mode:mode,facility_type:fc?.typeName||fc?.type||'',chemistry:fc?.battery||'',modules:String(fc?.modules||''),suppression:fc?.suppression||'',acts:0,pdf_exported:'No',ai_questions:0}) }).catch(()=>{}) } catch(e){}
}
function _logProduct(product, source) {
  try { fetch('/api/telemetry/product', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({product:product,source:source||'',time_on:0,clicked_learn_more:'No'}) }).catch(()=>{}) } catch(e){}
}
function _logChat(msg) {
  try { fetch('/api/log/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:msg.substring(0,200)}) }).catch(()=>{}) } catch(e){}
}

window.addEventListener('DOMContentLoaded', async () => {
  try { const r = await fetch('/api/incident'); D = await r.json() } catch { D = {} }
  populateFacilityGrid();
  checkAPI();
  setTimeout(() => {
    $('#boot').classList.add('out');
    $('#app').classList.add('on');
    setTimeout(() => { const b = $('#boot'); if (b) b.remove() }, 600);
  }, 2200);
  initRail(); initContextPanel(); initConfigFlow(); initSimButtons(); initChat(); initCatalog(); initChannels(); initRoleSelector(); initEmergency(); initSettings(); initSecurity(); initTheme(); initMonitor(); initTraining();
  // Try auto-detecting location for jurisdiction standards
  if (typeof tryGeolocation === 'function') setTimeout(tryGeolocation, 3000);
});

/* ═══ RAIL ═══ */
function initRail() {
  $$('.rail-btn[data-view]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  $('#railLogo').addEventListener('click', () => switchView('home'));
}
function switchView(view) {
  currentView = view;
  $$('.rail-btn').forEach(b => b.classList.remove('active'));
  const ab = $(`.rail-btn[data-view="${view}"]`); if (ab) ab.classList.add('active');
  $$('.main-view').forEach(v => v.classList.remove('main-active'));
  const tv = $(`#view${cap(view)}`); if (tv) tv.classList.add('main-active');
  $$('.ctx-view').forEach(v => v.classList.remove('ctx-active'));
  const tc = $(`#ctx${cap(view)}`); if (tc) tc.classList.add('ctx-active');
  const titles = { home: 'PANTHEON', simulate: 'OBSERVATORY', catalog: 'CATALOG', channels: 'CHANNELS', emergency: 'RESPONSE', monitor: 'MONITOR', training: 'TRAINING', security: 'SECURITY', settings: 'SETTINGS', history: 'HISTORY' };
  $('#ctxTitle').textContent = titles[view] || 'PANTHEON';
  _logAction('Viewed Section', view);
  // Load history when switching to history view
  if (view === 'history') loadHistoryView();
}

/* ── HISTORY VIEW ─────────────────────────────────────────── */
async function loadHistoryView() {
  var list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = '<div class="history-loading">Loading conversations...</div>';
  try {
    var r = await fetch('/api/user/chats');
    if (!r.ok) { list.innerHTML = '<div class="history-empty">Could not load history.</div>'; return; }
    var d = await r.json();
    var chats = d.chats || [];
    if (!chats.length) {
      list.innerHTML = '<div class="history-empty">No conversations yet. Ask Pantheon something to get started.</div>';
      return;
    }
    // Group by date
    var groups = {};
    var groupOrder = [];
    chats.forEach(function(c) {
      var ts = c.timestamp ? new Date(c.timestamp) : null;
      var label = ts ? ts.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }) : 'Unknown date';
      if (!groups[label]) { groups[label] = []; groupOrder.push(label); }
      groups[label].push(c);
    });
    var html = '';
    groupOrder.forEach(function(label) {
      html += '<div class="history-group-label">' + label + '</div>';
      groups[label].forEach(function(c) {
        var ts = c.timestamp ? new Date(c.timestamp) : null;
        var time = ts ? ts.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }) : '';
        var q = escHtml((c.question || '').substring(0, 120));
        var fac = c.facility_type ? escHtml(c.facility_type) : '';
        html += '<div class="history-item" onclick="replayChat(' + JSON.stringify(c.question || '') + ')">' +
          '<div class="history-item-q">' + (q || '<em style="color:var(--t3)">Message recorded</em>') + '</div>' +
          '<div class="history-item-meta">' +
            '<span class="history-item-time">' + time + '</span>' +
            (c.view ? '<span class="history-item-view">' + escHtml(c.view) + '</span>' : '') +
            (fac ? '<span class="history-item-fac">' + fac + '</span>' : '') +
          '</div>' +
        '</div>';
      });
    });
    list.innerHTML = html;
  } catch(e) {
    list.innerHTML = '<div class="history-empty">Error loading history.</div>';
  }
}

function replayChat(question) {
  if (!question) return;
  switchView('home');
  setTimeout(function() {
    var input = document.getElementById('homeChat');
    if (input) { input.value = question; input.focus(); }
  }, 300);
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

/* ═══ CONTEXT PANEL ═══ */
function initContextPanel() {
  $('#ctxCollapse').addEventListener('click', () => {
    $('#context').classList.add('collapsed');
    $('#app').classList.add('ctx-collapsed');
  });
  $('#railExpand').addEventListener('click', () => {
    $('#context').classList.remove('collapsed');
    $('#app').classList.remove('ctx-collapsed');
  });
  $$('.ctx-sh-toggle').forEach(t => t.addEventListener('click', () => {
    const a = t.querySelector('.ctx-arrow'), l = t.nextElementSibling;
    if (a) a.classList.toggle('open'); if (l) l.classList.toggle('open');
  }));
}

/* ═══ API ═══ */
async function checkAPI() {
  try {
    const r = await fetch('/api/status'), d = await r.json(), ok = d.has_key;
    $('#ctxApiDot').textContent = ok ? 'System Online' : 'Connecting...';
    if (!ok) { $('.ctx-footer .ctx-dot').className = 'ctx-dot dot-warn'; $('.rail-dot').className = 'rail-dot dot-warn' }
  } catch { $('#ctxApiDot').textContent = 'Offline' }
}

/* ═══ SIDEBAR PROGRESSIVE DISCLOSURE ═══ */
function showFacilityInfo(ftype) {
  const el = $('#ctxFacilityInfo'); if (!el) return;
  el.classList.remove('hidden');
  $('#ctxFacilityDetail').innerHTML = `<div class="ctx-facility-name">${ftype.name}</div><div class="ctx-facility-sub">${ftype.sub}</div>`;
}
function populateThreatLandscape() {
  const sec = $('#ctxThreatSection'); if (!sec) return;
  sec.classList.remove('hidden');
  const fc = facilityConfig;
  // Dynamic stats based on config
  const modules = fc.modules || 384;
  const chem = fc.battery || 'NMC';
  const supp = fc.suppression || 'FM-200';
  // Risk score based on chemistry
  const chemRisk = { 'NMC': 89, 'NCA': 92, 'LFP': 34, 'LTO': 18 };
  const risk = chemRisk[chem] || 75;
  // Loss estimate based on modules & type
  const lossPerModule = chem === 'LFP' ? 8000 : chem === 'NCA' ? 140000 : 122000;
  const rawLoss = modules * lossPerModule;
  const lossStr = rawLoss >= 1e6 ? `$${(rawLoss / 1e6).toFixed(0)}M` : rawLoss >= 1e3 ? `$${(rawLoss / 1e3).toFixed(0)}K` : `$${rawLoss}`;
  // Suppression effectiveness
  const suppEff = { 'F-500 EA': 93, 'None': 0, 'FM-200': 12, 'CO2': 18, 'Halon': 15, 'Sprinkler': 22 };
  const eff = suppEff[supp] ?? 10;
  const ts = $('#ctxThreatStats'); if (!ts) return;
  ts.innerHTML = `<div class="ctx-stat"><div class="ctx-stat-val ${risk > 70 ? 'red' : risk > 40 ? 'yellow' : 'green'}">${risk}%</div><div class="ctx-stat-label">${chem} runaway risk</div></div>
    <div class="ctx-stat"><div class="ctx-stat-val yellow">${lossStr}</div><div class="ctx-stat-label">Estimated exposure</div></div>
    <div class="ctx-stat"><div class="ctx-stat-val">${modules}</div><div class="ctx-stat-label">Battery modules</div></div>
    <div class="ctx-stat"><div class="ctx-stat-val ${eff > 50 ? 'green' : eff > 20 ? 'yellow' : 'red'}">${eff}%</div><div class="ctx-stat-label">${supp} effectiveness</div></div>`;
  // Dynamic suppression gap based on their current suppression
  const gap = $('#ctxGap'); if (!gap) return;
  let gapHtml = '';
  if (supp === 'FM-200') gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-red"></span>FM-200 cannot arrest Li-ion thermal runaway</div>`;
  if (supp === 'CO2') gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-red"></span>CO₂ provides insufficient cooling for ${chem}</div>`;
  if (supp === 'Halon') gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-warn"></span>Halon is banned/restricted — phase-out required</div>`;
  if (supp === 'Sprinkler') gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-warn"></span>Water alone cannot suppress ${chem} runaway</div>`;
  if (supp === 'None') gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-red"></span>No suppression — catastrophic exposure</div>`;
  if (supp !== 'F-500 EA') {
    if (chem === 'NMC' || chem === 'NCA') gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-red"></span>${chem} chemistry — high energy density, high risk</div>`;
    gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-ok"></span>F-500 EA encapsulates all 3 vectors</div>`;
    gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-ok"></span>Smart-LX® detects before ignition</div>`;
    gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-ok"></span>VEEP prevents explosion cascade</div>`;
  } else {
    gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-ok"></span>F-500 EA active — flammability mitigated</div>`;
    gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-ok"></span>Add Smart-LX® for early detection layer</div>`;
    gapHtml += `<div class="ctx-gap-row"><span class="ctx-gap-dot dot-ok"></span>Add VEEP for full automated response</div>`;
  }
  gap.innerHTML = gapHtml;
}

/* ═══ FACILITY TYPES ═══ */
function getFacilityTypes() {
  return [
    { id: 'datacenter', svg: 'datacenter', name: 'Data Center', sub: 'Server, UPS, BESS', battery: 'NMC', modules: 384, suppression: 'FM-200', employees: 150, revenue: 50000000, sector: 'Information', services: 647, loss: '$47M', partialLoss: '$3.2M' },
    { id: 'ev-charging', svg: 'ev', name: 'EV Charging', sub: 'Level 2/3, buffer', battery: 'NMC/LFP', modules: 48, suppression: 'None', employees: 25, revenue: 8000000, sector: 'Transportation', services: 12, loss: '$8M', partialLoss: '$1.1M' },
    { id: 'solar-bess', svg: 'solar', name: 'Solar / BESS', sub: 'Grid-scale storage', battery: 'LFP/NMC', modules: 960, suppression: 'None', employees: 40, revenue: 25000000, sector: 'Utilities', services: 50, loss: '$85M', partialLoss: '$6M' },
    { id: 'warehouse', svg: 'warehouse', name: 'Warehouse', sub: 'AGV, charging bays', battery: 'LFP', modules: 120, suppression: 'Sprinkler', employees: 200, revenue: 35000000, sector: 'Wholesale Trade', services: 200, loss: '$22M', partialLoss: '$2.5M' },
    { id: 'manufacturing', svg: 'manufacturing', name: 'Manufacturing', sub: 'Process, backup', battery: 'NMC', modules: 96, suppression: 'CO2', employees: 300, revenue: 75000000, sector: 'Manufacturing', services: 80, loss: '$35M', partialLoss: '$4M' },
    { id: 'telecom', svg: 'telecom', name: 'Telecom', sub: 'Tower BESS, backup', battery: 'LFP/NMC', modules: 64, suppression: 'None', employees: 30, revenue: 12000000, sector: 'Information', services: 500, loss: '$12M', partialLoss: '$1.5M' },
    { id: 'marine', svg: 'marine', name: 'Marine', sub: 'Hybrid propulsion', battery: 'NMC', modules: 200, suppression: 'CO2', employees: 80, revenue: 30000000, sector: 'Transportation', services: 300, loss: '$60M', partialLoss: '$5M' },
    { id: 'aviation', svg: 'aviation', name: 'Aviation', sub: 'GSE, APU backup', battery: 'NMC/LFP', modules: 80, suppression: 'Halon', employees: 120, revenue: 45000000, sector: 'Transportation', services: 150, loss: '$28M', partialLoss: '$3M' },
    { id: 'hospital', svg: 'hospital', name: 'Healthcare', sub: 'Critical backup', battery: 'NMC', modules: 72, suppression: 'FM-200', employees: 500, revenue: 100000000, sector: 'Health Care', services: 400, loss: '$40M', partialLoss: '$4.5M' },
    { id: 'custom', svg: 'custom', name: 'Custom', sub: 'Your setup', battery: '---', modules: 0, suppression: 'Unknown', services: 0, loss: '---', partialLoss: '---' }
  ];
}

function populateFacilityGrid() {
  const grid = $('#fsGrid'); if (!grid) return;
  grid.innerHTML = getFacilityTypes().map(t =>
    `<div class="fs-card${t.id === 'custom' ? ' fs-card-custom' : ''}" data-type="${t.id}">
      ${icon(t.svg, 'fs-card-icon')}
      <div class="fs-card-title">${t.name}</div>
      <div class="fs-card-sub">${t.sub}</div>
    </div>`
  ).join('');
  grid.querySelectorAll('.fs-card').forEach(c => c.addEventListener('click', () => selectFacilityType(c.dataset.type)));
}

function selectFacilityType(typeId) {
  const type = getFacilityTypes().find(t => t.id === typeId); if (!type) return;
  $$('.fs-card').forEach(c => c.classList.remove('selected'));
  const sel = $(`.fs-card[data-type="${typeId}"]`); if (sel) sel.classList.add('selected');
  facilityConfig = { type: typeId, typeName: type.name, svg: type.svg, battery: type.battery, modules: type.modules, suppression: type.suppression, services: type.services, loss: type.loss, partialLoss: type.partialLoss, employees: type.employees || 150, revenue: type.revenue || 50000000, sector: type.sector || 'Information', facilityName: '', region: '', customNotes: '' }
  configStep = 0;
  showFacilityInfo(type);
  showConfigFlow();
  // Re-render training with facility-aware gaps and badge
  setTimeout(function() {
    renderTrainingPrescriptions();
    renderTrainingCtx();
    var gaps = getTrainingGaps();
    if (gaps.length > 0 && typeof addRailBadge === 'function') addRailBadge('training', gaps.length);
    var critical = gaps.filter(function(g) { return g.priority === 'CRITICAL'; }).length;
    if (critical > 0 && typeof showToast === 'function') {
      showToast(critical + ' critical training gap' + (critical > 1 ? 's' : '') + ' detected — ' + type.name, 'warning', 4500);
    }
  }, 300);
}

/* ═══ CONFIG FLOW ═══ */
function initConfigFlow() {
  $('#cfNext').addEventListener('click', nextConfigStep);
  $('#cfBack').addEventListener('click', prevConfigStep);
}
function showConfigFlow() {
  $('#configFlow').classList.remove('hidden');
  $('#scenarioSelect').classList.add('hidden');
  $('#homeCenter').classList.add('no-center');
  $('#cfHeader').textContent = `Configure: ${facilityConfig.typeName}`;
  renderConfigStep();
  $('#configFlow').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function nextConfigStep() { saveConfigInputs(); configStep++; renderConfigStep() }
function prevConfigStep() { saveConfigInputs(); configStep = Math.max(0, configStep - 1); renderConfigStep() }

function renderProgressBar() {
  const total = facilityConfig.type === 'custom' ? 1 : 4;
  const p = $('#cfProgress');
  p.innerHTML = Array.from({ length: total }, (_, i) =>
    `<div class="cf-progress-step ${i < configStep ? 'done' : i === configStep ? 'active' : ''}"></div>`
  ).join('');
}

function renderConfigStep() {
  const body = $('#cfBody'), back = $('#cfBack'), next = $('#cfNext');
  back.classList.toggle('hidden', configStep === 0);
  renderProgressBar();
  if (facilityConfig.type === 'custom') { renderCustomStep(body, next); return }
  switch (configStep) {
    case 0:
      body.innerHTML = `<div class="cf-step"><div class="cf-step-title">Step 1 — Facility details</div>
        <div class="cf-field"><label class="cf-label">Facility name</label><input class="cf-input" id="cfName" placeholder="e.g. Ashburn DC-${facilityConfig.facilityName ? `" value="${facilityConfig.facilityName}` : ''}"></div>
        <div class="cf-field"><label class="cf-label">City, State, Country <span class="cf-label-hint">— use full names, no abbreviations</span></label><input class="cf-input" id="cfRegion" placeholder="e.g. Ashburn, Virginia, United States" value="${facilityConfig.region || ''}"></div>
        <div id="cfStandardsSummary" class="hidden"></div>
        <div class="cf-field"><label class="cf-label">Facility classification</label><div class="cf-chips" id="cfClass">
          ${(function(){
            var classMap = {
              datacenter: ['Tier I','Tier II','Tier III','Tier IV'],
              'solar-bess': ['Utility-Scale','C&I','Residential','Microgrid'],
              warehouse: ['Distribution','Cold Storage','Fulfillment','General'],
              manufacturing: ['Heavy Industrial','Light Industrial','Cleanroom','Assembly'],
              'ev-charging': ['Level 2 Hub','DC Fast','Fleet Depot','Mixed'],
              telecom: ['Cell Tower','Central Office','Edge Node','Macro Site'],
              marine: ['Container Port','Cruise Terminal','Dry Dock','Offshore'],
              aviation: ['Commercial Hangar','MRO Facility','FBO','Cargo'],
              hospital: ['Level I Trauma','Community Hospital','Clinic','Surgical Center']
            };
            var opts = classMap[facilityConfig.type] || ['Standard','Critical','High-Value','General'];
            return opts.map(function(v){return '<div class="cf-chip'+(facilityConfig.classification===v?' selected':'')+'" data-val="'+v+'">'+v+'</div>'}).join('');
          })()}
        </div></div></div>`;
      initChipSelect('cfClass');
      // Listen for region input to trigger standards detection
      const regionInput = $('#cfRegion');
      if (regionInput) {
        regionInput.addEventListener('blur', function() {
          if (this.value && typeof onRegionEntered === 'function') onRegionEntered(this.value);
        });
        // Also trigger on Enter key
        regionInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && this.value && typeof onRegionEntered === 'function') onRegionEntered(this.value);
        });
      }
      next.textContent = 'Next'; break;
    case 1:
      body.innerHTML = `<div class="cf-step"><div class="cf-step-title">Step 2 — Battery system</div>
        <div class="cf-field"><label class="cf-label">Battery chemistry</label><div class="cf-chips" id="cfChem">
          ${['NMC', 'LFP', 'NMC/LFP', 'NCA', 'Unknown'].map(v => `<div class="cf-chip${facilityConfig.battery === v ? ' selected' : ''}" data-val="${v}">${v}</div>`).join('')}
        </div></div>
        <div class="cf-field"><label class="cf-label">Module count</label><div class="cf-range-row"><input type="range" class="cf-range" id="cfModules" min="1" max="2000" value="${facilityConfig.modules}"><span class="cf-range-val" id="cfModVal">${facilityConfig.modules}</span></div></div>
        <div class="cf-field"><label class="cf-label">Battery age (years)</label><div class="cf-range-row"><input type="range" class="cf-range" id="cfAge" min="0" max="15" value="${facilityConfig.batteryAge || 3}"><span class="cf-range-val" id="cfAgeVal">${facilityConfig.batteryAge || 3}yr</span></div></div>
      </div>`;
      initChipSelect('cfChem');
      const mr = $('#cfModules'), mv = $('#cfModVal'); if (mr) mr.oninput = () => { mv.textContent = mr.value; facilityConfig.modules = +mr.value };
      const ar = $('#cfAge'), av = $('#cfAgeVal'); if (ar) ar.oninput = () => { av.textContent = ar.value + 'yr'; facilityConfig.batteryAge = +ar.value };
      next.textContent = 'Next'; break;
    case 2:
      body.innerHTML = `<div class="cf-step"><div class="cf-step-title">Step 3 — Suppression & detection</div>
        <div class="cf-field"><label class="cf-label">Current suppression</label><div class="cf-chips" id="cfSupp">
          ${['FM-200', 'CO2', 'Sprinkler', 'Halon', 'None', 'F-500 EA'].map(v => `<div class="cf-chip${facilityConfig.suppression === v ? ' selected' : ''}" data-val="${v}">${v}</div>`).join('')}
        </div></div>
        <div class="cf-field"><label class="cf-label">Detection (select all)</label><div class="cf-chips multi" id="cfDetect">
          ${['VESDA', 'Spot', 'Off-Gas', 'Thermal', 'BMS', 'None'].map(v => `<div class="cf-chip" data-val="${v}">${v}</div>`).join('')}
        </div></div>
        <div class="cf-field"><label class="cf-label">EPO INSTALLED?</label><div class="cf-chips" id="cfEPO">
          ${['Yes', 'No', 'Unknown'].map(v => `<div class="cf-chip" data-val="${v}">${v}</div>`).join('')}
        </div></div></div>`;
      initChipSelect('cfSupp'); initChipSelect('cfDetect', true); initChipSelect('cfEPO');
      next.textContent = 'Next'; break;
    case 3:
      body.innerHTML = `<div class="cf-step"><div class="cf-step-title">Step 4 — Facility economics</div>
        <div class="cf-field"><label class="cf-label">Number of employees</label><div class="cf-range-row"><input type="range" class="cf-range" id="cfEmployees" min="10" max="2000" value="${facilityConfig.employees || 150}"><span class="cf-range-val" id="cfEmpVal">${facilityConfig.employees || 150}</span></div></div>
        <div class="cf-field"><label class="cf-label">Annual revenue ($)</label><div class="cf-range-row"><input type="range" class="cf-range" id="cfRevenue" min="1000000" max="500000000" step="1000000" value="${facilityConfig.revenue || 50000000}"><span class="cf-range-val" id="cfRevVal">$${((facilityConfig.revenue || 50000000)/1000000).toFixed(0)}M</span></div></div>
      </div>`;
      const er = $('#cfEmployees'), ev2 = $('#cfEmpVal'); if (er) er.oninput = () => { ev2.textContent = er.value; facilityConfig.employees = +er.value };
      const rr = $('#cfRevenue'), rv = $('#cfRevVal'); if (rr) rr.oninput = () => { rv.textContent = '$' + (+rr.value/1000000).toFixed(0) + 'M'; facilityConfig.revenue = +rr.value };
      next.textContent = 'Review'; break;
    case 4: showScenarioSelect(); return;
  }
}
function renderCustomStep(body, next) {
  if (configStep === 0) {
    body.innerHTML = `<div class="cf-step"><div class="cf-step-title">DESCRIBE YOUR FACILITY</div>
      <div class="cf-field"><label class="cf-label">Facility name</label><input class="cf-input" id="cfName" placeholder="e.g. Port Terminal B" value="${facilityConfig.facilityName || ''}"></div>
      <div class="cf-field"><label class="cf-label">City, State, Country <span class="cf-label-hint">— full names, no abbreviations</span></label><input class="cf-input" id="cfRegion" placeholder="e.g. Houston, Texas, United States" value="${facilityConfig.region || ''}"></div>
      <div class="cf-field"><label class="cf-label">Description</label><textarea class="cf-input" id="cfCustom" rows="4" placeholder="Battery systems, fire protection, concerns...">${facilityConfig.customNotes || ''}</textarea></div></div>`;
    next.textContent = 'Configure';
  } else { saveConfigInputs(); showScenarioSelect() }
}
function updateLocationIndicator() {
  var loc = facilityConfig ? facilityConfig.region : '';
  var el = document.getElementById('ctxLocationLabel');
  if (el && loc) { el.textContent = loc; el.parentElement.classList.remove('hidden'); }
}

function promptLocationChange() {
  var current = facilityConfig ? facilityConfig.region : '';
  var newLoc = prompt('Enter your facility location (City, State, Country):', current);
  if (newLoc && newLoc.trim()) {
    facilityConfig.region = newLoc.trim();
    updateLocationIndicator();
    if (typeof onRegionEntered === 'function') onRegionEntered(newLoc.trim());
    if (typeof showToast === 'function') showToast('Location updated to: ' + newLoc.trim(), 'ok', 3000);
    _logAction('Changed Location', newLoc.trim());
  }
}
function saveConfigInputs() {
  const n = $('#cfName'); if (n) facilityConfig.facilityName = n.value;
  const r = $('#cfRegion'); if (r) {
    facilityConfig.region = r.value;
    updateLocationIndicator();
    // Trigger jurisdiction-aware standards detection
    if (r.value && typeof onRegionEntered === 'function') onRegionEntered(r.value);
  }
  const cu = $('#cfCustom'); if (cu) facilityConfig.customNotes = cu.value;
  const cl = $('#cfClass .cf-chip.selected'); if (cl) facilityConfig.classification = cl.dataset.val;
  const ch = $('#cfChem .cf-chip.selected'); if (ch) facilityConfig.battery = ch.dataset.val;
  const sp = $('#cfSupp .cf-chip.selected'); if (sp) facilityConfig.suppression = sp.dataset.val;
  const ep = $('#cfEPO .cf-chip.selected'); if (ep) facilityConfig.epo = ep.dataset.val;
  const dets = $$('#cfDetect .cf-chip.selected'); if (dets.length) facilityConfig.detection = [...dets].map(d => d.dataset.val);
}
function initChipSelect(id, multi) {
  const c = $(`#${id}`); if (!c) return;
  c.querySelectorAll('.cf-chip').forEach(chip => chip.addEventListener('click', () => {
    if (multi) chip.classList.toggle('selected');
    else { c.querySelectorAll('.cf-chip').forEach(x => x.classList.remove('selected')); chip.classList.add('selected') }
  }));
}
function showScenarioSelect() {
  $('#configFlow').classList.add('hidden');
  const ss = $('#scenarioSelect'); ss.classList.remove('hidden');
  // Persist facility config to server
  setTimeout(saveUserState, 500);
  const fc = facilityConfig;
  $('#ssSummary').innerHTML = `<div class="ss-sum-top"><span class="ss-sum-name">${icon(fc.svg, 'ss-sum-icon')} ${fc.facilityName || fc.typeName}</span><span class="ss-sum-region">${fc.region || 'Location not set'}</span></div><div class="ss-sum-specs"><span>Battery: <strong>${fc.battery}</strong></span><span>Modules: <strong>${fc.modules}</strong></span><span>Suppression: <strong>${fc.suppression}</strong></span>${fc.detection ? `<span>Detection: <strong>${fc.detection.join(', ')}</strong></span>` : ''}</div>`;
  // Calculate real economic impact from facility config
  if (typeof calculateCommunityImpact === 'function') {
    var fullImpact = calculateCommunityImpact(fc, 'full');
    var partialImpact = calculateCommunityImpact(fc, 'partial');
    fc._fullImpact = fullImpact;
    fc._partialImpact = partialImpact;
    $('#ssFullLoss').textContent = fullImpact.fmt(fullImpact.gsp);
    $('#ssPartialLoss').textContent = partialImpact.fmt(partialImpact.gsp);
  } else {
    $('#ssFullLoss').textContent = fc.loss || '$47M';
    $('#ssPartialLoss').textContent = fc.partialLoss || '$3.2M';
  }
  populateThreatLandscape();
  ss.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ═══ SIMULATION ═══ */
function initSimButtons() {
  $('#btnFull').addEventListener('click', () => startSim('full'));
  $('#btnPartial').addEventListener('click', () => startSim('partial'));
}
function stopSim() { simRunning = false; if (simAbort) simAbort.abort() }

async function startSim(mode) {
  if (simRunning) return;
  simMode = mode; simRunning = true;
  switchView('simulate');
  logAudit(`Simulation initiated: ${mode} failure`, 'CONFIDENTIAL');
  _logSim(mode, facilityConfig);
  const feed = $('#simScroll'); feed.innerHTML = '';
  const isFull = mode === 'full';
  const fName = facilityConfig ? (facilityConfig.facilityName || facilityConfig.typeName) : (D.incident?.facility || 'Facility');
  const stg = document.createElement('div'); stg.className = 'staging';
  stg.innerHTML = `<div class="staging-title">LOADING ${isFull ? 'FULL' : 'PARTIAL'} FAILURE SCENARIO <span class="class-badge class-badge-confidential">CONFIDENTIAL</span></div>`;
  [{ t: '+-', l: 'Facility: ' + fName }, { t: '+-', l: 'Battery: ' + (facilityConfig?.battery || 'NMC') }, { t: '+-', l: 'Modules: ' + (facilityConfig?.modules || 384) }, { t: '+-', l: 'Suppression: ' + (facilityConfig?.suppression || 'FM-200') }, { t: '\\-', l: 'Mode: ' + (isFull ? 'Complete Cascade' : 'Contained Event') }].forEach((s, i) => {
    const ln = document.createElement('div'); ln.className = 'stg-line'; ln.style.animationDelay = (i * 150) + 'ms';
    ln.innerHTML = `<span class="stg-tree">${s.t}</span><span class="stg-label">${s.l}</span><span class="stg-check" style="animation-delay:${(i * 150) + 400}ms">OK</span>`;
    stg.appendChild(ln);
  });
  feed.appendChild(stg);
  populateObservatory();
  const actNames = ['Baseline Reality', 'Risk Accumulation', 'State Change', 'Cascade & Constraint', 'Post-Event Intel'];
  const actTags = ['act-tag-0', 'act-tag-1', 'act-tag-2', 'act-tag-3', 'act-tag-4'];
  const actTexts = [];
  for (let i = 0; i < 5; i++) {
    if (!simRunning) break;
    // Collapse all previous acts when new one starts
    feed.querySelectorAll('.act-block').forEach(b => b.classList.add('collapsed'));
    const block = document.createElement('div'); block.className = 'act-block';
    block.innerHTML = `<div class="act-head"><span class="act-tag ${actTags[i]}">ACT ${String(i).padStart(2, '0')}</span><span class="act-name">${actNames[i]}</span><span class="class-badge class-badge-confidential">CONFIDENTIAL</span><span class="act-collapse">▾</span></div><div class="act-body"><span class="act-typing">Analyzing...</span></div>`;
    feed.appendChild(block);
    // Scroll the new act into view
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    block.querySelector('.act-head').onclick = () => block.classList.toggle('collapsed');
    const body = block.querySelector('.act-body');
    const text = await streamAct(mode, i, body);
    actTexts.push(text);
    // Trigger live simulation effects
    if (typeof triggerSimEffects === 'function') triggerSimEffects(mode, i);
    if (typeof triggerSimToasts === 'function') triggerSimToasts(mode, i);
    // Log each act completion
    (function(actIdx, actName, actText) {
      const fc = facilityConfig || {};
      fetch('/api/telemetry/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: mode, act_id: actIdx, act_name: actName,
          facility_type: fc.typeName || fc.type || '',
          time_spent: ''
        })
      }).catch(() => {});
    })(i, actNames[i], text);
    if (!text && !simRunning) break;
    if (!text) {
      body.innerHTML = body.textContent || '<span class="act-error">Unable to generate — check API connection and retry.</span>';
    }
    if (!simRunning) break;
  }
  if (!simRunning) return;
  // Expand all acts so users can scroll through full content
  feed.querySelectorAll('.act-block.collapsed').forEach(b => b.classList.remove('collapsed'));
  // Add summary and recommendations
  const sc = document.createElement('div'); sc.className = 'summary-card'; sc.id = 'simSummary'; sc.innerHTML = `<span class="class-badge class-badge-restricted" style="float:right;margin:0 0 8px 8px">RESTRICTED</span>` + buildSummary(isFull); feed.appendChild(sc);
  const sol = D.acts?.act_04?.hct_solution;
  if (sol) { const rc = document.createElement('div'); rc.className = 'reco-section'; rc.innerHTML = buildRecos(sol, isFull); feed.appendChild(rc) }
  if (D.inspections) { const ic = document.createElement('div'); ic.className = 'reco-section'; ic.innerHTML = buildInspectionCards(mode); feed.appendChild(ic) }
  const ab = document.createElement('div'); ab.className = 'action-bar';
  ab.innerHTML = `<button class="ab-btn ab-primary" onclick="exportPDF()">Export PDF</button><button class="ab-btn" onclick="resetSim()">New Simulation</button>`;
  feed.appendChild(ab);
  populateSidebarRecos(mode);
  populateSidebarInspections(mode);
  logAudit(`Simulation completed: ${mode} failure — 5 acts generated`, 'CONFIDENTIAL');
  // Cross-section reactivity
  if (typeof onSimulationComplete === 'function') onSimulationComplete(mode);
  // ── Log completed simulation to Sheets ──
  (function() {
    const fc = facilityConfig || {};
    const aiQCount = chatHistory ? Math.floor(chatHistory.length / 2) : 0;
    fetch('/api/telemetry/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode:          mode,
        facility_type: fc.typeName || fc.type || '',
        chemistry:     fc.battery  || '',
        modules:       String(fc.modules || ''),
        suppression:   fc.suppression || '',
        detection:     Array.isArray(fc.detection) ? fc.detection.join(', ') : (fc.detection || ''),
        acts:          actTexts.length,
        pdf_exported:  'No',
        ai_questions:  aiQCount,
      })
    }).catch(() => {});
    // Also log to Activity Log
    _logAction('simulation_complete', mode + ' failure', fc.typeName || fc.type || '', actTexts.length + ' acts');
  })();
  // Scroll to the summary card, not the very bottom
  sc.scrollIntoView({ behavior: 'smooth', block: 'start' });
  simRunning = false;
}

/* === STREAM / FORMAT / RESET / PDF === */
async function streamAct(mode, actId, bodyEl) {
  simAbort = new AbortController(); let full = '';
  try {
    const r = await fetch(`/api/simulate/${mode}/${actId}`, { method: 'POST', signal: simAbort.signal });
    if (!r.ok) { bodyEl.textContent = (await r.json()).error || 'Error'; return '' }
    const reader = r.body.getReader(), dec = new TextDecoder(); let buf = ''; bodyEl.textContent = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const ls = buf.split('\n'); buf = ls.pop();
      for (const l of ls) {
        if (!l.startsWith('data: ')) continue; const d = l.slice(6); if (d === '[DONE]') break;
        try { const o = JSON.parse(d); if (o.content) { full += o.content; bodyEl.innerHTML = fmtMd(full) } } catch { }
      }
      $('#simScroll').scrollTop = $('#simScroll').scrollHeight;
    }
  } catch (e) { if (e.name !== 'AbortError') bodyEl.textContent = 'Connection error.' }
  return full;
}
function fmtMd(t) { return t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>') }
function resetSim() {
  simRunning = false; switchView('home');
  const hc = $('#homeCenter'); if (hc) hc.classList.remove('no-center');
  const cr = $('#ctxReco'); if (cr) cr.classList.remove('visible');
  const ci = $('#ctxInsp'); if (ci) ci.classList.remove('visible');
  const fi = $('#ctxFacilityInfo'); if (fi) fi.classList.add('hidden');
  const ts = $('#ctxThreatSection'); if (ts) ts.classList.add('hidden');
  // Restore role selector, hide hero + facility
  const rs = $('#roleSelector'); if (rs) { rs.classList.remove('hidden'); rs.style.opacity = ''; rs.style.transition = ''; }
  const hero = $('#heroSection'); if (hero) hero.classList.add('hidden');
  const fs = $('#facilitySelector'); if (fs) fs.classList.add('hidden');
  userRole = null; facilityConfig = null; configStep = 0;
  $$('#roleGrid .role-card').forEach(b => b.classList.remove('selected'));
  $$('#fsGrid .fs-card').forEach(b => b.classList.remove('selected'));
  const cf = $('#configFlow'); if (cf) cf.classList.add('hidden');
  const ss = $('#scenarioSelect'); if (ss) ss.classList.add('hidden');
}
function exportPDF() {
  logAudit(`PDF export: ${simMode} failure report`, 'RESTRICTED');
  // Log PDF export
  const fc = facilityConfig || {};
  fetch('/api/telemetry/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: simMode, facility_type: fc.typeName || fc.type || '',
      chemistry: fc.battery || '', modules: String(fc.modules || ''),
      suppression: fc.suppression || '', acts: 5, pdf_exported: 'Yes', ai_questions: 0
    })
  }).catch(() => {});
  _logAction('pdf_export', simMode + ' failure report', fc.typeName || '', '');
  const acts = [...$('#simScroll .act-body')].map(b => b.innerText);
  fetch('/api/report/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: simMode, acts }) })
    .then(r => r.blob()).then(b => { const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = `pantheon-${simMode}-report.pdf`; a.click(); URL.revokeObjectURL(u) }).catch(() => alert('PDF export failed'));
}

/* === OBSERVATORY === */
function populateObservatory() {
  const inc = D.incident;
  if (inc) { $('#ctxIID').textContent = inc.id; $('#ctxFacility').textContent = facilityConfig?.facilityName || inc.facility }
  const aList = $('#ctxAList'); aList.innerHTML = '';
  const assets = D.assets || [];
  const sc = { operational: 'var(--green)', degraded: 'var(--yellow)', failed: 'var(--red)', destroyed: 'var(--dred)' };
  assets.forEach(a => {
    const r = document.createElement('div'); r.className = 'ctx-row';
    r.innerHTML = `<span class="ctx-dot" style="background:${sc[a.status] || 'var(--t3)'}"></span><span class="ctx-name">${a.name}</span><span class="ctx-status-text">${a.status}</span>`;
    aList.appendChild(r);
  });
  $('#ctxACnt').textContent = assets.length;
  const sList = $('#ctxSList'); sList.innerHTML = '';
  (D.services_affected || D.services || []).forEach(s => {
    const r = document.createElement('div'); r.className = 'ctx-row';
    const st = (s.status || '').toLowerCase();
    const c = st === 'online' || st === 'operational' ? 'var(--green)' : st === 'degraded' ? 'var(--yellow)' : 'var(--red)';
    r.innerHTML = `<span class="ctx-dot" style="background:${c}"></span><span class="ctx-name">${s.name}</span><span class="ctx-status-text">${s.impact || s.status}</span>`;
    sList.appendChild(r);
  });
  $('#ctxSCnt').textContent = (D.services_affected || D.services || []).length;
  const stdList = $('#ctxStdList'); stdList.innerHTML = '';
  (D.standards_applicable || D.standards || []).forEach(s => {
    const r = document.createElement('div'); r.className = 'ctx-std';
    r.innerHTML = `<div class="ctx-std-code">${s.code}</div><div class="ctx-std-title">${s.title}</div>`;
    stdList.appendChild(r);
  });
  $('#ctxStdCnt').textContent = (D.standards_applicable || D.standards || []).length;
}

/* === SUMMARY === */
function buildSummary(isFull) {
  const fc = facilityConfig || {};
  const loss = isFull ? (fc.loss || '$47M') : (fc.partialLoss || '$3.2M');
  const svcs = isFull ? (fc.services || 647) : Math.max(1, Math.ceil((fc.services || 647) * 0.006));
  const dur = isFull ? '22h' : '3h'; const data = isFull ? '858 TB' : '0 TB';
  const mods = isFull ? (fc.modules || 384) : Math.ceil((fc.modules || 384) * 0.03);
  return `<div class="summary-title">${isFull ? 'FULL' : 'PARTIAL'} FAILURE — IMPACT SUMMARY</div>
    <div class="summary-grid">
      <div class="summary-stat"><div class="summary-val red">${loss}</div><div class="summary-label">EST. LOSS</div></div>
      <div class="summary-stat"><div class="summary-val ${isFull ? 'red' : 'yellow'}">${svcs}</div><div class="summary-label">SERVICES</div></div>
      <div class="summary-stat"><div class="summary-val">${dur}</div><div class="summary-label">DURATION</div></div>
      <div class="summary-stat"><div class="summary-val ${isFull ? 'red' : 'green'}">${data}</div><div class="summary-label">DATA LOST</div></div>
      <div class="summary-stat"><div class="summary-val">${mods}</div><div class="summary-label">MODULES</div></div>
      <div class="summary-stat"><div class="summary-val green">${isFull ? '$2.1M/yr' : '$890K/yr'}</div><div class="summary-label">INS. SAVINGS</div></div>
    </div>
    <div class="sum-section"><div class="sum-sh">PRIORITY ACTIONS</div><div class="action-list">
      <div class="action-item"><span class="ai-p ai-imm">IMMEDIATE</span><span class="ai-text">Deploy F-500 EA suppression</span><span class="ai-std">NFPA 18A</span></div>
      <div class="action-item"><span class="ai-p ai-imm">IMMEDIATE</span><span class="ai-text">Install off-gas detection</span><span class="ai-std">NFPA 855</span></div>
      <div class="action-item"><span class="ai-p ai-30">30-DAY</span><span class="ai-text">Revise BMS alarm thresholds</span><span class="ai-std">UL 9540A</span></div>
      <div class="action-item"><span class="ai-p ai-90">90-DAY</span><span class="ai-text">Suppression gap audit all facilities</span><span class="ai-std">NFPA 855</span></div>
    </div></div>`;
}
function buildRecos(sol, isFull) {
  let h = `<div class="reco-sh">Primary recommendation</div><div class="reco-card"><div class="reco-head"><div class="reco-head-icon">${icon('shield')}</div><div><div class="reco-title">${sol.product}</div><div class="reco-standard">${sol.standard}</div></div></div><div class="reco-desc">${sol.description}</div>`;
  if (sol.three_level_mitigation) { h += `<div class="reco-levels">${sol.three_level_mitigation.map(m => `<div class="reco-level">${m}</div>`).join('')}</div>` }
  h += '</div>';
  // Smart-LX detection
  h += `<div class="reco-card"><div class="reco-head"><div class="reco-head-icon">${icon('detection')}</div><div><div class="reco-title">Smart-LX® by Embedded Logix</div><div class="reco-sub">Intelligent detection before ignition</div><div class="reco-standard">NFPA 72 · NFPA 855</div></div></div><div class="reco-desc">AI-powered thermal monitoring detects trending temperatures before thermal runaway. Customizable rules distinguish real fires from equipment, replacing 24/7 manual monitoring with automated alerts.</div><div class="reco-levels"><div class="reco-level">Hot Spot Detection — radiometric cameras with temperature trend analysis</div><div class="reco-level">Gas & Vapor Monitoring — LEL tracking for explosion prevention</div><div class="reco-level">Enterprise Analytics — historical data, weather correlation, custom dashboards</div></div></div>`;
  // VEEP integrated
  h += `<div class="reco-card"><div class="reco-head"><div class="reco-head-icon">${icon('shield')}</div><div><div class="reco-title">VEEP System</div><div class="reco-sub">Vapor Encapsulation & Explosion Prevention</div><div class="reco-standard">NFPA 18A · NFPA 69</div></div></div><div class="reco-desc">Complete detect-prevent-suppress integration. Smart-LX® detection triggers Diamond Doser® delivery of F-500 EA® — closing the loop from early warning to active suppression in a single automated system.</div></div>`;
  // Supporting products
  h += `<div class="reco-sh reco-sh-spaced">Delivery systems</div>`;
  h += `<div class="reco-card"><div class="reco-head"><div class="reco-head-icon">${icon('suppression')}</div><div><div class="reco-title">Diamond Doser® Proportioner</div><div class="reco-standard">NFPA 18A</div></div></div><div class="reco-desc">Water-driven volumetric proportioner for precise F-500 EA® injection. No electric power required. Multiple simultaneous nozzles with pulsing capability.</div></div>`;
  h += `<div class="reco-card"><div class="reco-head"><div class="reco-head-icon">${icon('suppression')}</div><div><div class="reco-title">Bladder Tank System</div><div class="reco-standard">NFPA 18A · NFPA 13</div></div></div><div class="reco-desc">Retrofit F-500 EA® delivery into existing sprinkler or deluge systems. 36 gal to 12,000 gal capacity for any facility scale.</div></div>`;
  return h;
}

/* === INSPECTION CARDS === */
function findInsp(id) {
  if (!D.inspections) return null;
  return [...D.inspections.in_person, ...D.inspections.online_consults, ...D.inspections.drone_inspections].find(p => p.id === id);
}
function inspIcon(item) { return item.type === 'Online Consultation' ? 'monitor' : item.type === 'Drone Inspection' ? 'drone' : 'search' }

function buildInspectionCards(mode) {
  if (!D.inspections) return '';
  const cats = [
    { title: 'IN-PERSON INSPECTIONS', items: D.inspections.in_person },
    { title: 'ONLINE CONSULTATIONS', items: D.inspections.online_consults },
    { title: 'DRONE INSPECTIONS', items: D.inspections.drone_inspections }
  ];
  let h = '<div class="reco-sh">Recommended services</div>';
  // Packages
  if (D.inspections.packages) {
    h += D.inspections.packages.map(pkg => `<div class="pkg-card"><div class="pkg-head"><div class="pkg-name">${pkg.name}</div><div class="pkg-savings">${pkg.savings}</div></div><div class="pkg-desc">${pkg.description || ''}</div><div class="pkg-meta"><span>Cost: ${pkg.cost_range}</span><span>Services: ${pkg.includes.length}</span></div><div class="pkg-includes">${pkg.includes.map(inc => `<div class="pkg-inc-item">${icon(inspIcon({ type: inc.startsWith('CON') ? 'Online Consultation' : inc.startsWith('DRN') ? 'Drone Inspection' : 'In-Person' }), 'insp-pkg-inc-icon')} ${resolveServiceName(inc)}</div>`).join('')}</div><button class="insp-btn insp-btn-primary" onclick="openPkgModal('${pkg.id}')">Request Package</button></div>`).join('');
  }
  const catLabels = { 'IN-PERSON INSPECTIONS': 'In-person inspections', 'ONLINE CONSULTATIONS': 'Online consultations', 'DRONE INSPECTIONS': 'Drone inspections' };
  cats.forEach(cat => {
    if (!cat.items || !cat.items.length) return;
    h += `<div class="insp-sh">${catLabels[cat.title] || cat.title}</div><div class="insp-grid">`;
    cat.items.forEach(item => {
      h += `<div class="insp-card"><div class="insp-card-head">${icon(inspIcon(item), 'insp-card-icon')}<span class="insp-row-badge insp-b-${item.priority.toLowerCase()}">${item.priority}</span></div><div class="insp-card-title">${item.name}</div><div class="insp-card-category">${item.category}</div><div class="insp-card-scope">${item.scope[0]}</div><div class="insp-card-meta"><div><span class="insp-card-meta-label">Cost</span><span class="insp-card-meta-val">${item.cost_range}</span></div><div><span class="insp-card-meta-label">Duration</span><span class="insp-card-meta-val">${item.duration}</span></div></div><div class="insp-card-standards">${item.standards.map(s => `<span class="insp-detail-tag">${s}</span>`).join('')}</div><div class="insp-card-actions"><button class="insp-btn insp-btn-primary insp-btn-sm" onclick="openInspModal('${item.id}')">${item.type === 'Online Consultation' ? 'Book' : 'Schedule'}</button><button class="insp-btn insp-btn-sm" onclick="openInspDetail('${item.id}')">Details</button></div></div>`;
    });
    h += '</div>';
  });
  return h;
}

/* === SIDEBAR RECOS/INSPECTIONS === */
function populateSidebarRecos(mode) {
  const cr = $('#ctxReco'); if (!cr) return; cr.classList.add('visible');
  const list = $('#ctxRecoList'); list.innerHTML = '';
  const sol = D.acts?.act_04?.hct_solution;
  if (sol) {
    const r = document.createElement('div'); r.className = 'reco-row';
    r.innerHTML = `${icon('shield', 'reco-row-icon')}<span class="reco-row-name">${sol.product}</span><span class="reco-row-tag">PRIMARY</span>`;
    list.appendChild(r);
  }
  (D.acts?.act_04?.additional_recommendations || []).forEach(rec => {
    const r = document.createElement('div'); r.className = 'reco-row';
    r.innerHTML = `${icon('shield', 'reco-row-icon')}<span class="reco-row-name">${rec.product || rec.action}</span>`;
    list.appendChild(r);
  });
  $('#ctxRecoCnt').textContent = list.children.length;
}
function populateSidebarInspections(mode) {
  const ci = $('#ctxInsp'); if (!ci || !D.inspections) return; ci.classList.add('visible');
  const populate = (listId, cntId, items) => {
    const list = $(listId); list.innerHTML = '';
    items.forEach(item => {
      const r = document.createElement('div'); r.className = 'insp-row'; r.onclick = () => openInspDetail(item.id);
      r.innerHTML = `${icon(inspIcon(item), 'insp-row-icon')}<span class="insp-row-name">${item.name}</span><span class="insp-row-badge insp-b-${item.priority.toLowerCase()}">${item.priority}</span>`;
      list.appendChild(r);
    });
    $(cntId).textContent = items.length;
  };
  populate('#ctxInspIPList', '#ctxInspIPCnt', D.inspections.in_person || []);
  populate('#ctxInspOCList', '#ctxInspOCCnt', D.inspections.online_consults || []);
  populate('#ctxInspDRList', '#ctxInspDRCnt', D.inspections.drone_inspections || []);
}

/* === SCHEDULE MODAL === */
function openInspModal(id) {
  const p = findInsp(id); if (!p) return;
  let ex = $('#inspModal'); if (ex) ex.remove();
  const m = document.createElement('div'); m.className = 'insp-modal'; m.id = 'inspModal';
  m.innerHTML = `<div class="insp-modal-overlay" onclick="closeInspModal()"></div>
    <div class="insp-modal-content"><div class="insp-modal-head"><div class="insp-modal-icon">${icon(inspIcon(p))}</div><div><div class="insp-modal-title">${p.type === 'Online Consultation' ? 'Book Consultation' : 'Schedule Inspection'}</div><div class="insp-modal-sub">${p.name}</div></div><button class="insp-modal-close" onclick="closeInspModal()">x</button></div>
    <div class="insp-modal-body">
      <div class="insp-form-row"><label class="insp-label">CONTACT NAME</label><input type="text" class="insp-input" placeholder="Full name" id="inspName"></div>
      <div class="insp-form-row"><label class="insp-label">EMAIL</label><input type="email" class="insp-input" placeholder="email@company.com" id="inspEmail"></div>
      <div class="insp-form-row"><label class="insp-label">ORGANIZATION</label><input type="text" class="insp-input" placeholder="Company name" id="inspOrg"></div>
      <div class="insp-form-row"><label class="insp-label">FACILITY LOCATION</label><input type="text" class="insp-input" placeholder="City, Region" id="inspLoc"></div>
      <div class="insp-form-row"><label class="insp-label">PREFERRED DATE</label><input type="date" class="insp-input" id="inspDate"></div>
      <div class="insp-form-row"><label class="insp-label">NOTES</label><textarea class="insp-input insp-textarea" placeholder="Requirements, urgency..." id="inspNotes"></textarea></div>
      <div class="insp-form-summary"><div class="insp-sum-row"><span>Service</span><span>${p.name}</span></div><div class="insp-sum-row"><span>Duration</span><span>${p.duration}</span></div><div class="insp-sum-row"><span>Est. Cost</span><span>${p.cost_range}</span></div><div class="insp-sum-row"><span>Standards</span><span>${p.standards.join(', ')}</span></div></div>
      <button class="insp-btn insp-btn-submit" onclick="submitInspRequest('${id}')">Submit Request</button>
      <div class="insp-form-note">Confirmation within 24 hours</div>
    </div></div>`;
  document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('open'));
}
function closeInspModal() { const m = $('#inspModal'); if (!m) return; m.classList.remove('open'); setTimeout(() => m.remove(), 300) }

/* === PRODUCT DETAIL MODAL === */
function openProductDetail(id) {
  const item = getAllCatalogItems().find(i => i.id === id); if (!item || !item.details) return;
  _logProduct(item.name, 'Catalog');
  const d = item.details;
  let ex = $('#productModal'); if (ex) ex.remove();
  const icoN = item.cat === 'suppression' ? 'suppression' : item.cat === 'detection' ? 'detection' : 'shield';
  const m = document.createElement('div'); m.className = 'insp-modal'; m.id = 'productModal';
  m.innerHTML = `<div class="insp-modal-overlay" onclick="closeProductDetail()"></div>
    <div class="insp-modal-content prod-modal-content">
      <div class="insp-modal-head">
        <div class="insp-modal-icon">${icon(icoN)}</div>
        <div><div class="insp-modal-title">${item.name}</div><div class="insp-modal-sub">${item.category}</div></div>
        <button class="insp-modal-close" onclick="closeProductDetail()">✕</button>
      </div>
      <div class="insp-modal-body prod-modal-body">
        <div class="prod-section">
          <div class="prod-section-title">How it works</div>
          <div class="prod-section-text">${d.how}</div>
        </div>
        ${d.highlights ? `<div class="prod-section">
          <div class="prod-section-title">Key capabilities</div>
          <div class="prod-highlights">${d.highlights.map(h => `<div class="prod-highlight"><span class="prod-check">✓</span>${h}</div>`).join('')}</div>
        </div>`: ''}
        ${d.applications ? `<div class="prod-section">
          <div class="prod-section-title">Applications</div>
          <div class="prod-apps">${d.applications.map(a => `<span class="prod-app">${a}</span>`).join('')}</div>
        </div>`: ''}
        ${d.testing ? `<div class="prod-section">
          <div class="prod-section-title">Testing & certification</div>
          <div class="prod-section-text">${d.testing}</div>
        </div>`: ''}
        <div class="prod-meta-bar">
          <div class="prod-meta-item"><span class="prod-meta-label">Standards</span><span class="prod-meta-val">${item.standards.join(', ')}</span></div>
          <div class="prod-meta-item"><span class="prod-meta-label">Priority</span><span class="prod-meta-val"><span class="insp-row-badge insp-b-${item.priority.toLowerCase()}">${item.priority}</span></span></div>
          <div class="prod-meta-item"><span class="prod-meta-label">Timeline</span><span class="prod-meta-val">${item.timeline}</span></div>
        </div>
        <div class="prod-actions">
          ${d.url ? `<a href="${d.url}" target="_blank" rel="noopener" class="insp-btn insp-btn-primary">Visit Product Page</a>` : ''}
          <a href="mailto:info@hct-world.com?subject=${encodeURIComponent('Pantheon Inquiry: ' + item.name)}&body=${encodeURIComponent('I would like more information about ' + item.name + '.')}" class="insp-btn">Request Quote</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('open'));
}
function closeProductDetail() { const m = $('#productModal'); if (!m) return; m.classList.remove('open'); setTimeout(() => m.remove(), 300) }

function submitInspRequest(id) {
  const p = findInsp(id), name = $('#inspName')?.value, email = $('#inspEmail')?.value;
  if (!name || !email) { alert('Please fill name and email.'); return }
  const subj = encodeURIComponent(`Pantheon: ${p.name} [${p.id}]`);
  const body = encodeURIComponent(`Service: ${p.name}\nType: ${p.type}\nCost: ${p.cost_range}\n\nContact: ${name}\nEmail: ${email}\nOrg: ${$('#inspOrg')?.value || '-'}\nFacility: ${$('#inspLoc')?.value || '-'}\nDate: ${$('#inspDate')?.value || 'Flexible'}\nNotes: ${$('#inspNotes')?.value || '-'}`);
  window.open(`mailto:?subject=${subj}&body=${body}`);
  closeInspModal(); showConfirm(`Request submitted for <strong>${p.name}</strong>. Confirmation to ${email}.`);
}

/* === DETAIL MODAL === */
function openInspDetail(id) {
  const p = findInsp(id); if (!p) return;
  let ex = $('#inspDetail'); if (ex) ex.remove();
  const m = document.createElement('div'); m.className = 'insp-modal'; m.id = 'inspDetail';
  m.innerHTML = `<div class="insp-modal-overlay" onclick="closeInspDetail()"></div>
    <div class="insp-modal-content insp-detail-content"><div class="insp-modal-head"><div class="insp-modal-icon">${icon(inspIcon(p))}</div><div><div class="insp-modal-title">${p.name}</div><div class="insp-modal-sub">${p.type} · ${p.category}</div></div><button class="insp-modal-close" onclick="closeInspDetail()">x</button></div>
    <div class="insp-modal-body">
      <div class="insp-detail-section"><div class="insp-detail-sh">SCOPE</div>${p.scope.map(s => `<div class="insp-detail-item">${s}</div>`).join('')}</div>
      <div class="insp-detail-section"><div class="insp-detail-sh">DELIVERABLES</div>${p.deliverables.map(d => `<div class="insp-detail-item">${d}</div>`).join('')}</div>
      <div class="insp-detail-grid"><div class="insp-detail-stat"><div class="insp-detail-val">${p.cost_range}</div><div class="insp-detail-label">COST</div></div><div class="insp-detail-stat"><div class="insp-detail-val">${p.duration}</div><div class="insp-detail-label">DURATION</div></div><div class="insp-detail-stat"><div class="insp-detail-val">${p.timeline}</div><div class="insp-detail-label">TIMELINE</div></div><div class="insp-detail-stat"><div class="insp-detail-val">${p.personnel}</div><div class="insp-detail-label">PERSONNEL</div></div></div>
      <div class="insp-detail-section"><div class="insp-detail-sh">STANDARDS</div><div class="insp-detail-tags">${p.standards.map(s => `<span class="insp-detail-tag">${s}</span>`).join('')}</div></div>
      ${p.insurance_impact ? `<div class="insp-detail-section"><div class="insp-detail-sh">INSURANCE IMPACT</div><div class="insp-detail-item">${p.insurance_impact}</div></div>` : ''}
      <div class="insp-detail-actions"><button class="insp-btn insp-btn-primary insp-btn-wide" onclick="closeInspDetail();openInspModal('${id}')">${p.type === 'Online Consultation' ? 'Book' : 'Schedule'}</button></div>
    </div></div>`;
  document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('open'));
}
function closeInspDetail() { const m = $('#inspDetail'); if (!m) return; m.classList.remove('open'); setTimeout(() => m.remove(), 300) }

/* === PACKAGE MODAL === */
function openPkgModal(pkgId) {
  const pkg = D.inspections.packages.find(p => p.id === pkgId); if (!pkg) return;
  let ex = $('#inspModal'); if (ex) ex.remove();
  const m = document.createElement('div'); m.className = 'insp-modal'; m.id = 'inspModal';
  m.innerHTML = `<div class="insp-modal-overlay" onclick="closeInspModal()"></div>
    <div class="insp-modal-content"><div class="insp-modal-head"><div class="insp-modal-icon">${icon('package')}</div><div><div class="insp-modal-title">Request Package</div><div class="insp-modal-sub">${pkg.name}</div></div><button class="insp-modal-close" onclick="closeInspModal()">x</button></div>
    <div class="insp-modal-body">
      <div class="insp-form-row"><label class="insp-label">CONTACT NAME</label><input type="text" class="insp-input" placeholder="Full name" id="inspName"></div>
      <div class="insp-form-row"><label class="insp-label">EMAIL</label><input type="email" class="insp-input" placeholder="email@company.com" id="inspEmail"></div>
      <div class="insp-form-row"><label class="insp-label">ORGANIZATION</label><input type="text" class="insp-input" placeholder="Company name" id="inspOrg"></div>
      <div class="insp-form-row"><label class="insp-label">NOTES</label><textarea class="insp-input insp-textarea" placeholder="Describe your situation..." id="inspNotes"></textarea></div>
      <div class="insp-form-summary"><div class="insp-sum-row"><span>Package</span><span>${pkg.name}</span></div><div class="insp-sum-row"><span>Services</span><span>${pkg.includes.length}</span></div><div class="insp-sum-row"><span>Cost</span><span>${pkg.cost_range}</span></div><div class="insp-sum-row"><span>Savings</span><span class="green">${pkg.savings}</span></div></div>
      <button class="insp-btn insp-btn-submit" onclick="submitPkgRequest('${pkgId}')">Submit Request</button>
    </div></div>`;
  document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('open'));
}
function submitPkgRequest(pkgId) {
  const pkg = D.inspections.packages.find(p => p.id === pkgId);
  const name = $('#inspName')?.value, email = $('#inspEmail')?.value;
  if (!name || !email) { alert('Please fill name and email.'); return }
  const subj = encodeURIComponent(`Pantheon Package: ${pkg.name} [${pkg.id}]`);
  const body = encodeURIComponent(`Package: ${pkg.name}\nCost: ${pkg.cost_range}\nSavings: ${pkg.savings}\n\nContact: ${name}\nEmail: ${email}\nOrg: ${$('#inspOrg')?.value || '-'}\nNotes: ${$('#inspNotes')?.value || '-'}`);
  window.open(`mailto:?subject=${subj}&body=${body}`);
  closeInspModal(); showConfirm(`Package request submitted for <strong>${pkg.name}</strong>.`);
}

function showConfirm(text) {
  const feed = currentView === 'simulate' ? $('#simScroll') : $('#homeScroll'); if (!feed) return;
  const c = document.createElement('div'); c.className = 'insp-confirm';
  c.innerHTML = `<div class="insp-confirm-icon">${icon('check')}</div><div class="insp-confirm-text">${text}</div>`;
  feed.appendChild(c); feed.scrollTop = feed.scrollHeight;
}

/* === CHAT === */
function initChat() {
  const si = $('#simChat'), ss = $('#simSend');
  if (si && ss) { ss.onclick = () => sendChat(si, '#simScroll'); si.onkeydown = e => { if (e.key === 'Enter') sendChat(si, '#simScroll') } }
  const hi = $('#homeChat'), hs = $('#homeSend');
  if (hi && hs) { hs.onclick = () => sendChat(hi, '#homeScroll'); hi.onkeydown = e => { if (e.key === 'Enter') sendChat(hi, '#homeScroll') } }
}
async function sendChat(input, scrollId) {
  const msg = input.value.trim(); if (!msg) return; input.value = '';
  _logChat(msg);

  // Smart onboarding: detect facility descriptions in chat
  if (!facilityConfig && currentView === 'home') {
    const parsed = typeof parseNaturalFacility === 'function' ? parseNaturalFacility(msg) : {};
    if (parsed.type) {
      // Auto-configure from natural language
      const typeMap = { datacenter: 'Data Center', ev: 'EV Charging', solar: 'Solar / BESS', warehouse: 'Warehouse', manufacturing: 'Manufacturing', telecom: 'Telecom', marine: 'Marine', aviation: 'Aviation', hospital: 'Healthcare' };
      const el = document.querySelector(`[data-type="${parsed.type}"]`);
      if (el) el.click();
      // Pre-fill config if we got details
      if (parsed.region) { const ri = document.getElementById('cfRegion'); if (ri) ri.value = parsed.region; }
    }
  }

  const feed = $(scrollId);
  const uDiv = document.createElement('div'); uDiv.className = 'chat-msg chat-msg-user';
  uDiv.innerHTML = `<div class="chat-bubble">${escHtml(msg)}</div>`; feed.appendChild(uDiv);
  const aDiv = document.createElement('div'); aDiv.className = 'chat-msg chat-msg-assistant';
  aDiv.innerHTML = `<div class="chat-avatar">✦</div><div class="chat-bubble chat-typing">Thinking...</div>`;
  feed.appendChild(aDiv); feed.scrollTop = feed.scrollHeight;
  const bubble = aDiv.querySelector('.chat-bubble');
  // Add facility context to message
  const smartCtx = typeof getSmartSystemContext === 'function' ? getSmartSystemContext() : '';
  chatHistory.push({ role: 'user', content: msg + smartCtx });
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg + smartCtx, history: chatHistory }) });
    if (!r.ok) { bubble.textContent = (await r.json()).error || 'Error'; return }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let full = '', buf = ''; bubble.textContent = ''; bubble.classList.remove('chat-typing');
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const ls = buf.split('\n'); buf = ls.pop();
      for (const l of ls) { if (!l.startsWith('data: ')) continue; const d = l.slice(6); if (d === '[DONE]') break; try { const o = JSON.parse(d); if (o.content) { full += o.content; bubble.innerHTML = fmtMd(full) } } catch { } }
      feed.scrollTop = feed.scrollHeight;
    }
    chatHistory.push({ role: 'assistant', content: full });
    // Log to AI Conversations sheet
    if (typeof window.logAIConversation === 'function') {
      window.logAIConversation('home', msg, full);
    }
  } catch { bubble.textContent = 'Connection error'; bubble.classList.remove('chat-typing') }
}
function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

/* === CATALOG === */
function initCatalog() {
  $$('#ctxCatNav .ctx-nav-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('#ctxCatNav .ctx-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); filterCatalog();
  }));
  $$('.ctx-filter-chips .ctx-chip').forEach(chip => chip.addEventListener('click', () => {
    chip.parentElement.querySelectorAll('.ctx-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); filterCatalog();
  }));
  const cs = $('#catSearch'); if (cs) cs.oninput = () => filterCatalog();
  populateCatalog();
}
function populateCatalog() {
  const grid = $('#catGrid'); if (!grid) return;
  grid.innerHTML = getAllCatalogItems().map(item => {
    const icoN = item.cat === 'suppression' ? 'suppression' : item.cat === 'detection' ? 'detection' : item.cat === 'inspections' ? 'search' : item.cat === 'consults' ? 'monitor' : item.cat === 'drone' ? 'drone' : 'shield';
    return `<div class="cat-card" data-cat="${item.cat}" data-id="${item.id || ''}">
      <div class="cat-card-head">${icon(icoN, 'cat-card-icon')}<span class="cat-card-type-badge">${item.cat === 'suppression' ? 'SUPPRESSION' : item.cat === 'detection' ? 'DETECTION' : item.cat === 'inspections' ? 'SERVICE' : item.cat === 'training' ? 'TRAINING' : item.cat === 'consulting' ? 'CONSULTING' : 'PLATFORM'}</span></div>
      <div class="cat-card-title">${item.name}</div>
      <div class="cat-card-category">${item.category || item.type || ''}</div>
      <div class="cat-card-desc">${item.desc || item.scope?.[0] || ''}</div>
      <div class="cat-card-meta"><div><span class="cat-card-meta-label">Cost</span><span class="cat-card-meta-val">${item.cost_range || 'Contact'}</span></div><div><span class="cat-card-meta-label">Duration</span><span class="cat-card-meta-val">${item.duration || '---'}</span></div></div>
      ${item.standards ? `<div class="cat-card-tags">${item.standards.map(s => `<span class="cat-card-tag">${s}</span>`).join('')}</div>` : ''}
      <div class="cat-card-actions">${item.actionId ? `<button class="insp-btn insp-btn-primary insp-btn-sm" onclick="openInspModal('${item.actionId}')">Schedule</button><button class="insp-btn insp-btn-sm" onclick="openInspDetail('${item.actionId}')">Details</button>` : item.id ? `<button class="insp-btn insp-btn-sm" onclick="openProductDetail('${item.id}')">Learn More</button>` : ''}</div>
    </div>`;
  }).join('');
}
function getAllCatalogItems() {
  const items = [];
  /* === MICELLE MIST — F-500 EA DELIVERY TECHNOLOGY === */
  items.push({
    id: 'micelle-mist', name: 'Micelle Mist™ Delivery System', cat: 'suppression', category: 'HCT · Li-Ion Suppression', desc: 'Encapsulator agent delivery engineered for lithium-ion battery rooms. Spherical micelle technology surrounds each droplet, acting on all four fire tetrahedron legs simultaneously — flammability, explosivity, toxicity, and heat.', cost_range: 'Contact HCT', standards: ['NFPA 18A', 'NFPA 855', 'UL 9540A'],
    details: {
      how: 'Micelle Mist™ leverages the molecular behavior of F-500 EA® Encapsulator Agent. Each water droplet is surrounded by F-500 EA® molecules forming a spherical micelle, driving heat transfer internally for rapid cooling that far exceeds plain water. Unlike foam (which acts mechanically) or FM-200 (which acts on chain reactions only), Micelle Mist simultaneously encapsulates fuel to prevent re-ignition, interrupts free radical chain reactions, and reduces HF gas concentration — the three killing vectors of Li-ion thermal runaway.',
      highlights: [
        'Acts on all 4 fire tetrahedron legs simultaneously — the only suppression approach to do so',
        'Micelle encapsulation prevents polar and non-polar fuel re-ignition',
        'Reduces hydrogen fluoride (HF) gas — the primary Li-ion fatality risk',
        'Rapid heat absorption well beyond plain water cooling capacity',
        'Fluorine-free, biodegradable, non-corrosive — no environmental remediation required',
        'Validated for Class A, B (2D & 3D), C, D, and Li-ion fires'
      ],
      applications: [
        'Lithium-ion BESS / ESS battery rooms',
        'Data center UPS battery arrays',
        'EV charging stations and battery storage',
        'Aircraft MRO hangars (FAA AC 150/5210-6E)',
        'Marine battery compartments',
        'Manufacturing battery lines'
      ],
      testing: 'Validated across 15+ years of third-party testing. GM, Tesla, ConEdison, Port Authority NY/NJ, NIOSH, and Jaguar Land Rover have all independently tested the encapsulator agent at the core of Micelle Mist technology. Recognized in NFPA 18A Annex 4.3.',
      url: 'https://hct-world.com/f-500-encapsulator-agent-f-500-ea/'
    }
  });
  /* === HCT AGENTS === */
  items.push({
    id: 'f500ea', name: 'F-500 EA® Encapsulator Agent', cat: 'suppression', category: 'HCT · Suppression Agent', desc: 'Multi-class fire suppression agent with micelle technology. Addresses flammability, explosivity, and toxicity on Li-ion, Class A/B/C/D fires. Fluorine-free, biodegradable, noncorrosive.', cost_range: 'Contact HCT', standards: ['NFPA 18A', 'cULus', 'NEN NTA 8133', 'FAA AC 150/5210-6E'],
    details: {
      how: 'F-500 EA® molecules form spherical micelles around each water droplet, driving heat internally for rapid cooling. Unlike foam that works mechanically, Encapsulator Agents act on a molecular level — altering the composition of water to interact with all four legs of the fire tetrahedron simultaneously.',
      highlights: ['Encapsulates polar and non-polar fuels, preventing re-ignition', 'Reduces HF gas concentration during Li-ion thermal runaway', 'Interrupts free radical chain reaction in smoke and soot', 'Rapidly reduces ambient temperatures for safer evacuation', 'Works on Class A, B (2D & 3D), C, D, and Li-ion fires'],
      applications: ['BESS / ESS battery rooms', 'Data center UPS arrays', 'EV charging stations', 'Aircraft hangars (FAA AC 150/5210-6E)', 'Oil & gas — transformer, refinery, tank farm', 'Manufacturing — metals, recycling, warehousing'],
      testing: 'Over 15 years of independent third-party testing recognized by NFPA 18A Annex 4.3. Tested by GM, Tesla, ConEdison, Port Authority of NY/NJ, NIOSH, Jaguar, Kiwa, Nanjing Technical University, Sapienza University of Rome.',
      url: 'https://hct-world.com/f-500-encapsulator-agent-f-500-ea/'
    }
  });
  items.push({
    id: 'hydrolock', name: 'HydroLock® Encapsulator Agent', cat: 'suppression', category: 'HCT · Vapor Mitigation', desc: 'Formulated to encapsulate hydrocarbon vapors and liquids, rapidly dropping LEL for safe vessel entry. Ideal for tank degassing, cleaning, and sludge removal.', cost_range: 'Contact HCT', standards: ['NFPA 18A', 'CEPA 1999'],
    details: {
      how: 'Mixed at 3% with water, HydroLock® molecules encapsulate hydrocarbon vapors and liquids, rendering fuel non-flammable, non-ignitable, and non-explosive. LEL drops rapidly — often in minutes versus hours of venting.',
      highlights: ['Drops LEL below explosive limit for safe vessel entry', 'Encapsulates all hydrocarbons: crude oil, gasoline, ethanol blends, H₂S', 'Effective on pyrophoric iron (iron sulfide) scaling', 'Removes buildup on vessel walls and breaks down sludge', 'Fluorine-free, noncorrosive, biodegradable — CEPA 1999 compliant'],
      applications: ['Above ground tanks', 'Underground storage tanks (UST)', 'Road tank trailers', 'Refinery vessel cleaning', 'Pipeline maintenance'],
      url: 'https://hct-world.com/products/chemical-agents/hydrolock/'
    }
  });
  items.push({
    id: 'pinnacle', name: 'Pinnacle Fluorine Free Foam', cat: 'suppression', category: 'HCT · Class A Foam', desc: 'Fluorine-free Class A firefighting foam. Maximum penetration with thick foam blanket. Stretches water supply in areas with limited availability.', cost_range: 'Contact HCT', standards: ['NFPA 18'],
    details: {
      how: 'Pinnacle creates a durable, thick foam blanket that maximizes penetration into Class A combustibles. Designed to stretch limited water supplies further — critical for departments without tanker access.',
      highlights: ['Fluorine-free — no PFAS environmental concern', 'Maximum penetration into deep-seated fires', 'Thick blanket provides extended burn-back resistance', 'Stretches water supply in water-scarce areas'],
      applications: ['Wildland-urban interface', 'Structural firefighting', 'Rural fire departments', 'Mutual aid scenarios'],
      url: 'https://hct-world.com/agents/'
    }
  });
  items.push({
    id: 'dustwash', name: 'Dust Wash', cat: 'suppression', category: 'HCT · Dust Mitigation', desc: 'Combination encapsulator and foaming agent for combustible dust control. Safely captures and lifts caked-on dust without triggering hot spots.', cost_range: 'Contact HCT', standards: ['NFPA 652'],
    details: {
      how: 'Dust Wash combines encapsulation with foaming action to safely capture combustible dust accumulation. Plain water can be dangerous near hot spots — Dust Wash encapsulates the dust and any heat source simultaneously.',
      highlights: ['Safely controls dust near undetected hot spots', 'Captures fine grains, coal, rubber, and metal dust', 'Minimizes runoff during cleaning operations', 'Prevents secondary dust explosions during housekeeping'],
      applications: ['Grain elevators and processing', 'Coal handling facilities', 'Metal grinding and recycling', 'Rubber and plastics manufacturing', 'Pharmaceutical processing'],
      url: 'https://hct-world.com/agents/'
    }
  });

  /* === HCT SYSTEMS === */
  items.push({
    id: 'diamonddoser', name: 'Diamond Doser® Proportioner', cat: 'suppression', category: 'HCT · Delivery System', desc: 'Water-driven volumetric proportioner for precise F-500 EA® injection. No electric power needed. Supports multiple simultaneous nozzles with pulsing techniques.', cost_range: 'Contact HCT', standards: ['NFPA 18A'],
    details: {
      how: 'The Diamond Doser® is water-driven — no electrical power required. It proportions F-500 EA® concentrate into your water stream with consistent accuracy across a wide range of flows and pressures. Multiple nozzles can operate simultaneously at varying lengths and heights.',
      highlights: ['Water-driven — no electric power dependency', 'Precise proportioning at all flow rates', 'Supports simultaneous multi-nozzle operation', 'Rapid nozzle opening/closing for pulsing techniques', 'Mobile units connect directly to F-500 EA® pails, drums, or totes'],
      applications: ['Fixed fire protection systems', 'Fire department apparatus', 'Industrial fire response', 'Retrofit into existing water systems'],
      url: 'https://hct-world.com/diamond-doser/'
    }
  });
  items.push({
    id: 'bladdertank', name: 'Bladder Tank System', cat: 'suppression', category: 'HCT · Fixed System', desc: 'Designed or retrofitted to deliver F-500 EA® to existing sprinkler or deluge systems. Units from 36 gal (136 L) to 12,000 gal (45,425 L).', cost_range: 'Contact HCT', standards: ['NFPA 18A', 'NFPA 13'],
    details: {
      how: 'Bladder tank systems store F-500 EA® concentrate and deliver it through existing sprinkler or deluge infrastructure. Can be designed from scratch or retrofitted into current systems — no full system replacement needed.',
      highlights: ['Retrofit into any existing sprinkler or deluge system', 'Capacity range: 36 gal (136 L) to 12,000 gal (45,425 L)', 'No system redesign required for most installations', 'Consistent concentrate delivery under pressure'],
      applications: ['Data center battery rooms', 'Warehouse storage areas', 'Manufacturing fire zones', 'BESS container installations'],
      url: 'https://hct-world.com/systems/'
    }
  });
  items.push({
    id: 'veep', name: 'VEEP System', cat: 'suppression', category: 'HCT + Embedded Logix · Integrated', desc: 'Vapor Encapsulation and Explosion Prevention. Complete detect-prevent-suppress system combining Smart-LX® detection with NFPA 18A Encapsulator Technology suppression.', cost_range: 'Contact HCT', standards: ['NFPA 18A', 'NFPA 69'],
    details: {
      how: 'VEEP integrates Smart-LX® intelligent detection with Diamond Doser® delivery of F-500 EA® — closing the loop from early warning to active suppression in one automated system. Detection triggers suppression without human intervention.',
      highlights: ['End-to-end automated: detect → alert → suppress', 'Smart-LX® thermal + gas monitoring triggers suppression', 'Diamond Doser® delivers F-500 EA® on demand', 'Covers flammability, explosivity, and toxicity simultaneously', 'Reduces response time from minutes to seconds'],
      applications: ['BESS installations', 'Power generation substations', 'Recycling facilities', 'Refineries and chemical plants', 'Warehouses with Li-ion inventory'],
      url: 'https://hct-world.com/smart-lx/'
    }
  });

  /* === EMBEDDED LOGIX — SMART-LX PRODUCTS === */
  items.push({
    id: 'slx-gateway', name: 'Smart-LX® Sensor Gateway', cat: 'detection', category: 'Embedded Logix · IIoT Platform', desc: 'Open-architecture platform connecting infrared cameras, PLCs, and SCADA systems. Brand-agnostic sensor aggregation with rules-based alarm decisions.', cost_range: 'Contact Embedded Logix', standards: ['NFPA 72'],
    details: {
      how: 'Smart-LX® Sensor Gateway is an open-architecture IIoT platform that connects any sensor — infrared cameras, gas detectors, PLCs, SCADA — into a unified rules-based alarm system. Brand-agnostic by design, it works with FLIR, AXIS, Planck, IFM, and legacy devices.',
      highlights: ['Brand-agnostic: connects FLIR, AXIS, Planck, IFM, and more', 'Rules-based alarm decisions — not just threshold alerts', 'Communicates with legacy devices via signal modules', 'On-premise or cloud-hosted deployment', '30+ years of test and measurement heritage'],
      applications: ['Substations and power generation', 'Manufacturing process monitoring', 'Food safety inspection', 'Metal processing quality control', 'BESS thermal monitoring'],
      url: 'https://www.emlogix.net/'
    }
  });
  items.push({
    id: 'slx-analytics', name: 'Smart-LX® Enterprise Analytics', cat: 'detection', category: 'Embedded Logix · Analytics', desc: 'AI-powered dashboards with temperature trend analysis, historical data, weather correlation, and custom rules. Identifies trending temps before fire breaks out.', cost_range: 'Contact Embedded Logix', standards: ['NFPA 72', 'NFPA 855'],
    details: {
      how: 'Enterprise Analytics provides custom-configured dashboards that track temperature trends, compare asset performance across facilities, and correlate with weather data. AI-powered models help develop expert systems that improve over time.',
      highlights: ['Custom dashboards for metrics that matter to your team', 'Historical data facilitates goal setting and demonstrates improvement', 'Weather correlation shows environmental impact on asset health', 'Compare similar assets across all stations and facilities', 'Becomes an expert system with your input over time'],
      applications: ['Substation asset health monitoring', 'Battery room temperature trending', 'Manufacturing quality assurance', 'Predictive maintenance programs', 'Insurance compliance documentation'],
      url: 'https://www.emlogix.net/'
    }
  });
  items.push({
    id: 'slx-studio', name: 'Smart-LX® Studio', cat: 'detection', category: 'Embedded Logix · Thermal Imaging', desc: 'Thermal imaging appliance for real-time temperature monitoring. Detects thermal runaway, hot stamping quality, and process anomalies across industrial environments.', cost_range: 'Contact Embedded Logix', standards: ['NFPA 72'],
    details: {
      how: 'Smart-LX® Studio combines infrared sensors with the Smart-LX® software platform to monitor temperature distribution, material consistency, and patterns in real-time. Originally developed for automotive safety testing, now expanded to fire prevention and process monitoring.',
      highlights: ['Real-time thermal imaging with trend analysis', 'Monitors temperature distribution and material consistency', 'Detects invisible coatings and surface anomalies', 'Turn-key: sensor selection, system design, commissioning, calibration'],
      applications: ['Hot stamping and forging quality control', 'Food safety pre-cooked inspection', 'Battery cell manufacturing monitoring', 'Casting process quality assurance', 'Fire prevention asset monitoring'],
      url: 'https://www.emlogix.net/factory-solutions'
    }
  });
  items.push({
    id: 'slx-hotspot', name: 'Smart-LX® Hot Spot Detection', cat: 'detection', category: 'Embedded Logix · Fire Prevention', desc: 'Automated hot spot detection with customizable rules to distinguish real fires from equipment. Replaces 24/7 manual monitoring with smart alerts to mobile devices.', cost_range: 'Contact Embedded Logix', standards: ['NFPA 72', 'NFPA 855'],
    details: {
      how: 'Smart-LX® applies customizable rules to radiometric thermal data, distinguishing real fire threats from vehicles, equipment, or normal heat signatures. Escalating warnings continue until a responder adopts the alert. Prevents fires instead of just detecting them.',
      highlights: ['Customizable rules reduce false alarms dramatically', 'Replaces 24/7 manual monitoring with automated alerts', 'Escalating warnings until responder acknowledges', 'Near real-time data to smartphones and tablets', 'VMS integration triggers image feeds on fire risk alarms'],
      applications: ['BESS battery room monitoring', 'Recycling center fire prevention', 'Substation transformer monitoring', 'Warehouse combustible storage areas', 'Power plant asset protection'],
      url: 'https://hct-world.com/smart-lx/'
    }
  });
  items.push({
    id: 'slx-vapor', name: 'Smart-LX® Gas & Vapor Monitor', cat: 'detection', category: 'Embedded Logix · Explosion Prevention', desc: 'Integrated gas and vapor monitoring for explosion prevention. Monitors LEL in power plants, recycling centers, refineries, and warehouses with escalating alerts.', cost_range: 'Contact Embedded Logix', standards: ['NFPA 69', 'NFPA 497'],
    details: {
      how: 'Monitors gas concentrations and vapor levels continuously, tracking LEL (Lower Explosive Limit) in real-time. When paired with thermal monitoring, creates a multi-sensor explosion prevention system. Part of the VEEP ecosystem.',
      highlights: ['Continuous LEL monitoring with trend analysis', 'Multi-sensor fusion: gas + thermal + vibration', 'Escalating alerts with responder acknowledgment', 'Integrates with VEEP for automated suppression trigger', 'Historical data for compliance and insurance documentation'],
      applications: ['Refineries and chemical plants', 'Recycling centers', 'Power generation facilities', 'Confined space monitoring', 'Tank farm vapor control'],
      url: 'https://www.emlogix.net/'
    }
  });

  /* === HCT SERVICES === */
  items.push({
    id: 'hct-training', name: 'HCT Training Program', cat: 'consults', category: 'HCT · Training', desc: 'Badge-to-badge training by active and retired firefighters. 25+ years of field experience with Encapsulator Technology. On-site and virtual options.', cost_range: 'Contact HCT', standards: ['NFPA 18A'],
    details: {
      how: 'HCT training is delivered badge-to-badge — by firefighters, for firefighters. The majority of HCT\'s training team comprises active and retired firefighters with over 25 years of field experience using Encapsulator Technology.',
      highlights: ['Badge-to-badge instruction from active/retired firefighters', 'On-site hands-on training with live fire exercises', 'Virtual training options available', 'Equipment operation: Diamond Doser®, bladder tanks, nozzles', 'Chemistry education: why encapsulation beats foam'],
      applications: ['Fire department adoption programs', 'Industrial fire brigade training', 'Facility emergency response teams', 'New equipment commissioning training'],
      url: 'https://hct-world.com/training/'
    }
  });
  items.push({
    id: 'hct-consulting', name: 'HCT Consulting & Engineering', cat: 'consults', category: 'HCT · Design-Build', desc: 'System design, hydraulic analysis, and fire protection engineering. ISO 9001:2015 certified. Custom solutions for BESS, data centers, aviation, marine, and manufacturing.', cost_range: 'Contact HCT', standards: ['NFPA 18A', 'NFPA 855', 'ISO 9001'],
    details: {
      how: 'HCT\'s engineering team provides complete design-build fire protection services — from initial hazard assessment through hydraulic analysis, system specification, installation oversight, and commissioning. ISO 9001:2015 certified quality management.',
      highlights: ['Full design-build from assessment to commissioning', 'Hydraulic analysis for fire hydrant and suppression lines', 'ISO 9001:2015 certified quality management', 'Custom solutions for complex environments', 'Integration with existing building fire protection infrastructure'],
      applications: ['BESS and ESS installations', 'Data center battery rooms and server halls', 'Aircraft hangars and maintenance facilities', 'Marine and offshore platforms', 'Manufacturing and warehouse facilities'],
      url: 'https://hct-world.com/about/'
    }
  });

  /* === FROM INCIDENT DATA (if loaded) === */
  const sol = D.acts?.act_04?.hct_solution;
  if (sol && !items.some(i => i.name.includes('F-500 EA'))) items.push({ name: sol.product, cat: 'suppression', category: 'Suppression', desc: sol.description, cost_range: 'Contact', standards: [sol.standard] });
  (D.acts?.act_04?.additional_recommendations || []).forEach(r => {
    if (!items.some(i => i.name === r.product || i.name === r.action)) items.push({ name: r.product || r.action, cat: r.cat || 'detection', category: r.category || 'Detection', desc: r.description, cost_range: r.cost || 'Contact', standards: r.standards || [], priority: r.priority, timeline: r.timeline || '30-DAY' });
  });
  if (D.inspections) {
    D.inspections.in_person.forEach(p => items.push({ ...p, cat: 'inspections', desc: p.scope[0], actionId: p.id }));
    D.inspections.online_consults.forEach(p => items.push({ ...p, cat: 'consults', desc: p.scope[0], actionId: p.id }));
    D.inspections.drone_inspections.forEach(p => items.push({ ...p, cat: 'drone', desc: p.scope[0], actionId: p.id }));
  }
  return items;
}
function filterCatalog() {
  const ac = $('#ctxCatNav .ctx-nav-btn.active')?.dataset.cat || 'all';
  const at = $('#ctxFilterTimeline .ctx-chip.active')?.dataset.filter || 'all';
  const ap = $('#ctxFilterPriority .ctx-chip.active')?.dataset.filter || 'all';
  const q = ($('#catSearch')?.value || '').toLowerCase();
  $$('#catGrid .cat-card').forEach(c => {
    let s = true;
    if (ac !== 'all' && c.dataset.cat !== ac) s = false;
    if (ap !== 'all' && c.dataset.priority !== ap) s = false;
    if (at !== 'all' && !c.dataset.timeline.includes(at)) s = false;
    if (q && !c.textContent.toLowerCase().includes(q)) s = false;
    c.style.display = s ? '' : 'none';
  });
  const cn = { all: 'All Products & Services', suppression: 'Suppression Systems', detection: 'Detection Systems', inspections: 'Inspections', consults: 'Consultations', drone: 'Drone Services' };
  $('#catTitle').textContent = cn[ac] || 'All Products & Services';
}

/* === CHANNELS === */
function initChannels() {
  $$('#ctxChannelList .ctx-channel').forEach(btn => btn.addEventListener('click', () => {
    $$('#ctxChannelList .ctx-channel').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const ch = btn.dataset.channel;
    const n = { general: 'General', engineering: 'Engineering', sales: 'Sales', services: 'Services', marketing: 'Marketing' };
    const d = { general: 'Company-wide updates', engineering: 'Technical discussions', sales: 'Sales coordination', services: 'Service delivery', marketing: 'Marketing campaigns' };
    $('#chanName').textContent = n[ch] || ch; $('#chanDesc').textContent = d[ch] || '';
    $('#chanChat').placeholder = `Message #${n[ch] || ch}...`;
  }));
}

/* ═══ ROLE SELECTOR ═══ */
const ROLES = [
  { id: 'facility-mgr', label: 'Facility Manager', sub: 'Building ops, maintenance', icon: 'warehouse' },
  { id: 'first-responder', label: 'First Responder', sub: 'Fire, EMS, hazmat', icon: 'fire' },
  { id: 'insurance', label: 'Insurance / Risk', sub: 'Underwriting, claims', icon: 'shield' },
  { id: 'ahj', label: 'AHJ Inspector', sub: 'Fire marshal, code official', icon: 'search' },
  { id: 'engineer', label: 'Engineer / EHS', sub: 'Design, safety, compliance', icon: 'detection' },
  { id: 'executive', label: 'Executive', sub: 'C-suite, budget authority', icon: 'star' },
  { id: 'other', label: 'Other', sub: 'Custom role', icon: 'custom' },
];

function initRoleSelector() {
  const grid = $('#roleGrid'); if (!grid) return;
  grid.innerHTML = ROLES.map(r => `<button class="role-card" data-role="${r.id}">${icon(r.icon, 'role-card-icon')}<div class="role-card-label">${r.label}</div><div class="role-card-sub">${r.sub}</div></button>`).join('');
  // Custom input below grid (hidden initially)
  const customWrap = document.createElement('div');
  customWrap.className = 'role-custom-input hidden';
  customWrap.id = 'roleCustomWrap';
  customWrap.innerHTML = `<input class="cf-input" id="roleCustomInput" placeholder="Describe your role..." autocomplete="off"><button class="cf-btn cf-btn-primary" id="roleCustomSubmit">Continue</button>`;
  grid.parentElement.appendChild(customWrap);

  grid.querySelectorAll('.role-card').forEach(btn => btn.addEventListener('click', () => {
    grid.querySelectorAll('.role-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    userRole = btn.dataset.role;
    if (userRole === 'other') {
      $('#roleCustomWrap').classList.remove('hidden');
      $('#roleCustomInput').focus();
    } else {
      $('#roleCustomWrap').classList.add('hidden');
      setTimeout(() => showPostRole(), 350);
    }
  }));
  $('#roleCustomSubmit')?.addEventListener('click', () => {
    const val = $('#roleCustomInput')?.value;
    if (val) userRole = 'other:' + val;
    showPostRole();
  });
}

function showPostRole() {
  // Role-specific subtitles — functional, not marketing
  const subs = {
    'facility-mgr': 'Configure your facility. Assess suppression readiness. Get compliance documentation and countermeasure specifications.',
    'first-responder': 'Assess suppression systems and hazmat exposure. Access tactical response data and equipment specifications.',
    'insurance': 'Evaluate facility risk profile. Model loss scenarios across failure modes. Generate underwriting documentation.',
    'ahj': 'Verify suppression compliance against NFPA standards. Generate deficiency reports and remediation timelines.',
    'engineer': 'Specify detection and suppression systems. Validate chemistry compatibility. Design fire protection architecture.',
    'executive': 'Review risk exposure and financial impact. Evaluate countermeasure ROI across facility portfolio.',
  };

  // Fade out role selector, fade in hero + facility
  const rs = $('#roleSelector');
  rs.style.opacity = '0';
  rs.style.transition = 'opacity .3s ease';
  setTimeout(() => {
    rs.classList.add('hidden');
    rs.style.opacity = '';
    rs.style.transition = '';
    // Show hero with role-appropriate text
    const hero = $('#heroSection');
    const sub = $('#heroSub');
    if (sub) sub.textContent = subs[userRole] || subs['facility-mgr'];
    hero.classList.remove('hidden');
    // Show facility selector
    const fs = $('#facilitySelector');
    fs.classList.remove('hidden');
    // Update settings
    const sr = $('#settRole');
    if (sr) sr.textContent = ROLES.find(r => r.id === userRole)?.label || (userRole?.startsWith('other:') ? userRole.slice(6) : 'Not set');
  }, 300);
}

/* ═══ EMERGENCY RESPONSE ═══ */
const DISASTER_TYPES = [
  { id: 'thermal-runaway', label: 'Li-ion Thermal Runaway', sub: 'Battery fire, off-gas, cascade', icon: 'fire', severity: 'critical' },
  { id: 'electrical-fire', label: 'Electrical Fire', sub: 'Arc flash, panel, transformer', icon: 'detection', severity: 'high' },
  { id: 'chemical-release', label: 'Chemical / HF Gas Release', sub: 'Toxic vapor, spill, leak', icon: 'suppression', severity: 'critical' },
  { id: 'explosion', label: 'Explosion', sub: 'Deflagration, BLEVE, dust', icon: 'alert', severity: 'critical' },
  { id: 'natural-flood', label: 'Flood / Water Intrusion', sub: 'Storm, pipe burst, surge', icon: 'suppression', severity: 'high' },
  { id: 'natural-quake', label: 'Earthquake', sub: 'Structural, secondary fire', icon: 'alert', severity: 'high' },
  { id: 'natural-storm', label: 'Hurricane / Severe Storm', sub: 'Wind, debris, power loss', icon: 'alert', severity: 'standard' },
  { id: 'structural', label: 'Structural Failure', sub: 'Collapse, compromise', icon: 'warehouse', severity: 'high' },
];

const SEVERITY_LEVELS = ['Contained', 'Escalating', 'Uncontrolled', 'Mass casualty'];

const AHJ_ROUTING = {
  'thermal-runaway': {
    authorities: [
      { name: 'Local Fire Department', action: '911 — immediate dispatch', when: 'Immediately', docs: ['Incident location & floor', 'Battery chemistry (NMC/NCA/LFP)', 'Number of modules involved', 'HF gas presence Y/N'] },
      { name: 'State Fire Marshal', action: 'File incident report within 24h', when: 'Within 24 hours', docs: ['NFIRS Incident Report', 'Battery system specifications', 'Suppression system status', 'Timeline of events'] },
      { name: 'OSHA', action: 'Report if hospitalization or fatality', when: 'Within 8 hours if injury', docs: ['OSHA Form 301', 'Exposure records', 'JSA documentation', 'Training records'] },
      { name: 'EPA', action: 'Report HF gas release if above threshold', when: 'Within 24 hours', docs: ['EPCRA Tier II report', 'Chemical inventory', 'Release quantity estimate', 'Remediation plan'] },
      { name: 'Insurance Carrier', action: 'File notice of loss', when: 'Within 48 hours', docs: ['Policy number', 'Loss estimate', 'Suppression system documentation', 'Photo/video evidence'] },
      { name: 'Utility Provider', action: 'Request emergency disconnect if needed', when: 'Immediately if energized', docs: ['Account number', 'Meter location', 'Isolation requirements'] },
    ],
    training: ['F-500 EA® Li-ion suppression techniques', 'HF gas exposure protocols', 'Battery room emergency procedures', 'NFPA 855 compliance for BESS'],
  },
  'electrical-fire': {
    authorities: [
      { name: 'Local Fire Department', action: '911 — immediate dispatch', when: 'Immediately', docs: ['Incident location', 'Equipment involved', 'Voltage class', 'Isolation status'] },
      { name: 'State Fire Marshal', action: 'File incident report', when: 'Within 24 hours', docs: ['NFIRS Incident Report', 'Equipment specifications', 'Electrical system single-line diagram'] },
      { name: 'OSHA', action: 'Report if arc flash injury', when: 'Within 8 hours if injury', docs: ['OSHA Form 301', 'Arc flash assessment records', 'PPE documentation'] },
      { name: 'Insurance Carrier', action: 'File notice of loss', when: 'Within 48 hours', docs: ['Policy number', 'Loss estimate', 'Maintenance records'] },
    ],
    training: ['Electrical fire response procedures', 'Arc flash safety', 'NFPA 70E compliance', 'De-energization protocols'],
  },
  'chemical-release': {
    authorities: [
      { name: 'Local Fire Department / HazMat', action: '911 — HazMat response', when: 'Immediately', docs: ['Chemical identity / SDS', 'Quantity released', 'Wind direction', 'Evacuation radius'] },
      { name: 'EPA / National Response Center', action: 'Report release above RQ', when: 'Immediately if above reportable quantity', docs: ['NRC Report Form', 'Chemical CAS number', 'Release quantity', 'Impacted media (air/water/soil)'] },
      { name: 'State Environmental Agency', action: 'State spill notification', when: 'Within 24 hours', docs: ['State spill report form', 'Remediation plan', 'Contractor information'] },
      { name: 'OSHA', action: 'Report exposure incident', when: 'Within 8 hours if injury', docs: ['OSHA Form 301', 'Exposure monitoring records', 'Medical surveillance records'] },
      { name: 'Insurance Carrier', action: 'File environmental liability notice', when: 'Within 48 hours', docs: ['Policy number', 'Remediation cost estimate', 'Third-party impact assessment'] },
    ],
    training: ['HydroLock® vapor mitigation techniques', 'HF gas first responder protocols', 'HAZWOPER refresher', 'Chemical spill containment'],
  },
  'explosion': {
    authorities: [
      { name: 'Local Fire Department', action: '911 — mass casualty protocol', when: 'Immediately', docs: ['Location and structure type', 'Estimated casualties', 'Secondary hazards', 'Utility status'] },
      { name: 'ATF', action: 'Notify if suspected criminal origin', when: 'Within 24 hours', docs: ['Evidence preservation', 'Witness statements', 'Surveillance footage'] },
      { name: 'State Fire Marshal', action: 'Mandatory investigation', when: 'Within 24 hours', docs: ['NFIRS Incident Report', 'Structural assessment', 'Origin and cause evidence'] },
      { name: 'OSHA', action: 'Fatality/catastrophe report', when: 'Within 8 hours', docs: ['OSHA Form 301', 'Process safety records', 'NFPA 69 compliance documentation'] },
      { name: 'Insurance Carrier', action: 'Major loss notification', when: 'Immediately', docs: ['Policy number', 'Preliminary damage assessment', 'Business interruption estimate'] },
    ],
    training: ['VEEP system operation', 'NFPA 69 deflagration prevention', 'Explosion investigation protocols', 'Emergency evacuation procedures'],
  },
  'natural-flood': {
    authorities: [
      { name: 'Local Emergency Management', action: 'Report facility impact', when: 'When safe to do so', docs: ['Facility status assessment', 'Equipment damage inventory', 'Utility status'] },
      { name: 'Insurance Carrier', action: 'File flood claim', when: 'Within 48 hours', docs: ['NFIP policy or commercial flood policy', 'Water line documentation (photos)', 'Inventory of damaged equipment', 'Business interruption timeline'] },
      { name: 'EPA', action: 'Report if hazmat released by flooding', when: 'If chemical release occurs', docs: ['NRC Report Form', 'Chemicals potentially displaced', 'Containment status'] },
    ],
    training: ['Post-flood electrical safety', 'Water damage assessment for battery systems', 'Mold and corrosion prevention protocols'],
  },
  'natural-quake': {
    authorities: [
      { name: 'Local Fire Department', action: 'Report structural concerns', when: 'Immediately if collapse risk', docs: ['Building damage assessment', 'Utility leak status', 'Occupancy status'] },
      { name: 'Building Department', action: 'Request structural inspection', when: 'Before re-occupancy', docs: ['ATC-20 rapid assessment', 'Structural engineer report', 'Occupancy permit'] },
      { name: 'Insurance Carrier', action: 'File earthquake claim', when: 'Within 48 hours', docs: ['Policy number', 'Structural damage photos', 'Equipment displacement records'] },
    ],
    training: ['Post-earthquake facility assessment', 'Secondary fire prevention after seismic event', 'Battery rack securing and seismic bracing'],
  },
  'natural-storm': {
    authorities: [
      { name: 'Local Emergency Management', action: 'Report facility status', when: 'After storm passes', docs: ['Damage assessment', 'Generator/backup status', 'Staffing status'] },
      { name: 'Insurance Carrier', action: 'File wind/storm claim', when: 'Within 48 hours', docs: ['Policy number', 'Roof/exterior damage documentation', 'Equipment damage inventory'] },
      { name: 'Utility Provider', action: 'Report outage', when: 'When power lost', docs: ['Account information', 'Generator capacity', 'Critical load requirements'] },
    ],
    training: ['Backup power operations', 'Generator safety', 'Storm preparation checklists'],
  },
  'structural': {
    authorities: [
      { name: 'Local Fire Department', action: '911 if occupants at risk', when: 'Immediately', docs: ['Building type and construction', 'Collapse area', 'Occupancy estimate', 'Utility status'] },
      { name: 'Building Department', action: 'Emergency inspection', when: 'Immediately', docs: ['Structural assessment', 'Engineer of record contact', 'Original building plans'] },
      { name: 'OSHA', action: 'Report if worker injury/fatality', when: 'Within 8 hours', docs: ['OSHA Form 301', 'Inspection records', 'Maintenance history'] },
      { name: 'Insurance Carrier', action: 'File structural claim', when: 'Within 48 hours', docs: ['Policy number', 'Structural engineer assessment', 'Remediation estimate'] },
    ],
    training: ['Structural integrity assessment', 'Confined space rescue', 'Shoring and stabilization techniques'],
  },
};

// Fallback for types not in AHJ_ROUTING
function getAHJData(typeId) {
  return AHJ_ROUTING[typeId] || AHJ_ROUTING['structural'];
}

function initEmergency() {
  // Populate disaster type grid
  const grid = $('#emTypeGrid'); if (!grid) return;
  grid.innerHTML = DISASTER_TYPES.map(t => `<button class="em-type-card" data-type="${t.id}">
    ${icon(t.icon, 'em-type-icon')}
    <div class="em-type-name">${t.label}</div>
    <div class="em-type-sub">${t.sub}</div>
  </button>`).join('');

  grid.querySelectorAll('.em-type-card').forEach(btn => btn.addEventListener('click', () => {
    grid.querySelectorAll('.em-type-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    emData.type = btn.dataset.type;
    emData.typeLabel = DISASTER_TYPES.find(t => t.id === btn.dataset.type)?.label || '';
    startEmFlow();
  }));

  // Flow navigation
  $('#emNext')?.addEventListener('click', nextEmStep);
  $('#emBack')?.addEventListener('click', prevEmStep);
}

function startEmFlow() {
  emStep = 0; emData.severity = ''; emData.location = ''; emData.floor = ''; emData.people = ''; emData.suppression = ''; emData.description = '';
  const flow = $('#emFlow'); flow.classList.remove('hidden');
  $('#emCenter').classList.add('no-center');
  renderEmStep();
  if (typeof triggerEmergencyMode === 'function') triggerEmergencyMode();
}

function renderEmStep() {
  const body = $('#emFlowBody'), header = $('#emFlowHeader'), back = $('#emBack'), next = $('#emNext');
  // Progress
  const prog = $('#emProgress');
  prog.innerHTML = [0, 1, 2].map(i => `<div class="cf-progress-step${i < emStep ? ' done' : ''}${i === emStep ? ' active' : ''}"></div>`).join('');
  back.classList.toggle('hidden', emStep === 0);

  if (emStep === 0) {
    header.textContent = 'Assess severity';
    body.innerHTML = `<div class="cf-field"><label class="cf-label">Current severity</label>
      <div class="cf-chips" id="emSeverity">${SEVERITY_LEVELS.map(s => `<button class="cf-chip${emData.severity === s ? ' selected' : ''}" data-val="${s}">${s}</button>`).join('')}</div></div>
      <div class="cf-field"><label class="cf-label">People at risk</label>
      <div class="cf-chips" id="emPeople">${['None', '1-10', '11-50', '50+', 'Unknown'].map(s => `<button class="cf-chip${emData.people === s ? ' selected' : ''}" data-val="${s}">${s}</button>`).join('')}</div></div>
      <div class="cf-field"><label class="cf-label">Brief description</label>
      <textarea class="cf-input" id="emDesc" rows="3" placeholder="What do you see? Smoke, flames, gas, alarms...">${emData.description || ''}</textarea></div>`;
    initChips('#emSeverity', v => emData.severity = v);
    initChips('#emPeople', v => emData.people = v);
    next.textContent = 'Next';
  } else if (emStep === 1) {
    header.textContent = 'Locate the incident';
    body.innerHTML = `<div class="cf-field"><label class="cf-label">Facility / building name</label>
      <input class="cf-input" id="emLocName" placeholder="e.g. Building 3, Battery Room A" value="${emData.location || facilityConfig?.facilityName || ''}"></div>
      <div class="cf-field"><label class="cf-label">Floor / area</label>
      <input class="cf-input" id="emFloor" placeholder="e.g. 5th floor, east wing" value="${emData.floor || ''}"></div>
      <div class="cf-field"><label class="cf-label">Address / directions</label>
      <textarea class="cf-input" id="emDirections" rows="2" placeholder="Street address or directions to the incident location">${emData.directions || ''}</textarea></div>`;
    next.textContent = 'Next';
  } else if (emStep === 2) {
    header.textContent = 'Current suppression status';
    body.innerHTML = `<div class="cf-field"><label class="cf-label">Suppression system activated?</label>
      <div class="cf-chips" id="emSuppStatus">${['Yes — working', 'Yes — failed', 'No — not activated', 'No system installed', 'Unknown'].map(s => `<button class="cf-chip${emData.suppStatus === s ? ' selected' : ''}" data-val="${s}">${s}</button>`).join('')}</div></div>
      <div class="cf-field"><label class="cf-label">Suppression type (if known)</label>
      <div class="cf-chips" id="emSuppType">${['FM-200', 'CO₂', 'Sprinkler', 'Halon', 'F-500 EA', 'None', 'Unknown'].map(s => `<button class="cf-chip${emData.suppression === s ? ' selected' : ''}" data-val="${s}">${s}</button>`).join('')}</div></div>
      <div class="cf-field"><label class="cf-label">Has evacuation started?</label>
      <div class="cf-chips" id="emEvac">${['Yes', 'No', 'Partial', 'N/A'].map(s => `<button class="cf-chip${emData.evac === s ? ' selected' : ''}" data-val="${s}">${s}</button>`).join('')}</div></div>`;
    initChips('#emSuppStatus', v => emData.suppStatus = v);
    initChips('#emSuppType', v => emData.suppression = v);
    initChips('#emEvac', v => emData.evac = v);
    next.textContent = 'Generate Response Plan';
  }
}

function initChips(sel, cb) {
  const wrap = $(sel); if (!wrap) return;
  wrap.querySelectorAll('.cf-chip').forEach(c => c.addEventListener('click', () => {
    wrap.querySelectorAll('.cf-chip').forEach(b => b.classList.remove('selected'));
    c.classList.add('selected'); cb(c.dataset.val);
  }));
}

function nextEmStep() {
  if (emStep === 0) { emData.description = $('#emDesc')?.value || ''; }
  if (emStep === 1) { emData.location = $('#emLocName')?.value || ''; emData.floor = $('#emFloor')?.value || ''; emData.directions = $('#emDirections')?.value || ''; }
  if (emStep < 2) { emStep++; renderEmStep(); return; }
  // Generate the full response plan
  generateEmReport();
}
function prevEmStep() { if (emStep > 0) { emStep--; renderEmStep(); } }

function generateEmReport() {
  logAudit(`Emergency response initiated: ${emData.type}`, 'CONFIDENTIAL');
  // Trigger cross-section reactivity — update training + monitor
  if (typeof onEmergencyComplete === 'function') onEmergencyComplete(emData);
  const report = $('#emReport');
  const ahj = getAHJData(emData.type);
  const dtype = DISASTER_TYPES.find(t => t.id === emData.type);
  const isCritical = emData.severity === 'Uncontrolled' || emData.severity === 'Mass casualty' || dtype?.severity === 'critical';

  // Hide the type selector and hero
  $('#emCenter').classList.add('hidden');

  // Build 911 summary
  const summary911 = build911Summary();

  let h = '';

  // === 911 CARD (always first if critical) ===
  if (isCritical || emData.severity === 'Escalating') {
    h += `<div class="em-911-card">
      <div class="em-911-header"><span class="em-911-icon">⚠</span><span class="em-911-title">Call 911 now</span></div>
      <div class="em-911-summary">${summary911.map((l, i) => `<div class="em-911-line"><span class="em-911-num">${i + 1}</span>${l}</div>`).join('')}</div>
      <div class="em-911-actions">
        <button class="insp-btn insp-btn-primary" onclick="copy911()">Copy summary</button>
        <a href="tel:911" class="insp-btn">Call 911</a>
        ${emData.directions ? `<button class="insp-btn" onclick="shareDirections()">Share directions</button>` : ''}
      </div>
    </div>`;
  }

  // === IMMEDIATE ACTIONS ===
  h += `<div class="em-section">
    <div class="em-section-title">Immediate actions</div>
    <div class="em-actions-list">${getImmediateActions().map(a => `<div class="em-action-item"><span class="em-action-priority em-p-${a.priority}">${a.priority}</span><span class="em-action-text">${a.text}</span></div>`).join('')}</div>
  </div>`;

  // === AHJ ROUTING ===
  h += `<div class="em-section">
    <div class="em-section-title">Authority notification</div>
    <div class="em-section-sub">Who to contact, when, and what documentation they need</div>
    <div class="em-ahj-list">${ahj.authorities.map(a => `<div class="em-ahj-card">
      <div class="em-ahj-head"><div class="em-ahj-name">${a.name}</div><div class="em-ahj-when">${a.when}</div></div>
      <div class="em-ahj-action">${a.action}</div>
      <div class="em-ahj-docs-title">Required documentation</div>
      <div class="em-ahj-docs">${a.docs.map(d => `<div class="em-ahj-doc">· ${d}</div>`).join('')}</div>
    </div>`).join('')}</div>
  </div>`;

  // === ROOT CAUSE ===
  h += `<div class="em-section">
    <div class="em-section-title">Root cause assessment</div>
    ${canAssessRootCause() ? `<div class="em-root-cause">${getRootCauseAssessment()}</div>` : `<div class="em-root-unknown">
      <div class="em-root-unknown-icon">◎</div>
      <div class="em-root-unknown-text">Root cause cannot be determined during an active incident. Containment is the priority. Post-incident investigation will establish origin and cause per NFPA 921.</div>
      <div class="em-root-unknown-next">Recommended: Post-Incident Forensic Investigation (available in catalog)</div>
    </div>`}
  </div>`;

  // === TRAINING RECOMMENDATIONS ===
  if (ahj.training && ahj.training.length) {
    h += `<div class="em-section">
      <div class="em-section-title">Training gaps identified</div>
      <div class="em-section-sub">Based on this incident type, ensure your team has completed</div>
      <div class="em-training-list">${ahj.training.map(t => `<div class="em-training-item"><span class="em-training-check">✓</span><span>${t}</span></div>`).join('')}</div>
      <div class="em-training-actions">
        <button class="insp-btn" onclick="switchView('catalog')">Browse training programs</button>
        <button class="insp-btn" onclick="generateStakeholderReport('training')">Export training plan</button>
      </div>
    </div>`;
  }

  // === GENERATE REPORTS ===
  h += `<div class="em-section">
    <div class="em-section-title">Generate reports</div>
    <div class="em-section-sub">Per-audience documentation ready for distribution</div>
    <div class="em-report-grid">
      <button class="em-report-btn" onclick="generateStakeholderReport('ahj')">
        <div class="em-report-btn-head"><span class="em-report-badge">AHJ</span></div>
        <div class="em-report-btn-label">Authority Notification</div>
        <div class="em-report-btn-contents">
          <div class="em-report-line">Incident classification & timeline</div>
          <div class="em-report-line">NFIRS-compatible incident report</div>
          <div class="em-report-line">Suppression system compliance status</div>
          <div class="em-report-line">Required follow-up documentation</div>
          <div class="em-report-line">Remediation timeline & milestones</div>
        </div>
        <div class="em-report-btn-dest">→ State Fire Marshal, Local FD, Building Dept</div>
      </button>
      <button class="em-report-btn" onclick="generateStakeholderReport('insurance')">
        <div class="em-report-btn-head"><span class="em-report-badge em-badge-ins">INS</span></div>
        <div class="em-report-btn-label">Insurance & Loss</div>
        <div class="em-report-btn-contents">
          <div class="em-report-line">Notice of loss with policy reference</div>
          <div class="em-report-line">Preliminary damage assessment</div>
          <div class="em-report-line">Suppression system documentation</div>
          <div class="em-report-line">Business interruption estimate</div>
          <div class="em-report-line">Countermeasure ROI analysis</div>
        </div>
        <div class="em-report-btn-dest">→ Insurance carrier, Risk management</div>
      </button>
      <button class="em-report-btn" onclick="generateStakeholderReport('internal')">
        <div class="em-report-btn-head"><span class="em-report-badge em-badge-int">INT</span></div>
        <div class="em-report-btn-label">Internal Incident Report</div>
        <div class="em-report-btn-contents">
          <div class="em-report-line">Full event timeline with timestamps</div>
          <div class="em-report-line">Root cause analysis (or TBD flag)</div>
          <div class="em-report-line">System failure documentation</div>
          <div class="em-report-line">Corrective actions & ownership</div>
          <div class="em-report-line">Training gaps & LMS recommendations</div>
        </div>
        <div class="em-report-btn-dest">→ EHS, Facility management, C-suite</div>
      </button>
      <button class="em-report-btn" onclick="generateStakeholderReport('responder')">
        <div class="em-report-btn-head"><span class="em-report-badge em-badge-resp">TAC</span></div>
        <div class="em-report-btn-label">First Responder Brief</div>
        <div class="em-report-btn-contents">
          <div class="em-report-line">Hazmat identification & SDS reference</div>
          <div class="em-report-line">Facility layout & access routes</div>
          <div class="em-report-line">Suppression system status & type</div>
          <div class="em-report-line">Recommended agent (F-500 EA®)</div>
          <div class="em-report-line">Evacuation status & personnel count</div>
        </div>
        <div class="em-report-btn-dest">→ Fire department, HazMat team, EMS</div>
      </button>
    </div>
  </div>`;

  // Action bar at bottom
  h += `<div class="em-action-bar"><button class="cf-btn cf-btn-primary" onclick="resetEmergency();switchView('emergency')">New Response</button></div>`;

  report.innerHTML = h;
  report.classList.remove('hidden');
  $('#emFlow').classList.add('hidden');
  report.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function build911Summary() {
  const dtype = DISASTER_TYPES.find(t => t.id === emData.type);
  const lines = [];
  lines.push(`${dtype?.label || 'Fire'} at ${emData.location || '[facility name]'}${emData.floor ? ', ' + emData.floor : ''}.`);
  lines.push(`Severity: ${emData.severity || 'Unknown'}. ${emData.people && emData.people !== 'None' ? emData.people + ' people at risk.' : 'No known casualties.'}`);
  lines.push(`Suppression: ${emData.suppStatus || 'Unknown'}${emData.suppression && emData.suppression !== 'Unknown' ? ' (' + emData.suppression + ')' : ''}.${emData.evac === 'Yes' ? ' Evacuation underway.' : emData.evac === 'Partial' ? ' Partial evacuation.' : ''}`);
  lines.push(emData.directions || '[Provide facility address and access directions]');
  return lines;
}

function copy911() {
  const lines = build911Summary();
  navigator.clipboard?.writeText(lines.join('\n')).then(() => alert('911 summary copied to clipboard.')).catch(() => { });
}
function shareDirections() {
  const text = `Incident location: ${emData.location || ''}${emData.floor ? ', ' + emData.floor : ''}.\n${emData.directions || ''}`;
  if (navigator.share) navigator.share({ title: 'Incident Location', text }).catch(() => { });
  else navigator.clipboard?.writeText(text).then(() => alert('Directions copied.')).catch(() => { });
}

function getImmediateActions() {
  const actions = [];
  const isCrit = emData.severity === 'Uncontrolled' || emData.severity === 'Mass casualty';
  actions.push({ text: 'Activate fire alarm and initiate evacuation if not already underway' });
  if (isCrit) actions.push({ text: 'Call 911 — provide the 4-line summary above' });
  else actions.push({ text: 'Notify facility emergency coordinator' });
  if (emData.type === 'thermal-runaway' || emData.type === 'chemical-release') {
    actions.push({ text: 'Establish upwind evacuation perimeter — HF gas / toxic vapor risk' });
    actions.push({ text: 'Identify battery chemistry and module count for responders' });
  }
  if (emData.type === 'explosion') actions.push({ text: 'Establish collapse zone — do not re-enter structure' });
  if (emData.suppStatus === 'Yes — failed' || emData.suppression === 'FM-200') {
    actions.push({ text: 'FM-200 / clean agent cannot suppress Li-ion thermal runaway — do not rely on it' });
  }
  actions.push({ text: 'Isolate utilities — EPO, electrical disconnect, gas shutoff' });
  actions.push({ text: 'Stage at designated assembly point — account for all personnel' });
  actions.push({ text: 'Begin documenting: photos, timestamps, witness names' });
  actions.push({ text: 'Preserve CCTV/BMS/alarm logs — do not overwrite' });
  actions.push({ text: 'Notify insurance carrier within 48 hours' });
  return actions;
}

function canAssessRootCause() {
  return emData.severity === 'Contained' && emData.type !== 'explosion';
}

function getRootCauseAssessment() {
  const causes = {
    'thermal-runaway': 'Likely origin: internal cell failure in Li-ion module — manufacturing defect, dendrite growth, or overcharge condition. Contributing factors may include degraded BMS thresholds, expired battery lifecycle, or absent off-gas detection. Full root cause requires post-incident forensic analysis per NFPA 921.',
    'electrical-fire': 'Likely origin: arc fault, overloaded circuit, or insulation degradation. Contributing factors may include deferred maintenance, undersized conductors, or missing arc-fault protection per NEC 2023. Full investigation recommended.',
    'chemical-release': 'Likely origin: containment failure — valve, seal, or vessel integrity. Contributing factors may include corrosion, overpressure, or impact damage. Environmental sampling required to assess extent.',
    'natural-flood': 'Primary cause: weather event exceeding facility flood mitigation design. Assessment: evaluate battery system exposure to water, corrosion risk to electrical systems, and structural integrity of containment.',
    'natural-quake': 'Primary cause: seismic event. Assessment: evaluate battery rack displacement, fire suppression pipe integrity, and structural connections. Secondary fire risk from damaged electrical systems.',
    'natural-storm': 'Primary cause: wind/debris damage. Assessment: evaluate roof integrity, equipment exposure, and backup power status.',
    'structural': 'Likely origin: load exceedance, material fatigue, or foundation failure. Full structural engineering assessment required before re-occupancy.',
  };
  return causes[emData.type] || 'Root cause assessment requires post-incident investigation.';
}

function generateStakeholderReport(audience) {
  const dtype = DISASTER_TYPES.find(t => t.id === emData.type);
  const ahj = getAHJData(emData.type);
  const lines = build911Summary();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString();
  let title = '', sections = [];

  if (audience === 'ahj') {
    title = 'Authority Having Jurisdiction — Incident Notification';
    sections = [
      { heading: 'Incident classification', content: `Type: ${dtype?.label}\nSeverity: ${emData.severity || 'Under assessment'}\nDate: ${dateStr}\nTime: ${timeStr}\nDuration: Ongoing / To be determined` },
      { heading: 'Location', content: `Facility: ${emData.location || '[To be confirmed]'}\nArea: ${emData.floor || '[To be confirmed]'}\nAddress: ${emData.directions || '[To be confirmed]'}` },
      { heading: 'Incident summary', content: lines.join('\n') },
      { heading: 'Suppression system status', content: `Installed system: ${emData.suppression || 'Unknown'}\nActivation status: ${emData.suppStatus || 'Unknown'}\nEffectiveness: ${emData.suppression === 'FM-200' ? 'Ineffective — FM-200 cannot arrest Li-ion thermal runaway (NFPA 18A)' : emData.suppression === 'CO₂' ? 'Insufficient — CO₂ lacks thermal mass for sustained cooling' : 'Under assessment'}\nEvacuation status: ${emData.evac || 'Unknown'}` },
      { heading: 'NFPA compliance findings', content: `NFPA 855 (ESS): ${emData.type === 'thermal-runaway' ? 'Off-gas detection status to be verified. Battery lifecycle compliance to be assessed.' : 'N/A — not a battery event.'}\nNFPA 72 (Fire Alarm): Alarm system activation status to be documented.\nNFPA 13/18A (Suppression): ${emData.suppression === 'FM-200' ? 'FM-200 is not listed for Li-ion thermal runaway per NFPA 18A Annex 4.3.' : 'Suppression system compliance to be verified.'}` },
      { heading: 'Required follow-up documentation', items: ahj.authorities.flatMap(a => a.docs) },
      { heading: 'Notification timeline', items: ahj.authorities.map(a => `${a.when}: ${a.name} — ${a.action}`) },
      { heading: 'Remediation requirements', content: 'To be determined pending post-incident investigation per NFPA 921. Preliminary recommendation: evaluate suppression system compatibility with Li-ion chemistry per NFPA 18A.' },
    ];
  } else if (audience === 'insurance') {
    title = 'Insurance Carrier — Notice of Loss';
    sections = [
      { heading: 'Notice of loss', content: `Incident type: ${dtype?.label}\nDate of loss: ${dateStr}\nLocation: ${emData.location || '[To be confirmed]'}${emData.floor ? ', ' + emData.floor : ''}\nPolicy: [Policy number to be inserted]` },
      { heading: 'Incident summary', content: lines.join('\n') },
      { heading: 'Preliminary damage assessment', content: `Severity: ${emData.severity || 'Under assessment'}\nPeople at risk: ${emData.people || 'Unknown'}\nEvacuation: ${emData.evac || 'Unknown'}\n\nPreliminary loss categories:\n  - Direct property damage: To be assessed\n  - Business interruption: To be assessed\n  - Equipment replacement: To be assessed\n  - Environmental remediation: ${emData.type === 'chemical-release' ? 'Likely required' : 'To be assessed'}\n  - Third-party liability: To be assessed` },
      { heading: 'Suppression system documentation', content: `Installed system: ${emData.suppression || 'Unknown'}\nSystem activated: ${emData.suppStatus || 'Unknown'}\nSystem effectiveness: ${emData.suppression === 'FM-200' ? 'FM-200 deployed but chemically ineffective against Li-ion thermal runaway. System is not rated for this fire class per NFPA 18A.' : emData.suppression === 'CO₂' ? 'CO₂ deployed but provided insufficient thermal mass for sustained cooling.' : 'Under assessment.'}\n\nNote: Facilities with F-500 EA Encapsulator Agent (NFPA 18A) demonstrate measurably reduced loss severity in Li-ion events.` },
      { heading: 'Business interruption', content: `Services affected: To be determined\nEstimated downtime: To be determined\nData impact: To be determined\nRecovery timeline: To be determined` },
      { heading: 'Required documentation for claim', items: ['Completed proof of loss form', 'Inventory of damaged equipment with replacement costs', 'Suppression system maintenance and inspection records', 'BMS/alarm system logs for 72 hours prior', 'Facility maintenance records', 'Photo and video documentation of damage', 'Witness statements', 'Fire department incident report'] },
      { heading: 'Countermeasure ROI analysis', content: `Current suppression: ${emData.suppression || 'Unknown'}\nRecommended: F-500 EA Encapsulator Agent with Diamond Doser delivery\nEstimated annual premium reduction with compliant suppression: $890K–$2.1M (varies by facility class and policy)\nBasis: NFPA 18A compliance, three-level mitigation (flammability, explosivity, toxicity)` },
    ];
  } else if (audience === 'internal') {
    title = 'Internal Incident Report';
    sections = [
      { heading: 'Incident overview', content: `Type: ${dtype?.label}\nDate/Time: ${dateStr} ${timeStr}\nLocation: ${emData.location || '[To be confirmed]'}${emData.floor ? ', ' + emData.floor : ''}\nSeverity: ${emData.severity || 'Under assessment'}\nReported by: [Name to be inserted]` },
      { heading: 'Event description', content: emData.description || '[Detailed description to be completed]' },
      { heading: 'Incident summary', content: lines.join('\n') },
      { heading: 'Response actions taken', items: ['Fire alarm activated: [Time]', 'Evacuation initiated: [Time]', 'Emergency services called: [Time]', 'Suppression system activated: ' + (emData.suppStatus || 'Unknown'), 'Utilities isolated: [Time/Status]', 'Incident commander designated: [Name]'] },
      { heading: 'Suppression system assessment', content: `System: ${emData.suppression || 'Unknown'}\nStatus: ${emData.suppStatus || 'Unknown'}\nEffectiveness: ${emData.suppression === 'FM-200' ? 'FM-200 is chemically ineffective against Li-ion thermal runaway. The agent works by interrupting the chemical chain reaction, but Li-ion thermal runaway is a self-sustaining exothermic decomposition that does not require external oxygen. FM-200 cannot reduce cell temperature below the thermal runaway threshold (~130°C for NMC).' : 'To be assessed.'}` },
      { heading: 'Root cause analysis', content: canAssessRootCause() ? getRootCauseAssessment() : 'Root cause cannot be determined during active incident response. Post-incident forensic investigation required per NFPA 921.\n\nPreliminary contributing factors to be investigated:\n  - Equipment maintenance history\n  - Alarm threshold configurations\n  - Training and procedure compliance\n  - System design adequacy' },
      { heading: 'Training gaps identified', items: ahj.training || [] },
      { heading: 'Corrective actions required', items: ['[Immediate] Complete post-incident damage assessment', '[Immediate] Preserve all evidence, logs, and documentation', '[7-day] Commission NFPA 921 origin and cause investigation', '[30-day] Review and update emergency response procedures', '[30-day] Evaluate suppression system compatibility', '[90-day] Implement corrective actions from investigation findings', '[90-day] Conduct training per identified gaps'] },
      { heading: 'Distribution', items: ['Facility management', 'EHS department', 'Risk management', 'Legal department', 'Insurance carrier (separate report)', 'AHJ (separate report)'] },
    ];
  } else if (audience === 'responder') {
    title = 'First Responder Tactical Brief';
    sections = [
      { heading: 'INCIDENT', content: `${dtype?.label.toUpperCase()}\nLocation: ${emData.location || '[Facility]'}${emData.floor ? ', ' + emData.floor : ''}\nAddress: ${emData.directions || '[Provide to dispatch]'}\nSeverity: ${emData.severity || 'Under assessment'}\nPeople at risk: ${emData.people || 'Unknown'}\nEvacuation status: ${emData.evac || 'Unknown'}` },
      { heading: 'HAZMAT information', content: emData.type === 'thermal-runaway' ? 'HAZARD: Lithium-ion battery thermal runaway\n  - Hydrogen fluoride (HF) gas release — toxic, corrosive\n  - Electrolyte vapor — flammable\n  - Cell temperatures exceeding 600°C possible\n  - Cascading propagation to adjacent modules\n\nPPE REQUIRED: Full SCBA, Level B minimum\nDO NOT use plain water — risk of electrolyte spread\nDO NOT rely on FM-200 or CO₂ — chemically ineffective\nRECOMMENDED: F-500 EA Encapsulator Agent (NFPA 18A)' : emData.type === 'chemical-release' ? 'HAZARD: Chemical / toxic vapor release\n  - Identify substance via SDS\n  - Approach from upwind only\n  - Establish hot/warm/cold zones\n\nPPE REQUIRED: Full SCBA, chemical-resistant suit\nContainment priority — prevent drain/waterway contamination' : 'Refer to facility SDS binder for materials involved.\nPPE: Per standard operating procedures.' },
      { heading: 'Suppression status', content: `Installed: ${emData.suppression || 'Unknown'}\nActivated: ${emData.suppStatus || 'Unknown'}\n${emData.suppression === 'FM-200' ? 'NOTE: FM-200 is NOT effective against Li-ion thermal runaway.' : emData.suppression === 'CO₂' ? 'NOTE: CO₂ provides limited cooling — insufficient for sustained thermal runaway.' : ''}` },
      { heading: 'Facility information', content: `Building type: ${facilityConfig?.typeName || 'To be confirmed at scene'}\nBattery chemistry: ${facilityConfig?.battery || 'To be confirmed'}\nModule count: ${facilityConfig?.modules || 'To be confirmed'}\nEPO location: [Confirm with facility manager]\nUtility shutoffs: [Confirm with facility manager]` },
      { heading: 'Recommended tactical approach', items: emData.type === 'thermal-runaway' ? ['Establish command 200ft upwind minimum', 'Deploy HF gas monitoring at perimeter', 'Confirm EPO activation — verify generator isolation', 'If F-500 EA available: apply at 3% ratio through handline or monitor', 'If F-500 EA not available: defensive operations, protect exposures', 'Do not enter battery room without continuous gas monitoring', 'Coordinate with utility for confirmed electrical isolation'] : ['Establish incident command per local SOP', 'Size up and confirm hazards', 'Coordinate with facility emergency coordinator', 'Request additional resources as needed'] },
    ];
  }

  // Render in-page report
  let h = `<div class="em-stakeholder-report">
    <div class="em-sr-header">
      <div class="em-sr-title">${title}</div>
      <div class="em-sr-meta">Generated ${dateStr} ${timeStr} | Pantheon Operational Intelligence</div>
      <div class="em-sr-actions">
        <button class="insp-btn insp-btn-primary" onclick="emailStakeholderReport('${audience}')">Email report</button>
        <button class="insp-btn" onclick="copyStakeholderReport('${audience}')">Copy to clipboard</button>
        <button class="insp-btn" onclick="closeStakeholderReport()">Close</button>
      </div>
    </div>`;
  sections.forEach(s => {
    h += `<div class="em-sr-section"><div class="em-sr-sh">${s.heading}</div>`;
    if (s.content) h += `<div class="em-sr-content">${s.content.replace(/\n/g, '<br>')}</div>`;
    if (s.items) h += `<div class="em-sr-items">${s.items.map(i => `<div class="em-sr-item">· ${i}</div>`).join('')}</div>`;
    h += `</div>`;
  });
  h += `<div class="em-sr-footer">This report is generated by Pantheon Operational Intelligence for informational purposes. All data should be verified by qualified personnel. Report does not constitute legal, engineering, or insurance advice.</div>`;
  h += `</div>`;

  // Insert into report area (replace existing or append)
  let sr = $('#emStakeholderReport');
  if (!sr) { sr = document.createElement('div'); sr.id = 'emStakeholderReport'; $('#emReport').appendChild(sr); }
  sr.innerHTML = h;
  sr.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function emailStakeholderReport(audience) {
  const sr = $('#emStakeholderReport');
  if (!sr) return;
  const text = sr.innerText;
  const dtype = DISASTER_TYPES.find(t => t.id === emData.type);
  const subjects = { ahj: 'Incident Notification', insurance: 'Notice of Loss', internal: 'Internal Incident Report', responder: 'First Responder Brief' };
  const subject = `Pantheon: ${subjects[audience] || 'Report'} — ${dtype?.label || 'Incident'} — ${emData.location || 'Facility'}`;
  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, '_blank');
}

function copyStakeholderReport() {
  const sr = $('#emStakeholderReport');
  if (!sr) return;
  navigator.clipboard?.writeText(sr.innerText).then(() => alert('Report copied to clipboard.')).catch(() => { });
}

function closeStakeholderReport() {
  const sr = $('#emStakeholderReport');
  if (sr) sr.innerHTML = '';
}

function resetEmergency() {
  emStep = 0; emData = {};
  $('#emFlow')?.classList.add('hidden');
  $('#emReport')?.classList.add('hidden');
  $('#emCenter')?.classList.remove('hidden');
  $('#emCenter')?.classList.remove('no-center');
  $$('#emTypeGrid .em-type-card').forEach(b => b.classList.remove('selected'));
}

/* ═══ SETTINGS ═══ */
function initSettings() {
  // Preferences tab - read from facilityConfig
  var fc = facilityConfig || {};
  var prefRows = document.querySelectorAll('#settPrefs .sett-val');
  if (prefRows.length >= 3) {
    prefRows[2].textContent = fc.region || 'Not set';  // Region
    prefRows[3].textContent = fc.facilityName || fc.typeName || 'Not set';  // Default facility
  }
  // Facilities tab - read from facilityConfig
  var facRows = document.querySelectorAll('#settFacilities .sett-val');
  if (facRows.length >= 3) {
    facRows[0].textContent = fc.battery || 'NMC';
    facRows[1].textContent = fc.suppression || 'FM-200';
    facRows[2].textContent = fc.region || 'Not set';
  }
}

/* ═══ SECURITY ═══ */
const auditLog = [];

function initSecurity() {
  // Security tabs — scoped to #viewSecurity
  $$('#secTabs .sett-tab').forEach(btn => btn.addEventListener('click', () => {
    $$('#secTabs .sett-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('#viewSecurity .sett-panel').forEach(p => p.classList.remove('active'));
    const panel = $('#' + tab);
    if (panel) panel.classList.add('active');
  }));
  // Sidebar nav sync
  $$('#ctxSecNav .ctx-nav-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('#ctxSecNav .ctx-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const sec = btn.dataset.sec;
    $$('#secTabs .sett-tab').forEach(t => {
      if (t.dataset.tab === 'sec-' + sec) t.click();
    });
  }));
  // Create compartment button
  $('#secAddCompartment')?.addEventListener('click', () => {
    const name = prompt('Compartment name:');
    if (!name) return;
    const list = $('#secCompartments');
    const card = document.createElement('div'); card.className = 'sec-comp-card';
    card.innerHTML = `<div class="sec-comp-head"><span class="sec-comp-name">${name}</span><span class="sec-comp-badge sec-tag-conf">CONFIDENTIAL</span></div><div class="sec-comp-meta">Admin only · New compartment</div><div class="sec-comp-stats">Simulations: 0 · Reports: 0 · Members: 1</div>`;
    list.appendChild(card);
    logAudit('Compartment created: ' + name, 'INTERNAL');
  });
}

function logAudit(action, classification) {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  auditLog.unshift({ time: ts, action, classification, full: now.toISOString() });
  // Update audit log display if visible
  const log = $('#secAuditLog');
  if (!log) return;
  // Remove empty state
  const empty = log.querySelector('.sec-audit-empty');
  if (empty) empty.remove();
  const entry = document.createElement('div'); entry.className = 'sec-audit-entry';
  const tagClass = classification === 'RESTRICTED' ? 'sec-tag-rest' : classification === 'CONFIDENTIAL' ? 'sec-tag-conf' : classification === 'INTERNAL' ? 'sec-tag-int' : 'sec-tag-pub';
  entry.innerHTML = `<span class="sec-audit-time">${ts}</span><span class="sec-audit-action">${action}</span><span class="sec-audit-class ${tagClass}">${classification}</span>`;
  log.prepend(entry);
  // Update sidebar counts
  updateSecCounts();
}

function updateSecCounts() {
  const counts = { RESTRICTED: 0, CONFIDENTIAL: 0, INTERNAL: 0, PUBLIC: 0 };
  auditLog.forEach(e => counts[e.classification] = (counts[e.classification] || 0) + 1);
  const r = $('#ctxSecRestricted'), c = $('#ctxSecConfidential'), i = $('#ctxSecInternal'), p = $('#ctxSecPublic');
  if (r) r.textContent = counts.RESTRICTED;
  if (c) c.textContent = counts.CONFIDENTIAL;
  if (i) i.textContent = counts.INTERNAL;
  if (p) p.textContent = counts.PUBLIC;
}
/* ═══ THEME TOGGLE ═══ */
function initTheme() {
  const saved = localStorage.getItem('pantheon-theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
  const btn = $('#themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    localStorage.setItem('pantheon-theme', isDark ? 'dark' : 'light');
    // Update icon
    btn.innerHTML = isDark
      ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M17.3 11.3A8 8 0 118.7 2.7a6 6 0 008.6 8.6z"/></svg>';
  });
}

/* === LIVE MONITOR === */
function initMonitor() {
  renderMonitorGrid();
  renderMonitorFeed();
  renderMonitorCtx();
  // Fire initial watch-zone badge and notification on page load
  setTimeout(function() {
    if (typeof addRailBadge === 'function') addRailBadge('monitor', 1);
    if (typeof showToast === 'function') {
      showToast('Monitor: Electrical Room temperature trending — 34.6°C', 'warning', 5000);
    }
  }, 1800);
  // Simulate live updates
  setInterval(updateMonitorPulse, 5000);
}

function renderMonitorGrid() {
  const grid = $('#monGrid');
  if (!grid) return;
  // Use facility profile zones if available
  var profile = null;
  if (typeof FACILITY_PROFILES !== 'undefined' && typeof facilityConfig !== 'undefined' && facilityConfig.type) {
    profile = FACILITY_PROFILES[facilityConfig.type.toLowerCase().replace(/[\s-]+/g,'')] || null;
  }
  var defaultZones = [
    { name: 'Battery Room 5F', status: 'normal', temp: '28.3', gas: '0 ppm', sensors: 4, icon: 'fire' },
    { name: 'Server Hall A', status: 'normal', temp: '21.7', gas: '0 ppm', sensors: 6, icon: 'datacenter' },
    { name: 'Server Hall B', status: 'normal', temp: '22.1', gas: '0 ppm', sensors: 6, icon: 'datacenter' },
    { name: 'Electrical Room', status: 'watch', temp: '34.6', gas: '0 ppm', sensors: 2, icon: 'detection' },
    { name: 'Generator Bay', status: 'normal', temp: '26.8', gas: '0 ppm', sensors: 2, icon: 'manufacturing' },
    { name: 'Cooling Plant', status: 'normal', temp: '18.2', gas: '0 ppm', sensors: 3, icon: 'suppression' },
  ];
  var zones = defaultZones;
  if (profile && profile.zones) {
    zones = profile.zones.map(function(z, i) {
      return { name: z, status: i === 0 ? 'watch' : 'normal', temp: (20 + Math.random() * 15).toFixed(1), gas: '0 ppm', sensors: Math.ceil(Math.random() * 4) + 2, icon: i === 0 ? 'fire' : 'datacenter' };
    });
  }
  // Live scenario button at top
  var liveBtn = '<button class="live-scenario-btn" onclick="if(typeof startLiveMonitorScenario===\'function\')startLiveMonitorScenario(3)" title="Run a realistic sensor anomaly scenario">' +
    '<div class="pulse-dot"></div><span>Start Live Smart-LX Scenario</span></button>';
  grid.innerHTML = liveBtn + zones.map(z => `
    <div class="mon-card mon-card-${z.status}">
      <div class="mon-card-head">
        ${icon(z.icon)} <span class="mon-card-name">${z.name}</span>
        <span class="mon-status-badge mon-status-${z.status}">${z.status.toUpperCase()}</span>
      </div>
      <div class="mon-card-metrics">
        <div class="mon-metric"><div class="mon-metric-val">${z.temp}&deg;C</div><div class="mon-metric-label">Temperature</div></div>
        <div class="mon-metric"><div class="mon-metric-val">${z.gas}</div><div class="mon-metric-label">Gas (HF)</div></div>
        <div class="mon-metric"><div class="mon-metric-val">${z.sensors}</div><div class="mon-metric-label">Sensors</div></div>
      </div>
      <div class="mon-card-bar"><div class="mon-card-fill" style="width:${z.status === 'watch' ? '65' : '95'}%;background:${z.status === 'watch' ? 'var(--yellow)' : 'var(--green)'}"></div></div>
    </div>
  `).join('');
}

function renderMonitorFeed() {
  const feed = $('#monFeed');
  if (!feed) return;
  const events = [
    { time: 'Now', type: 'info', msg: 'All Smart-LX sensors reporting nominal. Next calibration: 14 days.' },
    { time: '2m ago', type: 'watch', msg: 'Electrical Room temperature trending up: 34.6\u00b0C (threshold: 38\u00b0C). Monitoring.' },
    { time: '15m ago', type: 'ok', msg: 'Battery Room 5F voltage check complete. All 384 modules within spec.' },
    { time: '1h ago', type: 'ok', msg: 'Smart-LX Hot Spot Detection scan complete. 0 anomalies detected.' },
    { time: '3h ago', type: 'info', msg: 'Gas & Vapor Monitor daily calibration verified. LEL baseline: 0.0%.' },
    { time: '6h ago', type: 'ok', msg: 'Shift change logged. Outgoing team confirmed all zones clear.' },
  ];
  feed.innerHTML = events.map(e => `
    <div class="mon-event mon-event-${e.type}">
      <span class="mon-event-time">${e.time}</span>
      <span class="mon-event-dot mon-dot-${e.type}"></span>
      <span class="mon-event-msg">${e.msg}</span>
    </div>
  `).join('');
}

function renderMonitorCtx() {
  const zl = $('#monZoneList');
  if (zl) {
    zl.innerHTML = ['Battery Room 5F','Server Hall A','Server Hall B','Electrical Room','Generator Bay','Cooling Plant'].map(z =>
      `<div class="ctx-row"><span class="ctx-dot dot-ok"></span><span class="ctx-name">${z}</span><span class="ctx-status-text">OK</span></div>`
    ).join('');
    const cnt = $('#monZoneCnt'); if (cnt) cnt.textContent = '6';
  }
  const sl = $('#monSensorList');
  if (sl) {
    sl.innerHTML = ['Thermal Camera A','Thermal Camera B','Gas Monitor 5F','Gas Monitor EL','Voltage Monitor','Impedance Probe'].map(s =>
      `<div class="ctx-row"><span class="ctx-dot dot-ok"></span><span class="ctx-name">${s}</span><span class="ctx-status-text">LIVE</span></div>`
    ).join('');
    const cnt = $('#monSensorCnt'); if (cnt) cnt.textContent = '6';
  }
  const ac = $('#monAssetCount'); if (ac) ac.textContent = (D.assets||[]).length || '12';
  const tc = $('#monTempMax'); if (tc) tc.textContent = '34.6\u00b0C';
}

function updateMonitorPulse() {
  // Simulate live temp fluctuation
  const cards = $$('.mon-metric-val');
  cards.forEach(c => {
    const text = c.textContent;
    if (text.includes('\u00b0C')) {
      const base = parseFloat(text);
      const jitter = (Math.random() - 0.5) * 0.4;
      c.textContent = (base + jitter).toFixed(1) + '\u00b0C';
    }
  });
}

/* === TRAINING & READINESS === */
/* === TRAINING & READINESS === */
function initTraining() {
  renderTrainingPrescriptions();
  renderTrainingCourses();
  renderTrainingCerts();
  renderTrainingCtx();
  // Fire badge for initial gap count
  setTimeout(function() {
    var gaps = getTrainingGaps();
    if (gaps.length > 0) {
      if (typeof addRailBadge === 'function') addRailBadge('training', gaps.length);
      if (typeof showToast === 'function') {
        var critical = gaps.filter(function(g) { return g.priority === 'CRITICAL'; }).length;
        if (critical > 0) {
          showToast(critical + ' critical training gap' + (critical > 1 ? 's' : '') + ' detected for your facility', 'warning', 5000);
        }
      }
    }
  }, 2200);
}

function getTrainingGaps() {
  // Derive training needs from simulation data, facility config, and compliance
  const gaps = [];
  const fc = (typeof facilityConfig !== 'undefined' && facilityConfig) ? facilityConfig : {};
  const hasSimData = !!(typeof D !== 'undefined' && D && D.acts);
  const facType = (fc.type || fc.typeName || '').toLowerCase();
  const battery = (fc.battery || '').toLowerCase();
  const suppression = (fc.suppression || '').toLowerCase();
  const isBESS = facType.includes('bess') || facType.includes('ess') || facType.includes('battery');
  const isDataCenter = facType.includes('data') || facType.includes('server');
  const isLiIon = battery.includes('nmc') || battery.includes('lfp') || battery.includes('li') || battery.includes('lithium');
  const hasLegacyAgent = suppression.includes('fm-200') || suppression.includes('co2') || suppression.includes('halon');

  // Simulation-derived gaps (only if sim has run)
  if (hasSimData) {
    gaps.push({ source: 'Simulation', priority: 'CRITICAL', title: 'Li-Ion Thermal Runaway Response', desc: 'FM-200/CO₂ incompatibility with Li-ion fires identified. Crew must understand suppression chemistry gap.', standard: 'NFPA 855', course: 'HCT-TR-100' });
    gaps.push({ source: 'Simulation', priority: 'CRITICAL', title: 'F-500 EA Deployment Procedures', desc: 'Micelle mist delivery, nozzle configuration, and concentration ratios for battery room applications.', standard: 'NFPA 18A', course: 'HCT-FA-200' });
    gaps.push({ source: 'Simulation', priority: 'HIGH', title: 'Emergency Power-Off (EPO) Protocols', desc: 'EPO activation including generator isolation. Simulation revealed partial EPO failure risk.', standard: 'NEC 645', course: 'HCT-EP-150' });
    gaps.push({ source: 'Simulation', priority: 'HIGH', title: 'HF Gas Evacuation & Hazmat', desc: 'Hydrogen fluoride exposure limits, PPE requirements, and evacuation zone calculations.', standard: 'OSHA 1910', course: 'HCT-HZ-300' });
    gaps.push({ source: 'Incident Data', priority: 'HIGH', title: 'Job Safety Analysis (JSA)', desc: 'Skipped JSA identified as contributing factor. Mandatory pre-work hazard assessment for battery maintenance.', standard: 'OSHA 1910', course: 'HCT-JS-100' });
  }

  // Facility-config derived gaps
  if (isBESS || isLiIon) {
    gaps.push({ source: 'Compliance', priority: 'HIGH', title: 'BESS BMS Alarm Management', desc: 'Proper alarm threshold configuration for BESS. Raised thresholds contribute to delayed detection.', standard: 'NFPA 855', course: 'HCT-BM-200' });
    gaps.push({ source: 'Compliance', priority: 'MEDIUM', title: 'Pre-Incident Planning (BESS)', desc: 'Facility-specific pre-incident plans per NFPA 1620 for fire department coordination at BESS sites.', standard: 'NFPA 1620', course: 'HCT-PI-100' });
  }
  if (isDataCenter) {
    gaps.push({ source: 'Compliance', priority: 'HIGH', title: 'Data Center EPO & Suppression', desc: 'Total flooding agent suitability for IT rooms. F-500 EA vs legacy clean agents for NMC cells.', standard: 'NFPA 75', course: 'HCT-DC-100' });
  }
  if (hasLegacyAgent) {
    gaps.push({ source: 'Compliance', priority: 'CRITICAL', title: 'Legacy Agent Incompatibility', desc: 'FM-200 and CO₂ do not address thermal runaway re-ignition. Crew training on suppression chemistry gap is mandatory.', standard: 'NFPA 18A', course: 'HCT-FA-200' });
  }

  // Always-present best practices
  gaps.push({ source: 'Best Practice', priority: 'MEDIUM', title: 'Smart-LX Platform Operation', desc: 'Thermal imaging interpretation, alert triage, and custom rule configuration for early detection.', standard: 'NFPA 72', course: 'EL-SLX-100' });

  // Deduplicate by title
  const seen = new Set();
  return gaps.filter(function(g) {
    if (seen.has(g.title)) return false;
    seen.add(g.title);
    return true;
  });
}

function renderTrainingPrescriptions() {
  const el = $('#trainPrescriptions');
  if (!el) return;
  const gaps = getTrainingGaps();
  if (!gaps.length) {
    el.innerHTML = '<div class="train-sh">AI-PRESCRIBED TRAINING GAPS</div><div style="padding:20px 0;color:var(--t3);font:400 13px/1.6 var(--sans)">Configure your facility to generate personalised training prescriptions. Run a simulation to surface additional gaps.</div>';
    return;
  }
  const priorityAiClass = { 'CRITICAL': 'ai-imm', 'HIGH': 'ai-30', 'MEDIUM': 'ai-90', 'LOW': 'ai-90' };
  el.innerHTML = `
    <div class="train-sh">AI-PRESCRIBED TRAINING GAPS</div>
    <div class="train-prescription-list">${gaps.map(g => {
      const p = (g.priority || 'MEDIUM').toUpperCase();
      const aiCls = priorityAiClass[p] || 'ai-90';
      return `
      <div class="train-rx train-rx-${p.toLowerCase()}">
        <div class="train-rx-head">
          <span class="train-rx-priority ai-p ${aiCls}">${p}</span>
          <span class="train-rx-title">${g.title}</span>
          <span class="train-rx-source">${g.source}</span>
        </div>
        <div class="train-rx-desc">${g.desc}</div>
        <div class="train-rx-meta">
          <span class="cat-card-tag">${g.standard}</span>
          <span class="cat-card-tag">${g.course}</span>
          <button class="insp-btn insp-btn-sm" onclick="switchView('catalog')">Find Course</button>
        </div>
      </div>`;
    }).join('')}</div>`;
}

function renderTrainingCourses() {
  const el = $('#trainCourseGrid');
  if (!el) return;
  const courses = [
    { name: 'Li-Ion Fire Chemistry', provider: 'HCT', duration: '4 hours', mode: 'On-site + Virtual', tags: ['NFPA 855','NFPA 18A'], priority: 'CRITICAL' },
    { name: 'F-500 EA Hands-On Lab', provider: 'HCT', duration: '8 hours', mode: 'On-site only', tags: ['NFPA 18A','NFPA 750'], priority: 'CRITICAL' },
    { name: 'EPO & Electrical Safety', provider: 'HCT', duration: '4 hours', mode: 'On-site + Virtual', tags: ['NEC 645','NFPA 70E'], priority: 'HIGH' },
    { name: 'HF Gas & Hazmat Response', provider: 'HCT', duration: '6 hours', mode: 'On-site only', tags: ['OSHA 1910','NFPA 472'], priority: 'HIGH' },
    { name: 'Smart-LX Platform Certification', provider: 'Embedded Logix', duration: '2 days', mode: 'Virtual', tags: ['NFPA 72','NFPA 855'], priority: 'MEDIUM' },
    { name: 'BESS Pre-Incident Planning', provider: 'HCT', duration: '3 hours', mode: 'Virtual', tags: ['NFPA 1620'], priority: 'MEDIUM' },
  ];
  const badgeCls = { 'CRITICAL': 'ss-badge-full', 'HIGH': 'ss-badge-partial', 'MEDIUM': '', 'LOW': '' };
  el.innerHTML = courses.map(c => `
    <div class="train-course">
      <div class="train-course-head">
        ${icon('package')} <span class="train-course-name">${c.name}</span>
        <span class="cat-card-badge ${badgeCls[c.priority] || ''}">${c.priority}</span>
      </div>
      <div class="train-course-provider">${c.provider} &middot; ${c.duration} &middot; ${c.mode}</div>
      <div class="train-course-tags">${c.tags.map(t => `<span class="cat-card-tag">${t}</span>`).join('')}</div>
      <div class="train-course-actions"><button class="insp-btn insp-btn-sm insp-btn-primary">Enroll</button><button class="insp-btn insp-btn-sm">Details</button></div>
    </div>
  `).join('');
}

function renderTrainingCerts() {
  const el = $('#trainCertGrid');
  if (!el) return;
  const certs = [
    { name: 'BESS Fire Safety Certified', issuer: 'HCT / NFPA', status: 'Not started', due: '30 days', icon: 'shield' },
    { name: 'F-500 EA Applicator', issuer: 'HCT', status: 'Not started', due: '60 days', icon: 'suppression' },
    { name: 'Smart-LX Operator Level 1', issuer: 'Embedded Logix', status: 'Not started', due: '90 days', icon: 'detection' },
    { name: 'Hazmat Awareness (HF)', issuer: 'OSHA / HCT', status: 'Not started', due: '30 days', icon: 'alert' },
  ];
  el.innerHTML = certs.map(c => `
    <div class="train-cert">
      <div class="train-cert-head">${icon(c.icon)} <span class="train-cert-name">${c.name}</span></div>
      <div class="train-cert-issuer">${c.issuer}</div>
      <div class="train-cert-meta"><span>Status: <strong>${c.status}</strong></span><span>Due: <strong>${c.due}</strong></span></div>
      <div class="train-cert-actions"><button class="insp-btn insp-btn-sm insp-btn-primary">Start</button></div>
    </div>
  `).join('');
}

function renderTrainingCtx() {
  const gaps = getTrainingGaps();
  const sc = $('#trainScore'); if (sc) sc.textContent = '34%';
  const gc = $('#trainGaps'); if (gc) gc.textContent = gaps.length;
  const cl = $('#trainCatList');
  if (cl) {
    const cats = ['Suppression','Detection','Electrical','Hazmat','Compliance','Platform'];
    cl.innerHTML = cats.map(c => `<div class="ctx-row"><span class="ctx-dot dot-warn"></span><span class="ctx-name">${c}</span></div>`).join('');
  }
  const sl = $('#trainSourceList');
  if (sl) {
    sl.innerHTML = [
      {label:'Simulation findings', dot:'dot-red'},
      {label:'Emergency response', dot:'dot-warn'},
      {label:'Compliance gaps', dot:'dot-ok'},
      {label:'Best practices', dot:'dot-ok'},
    ].map(s => `<div class="ctx-gap-row"><span class="ctx-gap-dot ${s.dot}"></span>${s.label}</div>`).join('');
  }
}

/* ═══════════════════════════════════════════════════
   PANTHEON WOW FACTOR — Live Intelligence Layer
   ═══════════════════════════════════════════════════ */

/* === 1. LIVE SIMULATION EXPERIENCE === */
/* Assets degrade in sidebar as each act streams */
const SIM_TIMELINE = {
  full: [
    { act: 0, assets: { 'UPS Battery Array A': 'degraded', 'Aspirating Smoke Detector': 'operational', 'MV Switchgear': 'operational' }, alerts: [], monitorTemp: 28 },
    { act: 1, assets: { 'UPS Battery Array A': 'degraded' }, alerts: ['BMS threshold raised — Module 247 voltage trending'], monitorTemp: 31 },
    { act: 2, assets: { 'UPS Battery Array A': 'failed', 'Aspirating Smoke Detector': 'degraded', 'Clean Agent FM-200': 'failed', 'CO₂ Suppression': 'failed' }, alerts: ['THERMAL RUNAWAY — Module 247', 'FM-200 deployed — INEFFECTIVE', 'CO₂ deployed — INSUFFICIENT'], monitorTemp: 89 },
    { act: 3, assets: { 'UPS Battery Array A': 'destroyed', 'Server Cluster A (120 racks)': 'destroyed', 'CRAH Units': 'failed', 'Core Network Switch': 'failed', 'Emergency Lighting': 'degraded', 'Backup Generator': 'failed' }, alerts: ['HF GAS DETECTED — Evacuation expanded', 'All suppression exhausted', '384 modules at 160°C', 'Water authorized — servers confirmed lost'], monitorTemp: 160 },
    { act: 4, assets: {}, alerts: ['Fire controlled at T+22h', 'Post-incident assessment initiated'], monitorTemp: 42 },
  ],
  partial: [
    { act: 0, assets: { 'UPS Battery Array A': 'degraded' }, alerts: [], monitorTemp: 28 },
    { act: 1, assets: { 'UPS Battery Array A': 'degraded' }, alerts: ['Off-gas detection triggered — electrolyte vapor detected'], monitorTemp: 30 },
    { act: 2, assets: { 'UPS Battery Array A': 'failed', 'Clean Agent FM-200': 'failed' }, alerts: ['Module 247 thermal runaway', 'FM-200 deployed — INEFFECTIVE', 'EPO activated successfully'], monitorTemp: 68 },
    { act: 3, assets: {}, alerts: ['Fire contained to battery room', '8 firefighters on scene', 'Server Hall A — heat stress only'], monitorTemp: 45 },
    { act: 4, assets: {}, alerts: ['Full containment at T+3h', 'Suppression gap identified'], monitorTemp: 29 },
  ]
};

function triggerSimEffects(mode, actIndex) {
  const timeline = SIM_TIMELINE[mode];
  if (!timeline || !timeline[actIndex]) return;
  const step = timeline[actIndex];

  // Update sidebar assets in real-time
  updateSidebarAssets(step.assets);

  // Push alerts to monitor feed
  step.alerts.forEach((alert, i) => {
    setTimeout(() => pushLiveAlert(alert, actIndex >= 2 ? 'alert' : 'watch'), i * 800);
  });

  // Update monitor temperature
  animateMonitorTemp(step.monitorTemp);

  // Shake effect on critical acts
  if (actIndex === 2 || actIndex === 3) {
    const main = document.querySelector('.main');
    if (main) { /* shake removed */ }
  }

  // Pulse the monitor rail icon on alerts
  if (step.alerts.length > 0) {
    const monBtn = document.querySelector('.rail-btn[data-view="monitor"]');
    if (monBtn) { monBtn.classList.add('rail-pulse'); setTimeout(() => monBtn.classList.remove('rail-pulse'), 3000); }
  }
}

function updateSidebarAssets(assetUpdates) {
  const rows = document.querySelectorAll('#ctxAList .ctx-row');
  rows.forEach(row => {
    const nameEl = row.querySelector('.ctx-name');
    const statusEl = row.querySelector('.ctx-status-text');
    const dotEl = row.querySelector('.ctx-dot');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();
    for (const [assetName, newStatus] of Object.entries(assetUpdates)) {
      if (name.includes(assetName.substring(0, 15))) {
        statusEl.textContent = newStatus.toUpperCase();
        const colors = { operational: 'var(--green)', degraded: 'var(--yellow)', failed: 'var(--red)', destroyed: 'var(--dred)' };
        dotEl.style.background = colors[newStatus] || 'var(--t3)';
        row.classList.add('ctx-row-flash');
        setTimeout(() => row.classList.remove('ctx-row-flash'), 1500);
      }
    }
  });
}

function pushLiveAlert(message, type) {
  const feed = document.getElementById('monFeed');
  if (!feed) return;
  const event = document.createElement('div');
  event.className = `mon-event mon-event-${type} mon-event-new`;
  event.innerHTML = `<span class="mon-event-time">LIVE</span><span class="mon-event-dot mon-dot-${type}"></span><span class="mon-event-msg">${message}</span>`;
  feed.insertBefore(event, feed.firstChild);
  setTimeout(() => event.classList.remove('mon-event-new'), 2000);

  // Update alert count in ctx
  const ac = document.getElementById('monAlertCount');
  if (ac) ac.textContent = parseInt(ac.textContent || '0') + 1;

  // Show alert banner if critical
  if (type === 'alert') {
    const banner = document.getElementById('monAlertBanner');
    if (banner) { banner.textContent = '⚠ ' + message; banner.classList.remove('hidden'); }
  }
}

function animateMonitorTemp(target) {
  const cards = document.querySelectorAll('.mon-metric-val');
  cards.forEach(c => {
    if (c.textContent.includes('°C') && c.closest('.mon-card')?.querySelector('.mon-card-name')?.textContent.includes('Battery')) {
      const current = parseFloat(c.textContent);
      const steps = 20;
      const increment = (target - current) / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const val = current + (increment * step);
        c.textContent = val.toFixed(1) + '°C';
        if (val > 80) c.style.color = 'var(--red)';
        else if (val > 45) c.style.color = 'var(--yellow)';
        else c.style.color = '';
        if (step >= steps) clearInterval(interval);
      }, 100);
    }
  });
}

/* === 2. CROSS-SECTION REACTIVITY === */
/* When simulation completes, update training + monitor + compliance */
function onSimulationComplete(mode) {
  // Update training readiness score based on findings
  const score = document.getElementById('trainScore');
  if (score) {
    score.textContent = '34%';
    score.style.color = 'var(--red)';
  }
  const gaps = document.getElementById('trainGaps');
  if (gaps) gaps.textContent = '8';

  // Pulse the training rail icon
  const trainBtn = document.querySelector('.rail-btn[data-view="training"]');
  if (trainBtn) {
    trainBtn.classList.add('rail-pulse');
    setTimeout(() => trainBtn.classList.remove('rail-pulse'), 5000);
  }

  // Add notification badges
  addRailBadge('training', getTrainingGaps().length);
  addRailBadge('monitor', mode === 'full' ? 4 : 1);

  // Re-render training prescriptions with updated data
  if (typeof renderTrainingPrescriptions === 'function') renderTrainingPrescriptions();

  // ── INTELLIGENCE LAYER: Hyper-specific recommendations ──
  if (typeof generateHyperSpecificRecos === 'function' && typeof facilityConfig !== 'undefined') {
    var recos = generateHyperSpecificRecos(facilityConfig);
    // Store for later use (reports, PDF)
    window._pantheonRecos = recos;
    // Render in context panel recommendations section
    renderHyperRecos(recos, 'ctxRecoList');
    if (typeof document.getElementById('ctxRecoCnt') !== 'undefined') {
      var el = document.getElementById('ctxRecoCnt');
      if (el) el.textContent = recos.length;
    }
    // Also render in the feed as a summary card after simulation
    appendRecoSummaryToFeed(recos, mode);
  }

  // ── INTELLIGENCE LAYER: Community economic impact ──
  if (typeof calculateCommunityImpact === 'function' && typeof facilityConfig !== 'undefined') {
    var impact = calculateCommunityImpact(facilityConfig, mode);
    window._pantheonImpact = impact;
    appendCommunityImpactToFeed(impact);
  }

  // ── INTELLIGENCE LAYER: Reference incident ──
  if (typeof getMatchedIncident === 'function' && typeof facilityConfig !== 'undefined') {
    var ref = getMatchedIncident(facilityConfig.type, facilityConfig.battery);
    if (ref) appendIncidentRefToFeed(ref);
  }
}

/* Append recommendation summary card to main feed */
function appendRecoSummaryToFeed(recos, mode) {
  var feed = document.getElementById('feedScroll');
  if (!feed) return;
  var immediate = recos.filter(function(r){return r.priority === 'IMMEDIATE';});
  var html = '<div class="act-block act-summary" style="animation:summaryReveal .4s ease both">' +
    '<div class="act-label">COUNTERMEASURE RECOMMENDATIONS</div>' +
    '<div class="act-sublabel">' + recos.length + ' actions \u2014 ' + immediate.length + ' immediate | Based on HCT product analysis</div>' +
    '<div id="feedRecoList"></div>' +
  '</div>';
  feed.insertAdjacentHTML('beforeend', html);
  renderHyperRecos(recos, 'feedRecoList');
  feed.scrollTop = feed.scrollHeight;
}

/* Append community impact to main feed */
function appendCommunityImpactToFeed(impact) {
  var feed = document.getElementById('feedScroll');
  if (!feed) return;
  var html = '<div class="act-block act-summary" style="animation:summaryReveal .4s ease both;animation-delay:.2s">' +
    '<div class="act-label">COMMUNITY ECONOMIC IMPACT</div>' +
    '<div class="act-sublabel">REMI model (ASU Seidman Institute methodology)</div>' +
    '<div id="feedImpactPanel"></div>' +
  '</div>';
  feed.insertAdjacentHTML('beforeend', html);
  if (typeof renderCommunityImpact === 'function') renderCommunityImpact(impact, 'feedImpactPanel');
  feed.scrollTop = feed.scrollHeight;
}

/* Append matched incident reference */
function appendIncidentRefToFeed(ref) {
  var feed = document.getElementById('feedScroll');
  if (!feed) return;
  var html = '<div class="act-block" style="animation:summaryReveal .4s ease both;animation-delay:.4s">' +
    '<div class="act-label">REFERENCE INCIDENT</div>' +
    '<div class="incident-ref">' +
      '<div class="incident-ref-name">' + ref.name + '</div>' +
      '<div class="incident-ref-meta">' + ref.location + ' \u2014 ' + ref.date + ' \u2014 ' + (ref.chemistry||'') + '</div>' +
      '<div class="incident-ref-detail">' + (ref.cause||'') + '. Duration: ' + (ref.duration||'Unknown') + '.</div>' +
      (ref.suppression_gap ? '<div class="incident-ref-gap">SUPPRESSION GAP: ' + ref.suppression_gap + '</div>' : '') +
    '</div>' +
  '</div>';
  feed.insertAdjacentHTML('beforeend', html);
}

function addRailBadge(view, count) {
  const btn = document.querySelector(`.rail-btn[data-view="${view}"]`);
  if (!btn) return;
  let badge = btn.querySelector('.rail-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'rail-badge';
    btn.style.position = 'relative';
    btn.appendChild(badge);
  }
  badge.textContent = count;
  badge.classList.add('rail-badge-pop');
  setTimeout(() => badge.classList.remove('rail-badge-pop'), 300);
}

/* === 3. SMART FACILITY-AWARE CHAT === */
/* Override sendChat to include facility context */
const _originalSendChat = typeof sendChat === 'function' ? sendChat : null;

function getSmartSystemContext() {
  let ctx = '';
  if (facilityConfig) {
    ctx += `\n\nUSER'S FACILITY:\n`;
    ctx += `- Type: ${facilityConfig.typeName || 'Data Center'}\n`;
    ctx += `- Name: ${facilityConfig.facilityName || 'Not specified'}\n`;
    ctx += `- Region: ${facilityConfig.region || 'Not specified'}\n`;
    ctx += `- Battery Chemistry: ${facilityConfig.battery || 'NMC'}\n`;
    ctx += `- Module Count: ${facilityConfig.modules || 384}\n`;
    ctx += `- Battery Age: ${facilityConfig.batteryAge || 'Unknown'}yr\n`;
    ctx += `- Current Suppression: ${facilityConfig.suppression || 'FM-200'}\n`;
    ctx += `\nAlways reference the user's specific facility details in your responses. Be specific: mention their battery chemistry, module count, and suppression system by name.`;
  }
  if (simMode) {
    ctx += `\n\nSIMULATION CONTEXT: A ${simMode} failure scenario has been run for this facility.`;
    if (simMode === 'full') ctx += ' Total loss: $47M. 22-hour uncontrolled fire. 858 TB data lost.';
    else ctx += ' Contained event: $3.2M loss. 3-hour resolution. 0 data lost.';
  }
  return ctx;
}

/* === 4. SMART ONBOARDING — Natural Language Facility Parse === */
function parseNaturalFacility(text) {
  const lower = text.toLowerCase();
  const result = {};

  // Detect facility type
  if (lower.includes('data center') || lower.includes('datacenter') || lower.includes('server')) result.type = 'datacenter';
  else if (lower.includes('ev charg') || lower.includes('charging station')) result.type = 'ev';
  else if (lower.includes('solar') || lower.includes('bess') || lower.includes('battery storage')) result.type = 'solar';
  else if (lower.includes('warehouse')) result.type = 'warehouse';
  else if (lower.includes('manufactur') || lower.includes('factory')) result.type = 'manufacturing';
  else if (lower.includes('telecom') || lower.includes('tower')) result.type = 'telecom';
  else if (lower.includes('marine') || lower.includes('ship') || lower.includes('vessel')) result.type = 'marine';
  else if (lower.includes('aviat') || lower.includes('airport') || lower.includes('hangar')) result.type = 'aviation';
  else if (lower.includes('hospital') || lower.includes('healthcare') || lower.includes('medical')) result.type = 'hospital';

  // Detect battery chemistry
  if (lower.includes('nmc')) result.battery = 'NMC';
  else if (lower.includes('lfp')) result.battery = 'LFP';
  else if (lower.includes('nca')) result.battery = 'NCA';

  // Detect module count
  const modMatch = lower.match(/(\d+)\s*(module|battery|cell)/);
  if (modMatch) result.modules = parseInt(modMatch[1]);

  // Detect suppression
  if (lower.includes('fm-200') || lower.includes('fm200')) result.suppression = 'FM-200';
  else if (lower.includes('co2') || lower.includes('co₂')) result.suppression = 'CO₂';
  else if (lower.includes('f-500') || lower.includes('f500')) result.suppression = 'F-500 EA';
  else if (lower.includes('sprinkler')) result.suppression = 'Sprinkler';
  else if (lower.includes('halon')) result.suppression = 'Halon';
  else if (lower.includes('no suppression') || lower.includes('none')) result.suppression = 'None';

  // Detect location keywords
  const locationPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /(?:located|based)\s+(?:in|at)\s+(.+?)(?:\.|,|$)/i,
  ];
  for (const p of locationPatterns) {
    const m = text.match(p);
    if (m) { result.region = m[1].trim(); break; }
  }

  return result;
}

/* === 5. EMERGENCY URGENCY EFFECTS === */
function triggerEmergencyMode() {
  const app = document.getElementById('app');
  if (app) app.classList.add('emergency-active');

  // Pulse the emergency rail icon
  const emBtn = document.querySelector('.rail-btn[data-view="emergency"]');
  if (emBtn) emBtn.classList.add('rail-emergency-pulse');
}

function clearEmergencyMode() {
  const app = document.getElementById('app');
  if (app) app.classList.remove('emergency-active');
  const emBtn = document.querySelector('.rail-btn[data-view="emergency"]');
  if (emBtn) emBtn.classList.remove('rail-emergency-pulse');
}

/* ═══ SERVICE NAME RESOLVER ═══ */
function resolveServiceName(id) {
  if (!D.inspections) return id;
  const allServices = [
    ...(D.inspections.in_person || []),
    ...(D.inspections.online_consults || []),
    ...(D.inspections.drone_inspections || [])
  ];
  const found = allServices.find(s => s.id === id);
  return found ? found.name : id;
}

/* ═══ TOAST NOTIFICATION SYSTEM ═══ */
let toastContainer = null;

function initToasts() {
  if (toastContainer) return;
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.id = 'toastContainer';
  document.body.appendChild(toastContainer);
}

// ── Jurisdiction banner helpers ──────────────────────────────────────────────
function dismissJurisdictionBanner() {
  var banner = document.getElementById('obStandardsBanner');
  if (banner) banner.classList.add('hidden');
  // Store dismiss preference — location is NOT cleared
  try { sessionStorage.setItem('pantheon_juris_dismissed', '1'); } catch(e) {}
}

function openSettingsLocation() {
  // Navigate to settings > preferences and focus the location field
  dismissJurisdictionBanner();
  if (typeof switchCtx === 'function') switchCtx('settings');
  if (typeof wireSettingsTabs2 === 'function') wireSettingsTabs2();
  // Switch to Preferences tab in settings
  setTimeout(function() {
    var prefTab = document.querySelector('[data-sett-tab="preferences"]');
    if (prefTab) prefTab.click();
    // Scroll to / focus the location input
    var locField = document.getElementById('settLocationInput') || document.getElementById('siRegionInput');
    if (locField) {
      locField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      locField.focus();
    }
  }, 250);
}

function showToast(message, type, duration) {
  if (!toastContainer) initToasts();
  type = type || 'info';
  duration = duration || 4000;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  
  const icons = {
    alert: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2L2 18h16L10 2z"/><line x1="10" y1="8" x2="10" y2="12"/><circle cx="10" cy="14.5" r=".6" fill="currentColor" stroke="none"/></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="10"/><circle cx="10" cy="13" r=".6" fill="currentColor" stroke="none"/></svg>',
    ok: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 6 8 14 5 11"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.5" r=".6" fill="currentColor" stroke="none"/></svg>',
    fire: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2c1 4-2 6-2 10a4 4 0 008 0c0-3-2-4-2-6"/><path d="M10 16a1.5 1.5 0 01-1.5-1.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2A1.5 1.5 0 0110 16z"/></svg>'
  };
  
  toast.innerHTML = '<div class="toast-icon">' + (icons[type] || icons.info) + '</div><div class="toast-body"><div class="toast-msg">' + message + '</div></div><button class="toast-close" onclick="this.parentElement.classList.add(\'toast-out\');setTimeout(()=>this.parentElement.remove(),300)">&times;</button><div class="toast-timer"><div class="toast-timer-fill" style="animation-duration:' + duration + 'ms"></div></div>';
  
  toastContainer.appendChild(toast);
  
  // Auto-remove
  setTimeout(function() {
    if (toast.parentElement) {
      toast.classList.add('toast-out');
      setTimeout(function() { if (toast.parentElement) toast.remove(); }, 300);
    }
  }, duration);
}

/* ═══ SIMULATION TOAST TIMELINE ═══ */
const SIM_TOASTS = {
  full: [
    { act: 0, delay: 500, msg: 'Loading facility baseline — 24 hours prior to incident', type: 'info' },
    { act: 1, delay: 500, msg: 'Risk accumulation detected — 5 of 6 factors CRITICAL', type: 'warning' },
    { act: 1, delay: 3000, msg: 'BMS alarm thresholds raised above OEM specification', type: 'warning' },
    { act: 2, delay: 500, msg: 'THERMAL RUNAWAY — Module 247 voltage spike at T+0:00', type: 'fire' },
    { act: 2, delay: 2000, msg: 'VESDA detection triggered — smoke in Battery Room 5F', type: 'alert' },
    { act: 2, delay: 4000, msg: 'FM-200 deployed — CHEMICALLY INCOMPATIBLE with Li-ion', type: 'alert' },
    { act: 2, delay: 6000, msg: 'CO₂ suppression deployed — INSUFFICIENT for thermal runaway', type: 'alert' },
    { act: 2, delay: 8000, msg: 'EPO activated — PARTIAL FAILURE. Generator re-energizes.', type: 'alert' },
    { act: 3, delay: 500, msg: 'Cascade propagation — 384 modules at 160°C', type: 'fire' },
    { act: 3, delay: 2500, msg: 'HF GAS DETECTED — Evacuation zone expanded to 500m', type: 'alert' },
    { act: 3, delay: 5000, msg: 'All suppression exhausted. Water authorized.', type: 'alert' },
    { act: 3, delay: 8000, msg: '101 firefighters, 22 vehicles deployed', type: 'warning' },
    { act: 4, delay: 500, msg: 'Fire controlled at T+22h. Post-incident analysis initiated.', type: 'ok' },
    { act: 4, delay: 3000, msg: 'Estimated loss: $47M | 858 TB data destroyed', type: 'info' },
    { act: 4, delay: 5000, msg: 'F-500 EA identified as primary countermeasure', type: 'ok' },
  ],
  partial: [
    { act: 0, delay: 500, msg: 'Loading facility baseline — off-gas detection installed', type: 'info' },
    { act: 1, delay: 500, msg: 'Off-gas detection triggered — electrolyte vapor from Module 247', type: 'warning' },
    { act: 1, delay: 3000, msg: 'BMS flags module — controlled shutdown initiated', type: 'info' },
    { act: 2, delay: 500, msg: 'Module 247 enters thermal runaway despite shutdown', type: 'fire' },
    { act: 2, delay: 2500, msg: 'FM-200 deployed — INEFFECTIVE against Li-ion chemistry', type: 'alert' },
    { act: 2, delay: 4500, msg: 'EPO activated successfully — generator isolated', type: 'ok' },
    { act: 3, delay: 500, msg: 'Fire contained to battery room — 12 modules affected', type: 'warning' },
    { act: 3, delay: 2500, msg: '8 firefighters on scene. Server Hall A intact.', type: 'ok' },
    { act: 4, delay: 500, msg: 'Containment at T+3h. Loss limited to $3.2M.', type: 'ok' },
    { act: 4, delay: 3000, msg: 'Suppression gap persists — F-500 EA recommended', type: 'warning' },
  ]
};

function triggerSimToasts(mode, actIndex) {
  var toasts = SIM_TOASTS[mode];
  if (!toasts) return;
  var actToasts = toasts.filter(function(t) { return t.act === actIndex; });
  actToasts.forEach(function(t) {
    setTimeout(function() { showToast(t.msg, t.type, 5000); }, t.delay);
  });
}

/* ═══ BADGE DISMISSAL ON VIEW SWITCH ═══ */
var _origSwitchView = typeof switchView === 'function' ? switchView : null;

// We'll patch switchView via an event listener approach instead
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.rail-btn[data-view]');
  if (!btn) return;
  var view = btn.dataset.view;
  // Clear badge on this button when clicked
  var badge = btn.querySelector('.rail-badge');
  if (badge) badge.remove();
  // Clear emergency mode when leaving emergency
  if (view !== 'emergency' && typeof clearEmergencyMode === 'function') {
    clearEmergencyMode();
  }
}, true);

/* ═══ JURISDICTION-AWARE STANDARDS DETECTION ═══ */

var detectedStandards = null;
var detectedJurisdiction = null;

async function fetchStandards(country, state) {
  try {
    var body = { country: country };
    if (state) body.state = state;
    var r = await fetch('/api/compliance/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) return null;
    var data = await r.json();
    detectedStandards = data;
    detectedJurisdiction = data.jurisdiction;
    return data;
  } catch (e) {
    console.error('Standards fetch failed:', e);
    return null;
  }
}

function renderStandardsInContext(data) {
  if (!data) return;
  
  // Update the standards list in simulate context
  var stdList = document.getElementById('ctxStdList');
  if (stdList) {
    var allStds = (data.federal || []).concat(data.state || []);
    // Build jurisdiction label + standards rows
    var loc = data.jurisdiction.country;
    if (data.jurisdiction.state_name) loc = data.jurisdiction.state_name + ', ' + loc;
    else if (data.jurisdiction.state) loc = data.jurisdiction.state + ', ' + loc;
    var html = '<div class="ctx-jurisdiction" id="ctxJurisdictionWrap"><span class="ctx-jurisdiction-label" id="ctxJurisdiction">' + loc + '</span></div>';
    html += allStds.map(function(s) {
      return '<div class="ctx-std-row">' +
        '<span class="ctx-std-code">' + s.code + '</span>' +
        '<span class="ctx-std-title">' + s.title + '</span>' +
        (s.mandatory ? '<span class="ctx-std-mandatory">REQUIRED</span>' : '') +
        '</div>';
    }).join('');
    stdList.innerHTML = html;
    
    var cnt = document.getElementById('ctxStdCnt');
    if (cnt) cnt.textContent = allStds.length;
  }
  
  // Update home context if exists
  var homeStdList = document.getElementById('homeStdList');
  if (homeStdList) {
    var topStds = (data.federal || []).slice(0, 6);
    homeStdList.innerHTML = topStds.map(function(s) {
      return '<div class="ctx-row">' +
        '<span class="ctx-dot" style="background:' + (s.mandatory ? 'var(--red)' : 'var(--green)') + '"></span>' +
        '<span class="ctx-name">' + s.code + '</span>' +
        '<span class="ctx-status-text">' + (s.mandatory ? 'REQ' : 'REC') + '</span>' +
        '</div>';
    }).join('');
  }
  
  // Show jurisdiction info is now handled inline in standards list above
  if (data.compliance_gaps) {
    var gc = document.getElementById('ctxGapCnt');
    if (gc) gc.textContent = data.compliance_gaps.length;
  }
}

function renderComplianceGaps(data) {
  if (!data || !data.compliance_gaps) return;
  var gapList = document.getElementById('ctxGapList');
  if (!gapList) return;
  
  gapList.innerHTML = data.compliance_gaps.map(function(g) {
    var color = g.severity === 'CRITICAL' ? 'var(--red)' : g.severity === 'HIGH' ? 'var(--yellow)' : 'var(--green)';
    return '<div class="ctx-row">' +
      '<span class="ctx-dot" style="background:' + color + '"></span>' +
      '<span class="ctx-name">' + g.standard + ' — ' + g.gap + '</span>' +
      '</div>';
  }).join('');
}

function renderStandardsInConfig(data) {
  if (!data) return;
  var el = document.getElementById('cfStandardsSummary');
  if (!el) return;
  
  var allStds = (data.federal || []).concat(data.state || []);
  var mandatory = allStds.filter(function(s) { return s.mandatory; });
  var loc = data.jurisdiction.state_name || data.jurisdiction.state || '';
  if (loc) loc += ', ';
  loc += data.jurisdiction.country;
  
  el.innerHTML = '<div class="cf-standards-detected">' +
    '<div class="cf-standards-loc">' + loc + ' — ' + allStds.length + ' applicable standards</div>' +
    '<div class="cf-standards-list">' +
    mandatory.slice(0, 8).map(function(s) {
      return '<span class="cat-card-tag">' + s.code + '</span>';
    }).join('') +
    (mandatory.length > 8 ? '<span class="cf-standards-more">+' + (mandatory.length - 8) + ' more</span>' : '') +
    '</div>' +
    (data.local_notes ? '<div class="cf-standards-notes">' + data.local_notes + '</div>' : '') +
    '</div>';
  el.classList.remove('hidden');
}

/* Hook into facility config flow — detect standards when region is entered */
function onRegionEntered(regionText) {
  var jurisdiction = detectJurisdiction(regionText);
  fetchStandards(jurisdiction.country, jurisdiction.state).then(function(data) {
    if (data) {
      renderStandardsInContext(data);
      renderStandardsInConfig(data);
      renderComplianceGaps(data);
      // Toast notification
      var count = (data.federal || []).length + (data.state || []).length;
      var loc = data.jurisdiction.state_name || data.jurisdiction.state || data.jurisdiction.country;
      if (typeof showToast === 'function') {
        showToast(count + ' standards detected for ' + loc + ' jurisdiction', 'ok', 4000);
      }
    }
  });
}

/* Try browser geolocation on page load */
function tryGeolocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    // Reverse geocode using a simple lat/lon to state mapping
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    // Rough US state detection by bounding boxes
    var state = geoToState(lat, lon);
    if (state) {
      fetchStandards('US', state).then(function(data) {
        if (data) {
          renderStandardsInContext(data);
          var loc = data.jurisdiction.state_name || state;
          if (typeof showToast === 'function') {
            showToast('Location detected: ' + loc + ' — ' + data.total_count + ' standards loaded', 'info', 3000);
          }
        }
      });
    }
  }, function() { /* permission denied - silent fail */ }, { timeout: 5000 });
}

function geoToState(lat, lon) {
  // Simple bounding box lookup for major states
  var states = [
    { code: 'CA', latMin: 32.5, latMax: 42, lonMin: -124.5, lonMax: -114 },
    { code: 'TX', latMin: 25.8, latMax: 36.5, lonMin: -106.6, lonMax: -93.5 },
    { code: 'NY', latMin: 40.5, latMax: 45, lonMin: -79.8, lonMax: -71.8 },
    { code: 'FL', latMin: 24.5, latMax: 31, lonMin: -87.6, lonMax: -80 },
    { code: 'IL', latMin: 37, latMax: 42.5, lonMin: -91.5, lonMax: -87.5 },
    { code: 'AZ', latMin: 31.3, latMax: 37, lonMin: -114.8, lonMax: -109 },
    { code: 'MA', latMin: 41.2, latMax: 42.9, lonMin: -73.5, lonMax: -69.9 },
    { code: 'GA', latMin: 30.3, latMax: 35, lonMin: -85.6, lonMax: -80.8 },
    { code: 'VA', latMin: 36.5, latMax: 39.5, lonMin: -83.7, lonMax: -75.2 },
    { code: 'WA', latMin: 45.5, latMax: 49, lonMin: -124.8, lonMax: -116.9 },
    { code: 'NV', latMin: 35, latMax: 42, lonMin: -120, lonMax: -114 },
    { code: 'CO', latMin: 37, latMax: 41, lonMin: -109, lonMax: -102 },
    { code: 'OR', latMin: 42, latMax: 46.3, lonMin: -124.6, lonMax: -116.5 },
  ];
  for (var i = 0; i < states.length; i++) {
    var s = states[i];
    if (lat >= s.latMin && lat <= s.latMax && lon >= s.lonMin && lon <= s.lonMax) return s.code;
  }
  return null;
}

/* ═══ JURISDICTION DETECTION v2 — Full names, proper matching ═══ */

const COUNTRY_DB = {
  'united states': 'US', 'united states of america': 'US', 'usa': 'US',
  'united kingdom': 'UK', 'england': 'UK', 'scotland': 'UK', 'wales': 'UK', 'great britain': 'UK', 'britain': 'UK',
  'australia': 'AU',
  'germany': 'DE', 'deutschland': 'DE',
  'singapore': 'SG',
  'netherlands': 'NL', 'holland': 'NL',
  'canada': 'CA_COUNTRY', 'france': 'FR', 'japan': 'JP', 'south korea': 'KR', 'korea': 'KR',
  'china': 'CN', 'india': 'IN_COUNTRY', 'brazil': 'BR', 'mexico': 'MX',
  'italy': 'IT', 'spain': 'ES', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
  'finland': 'FI', 'ireland': 'IE', 'belgium': 'BE', 'switzerland': 'CH',
  'austria': 'AT', 'portugal': 'PT', 'poland': 'PL', 'czech republic': 'CZ',
  'uae': 'AE', 'united arab emirates': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE',
  'saudi arabia': 'SA', 'qatar': 'QA', 'israel': 'IL',
  'new zealand': 'NZ', 'taiwan': 'TW', 'thailand': 'TH', 'vietnam': 'VN',
  'philippines': 'PH', 'malaysia': 'MY', 'indonesia': 'ID_COUNTRY',
};

const US_STATES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY',
};

const CITY_TO_STATE = {
  'los angeles': 'CA', 'san francisco': 'CA', 'san diego': 'CA', 'sacramento': 'CA', 'san jose': 'CA', 'oakland': 'CA', 'irvine': 'CA', 'palo alto': 'CA',
  'new york city': 'NY', 'manhattan': 'NY', 'brooklyn': 'NY', 'queens': 'NY', 'buffalo': 'NY', 'albany': 'NY',
  'houston': 'TX', 'dallas': 'TX', 'austin': 'TX', 'san antonio': 'TX', 'fort worth': 'TX', 'el paso': 'TX', 'plano': 'TX',
  'chicago': 'IL', 'springfield': 'IL',
  'phoenix': 'AZ', 'tucson': 'AZ', 'scottsdale': 'AZ', 'mesa': 'AZ',
  'miami': 'FL', 'tampa': 'FL', 'orlando': 'FL', 'jacksonville': 'FL', 'fort lauderdale': 'FL',
  'boston': 'MA', 'cambridge': 'MA', 'worcester': 'MA',
  'seattle': 'WA', 'tacoma': 'WA', 'spokane': 'WA',
  'portland': 'OR', 'eugene': 'OR',
  'denver': 'CO', 'colorado springs': 'CO', 'boulder': 'CO',
  'atlanta': 'GA', 'savannah': 'GA',
  'ashburn': 'VA', 'reston': 'VA', 'sterling': 'VA', 'manassas': 'VA', 'richmond': 'VA', 'norfolk': 'VA',
  'las vegas': 'NV', 'reno': 'NV',
  'detroit': 'MI', 'ann arbor': 'MI',
  'minneapolis': 'MN', 'saint paul': 'MN',
  'nashville': 'TN', 'memphis': 'TN',
  'charlotte': 'NC', 'raleigh': 'NC', 'durham': 'NC',
  'pittsburgh': 'PA', 'philadelphia': 'PA',
  'baltimore': 'MD',
  'salt lake city': 'UT',
  'kansas city': 'MO', 'st louis': 'MO',
  'new orleans': 'LA',
  'indianapolis': 'IN',
  'columbus': 'OH', 'cleveland': 'OH', 'cincinnati': 'OH',
};

const INTL_CITIES = {
  'london': 'UK', 'manchester': 'UK', 'birmingham': 'UK', 'edinburgh': 'UK', 'glasgow': 'UK', 'leeds': 'UK', 'bristol': 'UK',
  'sydney': 'AU', 'melbourne': 'AU', 'brisbane': 'AU', 'perth': 'AU', 'adelaide': 'AU',
  'munich': 'DE', 'frankfurt': 'DE', 'berlin': 'DE', 'hamburg': 'DE', 'cologne': 'DE', 'stuttgart': 'DE',
  'amsterdam': 'NL', 'rotterdam': 'NL', 'the hague': 'NL', 'utrecht': 'NL', 'eindhoven': 'NL',
  'paris': 'FR', 'lyon': 'FR', 'marseille': 'FR',
  'tokyo': 'JP', 'osaka': 'JP', 'yokohama': 'JP',
  'seoul': 'KR', 'busan': 'KR',
  'toronto': 'CA_COUNTRY', 'vancouver': 'CA_COUNTRY', 'montreal': 'CA_COUNTRY', 'calgary': 'CA_COUNTRY',
  'dublin': 'IE', 'brussels': 'BE', 'zurich': 'CH', 'geneva': 'CH',
  'stockholm': 'SE', 'oslo': 'NO', 'copenhagen': 'DK', 'helsinki': 'FI',
  'vienna': 'AT', 'prague': 'CZ', 'warsaw': 'PL', 'lisbon': 'PT',
  'madrid': 'ES', 'barcelona': 'ES', 'rome': 'IT', 'milan': 'IT',
  'mumbai': 'IN_COUNTRY', 'delhi': 'IN_COUNTRY', 'bangalore': 'IN_COUNTRY', 'hyderabad': 'IN_COUNTRY',
  'shanghai': 'CN', 'beijing': 'CN', 'shenzhen': 'CN', 'guangzhou': 'CN',
  'sao paulo': 'BR', 'rio de janeiro': 'BR',
  'mexico city': 'MX',
};

/* Override old detectJurisdiction with proper word-boundary matching */
function detectJurisdiction(regionText) {
  if (!regionText) return { country: 'US', state: null };
  var lower = regionText.toLowerCase().trim();
  // Normalize separators
  var normalized = lower.replace(/[,;\/\\|]+/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Check for country names FIRST (prevents "Netherlands" -> "NE" Nebraska)
  for (var countryName in COUNTRY_DB) {
    if (matchesWholeWord(normalized, countryName)) {
      var cc = COUNTRY_DB[countryName];
      // Special handling for countries that share codes with US states
      if (cc === 'CA_COUNTRY') return { country: 'CA_INTL', state: null };
      if (cc === 'IN_COUNTRY') return { country: 'IN_INTL', state: null };
      if (cc === 'ID_COUNTRY') return { country: 'ID_INTL', state: null };
      return { country: cc, state: null };
    }
  }

  // 2. Check for international cities
  for (var city in INTL_CITIES) {
    if (matchesWholeWord(normalized, city)) {
      var cc2 = INTL_CITIES[city];
      if (cc2 === 'CA_COUNTRY') return { country: 'CA_INTL', state: null };
      if (cc2 === 'IN_COUNTRY') return { country: 'IN_INTL', state: null };
      return { country: cc2, state: null };
    }
  }

  // 3. Check for US cities (more specific, check before states)
  for (var usCity in CITY_TO_STATE) {
    if (matchesWholeWord(normalized, usCity)) {
      return { country: 'US', state: CITY_TO_STATE[usCity] };
    }
  }

  // 4. Check for full US state names
  for (var stateName in US_STATES) {
    if (matchesWholeWord(normalized, stateName)) {
      return { country: 'US', state: US_STATES[stateName] };
    }
  }

  // 5. Check for 2-letter state abbreviation only if it's a standalone word
  var words = normalized.split(/\s+/);
  for (var w = 0; w < words.length; w++) {
    var word = words[w].toUpperCase();
    if (word.length === 2 && /^[A-Z]{2}$/.test(word)) {
      var allStateCodes = Object.values(US_STATES);
      if (allStateCodes.indexOf(word) !== -1) {
        return { country: 'US', state: word };
      }
    }
  }

  // 6. Nothing found
  return { country: 'US', state: null };
}

function matchesWholeWord(text, word) {
  // Escape regex special chars in the word
  var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('(?:^|\\b|\\s)' + escaped + '(?:\\b|\\s|$)', 'i');
  return re.test(text);
}

/* ═══ EMERGENCY → TRAINING + MONITOR REACTIVITY ═══ */

function onEmergencyComplete(emData) {
  // Push emergency event to monitor feed
  if (typeof pushLiveAlert === 'function') {
    pushLiveAlert('EMERGENCY RESPONSE FILED — ' + (emData.type || 'Incident').replace(/-/g, ' ').toUpperCase(), 'alert');
    if (emData.location) pushLiveAlert('Location: ' + emData.location + (emData.floor ? ', Floor ' + emData.floor : ''), 'warning');
    if (emData.severity) pushLiveAlert('Severity: ' + emData.severity.toUpperCase(), emData.severity === 'critical' ? 'alert' : 'warning');
    pushLiveAlert('Emergency response protocol initiated — all zones on alert', 'info');
  }

  // Add emergency-derived training prescriptions
  var emergencyGaps = getEmergencyTrainingGaps(emData);
  var trainPrescriptions = document.getElementById('trainPrescriptions');
  if (trainPrescriptions && emergencyGaps.length > 0) {
    // Prepend emergency-source prescriptions
    var existingList = trainPrescriptions.querySelector('.train-prescription-list');
    if (existingList) {
      var newHTML = emergencyGaps.map(function(g) {
        return '<div class="train-rx train-rx-' + g.priority.toLowerCase() + ' train-rx-emergency">' +
          '<div class="train-rx-head">' +
          '<span class="train-rx-priority ai-p ai-' + (g.priority === 'CRITICAL' ? 'imm' : g.priority === 'HIGH' ? '30' : '90') + '">' + g.priority + '</span>' +
          '<span class="train-rx-title">' + g.title + '</span>' +
          '<span class="train-rx-source">Emergency</span>' +
          '</div>' +
          '<div class="train-rx-desc">' + g.desc + '</div>' +
          '<div class="train-rx-meta">' +
          '<span class="cat-card-tag">' + g.standard + '</span>' +
          '<button class="insp-btn insp-btn-sm" onclick="switchView(\'catalog\')">Find Course</button>' +
          '</div></div>';
      }).join('');
      existingList.insertAdjacentHTML('afterbegin', newHTML);
    }
  }

  // Update training readiness score (lower it based on emergency)
  var score = document.getElementById('trainScore');
  if (score) {
    var current = parseInt(score.textContent) || 34;
    var newScore = Math.max(15, current - 12);
    score.textContent = newScore + '%';
    score.style.color = 'var(--red)';
  }

  // Update training gap count
  var gapCount = document.getElementById('trainGaps');
  if (gapCount) {
    var current2 = parseInt(gapCount.textContent) || 0;
    gapCount.textContent = current2 + emergencyGaps.length;
  }

  // Badge the training and monitor icons
  if (typeof addRailBadge === 'function') {
    addRailBadge('training', emergencyGaps.length);
    addRailBadge('monitor', 3);
  }

  // Toast notifications
  if (typeof showToast === 'function') {
    showToast('Emergency response logged — training gaps updated', 'warning', 4000);
    setTimeout(function() {
      showToast(emergencyGaps.length + ' new training prescriptions from emergency response', 'info', 4000);
    }, 1500);
  }
}

function getEmergencyTrainingGaps(emData) {
  var gaps = [];
  var type = (emData.type || '').toLowerCase();

  // Always prescribe based on emergency type
  if (type.includes('thermal') || type.includes('battery') || type.includes('fire')) {
    gaps.push({priority:'CRITICAL',
      title: 'Active Thermal Runaway Response',
      desc: 'Emergency response team encountered a live thermal event. Hands-on drill required for active fire suppression using F-500 EA in battery environments.',
      standard: 'NFPA 855'
    });
    gaps.push({priority:'HIGH',
      title: 'HF Gas Exposure & Evacuation',
      desc: 'Post-event review: ensure all personnel know HF gas evacuation zones, PPE requirements, and decontamination procedures.',
      standard: 'OSHA 1910'
    });
  }

  if (type.includes('electrical') || type.includes('arc')) {
    gaps.push({priority:'CRITICAL',
      title: 'Arc Flash Response & De-energization',
      desc: 'Emergency involved electrical hazard. All personnel must complete NFPA 70E arc flash safety and lockout/tagout procedures.',
      standard: 'NFPA 70E'
    });
  }

  if (type.includes('gas') || type.includes('vapor') || type.includes('chemical')) {
    gaps.push({priority:'CRITICAL',
      title: 'Hazmat & Gas Release Response',
      desc: 'Gas/vapor release emergency filed. Team requires hazmat awareness training including detector use, PPE selection, and ventilation protocols.',
      standard: 'NFPA 472'
    });
  }

  // Suppression-related gaps based on what was in place
  var supp = (emData.suppression || '').toLowerCase();
  if (supp.includes('fm-200') || supp.includes('co2') || supp.includes('halon')) {
    gaps.push({priority:'HIGH',
      title: 'Suppression Agent Limitations',
      desc: 'Current suppression (' + (emData.suppression || 'clean agent') + ') may be incompatible with Li-ion thermal runaway. Training on agent selection and F-500 EA deployment required.',
      standard: 'NFPA 2001'
    });
  }

  // Always add incident command training after any emergency
  gaps.push({priority:'STANDARD',
    title: 'Post-Incident Command Review',
    desc: 'All emergency responses should be followed by incident command structure review, communication protocol assessment, and after-action report training.',
    standard: 'NFPA 1561'
  });

  return gaps;
}

/* ═══════════════════════════════════════════════════════════════
   PANTHEON INTELLIGENCE LAYER v2
   Real data. Real products. Connected chain.
   Smart-LX → Monitor → Emergency → Simulation → Training → Reports → Community Impact
   ═══════════════════════════════════════════════════════════════ */

/* ═══ 1. REAL HCT PRODUCT DATABASE ═══ */
var HCT_PRODUCTS = {
  'F500-EA': {
    name: 'F-500 EA Encapsulator Agent', type: 'Suppression Agent',
    desc: 'Fluorine-free, biodegradable micelle-based agent. Addresses flammability, explosivity, and toxicity simultaneously. 3% concentration.',
    standards: ['NFPA 18A','cULus','NEN NTA 8133','FAA AC 150/5210-6E'],
    specs: { concentration:'3%', ph:'~7', fluorineFree:true, biodegradable:true, noncorrosive:true }
  },
  'DIAMOND-DOSER': {
    name: 'Diamond Doser Proportioner', type: 'Delivery System',
    desc: 'Water-driven volumetric proportioner. Injects F-500 EA into any existing sprinkler or deluge system. No electric power required. Applus+ certified.',
    standards: ['NFPA 18A','Applus+ ETI 23/32306438'],
    sizes: ['2-inch','3-inch','4-inch','6-inch'],
    keyFeature: 'Auto-adjusts to flow and pressure changes without calibration'
  },
  'BLADDER-TANK': {
    name: 'Bladder Tank System', type: 'Fixed System',
    desc: 'F-500 EA concentrate storage and delivery. Retrofit or new-build. 36 gal to 12,000 gal capacity.',
    standards: ['NFPA 18A','NFPA 13'],
    sizes: ['36 gal','100 gal','500 gal','1,000 gal','3,000 gal','6,000 gal','12,000 gal']
  },
  'VEEP': {
    name: 'VEEP System', type: 'Integrated Detection + Suppression',
    desc: 'Vapor Encapsulation and Explosion Prevention. Complete detect-prevent-suppress chain using Smart-LX detection with F-500 EA suppression.',
    standards: ['NFPA 18A','NFPA 69'],
    components: ['Smart-LX Sensor Gateway','Gas/Vapor Monitors','Thermal Cameras','F-500 EA Suppression','Control Panel']
  },
  'SMART-LX': {
    name: 'Smart-LX Sensor Gateway', type: 'IIoT Detection Platform', provider: 'Embedded Logix',
    desc: 'Open-architecture IoT platform. Connects IR cameras, gas monitors, PLCs, SCADA. Brand-agnostic. Rules-based analytics with anomaly detection.',
    standards: ['NFPA 72'],
    integrations: ['FLIR thermal cameras','Any IR sensor','PLC/SCADA','VMS','OSI PI','Cloud/on-premise'],
    capabilities: ['Temperature trending','Hot spot detection','Gas monitoring','Rule-based alerts','Predictive maintenance','Multi-sensor fusion']
  },
  'SMART-LX-ANALYTICS': {
    name: 'Smart-LX Enterprise Analytics', type: 'Analytics Platform', provider: 'Embedded Logix',
    desc: 'AI-powered dashboards. Temperature trend analysis, impedance-based battery health, predictive failure modeling. Weekly asset health reports.',
    standards: ['NFPA 72','NFPA 855']
  },
  'HYDROLOCK': {
    name: 'HydroLock', type: 'Vapor Mitigation',
    desc: 'Encapsulates hydrocarbon vapors/liquids, drops LEL for safe vessel entry. Tank degassing, cleaning, sludge removal.',
    standards: ['NFPA 18A','CEPA 1999']
  },
  'PINNACLE': {
    name: 'Pinnacle F3 Foam', type: 'Class A Foam',
    desc: 'Fluorine-free Class A foam. Maximum penetration, thick blanket. Stretches water supply in limited-access areas.',
    standards: ['NFPA 18']
  },
  'DUST-WASH': {
    name: 'Dust Wash', type: 'Dust Mitigation',
    desc: 'Encapsulator + foaming agent for combustible dust. Safely captures metallic/polymer dust without triggering hot spots.',
    standards: ['NFPA 652']
  }
};

/* ═══ 2. REAL INCIDENT DATABASE ═══ */
var INCIDENT_DB = {
  'gateway-2024': {
    name:'Gateway Energy Storage Fire', location:'San Diego, California', date:'May 15, 2024',
    facility:'BESS', chemistry:'NMC', modules:15000,
    cause:'Thermal runaway in battery module', duration:'7 days of flare-ups',
    suppression_used:'Water', suppression_gap:'No encapsulator agent. Water alone could not arrest thermal runaway propagation.',
    impact:{loss:'$50M+',services:'Grid stabilization offline',env:'EPA required extensive environmental monitoring during disposal'},
    roots:['Cell-level thermal failure','Insufficient thermal barriers','No off-gas detection','No encapsulator suppression'],
    source:'EPA enforcement, EPRI BESS Failure Incident Database'
  },
  'mcmicken-2019': {
    name:'McMicken APS Battery Explosion', location:'Surprise, Arizona', date:'April 19, 2019',
    facility:'BESS', chemistry:'NMC (Samsung SDI)', modules:378,
    cause:'Internal cell failure \u2192 thermal runaway \u2192 flammable gas accumulation \u2192 explosion when door opened',
    duration:'3+ hours', suppression_used:'Sprinkler (water only)',
    suppression_gap:'Accumulated flammable gases exploded when firefighters breached enclosure. No gas detection, no vapor mitigation.',
    impact:{loss:'$3.4M',injuries:'4 firefighters hospitalized (1 critical)',services:'2 MW offline'},
    roots:['Internal cell failure','No off-gas detection','No ventilation system','No vapor mitigation agent','Inadequate pre-incident planning'],
    legacy:'Led directly to NFPA 855 and UL 9540A adoption',
    source:'DNV GL investigation report, EPRI'
  },
  'daejeon-2025': {
    name:'Daejeon Data Center Fire', location:'Daejeon, South Korea', date:'September 26, 2025',
    facility:'Data Center', chemistry:'LFP/NMC (UPS)',
    cause:'Battery explosion in UPS system', duration:'12+ hours',
    suppression_used:'Standard fire suppression',
    suppression_gap:'Standard suppression ineffective against battery-origin fire in data center environment.',
    impact:{loss:'$100M+',services:'Hundreds of government services offline',citizens:'50M+ affected'},
    roots:['Battery fault in UPS','Co-location of battery and server infrastructure','Inadequate fire barriers','No redundant offsite systems'],
    source:'National Fire Agency (South Korea), IDTechEx'
  },
  'otay-mesa-2024': {
    name:'Otay Mesa BESS Fire', location:'San Diego County, California', date:'2024',
    facility:'BESS', chemistry:'NMC',
    cause:'Thermal runaway after 4 years of operation',
    suppression_gap:'Age-related cell degradation undetected. No predictive thermal trending.',
    roots:['Cell degradation','Insufficient ongoing monitoring','No impedance-based health tracking'],
    source:'EPRI'
  },
  'warwick-2023': {
    name:'Warwick NY BESS Fire', location:'Warwick, New York', date:'June 2023',
    facility:'BESS', chemistry:'LFP (Powin)',
    cause:'Integration-related failure',
    suppression_gap:'Water sprinkler contained but could not extinguish battery fire.',
    source:'Convergent Energy, EPRI'
  },
  'aricell-2024': {
    name:'Aricell Battery Factory Fire', location:'Hwaseong, South Korea', date:'June 24, 2024',
    facility:'Manufacturing', chemistry:'Primary lithium',
    cause:'Battery fault during manufacturing',
    impact:{loss:'$20M+',fatalities:23,injuries:'Multiple'},
    roots:['Manufacturing defect','Inadequate factory suppression','Insufficient evacuation protocols','Combustible material proximity'],
    source:'National Fire Agency (South Korea)'
  },
  'sk-korea-trend': {
    name:'South Korea Battery Incident Trend', location:'South Korea', date:'2023\u20132025',
    facility:'Multiple', chemistry:'Mixed',
    cause:'Aggregate: 359 incidents (2023), 543 incidents (2024), 296 in H1 2025',
    impact:{casualties:'23+ (Aricell alone)',damages:'22.4B KRW (H1 2025)'},
    source:'National Fire Agency (South Korea), IDTechEx'
  }
};

/* ═══ 3. FACILITY PROFILES — Plug-and-play for any infrastructure ═══ */
var FACILITY_PROFILES = {
  datacenter: {
    name:'Data Center', threats:['Li-ion UPS thermal runaway','Electrical arc flash','HVAC failure cascade','Cable fire propagation','Generator fuel fire'],
    standards:['NFPA 75','NFPA 855','NFPA 76','UL 9540A','TIA-942','NEC 645'],
    hctPrimary:['F500-EA','DIAMOND-DOSER','SMART-LX','VEEP'],
    zones:['Battery Room','Server Hall A','Server Hall B','Electrical Room','Generator Bay','Cooling Plant'],
    refIncident:'daejeon-2025', sector:'Information'
  },
  bess: {
    name:'Battery Energy Storage', threats:['Thermal runaway propagation','Off-gas accumulation & explosion','HF gas release','Ground fault','BMS failure','Cell venting'],
    standards:['NFPA 855','UL 9540A','UL 9540','IEC 62619','NFPA 68','NFPA 69'],
    hctPrimary:['F500-EA','BLADDER-TANK','VEEP','SMART-LX','SMART-LX-ANALYTICS'],
    zones:['Battery Container A','Battery Container B','Inverter Room','Transformer Pad','Control Room'],
    refIncident:'gateway-2024', sector:'Utilities'
  },
  ev_charging: {
    name:'EV Charging Hub', threats:['Vehicle battery thermal runaway','Charging station arc fault','Cable overheating','Multi-vehicle propagation'],
    standards:['NFPA 855','NFPA 88A','NEC 625','UL 9540A'],
    hctPrimary:['F500-EA','BLADDER-TANK','SMART-LX','PINNACLE'],
    zones:['Charging Bay 1\u201310','Charging Bay 11\u201320','Electrical Distribution','Canopy/Structure','Waiting Area'],
    refIncident:'gateway-2024', sector:'Transportation'
  },
  substation: {
    name:'Electrical Substation', threats:['Transformer fire','Arc flash','Oil spill ignition','Cable fire','Bushing failure','CT/PT explosion'],
    standards:['NFPA 850','IEEE C2','NFPA 70E','OSHA 1910.269'],
    hctPrimary:['F500-EA','DIAMOND-DOSER','SMART-LX','HYDROLOCK'],
    zones:['Transformer Bay 1','Transformer Bay 2','Control House','Cable Trench','Switch Yard'],
    refIncident:'mcmicken-2019', sector:'Utilities'
  },
  manufacturing: {
    name:'Manufacturing / Industrial', threats:['Combustible dust explosion','Chemical fire','Machinery fire','Battery storage fire','Flammable liquid spill'],
    standards:['NFPA 652','NFPA 654','OSHA 1910.307','NFPA 30','NFPA 484'],
    hctPrimary:['F500-EA','DUST-WASH','BLADDER-TANK','SMART-LX'],
    zones:['Production Floor','Battery Charging Bay','Chemical Storage','Dust Collection','Loading Dock'],
    refIncident:'aricell-2024', sector:'Manufacturing'
  },
  warehouse: {
    name:'Warehouse / Distribution', threats:['High-rack fire','EV charging fire','Li-ion battery storage','Forklift battery fire'],
    standards:['NFPA 13','NFPA 855','FM Global DS 8-34','NFPA 30B'],
    hctPrimary:['F500-EA','DIAMOND-DOSER','SMART-LX','PINNACLE'],
    zones:['High Rack Zone A','High Rack Zone B','Charging Station','Receiving Dock','Office/Mezzanine'],
    refIncident:'gateway-2024', sector:'Wholesale Trade'
  },
  marine: {
    name:'Marine / Port', threats:['Container battery fire','Fuel spill','Cargo hold fire','Shore power failure'],
    standards:['SOLAS','NFPA 307','NFPA 18A','USCG regulations'],
    hctPrimary:['F500-EA','BLADDER-TANK','HYDROLOCK','SMART-LX'],
    zones:['Container Yard','Berth 1','Berth 2','Fuel Storage','Control Tower'],
    refIncident:'gateway-2024', sector:'Transportation'
  },
  aviation: {
    name:'Aviation / Hangar', threats:['Jet fuel fire','Aircraft battery fire','Hangar fire','GSE battery fire'],
    standards:['NFPA 409','FAA AC 150/5210-6E','NFPA 18A','NFPA 407'],
    hctPrimary:['F500-EA','BLADDER-TANK','DIAMOND-DOSER','SMART-LX'],
    zones:['Hangar Bay 1','Hangar Bay 2','Fuel Farm','GSE Charging','Apron'],
    refIncident:'mcmicken-2019', sector:'Transportation'
  },
  hospital: {
    name:'Healthcare / Hospital', threats:['UPS battery fire','OR equipment fire','Chemical storage fire','Electrical closet fire'],
    standards:['NFPA 99','NFPA 101','NFPA 855','Joint Commission EC.02.03.01'],
    hctPrimary:['F500-EA','DIAMOND-DOSER','SMART-LX','VEEP'],
    zones:['UPS Room','Generator Room','OR Suite','Pharmacy/Chemical','IT/Server Room','Basement Electrical'],
    refIncident:'daejeon-2025', sector:'Health Care'
  },
  solar_bess: {
    name:'Solar + BESS', threats:['DC arc fault','Inverter fire','Battery thermal runaway','Ground fault','String combiner fire'],
    standards:['NFPA 855','NEC 690','UL 9540A','NFPA 70E'],
    hctPrimary:['F500-EA','BLADDER-TANK','VEEP','SMART-LX-ANALYTICS'],
    zones:['Solar Array Field','Battery Enclosure A','Battery Enclosure B','Inverter Pad','Substation','Control Building'],
    refIncident:'otay-mesa-2024', sector:'Utilities'
  },
  telecom: {
    name:'Telecom / Cell Tower', threats:['Battery cabinet fire','Rectifier fault','Cabinet overheating','Generator fuel fire'],
    standards:['NFPA 76','NFPA 855','ATIS-0600315','TIA-942'],
    hctPrimary:['F500-EA','SMART-LX','VEEP'],
    zones:['Battery Cabinet','Equipment Shelter','Generator Pad','Antenna Platform'],
    refIncident:'daejeon-2025', sector:'Information'
  }
};

/* ═══ 4. HYPER-SPECIFIC RECOMMENDATION ENGINE ═══ */
function generateHyperSpecificRecos(fc) {
  fc = fc || {};
  var type = (fc.type || 'datacenter').toLowerCase().replace(/[\s-]+/g,'');
  var battery = fc.battery || 'NMC';
  var modules = fc.modules || 384;
  var supp = fc.suppression || 'FM-200';
  var name = fc.facilityName || 'Facility';
  var detection = fc.detection || [];
  var profile = FACILITY_PROFILES[type] || FACILITY_PROFILES.datacenter;
  var zones = profile.zones || [];
  var primaryZone = zones[0] || 'Battery Room';

  var doserSize = modules <= 100 ? '2-inch' : modules <= 500 ? '3-inch' : '4-inch';
  var tankSize = modules <= 100 ? '500 gal' : modules <= 500 ? '3,000 gal' : '6,000 gal';
  var nozzleCount = Math.ceil(modules / 32);
  var rows = Math.max(1, Math.ceil(modules / 96));
  var camCount = Math.max(4, Math.ceil(rows * 1.5));
  var recos = [];

  // 1. PRIMARY SUPPRESSION
  recos.push({priority:'IMMEDIATE', cat:'Suppression',
    title:'F-500 EA Micelle Mist \u2014 ' + primaryZone,
    product: HCT_PRODUCTS['DIAMOND-DOSER'],
    detail:'Install Diamond Doser (' + doserSize + ') on existing ' + supp + ' riser, ' + primaryZone + '. Feed ' + nozzleCount + ' ceiling-mount deluge nozzles at 3% concentration covering Module rows 1\u2013' + modules + '. Auto-adjusts to flow/pressure changes without calibration. Replaces chemically incompatible ' + supp + ' for Li-ion thermal runaway.',
    standard:'NFPA 18A \u00a7 7.7',
    location: primaryZone + ', ' + name
  });

  // 2. CONCENTRATE SUPPLY
  recos.push({priority:'IMMEDIATE', cat:'Suppression',
    title: tankSize + ' Bladder Tank \u2014 F-500 EA Concentrate',
    product: HCT_PRODUCTS['BLADDER-TANK'],
    detail:'Deploy ' + tankSize + ' Bladder Tank adjacent to ' + primaryZone + '. Provides minimum 30-minute sustained discharge at 3% across ' + nozzleCount + ' nozzle heads. Concentrate supply line to Diamond Doser. Monthly level inspection, annual hydrostatic test.',
    standard:'NFPA 18A, NFPA 13',
    location:'Mechanical room adjacent to ' + primaryZone
  });

  // 3. SMART-LX DETECTION
  recos.push({priority:'IMMEDIATE', cat:'Detection',
    title:'Smart-LX Sensor Gateway + ' + camCount + ' Thermal Cameras',
    product: HCT_PRODUCTS['SMART-LX'],
    detail:'Deploy Smart-LX Sensor Gateway with ' + camCount + ' FLIR thermal cameras across ' + primaryZone + ' (' + rows + ' rows). Rule-based alerts: Amber 45\u00b0C cell surface, Red 55\u00b0C, Auto-suppression trigger 65\u00b0C. Feed to on-premise Smart-LX cloud. Integrate with BMS for automated module isolation.',
    standard:'NFPA 72, NFPA 855 \u00a7 4.3',
    location: primaryZone + ' ceiling grid'
  });

  // 4. OFF-GAS DETECTION
  var hasOffGas = detection.indexOf && detection.indexOf('Off-Gas') >= 0;
  if (!hasOffGas) {
    recos.push({priority:'IMMEDIATE', cat:'Detection',
      title:'Off-Gas & HF Vapor Detection \u2014 ' + primaryZone,
      product: HCT_PRODUCTS['VEEP'],
      detail:'Install gas/vapor monitors in ' + primaryZone + ' supply air plenum and exhaust duct. Monitor electrolyte vapor (EC/DMC), hydrogen fluoride (HF), carbon monoxide (CO). Integrate with Smart-LX for LEL trending. Alert 10% LEL, evacuate 25% LEL, auto-suppress 50% LEL.',
      standard:'NFPA 855 \u00a7 4.3.7, OSHA 1910.1000',
      location: primaryZone + ' HVAC supply and exhaust'
    });
  }

  // 5. VEEP INTEGRATION
  recos.push({priority:'30-DAY', cat:'Integration',
    title:'VEEP System \u2014 Unified Detect-Prevent-Suppress Chain',
    product: HCT_PRODUCTS['VEEP'],
    detail:'Commission full VEEP system: Smart-LX detection + gas monitoring + F-500 EA suppression in automated chain. Detection \u2192 Alert \u2192 Confirm \u2192 Suppress sequence with manual override. BMS integration for module isolation on thermal alert. Single control panel in ' + (zones[zones.length-1] || 'Control Room') + '.',
    standard:'NFPA 18A, NFPA 69, NFPA 855',
    location: primaryZone + ' + ' + (zones[zones.length-1] || 'Control Room')
  });

  // 6. ANALYTICS
  recos.push({priority:'30-DAY', cat:'Monitoring',
    title:'Smart-LX Enterprise Analytics \u2014 Predictive Failure',
    product: HCT_PRODUCTS['SMART-LX-ANALYTICS'],
    detail:'Deploy Smart-LX Enterprise Analytics: continuous temperature trending for ' + modules + ' modules across ' + rows + ' rows. Impedance-based battery health tracking. Predictive failure modeling with weather correlation. Weekly automated asset health reports to facility management. Historical baseline for anomaly detection.',
    standard:'NFPA 72, NFPA 855',
    location:'Cloud/on-premise'
  });

  // 7. EPO
  if (fc.epo !== 'Yes') {
    recos.push({priority:'IMMEDIATE', cat:'Electrical',
      title:'EPO Circuit \u2014 Generator Isolation Verification',
      product:null,
      detail:'Verify Emergency Power-Off includes generator isolation relay. In McMicken (2019) and simulated full-failure, EPO activated but generator re-energized the bus. EPO must de-energize ALL sources including standby generators. Test quarterly.',
      standard:'NEC 645.10, NFPA 70E',
      location:'Electrical Room'
    });
  }

  // 8. CHEMISTRY-SPECIFIC
  if (battery === 'NMC' || battery === 'NCA') {
    recos.push({priority:'90-DAY', cat:'Migration',
      title: battery + ' \u2192 LFP Migration Assessment',
      product:null,
      detail: battery + ' thermal runaway onset: ~150\u00b0C. LFP onset: ~270\u00b0C. Assess phased migration starting with oldest cells. Reference: Gateway (2024) used NMC \u2014 7-day fire. Warwick (2023) used LFP \u2014 contained. Chemistry matters.',
      standard:'UL 9540A, NFPA 855 \u00a7 4.2',
      location:'All battery arrays'
    });
  }

  // 9. FACILITY-TYPE SPECIFIC
  if (type.includes('data')) {
    recos.push({priority:'30-DAY', cat:'Architecture',
      title:'Fire Barrier Assessment \u2014 Battery-to-Server Separation',
      product:null,
      detail:'Verify 2-hour fire-rated walls between ' + primaryZone + ' and Server Halls. Inspect cable penetration fire stops. Daejeon (2025): heat transferred through unsealed penetrations, destroyed servers in adjacent hall. Every penetration must be fire-stopped to rating of wall.',
      standard:'NFPA 75 \u00a7 8.1.4, NFPA 855 \u00a7 4.1.3',
      location:'All battery-adjacent walls'
    });
  }
  if (type.includes('manufactur') || type.includes('warehouse')) {
    recos.push({priority:'IMMEDIATE', cat:'Dust Control',
      title:'Combustible Dust Mitigation \u2014 Dust Wash',
      product: HCT_PRODUCTS['DUST-WASH'],
      detail:'Deploy Dust Wash around battery charging/storage areas. Safely captures metallic/polymer dust without triggering hot spots. Weekly application. Reference: Aricell (2024) \u2014 23 fatalities, combustible material proximity was contributing factor.',
      standard:'NFPA 652, OSHA 1910.307',
      location:'All battery handling areas'
    });
  }
  if (type.includes('marine')) {
    recos.push({priority:'IMMEDIATE', cat:'Vapor Control',
      title:'HydroLock Vapor Mitigation \u2014 Fuel/Battery Areas',
      product: HCT_PRODUCTS['HYDROLOCK'],
      detail:'Deploy HydroLock in fuel storage and battery container areas. Encapsulates hydrocarbon vapors, drops LEL to zero. Critical for enclosed marine environments where ventilation is limited.',
      standard:'NFPA 307, SOLAS',
      location:'Fuel Storage + Battery Containers'
    });
  }

  // 10. BACKUP (always)
  recos.push({priority:'30-DAY', cat:'Resilience',
    title:'3-2-1 Backup Architecture',
    product:null,
    detail:'Implement 3 copies of critical data on 2 different media with 1 offsite. Simulated full-failure destroyed 858 TB with zero offsite backup. Daejeon (2025): hundreds of government services offline because no geographic redundancy.',
    standard:'NFPA 75 \u00a7 9.1',
    location:'Offsite + Cloud'
  });

  return recos;
}

/* ═══ 5. ECONOMIC IMPACT MODEL (Phoenix ASU REMI methodology) ═══ */
function calculateCommunityImpact(fc, mode) {
  fc = fc || {};
  var isFull = mode === 'full';

  var employees = fc.employees || 150;
  var avgSalary = fc.avgSalary || 85000;
  var annualRevenue = fc.annualRevenue || 50000000;
  var profile = FACILITY_PROFILES[(fc.type||'datacenter').toLowerCase().replace(/[\s-]+/g,'')] || FACILITY_PROFILES.datacenter;
  var sector = profile.sector || 'Information';

  // Phoenix ASU REMI multipliers
  var jobMultiplier = 2.26;  // 3,073 direct → 6,951 total
  var gspMultiplier = 1.27;  // $511M revenue → $650M GSP
  var rdpiRatio = 0.455;     // $650M → $296M RDPI
  var taxRatio = 0.054;      // $650M → $35M tax

  var directJobLoss = isFull ? employees : Math.ceil(employees * 0.08);
  var revenueImpact = isFull ? annualRevenue : annualRevenue * 0.065;
  var durationMonths = isFull ? 12 : 3;

  var totalJobs = Math.ceil(directJobLoss * jobMultiplier * (durationMonths / 12));
  var gsp = revenueImpact * gspMultiplier * (durationMonths / 12);
  var rdpi = gsp * rdpiRatio;
  var tax = gsp * taxRatio;
  var insuranceIncrease = isFull ? annualRevenue * 0.042 : annualRevenue * 0.018;

  // Phoenix Table 2 sector distribution
  var sectors = [
    {sector:'Direct (' + sector + ')', pct:0.435, jobs:directJobLoss},
    {sector:'Retail Trade', pct:0.29, jobs:Math.ceil((totalJobs-directJobLoss)*0.29)},
    {sector:'Accommodation & Food', pct:0.112, jobs:Math.ceil((totalJobs-directJobLoss)*0.112)},
    {sector:'Healthcare & Social', pct:0.056, jobs:Math.ceil((totalJobs-directJobLoss)*0.056)},
    {sector:'Professional Services', pct:0.049, jobs:Math.ceil((totalJobs-directJobLoss)*0.049)},
    {sector:'Administrative & Waste', pct:0.073, jobs:Math.ceil((totalJobs-directJobLoss)*0.073)},
    {sector:'Construction', pct:0.117, jobs:Math.ceil((totalJobs-directJobLoss)*0.117)},
    {sector:'Other Sectors', pct:0.104, jobs:Math.ceil((totalJobs-directJobLoss)*0.104)}
  ];

  // ISO-PPC insurance cascade
  var isoPPC = {
    currentClass: fc.isoClass || 4,
    projectedClass: isFull ? Math.min(10, (fc.isoClass||4) + 3) : Math.min(10, (fc.isoClass||4) + 1),
    premiumImpact: isFull ? '15\u201325% increase across jurisdiction' : '3\u20135% increase for facility',
    note: 'ISO re-rating affects ALL properties in jurisdiction, not just the facility'
  };

  // Property value depreciation (from Phoenix study patterns)
  var propertyDepreciation = {
    halfMile: isFull ? '8\u201312%' : '1\u20132%',
    oneMile: isFull ? '3\u20135%' : '<1%',
    jurisdiction: isFull ? '1\u20132%' : 'Negligible'
  };

  return {
    directJobs: directJobLoss, totalJobs: totalJobs,
    gsp: gsp, rdpi: rdpi, taxRevenue: tax,
    insuranceIncrease: insuranceIncrease, duration: durationMonths + ' months',
    sectors: sectors, isoPPC: isoPPC, propertyDepreciation: propertyDepreciation,
    methodology: 'REMI model (ASU Seidman Institute methodology, Phoenix 2014)',
    fmt: function(n) { return n >= 1000000 ? '$' + (n/1000000).toFixed(1) + 'M' : '$' + (n/1000).toFixed(0) + 'K'; },
    summary: function() {
      var self = this;
      return (isFull ? 'FULL LOSS: ' : 'CONTAINED: ') +
        self.totalJobs + ' jobs at risk, ' + self.fmt(self.gsp) + ' GSP, ' +
        self.fmt(self.taxRevenue) + ' tax revenue, ' +
        self.fmt(self.insuranceIncrease) + ' insurance increase \u2014 ' + self.duration;
    }
  };
}

/* ═══ 6. MATCHED INCIDENT LOOKUP ═══ */
function getMatchedIncident(facilityType, chemistry) {
  var type = (facilityType || '').toLowerCase();
  var chem = (chemistry || '').toUpperCase();
  if (type.includes('data') || type.includes('server')) return INCIDENT_DB['daejeon-2025'];
  if (type.includes('manufactur')) return INCIDENT_DB['aricell-2024'];
  if (chem === 'NMC' && (type.includes('bess') || type.includes('solar'))) return INCIDENT_DB['gateway-2024'];
  if (chem === 'LFP') return INCIDENT_DB['warwick-2023'];
  return INCIDENT_DB['mcmicken-2019'];
}

/* ═══ 7. ANOMALY → EMERGENCY CHAIN ═══ */
var anomalyEscalationActive = false;
var anomalyHistory = [];

function detectAnomaly(zone, sensorType, value, threshold) {
  var ratio = value / threshold;
  var severity = 'info';
  if (ratio >= 1.5) severity = 'critical';
  else if (ratio >= 1.0) severity = 'danger';
  else if (ratio >= 0.85) severity = 'warning';
  else if (ratio >= 0.7) severity = 'watch';
  else return null;

  var anomaly = {
    id: 'ANOM-' + Date.now(),
    ts: new Date().toISOString(),
    zone: zone, sensor: sensorType,
    value: value, threshold: threshold,
    ratio: ratio, severity: severity
  };
  anomalyHistory.push(anomaly);

  // Push to monitor feed
  var unit = sensorType.includes('Temp') || sensorType.includes('Thermal') ? '\u00b0C' :
             sensorType.includes('Gas') || sensorType.includes('LEL') ? ' ppm' : '';
  var msg = zone + ' \u2014 ' + sensorType + ': ' + value + unit + ' (' + Math.round(ratio * 100) + '% of threshold)';
  if (typeof pushLiveAlert === 'function') {
    pushLiveAlert(msg, severity === 'critical' || severity === 'danger' ? 'alert' : severity === 'warning' ? 'watch' : 'info');
  }

  // Toast
  if (typeof showToast === 'function') {
    var tType = severity === 'critical' ? 'fire' : severity === 'danger' ? 'alert' : severity === 'warning' ? 'warning' : 'info';
    showToast(zone + ': ' + sensorType + ' \u2014 ' + Math.round(ratio * 100) + '% of threshold', tType, 5000);
  }

  // Badge monitor
  var warnCount = anomalyHistory.filter(function(a){ return a.severity === 'critical' || a.severity === 'danger' || a.severity === 'warning'; }).length;
  if (typeof addRailBadge === 'function' && warnCount > 0) addRailBadge('monitor', warnCount);

  // CRITICAL → Auto-trigger emergency
  if (severity === 'critical' && !anomalyEscalationActive) {
    autoTriggerEmergency(anomaly);
  }

  return anomaly;
}

function autoTriggerEmergency(anomaly) {
  anomalyEscalationActive = true;

  // Pre-fill emergency data from facility config + anomaly
  if (typeof emData !== 'undefined') {
    emData.type = anomaly.sensor.includes('Temp') || anomaly.sensor.includes('Thermal') ? 'thermal-runaway' :
                  anomaly.sensor.includes('Gas') || anomaly.sensor.includes('Vapor') ? 'gas-release' : 'electrical-failure';
    emData.location = anomaly.zone;
    emData.severity = 'Uncontrolled';
    if (typeof facilityConfig !== 'undefined') emData.suppression = facilityConfig.suppression || '';
  }

  // Alerts
  if (typeof showToast === 'function') showToast('CRITICAL ANOMALY \u2014 Emergency auto-initiated: ' + anomaly.zone, 'alert', 8000);
  if (typeof triggerEmergencyMode === 'function') triggerEmergencyMode();
  if (typeof addRailBadge === 'function') {
    addRailBadge('emergency', 1);
    addRailBadge('training', 2);
  }

  // Switch to emergency view after brief delay
  setTimeout(function() {
    if (typeof switchView === 'function') switchView('emergency');
    if (typeof showToast === 'function') showToast('Emergency data pre-filled from Smart-LX. Review and confirm.', 'info', 5000);
  }, 1500);

  // Badge simulation with counterfactual prompt
  setTimeout(function() {
    if (typeof addRailBadge === 'function') addRailBadge('simulate', 1);
    if (typeof showToast === 'function') showToast('Counterfactual simulation ready \u2014 "What if this goes uncontrolled?"', 'info', 6000);
  }, 6000);

  // Push training prescriptions
  setTimeout(function() {
    if (typeof onEmergencyComplete === 'function' && typeof emData !== 'undefined') {
      onEmergencyComplete(emData);
    }
  }, 10000);

  // Reset lock after 120s
  setTimeout(function() { anomalyEscalationActive = false; }, 120000);
}

/* ═══ 8. MONITOR LIVE SIMULATION ═══ */
function startLiveMonitorScenario(speed) {
  speed = speed || 1; // 1 = real-time-ish, 10 = fast
  var base = 10000 / speed;

  var fc = (typeof facilityConfig !== 'undefined') ? facilityConfig : {};
  var profile = FACILITY_PROFILES[(fc.type||'datacenter').toLowerCase().replace(/[\s-]+/g,'')] || FACILITY_PROFILES.datacenter;
  var zone = profile.zones ? profile.zones[0] : 'Battery Room';

  var scenario = [
    {d:base*1,  zone:zone, sensor:'Thermal Camera A', val:38, thresh:45},
    {d:base*2,  zone:zone, sensor:'Thermal Camera A', val:42, thresh:45},
    {d:base*3,  zone:zone, sensor:'Gas Monitor (LEL)', val:3,  thresh:10},
    {d:base*4,  zone:zone, sensor:'Thermal Camera A', val:46, thresh:45},
    {d:base*4.5,zone:zone, sensor:'Thermal Camera B', val:39, thresh:45},
    {d:base*5,  zone:zone, sensor:'Gas Monitor (LEL)', val:7,  thresh:10},
    {d:base*5.5,zone:zone, sensor:'Thermal Camera A', val:52, thresh:45},
    {d:base*6,  zone:zone, sensor:'BMS Cell Voltage',  val:4.3,thresh:4.2},
    {d:base*6.5,zone:zone, sensor:'Gas Monitor (HF)',  val:2.8,thresh:3},
    {d:base*7,  zone:zone, sensor:'Thermal Camera A', val:58, thresh:45},
    {d:base*7.5,zone:zone, sensor:'Gas Monitor (HF)',  val:3.5,thresh:3},
    {d:base*8,  zone:zone, sensor:'Thermal Camera A', val:67, thresh:45},
  ];

  if (typeof showToast === 'function') showToast('Live monitoring active \u2014 Smart-LX scenario running', 'ok', 3000);

  scenario.forEach(function(s) {
    setTimeout(function() { detectAnomaly(s.zone, s.sensor, s.val, s.thresh); }, s.d);
  });
}

/* ═══ 9. REPORT TEMPLATES ═══ */
var REPORT_TEMPLATES = {
  ahj: {
    name: 'AHJ Incident Notification',
    sections: [
      {id:'header', label:'INCIDENT NOTIFICATION', fields:['Incident ID','Date/Time','Facility Name','Facility Address','Jurisdiction','AHJ Contact']},
      {id:'event', label:'EVENT SUMMARY', fields:['Event Type','Origin Location','Detection Method','Time to Detection','Time to Suppression Activation','Suppression System Type','Suppression Effectiveness']},
      {id:'compliance', label:'COMPLIANCE STATUS AT TIME OF EVENT', fields:['NFPA 855 Compliance','UL 9540A Test Status','Off-Gas Detection Installed','Suppression Agent Compatibility','EPO Verification Date','Last Inspection Date']},
      {id:'response', label:'RESPONSE DETAILS', fields:['Fire Department Units','Personnel Count','Water Usage (gal)','Suppression Agent Used','Containment Duration','Mutual Aid Required']},
      {id:'impact', label:'IMPACT ASSESSMENT', fields:['Estimated Property Loss','Business Interruption Duration','Services Affected','Environmental Release','Injuries/Fatalities','Evacuation Required']},
      {id:'findings', label:'PRELIMINARY FINDINGS', fields:['Root Cause (Preliminary)','Contributing Factors','Standards Deficiencies Identified','Corrective Actions Required']},
      {id:'attachments', label:'ATTACHMENTS', fields:['Smart-LX sensor logs','BMS data export','Thermal camera footage','Gas monitor readings','Pre-incident plan','Insurance notification']}
    ]
  },
  insurance: {
    name: 'Insurance Claim Package',
    sections: [
      {id:'header', label:'CLAIM NOTIFICATION', fields:['Policy Number','Insured Name','Facility Address','Date of Loss','Date Reported','Claim Representative']},
      {id:'facility', label:'FACILITY PROFILE', fields:['Facility Type','Construction Class','Fire Protection Systems','Sprinkler System','Detection Systems','Alarm Monitoring','Last Inspection','ISO Classification']},
      {id:'event', label:'LOSS EVENT', fields:['Cause of Loss','Origin Point','Fire Progression','Suppression Response','Fire Department Response','Duration to Control']},
      {id:'damage', label:'DAMAGE ASSESSMENT', fields:['Building Damage','Contents/Equipment Damage','Business Income Loss','Extra Expense','Environmental Cleanup','Third-Party Liability']},
      {id:'suppression', label:'SUPPRESSION SYSTEM PERFORMANCE', fields:['System Type','Agent Used','Activation Time','Performance vs. Design','Why Agent Failed/Succeeded','Agent Compatibility with Hazard']},
      {id:'mitigation', label:'LOSS MITIGATION CREDIT', fields:['Detection System Performance','Alarm Response Time','Fire Department Response Time','Salvage Operations','Business Continuity Actions']},
      {id:'countermeasure', label:'RECOMMENDED COUNTERMEASURES FOR PREMIUM REDUCTION', fields:['Current Suppression Gap','Recommended System','Estimated Install Cost','Projected Premium Reduction','ROI Period','Supporting Test Data']},
      {id:'community', label:'COMMUNITY IMPACT (ISO RELEVANCE)', fields:['Jobs at Risk','GSP Impact','Tax Revenue Impact','ISO Re-Rating Risk','Jurisdiction-Wide Premium Impact']}
    ]
  },
  stakeholder: {
    name: 'Stakeholder Briefing',
    sections: [
      {id:'exec', label:'EXECUTIVE SUMMARY', fields:['Event','Outcome','Financial Impact','Operational Impact','Recommended Actions']},
      {id:'timeline', label:'EVENT TIMELINE', fields:['Detection','Escalation','Response','Containment','Recovery']},
      {id:'root', label:'ROOT CAUSE ANALYSIS', fields:['Technical Causes','Procedural Causes','Architectural Causes','Organizational Causes']},
      {id:'impact', label:'IMPACT ANALYSIS', fields:['Direct Cost','Indirect Cost (Business Interruption)','Induced Cost (Community)','Insurance Recovery','Net Exposure']},
      {id:'counterfactual', label:'COUNTERFACTUAL ANALYSIS', fields:['What If No Detection?','What If Proper Suppression?','What If Both?','Cost Comparison']},
      {id:'action', label:'ACTION PLAN', fields:['Immediate (0\u201330 days)','Near-Term (30\u201390 days)','Long-Term (90\u2013365 days)','Budget Required','ROI Analysis']},
      {id:'community', label:'COMMUNITY ECONOMIC IMPACT', fields:['Jobs','GSP','Tax Revenue','Property Values','Insurance Rates']}
    ]
  },
  fema_grant: {
    name: 'FEMA AFG Grant Support Package',
    sections: [
      {id:'need', label:'STATEMENT OF NEED', fields:['Jurisdiction','Population Served','Current Fire Protection Gaps','Risk Assessment Score','ISO-PPC Classification','Recent Incidents']},
      {id:'hazard', label:'HAZARD ANALYSIS', fields:['BESS/Li-ion Facilities in Jurisdiction','Data Centers in Jurisdiction','Critical Infrastructure Count','Thermal Runaway Risk Level','Current Suppression Capability','Detection Gaps']},
      {id:'economic', label:'ECONOMIC JUSTIFICATION (REMI methodology)', fields:['Jobs Protected','GSP Protected','Tax Revenue Protected','Cost-Benefit Ratio','Insurance Premium Reduction','Property Value Protection']},
      {id:'solution', label:'PROPOSED SOLUTION', fields:['Equipment Requested','Training Requested','Installation Plan','Maintenance Plan','Budget Breakdown','Matching Funds']},
      {id:'compliance', label:'STANDARDS ALIGNMENT', fields:['NFPA 855 Requirements Met','UL 9540A Compliance','NFPA 18A Agent Qualification','State/Local Code Alignment']},
      {id:'outcomes', label:'EXPECTED OUTCOMES', fields:['Response Time Improvement','Containment Capability','Community Risk Reduction','Firefighter Safety Improvement']}
    ]
  }
};

/* ═══ 10. RENDER RECOMMENDATIONS IN UI ═══ */
function renderHyperRecos(recos, containerId) {
  var el = document.getElementById(containerId);
  if (!el || !recos) return;

  var html = recos.map(function(r, i) {
    var pClass = r.priority === 'IMMEDIATE' ? 'imm' : r.priority === '30-DAY' ? '30' : '90';
    var productHTML = '';
    if (r.product) {
      productHTML = '<div class="reco-product"><span class="reco-product-name">' + r.product.name + '</span><span class="reco-product-type">' + r.product.type + '</span></div>';
    }
    return '<div class="reco-card reco-' + pClass + '" style="animation-delay:' + (i*0.06) + 's">' +
      '<div class="reco-head">' +
        '<span class="ai-p ai-' + pClass + '">' + r.priority + '</span>' +
        '<span class="reco-cat">' + r.cat + '</span>' +
      '</div>' +
      '<div class="reco-title">' + r.title + '</div>' +
      productHTML +
      '<div class="reco-detail">' + r.detail + '</div>' +
      '<div class="reco-meta">' +
        '<span class="cat-card-tag">' + r.standard + '</span>' +
        '<span class="reco-location">' + r.location + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = html;
}

function renderCommunityImpact(impact, containerId) {
  var el = document.getElementById(containerId);
  if (!el || !impact) return;

  var fmt = impact.fmt;
  var html = '<div class="impact-summary">' +
    '<div class="impact-headline">' + impact.summary() + '</div>' +
    '<div class="impact-grid">' +
      '<div class="impact-stat"><div class="impact-num">' + impact.totalJobs.toLocaleString() + '</div><div class="impact-label">Jobs at Risk</div></div>' +
      '<div class="impact-stat"><div class="impact-num">' + fmt(impact.gsp) + '</div><div class="impact-label">GSP Impact</div></div>' +
      '<div class="impact-stat"><div class="impact-num">' + fmt(impact.taxRevenue) + '</div><div class="impact-label">Tax Revenue</div></div>' +
      '<div class="impact-stat"><div class="impact-num">' + fmt(impact.insuranceIncrease) + '</div><div class="impact-label">Insurance Increase</div></div>' +
    '</div>' +
    '<div class="impact-methodology">' + impact.methodology + '</div>' +
  '</div>' +
  '<div class="impact-sectors"><div class="impact-sectors-title">Sector Distribution of Job Losses</div>' +
    impact.sectors.map(function(s) {
      return '<div class="impact-sector-row"><span class="impact-sector-name">' + s.sector + '</span><span class="impact-sector-jobs">' + s.jobs + '</span><div class="impact-sector-bar" style="width:' + Math.round(s.jobs/impact.totalJobs*100) + '%"></div></div>';
    }).join('') +
  '</div>' +
  '<div class="impact-iso"><div class="impact-iso-title">ISO-PPC Insurance Cascade</div>' +
    '<div class="impact-iso-row">Current Class: ' + impact.isoPPC.currentClass + ' \u2192 Projected: ' + impact.isoPPC.projectedClass + '</div>' +
    '<div class="impact-iso-row">Premium Impact: ' + impact.isoPPC.premiumImpact + '</div>' +
    '<div class="impact-iso-note">' + impact.isoPPC.note + '</div>' +
  '</div>' +
  '<div class="impact-property"><div class="impact-property-title">Property Value Depreciation</div>' +
    '<div class="impact-iso-row">Within 0.5 mi: ' + impact.propertyDepreciation.halfMile + '</div>' +
    '<div class="impact-iso-row">Within 1.0 mi: ' + impact.propertyDepreciation.oneMile + '</div>' +
    '<div class="impact-iso-row">Jurisdiction-wide: ' + impact.propertyDepreciation.jurisdiction + '</div>' +
  '</div>';

  el.innerHTML = html;
}

/* ═══ STANDARDS LIVE LOOKUP ═══ */

/* Built-in standard summaries (instant, no API needed) */
var STANDARD_DETAILS = {
  'NFPA 855': {
    title: 'Standard for the Installation of Stationary Energy Storage Systems',
    edition: '2023 (next: 2026)',
    scope: 'Fire safety requirements for ESS including BESS. Covers installation, ventilation, fire suppression, off-gas detection, spacing, and hazard mitigation analysis.',
    keyRequirements: [
      'Hazard Mitigation Analysis (HMA) required before installation',
      'Off-gas detection required for Li-ion systems > 20 kWh',
      'Ventilation to prevent flammable gas accumulation',
      'Fire suppression system compatible with battery chemistry',
      'Minimum separation distances between modules and occupied spaces',
      'Thermal runaway propagation testing per UL 9540A'
    ],
    sections: {
      '4.1': 'General requirements — siting, construction, ventilation',
      '4.2': 'Battery technology requirements — chemistry-specific provisions',
      '4.3': 'Fire protection — detection, suppression, notification',
      '4.3.7': 'Off-gas detection — required for systems > 20 kWh in occupied buildings',
      '9.1': 'Large-scale energy storage — utility-scale BESS provisions'
    },
    url: 'https://www.nfpa.org/codes-and-standards/nfpa-855-standard-development/855'
  },
  'UL 9540A': {
    title: 'Test Method for Evaluating Thermal Runaway Fire Propagation in Battery Energy Storage Systems',
    edition: '2023 (4th edition)',
    scope: 'Multi-level test method: cell, module, unit, installation level. Determines whether thermal runaway propagates and what fire protection measures are needed.',
    keyRequirements: [
      'Cell-level: Single cell thermal runaway characterization',
      'Module-level: Propagation within module, gas generation rates',
      'Unit-level: Propagation between modules, fire size, deflagration potential',
      'Installation-level: Full-scale fire test with suppression system evaluation',
      'Required by NFPA 855 for all BESS installations'
    ],
    url: 'https://www.ul.com/services/ul-9540a-battery-energy-storage-system-testing'
  },
  'NFPA 75': {
    title: 'Standard for the Fire Protection of Information Technology Equipment',
    edition: '2024',
    scope: 'Fire protection requirements for IT equipment areas including data centers. Covers construction, fire suppression, electrical safety, and emergency procedures.',
    keyRequirements: [
      'Dedicated IT rooms with fire-rated construction',
      'Automatic fire detection and suppression',
      'Emergency Power Off (EPO) systems',
      'Cable penetration fire stopping',
      '2-hour fire-rated walls for battery rooms adjacent to IT spaces',
      'Record protection and backup requirements'
    ],
    sections: {
      '8.1.4': 'Fire barriers between battery rooms and IT areas',
      '9.1': 'Records protection — backup requirements'
    }
  },
  'NFPA 18A': {
    title: 'Standard on Water Additives for Fire Control and Vapor Mitigation',
    edition: '2022',
    scope: 'Requirements for water additive agents including Encapsulator Agents. Covers testing, performance criteria, and application methods.',
    keyRequirements: [
      'Annex 4.3: Recognizes 15+ years of third-party testing of Encapsulator Agents on Li-ion battery fires',
      'Performance testing for Class A and B fire suppression',
      'Flammable spill control testing',
      'Compatibility with existing sprinkler and deluge systems'
    ],
    hctRelevance: 'F-500 EA is the primary agent tested and recognized under NFPA 18A Annex 4.3 for Li-ion battery fire suppression.'
  },
  'NFPA 70E': {
    title: 'Standard for Electrical Safety in the Workplace',
    edition: '2024',
    scope: 'Electrical safety requirements for employees. Covers arc flash hazard analysis, PPE selection, lockout/tagout, and de-energization procedures.',
    keyRequirements: [
      'Arc flash risk assessment for all electrical work',
      'PPE category selection based on incident energy',
      'Lockout/tagout procedures',
      'Energized work permits',
      'Approach boundary distances'
    ]
  },
  'NEC 645': {
    title: 'National Electrical Code — IT Equipment',
    edition: '2023',
    scope: 'Electrical installation requirements for IT rooms and data centers including wiring, grounding, and Emergency Power Off.',
    keyRequirements: [
      '645.10: EPO must disconnect all sources of power including generators',
      '645.11: Uninterruptible power supply requirements',
      'Grounding and bonding requirements'
    ]
  },
  'NFPA 2001': {
    title: 'Standard on Clean Agent Fire Extinguishing Systems',
    edition: '2022',
    scope: 'Design, installation, and maintenance of gaseous fire suppression systems (FM-200, Novec, Inergen, CO2).',
    keyRequirements: [
      'Agent concentration and hold time requirements',
      'Room integrity testing',
      'Discharge testing schedules'
    ],
    limitationsForBESS: 'CRITICAL: Clean agents (FM-200, CO2, Halon) cannot arrest Li-ion thermal runaway. They remove oxygen but thermal runaway is self-sustaining via internal cell oxidizer. NFPA 2001 agents are chemically incompatible with this fire type.'
  },
  'NFPA 13': {
    title: 'Standard for the Installation of Sprinkler Systems',
    edition: '2022',
    scope: 'Design and installation of automatic sprinkler systems. The most widely used fire protection standard in the world.',
    keyRequirements: [
      'Sprinkler spacing, pipe sizing, water supply requirements',
      'Hazard classification (Light, Ordinary, Extra)',
      'Special provisions for high-rack storage'
    ]
  },
  'NFPA 72': {
    title: 'National Fire Alarm and Signaling Code',
    edition: '2022',
    scope: 'Design, installation, and maintenance of fire alarm systems, detection systems, and emergency communication systems.',
    keyRequirements: [
      'Detector spacing and placement',
      'Alarm notification appliance requirements',
      'System monitoring and supervision',
      'Emergency voice communication'
    ]
  },
  'NFPA 652': {
    title: 'Standard on the Fundamentals of Combustible Dust',
    edition: '2024',
    scope: 'Requirements for managing combustible dust hazards including dust hazard analysis, housekeeping, and explosion protection.',
    keyRequirements: [
      'Dust Hazard Analysis (DHA) required',
      'Housekeeping programs to prevent dust accumulation',
      'Explosion protection systems',
      'Ignition source management'
    ]
  },
  'NFPA 99': {
    title: 'Health Care Facilities Code',
    edition: '2024',
    scope: 'Fire protection, electrical, gas, and environmental requirements for healthcare facilities.',
    keyRequirements: [
      'Risk-based approach to facility systems',
      'Essential electrical system requirements',
      'Battery-powered UPS provisions',
      'Emergency and standby power'
    ]
  },
  'NFPA 850': {
    title: 'Recommended Practice for Fire Protection for Electric Generating Plants and High Voltage Direct Current Converter Stations',
    edition: '2020',
    scope: 'Fire protection guidelines for power generation facilities including substations.',
    keyRequirements: [
      'Transformer fire protection',
      'Cable fire protection',
      'Oil containment and drainage',
      'Fire detection and suppression for control rooms'
    ]
  }
};

/* Render clickable standard detail panel */
function renderStandardDetail(code) {
  var std = STANDARD_DETAILS[code];
  if (!std) {
    // Unknown standard — trigger a chat lookup
    if (typeof sendStandardQuery === 'function') sendStandardQuery(code);
    return;
  }

  var html = '<div class="std-detail-panel">' +
    '<div class="std-detail-close" onclick="closeStandardDetail()">\u2715</div>' +
    '<div class="std-detail-code">' + code + '</div>' +
    '<div class="std-detail-title">' + std.title + '</div>' +
    (std.edition ? '<div class="std-detail-edition">Edition: ' + std.edition + '</div>' : '') +
    '<div class="std-detail-scope">' + std.scope + '</div>';

  if (std.keyRequirements) {
    html += '<div class="std-detail-section-title">Key Requirements</div>';
    html += std.keyRequirements.map(function(r) {
      return '<div class="std-detail-req">\u2022 ' + r + '</div>';
    }).join('');
  }

  if (std.sections) {
    html += '<div class="std-detail-section-title">Key Sections</div>';
    for (var sec in std.sections) {
      html += '<div class="std-detail-section"><span class="std-detail-sec-code">\u00a7 ' + sec + '</span> ' + std.sections[sec] + '</div>';
    }
  }

  if (std.limitationsForBESS) {
    html += '<div class="std-detail-warning">' + std.limitationsForBESS + '</div>';
  }

  if (std.hctRelevance) {
    html += '<div class="std-detail-hct">' + std.hctRelevance + '</div>';
  }

  if (std.url) {
    html += '<div class="std-detail-link"><a href="' + std.url + '" target="_blank">View official standard \u2192</a></div>';
  }

  html += '</div>';

  // Show as overlay
  var overlay = document.getElementById('stdDetailOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'stdDetailOverlay';
    overlay.className = 'std-detail-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = html;
  overlay.classList.add('open');
  overlay.onclick = function(e) { if (e.target === overlay) closeStandardDetail(); };
}

function closeStandardDetail() {
  var overlay = document.getElementById('stdDetailOverlay');
  if (overlay) overlay.classList.remove('open');
}

/* For unknown standards — send to Pantheon AI chat for lookup */
function sendStandardQuery(code) {
  if (typeof showToast === 'function') showToast('Looking up ' + code + ' details...', 'info', 3000);
  // Switch to chat and auto-send a query
  var input = document.getElementById('chatInput');
  if (input) {
    input.value = 'What are the key requirements of ' + code + ' and how do they apply to this facility?';
    if (typeof sendChat === 'function') sendChat();
  }
}

/* Make standard rows clickable */
function makeStandardsClickable() {
  document.addEventListener('click', function(e) {
    var codeEl = e.target.closest('.ctx-std-code');
    if (codeEl) {
      renderStandardDetail(codeEl.textContent.trim());
      return;
    }
    var tagEl = e.target.closest('.cat-card-tag');
    if (tagEl) {
      var code = tagEl.textContent.trim();
      if (STANDARD_DETAILS[code]) {
        renderStandardDetail(code);
      }
    }
  });
}

// Init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', makeStandardsClickable);
} else {
  makeStandardsClickable();
}

/* ═══════════════════════════════════════════════════════════════════
   PANTHEON — UI OVERHAUL PATCH
   Suggestion chips · Profile loading · Editable settings
   ═══════════════════════════════════════════════════════════════════ */

/* ── USER PROFILE (loaded from /api/auth/me on boot) ──────────────── */
var USER_PROFILE = {};

async function loadUserProfile() {
  try {
    var r = await fetch('/api/auth/me');
    if (!r.ok) return;
    var u = await r.json();
    USER_PROFILE = u || {};
    applyProfileToUI();
    // Restore facility config from server state
    restoreUserState();
  } catch(e) {}
}

async function restoreUserState() {
  try {
    var r = await fetch('/api/user/state');
    if (!r.ok) return;
    var d = await r.json();
    if (!d.ok || !d.profile) return;
    var p = d.profile;
    // If we have a stored facilityConfig JSON, restore it
    if (p.facility_config && typeof p.facility_config === 'object' && p.facility_config.type) {
      // Only restore if current facilityConfig is empty (don't overwrite if user already configured this session)
      if (!facilityConfig || !facilityConfig.type) {
        facilityConfig = p.facility_config;
        // Apply to UI — show the scenario select with restored config
        if (typeof showScenarioSelect === 'function') {
          var scenarioEl = document.getElementById('scenarioSelect');
          if (scenarioEl) {
            showScenarioSelect();
          }
        }
        if (typeof populateThreatLandscape === 'function') populateThreatLandscape();
        if (typeof applyProfileToUI === 'function') applyProfileToUI();
        if (typeof showToast === 'function') showToast('Facility config restored: ' + (facilityConfig.typeName || facilityConfig.type), 'ok', 3500);
      }
    }
  } catch(e) { console.log('[restoreUserState] error:', e); }
}

// Save facilityConfig to server whenever it changes significantly
function saveUserState() {
  if (!facilityConfig || !facilityConfig.type) return;
  fetch('/api/user/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facility_config: facilityConfig })
  }).catch(function(e) { console.log('[saveUserState] error:', e); });
}

function applyProfileToUI() {
  var u = USER_PROFILE;
  var name   = u.name || '';
  var org    = u.org || u.organization || '';
  var loc    = u.location || '';
  var role   = u.role || '';
  var title  = u.title || '';

  // Home topbar profile chip
  var tb = document.getElementById('homeTopbar');
  if (tb && (name || org)) {
    tb.innerHTML = '<div class="profile-chip"><div class="profile-chip-dot"></div>' +
      '<span>' + escHtml(name || org) + (role ? ' · ' + escHtml(role) : '') + '</span></div>';
  }

  // Settings profile tab values
  setSettVal('settName',    name    || '—');
  setSettVal('settTitle',   title   || role || '—');
  setSettVal('settOrg',     org     || '—');
  setSettVal('settLoc',     loc     || '—');
  setSettVal('settRole',    role    || '—');

  // Pre-fill inline inputs
  setInpVal('siNameInput',  name);
  setInpVal('siTitleInput', title || role);
  setInpVal('siOrgInput',   org);
  setInpVal('siLocInput',   loc);

  // Facility tab from facilityConfig or user profile
  var fc = facilityConfig || {};
  var facType  = fc.typeName || u.facility_type || '—';
  var chem     = fc.battery  || u.chemistry     || '—';
  var supp     = fc.suppression || u.suppression || '—';
  var det      = fc.detection   || u.detection   || '—';
  var region   = fc.region      || u.location    || '—';

  setSettVal('settFacType', facType);
  setSettVal('settChem',    chem);
  setSettVal('settSupp',    supp);
  setSettVal('settDet',     det);
  setSettVal('settRegion',  region);

  // Role chips
  renderSettRoleChips(role);

  // Starter prompts on home (only before first message)
  renderStarterPrompts(name);

  // Context panel IDs
  var iid = document.getElementById('ctxIID');
  var fac = document.getElementById('ctxFacility');
  if (iid && name) iid.textContent = name.split(' ')[0].toUpperCase();
  if (fac && org)  fac.textContent = org;
}

function setSettVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setInpVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val || '';
}

/* ── SETTINGS: Role chips ─────────────────────────────────────────── */
var ROLE_CHIPS = [
  'Facility Manager','Fire Chief / AHJ','Insurance Underwriter',
  'Safety Engineer','HCT Sales Engineer','Executive / Leadership'
];

function renderSettRoleChips(currentRole) {
  var wrap = document.getElementById('settRoleChips');
  if (!wrap) return;
  wrap.innerHTML = ROLE_CHIPS.map(function(r) {
    var active = (currentRole === r || currentRole === r.toLowerCase()) ? ' active' : '';
    return '<button class="sett-chip' + active + '" onclick="pickSettRole(this,\'' + escAttr(r) + '\')">' + escHtml(r) + '</button>';
  }).join('');
}

function pickSettRole(btn, role) {
  document.querySelectorAll('#settRoleChips .sett-chip').forEach(function(c) { c.classList.remove('active'); });
  btn.classList.add('active');
  USER_PROFILE.role = role;
  setSettVal('settTitle', role);
  setSettVal('settRole', role);
  if (userRole !== null) userRole = role;
  saveProfileField('role', role);
  var toast = document.getElementById('roleSaveToast');
  if (toast) { toast.classList.add('show'); setTimeout(function(){ toast.classList.remove('show'); }, 2000); }
}

/* ── SETTINGS: Inline edit ────────────────────────────────────────── */
var SETT_FIELD_MAP = {
  name:    { valId:'settName',    inpId:'siNameInput',    wrapId:'siName',    profKey:'name' },
  title:   { valId:'settTitle',   inpId:'siTitleInput',   wrapId:'siTitle',   profKey:'title' },
  org:     { valId:'settOrg',     inpId:'siOrgInput',     wrapId:'siOrg',     profKey:'org' },
  loc:     { valId:'settLoc',     inpId:'siLocInput',     wrapId:'siLoc',     profKey:'location' },
  factype: { valId:'settFacType', inpId:'siFacTypeInput', wrapId:'siFacType', profKey:'facility_type' },
  chem:    { valId:'settChem',    inpId:'siChemInput',    wrapId:'siChem',    profKey:'chemistry' },
  supp:    { valId:'settSupp',    inpId:'siSuppInput',    wrapId:'siSupp',    profKey:'suppression' },
  det:     { valId:'settDet',     inpId:'siDetInput',     wrapId:'siDet',     profKey:'detection' },
  region:  { valId:'settRegion',  inpId:'siRegionInput',  wrapId:'siRegion',  profKey:'region' }
};

function settEdit(field) {
  var f = SETT_FIELD_MAP[field]; if (!f) return;
  // close any other open edits
  Object.keys(SETT_FIELD_MAP).forEach(function(k) {
    var w = document.getElementById(SETT_FIELD_MAP[k].wrapId);
    if (w) w.classList.remove('open');
  });
  // hide value + edit button in this row
  var row = document.getElementById('sr' + capitalize(field));
  if (row) { var left = row.querySelector('.sett-row-left'); if (left) left.style.display = 'none'; var btn = row.querySelector('.sett-edit-btn'); if (btn) btn.style.display = 'none'; }
  var wrap = document.getElementById(f.wrapId);
  if (wrap) { wrap.classList.add('open'); var inp = document.getElementById(f.inpId); if (inp) { inp.focus(); if (inp.select) inp.select(); } }
}

function settCancel(field) {
  var f = SETT_FIELD_MAP[field]; if (!f) return;
  var wrap = document.getElementById(f.wrapId); if (wrap) wrap.classList.remove('open');
  var row = document.getElementById('sr' + capitalize(field));
  if (row) { var left = row.querySelector('.sett-row-left'); if (left) left.style.display = ''; var btn = row.querySelector('.sett-edit-btn'); if (btn) btn.style.display = ''; }
}

function settSave(field) {
  var f = SETT_FIELD_MAP[field]; if (!f) return;
  var inp = document.getElementById(f.inpId); if (!inp) return;
  var val = inp.value.trim();
  if (!val) { settCancel(field); return; }
  setSettVal(f.valId, val);
  USER_PROFILE[f.profKey] = val;
  // Update facilityConfig for suppression/chemistry/detection/region
  if (facilityConfig) {
    if (field === 'chem')    facilityConfig.battery    = val;
    if (field === 'supp')    facilityConfig.suppression = val;
    if (field === 'det')     facilityConfig.detection   = val;
    if (field === 'region')  facilityConfig.region      = val;
    if (field === 'factype') { facilityConfig.typeName  = val; facilityConfig.type = val.toLowerCase().replace(/[^a-z]/g,''); }
  }
  settCancel(field);
  saveProfileField(f.profKey, val);
  showSettToast(field);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escAttr(s) { return s.replace(/'/g, "\\'"); }

function saveProfileField(key, val) {
  try {
    fetch('/api/profile/update', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({field: key, value: val})
    }).catch(function(){});
  } catch(e) {}
}

var _settToastTimers = {};
function showSettToast(field) {
  // brief inline feedback — use the role toast or just a quick border flash
  var inp = document.getElementById(SETT_FIELD_MAP[field]?.inpId?.replace('Input',''));
  // just flash green on save btn briefly — handled by settCancel restore
}

/* ── CHAT: Suggestion chips ────────────────────────────────────────── */
var SUGGESTION_SETS = {
  home_init: [
    { label: 'Assess my suppression setup', icon: 'shield' },
    { label: 'Run a thermal runaway simulation', icon: 'fire' },
    { label: 'Show applicable NFPA standards', icon: 'check' },
    { label: 'What training does my team need?', icon: 'star' }
  ],
  post_chat: function(lastMsg) {
    // Contextual chips based on the assistant's last response topic
    var m = (lastMsg||'').toLowerCase();
    if (m.includes('nfpa') || m.includes('standard') || m.includes('code'))
      return [{label:'What does this mean for my facility?'},{label:'Show full compliance checklist'},{label:'Which codes apply in my region?'}];
    if (m.includes('thermal') || m.includes('battery') || m.includes('runaway'))
      return [{label:'What suppression is validated for this?'},{label:'Show F-500 EA comparison'},{label:'Run a simulation now'}];
    if (m.includes('f-500') || m.includes('suppression') || m.includes('agent'))
      return [{label:'How does F-500 EA compare to FM-200?'},{label:'Request a site survey'},{label:'View case studies'}];
    if (m.includes('training') || m.includes('certification') || m.includes('course'))
      return [{label:'View recommended courses'},{label:'Check certifications due'},{label:'Schedule drill'}];
    return [{label:'Tell me more'},{label:'How does this affect my facility?'},{label:'What should I do next?'}];
  }
};

var CHIP_ICONS = {
  shield: '<svg viewBox="0 0 16 16"><path d="M8 1l5 2.5v4c0 3.5-2.5 6-5 7C5.5 13.5 3 11 3 7.5v-4z" stroke-width="1.3"/></svg>',
  fire:   '<svg viewBox="0 0 16 16"><path d="M8 2c0 3-4 5-4 8a4 4 0 008 0c0-3-4-5-4-8z" stroke-width="1.3"/></svg>',
  check:  '<svg viewBox="0 0 16 16"><polyline points="2,8 6,12 14,4" stroke-width="1.8"/></svg>',
  star:   '<svg viewBox="0 0 16 16"><path d="M8 1l2 4 5 .5-3.5 3.5 1 5L8 12l-4.5 2 1-5L1 5.5 6 5z" stroke-width="1.3"/></svg>'
};

function renderSuggestions(containerEl, chips) {
  if (!containerEl) return;
  containerEl.innerHTML = chips.map(function(c) {
    var ico = c.icon ? (CHIP_ICONS[c.icon] || '') : '';
    return '<button class="suggestion-chip" onclick="sendChipMsg(this,\'' + escAttr(c.label) + '\')">' +
      ico + escHtml(c.label) + '</button>';
  }).join('');
}

function sendChipMsg(btn, msg) {
  // Determine which view we're in
  var inSim = (currentView === 'simulate');
  var inputEl = document.getElementById(inSim ? 'simChat' : 'homeChat');
  if (!inputEl) return;
  inputEl.value = msg;
  // Hide chips immediately
  var row = btn.closest('.suggestion-row');
  if (row) row.innerHTML = '';
  // Trigger send
  var scrollId = inSim ? '#simScroll' : '#homeScroll';
  sendChat(inputEl, scrollId);
}

/* ── STARTER PROMPTS on home (shown before first chat message) ─────── */
function renderStarterPrompts(userName) {
  // inject into homeCenter after the scenario/config flow area
  var center = document.getElementById('homeCenter');
  if (!center) return;
  var existing = document.getElementById('starterGrid');
  if (existing) return; // only once

  var greeting = userName ? ('Hello, ' + userName.split(' ')[0] + '.') : 'Life Safety OS.';
  var grid = document.createElement('div');
  grid.id = 'starterGrid';
  grid.style.cssText = 'max-width:680px;width:100%;margin-top:20px;display:none'; // hidden, revealed after role selected
  grid.className = 'starter-grid';
  var prompts = [
    {label:'Assess my suppression gap',    sub:'Compare installed systems vs. NFPA requirements'},
    {label:'Simulate thermal runaway',      sub:'Run a full or partial failure scenario'},
    {label:'Check compliance standards',    sub:'NFPA 855, 75, 13 · NEC 706 · UL 9540A'},
    {label:'Review training readiness',     sub:'Certifications, gaps, and drill schedule'}
  ];
  grid.innerHTML = prompts.map(function(p) {
    return '<div class="starter-card" onclick="sendStarterPrompt(\'' + escAttr(p.label) + '\')">' +
      '<div class="starter-card-label">' + escHtml(p.label) + '</div>' +
      '<div class="starter-card-sub">' + escHtml(p.sub) + '</div></div>';
  }).join('');
  center.appendChild(grid);
}

function sendStarterPrompt(msg) {
  var inputEl = document.getElementById('homeChat');
  if (!inputEl) return;
  var grid = document.getElementById('starterGrid');
  if (grid) grid.style.display = 'none';
  inputEl.value = msg;
  sendChat(inputEl, '#homeScroll');
}

/* ── PATCH sendChat to inject suggestion chips after response ───────── */
var _patchedSendChat = false;
(function patchSendChat() {
  if (_patchedSendChat) return;
  _patchedSendChat = true;
  var _orig = sendChat;
  sendChat = async function(input, scrollId) {
    // Clear suggestion chips before sending
    var sugId = scrollId === '#simScroll' ? 'simSuggestions' : 'homeSuggestions';
    var sugEl = document.getElementById(sugId);
    if (sugEl) sugEl.innerHTML = '';
    // Hide starter grid
    var sg = document.getElementById('starterGrid'); if (sg) sg.style.display = 'none';

    await _orig(input, scrollId);

    // After response, render contextual chips
    setTimeout(function() {
      var feed = document.querySelector(scrollId);
      var msgs = feed ? feed.querySelectorAll('.chat-msg-assistant .chat-bubble') : [];
      var lastText = msgs.length ? msgs[msgs.length-1].textContent : '';
      var chips = SUGGESTION_SETS.post_chat(lastText);
      if (sugEl) renderSuggestions(sugEl, chips);
    }, 300);
  };
})();

/* ── BOOT: load profile + init suggestions ──────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  loadUserProfile();
  // Show init chips on home after a short delay
  setTimeout(function() {
    var sugEl = document.getElementById('homeSuggestions');
    if (sugEl && !sugEl.innerHTML) renderSuggestions(sugEl, SUGGESTION_SETS.home_init);
  }, 2600); // after boot screen fades
});

/* ── SETTINGS TABS: wire up the new profile + facility tabs ────────── */
(function wireSettingsTabs() {
  document.addEventListener('DOMContentLoaded', function() {
    var tabs = document.querySelectorAll('.sett-tabs .sett-tab[data-sett-tab]');
    if (!tabs.length) return;
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var parent = tab.closest('.sett-container');
        parent.querySelectorAll('.sett-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.settTab;
        parent.querySelectorAll('.sett-panel').forEach(function(p) { p.classList.remove('active'); });
        var panel = document.getElementById('sett' + target.charAt(0).toUpperCase() + target.slice(1) + 'Panel');
        if (panel) panel.classList.add('active');
        // sync sidebar
        var sidebtns = document.querySelectorAll('#ctxSettings .ctx-nav-btn[data-sett-tab]');
        sidebtns.forEach(function(b) {
          b.classList.toggle('active', b.dataset.settTab === target);
        });
      });
    });
    // Sidebar → tab sync
    var sideBtns = document.querySelectorAll('#ctxSettings .ctx-nav-btn[data-sett-tab]');
    sideBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = btn.dataset.settTab;
        var matchTab = document.querySelector('.sett-tabs .sett-tab[data-sett-tab="' + target + '"]');
        if (matchTab) matchTab.click();
      });
    });
  });
})();

/* ── Show starter grid when facility is configured ───────────────────── */
(function watchFacilityConfig() {
  var _origPopulateFacilityGrid = typeof populateFacilityGrid === 'function' ? populateFacilityGrid : null;
  // hook: when facilityConfig is set and role is selected, show starter grid
  var _pollStart = setInterval(function() {
    if (facilityConfig && userRole) {
      clearInterval(_pollStart);
      var sg = document.getElementById('starterGrid');
      if (sg) sg.style.display = 'grid';
    }
  }, 800);
})();

/* ── LOGOUT ─────────────────────────────────────────────────────────────── */
function handleLogout() {
  if (!confirm('Sign out of Pantheon?')) return;
  // Clear session storage
  sessionStorage.clear();
  try { localStorage.removeItem('pantheon_session'); } catch(e) {}
  // Call server logout endpoint
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    .catch(function() {})
    .finally(function() {
      window.location.href = '/login';
    });
}

/* ── POPULATE ctxSettings ACCOUNT CARD ─────────────────────────────────── */
(function patchApplyProfileForCtx() {
  var _origApply = window.applyProfileToUI;
  if (typeof _origApply !== 'function') {
    // Hook later when defined
    document.addEventListener('DOMContentLoaded', function() {
      var _a = window.applyProfileToUI;
      if (_a) window.applyProfileToUI = wrapWithCtxUpdate(_a);
    });
    return;
  }
  window.applyProfileToUI = wrapWithCtxUpdate(_origApply);

  function wrapWithCtxUpdate(fn) {
    return function() {
      fn.apply(this, arguments);
      var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
      var nameEl = document.getElementById('ctxAccName');
      var orgEl  = document.getElementById('ctxAccOrg');
      var roleEl = document.getElementById('ctxAccRole');
      if (nameEl) nameEl.textContent = u.name || '—';
      if (orgEl)  orgEl.textContent  = u.org  || u.organization || '—';
      if (roleEl) roleEl.textContent = u.role  || u.title || '—';
    };
  }
})();

/* ── SETTINGS TABS — use new panel IDs (settPreferencesPanel etc.) ────── */
(function wireSettingsTabs2() {
  document.addEventListener('DOMContentLoaded', function() {
    // Map tab data-tab values to panel IDs
    var panelMap = {
      preferences: 'settPreferencesPanel',
      facilities:  'settFacilitiesPanel',
      team:        'settTeamPanel'
    };
    var tabs = document.querySelectorAll('.sett-tabs .sett-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.tab;
        Object.values(panelMap).forEach(function(pid) {
          var p = document.getElementById(pid);
          if (p) p.classList.remove('active');
        });
        var activePanel = document.getElementById(panelMap[target]);
        if (activePanel) activePanel.classList.add('active');
      });
    });
  });
})();

/* ══════════════════════════════════════════════════════════════════════════
   ONBOARDING BRIDGE
   When a user arrives from onboarding (or returns as a logged-in user
   with a saved profile), skip the "I am a..." role selector entirely
   and drop them straight into their configured dashboard state.

   Three entry paths handled:
   1. Fresh from onboarding.html  → sessionStorage flag 'pantheon_ob_data'
   2. Returning user              → USER_PROFILE from /api/auth/me
   3. Manual test                 → window.simulateOnboardingReturn()
   ══════════════════════════════════════════════════════════════════════════ */
(function onboardingBridge() {

  /* ── Map onboarding role labels → dashboard role IDs ── */
  var ROLE_MAP = {
    'facility manager':   'facility-mgr',
    'facility-manager':   'facility-mgr',
    'facility-mgr':       'facility-mgr',
    'first responder':    'first-responder',
    'first-responder':    'first-responder',
    'firefighter':        'first-responder',
    'fire chief':         'first-responder',
    'insurance':          'insurance',
    'insurance / risk':   'insurance',
    'ahj':                'ahj',
    'ahj inspector':      'ahj',
    'fire marshal':       'ahj',
    'engineer':           'engineer',
    'engineer / ehs':     'engineer',
    'ehs':                'engineer',
    'executive':          'executive',
    'c-suite':            'executive',
  };

  function normaliseRole(raw) {
    if (!raw) return 'facility-mgr';
    var key = raw.toLowerCase().trim();
    return ROLE_MAP[key] || (key.startsWith('other:') ? key : 'facility-mgr');
  }

  /* ── The core: apply profile and skip the selector screens ── */
  function applyOnboardingData(data) {
    if (!data) return;

    /* 1. Merge into USER_PROFILE */
    USER_PROFILE = Object.assign({}, USER_PROFILE, data);

    /* 2. Set global userRole so every other function sees it */
    var roleId = normaliseRole(data.role);
    userRole   = roleId;

    /* 3. Set facilityConfig from profile if not already set */
    if (!facilityConfig && (data.facility_type || data.battery || data.suppression)) {
      facilityConfig = {
        type:        data.facility_type || '',
        typeName:    data.facility_type || '',
        battery:     data.chemistry     || data.battery     || '',
        suppression: data.suppression   || '',
        detection:   data.detection     || '',
        region:      data.location      || data.region      || '',
        modules:     data.modules       || '',
      };
    }

    /* 4. Hide the role selector, show hero + facility selector */
    var rs = document.getElementById('roleSelector');
    var heroSection      = document.getElementById('heroSection');
    var facilitySelector = document.getElementById('facilitySelector');
    var heroSub          = document.getElementById('heroSub');
    var configFlow       = document.getElementById('configFlow');

    var subs = {
      'facility-mgr':    'Configure your facility. Assess suppression readiness. Get compliance documentation.',
      'first-responder': 'Assess suppression systems and hazmat exposure. Access tactical response data.',
      'insurance':       'Evaluate facility risk profile. Model loss scenarios. Generate underwriting documentation.',
      'ahj':             'Verify suppression compliance against NFPA. Generate deficiency reports.',
      'engineer':        'Specify detection and suppression systems. Validate chemistry compatibility.',
      'executive':       'Review risk exposure and financial impact. Evaluate countermeasure ROI.',
    };

    if (rs)              rs.classList.add('hidden');
    if (heroSection)     heroSection.classList.remove('hidden');
    if (facilitySelector) facilitySelector.classList.remove('hidden');
    if (heroSub)         heroSub.textContent = subs[roleId] || subs['facility-mgr'];

    /* 5. If config flow is available and facility not yet set, skip straight to chat */
    if (configFlow && facilityConfig && facilityConfig.type) {
      configFlow.classList.add('hidden');
    }

    /* 6. Update hero title with name if present */
    var heroTitle = document.getElementById('heroTitle');
    if (heroTitle && data.name) {
      var first = data.name.split(' ')[0];
      heroTitle.textContent = 'Pantheon';
    }

    /* 7. Apply full profile UI (settings panel, ctx panel, chips) */
    applyProfileToUI();

    /* 8. Pre-select the matching role card visually */
    var cards = document.querySelectorAll('.role-card');
    cards.forEach(function(card) {
      card.classList.toggle('selected', card.dataset.role === roleId);
    });

    /* 9. Pre-select facility card if we know the type */
    if (facilityConfig && facilityConfig.type) {
      var fCards = document.querySelectorAll('#fsGrid .fs-card, #fsGrid [data-type]');
      fCards.forEach(function(card) {
        var t = (card.dataset.type || '').toLowerCase();
        var ft = (facilityConfig.type || '').toLowerCase();
        card.classList.toggle('selected', t && ft && (t.includes(ft) || ft.includes(t)));
      });
    }

    console.log('[Pantheon] Onboarding bridge applied — role:', roleId, '| facility:', facilityConfig?.type || '—');
  }

  /* ── Entry path 1: sessionStorage data from onboarding.html ── */
  function checkSessionOnboarding() {
    try {
      var raw = sessionStorage.getItem('pantheon_ob_data');
      if (!raw) return false;
      var data = JSON.parse(raw);
      sessionStorage.removeItem('pantheon_ob_data'); // consume once
      applyOnboardingData(data);
      return true;
    } catch (e) { return false; }
  }

  /* ── Entry path 2: returning user — patch applyProfileToUI ── */
  var _origApply = window.applyProfileToUI;
  window.applyProfileToUI = function() {
    if (typeof _origApply === 'function') _origApply.apply(this, arguments);
    var u = USER_PROFILE;
    if (u && u.role && u.name) {
      /* User has a saved profile — skip role selector */
      applyOnboardingData(u);
    }
  };

  /* ── Entry path 3: manual test helper ── */
  window.simulateOnboardingReturn = function(overrides) {
    var demo = Object.assign({
      name:          'Alex Rivera',
      org:           'GridCore Energy',
      role:          'facility-mgr',
      location:      'California, US',
      facility_type: 'BESS',
      battery:       'NMC',
      suppression:   'FM-200',
      detection:     'Standard smoke',
    }, overrides || {});
    sessionStorage.setItem('pantheon_ob_data', JSON.stringify(demo));
    location.reload();
  };

  /* ── Boot: run on DOMContentLoaded ── */
  function boot() {
    /* Check sessionStorage first (fresh from onboarding) */
    if (checkSessionOnboarding()) return;
    /* Otherwise wait for loadUserProfile() to fire applyProfileToUI */
    /* The patched applyProfileToUI above handles the returning-user case */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

/* ══════════════════════════════════════════════════════════════════════════
   STANDARDS MODULE — only surfaces after onboarding sets a region/facility
   ══════════════════════════════════════════════════════════════════════════ */
(function standardsModule() {

  var STANDARDS_MAP = {
    // BESS / ESS
    'bess':        ['NFPA 855 (BESS)', 'NFPA 72 (Fire Alarm)', 'UL 9540A (ESS Testing)', 'IFC §1206'],
    'ess':         ['NFPA 855 (BESS)', 'NFPA 72 (Fire Alarm)', 'UL 9540A (ESS Testing)'],
    // Data center / IT
    'data center': ['NFPA 75 (IT Equipment)', 'NFPA 76 (Telecom)', 'NFPA 13 (Sprinkler)', 'NFPA 72 (Fire Alarm)'],
    'data':        ['NFPA 75 (IT Equipment)', 'NFPA 76 (Telecom)', 'NFPA 13 (Sprinkler)'],
    // Industrial / warehouse
    'warehouse':   ['NFPA 13 (Sprinkler)', 'NFPA 72 (Fire Alarm)', 'NFPA 30 (Flammable Liquids)'],
    'industrial':  ['NFPA 13 (Sprinkler)', 'NFPA 72 (Fire Alarm)', 'NFPA 652 (Combustible Dust)'],
    // EV / fleet
    'ev':          ['NFPA 855 (BESS)', 'NFPA 13 (Sprinkler)', 'UL 9540A (ESS Testing)', 'IFC §1206.10'],
    'fleet':       ['NFPA 855 (BESS)', 'NFPA 13 (Sprinkler)', 'UL 9540A (ESS Testing)'],
    // Default
    'default':     ['NFPA 72 (Fire Alarm)', 'NFPA 13 (Sprinkler)'],
  };

  // State overrides
  var STATE_OVERRIDES = {
    'california': ['CA Fire Code §3.09 (Enhanced Li-ion Provisions)'],
    'new york':   ['NYC FC §608 (Stationary Storage)'],
    'texas':      ['TFC Chapter 56 (ESS Requirements)'],
    'florida':    ['FBC Fire §903 (Sprinkler Requirements)'],
  };

  function getStandardsForProfile(facilityType, region) {
    var ft = (facilityType || '').toLowerCase();
    var standards = [];

    // Match facility type
    var matched = false;
    Object.keys(STANDARDS_MAP).forEach(function(key) {
      if (!matched && key !== 'default' && ft.includes(key)) {
        standards = STANDARDS_MAP[key].slice();
        matched = true;
      }
    });
    if (!matched) standards = STANDARDS_MAP['default'].slice();

    // Add state overrides
    var reg = (region || '').toLowerCase();
    Object.keys(STATE_OVERRIDES).forEach(function(state) {
      if (reg.includes(state)) {
        STATE_OVERRIDES[state].forEach(function(s) {
          if (standards.indexOf(s) === -1) standards.push(s);
        });
      }
    });

    return standards;
  }

  // Surface standards in the obStandardsBanner (home view, post-onboarding)
  window.surfaceOnboardingStandards = function(facilityType, region) {
    var standards = getStandardsForProfile(facilityType, region);
    var banner = document.getElementById('obStandardsBanner');
    var list   = document.getElementById('obStandardsList');
    if (!banner || !list) return;

    list.innerHTML = standards.map(function(s) {
      return '<div class="ob-std-item"><span class="ob-std-dot">●</span>' + s + '</div>';
    }).join('');

    banner.classList.remove('hidden');
  };

  // Surface standards in Settings > Facilities panel
  window.surfaceSettingsStandards = function(facilityType, region) {
    var standards = getStandardsForProfile(facilityType, region);
    var section = document.getElementById('settStandardsSection');
    var list    = document.getElementById('settStandardsList');
    if (!section || !list) return;

    if (standards.length === 0) return;

    list.innerHTML = standards.map(function(s) {
      return '<div class="sett-row"><span class="sett-label">' + s + '</span><span class="sett-val">Active</span></div>';
    }).join('');

    section.classList.remove('hidden');
  };

  // Hook: called when profile is applied (onboarding or return)
  var _origApplied = window.applyProfileToUI;
  window.applyProfileToUI = function() {
    if (typeof _origApplied === 'function') _origApplied.apply(this, arguments);
    var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    var fc = (typeof facilityConfig !== 'undefined') ? facilityConfig : null;
    var facType = (fc && fc.type) || u.facility_type || '';
    var region  = (fc && fc.region) || u.location || u.region || '';

    if (facType || region) {
      // Only surface standards if we have actual facility context from onboarding
      if (u.onboarding_complete === 'true' || sessionStorage.getItem('pantheon_onboarding_done')) {
        window.surfaceOnboardingStandards(facType, region);
        window.surfaceSettingsStandards(facType, region);
      }
    }
  };

})();


/* ══════════════════════════════════════════════════════════════════════════
   SHEETS LOGGER — logs all key interactions to HCT-Pantheon Google Sheet
   Sheet ID: 1gpVD1AyRe6UR4o_tU9nFMArczV7YX26ZLQrSWtwU8n0
   Tabs: Users, Activity Log, Simulations, AI Conversations, Product Interest
   ══════════════════════════════════════════════════════════════════════════ */
(function sheetsLogger() {

  var SHEETS_ENDPOINT  = '/api/log-event';  // server fallback
  // Apps Script URL injected by server into window.PANTHEON_LOG_URL at render time
  // Falls back to server endpoint if not set
  var APPS_SCRIPT_URL  = (typeof window.PANTHEON_LOG_URL !== 'undefined' && window.PANTHEON_LOG_URL) ? window.PANTHEON_LOG_URL : 'https://script.google.com/macros/s/AKfycbxybrPF21pyd0h0T3T7M-mWUUPxVIls94Za1bJ1SuiLo5Xn7OT1R2uZx0XRbPSFsvE/exec';

  function logEvent(tab, payload) {
    // Build flat row values in the correct column order per tab
    var values = buildRow(tab, payload);
    var body   = JSON.stringify({ action: 'append', tab: tab, values: values });
    // Fire to Apps Script directly (no auth, fastest path)
    if (APPS_SCRIPT_URL) {
      try {
        fetch(APPS_SCRIPT_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body
        }).catch(function() {
          // Apps Script failed — fall back to server
          serverLog(tab, payload);
        });
        return;
      } catch(e) {}
    }
    // Fall back to server endpoint
    serverLog(tab, payload);
  }

  function serverLog(tab, payload) {
    try {
      fetch(SHEETS_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tab: tab, data: payload, ts: new Date().toISOString() })
      }).catch(function() {});
    } catch(e) {}
  }

  // Convert payload object to ordered array matching sheet columns
  function buildRow(tab, p) {
    var ts = p.timestamp || new Date().toISOString();
    if (tab === 'Activity Log') {
      return [ts, p.email||p.user||'', p.name||'', p.org||'', p.action||'',
              p.detail1||p.detail||'', p.detail2||'', p.detail3||'', p.time_spent||'', p.device||navigator.platform, p.browser||navigator.userAgent.split(' ').pop()];
    }
    if (tab === 'Simulations') {
      return [ts, p.email||p.user||'', p.name||'', p.org||'', p.facility_type||p.facility||'',
              p.chemistry||p.battery||'', p.modules||'', p.suppression||'', p.mode||p.simulation_mode||'',
              p.acts||0, p.pdf_exported||'No', p.ai_questions||0, p.top_question||'', p.recos_viewed||'No', p.impact_shown||'No'];
    }
    if (tab === 'AI Conversations') {
      return [ts, p.email||'', p.org||'', p.question||'', p.view||'home',
              p.facility_type||'', p.chemistry||'', p.modules||'', p.response_len||0];
    }
    if (tab === 'Product Interest') {
      return [ts, p.email||'', p.org||'', p.product||'', p.source||'',
              p.time_on||0, p.clicked_learn_more||'No'];
    }
    // Generic: just values in order
    return Object.values(p);
  }

  // Activity log helper
  function logActivity(action, detail) {
    var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    logEvent('Activity Log', {
      timestamp: new Date().toISOString(),
      user:      u.email || u.name || 'unknown',
      action:    action,
      detail:    detail || '',
    });
  }

  // ── Patch handleLogout to log before redirecting ──
  var _origLogout = window.handleLogout;
  window.handleLogout = function() {
    logActivity('logout', 'User signed out');
    if (typeof _origLogout === 'function') _origLogout.apply(this, arguments);
    else {
      sessionStorage.clear();
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .catch(function() {}).finally(function() { window.location.href = '/login'; });
    }
  };

  // ── Log simulation start ──
  window.logSimulationStart = function(scenarioName, facilityType, battery, suppression) {
    var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    logEvent('Simulations', {
      timestamp:   new Date().toISOString(),
      user:        u.email || u.name || 'unknown',
      org:         u.org || '',
      scenario:    scenarioName || '',
      facility:    facilityType || '',
      battery:     battery || '',
      suppression: suppression || '',
      status:      'started',
    });
    logActivity('simulation_start', scenarioName);
  };

  // ── Log simulation complete ──
  window.logSimulationComplete = function(scenarioName, result) {
    var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    logEvent('Simulations', {
      timestamp:   new Date().toISOString(),
      user:        u.email || u.name || 'unknown',
      org:         u.org || '',
      scenario:    scenarioName || '',
      result:      result || 'completed',
      status:      'complete',
    });
    logActivity('simulation_complete', scenarioName);
  };

  // ── Log AI conversation — columns: Timestamp|Email|Organization|Question|View|Facility Type|Chemistry|Modules|Response Length ──
  window.logAIConversation = function(view, userMessage, aiResponse) {
    var u  = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    var fc = (typeof facilityConfig !== 'undefined') ? facilityConfig : {};
    logEvent('AI Conversations', {
      timestamp:     new Date().toISOString(),
      email:         u.email || '',
      org:           u.org   || '',
      question:      (userMessage  || '').substring(0, 500),
      view:          view || 'home',
      facility_type: fc.type     || u.facility_type || '',
      chemistry:     fc.battery  || '',
      modules:       fc.modules  || '',
      response_len:  (aiResponse || '').length,
    });
  };

  // ── Log product interest (catalog card click / inspection request) ──
  window.logProductInterest = function(productName, action) {
    var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    logEvent('Product Interest', {
      timestamp: new Date().toISOString(),
      user:      u.email || u.name || 'unknown',
      org:       u.org || '',
      product:   productName || '',
      action:    action || 'view',
    });
  };

  // ── Log page activity on boot (login event) ──
  document.addEventListener('DOMContentLoaded', function() {
    // Give USER_PROFILE time to load from /api/auth/me
    setTimeout(function() {
      var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
      if (u.email || u.name) {
        logActivity('session_start', 'Dashboard loaded');
        // Update last login in Users sheet
        logEvent('Users', {
          action:     'last_login_update',
          email:      u.email || '',
          name:       u.name || '',
          last_login: new Date().toISOString(),
        });
      }
    }, 2500);
  });

  // ── Expose for manual use ──
  window.sheetsLog = logEvent;
  window.logActivity = logActivity;

})();


/* ══════════════════════════════════════════════════════════════════════════
   INVITE TEAM STUB
   ══════════════════════════════════════════════════════════════════════════ */
window.handleInviteTeam = function() {
  showConfirm('Team invites coming soon. We\'ll notify you when this feature is live.');
};
