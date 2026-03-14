/**
 * CivicDesk — Municipal Authority Portal
 * main.js  (ES module — loaded via <script type="module">)
 *
 * Imports Firebase SDK from gstatic CDN.
 * Leaflet is loaded globally via a <script> tag in index.html.
 */

import { initializeApp, getApps }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, orderBy }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';


// ══════════════════════════════
//  CONSTANTS
// ══════════════════════════════

const ISSUE_TYPES = [
  'Street light malfunction',
  'Broken road',
  'Water leakage',
  'Garbage overflow',
  'Drainage blockage',
  'Other civic issue',
];

const ROUTING = {
  'Street light malfunction': 'Electrical Dept',
  'Broken road':              'Roads & Infra',
  'Water leakage':            'Water Supply',
  'Garbage overflow':         'Sanitation',
  'Drainage blockage':        'Sanitation',
  'Other civic issue':        'General Admin',
};

const STATUS_FLOW = [
  'saved_offline',
  'submitted_to_authority',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
];

const PIN_COLORS = {
  saved_offline:           '#B87A10',
  submitted_to_authority:  '#E85D24',
  acknowledged:            '#1E6B6E',
  in_progress:             '#1E6B6E',
  resolved:                '#1A6235',
  closed:                  '#8A9DAD',
};

const TYPE_COLORS = ['#1E6B6E', '#4A9E9F', '#B87A10', '#1A4E8C', '#1A6235', '#8A4A2A'];


// ══════════════════════════════
//  PRIORITY ENGINE
//  Priority is calculated per issueType by counting how many active
//  (non-resolved / non-closed) reports share the same issueType.
//  Thresholds: ≥5 → Critical, ≥3 → High, ≥2 → Medium, 1 → Low
// ══════════════════════════════

const PRI_THRESHOLDS = { critical: 5, high: 3, medium: 2 };

function computePriorities(allReports) {
  const typeCounts = {};
  allReports.forEach(r => {
    if (['resolved', 'closed'].includes(r.status)) return;
    typeCounts[r.issueType] = (typeCounts[r.issueType] || 0) + 1;
  });
  return typeCounts;
}

function getPriority(issueType, typeCounts) {
  const n = typeCounts[issueType] || 0;
  if (n >= PRI_THRESHOLDS.critical) return 'critical';
  if (n >= PRI_THRESHOLDS.high)     return 'high';
  if (n >= PRI_THRESHOLDS.medium)   return 'medium';
  return 'low';
}

function priHTML(level, count) {
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  const icons  = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  return `<span class="pri pri-${level}" title="${count} active report${count !== 1 ? 's' : ''} of this type">
    <span class="pri-dot"></span>${icons[level]} ${labels[level]}
    <span style="font-size:10px;font-weight:400;opacity:0.75;margin-left:2px">×${count}</span>
  </span>`;
}


// ══════════════════════════════
//  STATE
// ══════════════════════════════

let reports     = [];
let filtered    = [];
let sortMode    = 'date';
let db          = null;
let fbUnsub     = null;
let leafletMap  = null;
let mapMarkers  = [];
let panelMap    = null;
let selectedMapId = null;


// ══════════════════════════════
//  DEMO DATA (shown before Firebase connects)
// ══════════════════════════════

const DEMO = [
  { id: 'RPT-001', issueType: 'Broken road',              description: 'Large pothole causing tyre damage near the school entrance. Dangerous at night.',                    timestamp: '2025-03-12T06:30:00.000Z', timestampDisplay: '12 Mar 2025, 12:00 PM', location: { latitude: 11.0048, longitude: 76.9659 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 204800, base64Data: null }, { fileName: 'img_2.jpg', mimeType: 'image/jpeg', sizeBytes: 180000, base64Data: null }], status: 'submitted_to_authority', source: 'flutter_mobile_app', assigned: 'Roads & Infra' },
  { id: 'RPT-002', issueType: 'Water leakage',             description: 'Water pipeline leak on main road. Wasting large volumes since yesterday.',                          timestamp: '2025-03-12T04:15:00.000Z', timestampDisplay: '12 Mar 2025, 09:45 AM', location: { latitude: 10.9834, longitude: 76.9701 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 310000, base64Data: null }],                                                                                                                                           status: 'acknowledged',            source: 'flutter_mobile_app', assigned: 'Water Supply' },
  { id: 'RPT-003', issueType: 'Garbage overflow',          description: 'Garbage collection missed for 5 days. Bins overflowing onto footpath.',                             timestamp: '2025-03-11T08:20:00.000Z', timestampDisplay: '11 Mar 2025, 01:50 PM', location: { latitude: 11.0101, longitude: 76.9780 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 250000, base64Data: null }, { fileName: 'img_2.jpg', mimeType: 'image/jpeg', sizeBytes: 200000, base64Data: null }, { fileName: 'img_3.jpg', mimeType: 'image/jpeg', sizeBytes: 195000, base64Data: null }], status: 'in_progress',             source: 'flutter_mobile_app', assigned: 'Sanitation' },
  { id: 'RPT-004', issueType: 'Street light malfunction',  description: 'Three consecutive street lights not working. Area very dark at night.',                             timestamp: '2025-03-11T14:00:00.000Z', timestampDisplay: '11 Mar 2025, 07:30 PM', location: { latitude: 11.0275, longitude: 77.0167 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 160000, base64Data: null }],                                                                                                                                           status: 'submitted_to_authority', source: 'flutter_mobile_app', assigned: 'Electrical Dept' },
  { id: 'RPT-005', issueType: 'Drainage blockage',         description: 'Main drain completely blocked. Water flooding into homes during rain.',                              timestamp: '2025-03-10T10:30:00.000Z', timestampDisplay: '10 Mar 2025, 04:00 PM', location: { latitude: 10.9634, longitude: 76.9524 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 290000, base64Data: null }, { fileName: 'img_2.jpg', mimeType: 'image/jpeg', sizeBytes: 275000, base64Data: null }, { fileName: 'img_3.jpg', mimeType: 'image/jpeg', sizeBytes: 185000, base64Data: null }, { fileName: 'img_4.jpg', mimeType: 'image/jpeg', sizeBytes: 195000, base64Data: null }], status: 'resolved', source: 'flutter_mobile_app', assigned: 'Sanitation' },
  { id: 'RPT-006', issueType: 'Other civic issue',         description: 'Stray dogs near bus stand. Aggressive behaviour. Multiple complaints.',                              timestamp: '2025-03-10T05:45:00.000Z', timestampDisplay: '10 Mar 2025, 11:15 AM', location: null,                                              images: [],                                                                                                                                                                                                                                                         status: 'saved_offline',          source: 'flutter_mobile_app', assigned: 'Unassigned' },
  { id: 'RPT-007', issueType: 'Broken road',              description: 'Road cave-in near entrance of residential colony. Children at risk.',                                 timestamp: '2025-03-09T11:00:00.000Z', timestampDisplay: '09 Mar 2025, 04:30 PM', location: { latitude: 11.0418, longitude: 76.9732 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 320000, base64Data: null }, { fileName: 'img_2.jpg', mimeType: 'image/jpeg', sizeBytes: 305000, base64Data: null }],                                                                      status: 'in_progress',            source: 'flutter_mobile_app', assigned: 'Roads & Infra' },
  { id: 'RPT-008', issueType: 'Street light malfunction',  description: 'Street light pole fell after storm. Blocking pedestrian path.',                                      timestamp: '2025-03-09T13:30:00.000Z', timestampDisplay: '09 Mar 2025, 07:00 PM', location: { latitude: 11.0015, longitude: 77.0275 }, images: [{ fileName: 'img_1.jpg', mimeType: 'image/jpeg', sizeBytes: 220000, base64Data: null }],                                                                                                                                           status: 'closed',                 source: 'flutter_mobile_app', assigned: 'Electrical Dept' },
];

reports  = [...DEMO];
filtered = [...reports];


// ══════════════════════════════
//  FIREBASE — silent real-time connection
// ══════════════════════════════

window.connectFirebase = async function () {
  const cfg = {
    apiKey:            document.getElementById('fbApiKey').value.trim(),
    authDomain:        document.getElementById('fbAuthDomain').value.trim(),
    projectId:         document.getElementById('fbProjectId').value.trim(),
    storageBucket:     document.getElementById('fbStorageBucket').value.trim(),
    messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
    appId:             document.getElementById('fbAppId').value.trim(),
  };
  const col = document.getElementById('fbCollection').value.trim() || 'issues';

  if (!cfg.projectId || !cfg.apiKey) {
    toast('Enter Project ID and API Key', 'err');
    return;
  }

  setFbStatus('pulse', 'Connecting…');
  closeFbModal();

  try {
    const existing = getApps();
    const app = existing.length ? existing[0] : initializeApp(cfg, 'civic-portal');
    db = getFirestore(app);

    if (fbUnsub) fbUnsub();

    const q = query(collection(db, col), orderBy('timestamp', 'desc'));
    fbUnsub = onSnapshot(
      q,
      (snap) => {
        const live = snap.docs.map(d => {
          const data = d.data();
          return {
            id:               d.id,
            issueType:        data.issueType   || 'Other civic issue',
            description:      data.description || '',
            timestamp:        data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || new Date().toISOString(),
            timestampDisplay: data.timestampDisplay || '',
            location:         data.location
              ? { latitude: data.location.latitude ?? data.location._lat ?? 0, longitude: data.location.longitude ?? data.location._long ?? 0 }
              : null,
            images:   data.images  || [],
            status:   data.status  || 'submitted_to_authority',
            source:   data.source  || 'flutter_mobile_app',
            assigned: data.assigned || ROUTING[data.issueType] || 'Unassigned',
          };
        });
        reports  = live.length ? live : DEMO;
        filtered = [...reports];
        refreshAll();
        setFbStatus('live', `Live · ${reports.length} reports`);
      },
      () => {
        setFbStatus('err', 'Connection error');
      }
    );
  } catch (e) {
    setFbStatus('err', 'Config error');
  }
};

function setFbStatus(state, label) {
  const dot = document.getElementById('fbDot');
  const lbl = document.getElementById('fbLabel');
  dot.className = 'fb-dot ' + (state === 'live' ? 'live' : state === 'err' ? 'err' : 'pulse');
  lbl.textContent = label;
}

async function pushUpdate(id, status, assigned, note) {
  if (!db) return;
  try {
    const col = document.getElementById('fbCollection')?.value?.trim() || 'issues';
    await updateDoc(doc(db, col, id), {
      status,
      assigned,
      lastNote: note || '',
      updatedAt: new Date(),
    });
  } catch (e) { /* silent */ }
}


// ══════════════════════════════
//  NAVIGATION
// ══════════════════════════════

window.nav = function (page) {
  document.querySelectorAll('.page, .map-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  if (page === 'dashboard') renderDash();
  if (page === 'issues')    applyFilters();
  if (page === 'analytics') renderAnalytics();
  if (page === 'map')       { initMap(); renderMapList(reports); }
};

function refreshAll() {
  renderDash();
  applyFilters();
  renderAnalytics();
  updateMapPins(reports);

  const n  = reports.filter(r => r.status === 'submitted_to_authority').length;
  const el = document.getElementById('pendingCount');
  el.textContent = n;
  el.classList.toggle('show', n > 0);
}


// ══════════════════════════════
//  DASHBOARD
// ══════════════════════════════

function renderDash() {
  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const total    = reports.length;
  const offline  = reports.filter(r => r.status === 'saved_offline').length;
  const active   = reports.filter(r => ['submitted_to_authority', 'acknowledged', 'in_progress'].includes(r.status)).length;
  const resolved = reports.filter(r => ['resolved', 'closed'].includes(r.status)).length;

  document.getElementById('statsRow').innerHTML = `
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num">${total}</div><div class="sc-lbl">Total Reports</div></div>
        <div class="sc-icon" style="background:var(--teal-lt);color:var(--teal)">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      </div>
      <div class="sc-note">All time · Flutter app</div>
    </div>
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num" style="color:var(--amber)">${offline}</div><div class="sc-lbl">Saved Offline</div></div>
        <div class="sc-icon" style="background:var(--amber-lt);color:var(--amber)">
          <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/></svg>
        </div>
      </div>
      <div class="sc-note">${offline > 0 ? 'Pending upload from device' : 'All synced'}</div>
    </div>
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num" style="color:var(--blue)">${active}</div><div class="sc-lbl">Active Cases</div></div>
        <div class="sc-icon" style="background:var(--blue-lt);color:var(--blue)">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="sc-note">Submitted + in progress</div>
    </div>
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num" style="color:var(--green)">${resolved}</div><div class="sc-lbl">Resolved</div></div>
        <div class="sc-icon" style="background:var(--green-lt);color:var(--green)">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
      <div class="sc-note">Completed &amp; closed</div>
    </div>`;

  document.getElementById('dashBody').innerHTML = reports.slice(0, 6).map(r => rowHtml(r, true)).join('');

  // Priority hotspots
  const typeCounts = computePriorities(reports);
  const PRI_ORDER  = { critical: 0, high: 1, medium: 2, low: 3 };
  const hotspots   = ISSUE_TYPES
    .map(t => ({ type: t, count: typeCounts[t] || 0, pri: getPriority(t, typeCounts) }))
    .filter(x => x.count > 0)
    .sort((a, b) => PRI_ORDER[a.pri] - PRI_ORDER[b.pri]);

  document.getElementById('priorityHotspots').innerHTML = hotspots.length
    ? hotspots.map(h => `
      <div class="cluster-row" onclick="filterByType('${h.type}')" style="cursor:pointer" title="Click to filter All Issues">
        <div class="cluster-type">${h.type}</div>
        ${priHTML(h.pri, h.count)}
        <div class="cluster-count">${h.count}</div>
      </div>`).join('')
    : `<div style="color:var(--text3);font-size:12px;padding:8px 0">No active reports</div>`;

  renderTypeChart('typeChartDash');
  renderStatusChart('statusChartDash');
}


// ══════════════════════════════
//  TABLE ROWS
// ══════════════════════════════

function rowHtml(r, short = false) {
  const typeCounts = computePriorities(reports);
  const pri   = getPriority(r.issueType, typeCounts);
  const count = typeCounts[r.issueType] || 0;
  const loc   = r.location
    ? `<span style="font-family:var(--mono);font-size:10px">${r.location.latitude.toFixed(4)},${r.location.longitude.toFixed(4)}</span>`
    : `<span style="color:var(--text3);font-size:11px">No GPS</span>`;
  const imgs  = r.images?.length
    ? `<span style="font-family:var(--mono);font-size:11px;color:var(--teal);font-weight:600">📷 ${r.images.length}</span>`
    : `<span style="color:var(--text3)">—</span>`;

  if (short) {
    return `<tr onclick="openPanel('${r.id}')">
      <td><span class="mono-id">${r.id}</span></td>
      <td><span class="type-pill">${r.issueType}</span></td>
      <td>${priHTML(pri, count)}</td>
      <td><div style="font-size:12px;font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description}</div></td>
      <td>${loc}</td>
      <td>${imgs}</td>
      <td>${badge(r.status)}</td>
      <td><span style="font-size:11px;color:var(--text3)">${fmt(r.timestamp)}</span></td>
    </tr>`;
  }

  return `<tr onclick="openPanel('${r.id}')">
    <td><span class="mono-id">${r.id}</span></td>
    <td><span class="type-pill">${r.issueType}</span></td>
    <td>${priHTML(pri, count)}</td>
    <td><div style="font-size:12px;font-weight:500;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description}</div></td>
    <td>${loc}</td>
    <td>${imgs}</td>
    <td>${badge(r.status)}</td>
    <td style="font-size:11px;color:var(--text2)">${r.assigned || '—'}</td>
    <td><span style="font-size:11px;color:var(--text3)">${fmt(r.timestamp)}</span></td>
    <td><button class="btn btn-outline btn-sm" style="padding:4px 9px;font-size:11px" onclick="event.stopPropagation();openPanel('${r.id}')">Open →</button></td>
  </tr>`;
}

function badge(s) {
  const m = {
    saved_offline:          'b-offline',
    submitted_to_authority: 'b-submitted',
    acknowledged:           'b-acknowledged',
    in_progress:            'b-inprog',
    resolved:               'b-resolved',
    closed:                 'b-closed',
  };
  return `<span class="badge ${m[s] || 'b-submitted'}">${s.replace(/_/g, ' ')}</span>`;
}

function fmt(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return ts || '—'; }
}


// ══════════════════════════════
//  FILTERS
// ══════════════════════════════

window.applyFilters = function () {
  const typeCounts = computePriorities(reports);
  let data = [...reports];

  const s = document.getElementById('fStatus').value;
  const t = document.getElementById('fType').value;
  const d = document.getElementById('fDept').value;
  const p = document.getElementById('fPriority').value;

  if (s) data = data.filter(r => r.status === s);
  if (t) data = data.filter(r => r.issueType === t);
  if (d) data = data.filter(r => r.assigned === d);
  if (p) data = data.filter(r => getPriority(r.issueType, typeCounts) === p);

  const PRI_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  if      (sortMode === 'priority') data.sort((a, b) => PRI_ORDER[getPriority(a.issueType, typeCounts)] - PRI_ORDER[getPriority(b.issueType, typeCounts)]);
  else if (sortMode === 'status')   data.sort((a, b) => STATUS_FLOW.indexOf(a.status) - STATUS_FLOW.indexOf(b.status));
  else                              data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  filtered = data;
  document.getElementById('issueCount').textContent = `${data.length} report${data.length !== 1 ? 's' : ''}`;
  document.getElementById('issuesBody').innerHTML = data.length
    ? data.map(r => rowHtml(r, false)).join('')
    : `<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text3)">No reports match filters</td></tr>`;
};

window.clearFilters = function () {
  ['fStatus', 'fType', 'fDept', 'fPriority'].forEach(id => (document.getElementById(id).value = ''));
  filtered = [...reports];
  applyFilters();
};

window.filterByType = function (type) {
  nav('issues');
  document.getElementById('fType').value = type;
  applyFilters();
};

window.setSort = function (mode, el) {
  sortMode = mode;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
};


// ══════════════════════════════
//  CHARTS (pure CSS bar charts)
// ══════════════════════════════

function renderTypeChart(elId) {
  const counts = {};
  ISSUE_TYPES.forEach(t => (counts[t] = 0));
  reports.forEach(r => { if (counts[r.issueType] !== undefined) counts[r.issueType]++; });
  const max = Math.max(...Object.values(counts), 1);

  document.getElementById(elId).innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lbl, val], i) => `
      <div class="bar-row">
        <div class="bar-name" title="${lbl}">${lbl}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(val / max) * 100}%;background:${TYPE_COLORS[i % TYPE_COLORS.length]}"></div></div>
        <div class="bar-count">${val}</div>
      </div>`)
    .join('');
}

function renderStatusChart(elId) {
  const sc = {};
  STATUS_FLOW.forEach(s => (sc[s] = 0));
  reports.forEach(r => { sc[r.status] = (sc[r.status] || 0) + 1; });
  const total  = reports.length || 1;
  const colors = {
    saved_offline:          '#B87A10',
    submitted_to_authority: '#1A4E8C',
    acknowledged:           '#1E6B6E',
    in_progress:            '#9A5008',
    resolved:               '#1A6235',
    closed:                 '#8A9DAD',
  };

  document.getElementById(elId).innerHTML = STATUS_FLOW.map(s => `
    <div class="st-row">
      <div class="st-dot" style="background:${colors[s]}"></div>
      <div class="st-lbl">${s.replace(/_/g, ' ')}</div>
      <div class="st-val">${sc[s] || 0}</div>
      <div class="st-pct">${Math.round(((sc[s] || 0) / total) * 100)}%</div>
    </div>`).join('');
}


// ══════════════════════════════
//  ANALYTICS PAGE
// ══════════════════════════════

function renderAnalytics() {
  const total    = reports.length;
  const offline  = reports.filter(r => r.status === 'saved_offline').length;
  const active   = reports.filter(r => ['submitted_to_authority', 'acknowledged', 'in_progress'].includes(r.status)).length;
  const resolved = reports.filter(r => ['resolved', 'closed'].includes(r.status)).length;

  document.getElementById('aStatsRow').innerHTML = `
    <div class="scard"><div class="sc-num">${total}</div><div class="sc-lbl">Total</div></div>
    <div class="scard"><div class="sc-num" style="color:var(--amber)">${offline}</div><div class="sc-lbl">Offline Pending</div></div>
    <div class="scard"><div class="sc-num" style="color:var(--blue)">${active}</div><div class="sc-lbl">Active</div></div>
    <div class="scard"><div class="sc-num" style="color:var(--green)">${resolved}</div><div class="sc-lbl">Resolved</div></div>`;

  renderTypeChart('typeChartA');
  renderStatusChart('statusChartA');

  const depts = {};
  reports.forEach(r => { const d = r.assigned || 'Unassigned'; depts[d] = (depts[d] || 0) + 1; });
  const maxD = Math.max(...Object.values(depts), 1);

  document.getElementById('deptChart').innerHTML = Object.entries(depts)
    .sort((a, b) => b[1] - a[1])
    .map(([d, v]) => `
      <div class="bar-row">
        <div class="bar-name">${d}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(v / maxD) * 100}%;background:var(--teal)"></div></div>
        <div class="bar-count">${v}</div>
      </div>`)
    .join('');
}


// ══════════════════════════════
//  MAP — Leaflet + OpenStreetMap
// ══════════════════════════════

function initMap() {
  if (leafletMap) { updateMapPins(reports); return; }

  // Default centre = Coimbatore, Tamil Nadu
  leafletMap = L.map('leaflet-map', {
    center: [11.0168, 76.9558],
    zoom: 12,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap);

  updateMapPins(reports);
}

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5" fill="white" fill-opacity="0.9"/>
    </svg>`,
    iconSize:     [28, 36],
    iconAnchor:   [14, 36],
    popupAnchor:  [0, -38],
  });
}

function updateMapPins(data) {
  if (!leafletMap) return;
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  const withLocation = data.filter(r => r.location?.latitude && r.location?.longitude);
  document.getElementById('mapCount').textContent = `${withLocation.length} of ${data.length} reports plotted`;

  withLocation.forEach(r => {
    const color  = PIN_COLORS[r.status] || '#E85D24';
    const marker = L.marker([r.location.latitude, r.location.longitude], { icon: makeIcon(color) })
      .addTo(leafletMap)
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${r.issueType}</div>
          <div style="font-size:11px;color:#555;margin-bottom:6px">${r.description.slice(0, 80)}…</div>
          <div style="font-size:10px;color:#888">${r.id} · ${r.status.replace(/_/g, ' ')}</div>
        </div>`, { maxWidth: 220 })
      .on('click', () => { selectedMapId = r.id; highlightMapCard(r.id); openPanel(r.id); });
    mapMarkers.push(marker);
  });

  renderMapList(data);
}

function renderMapList(data) {
  const type   = document.getElementById('mapFType')?.value   || '';
  const status = document.getElementById('mapFStatus')?.value || '';
  let list = data.filter(r => r.location?.latitude);
  if (type)   list = list.filter(r => r.issueType === type);
  if (status) list = list.filter(r => r.status === status);

  document.getElementById('mapList').innerHTML = list.length
    ? list.map(r => `
        <div class="map-card${selectedMapId === r.id ? ' selected' : ''}" id="mc-${r.id}" onclick="focusPin('${r.id}')">
          <div class="map-card-title">${r.issueType}</div>
          <div class="map-card-meta">
            <span>${badge(r.status)}</span>
            <span style="font-family:var(--mono);font-size:10px">${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}</span>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">${r.description.slice(0, 60)}…</div>
        </div>`).join('')
    : `<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">No reports with GPS location</div>`;
}

window.applyMapFilter = function () {
  if (!leafletMap) return;
  updateMapPins(reports);
};

window.focusPin = function (id) {
  const r = reports.find(x => x.id === id);
  if (!r?.location) return;
  selectedMapId = id;
  leafletMap.setView([r.location.latitude, r.location.longitude], 16);
  highlightMapCard(id);
  openPanel(id);
};

function highlightMapCard(id) {
  document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('mc-' + id)?.classList.add('selected');
}


// ══════════════════════════════
//  SLIDE PANEL
// ══════════════════════════════

window.openPanel = function (id) {
  const r = reports.find(x => x.id === id);
  if (!r) return;

  document.getElementById('panelTitle').textContent = `${r.id} — ${r.issueType}`;

  const si = STATUS_FLOW.indexOf(r.status);
  const tl = [
    { what: 'Report submitted by citizen',    when: r.timestampDisplay || fmt(r.timestamp), state: 'done' },
    { what: 'Received by authority server',   when: '—', state: r.status !== 'saved_offline' ? 'done' : '' },
    { what: 'Acknowledged by department',     when: '—', state: si >= 2 ? 'done' : si === 1 ? 'cur' : '' },
    { what: 'Field team in progress',         when: '—', state: si >= 3 ? 'done' : si === 2 ? 'cur' : '' },
    { what: 'Issue resolved',                 when: '—', state: si >= 4 ? 'done' : si === 3 ? 'cur' : '' },
    { what: 'Closed',                         when: '—', state: si >= 5 ? 'done' : si === 4 ? 'cur' : '' },
  ];

  const imgHtml = r.images?.length
    ? `<div class="img-grid">${r.images.map((img, i) => `
        <div class="img-t" onclick="openLb(${i},'${r.id}')">
          ${img.base64Data
            ? `<img src="data:${img.mimeType};base64,${img.base64Data}" alt="${img.fileName}"/>`
            : `<div class="ph">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>${img.fileName}</span>
                <span style="font-size:9px;font-family:var(--mono)">${(img.sizeBytes / 1024).toFixed(0)}KB</span>
              </div>`}
        </div>`).join('')}</div>`
    : `<div style="color:var(--text3);font-size:12px;padding:10px 0">No images submitted with this report</div>`;

  const typeCounts = computePriorities(reports);
  const pri        = getPriority(r.issueType, typeCounts);
  const priCt      = typeCounts[r.issueType] || 0;
  const related    = reports.filter(x => x.issueType === r.issueType && x.id !== r.id);

  document.getElementById('panelBody').innerHTML = `
    <div class="p-sec">
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        ${badge(r.status)}
        ${priHTML(pri, priCt)}
      </div>
      <div style="font-family:var(--head);font-size:15px;font-weight:700;color:var(--text);margin-bottom:7px">${r.issueType}</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6">${r.description}</div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Priority Reason</div>
      <div class="cluster-box">
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">
          <strong>${priCt}</strong> active report${priCt !== 1 ? 's' : ''} share the same issue type
          <span style="font-style:italic;color:var(--text3)">"${r.issueType}"</span>
          — priority is ${pri.toUpperCase()}.
        </div>
        ${related.length ? `
          <div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px">Other same-type reports</div>
          ${related.slice(0, 4).map(x => `
            <div class="cluster-row" onclick="openPanel('${x.id}')" style="cursor:pointer">
              <span class="mono-id">${x.id}</span>
              <span style="flex:1;font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.description.slice(0, 50)}…</span>
              ${badge(x.status)}
            </div>`).join('')}
          ${related.length > 4 ? `<div style="font-size:11px;color:var(--text3);padding-top:6px">+${related.length - 4} more same-type reports</div>` : ''}
        ` : `<div style="font-size:12px;color:var(--text3)">No other reports of this type yet.</div>`}
      </div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Metadata</div>
      <div class="ig">
        <div class="ic"><label>Report ID</label><div class="v m">${r.id}</div></div>
        <div class="ic"><label>Source</label><div class="v m" style="color:var(--teal)">${r.source || 'flutter_mobile_app'}</div></div>
        <div class="ic"><label>Timestamp</label><div class="v">${r.timestampDisplay || fmt(r.timestamp)}</div></div>
        <div class="ic"><label>Assigned</label><div class="v">${r.assigned || 'Unassigned'}</div></div>
        <div class="ic"><label>Images</label><div class="v">${r.images?.length || 0} / 4</div></div>
        <div class="ic"><label>Has Location</label><div class="v">${r.location ? '✓ GPS captured' : '✗ Not provided'}</div></div>
      </div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Location</div>
      ${r.location ? `
        <div class="mini-map">
          <div id="panelMap"></div>
          <div class="map-coords-chip">${r.location.latitude.toFixed(6)}, ${r.location.longitude.toFixed(6)}</div>
        </div>
        <a href="https://www.openstreetmap.org/?mlat=${r.location.latitude}&mlon=${r.location.longitude}&zoom=17" target="_blank"
           style="font-size:11px;color:var(--teal);text-decoration:none;display:inline-block;margin-top:5px">Open in OpenStreetMap ↗</a>`
      : `<div style="background:var(--bg);border-radius:8px;padding:12px;font-size:12px;color:var(--text3)">
           No GPS location provided — citizen denied permission or skipped location</div>`}
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Photos (${r.images?.length || 0})</div>
      ${imgHtml}
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Update Report</div>
      <div class="fg">
        <label>Status</label>
        <select class="fc" id="upStatus">
          ${STATUS_FLOW.map(s => `<option value="${s}"${s === r.status ? ' selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}
        </select>
      </div>
      <div class="fg">
        <label>Assign To</label>
        <select class="fc" id="upDept">
          <option value="Unassigned"${r.assigned === 'Unassigned' ? ' selected' : ''}>Unassigned</option>
          ${Object.values(ROUTING).filter((v, i, a) => a.indexOf(v) === i).map(d => `<option${r.assigned === d ? ' selected' : ''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="fg">
        <label>Note</label>
        <textarea class="fc" rows="2" id="upNote" placeholder="Field team dispatched, resolution in 48hrs…"></textarea>
      </div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Activity Timeline</div>
      <div class="tl">
        ${tl.map(t => `
          <div class="tl-item ${t.state}">
            <div class="tl-dot"></div>
            <div class="tl-when">${t.when}</div>
            <div class="tl-what">${t.what}</div>
          </div>`).join('')}
      </div>
    </div>`;

  document.getElementById('panelFt').innerHTML = `
    <button class="btn btn-primary" style="flex:1" onclick="saveUpdate('${r.id}')">Save Update</button>
    <button class="btn btn-outline" onclick="closePanel()">Cancel</button>`;

  document.getElementById('overlay').classList.add('open');
  document.getElementById('panel').classList.add('open');

  // Render mini Leaflet map in panel (after DOM settles)
  if (r.location) {
    setTimeout(() => {
      if (panelMap) { panelMap.remove(); panelMap = null; }
      panelMap = L.map('panelMap', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false })
        .setView([r.location.latitude, r.location.longitude], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(panelMap);
      L.marker([r.location.latitude, r.location.longitude], { icon: makeIcon('#E85D24') }).addTo(panelMap);
    }, 80);
  }
};

window.closePanel = function () {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('panel').classList.remove('open');
  if (panelMap) { setTimeout(() => { panelMap?.remove(); panelMap = null; }, 300); }
};

window.saveUpdate = async function (id) {
  const r = reports.find(x => x.id === id);
  if (!r) return;
  const status   = document.getElementById('upStatus').value;
  const assigned = document.getElementById('upDept').value;
  const note     = document.getElementById('upNote').value;
  r.status   = status;
  r.assigned = assigned;
  await pushUpdate(id, status, assigned, note);
  closePanel();
  refreshAll();
  toast(`${id} updated → "${status.replace(/_/g, ' ')}"`, 'ok');
};


// ══════════════════════════════
//  IMAGE LIGHTBOX
// ══════════════════════════════

window.openLb = function (idx, reportId) {
  const r   = reports.find(x => x.id === reportId);
  const img = r?.images?.[idx];
  if (!img?.base64Data) { toast('Image data not available in demo mode', 'info'); return; }
  document.getElementById('lbImg').src = `data:${img.mimeType};base64,${img.base64Data}`;
  document.getElementById('lightbox').classList.add('open');
};


// ══════════════════════════════
//  FIREBASE CONFIG MODAL
// ══════════════════════════════

window.openFbModal  = () => document.getElementById('fbModal').classList.add('open');
window.closeFbModal = () => document.getElementById('fbModal').classList.remove('open');


// ══════════════════════════════
//  GLOBAL SEARCH
// ══════════════════════════════

function getActivePage() {
  const active = document.querySelector('.page.active, .map-page.active');
  return active?.id?.replace('page-', '') || 'dashboard';
}

document.getElementById('globalSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  const matches = q
    ? reports.filter(r =>
        r.issueType?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.status?.includes(q) ||
        r.assigned?.toLowerCase().includes(q))
    : null;

  const active = getActivePage();

  if (active === 'map') {
    filtered = q ? matches : [...reports];
    updateMapPins(filtered);
    return;
  }

  if (!q) {
    filtered = [...reports];
    applyFilters();
    return;
  }

  if (active !== 'issues') nav('issues');
  filtered = matches;
  document.getElementById('issueCount').textContent = `${filtered.length} reports`;
  document.getElementById('issuesBody').innerHTML = filtered.length
    ? filtered.map(r => rowHtml(r, false)).join('')
    : `<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text3)">No reports match search</td></tr>`;
});


// ══════════════════════════════
//  EXPORT CSV
// ══════════════════════════════

window.exportCSV = function () {
  const rows = [
    ['ID', 'Issue Type', 'Description', 'Latitude', 'Longitude', 'Image Count', 'Status', 'Assigned', 'Timestamp'],
    ...filtered.map(r => [
      r.id,
      `"${r.issueType}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.location?.latitude  || '',
      r.location?.longitude || '',
      r.images?.length      || 0,
      r.status,
      r.assigned            || '',
      r.timestamp,
    ]),
  ];
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
  a.download = `civic-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast('CSV exported', 'ok');
};


// ══════════════════════════════
//  TOAST
// ══════════════════════════════

window.toast = function (msg, type = 'info') {
  const icons = {
    ok:   `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    err:  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const t       = document.createElement('div');
  t.className   = `toast ${type}`;
  t.innerHTML   = `${icons[type] || icons.info}<span class="t-msg">${msg}</span><button class="t-x" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 4200);
};


// ══════════════════════════════
//  INIT
// ══════════════════════════════

renderDash();
applyFilters();
setFbStatus('err', 'Not connected');

// Auto-reconnect from saved config in localStorage
setTimeout(() => {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem('civicFbCfg') || 'null'); }
    catch (_) { return null; }
  })();
  if (saved?.projectId && saved?.apiKey) {
    document.getElementById('fbApiKey').value             = saved.apiKey;
    document.getElementById('fbAuthDomain').value         = saved.authDomain           || '';
    document.getElementById('fbProjectId').value          = saved.projectId;
    document.getElementById('fbStorageBucket').value      = saved.storageBucket        || '';
    document.getElementById('fbMessagingSenderId').value  = saved.messagingSenderId    || '';
    document.getElementById('fbAppId').value              = saved.appId               || '';
    document.getElementById('fbCollection').value         = saved.collection           || 'issues';
    window.connectFirebase();
  }
}, 100);

// Wrap connectFirebase to persist config to localStorage on each connect
const _origConnect = window.connectFirebase;
window.connectFirebase = function () {
  const cfg = {
    apiKey:            document.getElementById('fbApiKey').value.trim(),
    authDomain:        document.getElementById('fbAuthDomain').value.trim(),
    projectId:         document.getElementById('fbProjectId').value.trim(),
    storageBucket:     document.getElementById('fbStorageBucket').value.trim(),
    messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
    appId:             document.getElementById('fbAppId').value.trim(),
    collection:        document.getElementById('fbCollection').value.trim(),
  };
  try { localStorage.setItem('civicFbCfg', JSON.stringify(cfg)); } catch (_) {}
  _origConnect();
};
