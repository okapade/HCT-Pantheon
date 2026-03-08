/* ═══════════════════════════════════════════════════════════════════════════
   PANTHEON FEATURE PATCH — v1.0
   Loaded after dashboard.js. Extends (does not replace) core functionality.

   Features:
     1. Standards rail — auto-loaded from USER_PROFILE.location on boot
     2. Training — facility/chemistry/suppression/detection-aware prescriptions
     3. Live monitor — real polling from /api/monitor/alerts with smart fallback
     4. First-login walkthrough — sequenced notification overlay post-onboarding
   ═══════════════════════════════════════════════════════════════════════════ */

(function(window) {
  'use strict';

  /* ── Utilities ─────────────────────────────────────────────────────────── */
  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  }); }

  function el(id) { return document.getElementById(id); }

  /* ═══════════════════════════════════════════════════════════════════════
     FEATURE 1 — STANDARDS RAIL: Auto-load from USER_PROFILE on boot
     Hooks into the existing applyProfileToUI() after it runs, reads location,
     parses jurisdiction, calls /api/compliance/check, populates all rail DOM.
     ═══════════════════════════════════════════════════════════════════════ */

  var _originalApplyProfile = null;

  function hookProfileApply() {
    if (typeof window.applyProfileToUI !== 'function') return;
    if (_originalApplyProfile) return; // already hooked
    _originalApplyProfile = window.applyProfileToUI;

    window.applyProfileToUI = function() {
      _originalApplyProfile.apply(this, arguments);
      // After base profile applied, load standards from location
      var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
      var loc = u.location || '';
      if (loc) {
        triggerStandardsFromLocation(loc);
      }
      // Check first-login walkthrough
      checkFirstLoginWalkthrough(u);
    };
  }

  function triggerStandardsFromLocation(locStr) {
    var j = (typeof detectJurisdiction === 'function')
      ? detectJurisdiction(locStr)
      : parseJurisdictionFallback(locStr);

    if (typeof fetchStandards === 'function') {
      fetchStandards(j.country, j.state).then(function(data) {
        if (!data) return;
        if (typeof renderStandardsInContext === 'function') renderStandardsInContext(data);
        if (typeof renderComplianceGaps === 'function')    renderComplianceGaps(data);
        if (typeof renderStandardsInConfig === 'function') renderStandardsInConfig(data);
        updateStandardsRailMeta(data);
      });
    }
  }

  /* Fallback jurisdiction parser if detectJurisdiction isn't available yet */
  function parseJurisdictionFallback(locStr) {
    var s = locStr.toUpperCase();
    var US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
      'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA',
      'WA','WV','WI','WY','DC'];
    var state = null;
    US_STATES.forEach(function(code) {
      if (new RegExp('\\b' + code + '\\b').test(s)) state = code;
    });
    if (s.includes('UK') || s.includes('UNITED KINGDOM') || s.includes('ENGLAND') || s.includes('BRITAIN')) return { country: 'UK', state: null };
    if (s.includes('AUSTRALIA') || s.includes(' AU') || s.includes('NSW') || s.includes('VIC')) return { country: 'AU', state: null };
    if (s.includes('GERMANY') || s.includes('DEUTSCHLAND') || s.includes(' DE')) return { country: 'DE', state: null };
    if (s.includes('SINGAPORE') || s.includes(' SG')) return { country: 'SG', state: null };
    return { country: 'US', state: state };
  }

  /* Update rail count badge and jurisdiction label */
  function updateStandardsRailMeta(data) {
    var cnt = el('ctxStdCnt');
    var gapCnt = el('ctxGapCnt');
    if (cnt) cnt.textContent = data.total_count || 0;
    if (gapCnt && data.compliance_gaps) gapCnt.textContent = data.compliance_gaps.length;

    // Rail badge on sidebar nav
    var railBadge = document.querySelector('[data-view="simulate"] .rail-badge');
    if (railBadge && data.compliance_gaps && data.compliance_gaps.length > 0) {
      railBadge.textContent = data.compliance_gaps.length;
      railBadge.style.display = '';
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════
     FEATURE 2 — FACILITY-AWARE TRAINING PRESCRIPTIONS
     Overrides getTrainingGaps() with a version that reads USER_PROFILE +
     facilityConfig to surface relevant HCT and Embedded Logix courses.
     ═══════════════════════════════════════════════════════════════════════ */

  /* HCT product → training course catalog */
  var HCT_COURSES = {
    // Core chemistry + suppression
    'f500ea_intro':      { id:'HCT-F5-100', name:'F-500 EA: Li-Ion Suppression Science', provider:'HCT', hours:4, mode:'Virtual + On-site', tags:['NFPA 18A','NFPA 750'], priority:'CRITICAL' },
    'f500ea_deploy':     { id:'HCT-F5-200', name:'F-500 EA Hands-On Deployment Lab',      provider:'HCT', hours:8, mode:'On-site only',      tags:['NFPA 18A','NFPA 750'], priority:'CRITICAL' },
    'fm200_gap':         { id:'HCT-FM-100', name:'FM-200 / CO₂ Incompatibility Briefing',  provider:'HCT', hours:2, mode:'Virtual',           tags:['NFPA 2001','NFPA 855'], priority:'HIGH' },
    'thermal_runaway':   { id:'HCT-TR-100', name:'Li-Ion Thermal Runaway Response',        provider:'HCT', hours:4, mode:'Virtual + On-site', tags:['NFPA 855','UL 9540A'],  priority:'CRITICAL' },
    'diamond_doser':     { id:'HCT-DD-100', name:'Diamond Doser Proportioning System',     provider:'HCT', hours:3, mode:'On-site only',      tags:['NFPA 750'],            priority:'HIGH' },
    'veep':              { id:'HCT-VP-100', name:'VEEP System: Fire Suppression Protocol', provider:'HCT', hours:4, mode:'On-site only',      tags:['NFPA 750','NFPA 13'],  priority:'HIGH' },
    'hydrolock':         { id:'HCT-HL-100', name:'HydroLock Installation & Commissioning', provider:'HCT', hours:6, mode:'On-site only',      tags:['NFPA 13'],             priority:'HIGH' },
    // Detection + EPO
    'offgas_detect':     { id:'HCT-OG-100', name:'Off-Gas Detection: NFPA 855 Compliance', provider:'HCT', hours:3, mode:'Virtual',           tags:['NFPA 855','NFPA 72'],  priority:'CRITICAL' },
    'epo':               { id:'HCT-EP-150', name:'Emergency Power-Off (EPO) Protocols',    provider:'HCT', hours:4, mode:'On-site + Virtual', tags:['NEC 645','NFPA 70E'],  priority:'HIGH' },
    'bms_alarm':         { id:'HCT-BM-200', name:'BMS Alarm Threshold Management',          provider:'HCT', hours:3, mode:'Virtual',           tags:['NFPA 855'],            priority:'HIGH' },
    'hf_hazmat':         { id:'HCT-HZ-300', name:'HF Gas Response & Hazmat PPE',            provider:'HCT', hours:6, mode:'On-site only',      tags:['OSHA 1910','NFPA 472'],priority:'HIGH' },
    'jsa':               { id:'HCT-JS-100', name:'Job Safety Analysis — Battery Systems',   provider:'HCT', hours:2, mode:'Virtual',           tags:['OSHA 1910'],           priority:'STANDARD' },
    'pre_incident':      { id:'HCT-PI-100', name:'Pre-Incident Planning (NFPA 1620)',        provider:'HCT', hours:3, mode:'Virtual',           tags:['NFPA 1620'],           priority:'STANDARD' },
    'pinnacle':          { id:'HCT-PN-100', name:'Pinnacle F3 Nozzle System Training',      provider:'HCT', hours:4, mode:'On-site only',      tags:['NFPA 750','NFPA 18A'], priority:'HIGH' },
    // Embedded Logix
    'smartlx_op':        { id:'EL-SLX-100', name:'Smart-LX Platform Operator Certification', provider:'Embedded Logix', hours:16, mode:'Virtual', tags:['NFPA 72','NFPA 855'], priority:'HIGH' },
    'smartlx_thermal':   { id:'EL-SLX-200', name:'Smart-LX Thermal Imaging Interpretation',  provider:'Embedded Logix', hours:8,  mode:'Virtual', tags:['NFPA 72'],            priority:'HIGH' },
    'smartlx_gateway':   { id:'EL-GW-100',  name:'Smart-LX Gateway Integration & Config',    provider:'Embedded Logix', hours:8,  mode:'Virtual', tags:['NFPA 72','NFPA 855'], priority:'HIGH' },
    'camera_mon':        { id:'EL-CAM-100', name:'Embedded Logix Camera Monitoring Suite',    provider:'Embedded Logix', hours:4,  mode:'Virtual', tags:['NFPA 72'],            priority:'STANDARD' },
    'sensor_int':        { id:'EL-SNS-100', name:'Multi-Sensor Integration & Alert Triage',   provider:'Embedded Logix', hours:6,  mode:'Virtual', tags:['NFPA 72','NFPA 855'], priority:'STANDARD' },
  };

  /* Derive which courses apply given facility profile */
  function deriveFacilityGaps() {
    var u    = (typeof USER_PROFILE    !== 'undefined') ? USER_PROFILE    : {};
    var fc   = (typeof facilityConfig  !== 'undefined') ? facilityConfig  : {};
    var D_   = (typeof D               !== 'undefined') ? D               : {};

    var chem  = (fc.battery     || u.chemistry   || '').toLowerCase();
    var supp  = (fc.suppression || u.suppression || '').toLowerCase();
    var det   = (fc.detection   || u.detection   || '').toLowerCase();
    var ftype = (fc.type        || u.facility_type || '').toLowerCase().replace(/[^a-z]/g,'');

    var gaps = [];

    // ── Suppression gaps ─────────────────────────────────────────────────
    var isLiIon = chem.includes('nmc') || chem.includes('nca') || chem.includes('lco') ||
                  chem.includes('lithium') || chem.includes('li-ion') || chem === '';
    var hasFM200 = supp.includes('fm') || supp.includes('200') || supp.includes('clean') || supp.includes('halon');
    var hasCO2   = supp.includes('co2') || supp.includes('co₂') || supp.includes('carbon');
    var hasF500  = supp.includes('f-500') || supp.includes('f500') || supp.includes('encapsulator');
    var noSupp   = !supp || supp === 'none' || supp === '—';

    if (isLiIon && hasFM200) {
      gaps.push({ course: HCT_COURSES.fm200_gap,       source: 'Suppression Gap', desc: 'FM-200 is chemically incompatible with Li-ion thermal runaway — does not interrupt exothermic reaction.' });
      gaps.push({ course: HCT_COURSES.f500ea_intro,    source: 'Suppression Gap', desc: 'F-500 EA is the validated encapsulator agent for Li-ion fires under NFPA 18A Section 7.7.' });
      gaps.push({ course: HCT_COURSES.f500ea_deploy,   source: 'Suppression Gap', desc: 'Hands-on deployment training required before system commissioning.' });
    } else if (isLiIon && hasCO2) {
      gaps.push({ course: HCT_COURSES.fm200_gap,       source: 'Suppression Gap', desc: 'CO₂ asphyxiation approach does not address thermal runaway re-ignition risk.' });
      gaps.push({ course: HCT_COURSES.f500ea_intro,    source: 'Suppression Gap', desc: 'F-500 EA simultaneously addresses flammability, explosivity, and toxicity vectors.' });
    } else if (isLiIon && noSupp) {
      gaps.push({ course: HCT_COURSES.f500ea_intro,    source: 'Suppression Gap', desc: 'No suppression system configured. F-500 EA is the recommended starting point for Li-ion protection.' });
      gaps.push({ course: HCT_COURSES.veep,            source: 'Suppression Gap', desc: 'VEEP System provides autonomous suppression for unattended battery rooms.' });
    } else if (hasF500) {
      gaps.push({ course: HCT_COURSES.f500ea_deploy,   source: 'Best Practice',   desc: 'Annual re-certification recommended for all F-500 EA operators.' });
      gaps.push({ course: HCT_COURSES.diamond_doser,   source: 'Best Practice',   desc: 'Diamond Doser proportioning system training for foam injection accuracy.' });
    }

    // Always include thermal runaway for Li-ion sites
    if (isLiIon) {
      gaps.push({ course: HCT_COURSES.thermal_runaway, source: 'Chemistry Risk',  desc: 'NMC/NCA cells require crew training on cascade propagation patterns and intervention timing.' });
    }

    // ── Detection gaps ────────────────────────────────────────────────────
    var hasOffgas  = det.includes('off') || det.includes('gas') || det.includes('vesda') || det.includes('aspir');
    var hasSmartLX = det.includes('smart') || det.includes('slx') || det.includes('embedded') || det.includes('thermal') || det.includes('camera');
    var noDet      = !det || det === 'none' || det === '—' || det === 'standard smoke';

    if (!hasOffgas && isLiIon) {
      gaps.push({ course: HCT_COURSES.offgas_detect,   source: 'Detection Gap',   desc: 'Off-gas detection is mandatory per NFPA 855 for Li-ion installations. Currently not installed.' });
    }
    if (!hasSmartLX) {
      gaps.push({ course: HCT_COURSES.smartlx_gateway, source: 'Detection Gap',   desc: 'Smart-LX Gateway provides real-time thermal + gas monitoring with Embedded Logix analytics.' });
      gaps.push({ course: HCT_COURSES.camera_mon,      source: 'Detection Gap',   desc: 'Thermal camera monitoring adds pre-event anomaly detection before sensor thresholds are crossed.' });
    } else {
      gaps.push({ course: HCT_COURSES.smartlx_op,      source: 'Best Practice',   desc: 'Operator certification ensures full utilization of Smart-LX alert triage and reporting.' });
      gaps.push({ course: HCT_COURSES.smartlx_thermal, source: 'Best Practice',   desc: 'Thermal imaging interpretation training reduces false positive alert fatigue.' });
    }

    // ── Facility-type specific ────────────────────────────────────────────
    if (ftype.includes('data') || ftype.includes('datacenter') || ftype.includes('dc')) {
      gaps.push({ course: HCT_COURSES.epo,            source: 'Facility Type',   desc: 'Data center EPO protocols require specific training including generator isolation sequences.' });
    }
    if (ftype.includes('bess') || ftype.includes('energy') || ftype.includes('storage')) {
      gaps.push({ course: HCT_COURSES.bms_alarm,      source: 'Facility Type',   desc: 'BMS alarm management critical for BESS — raised thresholds are a leading cause of undetected thermal events.' });
    }
    if (ftype.includes('marine') || ftype.includes('aviation') || ftype.includes('hangar')) {
      gaps.push({ course: HCT_COURSES.pinnacle,       source: 'Facility Type',   desc: 'Pinnacle F3 nozzle optimised for confined-space and underfloor battery suppression.' });
    }

    // ── Always include HF hazmat + compliance baseline ────────────────────
    if (isLiIon) {
      gaps.push({ course: HCT_COURSES.hf_hazmat,      source: 'Compliance',      desc: 'Li-ion thermal events produce HF gas. OSHA 1910 mandates crew exposure limit training and PPE.' });
    }
    gaps.push({   course: HCT_COURSES.jsa,            source: 'Compliance',      desc: 'Job Safety Analysis for battery maintenance tasks per OSHA 1910 general industry standards.' });
    gaps.push({   course: HCT_COURSES.pre_incident,   source: 'Compliance',      desc: 'NFPA 1620 pre-incident planning ensures fire department has current facility information.' });

    // Deduplicate by course id
    var seen = {};
    return gaps.filter(function(g) {
      if (seen[g.course.id]) return false;
      seen[g.course.id] = true;
      return true;
    });
  }

  /* Patch getTrainingGaps to use facility-aware version */
  function patchTrainingGaps() {
    window.getTrainingGaps = function() {
      var facilityGaps = deriveFacilityGaps();
      // Transform into the shape renderTrainingPrescriptions expects
      return facilityGaps.map(function(g) {
        return {
          priority: g.course.priority,
          source:   g.source,
          title:    g.course.name,
          desc:     g.desc,
          standard: g.course.tags[0] || '',
          course:   g.course.id
        };
      });
    };
  }

  /* Patch renderTrainingCourses to pull from HCT_COURSES catalog */
  function patchTrainingCourses() {
    window.renderTrainingCourses = function() {
      var el_ = document.getElementById('trainCourseGrid');
      if (!el_) return;

      var facilityGaps  = deriveFacilityGaps();
      var priorityCodes = ['CRITICAL','HIGH','STANDARD'];
      var sorted = facilityGaps.slice().sort(function(a, b) {
        return priorityCodes.indexOf(a.course.priority) - priorityCodes.indexOf(b.course.priority);
      });

      el_.innerHTML = sorted.map(function(g) {
        var c = g.course;
        var pClass = c.priority === 'CRITICAL' ? 'var(--red)' : c.priority === 'HIGH' ? 'var(--yellow)' : 'var(--t3)';
        return '<div class="train-course" style="border-left:3px solid ' + pClass + '">' +
          '<div class="train-course-head">' +
            '<span class="train-course-name">' + esc(c.name) + '</span>' +
            '<span class="train-course-provider" style="color:var(--t3);font-size:11px;margin-left:8px">' + esc(c.provider) + '</span>' +
          '</div>' +
          '<div class="train-course-meta" style="margin-top:4px;font-size:11px;color:var(--t3)">' +
            '<span>' + c.hours + 'h</span>' +
            '<span style="margin:0 6px">·</span>' +
            '<span>' + esc(c.mode) + '</span>' +
            '<span style="margin:0 6px">·</span>' +
            '<span style="color:' + pClass + ';font-weight:600">' + c.priority + '</span>' +
          '</div>' +
          '<div class="train-course-tags" style="margin-top:6px">' +
            c.tags.map(function(t) { return '<span class="cat-card-tag">' + esc(t) + '</span>'; }).join('') +
            '<span class="cat-card-tag" style="opacity:0.6">' + esc(c.id) + '</span>' +
          '</div>' +
          '<div class="train-course-desc" style="margin-top:6px;font-size:12px;color:var(--t2);line-height:1.4">' + esc(g.desc) + '</div>' +
          '<div style="margin-top:8px">' +
            '<button class="insp-btn insp-btn-sm" onclick="switchView(\'catalog\')" style="margin-right:6px">View Catalog</button>' +
            (c.provider === 'Embedded Logix' ?
              '<button class="insp-btn insp-btn-sm" onclick="showToast(\'Contact Embedded Logix: info@embeddedlogix.com\',\'info\',5000)">Request Training</button>' :
              '<button class="insp-btn insp-btn-sm" onclick="showToast(\'Contact HCT: hct-world.com/training\',\'info\',5000)">Request Training</button>') +
          '</div>' +
        '</div>';
      }).join('');
    };
  }


  /* ═══════════════════════════════════════════════════════════════════════
     FEATURE 3 — LIVE MONITOR: Real polling from /api/monitor/alerts
     Replaces the fake setInterval temp jitter with real API polling.
     Falls back gracefully when no alerts endpoint is available (demo mode).
     ═══════════════════════════════════════════════════════════════════════ */

  var MONITOR_POLL_MS   = 30000;  // poll every 30s
  var MONITOR_POLL_ID   = null;
  var LAST_ALERT_TS     = null;
  var MONITOR_ENDPOINT  = '/api/monitor/alerts';
  var MONITOR_AVAILABLE = null; // null=unknown, true/false after first probe

  /* Replace the fake updateMonitorPulse with real polling logic */
  function patchMonitor() {
    // Stop the old interval if it was set during initMonitor()
    // We re-set it after 100ms to let the page stabilise
    setTimeout(function() {
      window.updateMonitorPulse = updateMonitorPulseReal;
      startMonitorPolling();
    }, 2000);
  }

  function startMonitorPolling() {
    if (MONITOR_POLL_ID) clearInterval(MONITOR_POLL_ID);
    // Immediate first probe
    pollMonitorAlerts();
    MONITOR_POLL_ID = setInterval(pollMonitorAlerts, MONITOR_POLL_MS);
  }

  async function pollMonitorAlerts() {
    try {
      var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
      var facilityId = u.email || u.name || 'default';
      var url = MONITOR_ENDPOINT + '?facility_id=' + encodeURIComponent(facilityId);
      var r = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

      if (r.status === 404 || r.status === 405) {
        MONITOR_AVAILABLE = false;
        updateMonitorPulseJitter(); // graceful fallback
        return;
      }
      if (!r.ok) { updateMonitorPulseJitter(); return; }

      var data = await r.json();
      MONITOR_AVAILABLE = true;
      processMonitorAlerts(data);

    } catch (e) {
      MONITOR_AVAILABLE = false;
      updateMonitorPulseJitter();
    }
  }

  function processMonitorAlerts(data) {
    var alerts = data.alerts || data || [];
    if (!Array.isArray(alerts)) return;

    var newAlerts = alerts.filter(function(a) {
      if (!LAST_ALERT_TS) return true;
      return new Date(a.timestamp || 0) > new Date(LAST_ALERT_TS);
    });

    if (newAlerts.length > 0) {
      LAST_ALERT_TS = new Date().toISOString();
      newAlerts.forEach(function(alert) { handleLiveAlert(alert); });
    }

    // Update alert banner count
    var cnt = el('monAlertCount');
    var banner = el('monAlertBanner');
    var critical = alerts.filter(function(a) { return a.severity === 'critical' || a.severity === 'CRITICAL'; });

    if (cnt) cnt.textContent = alerts.length;
    if (banner) {
      if (alerts.length > 0) {
        banner.style.display = '';
        banner.classList.toggle('mon-alert-critical', critical.length > 0);
      } else {
        banner.style.display = 'none';
      }
    }

    // Update feed
    updateMonitorFeedFromAlerts(alerts.slice(0, 8));
  }

  function handleLiveAlert(alert) {
    var sev  = (alert.severity || 'info').toLowerCase();
    var zone = alert.zone || alert.sensor_id || 'Unknown zone';
    var msg  = alert.message || alert.description || 'Alert triggered';
    var type = sev === 'critical' ? 'alert' : sev === 'high' ? 'warning' : sev === 'medium' ? 'watch' : 'info';

    if (typeof showToast === 'function') {
      showToast(zone + ': ' + msg, type, sev === 'critical' ? 8000 : 5000);
    }

    // Inject into feed
    injectMonitorFeedEvent(type, zone, msg);

    // Critical: auto-surface emergency view
    if (sev === 'critical') {
      setTimeout(function() {
        if (typeof showToast === 'function') {
          showToast('CRITICAL alert — review Emergency view immediately', 'alert', 6000);
        }
        var emergBadge = document.querySelector('[data-view="emergency"] .rail-badge');
        if (emergBadge) { emergBadge.textContent = '!'; emergBadge.style.display = ''; }
      }, 1500);
    }
  }

  function injectMonitorFeedEvent(type, zone, msg) {
    var feed = el('monFeed');
    if (!feed) return;
    var row = document.createElement('div');
    row.className = 'mon-event mon-event-' + type;
    row.innerHTML =
      '<span class="mon-event-time">Now</span>' +
      '<span class="mon-event-dot mon-dot-' + type + '"></span>' +
      '<span class="mon-event-msg">' + esc(zone) + ' — ' + esc(msg) + '</span>';
    feed.insertBefore(row, feed.firstChild);
    // Trim to 12 events
    while (feed.children.length > 12) feed.removeChild(feed.lastChild);
    // Flash
    row.style.background = 'var(--acc-light, rgba(220,38,38,0.06))';
    setTimeout(function() { row.style.background = ''; }, 2000);
  }

  function updateMonitorFeedFromAlerts(alerts) {
    var feed = el('monFeed');
    if (!feed || alerts.length === 0) return;
    var typeMap = { critical:'alert', high:'warning', medium:'watch', low:'info', info:'info', ok:'ok' };
    feed.innerHTML = alerts.map(function(a) {
      var t = typeMap[(a.severity||'info').toLowerCase()] || 'info';
      var ts = a.timestamp ? relativeTime(a.timestamp) : 'Now';
      return '<div class="mon-event mon-event-' + t + '">' +
        '<span class="mon-event-time">' + esc(ts) + '</span>' +
        '<span class="mon-event-dot mon-dot-' + t + '"></span>' +
        '<span class="mon-event-msg">' + esc(a.zone || a.sensor_id || '') +
        (a.zone || a.sensor_id ? ' — ' : '') + esc(a.message || a.description || '') + '</span></div>';
    }).join('');
  }

  function relativeTime(ts) {
    var diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  /* Fallback: original jitter behaviour when API unavailable */
  function updateMonitorPulseJitter() {
    var cards = document.querySelectorAll('.mon-metric-val');
    cards.forEach(function(c) {
      var text = c.textContent;
      if (text.includes('\u00b0C')) {
        var base = parseFloat(text);
        if (!isNaN(base)) {
          c.textContent = (base + (Math.random() - 0.5) * 0.4).toFixed(1) + '\u00b0C';
        }
      }
    });
  }

  function updateMonitorPulseReal() {
    if (MONITOR_AVAILABLE === false) {
      updateMonitorPulseJitter();
    }
    // If available, polling handles updates — pulse does nothing extra
  }

  /* Ingest sensor data helper — called from Smart-LX scenario */
  window.ingestSensorData = async function(source, readings, facilityId) {
    try {
      var r = await fetch('/api/monitor/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source, readings: readings, facility_id: facilityId || 'default' })
      });
      if (r.ok) pollMonitorAlerts();
    } catch(e) {}
  };


  /* ═══════════════════════════════════════════════════════════════════════
     FEATURE 4 — FIRST-LOGIN WALKTHROUGH
     Triggered when USER_PROFILE.first_login is today's date, or
     onboarding_complete === 'true' (set by onboarding.html save).
     Shows a sequenced side-slide notification panel — not a modal,
     not a toast. A persistent guided overlay on first entry.
     ═══════════════════════════════════════════════════════════════════════ */

  var WALKTHROUGH_SHOWN = false;

  function checkFirstLoginWalkthrough(u) {
    if (WALKTHROUGH_SHOWN) return;
    var isFirstLogin      = u.first_login && isToday(u.first_login);
    var justOnboarded     = u.onboarding_complete === 'true' || u.onboarding_complete === true;
    // Also trigger if the session flag was set by onboarding.html redirect
    var sessionFlag       = sessionStorage.getItem('pantheon_onboarding_done') === '1';

    if (isFirstLogin || justOnboarded || sessionFlag) {
      WALKTHROUGH_SHOWN = true;
      sessionStorage.removeItem('pantheon_onboarding_done');
      setTimeout(function() { runWalkthrough(u); }, 1200);
    }
  }

  function isToday(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr);
    var t = new Date();
    return d.getFullYear() === t.getFullYear() &&
           d.getMonth()    === t.getMonth()    &&
           d.getDate()     === t.getDate();
  }

  /* Walkthrough steps — each step waits for the previous dismiss */
  function runWalkthrough(u) {
    var name = (u.name || '').split(' ')[0] || 'there';
    var fc   = (typeof facilityConfig !== 'undefined') ? facilityConfig : {};
    var ftype = fc.typeName || u.facility_type || 'your facility';
    var supp  = fc.suppression || u.suppression || '';
    var det   = fc.detection   || u.detection   || '';
    var loc   = u.location || '';

    var hasFM200Gap = supp && (supp.toLowerCase().includes('fm') || supp.toLowerCase().includes('200') || supp.toLowerCase().includes('co2'));
    var noDetect    = !det || det === 'none' || det === '—';

    var steps = [
      {
        icon: '👋',
        title: 'Welcome to Pantheon, ' + name + '.',
        body: 'Your facility profile is configured and active. Life Safety OS is now personalised to <strong>' + esc(ftype) + '</strong>' + (loc ? ' in <strong>' + esc(loc) + '</strong>' : '') + '.',
        cta: 'Let\'s go'
      },
      {
        icon: '📋',
        title: 'Compliance standards loaded.',
        body: 'Applicable NFPA, NEC, and IFC standards for your jurisdiction have been loaded in the <strong>Standards Rail</strong>. Open the context panel in any view to review them.',
        cta: 'Got it'
      },
      hasFM200Gap ? {
        icon: '⚠️',
        title: 'Suppression gap detected.',
        body: '<strong>' + esc(supp) + '</strong> is chemically incompatible with Li-ion thermal runaway. Your risk profile is elevated. Run a <strong>simulation</strong> to see the full failure scenario.',
        cta: 'Show me',
        action: function() { if (typeof switchView === 'function') switchView('simulate'); }
      } : null,
      noDetect ? {
        icon: '🔍',
        title: 'No off-gas detection configured.',
        body: 'NFPA 855 mandates off-gas detection for Li-ion installations. Without it, thermal runaway gives zero warning. Smart-LX Gateway can close this gap.',
        cta: 'View training',
        action: function() { if (typeof switchView === 'function') switchView('training'); }
      } : null,
      {
        icon: '🎯',
        title: 'Three things to do first.',
        body: '1. Run a <strong>full failure simulation</strong> to see your worst-case scenario.<br>2. Review your <strong>training prescriptions</strong> — courses are pre-selected for your facility type.<br>3. Check the <strong>Monitor</strong> view to verify sensor connectivity.',
        cta: 'Start exploring'
      }
    ].filter(Boolean);

    showWalkthroughStep(steps, 0);
  }

  function showWalkthroughStep(steps, index) {
    if (index >= steps.length) return;
    var step = steps[index];

    // Remove any existing walkthrough panel
    var existing = document.getElementById('wt-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'wt-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-live', 'polite');
    panel.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'width:340px',
      'background:var(--card,#fff)',
      'border:1px solid var(--bdr,#e5e7eb)',
      'border-radius:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.12)',
      'padding:20px 20px 16px',
      'z-index:9900',
      'font-family:var(--sans,system-ui)',
      'transform:translateX(400px)',
      'transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      'box-sizing:border-box'
    ].join(';');

    var progress = steps.map(function(_, i) {
      return '<span style="width:' + (i === index ? '20' : '6') + 'px;height:4px;border-radius:2px;background:' +
        (i < index ? 'var(--acc,#111)' : i === index ? 'var(--acc,#111)' : 'var(--bdr,#e5e7eb)') +
        ';transition:width 0.2s;display:inline-block;margin-right:4px"></span>';
    }).join('');

    panel.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="font-size:20px;line-height:1">' + step.icon + '</span>' +
          '<div style="font-size:13px;font-weight:600;color:var(--t0,#111);line-height:1.3">' + esc(step.title) + '</div>' +
        '</div>' +
        '<button onclick="document.getElementById(\'wt-panel\').remove()" ' +
          'style="background:none;border:none;cursor:pointer;color:var(--t3,#9ca3af);font-size:16px;padding:0;line-height:1;flex-shrink:0;margin-left:8px" ' +
          'aria-label="Dismiss">&times;</button>' +
      '</div>' +
      '<div style="font-size:12.5px;color:var(--t1,#374151);line-height:1.55;margin-bottom:14px">' + step.body + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:0">' + progress + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          (index > 0 ? '<button id="wt-skip" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--t3,#9ca3af);padding:0">Skip</button>' : '') +
          '<button id="wt-cta" style="background:var(--acc,#111);color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">' +
            esc(step.cta) + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Slide in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });

    // CTA action
    var ctaBtn = panel.querySelector('#wt-cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function() {
        if (step.action) step.action();
        slideOutPanel(panel, function() {
          showWalkthroughStep(steps, index + 1);
        });
      });
    }

    // Skip
    var skipBtn = panel.querySelector('#wt-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        panel.remove();
      });
    }

    // Auto-advance non-critical steps after 12s
    var autoTimer = setTimeout(function() {
      if (document.getElementById('wt-panel') === panel) {
        slideOutPanel(panel, function() {
          showWalkthroughStep(steps, index + 1);
        });
      }
    }, 12000);

    panel.querySelector('button[aria-label="Dismiss"]').addEventListener('click', function() {
      clearTimeout(autoTimer);
    });
  }

  function slideOutPanel(panel, cb) {
    panel.style.transform = 'translateX(400px)';
    setTimeout(function() {
      if (panel.parentElement) panel.remove();
      if (cb) cb();
    }, 350);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     POST-ONBOARDING: Surface location standards + product recommendations
     Called after walkthrough completes or on every load when profile exists.
     ═══════════════════════════════════════════════════════════════════════ */

  /* Product recommendation engine — maps jurisdiction + facility type to HCT products */
  var PRODUCT_CATALOG = {
    'micelle-mist': {
      name: 'Micelle Mist™ — F-500 EA Delivery',
      why: 'Encapsulator agent delivery optimised for Li-ion battery rooms. Micelle technology surrounds each water droplet, acting on all four fire tetrahedron legs simultaneously.',
      std: 'NFPA 18A · UL 9540A',
      action: function() { if (typeof switchView === 'function') switchView('catalog'); }
    },
    'f500ea': {
      name: 'F-500 EA® Encapsulator Agent',
      why: 'Fluorine-free, biodegradable encapsulator. Validated for Li-ion thermal runaway — addresses flammability, explosivity, and HF gas toxicity.',
      std: 'NFPA 18A · cULus · NFPA 855',
      action: function() { if (typeof switchView === 'function') switchView('catalog'); }
    },
    'smartlx': {
      name: 'Smart-LX® Detection System',
      why: 'AI-powered thermal + off-gas monitoring. Detects thermal runaway onset before ignition — required for NFPA 855 compliance in ESS installations.',
      std: 'NFPA 72 · NFPA 855',
      action: function() { if (typeof switchView === 'function') switchView('catalog'); }
    },
    'veep': {
      name: 'VEEP System',
      why: 'Fully integrated detect-prevent-suppress loop. Smart-LX® triggers Diamond Doser® for autonomous F-500 EA delivery — no manual intervention.',
      std: 'NFPA 18A · NFPA 69',
      action: function() { if (typeof switchView === 'function') switchView('catalog'); }
    },
    'diamond-doser': {
      name: 'Diamond Doser® Proportioner',
      why: 'Precision F-500 EA injection into existing sprinkler or deluge systems. Water-driven — no power required. Retrofit-compatible.',
      std: 'NFPA 18A · NFPA 750',
      action: function() { if (typeof switchView === 'function') switchView('catalog'); }
    }
  };

  /* Derive which products to surface based on facility config */
  function deriveRecommendedProducts() {
    var fc   = (typeof facilityConfig !== 'undefined') ? facilityConfig  : {};
    var u    = (typeof USER_PROFILE    !== 'undefined') ? USER_PROFILE    : {};
    var supp = (fc.suppression || u.suppression || '').toLowerCase();
    var det  = (fc.detection   || u.detection   || '').toLowerCase();
    var chem = (fc.battery     || u.chemistry   || '').toLowerCase();

    var picks = [];

    // Always surface Micelle Mist for Li-ion facilities
    var isLiIon = !chem || chem.includes('nmc') || chem.includes('nca') || chem.includes('lfp') || chem.includes('li');
    if (isLiIon) picks.push('micelle-mist');

    // F-500 EA if no encapsulator present
    var hasF500 = supp.includes('f-500') || supp.includes('f500') || supp.includes('encapsul');
    if (!hasF500) picks.push('f500ea');

    // Smart-LX if no advanced detection
    var hasSmartLX = det.includes('smart') || det.includes('slx') || det.includes('thermal') || det.includes('camera');
    if (!hasSmartLX) picks.push('smartlx');

    // VEEP if both suppression and detection are gaps
    if (!hasF500 && !hasSmartLX) picks.push('veep');
    else picks.push('diamond-doser');

    // Return max 4 unique
    var seen = {};
    return picks.filter(function(id) {
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0, 4);
  }

  /* Build jurisdiction standards list based on location */
  function buildJurisdictionStandards(loc) {
    var j = parseJurisdictionFallback(loc);
    var fc = (typeof facilityConfig !== 'undefined') ? facilityConfig : {};
    var supp = (fc.suppression || '').toLowerCase();
    var det  = (fc.detection   || '').toLowerCase();

    var base = [
      { code: 'NFPA 855', label: 'ESS Installation Standard', gap: !supp || supp === 'none' },
      { code: 'NFPA 18A', label: 'Encapsulator Agent', gap: !supp.includes('f-500') && !supp.includes('f500') },
      { code: 'NFPA 72',  label: 'Fire Alarm & Detection', gap: !det || det === 'none' },
      { code: 'NFPA 13',  label: 'Sprinkler Systems', gap: false },
      { code: 'UL 9540A', label: 'ESS Fire Testing', gap: false },
    ];

    // State-specific additions
    if (j.state === 'CA') {
      base.push({ code: 'CFC §1206', label: 'California Fire Code — ESS', gap: false });
      base.push({ code: 'NFPA 68',   label: 'Explosion Protection (CA)', gap: false });
    }
    if (j.state === 'TX') base.push({ code: 'TFC Chapter 12', label: 'Texas Fire Code', gap: false });
    if (j.state === 'NY') base.push({ code: 'NYC FC §608',    label: 'NYC Fire Code — Batteries', gap: false });
    if (j.state === 'FL') base.push({ code: 'FFC §1206',      label: 'Florida Fire Code — ESS', gap: false });
    if (j.country === 'UK') {
      base = [
        { code: 'BS EN 62619', label: 'Battery Safety — UK', gap: false },
        { code: 'BS 9999',     label: 'Fire Safety in Buildings', gap: false },
        { code: 'IEC 62933',   label: 'ESS Performance', gap: false },
        { code: 'NFPA 855',    label: 'ESS Standard (adopted)', gap: false },
      ];
    }
    if (j.country === 'AU') {
      base = [
        { code: 'AS 1851',   label: 'Fire Protection Maintenance', gap: false },
        { code: 'AS/NZS 3000', label: 'Wiring Rules', gap: false },
        { code: 'NFPA 855',  label: 'ESS Standard (adopted)', gap: false },
      ];
    }
    return base;
  }

  /* Render the post-onboarding standards + product banner */
  function renderOnboardingBanner(loc) {
    var banner = document.getElementById('obStandardsBanner');
    var locLabel = document.getElementById('obBannerLoc');
    var stdsList = document.getElementById('obStandardsList');
    var productsGrid = document.getElementById('obProductsGrid');
    if (!banner || !stdsList || !productsGrid) return;

    if (locLabel) locLabel.textContent = loc;

    // Standards
    var stds = buildJurisdictionStandards(loc);
    stdsList.innerHTML = stds.map(function(s) {
      var cls = s.gap ? ' ob-std-gap' : ' ob-std-ok';
      return '<span class="ob-std-tag' + cls + '" title="' + esc(s.label) + '">' + esc(s.code) + (s.gap ? ' ⚠' : ' ✓') + '</span>';
    }).join('');

    // Products
    var picks = deriveRecommendedProducts();
    productsGrid.innerHTML = picks.map(function(id) {
      var p = PRODUCT_CATALOG[id]; if (!p) return '';
      return '<div class="ob-product-card" onclick="(' + p.action.toString() + ')()">' +
        '<div class="ob-product-name">' + esc(p.name) + '</div>' +
        '<div class="ob-product-why">' + esc(p.why) + '</div>' +
        '<div class="ob-product-std">' + esc(p.std) + '</div>' +
      '</div>';
    }).join('');

    banner.classList.remove('hidden');
  }

  /* Hook into the onboarding walkthrough to show banner after step 1 */
  var _origRunWalkthrough = null;
  function hookWalkthroughForBanner() {
    var _orig = window.runWalkthrough;
    if (!_orig) return;
    window.runWalkthrough = function(u) {
      _orig(u);
      // After a short delay, also render the banner if location is known
      var loc = u.location || (typeof facilityConfig !== 'undefined' && facilityConfig ? facilityConfig.region : '');
      if (loc) {
        setTimeout(function() { renderOnboardingBanner(loc); }, 1800);
      }
    };
  }

  /* Also trigger banner when profile is loaded with a location */
  function maybeTriggerBannerFromProfile() {
    var u   = (typeof USER_PROFILE   !== 'undefined') ? USER_PROFILE   : {};
    var fc  = (typeof facilityConfig !== 'undefined') ? facilityConfig : {};
    var loc = fc.region || u.location || '';
    if (loc) renderOnboardingBanner(loc);
  }

  /* Expose for external trigger (e.g. after config step 1 region entry) */
  window.onRegionEntered = window.onRegionEntered || function(locStr) {
    if (locStr) {
      renderOnboardingBanner(locStr);
      triggerStandardsFromLocation(locStr);
    }
  };


  /* Also expose a manual trigger for testing */
  window.startWalkthrough = function() {
    WALKTHROUGH_SHOWN = false;
    var u = (typeof USER_PROFILE !== 'undefined') ? USER_PROFILE : {};
    runWalkthrough(u);
  };


  /* ═══════════════════════════════════════════════════════════════════════
     BOOT — Wire everything on DOMContentLoaded
     ═══════════════════════════════════════════════════════════════════════ */

  function boot() {
    hookProfileApply();
    patchTrainingGaps();
    patchTrainingCourses();
    patchMonitor();
    // Wire banner hook after a short delay to let dashboard.js set up
    setTimeout(hookWalkthroughForBanner, 500);

    // If USER_PROFILE is already populated (page cached), apply now
    if (typeof USER_PROFILE !== 'undefined' && USER_PROFILE && USER_PROFILE.location) {
      triggerStandardsFromLocation(USER_PROFILE.location);
      checkFirstLoginWalkthrough(USER_PROFILE);
      maybeTriggerBannerFromProfile();
    }

    // Re-render training if we're already on that view
    if (typeof currentView !== 'undefined' && currentView === 'training') {
      if (typeof renderTrainingCourses === 'function') renderTrainingCourses();
      if (typeof renderTrainingPrescriptions === 'function') renderTrainingPrescriptions();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
