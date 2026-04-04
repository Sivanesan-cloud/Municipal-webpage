/**
 * CivicDesk — Municipal Authority Portal
 * main.js  (ES module — loaded via <script type="module">)
 *
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
  'submitted',
  'assigned',
  'acknowledged',
  'in_progress',
  'completed',
  'verified',
  'resolved',
  'closed',
];

// Proof of Execution statuses
const POE_STATUSES = ['completed', 'verified'];

const PIN_COLORS = {
  submitted:               '#E85D24',
  assigned:                '#6B5BD6',
  acknowledged:            '#1E6B6E',
  in_progress:             '#B87A10',
  completed:               '#5E62FA',
  verified:                '#1A6235',
  resolved:                '#1A6235',
  closed:                  '#8A9DAD',
};

const TYPE_COLORS = ['#1E6B6E', '#4A9E9F', '#B87A10', '#1A4E8C', '#1A6235', '#8A4A2A'];

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC2is_OzWuquXINoUJ4Z3SU7o2vlb3Izuc",
  authDomain: "civic-issue-reporter-c4a80.firebaseapp.com",
  projectId: "civic-issue-reporter-c4a80",
  storageBucket: "civic-issue-reporter-c4a80.firebasestorage.app",
  messagingSenderId: "972922286039",
  appId: "1:972922286039:web:fc5744b3c7649c256ae592",
};

const FIRESTORE_COLLECTION = 'reports';
const USERS_COLLECTION = 'users';


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

function priorityReasonBarHtml(count) {
  const cap = Math.max(PRI_THRESHOLDS.critical + 2, count, 6);
  const pMedium = (PRI_THRESHOLDS.medium / cap) * 100;
  const pHigh = (PRI_THRESHOLDS.high / cap) * 100;
  const pCritical = (PRI_THRESHOLDS.critical / cap) * 100;
  const pCount = (Math.min(count, cap) / cap) * 100;
  const gradient = `linear-gradient(90deg,
    #5AC97A 0% ${pMedium}%,
    #F2C94C ${pMedium}% ${pHigh}%,
    #F2994A ${pHigh}% ${pCritical}%,
    #EB5757 ${pCritical}% 100%)`;

  return `
    <div class="pri-bar">
      <div class="pri-bar-fill" style="background:${gradient}"></div>
      <div class="pri-bar-marker" style="left:${pCount}%"><span>${count}</span></div>
      <div class="pri-bar-tick" style="left:${pMedium}%"></div>
      <div class="pri-bar-tick" style="left:${pHigh}%"></div>
      <div class="pri-bar-tick" style="left:${pCritical}%"></div>
    </div>
    <div class="pri-bar-scale">
      <div class="pri-bar-label" style="left:0%">Low</div>
      <div class="pri-bar-label" style="left:${pMedium}%">Medium</div>
      <div class="pri-bar-label" style="left:${pHigh}%">High</div>
      <div class="pri-bar-label" style="left:${pCritical}%">Critical</div>
    </div>
    <div class="pri-bar-note">Thresholds: Medium ≥${PRI_THRESHOLDS.medium}, High ≥${PRI_THRESHOLDS.high}, Critical ≥${PRI_THRESHOLDS.critical}</div>
  `;
}



// Normalize Firestore image fields to a consistent shape
function normalizeImages(data) {
  const raw =
    data.images ??
    data.imageUrls ??
    data.imageUrl ??
    data.photoUrl ??
    data.photoURL ??
    [];
  const arr = Array.isArray(raw) ? raw : [raw];

  return arr
    .filter(Boolean)
    .map((img, idx) => {
      if (typeof img === 'string') {
        return {
          url: img,
          fileName: `image-${idx + 1}`,
        };
      }
      const url =
        img.url ||
        img.secureUrl ||
        img.secure_url ||
        img.imageUrl ||
        img.downloadURL ||
        img.downloadUrl ||
        img.path ||
        '';
      return {
        ...img,
        url,
        fileName:
          img.fileName ||
          img.name ||
          (url ? url.split('/').pop()?.split('?')[0] : `image-${idx + 1}`),
      };
    });
}

function isSupervisorUser(data) {
  const role =
    (data.role || data.userRole || data.type || '')
      .toString()
      .trim()
      .toLowerCase();
  if (role === 'supervisor') return true;
  if (Array.isArray(data.roles)) {
    return data.roles.map(r => r.toString().trim().toLowerCase()).includes('supervisor');
  }
  return false;
}

function userDisplayName(data, fallbackId) {
  return (
    data.name ||
    data.displayName ||
    data.fullName ||
    data.email ||
    data.username ||
    fallbackId
  );
}

// ══════════════════════════════
//  STATE
// ══════════════════════════════

let reports     = [];
let filtered    = [];
let sortMode    = 'date';
let db          = null;
let fbUnsub     = null;
let supervisorsUnsub = null;
let leafletMap  = null;
let mapMarkers  = [];
let panelMap    = null;
let currentPanelId = null;
let selectedMapId = null;
let mapRefreshTimer = null;
let locationUiRefreshTimer = null;
let supervisors = [];

const locationNameCache = new Map();
const locationNamePending = new Set();
const geocodeQueue = [];
let geocodeRunning = false;
const imageGpsCache = new Map();
const imageGpsPending = new Set();

const GEOCODE_DELAY_MS = 350;
const GEOCODE_ZOOM = 18;


function coordKey(lat, lon) {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

function hasValidCoords(location) {
  const lat = Number(location?.latitude);
  const lon = Number(location?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
}

function formatAddress(addr) {
  if (!addr) return '';
  const block =
    addr.neighbourhood ||
    addr.suburb ||
    addr.quarter ||
    addr.hamlet ||
    addr.village;
  const road =
    addr.road ||
    addr.pedestrian ||
    addr.footway ||
    addr.cycleway ||
    addr.path;
  const district =
    addr.state_district ||
    addr.county ||
    addr.district;
  const city =
    addr.city ||
    addr.town ||
    addr.village;
  const state = addr.state;

  const parts = [block || road, city || district, state].filter(Boolean);
  return parts.join(', ');
}

function shortenLocationText(name) {
  if (!name) return '';
  const parts = name.split(',').map(p => p.trim()).filter(Boolean);
  const base = parts.slice(0, 3).join(', ');
  if (base.length <= 42) return base;
  return base.slice(0, 39).trimEnd() + '…';
}

async function fetchLocationName(lat, lon) {
  const key = coordKey(lat, lon);
  if (locationNameCache.has(key)) return locationNameCache.get(key);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=${GEOCODE_ZOOM}&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return '';
    const data = await res.json();
    const name = formatAddress(data?.address) || data?.display_name || '';
    if (name) locationNameCache.set(key, name);
    return name;
  } catch (_) {
    return '';
  }
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = (dataUrl.split(',')[1] || '').trim();
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function readExifValue(view, entryOffset, littleEndian, type, count, tiffStart) {
  const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
  const totalSize = (typeSizes[type] || 0) * count;
  if (!totalSize) return null;

  const valueOffset = totalSize <= 4
    ? entryOffset + 8
    : tiffStart + view.getUint32(entryOffset + 8, littleEndian);

  if (valueOffset + totalSize > view.byteLength) return null;

  if (type === 2) {
    let text = '';
    for (let i = 0; i < count; i++) {
      const code = view.getUint8(valueOffset + i);
      if (code === 0) break;
      text += String.fromCharCode(code);
    }
    return text;
  }

  if (type === 5) {
    const values = [];
    for (let i = 0; i < count; i++) {
      const num = view.getUint32(valueOffset + i * 8, littleEndian);
      const den = view.getUint32(valueOffset + i * 8 + 4, littleEndian);
      values.push(den ? num / den : 0);
    }
    return values;
  }

  if (type === 3) {
    const values = [];
    for (let i = 0; i < count; i++) values.push(view.getUint16(valueOffset + i * 2, littleEndian));
    return count === 1 ? values[0] : values;
  }

  if (type === 4) {
    const values = [];
    for (let i = 0; i < count; i++) values.push(view.getUint32(valueOffset + i * 4, littleEndian));
    return count === 1 ? values[0] : values;
  }

  if (type === 1) {
    const values = [];
    for (let i = 0; i < count; i++) values.push(view.getUint8(valueOffset + i));
    return count === 1 ? values[0] : values;
  }

  return null;
}

function dmsToDecimal(parts, ref) {
  if (!Array.isArray(parts) || parts.length < 3) return null;
  const decimal = (parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
  return ['S', 'W'].includes(String(ref || '').toUpperCase()) ? -decimal : decimal;
}

function extractGpsFromExifBytes(bytes) {
  if (!bytes || bytes.length < 4) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0) !== 0xFFD8) return null;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;
    if (marker === 0xFFDA || marker === 0xFFD9) break;

    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2) break;

    if (marker === 0xFFE1 && offset + 2 + segmentLength <= view.byteLength) {
      const exifHeader = String.fromCharCode(
        view.getUint8(offset + 2),
        view.getUint8(offset + 3),
        view.getUint8(offset + 4),
        view.getUint8(offset + 5)
      );
      if (exifHeader === 'Exif') {
        const tiffStart = offset + 8;
        const littleEndian = view.getUint16(tiffStart) === 0x4949;
        const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
        const ifd0Start = tiffStart + ifd0Offset;
        const entryCount = view.getUint16(ifd0Start, littleEndian);
        let gpsIfdStart = null;

        for (let i = 0; i < entryCount; i++) {
          const entryOffset = ifd0Start + 2 + i * 12;
          const tag = view.getUint16(entryOffset, littleEndian);
          if (tag === 0x8825) {
            gpsIfdStart = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
            break;
          }
        }

        if (!gpsIfdStart) return null;

        const gpsEntryCount = view.getUint16(gpsIfdStart, littleEndian);
        let latRef = null;
        let latVals = null;
        let lonRef = null;
        let lonVals = null;

        for (let i = 0; i < gpsEntryCount; i++) {
          const entryOffset = gpsIfdStart + 2 + i * 12;
          const tag = view.getUint16(entryOffset, littleEndian);
          const type = view.getUint16(entryOffset + 2, littleEndian);
          const count = view.getUint32(entryOffset + 4, littleEndian);
          const value = readExifValue(view, entryOffset, littleEndian, type, count, tiffStart);
          if (tag === 1) latRef = value;
          if (tag === 2) latVals = value;
          if (tag === 3) lonRef = value;
          if (tag === 4) lonVals = value;
        }

        const latitude = dmsToDecimal(latVals, latRef);
        const longitude = dmsToDecimal(lonVals, lonRef);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          return { latitude, longitude };
        }
      }
    }

    offset += segmentLength;
  }

  return null;
}

async function loadImageBytes(img) {
  if (img?.base64Data) {
    return dataUrlToUint8Array(`data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}`);
  }
  if (img?.url?.startsWith('data:')) return dataUrlToUint8Array(img.url);
  if (img?.url) {
    const res = await fetch(img.url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }
  return null;
}

async function extractGpsFromImage(img) {
  const key = img?.url || img?.fileName || img?.name || '';
  if (!key) return null;
  if (imageGpsCache.has(key)) return imageGpsCache.get(key);

  const bytes = await loadImageBytes(img);
  const coords = extractGpsFromExifBytes(bytes);
  imageGpsCache.set(key, coords || null);
  return coords || null;
}

async function enrichLocationFromImage(r) {
  if (!r?.images?.length || hasValidCoords(r.location) || imageGpsPending.has(r.id)) return;
  imageGpsPending.add(r.id);
  try {
    for (const img of r.images) {
      const coords = await extractGpsFromImage(img);
      if (!hasValidCoords(coords)) continue;
      r.location = coords;
      const name = await fetchLocationName(coords.latitude, coords.longitude);
      if (name) r.locationName = name;
      scheduleMapRefresh();
      scheduleLocationUiRefresh();
      break;
    }
  } catch (_) {
    // If photo GPS is unavailable, keep the existing report location fallback.
  } finally {
    imageGpsPending.delete(r.id);
  }
}

function syncOpenPanelLocation(issueId = currentPanelId) {
  const panel = document.getElementById('panel');
  const body = document.getElementById('panelBody');
  if (!panel?.classList.contains('open') || !body || !issueId) return;

  const r = reports.find(x => x.id === issueId);
  if (!r) return;

  const locationDisplay = (r.locationName
    || (hasValidCoords(r.location) ? 'Resolving exact address...' : 'No GPS data found')) + ` (Ward no: ${r.wardNo})`;

  body.querySelectorAll('.ic').forEach(card => {
    const label = card.querySelector('label');
    const value = card.querySelector('.v');
    if (!label || !value) return;
    if (label.textContent.trim().toLowerCase() === 'has location' || label.textContent.trim().toLowerCase() === 'location data') {
      label.textContent = 'Location Data';
      value.textContent = locationDisplay;
    }
  });

  const chip = body.querySelector('.map-coords-chip');
  if (chip) {
    chip.textContent = r.locationName ? shortenLocationText(r.locationName) : 'Resolving exact address...';
    chip.title = r.locationName || '';
  }

  const osmLink = body.querySelector('a[href*="openstreetmap.org"]');
  if (osmLink) {
    const locationText = osmLink.previousElementSibling;
    if (locationText) {
      locationText.textContent = r.locationName || 'Exact address is being resolved from GPS data.';
      locationText.title = r.locationName || '';
    }
  }
}

function scheduleMapRefresh() {
  if (mapRefreshTimer) return;
  mapRefreshTimer = setTimeout(() => {
    mapRefreshTimer = null;
    if (leafletMap) updateMapPins(reports);
  }, 150);
}

function scheduleLocationUiRefresh() {
  if (locationUiRefreshTimer) return;
  locationUiRefreshTimer = setTimeout(() => {
    locationUiRefreshTimer = null;
    renderDash();
    applyFilters();
    if (leafletMap) renderMapList(reports);
    syncOpenPanelLocation();
  }, 200);
}

function queueReverseGeocode(r) {
  if (!hasValidCoords(r?.location)) return;
  const key = coordKey(r.location.latitude, r.location.longitude);
  if (locationNameCache.has(key)) {
    r.locationName = locationNameCache.get(key);
    return;
  }
  if (locationNamePending.has(key)) return;
  locationNamePending.add(key);
  geocodeQueue.push({ key, report: r });
  runGeocodeQueue();
}

async function runGeocodeQueue() {
  if (geocodeRunning) return;
  geocodeRunning = true;
  while (geocodeQueue.length) {
    const { key, report } = geocodeQueue.shift();
    const lat = report.location?.latitude;
    const lon = report.location?.longitude;
    if (lat && lon) {
      const name = await fetchLocationName(lat, lon);
      if (name) {
        locationNameCache.set(key, name);
        report.locationName = name;
        scheduleMapRefresh();
        scheduleLocationUiRefresh();
      }
    }
    locationNamePending.delete(key);
    await new Promise(r => setTimeout(r, GEOCODE_DELAY_MS));
  }
  geocodeRunning = false;
}


// ══════════════════════════════
//  FIREBASE ? real-time connection
// ????????????????????????????????????????????????????????????????

reports  = [];
filtered = [];

async function connectFirebase() {
  try {
    const existing = getApps();
    const app = existing.length ? existing[0] : initializeApp(FIREBASE_CONFIG, 'civic-portal');
    db = getFirestore(app);

    if (fbUnsub) fbUnsub();
    if (supervisorsUnsub) supervisorsUnsub();

    const q = query(collection(db, FIRESTORE_COLLECTION), orderBy('timestamp', 'desc'));
    fbUnsub = onSnapshot(
      q,
      (snap) => {
        const live = snap.docs.map(d => {
          const data = d.data();
          const locationName =
            data.locationName ||
            data.location_label ||
            data.locationLabel ||
            data.address ||
            data.addressText ||
            data.location?.name ||
            '';
          return {
            id:               d.id,
            issueType:        data.issueType   || 'Other civic issue',
            description:      data.description || '',
            timestamp:        data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || new Date().toISOString(),
            timestampDisplay: data.timestampDisplay || '',
            location:         data.location
              ? { latitude: data.location.latitude ?? data.location._lat ?? 0, longitude: data.location.longitude ?? data.location._long ?? 0 }
              : null,
            locationName,
            images:   normalizeImages(data),
            status:          ['saved_offline', 'submitted_to_authority'].includes(data.status) ? 'submitted' : (data.status || 'submitted'),
            source:          data.source  || 'flutter_mobile_app',
            assigned:        data.assigned || ROUTING[data.issueType] || 'Unassigned',
            supervisorName:  data.supervisorName || '',
            // Proof of Execution fields
            proofImageUrl:   data.proofImageUrl   || null,
            proofNote:       data.proofNote       || '',
            proofUploadedAt: data.proofUploadedAt || null,
            adminVerified:   data.adminVerified   || null,   // true=approved, false=rejected
            adminNote:       data.adminNote       || '',
            rating:          data.rating          || null,   // 1-5
            ratingComment:   data.ratingComment   || '',
            ratingAt:        data.ratingAt        || null,
            supervisorId:    data.supervisorId    || '',
            wardNo:          data.wardNo || data.wardNumber || data.ward_no || (Math.abs(d.id.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)) % 100) + 1,
          };
        });
        reports  = live;
        filtered = [...reports];
        refreshAll();
      },
      () => {
        toast('Firestore connection error', 'err');
      }
    );

    supervisorsUnsub = onSnapshot(
      collection(db, USERS_COLLECTION),
      (snap) => {
        const list = snap.docs
          .map(d => {
            const data = d.data() || {};
            return {
              id: d.id,
              name: userDisplayName(data, d.id),
              role: (data.role || data.userRole || '').toString().toLowerCase(),
              raw: data,
            };
          })
          .filter(u => isSupervisorUser(u.raw))
          .sort((a, b) => a.name.localeCompare(b.name));
        supervisors = list;
      },
      () => {
        supervisors = [];
      }
    );
  } catch (e) {
    toast('Firebase config error', 'err');
  }
}

async function pushUpdate(id, status, assigned, note, supervisorId) {
  if (!db) return;
  try {
    const payload = {
      status,
      assigned,
      lastNote: note || '',
      updatedAt: new Date(),
    };
    if (supervisorId !== undefined) payload.supervisorId = supervisorId;
    await updateDoc(doc(db, FIRESTORE_COLLECTION, id), payload);
  } catch (e) { /* silent */ }
}

window.markRecentReportsForDonutDemo = async function () {
  if (!db) {
    toast('Live data is not connected yet', 'err');
    return;
  }

  const candidates = reports.filter(r => !['resolved', 'closed'].includes(r.status)).slice(0, 2);
  if (candidates.length < 2) {
    toast('Need at least two active recent reports', 'info');
    return;
  }

  const updates = [
    { report: candidates[0], status: 'resolved', note: 'Updated from dashboard recent reports for status overview' },
    { report: candidates[1], status: 'closed', note: 'Updated from dashboard recent reports for status overview' },
  ];

  try {
    await Promise.all(
      updates.map(({ report, status, note }) =>
        updateDoc(doc(db, FIRESTORE_COLLECTION, report.id), {
          status,
          lastNote: note,
          updatedAt: new Date(),
        })
      )
    );

    updates.forEach(({ report, status }) => {
      report.status = status;
    });
    refreshAll();
    toast(`Updated ${updates[0].report.id} to resolved and ${updates[1].report.id} to closed`, 'ok');
  } catch (e) {
    toast('Could not update recent reports', 'err');
  }
};


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
  reports.forEach(r => {
    if (hasValidCoords(r.location)) queueReverseGeocode(r);
    else enrichLocationFromImage(r);
  });
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

function animateDashValue(id, start, end, duration) {
  let obj = document.getElementById(id);
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end;
    }
  };
  window.requestAnimationFrame(step);
}

function renderDash() {
  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const activeCount   = reports.filter(r => ['submitted', 'assigned', 'in_progress'].includes(r.status)).length;
  const ackCount      = reports.filter(r => r.status === 'acknowledged').length;
  const pendingCount  = reports.filter(r => ['submitted', 'assigned', 'acknowledged', 'in_progress'].includes(r.status)).length;
  const resolvedCount = reports.filter(r => ['resolved', 'closed'].includes(r.status)).length;

  document.getElementById('statsRow').innerHTML = `
    <div class="scard scard-active">
      <div class="sc-top">
        <div><div class="sc-kicker">Live Overview</div><div class="sc-num" id="dash-active">0</div><div class="sc-lbl">Active Cases</div></div>
        <div class="sc-icon" style="background:linear-gradient(135deg,#FF6B35,#E8194B);color:#fff;box-shadow:0 4px 14px rgba(232,25,75,0.35)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(255,255,255,0.25)"/></svg></div>
      </div>
      <div class="sc-note">Submitted &amp; In Progress</div>
    </div>
    <div class="scard scard-ack">
      <div class="sc-top">
        <div><div class="sc-kicker">Department Pulse</div><div class="sc-num" id="dash-ack" style="color:#6B7280">0</div><div class="sc-lbl">Acknowledged</div></div>
        <div class="sc-icon" style="background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#fff;box-shadow:0 4px 14px rgba(99,60,237,0.35)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="rgba(255,255,255,0.15)"/><circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.4)"/></svg></div>
      </div>
      <div class="sc-note">Checked by Authority</div>
    </div>
    <div class="scard scard-pending">
      <div class="sc-top">
        <div><div class="sc-kicker">Queue Status</div><div class="sc-num" id="dash-pending" style="color:var(--amber)">0</div><div class="sc-lbl">Pending Reports</div></div>
        <div class="sc-icon" style="background:linear-gradient(135deg,#F59E0B,#EF6C00);color:#fff;box-shadow:0 4px 14px rgba(239,108,0,0.35)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.15)"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="3"/></svg></div>
      </div>
      <div class="sc-note">In workflow pipeline</div>
    </div>
    <div class="scard scard-resolved">
      <div class="sc-top">
        <div><div class="sc-kicker">Closure Rate</div><div class="sc-num" id="dash-resolved" style="color:var(--green)">0</div><div class="sc-lbl">Resolved</div></div>
        <div class="sc-icon" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;box-shadow:0 4px 14px rgba(5,150,105,0.35)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z" fill="rgba(255,255,255,0.15)"/><polyline points="8.5 12.5 11 15 16 9"/></svg></div>
      </div>
      <div class="sc-note">Completed &amp; Closed</div>
    </div>`;

  requestAnimationFrame(() => {
    animateDashValue('dash-active', 0, activeCount, 800);
    animateDashValue('dash-ack', 0, ackCount, 800);
    animateDashValue('dash-pending', 0, pendingCount, 800);
    animateDashValue('dash-resolved', 0, resolvedCount, 800);
  });

  document.getElementById('dashBody').innerHTML = reports.length
    ? reports.slice(0, 6).map(r => rowHtml(r, true)).join('')
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text3)">No data received yet</td></tr>`;

  const recentHead = document.querySelector('#dashBody')?.closest('.card')?.querySelector('.card-head');
  if (recentHead && !recentHead.querySelector('.dash-demo-actions')) {
    const actions = document.createElement('div');
    actions.className = 'dash-demo-actions';
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';
    actions.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="markRecentReportsForDonutDemo()">Set Resolved / Closed</button>
      <button class="btn btn-outline btn-sm" onclick="nav('issues')">View all →</button>`;
    const oldButton = recentHead.querySelector('button');
    if (oldButton) oldButton.remove();
    recentHead.appendChild(actions);
  }

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
  renderStatusOverview();
}


// ══════════════════════════════
//  TABLE ROWS
// ══════════════════════════════

function rowHtml(r, short = false) {
  const typeCounts = computePriorities(reports);
  const pri   = getPriority(r.issueType, typeCounts);
  const count = typeCounts[r.issueType] || 0;
  const loc   = r.location
    ? (r.locationName
      ? `<div style="line-height:1.2"><span style="font-size:11px" title="${r.locationName}">${shortenLocationText(r.locationName)}</span><div style="font-size:10px;color:var(--text3);font-weight:600">Ward no: ${r.wardNo}</div></div>`
      : `<div style="line-height:1.2"><span style="color:var(--text3);font-size:11px">Resolving address...</span><div style="font-size:10px;color:var(--text3);font-weight:600">Ward no: ${r.wardNo}</div></div>`)
    : `<span style="color:var(--text3);font-size:11px">No location provided</span>`;
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
    submitted:              'b-submitted',
    assigned:               'b-acknowledged',
    acknowledged:           'b-acknowledged',
    in_progress:            'b-inprog',
    completed:              'b-completed',
    verified:               'b-verified',
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
  const emptyMsg = reports.length ? 'No reports match filters' : 'No data received yet';
  document.getElementById('issuesBody').innerHTML = data.length
    ? data.map(r => rowHtml(r, false)).join('')
    : `<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text3)">${emptyMsg}</td></tr>`;
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

function renderStatusOverview() {
  const donutEl = document.getElementById('sdDonut');
  const legendEl = document.getElementById('sdLegend');
  if (!donutEl || !legendEl) return;

  const buckets = [
    { key: 'submitted',    label: 'Submitted',    color: '#E85D24', match: r => ['submitted', 'assigned'].includes(r.status) },
    { key: 'acknowledged', label: 'Acknowledged', color: '#F29E02', match: r => r.status === 'acknowledged' },
    { key: 'pending',      label: 'In Progress',  color: '#22C55E', match: r => ['in_progress', 'completed', 'verified'].includes(r.status) },
    { key: 'resolved',     label: 'Resolved',     color: '#6B7280', match: r => r.status === 'resolved' },
    { key: 'closed',       label: 'Closed',       color: '#5E62FA', match: r => r.status === 'closed' },
  ];

  const total = reports.length;
  const denom = total || 1;
  const data = buckets.map(b => ({ ...b, count: reports.filter(b.match).length }));

  // ── SVG donut with percentage labels ──
  const cx = 100, cy = 100, r = 68, sw = 36;
  const circumference = 2 * Math.PI * r;
  const innerR = r - sw / 2 - 2; // ≈ 30 — radius of center hole fill

  let segments = '';
  let labels   = '';
  let cumPct   = 0;

  data.forEach(b => {
    const pct = b.count / denom;
    if (pct <= 0) return;

    const dashLen = pct * circumference;
    const gapLen  = circumference - dashLen;
    // start at top (−90°) using stroke-dashoffset
    const offset  = circumference * (0.25 - cumPct);

    segments += `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${b.color}" stroke-width="${sw}"
      stroke-dasharray="${dashLen.toFixed(2)} ${gapLen.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      stroke-linecap="butt"/>`;

    // Percentage label — only if segment is >= 5%
    if (pct >= 0.05) {
      const midAngle = (cumPct + pct / 2) * 2 * Math.PI - Math.PI / 2;
      const lx = (cx + r * Math.cos(midAngle)).toFixed(1);
      const ly = (cy + r * Math.sin(midAngle)).toFixed(1);
      const pctStr = Math.round(pct * 100) + '%';
      labels += `<text x="${lx}" y="${ly}"
        text-anchor="middle" dominant-baseline="central"
        fill="#fff" font-size="10" font-weight="800"
        font-family="var(--head, sans-serif)"
        style="text-shadow:0 1px 3px rgba(0,0,0,0.4)">${pctStr}</text>`;
    }

    cumPct += pct;
  });

  // Empty state ring
  if (!segments) {
    segments = `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="#E8EDF2" stroke-width="${sw}"/>`;
  }

  donutEl.style.background = 'none';
  donutEl.innerHTML = `
    <svg viewBox="0 0 200 200" width="100%" height="100%" style="display:block;overflow:visible">
      <defs>
        <radialGradient id="cg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#EDF6F6" stop-opacity="0.6"/>
        </radialGradient>
      </defs>
      <!-- background ring -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E8EDF2" stroke-width="${sw}"/>
      <!-- coloured segments -->
      ${segments}
      <!-- percentage labels on ring -->
      ${labels}
      <!-- center hole -->
      <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#F4F8F9"/>
      <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="url(#cg)"/>
      <!-- center text: total count -->
      <text x="${cx}" y="${cy - 9}" text-anchor="middle" dominant-baseline="central"
        fill="#17314D" font-size="24" font-weight="800"
        font-family="var(--head, sans-serif)">${total || '—'}</text>
      <text x="${cx}" y="${cy + 13}" text-anchor="middle" dominant-baseline="central"
        fill="#55697D" font-size="8" font-weight="700" letter-spacing="1.5"
        font-family="var(--head, sans-serif)">TOTAL</text>
    </svg>`;

  legendEl.innerHTML = data.map(b => {
    const pct = Math.round((b.count / denom) * 100);
    return `
    <div class="sd-leg-item">
      <div class="sd-leg-dot" style="background:${b.color}"></div>
      <span>${b.label}&nbsp;<strong style="color:${b.color}">${pct}%</strong>&nbsp;(${b.count})</span>
    </div>`;
  }).join('');
}

function renderStatusChart(elId) {
  const sc = {};
  STATUS_FLOW.forEach(s => (sc[s] = 0));
  reports.forEach(r => { if(sc[r.status]!==undefined) sc[r.status]++ });
  const total  = reports.length || 1;
  const colors = {
    submitted:    '#E85D24',
    assigned:     '#6B5BD6',
    acknowledged: '#1E6B6E',
    in_progress:  '#B87A10',
    resolved:     '#1A6235',
    closed:       '#8A9DAD',
  };

  document.getElementById(elId).innerHTML = STATUS_FLOW.map(s => `
    <div class="st-row">
      <div class="st-dot" style="background:${colors[s]}"></div>
      <div class="st-lbl" style="color:${colors[s]}">${s.replace(/_/g, ' ')}</div>
      <div class="st-val">${sc[s] || 0}</div>
      <div class="st-pct">${Math.round(((sc[s] || 0) / total) * 100)}%</div>
    </div>`).join('');
}


// ══════════════════════════════
//  ANALYTICS PAGE
// ══════════════════════════════

function renderAnalytics() {
  const total    = reports.length;
  const active   = reports.filter(r => ['submitted', 'assigned', 'in_progress'].includes(r.status)).length;
  const ack      = reports.filter(r => r.status === 'acknowledged').length;
  const resolved = reports.filter(r => ['resolved', 'closed'].includes(r.status)).length;

  document.getElementById('aStatsRow').innerHTML = `
    <div class="scard"><div class="sc-num">${total}</div><div class="sc-lbl">Total</div></div>
    <div class="scard"><div class="sc-num" style="color:var(--amber)">${active}</div><div class="sc-lbl">Active</div></div>
    <div class="scard"><div class="sc-num" style="color:var(--blue)">${ack}</div><div class="sc-lbl">Acknowledged</div></div>
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
    queueReverseGeocode(r);
    const marker = L.marker([r.location.latitude, r.location.longitude], { icon: makeIcon(color) })
      .addTo(leafletMap)
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${r.issueType}</div>
          ${r.locationName ? `<div style="font-size:11px;color:#3a3a3a;margin-bottom:2px" title="${r.locationName}">${shortenLocationText(r.locationName)}</div>` : ''}
          <div style="font-size:10px;color:var(--blue);font-weight:700;margin-bottom:4px">Ward no: ${r.wardNo}</div>
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

  const emptyMapMsg = reports.length ? 'No reports with GPS location' : 'No data received yet';
  document.getElementById('mapList').innerHTML = list.length
    ? list.map(r => `
        <div class="map-card${selectedMapId === r.id ? ' selected' : ''}" id="mc-${r.id}" onclick="focusPin('${r.id}')">
          <div class="map-card-title">${r.issueType}</div>
          <div class="map-card-meta">
            <span>${badge(r.status)}</span>
            <span style="font-size:10px;color:var(--text2)" title="${r.locationName || ''}">
              ${r.locationName ? shortenLocationText(r.locationName) : 'Location name pending'}
            </span>
            <span style="font-size:10px;color:var(--blue);font-weight:700;margin-left:auto">W: ${r.wardNo}</span>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">${r.description.slice(0, 60)}…</div>
        </div>`).join('')
    : `<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">${emptyMapMsg}</div>`;
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
  currentPanelId = id;

  document.getElementById('panelTitle').textContent = `${r.id} — ${r.issueType}`;

  const si = STATUS_FLOW.indexOf(r.status);
  const tl = [
    { what: 'Report submitted by citizen',    when: r.timestampDisplay || fmt(r.timestamp), state: 'done' },
    { what: 'Received by authority server',   when: '—', state: r.status !== 'saved_offline' ? 'done' : '' },
    { what: 'Assigned to supervisor',         when: '—', state: si >= 2 ? 'done' : si === 1 ? 'cur' : '' },
    { what: 'Acknowledged by department',     when: '—', state: si >= 3 ? 'done' : si === 2 ? 'cur' : '' },
    { what: 'Field team in progress',         when: '—', state: si >= 4 ? 'done' : si === 3 ? 'cur' : '' },
    { what: 'Issue resolved',                 when: '—', state: si >= 5 ? 'done' : si === 4 ? 'cur' : '' },
    { what: 'Closed',                         when: '—', state: si >= 6 ? 'done' : si === 5 ? 'cur' : '' },
  ];

  const imgHtml = r.images?.length
    ? `<div class="img-grid">${r.images.map((img, i) => `
        <div class="img-t" onclick="openLb(${i},'${r.id}')">
          ${(img.url || img.base64Data)
            ? `<img src="${img.url ? img.url : `data:${img.mimeType};base64,${img.base64Data}`}" alt="${img.fileName || 'report image'}"/>`
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
  const supervisors = workers.filter(w => w.role === 'supervisor');
  const assignedDisplay = r.supervisorName || r.assignedWorkerName || 'Unassigned';
  const locationDisplay = (r.locationName
    || (hasValidCoords(r.location) ? 'Resolving exact address...' : 'No GPS data found')) + ` (Ward no: ${r.wardNo})`;

  document.getElementById('panelBody').innerHTML = `
    <div class="p-sec">
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        ${badge(r.status)}
        ${priHTML(pri, priCt)}
      </div>
      <div style="font-family:var(--head);font-size:15px;font-weight:700;color:var(--text);margin-bottom:7px">${r.issueType}</div>
      <div style="font-family:var(--head);font-size:16px;font-weight:600;color:#08154F;line-height:1.75;letter-spacing:0.2px">${r.description}</div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Metadata</div>
      <div class="ig">
        <div class="ic"><label>Report ID</label><div class="v m">${r.id}</div></div>
        <div class="ic"><label>Timestamp</label><div class="v">${r.timestampDisplay || fmt(r.timestamp)}</div></div>
        <div class="ic"><label>Assigned</label><div class="v">${assignedDisplay}</div></div>
        <div class="ic"><label>Images</label><div class="v">${r.images?.length || 0} / 4</div></div>
        <div class="ic"><label>Has Location</label><div class="v">${r.location ? 'âœ“ GPS captured' : 'âœ— Not provided'}</div></div>
      </div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Priority Reason</div>
      <div class="cluster-box">
        <div style="font-size:14px;color:#10223A;margin-bottom:10px;line-height:1.6;font-weight:600">
          <strong>${priCt}</strong> active report${priCt !== 1 ? 's' : ''} share the same issue type
          <span style="font-style:italic;color:#24384C">"${r.issueType}"</span>
          — priority is ${pri.toUpperCase()}.
        </div>
        ${priorityReasonBarHtml(priCt)}
        ${related.length ? `
          <div style="font-size:11px;font-weight:800;color:#24384C;letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px">Other same-type reports</div>
          ${related.slice(0, 4).map(x => `
            <div class="cluster-row" onclick="openPanel('${x.id}')" style="cursor:pointer">
              <span class="mono-id">${x.id}</span>
              <span style="flex:1;font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.description.slice(0, 50)}…</span>
              ${badge(x.status)}
            </div>`).join('')}
          ${related.length > 4 ? `<div style="font-size:11px;color:var(--text3);padding-top:6px">+${related.length - 4} more same-type reports</div>` : ''}
        ` : `<div style="font-size:13px;color:#24384C;font-weight:500">No other reports of this type yet.</div>`}
      </div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Metadata</div>
      <div class="ig">
        <div class="ic"><label>Report ID</label><div class="v m">${r.id}</div></div>
        <div class="ic"><label>Timestamp</label><div class="v">${r.timestampDisplay || fmt(r.timestamp)}</div></div>
        <div class="ic"><label>Assigned</label><div class="v">${assignedDisplay}</div></div>
        <div class="ic"><label>Images</label><div class="v">${r.images?.length || 0} / 4</div></div>
        <div class="ic"><label>Location Data</label><div class="v">${locationDisplay}</div></div>
      </div>
    </div>

    <div class="p-sec">
      <div class="p-sec-lbl">Location</div>
      ${r.location ? `
        <div class="mini-map">
          <div id="panelMap"></div>
          <div class="map-coords-chip" title="${r.locationName || ''}">${r.locationName ? shortenLocationText(r.locationName) : "Location name pending"}</div>
        </div>
        <div style="background:var(--blue-lt);padding:8px 12px;border-radius:6px;margin:8px 0;display:flex;align-items:center;gap:8px;border:1px solid #E2E8F0">
          <div style="background:var(--blue);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">W</div>
          <div style="font-family:var(--head);font-size:13px;font-weight:700;color:var(--blue)">Ward no: ${r.wardNo}</div>
        </div>
        ${r.locationName ? `<div style="font-size:14px;color:#1B3558;font-weight:600;margin-top:2px" title="${r.locationName}">${shortenLocationText(r.locationName)}</div>` : ''}
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
      <div class="p-sec-lbl">Department Assignment</div>
      <div class="fg">
        <label>Assign to Supervisor</label>
        <select class="fc" id="upSupervisor">
          <option value="">-- Select Dept Supervisor --</option>
          ${supervisors.map(s => `
            <option value="${s.id}" ${r.supervisorId === s.id ? 'selected' : ''}>
              ${s.name} (${s.department})
            </option>
          `).join('')}
        </select>
      </div>
      <div class="fg">
        <label>Admin Instructions</label>
        <textarea class="fc" rows="2" id="upNote" placeholder="Instructions for the department supervisor..."></textarea>
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

  const panelBody = document.getElementById('panelBody');
  const metadataSections = [...panelBody.querySelectorAll('.p-sec')]
    .filter(sec => sec.querySelector('.p-sec-lbl')?.textContent?.trim() === 'Metadata');
  metadataSections.slice(1).forEach(sec => sec.remove());

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
  currentPanelId = null;
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('panel').classList.remove('open');
  if (panelMap) { setTimeout(() => { panelMap?.remove(); panelMap = null; }, 300); }
};

window.saveUpdate = async function (id) {
  const r = reports.find(x => x.id === id);
  if (!r) return;

  const supervisorId = document.getElementById('upSupervisor').value;
  const supervisor = workers.find(w => w.id === supervisorId);
  const note = document.getElementById('upNote').value;

  if (!supervisorId) {
    toast('Please select a supervisor', 'err');
    return;
  }

  try {
    await updateDoc(doc(db, FIRESTORE_COLLECTION, id), {
      status: 'assigned', // Status moves to Assigned per the workflow
      supervisorId: supervisorId,
      supervisorName: supervisor.name,
      assigned: supervisor.department,
      adminNote: note || '',
      updatedAt: new Date()
    });

    closePanel();
    refreshAll();
    toast(`Issue assigned to Supervisor ${supervisor.name}`, 'ok');
  } catch (e) {
    toast('Update failed', 'err');
  }
};


// ══════════════════════════════
//  IMAGE LIGHTBOX
// ══════════════════════════════

window.openLb = function (idx, reportId) {
  const r   = reports.find(x => x.id === reportId);
  const img = r?.images?.[idx];
  if (!img?.url && !img?.base64Data) { toast('Image data not available', 'info'); return; }
  document.getElementById('lbImg').src = img.url
    ? img.url
    : `data:${img.mimeType};base64,${img.base64Data}`;
  document.getElementById('lightbox').classList.add('open');
};


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
        r.locationName?.toLowerCase().includes(q) ||
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
    ['ID', 'Issue Type', 'Description', 'Location Name', 'Latitude', 'Longitude', 'Image Count', 'Status', 'Assigned', 'Timestamp'],
    ...filtered.map(r => [
      r.id,
      `"${r.issueType}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.locationName || '').replace(/"/g, '""')}"`,
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
connectFirebase();



// ══════════════════════════════════════════════════════
//  WORKER ASSIGNMENT SYSTEM
//  All worker data lives in localStorage for persistence.
//  Assignments are also pushed to Firestore via pushUpdate.
// ══════════════════════════════════════════════════════

const WORKER_STORAGE_KEY = 'civicdesk_workers_v2';

const DEPT_META = {
  'Electrical Dept': { cls: 'dept-electrical', icon: '⚡', color: '#9A5008' },
  'Roads & Infra':   { cls: 'dept-roads',      icon: '🛣️', color: '#1A4E8C' },
  'Water Supply':    { cls: 'dept-water',       icon: '💧', color: '#1E6B6E' },
  'Sanitation':      { cls: 'dept-sanitation',  icon: '🗑️', color: '#1A6235' },
  'Parks & Env.':    { cls: 'dept-parks',       icon: '🌿', color: '#156734' },
  'General Admin':   { cls: 'dept-admin',       icon: '🏛️', color: '#8A9DAD' },
};

const AV_COLORS = ['#1E6B6E','#1A4E8C','#B87A10','#1A6235','#8A4A2A','#5E62FA','#E85D24','#4A9E9F','#8B3A00','#156734'];
const SUPERVISOR_ROLE_OPTIONS = ['Sanitary Inspector', 'Assistant Engineer', 'Junior Engineer'];

const SEED_WORKERS = [
  { id:'S001', name:'Arjun Singh',  role:'supervisor', designation:'Assistant Engineer', department:'Electrical Dept', experience:12, activeTasks:0, phone:'+91 98765 20001' },
  { id:'S002', name:'Priya Nair',   role:'supervisor', designation:'Junior Engineer', department:'Roads & Infra',   experience:10, activeTasks:0, phone:'+91 98765 20002' },
  { id:'S003', name:'Suresh Babu',  role:'supervisor', designation:'Sanitary Inspector', department:'Water Supply',    experience:15, activeTasks:0, phone:'+91 98765 20003' },

  // Regular Workers - keep as role: 'worker' to hide them from the Admin page
  { id:'W001', name:'Arjun Ramesh',  role:'worker', department:'Electrical Dept', experience:8, activeTasks:2 },
  { id:'W002', name:'Saranya Mohan', role:'worker', department:'Electrical Dept', experience:6, activeTasks:3 },
  { id:'W003', name:'Suresh Babu',     role:'worker', department:'Roads & Infra',   experience:12, activeTasks:1, phone:'+91 98765 10003' },
  { id:'W004', name:'Kavitha Menon',   role:'worker', department:'Roads & Infra',   experience:7,  activeTasks:5, phone:'+91 98765 10004' },
  { id:'W005', name:'Rajan Pillai',    role:'worker', department:'Water Supply',    experience:10, activeTasks:3, phone:'+91 98765 10005' },
  { id:'W006', name:'Meena Krishnan',  role:'worker', department:'Water Supply',    experience:4,  activeTasks:6, phone:'+91 98765 10006' },
  { id:'W007', name:'Dinesh Kumar',    role:'worker', department:'Sanitation',      experience:6,  activeTasks:2, phone:'+91 98765 10007' },
  { id:'W008', name:'Lakshmi Devi',    role:'worker', department:'Sanitation',      experience:9,  activeTasks:0, phone:'+91 98765 10008' },
  { id:'W009', name:'Venkat Rao',      role:'worker', department:'Sanitation',      experience:3,  activeTasks:7, phone:'+91 98765 10009' },
  { id:'W010', name:'Anitha Selvi',    role:'worker', department:'Parks & Env.',    experience:5,  activeTasks:1, phone:'+91 98765 10010' },
  { id:'W011', name:'Murugan Swamy',   role:'worker', department:'Parks & Env.',    experience:11, activeTasks:3, phone:'+91 98765 10011' },
  { id:'W012', name:'Thenmozhi R.',    role:'worker', department:'General Admin',   experience:7,  activeTasks:2, phone:'+91 98765 10012' },
  { id:'W013', name:'Balu Pandian',    role:'worker', department:'Roads & Infra',   experience:2,  activeTasks:0, phone:'+91 98765 10013' },
  { id:'W014', name:'Saranya Mohan',   role:'worker', department:'Electrical Dept', experience:6,  activeTasks:3, phone:'+91 98765 10014' },
  { id:'W015', name:'Gopal Krishnan',  role:'worker', department:'Water Supply',    experience:14, activeTasks:1, phone:'+91 98765 10015' },
];

// ─── Load / seed workers ───────────────────────────────

function loadWorkers() {
  try {
    const raw = localStorage.getItem(WORKER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Backfill roles and ensure supervisors exist in storage
      if (Array.isArray(parsed)) {
        const withRoles = parsed.map(w => normalizeWorkerRecord({ role: w.role || 'worker', ...w }));
        const hasSupervisor = withRoles.some(w => w.role === 'supervisor');
        if (!hasSupervisor) {
          const supervisors = SEED_WORKERS.filter(w => w.role === 'supervisor');
          const merged = [...supervisors, ...withRoles];
          saveWorkers(merged);
          return merged;
        }
        return withRoles;
      }
      return parsed;
    }
  } catch (_) {}
  saveWorkers(SEED_WORKERS);
  return SEED_WORKERS.map(w => normalizeWorkerRecord({ ...w }));
}

function saveWorkers(ws) {
  try { localStorage.setItem(WORKER_STORAGE_KEY, JSON.stringify(ws.map(normalizeWorkerRecord))); } catch (_) {}
}

let workers = loadWorkers();

// ─── Helpers ──────────────────────────────────────────

function workerInitials(name) {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function workerAvColor(id) {
  const idx = parseInt(id.replace(/\D/g, ''), 10) || 0;
  return AV_COLORS[idx % AV_COLORS.length];
}

function deptClass(dept) {
  return DEPT_META[dept]?.cls || 'dept-admin';
}

function deptIcon(dept) {
  return DEPT_META[dept]?.icon || '🏛️';
}

function workloadClass(n) {
  if (n <= 2) return 'wl-low';
  if (n <= 5) return 'wl-med';
  return 'wl-high';
}

function workloadLabel(n) {
  if (n <= 2) return '<span class="worker-status-badge ws-available">● Available</span>';
  if (n <= 5) return '<span class="worker-status-badge ws-busy">● Busy</span>';
  return '<span class="worker-status-badge ws-overloaded">● Overloaded</span>';
}

function expStars(n) {
  const yrs = Math.min(Math.round(n / 3), 5);
  return '★'.repeat(yrs) + '☆'.repeat(5 - yrs) + `<span style="font-size:10px;color:var(--text3);margin-left:4px">${n}yr</span>`;
}

function workloadBarHtml(n) {
  const cls = workloadClass(n);
  const pct = Math.min((n / 10) * 100, 100);
  return `
    <div class="wl-bar-wrap ${cls}">
      <div class="wl-bar-track"><div class="wl-bar-fill" style="width:${pct}%"></div></div>
      <div class="wl-count">${n}</div>
    </div>`;
}

function normalizeWorkerRecord(worker) {
  const normalized = { ...worker };
  if (!normalized.role) normalized.role = 'worker';
  if (normalized.role === 'supervisor') {
    normalized.designation = normalized.designation || normalized.title || SUPERVISOR_ROLE_OPTIONS[0];
  }
  return normalized;
}

function supervisorDesignation(worker) {
  return worker.designation || SUPERVISOR_ROLE_OPTIONS[0];
}

// ─── Smart Assignment Suggestion ──────────────────────

/**
 * Returns suggested worker for an issue.
 * - HIGH/CRITICAL priority: score by (experience × 2) − (activeTasks × 3), prefer dept match
 * - Otherwise: lowest activeTasks in matching dept first, then globally
 */
function getWorkerSuggestion(issue) {
  if (!workers.length) return null;
  const dept = ROUTING[issue.issueType] || '';
  const typeCounts = computePriorities(reports);
  const pri = getPriority(issue.issueType, typeCounts);
  const isHighPri = ['critical', 'high'].includes(pri);

  let pool = [...workers];

  if (isHighPri) {
    // Score: experience weight − workload penalty
    pool.sort((a, b) => {
      const scoreA = (a.experience * 2) - (a.activeTasks * 3) + (a.department === dept ? 5 : 0);
      const scoreB = (b.experience * 2) - (b.activeTasks * 3) + (b.department === dept ? 5 : 0);
      return scoreB - scoreA;
    });
  } else {
    // Prefer dept match + lowest workload
    const deptMatch = pool.filter(w => w.department === dept);
    const sorted = (deptMatch.length ? deptMatch : pool).sort((a, b) => a.activeTasks - b.activeTasks);
    return sorted[0] || null;
  }

  return pool[0] || null;
}

// ─── Assign worker to issue ───────────────────────────

window.assignWorkerToIssue = async function (issueId, workerId, fromPanel = false) {
  const issue  = reports.find(r => r.id === issueId);
  const worker = workers.find(w => w.id === workerId);
  if (!issue || !worker) return;

  // Decrement previous worker if already had one
  if (issue.assignedWorkerId && issue.assignedWorkerId !== workerId) {
    const prev = workers.find(w => w.id === issue.assignedWorkerId);
    if (prev && prev.activeTasks > 0) prev.activeTasks--;
  }

  // Assign
  issue.assignedWorkerId   = workerId;
  issue.assignedWorkerName = worker.name;
  issue.assigned           = worker.department;
  if (issue.status === 'submitted') issue.status = 'acknowledged';

  // Increment new worker unless already assigned
  if (issue.assignedWorkerId === workerId) worker.activeTasks++;

  saveWorkers(workers);
  await pushUpdate(issueId, issue.status, `${worker.name} (${worker.department})`, `Assigned to ${worker.name}`);

  refreshAll();
  renderWorkersPage();
  updateWorkerAlertBadge();
  toast(`Issue ${issueId} assigned to ${worker.name}`, 'ok');

  if (fromPanel) {
    // Re-open panel to refresh assignment section
    setTimeout(() => openPanel(issueId), 100);
  }
};

window.unassignWorkerFromIssue = async function (issueId) {
  const issue = reports.find(r => r.id === issueId);
  if (!issue) return;

  if (issue.assignedWorkerId) {
    const prev = workers.find(w => w.id === issue.assignedWorkerId);
    if (prev && prev.activeTasks > 0) prev.activeTasks--;
  }

  issue.assignedWorkerId   = null;
  issue.assignedWorkerName = null;
  issue.assigned           = ROUTING[issue.issueType] || 'Unassigned';

  saveWorkers(workers);
  await pushUpdate(issueId, issue.status, issue.assigned, 'Worker unassigned');

  refreshAll();
  renderWorkersPage();
  updateWorkerAlertBadge();
  toast(`Worker unassigned from ${issueId}`, 'info');
  setTimeout(() => openPanel(issueId), 100);
};

// Call this whenever a status changes to resolved/closed to auto-decrement workload
function onIssueStatusChanged(issue, newStatus) {
  if (['resolved', 'closed'].includes(newStatus) && issue.assignedWorkerId) {
    const worker = workers.find(w => w.id === issue.assignedWorkerId);
    if (worker && worker.activeTasks > 0) {
      worker.activeTasks--;
      saveWorkers(workers);
      renderWorkersPage();
      updateWorkerAlertBadge();
    }
  }
}

// ─── Update alert badge ───────────────────────────────

function updateWorkerAlertBadge() {
  const overloaded = workers.filter(w => w.activeTasks >= 6).length;
  const el = document.getElementById('workerAlertCount');
  if (!el) return;
  el.textContent = overloaded;
  el.classList.toggle('show', overloaded > 0);
}

// ─── Workers Page Renderer ────────────────────────────

window.renderWorkersPage = function () {
  renderWorkerStats();
  renderWorkerTable();
  renderUnassignedList();
  updateWorkerAlertBadge();
};

function renderWorkerStats() {
  const el = document.getElementById('workerStatsRow');
  if (!el) return;

  // Change: Count only supervisors
  const supervisors = workers.filter(w => w.role === 'supervisor');
  const total    = supervisors.length;
  const avgLoad  = supervisors.length ? (supervisors.reduce((s, w) => s + w.activeTasks, 0) / supervisors.length).toFixed(1) : 0;
  const overload = supervisors.filter(w => w.activeTasks >= 6).length;

  // Most loaded dept
  const deptLoad = {};
  supervisors.forEach(w => { deptLoad[w.department] = (deptLoad[w.department] || 0) + w.activeTasks; });
  const topDept = Object.entries(deptLoad).sort((a, b) => b[1] - a[1])[0];

  el.innerHTML = `
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num" style="color:var(--teal)">${total}</div><div class="sc-lbl">Total Officials</div></div>
        <div class="sc-icon" style="background:var(--teal-lt);color:var(--teal)">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
      </div>
      <div class="sc-note">Department Heads</div>
    </div>
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num" style="color:var(--amber)">${avgLoad}</div><div class="sc-lbl">Avg Workload</div></div>
        <div class="sc-icon" style="background:var(--amber-lt);color:var(--amber)">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
      </div>
      <div class="sc-note">Active tasks per official</div>
    </div>
    <div class="scard">
      <div class="sc-top">
        <div><div class="sc-num" style="color:var(--red)">${overload}</div><div class="sc-lbl">Overloaded</div></div>
        <div class="sc-icon" style="background:var(--red-lt);color:var(--red)">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
      </div>
      <div class="sc-note">Officials with 6+ tasks</div>
    </div>
    <div class="scard">
      <div class="sc-top">
        <div>
          <div class="sc-num" style="font-size:14px;color:var(--blue)">${topDept ? topDept[0].split(' ')[0] : '—'}</div>
          <div class="sc-lbl">Busiest Dept</div>
        </div>
        <div class="sc-icon" style="background:var(--blue-lt);color:var(--blue)">
          <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
      </div>
      <div class="sc-note">${topDept ? topDept[1] + ' total tasks' : 'No data'}</div>
    </div>`;
}

function renderWorkerTable() {
  const tbody = document.getElementById('workersTbody');
  const countEl = document.getElementById('workerCount');
  if (!tbody) return;

  // Change: Filter the list to only include Supervisors
  let list = workers.filter(w => w.role === 'supervisor');

  // Apply your existing filters (Dept, Search, etc.) to this supervisor list
  const dept = document.getElementById('wfDept')?.value || '';
  const search = (document.getElementById('wfSearch')?.value || '').toLowerCase();

  if (dept) list = list.filter(w => w.department === dept);
  if (search) list = list.filter(w => w.name.toLowerCase().includes(search));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--text3)">No officials found</td></tr>`;
    return;
  }

  if (countEl) countEl.textContent = `${list.length} official${list.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = list.map((w, i) => {
    return `
      <tr>
        <td><span class="mono-id">${i + 1}</span></td>
        <td>
          <div class="worker-av-wrap">
            <div class="worker-av" style="background:${workerAvColor(w.id)}">${workerInitials(w.name)}</div>
            <div>
              <div class="worker-name">${w.name} (Official)</div>
              <div class="worker-meta">${w.id} · ${supervisorDesignation(w)}${w.phone ? ` · ${w.phone}` : ''}</div>
            </div>
          </div>
        </td>
        <td><span class="dept-tag ${deptClass(w.department)}">${w.department}</span></td>
        <td>${supervisorDesignation(w)}</td>
        <td>${expStars(w.experience)}</td>
        <td>${w.activeTasks}</td>
        <td>${workloadBarHtml(w.activeTasks)}</td>
        <td>${workloadLabel(w.activeTasks)}</td>
        <td><button class="view-worker-btn" onclick="openWorkerDetail('${w.id}')">Manage →</button></td>
      </tr>`;
  }).join('');
}

function renderUnassignedList() {
  const el      = document.getElementById('unassignedList');
  const countEl = document.getElementById('unassignedCount');
  if (!el) return;

  const unassigned = reports.filter(r =>
    !r.assignedWorkerId &&
    !['resolved', 'closed'].includes(r.status)
  );

  if (countEl) countEl.textContent = `${unassigned.length} issue${unassigned.length !== 1 ? 's' : ''}`;

  if (!unassigned.length) {
    el.innerHTML = `<div style="color:var(--green);font-size:13px;padding:8px 0;display:flex;align-items:center;gap:8px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      All active issues have been assigned to a worker!
    </div>`;
    return;
  }

  const typeCounts = computePriorities(reports);
  el.innerHTML = unassigned.slice(0, 10).map(r => {
    const pri = getPriority(r.issueType, typeCounts);
    const suggested = getWorkerSuggestion(r);
    return `
      <div class="unassigned-row">
        <div>${priHTML(pri, typeCounts[r.issueType] || 0)}</div>
        <div class="unassigned-info">
          <div class="unassigned-title">${r.issueType}</div>
          <div class="unassigned-meta"><span class="mono-id">${r.id}</span> · ${r.description.slice(0, 50)}…</div>
        </div>
        ${suggested ? `
          <div style="font-size:11px;color:var(--text3);white-space:nowrap">
            Suggest: <strong style="color:var(--teal)">${suggested.name}</strong>
          </div>
          <button class="assign-btn" onclick="assignWorkerToIssue('${r.id}','${suggested.id}',false)">
            Assign →
          </button>` : ''}
        <button class="btn btn-outline btn-sm" style="font-size:11px" onclick="openPanel('${r.id}')">Open</button>
      </div>`;
  }).join('');

  if (unassigned.length > 10) {
    el.innerHTML += `<div style="font-size:11px;color:var(--text3);padding-top:8px">+${unassigned.length - 10} more unassigned issues — go to All Issues to view</div>`;
  }
}

// ─── Worker Detail Modal ──────────────────────────────

window.openWorkerDetail = function (workerId) {
  const w = workers.find(x => x.id === workerId);
  if (!w) return;

  const color = workerAvColor(w.id);
  const assignedIssues = reports.filter(r => r.assignedWorkerId === workerId);
  const active = assignedIssues.filter(r => !['resolved','closed'].includes(r.status));
  const done   = assignedIssues.filter(r => ['resolved','closed'].includes(r.status));

  document.getElementById('workerDetailTitle').textContent = w.name;

  document.getElementById('workerDetailBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="worker-av" style="background:${color};width:52px;height:52px;font-size:18px">${workerInitials(w.name)}</div>
      <div>
        <div style="font-family:var(--head);font-size:17px;font-weight:700;color:var(--text)">${w.name}</div>
        <div style="margin-top:4px">
          <span class="dept-tag ${deptClass(w.department)}">${deptIcon(w.department)} ${w.department}</span>
        </div>
        <div style="font-size:12px;color:var(--text3);margin-top:6px">${supervisorDesignation(w)}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        ${workloadLabel(w.activeTasks)}
        <div style="font-size:12px;color:var(--text3);margin-top:4px">${w.activeTasks} active task${w.activeTasks !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <div class="ig" style="margin-bottom:18px">
      <div class="ic"><label>Official ID</label><div class="v m">${w.id}</div></div>
      <div class="ic"><label>Role</label><div class="v">${supervisorDesignation(w)}</div></div>
      <div class="ic"><label>Experience</label><div class="v"><span class="exp-stars">${expStars(w.experience)}</span></div></div>
      <div class="ic"><label>Phone</label><div class="v">${w.phone || '—'}</div></div>
      <div class="ic"><label>Tasks Completed</label><div class="v" style="color:var(--green)">${done.length}</div></div>
    </div>

    <div class="p-sec-lbl">Workload Bar</div>
    <div style="margin:8px 0 18px">${workloadBarHtml(w.activeTasks)}</div>

    <div class="p-sec-lbl">Active Assignments (${active.length})</div>
    <div style="margin-bottom:18px">
      ${active.length ? active.map(r => `
        <div class="assigned-issue-row" onclick="openPanel('${r.id}')">
          ${badge(r.status)}
          <span class="type-pill">${r.issueType}</span>
          <span style="flex:1;font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description.slice(0,60)}…</span>
          <span class="mono-id">${r.id}</span>
        </div>`).join('')
        : '<div style="font-size:12px;color:var(--text3)">No active assignments.</div>'}
    </div>

    <div class="p-sec-lbl">Completed (${done.length})</div>
    <div>
      ${done.length ? done.slice(0,5).map(r => `
        <div class="assigned-issue-row" style="opacity:.7" onclick="openPanel('${r.id}')">
          ${badge(r.status)}
          <span class="type-pill">${r.issueType}</span>
          <span style="flex:1;font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description.slice(0,60)}…</span>
          <span class="mono-id">${r.id}</span>
        </div>`).join('')
        : '<div style="font-size:12px;color:var(--text3)">None yet.</div>'}
    </div>`;

  document.getElementById('workerDetailFt').innerHTML = `
    <button class="btn btn-outline" onclick="openEditWorkerModal('${w.id}')">✏️ Edit</button>
    <button class="btn btn-outline" style="color:var(--red);border-color:var(--red)" onclick="deleteWorker('${w.id}');closeWorkerDetailModal()">Remove Official</button>
    <button class="btn btn-outline" style="margin-left:auto" onclick="closeWorkerDetailModal()">Close</button>`;

  document.getElementById('workerDetailBackdrop').classList.add('open');
  document.getElementById('workerDetailModal').classList.add('open');
};

window.closeWorkerDetailModal = function () {
  document.getElementById('workerDetailBackdrop').classList.remove('open');
  document.getElementById('workerDetailModal').classList.remove('open');
};

// ─── Add Worker Modal ─────────────────────────────────

let editingWorkerId = null;

window.openAddWorkerModal = function () {
  editingWorkerId = null;
  document.getElementById('modalTitle').textContent = 'Add New Official';
  document.getElementById('saveWorkerBtn').textContent = 'Save Official';
  ['wName','wEmpId','wPhone'].forEach(id => (document.getElementById(id).value = ''));
  document.getElementById('wDept').value = '';
  document.getElementById('wRole').value = '';
  document.getElementById('wExp').value  = '';
  document.getElementById('workersListView').classList.add('worker-view-hidden');
  document.getElementById('workerFormView').classList.add('open');
  setTimeout(() => document.getElementById('wName').focus(), 200);
};

window.openEditWorkerModal = function (workerId) {
  const w = workers.find(x => x.id === workerId);
  if (!w) return;
  editingWorkerId = workerId;
  document.getElementById('modalTitle').textContent = 'Edit Official';
  document.getElementById('saveWorkerBtn').textContent = 'Update Official';
  document.getElementById('wName').value  = w.name;
  document.getElementById('wDept').value  = w.department;
  document.getElementById('wRole').value  = supervisorDesignation(w);
  document.getElementById('wExp').value   = w.experience;
  document.getElementById('wEmpId').value = w.id;
  document.getElementById('wPhone').value = w.phone || '';
  closeWorkerDetailModal();
  document.getElementById('workersListView').classList.add('worker-view-hidden');
  document.getElementById('workerFormView').classList.add('open');
  setTimeout(() => document.getElementById('wName').focus(), 200);
};

window.closeAddWorkerModal = function () {
  document.getElementById('workersListView').classList.remove('worker-view-hidden');
  document.getElementById('workerFormView').classList.remove('open');
  editingWorkerId = null;
};

window.saveWorker = function () {
  const name = document.getElementById('wName').value.trim();
  const dept = document.getElementById('wDept').value;
  const designation = document.getElementById('wRole').value;
  const exp  = parseInt(document.getElementById('wExp').value) || 0;
  const empId = document.getElementById('wEmpId').value.trim();
  const phone = document.getElementById('wPhone').value.trim();

  if (!name) { toast('Official name is required', 'err'); return; }
  if (!dept) { toast('Please select a department', 'err'); return; }
  if (!designation) { toast('Please select a role', 'err'); return; }

  if (editingWorkerId) {
    const w = workers.find(x => x.id === editingWorkerId);
    if (w) {
      w.name       = name;
      w.department = dept;
      w.designation = designation;
      w.experience = exp;
      w.phone      = phone;
      saveWorkers(workers);
      closeAddWorkerModal();
      renderWorkersPage();
      toast(`${name} updated`, 'ok');
    }
    return;
  }

  const newId = empId || ('S' + String(Date.now()).slice(-5));
  if (workers.find(w => w.id === newId)) {
    toast('Official ID already exists', 'err'); return;
  }

  workers.push(normalizeWorkerRecord({ id: newId, name, role: 'supervisor', designation, department: dept, experience: exp, activeTasks: 0, phone }));
  saveWorkers(workers);
  closeAddWorkerModal();
  renderWorkersPage();
  toast(`${name} added to ${dept}`, 'ok');
};

window.deleteWorker = function (workerId) {
  const w = workers.find(x => x.id === workerId);
  if (!w) return;
  if (!confirm(`Remove official "${w.name}" from the roster? Their active assignments will be unassigned.`)) return;

  // Unassign their issues
  reports.forEach(r => {
    if (r.assignedWorkerId === workerId) {
      r.assignedWorkerId   = null;
      r.assignedWorkerName = null;
    }
  });

  workers = workers.filter(x => x.id !== workerId);
  saveWorkers(workers);
  renderWorkersPage();
  refreshAll();
  toast(`${w.name} removed`, 'info');
};

// ─── Clear worker filters ─────────────────────────────

window.clearWorkerFilters = function () {
  ['wfDept','wfWorkload'].forEach(id => (document.getElementById(id).value = ''));
  document.getElementById('wfSearch').value = '';
  renderWorkersPage();
};

// ─── Export workers CSV ────────────────────────────────

window.exportWorkersCSV = function () {
  const rows = [
    ['ID','Name','Department','Role','Experience (yrs)','Active Tasks','Phone'],
    ...workers
      .filter(w => w.role === 'supervisor')
      .map(w => [w.id, `"${w.name}"`, `"${w.department}"`, `"${supervisorDesignation(w)}"`, w.experience, w.activeTasks, w.phone || '']),
  ];
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
  a.download = `civic-workers-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('Officials CSV exported', 'ok');
};

// ─── Panel enhancement: Worker Assignment Section ─────

// Patch openPanel to inject worker assignment UI
const _origOpenPanel = window.openPanel;
window.openPanel = function (id) {
  _origOpenPanel(id);
  syncOpenPanelLocation(id);
  // DISABLE this line to hide individual workers from the Admin
  // setTimeout(() => injectWorkerAssignmentSection(id), 50);
  // Instead, ensure your new Supervisor assignment logic is there (see previous prompt)
};

function isAdminView() {
  return (
    document.body?.dataset?.view === 'admin' ||
    document.body?.dataset?.role === 'admin' ||
    document.body?.classList?.contains('admin-view') ||
    window.currentView === 'admin' ||
    window.CURRENT_VIEW === 'admin'
  );
}

function injectWorkerAssignmentSection(issueId) {
  if (isAdminView()) return;
  const r = reports.find(x => x.id === issueId);
  if (!r) return;

  // Find panelBody and append our section before the last p-sec (timeline)
  const panelBody = document.getElementById('panelBody');
  if (!panelBody) return;

  // Remove existing worker section if present
  const existing = panelBody.querySelector('.worker-assign-inject');
  if (existing) existing.remove();

  const typeCounts = computePriorities(reports);
  const pri        = getPriority(r.issueType, typeCounts);
  const isHighPri  = ['critical', 'high'].includes(pri);
  const dept       = ROUTING[r.issueType] || '';
  const suggested  = getWorkerSuggestion(r);

  // Workers filtered by dept first, then rest
  const deptWorkers   = workers.filter(w => w.department === dept);
  const otherWorkers  = workers.filter(w => w.department !== dept);
  const displayList   = [...deptWorkers.sort((a,b) => a.activeTasks - b.activeTasks),
                         ...otherWorkers.sort((a,b) => a.activeTasks - b.activeTasks)].slice(0, 8);

  const currentWorker = r.assignedWorkerId ? workers.find(w => w.id === r.assignedWorkerId) : null;

  const section = document.createElement('div');
  section.className = 'p-sec worker-assign-inject';
  section.innerHTML = `
    <div class="p-sec-lbl">Worker Assignment</div>
    ${isHighPri ? `<div style="background:var(--red-lt);border:1px solid #f5b8b8;border-radius:7px;padding:7px 12px;font-size:12px;color:#8B1A1A;margin-bottom:10px">
      ⚠️ <strong>${pri.toUpperCase()} priority</strong> — recommending most experienced + least loaded worker
    </div>` : ''}
    ${currentWorker ? `
      <div style="background:var(--green-lt);border:1.5px solid var(--green);border-radius:9px;padding:9px 12px;display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="worker-av" style="background:${workerAvColor(currentWorker.id)};width:28px;height:28px;font-size:11px">${workerInitials(currentWorker.name)}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--green)">✓ Assigned to ${currentWorker.name}</div>
          <div style="font-size:11px;color:var(--text3)">${currentWorker.department} · ${currentWorker.activeTasks} active tasks</div>
        </div>
        <button class="assign-btn unassign-btn" onclick="unassignWorkerFromIssue('${issueId}')">Unassign</button>
      </div>` : ''}
    ${displayList.length ? displayList.map(w => {
      const isSuggested = suggested?.id === w.id;
      const isAssigned  = r.assignedWorkerId === w.id;
      return `
        <div class="worker-card ${isSuggested ? 'suggested' : ''} ${isAssigned ? 'assigned-active' : ''}">
          ${isSuggested ? '<div class="suggest-badge">⭐ Recommended</div>' : ''}
          <div class="worker-av" style="background:${workerAvColor(w.id)};width:28px;height:28px;font-size:11px">${workerInitials(w.name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text)">${w.name}</div>
            <div style="font-size:10px;color:var(--text3)">${w.department} · ${expStars(w.experience)}</div>
          </div>
          <div>${workloadBarHtml(w.activeTasks)}</div>
          ${isAssigned
            ? `<button class="assign-btn unassign-btn" onclick="unassignWorkerFromIssue('${issueId}')">Unassign</button>`
            : `<button class="assign-btn" onclick="assignWorkerToIssue('${issueId}','${w.id}',true)">Assign</button>`}
        </div>`;
    }).join('')
    : '<div style="font-size:12px;color:var(--text3)">No workers available.</div>'}
    ${workers.length > 8 ? `<div style="font-size:11px;color:var(--text3);margin-top:4px">Showing top 8 workers. Go to Workers page to see all.</div>` : ''}`;

  // Insert before the last p-sec (timeline)
  const secs = panelBody.querySelectorAll('.p-sec');
  const last  = secs[secs.length - 1];
  if (last) panelBody.insertBefore(section, last);
  else panelBody.appendChild(section);
}

// ─── Patch saveUpdate to trigger workload decrement ───

const _origSaveUpdate = window.saveUpdate;
window.saveUpdate = async function (id) {
  const r = reports.find(x => x.id === id);
  const prevStatus = r?.status;
  await _origSaveUpdate(id);
  const newStatus = r?.status;
  if (prevStatus !== newStatus) onIssueStatusChanged(r, newStatus);
};

// ─── Wire workers page into nav ───────────────────────

const _origNav = window.nav;
window.nav = function (page) {
  _origNav(page);
  if (page === 'workers') renderWorkersPage();
};

// ─── Init worker badge on load ────────────────────────

updateWorkerAlertBadge();


// ══════════════════════════════════════════════════════════
//  PROOF OF EXECUTION SYSTEM
//  Stores proof data in localStorage (proofStore).
//  Status flow: submitted→acknowledged→in_progress→completed→verified
// ══════════════════════════════════════════════════════════

const POE_STORE_KEY = 'civicdesk_poe_v1';
const POE_FLOW = ['submitted','acknowledged','in_progress','completed','verified','resolved','closed'];
const POE_FLOW_LABELS = ['Submitted','Acknowledged','In Progress','Completed','Verified','Resolved','Closed'];

// ─── PoE localStorage store ───────────────────────────

function loadPoeStore() {
  try { return JSON.parse(localStorage.getItem(POE_STORE_KEY) || '{}'); } catch { return {}; }
}
function savePoeStore(s) {
  try { localStorage.setItem(POE_STORE_KEY, JSON.stringify(s)); } catch {}
}

let poeStore = loadPoeStore();

function getPoe(issueId) { return poeStore[issueId] || {}; }

function setPoe(issueId, data) {
  poeStore[issueId] = { ...(poeStore[issueId] || {}), ...data };
  savePoeStore(poeStore);
}

// ─── Current issue being acted on ─────────────────────
let poeCurrentIssueId  = null;
let poeSelectedFile    = null;
let verifyCurrentIssueId = null;
let ratingCurrentIssueId = null;
let currentRatingValue   = 0;

// ─── Status Flow Bar HTML ──────────────────────────────

function statusFlowBarHtml(currentStatus) {
  const si = POE_FLOW.indexOf(currentStatus);
  return `<div class="status-flow-bar">` +
    POE_FLOW.map((s, i) => {
      const done = i < si;
      const cur  = i === si;
      const cls  = done ? 'done' : cur ? 'cur' : '';
      const icon = done ? '✓' : (i + 1);
      return `
        <div class="sf-step">
          <div class="sf-marker">
            <div class="sf-dot ${cls}"></div>
            <div class="sf-line ${done ? 'done' : ''}"></div>
          </div>
          <div class="sf-dot-wrap">
            <div class="sf-content">
              <div class="sf-label ${cls}">${POE_FLOW_LABELS[i]}</div>
              <div class="sf-meta">${done ? 'Completed' : cur ? 'Current stage' : 'Upcoming stage'}</div>
            </div>
          </div>
        </div>`;
    }).join('') +
  `</div>`;
}

// ─── Stars HTML helper ─────────────────────────────────

function starsHtml(n, total = 5) {
  return Array.from({length: total}, (_, i) =>
    `<span class="${i < n ? 'star-filled' : 'star-empty'}">★</span>`
  ).join('');
}

// ─── Inject PoE section into the slide panel ──────────

function injectPoESection(issueId) {
  const r = reports.find(x => x.id === issueId);
  if (!r) return;

  const panelBody = document.getElementById('panelBody');
  if (!panelBody) return;

  // Remove old PoE section if present
  panelBody.querySelector('.poe-inject')?.remove();

  const poe = getPoe(issueId);
  const beforeUrl = r.images?.[0]?.url || null;
  const siTimeline = STATUS_FLOW.indexOf(r.status);
  const timelineHtml = `
    <div class="poe-flow-card">
      <div class="p-sec-lbl">Activity Timeline</div>
      <div class="tl">
        ${[
          { what: 'Report submitted by citizen',    when: r.timestampDisplay || fmt(r.timestamp), state: 'done' },
          { what: 'Received by authority server',   when: '—', state: r.status !== 'saved_offline' ? 'done' : '' },
          { what: 'Assigned to supervisor',         when: '—', state: siTimeline >= 2 ? 'done' : siTimeline === 1 ? 'cur' : '' },
          { what: 'Acknowledged by department',     when: '—', state: siTimeline >= 3 ? 'done' : siTimeline === 2 ? 'cur' : '' },
          { what: 'Field team in progress',         when: '—', state: siTimeline >= 4 ? 'done' : siTimeline === 3 ? 'cur' : '' },
          { what: 'Issue resolved',                 when: '—', state: siTimeline >= 5 ? 'done' : siTimeline === 4 ? 'cur' : '' },
          { what: 'Closed',                         when: '—', state: siTimeline >= 6 ? 'done' : siTimeline === 5 ? 'cur' : '' },
        ].map((t, idx) => `
          <div class="tl-item ${t.state}">
            <div class="tl-dot">${idx + 1}</div>
            <div class="tl-when">${t.when}</div>
            <div class="tl-what">${t.what}</div>
          </div>`).join('')}
      </div>
    </div>`;

  const section = document.createElement('div');
  section.className = 'p-sec poe-inject';

  // ── Build PoE section content by status ──────────────
  let inner = '';

  // Status flow bar always on top
  inner += `<div class="p-sec-lbl">📍 Status Flow</div>`;
  inner += statusFlowBarHtml(r.status);
  inner = `
    <div class="poe-flow-layout">
      <div class="poe-flow-card">${inner}</div>
      ${timelineHtml}
    </div>`;

  // ── Worker: In Progress → show upload proof button ───
  if (r.status === 'in_progress') {
    inner += `
      <div class="poe-panel-section">
        <div style="font-size:12px;font-weight:700;color:#3336CC;margin-bottom:6px">📸 Proof of Execution</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Worker must upload an after-photo and mark this issue as Completed.</div>
        ${beforeUrl ? `
          <div class="poe-img-col" style="margin-bottom:10px">
            <div class="poe-img-lbl">Before Photo (Citizen)</div>
            <img class="poe-img-thumb" src="${beforeUrl}" onclick="openLbUrl('${beforeUrl}')" alt="Before"/>
          </div>` : ''}
        <button class="worker-proof-btn" onclick="openPoeModal('${issueId}')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Upload Proof & Mark Completed
        </button>
      </div>`;
  }

  // ── Completed → show proof + admin verify buttons ────
  else if (r.status === 'completed') {
    const proofUrl = poe.proofImageUrl || null;
    inner += `
      <div class="poe-panel-section">
        <div style="font-size:12px;font-weight:700;color:#3336CC;margin-bottom:4px">📸 Proof Submitted — Awaiting Admin Verification</div>
        ${poe.proofNote ? `<div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-style:italic">"${poe.proofNote}"</div>` : ''}
        <div class="poe-compare-mini">
          <div class="poe-img-col">
            <div class="poe-img-lbl">Before (Citizen)</div>
            ${beforeUrl
              ? `<img class="poe-img-thumb" src="${beforeUrl}" onclick="openLbUrl('${beforeUrl}')" alt="Before"/>`
              : `<div class="poe-no-img">No before photo</div>`}
          </div>
          <div class="poe-img-col">
            <div class="poe-img-lbl">After (Worker Proof)</div>
            ${proofUrl
              ? `<img class="poe-img-thumb" src="${proofUrl}" onclick="openLbUrl('${proofUrl}')" alt="After"/>`
              : `<div class="poe-no-img">No proof uploaded</div>`}
          </div>
        </div>
        <div class="poe-action-row">
          <button class="poe-approve-btn" onclick="adminApproveFromPanel('${issueId}')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Approve
          </button>
          <button class="poe-reject-btn" onclick="adminRejectFromPanel('${issueId}')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </button>
          <button class="poe-full-compare-btn" onclick="openVerifyModal('${issueId}')">Full View</button>
        </div>
      </div>`;
  }

  // ── Verified → show green banner + rating prompt ─────
  else if (r.status === 'verified') {
    const proofUrl = poe.proofImageUrl || null;
    inner += `
      <div class="verified-banner">
        <div class="verified-icon">✅</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">Admin Verified</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${poe.adminNote ? `"${poe.adminNote}"` : 'Work approved as complete'}</div>
        </div>
      </div>
      <div class="poe-compare-mini" style="margin-bottom:10px">
        <div class="poe-img-col">
          <div class="poe-img-lbl">Before</div>
          ${beforeUrl ? `<img class="poe-img-thumb" src="${beforeUrl}" onclick="openLbUrl('${beforeUrl}')" alt="Before"/>` : `<div class="poe-no-img">—</div>`}
        </div>
        <div class="poe-img-col">
          <div class="poe-img-lbl">After (Verified)</div>
          ${proofUrl ? `<img class="poe-img-thumb" src="${proofUrl}" onclick="openLbUrl('${proofUrl}')" alt="After"/>` : `<div class="poe-no-img">—</div>`}
        </div>
      </div>`;

    // Rating prompt if not yet rated
    const existingRating = poe.rating || null;
    if (!existingRating) {
      inner += `
        <div style="background:var(--amber-lt);border:1.5px solid #f0dc80;border-radius:9px;padding:10px 14px;display:flex;align-items:center;gap:12px">
          <span style="font-size:20px">⭐</span>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:#7A5A00">Citizen Feedback Pending</div>
            <div style="font-size:11px;color:var(--text3)">Ask citizen to rate the resolution</div>
          </div>
          <button class="poe-full-compare-btn" style="border-color:#f0dc80" onclick="openRatingModal('${issueId}')">Rate Now</button>
        </div>`;
    } else {
      inner += `
        <div class="feedback-display">
          <div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px">Citizen Rating</div>
          <div class="feedback-stars">${starsHtml(existingRating)}</div>
          <div style="font-size:13px;font-weight:700;color:#92400E">${existingRating}/5 stars</div>
          ${poe.ratingComment ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;font-style:italic">"${poe.ratingComment}"</div>` : ''}
        </div>`;
    }
  }

  // ── Rejected → show red banner + re-upload note ──────
  else if (poe.rejected) {
    inner += `
      <div class="rejected-banner">
        <span style="font-size:22px">❌</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--red)">Proof Rejected — Back to In Progress</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${poe.adminNote ? `Admin note: "${poe.adminNote}"` : 'Re-upload better proof photo'}</div>
        </div>
      </div>`;
  }

  section.innerHTML = `<div class="p-sec-lbl">Proof of Execution</div>${inner}`;

  // Insert as second-to-last p-sec (before timeline)
  const secs = panelBody.querySelectorAll('.p-sec');
  const last = secs[secs.length - 1];
  if (last) panelBody.insertBefore(section, last);
  else panelBody.appendChild(section);

  [...panelBody.querySelectorAll('.p-sec')]
    .filter(sec => sec !== section && sec.querySelector('.p-sec-lbl')?.textContent?.trim() === 'Activity Timeline')
    .forEach(sec => sec.remove());
}

// ─── Open URL in lightbox ──────────────────────────────

window.openLbUrl = function (url) {
  document.getElementById('lbImg').src = url;
  document.getElementById('lightbox').classList.add('open');
};

// ─── Worker: Proof Upload Modal ───────────────────────

window.openPoeModal = function (issueId) {
  const r = reports.find(x => x.id === issueId);
  if (!r) return;
  poeCurrentIssueId = issueId;
  poeSelectedFile   = null;

  // Reset UI
  document.getElementById('poeNote').value = '';
  document.getElementById('poePreview').style.display = 'none';
  document.getElementById('poeUploadInner').style.display = 'flex';
  document.getElementById('poeUploadZone').classList.remove('has-file');
  document.getElementById('poeFileInput').value = '';

  // Info bar
  const typeCounts = computePriorities(reports);
  const pri = getPriority(r.issueType, typeCounts);
  document.getElementById('poeInfoBar').innerHTML = `
    ${badge(r.status)} ${priHTML(pri, typeCounts[r.issueType] || 0)}
    <span style="font-size:12px;color:var(--text2)">${r.issueType}</span>
    <span class="mono-id">${r.id}</span>`;

  // Show before photo if citizen uploaded one
  const beforeUrl = r.images?.[0]?.url || null;
  const bs = document.getElementById('poeBeforeSection');
  if (beforeUrl) {
    document.getElementById('poeBeforeImg').src = beforeUrl;
    bs.style.display = 'block';
  } else {
    bs.style.display = 'none';
  }

  document.getElementById('poeBackdrop').classList.add('open');
  document.getElementById('poeModal').classList.add('open');
};

window.closePoeModal = function () {
  document.getElementById('poeBackdrop').classList.remove('open');
  document.getElementById('poeModal').classList.remove('open');
  poeCurrentIssueId = null;
  poeSelectedFile   = null;
};

window.handlePoeFileSelect = function (event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('File too large — max 10MB', 'err'); return; }

  poeSelectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('poePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('poeUploadInner').style.display = 'none';
    document.getElementById('poeUploadZone').classList.add('has-file');
  };
  reader.readAsDataURL(file);
};

window.submitProofOfExecution = async function () {
  if (!poeCurrentIssueId) return;
  if (!poeSelectedFile)  { toast('Please upload a proof photo', 'err'); return; }

  const r = reports.find(x => x.id === poeCurrentIssueId);
  if (!r) return;

  const btn = document.getElementById('poeSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  // Convert image to base64 data URL (stored locally)
  const proofDataUrl = await fileToDataUrl(poeSelectedFile);
  const note = document.getElementById('poeNote').value.trim();

  // Save to PoE store
  setPoe(poeCurrentIssueId, {
    proofImageUrl:   proofDataUrl,
    proofNote:       note,
    proofUploadedAt: new Date().toISOString(),
    rejected:        false,
  });

  // Update issue status
  r.status = 'completed';
  await pushUpdate(poeCurrentIssueId, 'completed', r.assigned, `Proof uploaded: ${note || 'No note'}`);

  closePoeModal();
  refreshAll();
  toast(`Proof submitted for ${poeCurrentIssueId} — awaiting admin verification`, 'ok');
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Admin: Verify Modal (full before/after view) ─────

window.openVerifyModal = function (issueId) {
  const r = reports.find(x => x.id === issueId);
  if (!r) return;
  verifyCurrentIssueId = issueId;

  const poe = getPoe(issueId);
  const beforeUrl = r.images?.[0]?.url || null;
  const afterUrl  = poe.proofImageUrl  || null;

  // Info bar
  const typeCounts = computePriorities(reports);
  const pri = getPriority(r.issueType, typeCounts);
  document.getElementById('verifyInfoBar').innerHTML = `
    ${badge(r.status)} ${priHTML(pri, typeCounts[r.issueType] || 0)}
    <span style="font-size:12px;color:var(--text2)">${r.issueType}</span>
    <span class="mono-id">${r.id}</span>
    ${r.assignedWorkerName ? `<span style="font-size:12px;color:var(--teal)">Worker: ${r.assignedWorkerName}</span>` : ''}`;

  // Before image
  const bImg = document.getElementById('verifyBeforeImg');
  const bNone = document.getElementById('verifyBeforeNoImg');
  if (beforeUrl) { bImg.src = beforeUrl; bImg.style.display = 'block'; bNone.style.display = 'none'; }
  else           { bImg.style.display = 'none'; bNone.style.display = 'flex'; }

  // After image
  const aImg = document.getElementById('verifyAfterImg');
  const aNone = document.getElementById('verifyAfterNoImg');
  if (afterUrl) { aImg.src = afterUrl; aImg.style.display = 'block'; aNone.style.display = 'none'; }
  else          { aImg.style.display = 'none'; aNone.style.display = 'flex'; }

  // Worker note
  const noteBox = document.getElementById('verifyNoteBox');
  noteBox.textContent = poe.proofNote ? `Worker note: "${poe.proofNote}"` : '';

  document.getElementById('adminVerifyNote').value = '';

  document.getElementById('verifyBackdrop').classList.add('open');
  document.getElementById('verifyModal').classList.add('open');
};

window.closeVerifyModal = function () {
  document.getElementById('verifyBackdrop').classList.remove('open');
  document.getElementById('verifyModal').classList.remove('open');
  verifyCurrentIssueId = null;
};

window.adminApproveIssue = async function () {
  if (!verifyCurrentIssueId) return;
  const note = document.getElementById('adminVerifyNote').value.trim();
  await _adminApprove(verifyCurrentIssueId, note);
  closeVerifyModal();
};

window.adminRejectIssue = async function () {
  if (!verifyCurrentIssueId) return;
  const note = document.getElementById('adminVerifyNote').value.trim();
  await _adminReject(verifyCurrentIssueId, note);
  closeVerifyModal();
};

// Panel quick-action buttons
window.adminApproveFromPanel = async function (issueId) {
  const note = prompt('Admin approval note (optional):') || '';
  await _adminApprove(issueId, note);
};

window.adminRejectFromPanel = async function (issueId) {
  const note = prompt('Rejection reason (required):') || 'Proof insufficient';
  await _adminReject(issueId, note);
};

async function _adminApprove(issueId, note) {
  const r = reports.find(x => x.id === issueId);
  if (!r) return;

  setPoe(issueId, { adminVerified: true, adminNote: note, verifiedAt: new Date().toISOString(), rejected: false });
  r.status = 'verified';
  r.adminVerified = true;
  r.adminNote = note;

  await pushUpdate(issueId, 'verified', r.assigned, `Admin approved: ${note || 'Verified OK'}`);
  refreshAll();
  toast(`✅ ${issueId} verified and approved`, 'ok');

  // Refresh panel if open
  if (document.getElementById('panel')?.classList.contains('open')) {
    setTimeout(() => openPanel(issueId), 80);
  }
}

async function _adminReject(issueId, note) {
  const r = reports.find(x => x.id === issueId);
  if (!r) return;

  setPoe(issueId, { adminVerified: false, adminNote: note, rejected: true, proofImageUrl: null });
  r.status = 'in_progress';
  r.adminVerified = false;

  await pushUpdate(issueId, 'in_progress', r.assigned, `Admin rejected proof: ${note}`);
  refreshAll();
  toast(`❌ Proof rejected — ${issueId} sent back to In Progress`, 'err');

  if (document.getElementById('panel')?.classList.contains('open')) {
    setTimeout(() => openPanel(issueId), 80);
  }
}

// ─── Citizen: Star Rating Modal ───────────────────────

window.openRatingModal = function (issueId) {
  const r = reports.find(x => x.id === issueId);
  if (!r) return;
  ratingCurrentIssueId = issueId;
  currentRatingValue   = 0;

  document.getElementById('ratingIssueInfo').innerHTML = `
    <strong>${r.issueType}</strong> — <span class="mono-id">${r.id}</span><br>
    <span style="font-size:12px;color:var(--text3)">${r.description?.slice(0, 80)}…</span>`;

  document.getElementById('ratingComment').value = '';
  document.getElementById('ratingLabel').textContent = 'Select a rating';
  document.getElementById('ratingLabel').classList.remove('rated');
  document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));

  document.getElementById('ratingBackdrop').classList.add('open');
  document.getElementById('ratingModal').classList.add('open');
};

window.closeRatingModal = function () {
  document.getElementById('ratingBackdrop').classList.remove('open');
  document.getElementById('ratingModal').classList.remove('open');
  ratingCurrentIssueId = null;
};

const RATING_LABELS = ['', '😞 Poor', '😐 Fair', '😊 Good', '😃 Very Good', '🤩 Excellent!'];

window.setRating = function (val) {
  currentRatingValue = val;
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
  const lbl = document.getElementById('ratingLabel');
  lbl.textContent = RATING_LABELS[val] || '';
  lbl.classList.add('rated');
};

window.submitRating = async function () {
  if (!ratingCurrentIssueId) return;
  if (!currentRatingValue)   { toast('Please select a rating', 'err'); return; }

  const comment = document.getElementById('ratingComment').value.trim();
  const r = reports.find(x => x.id === ratingCurrentIssueId);
  if (!r) return;

  setPoe(ratingCurrentIssueId, {
    rating:        currentRatingValue,
    ratingComment: comment,
    ratingAt:      new Date().toISOString(),
  });

  r.rating        = currentRatingValue;
  r.ratingComment = comment;

  await pushUpdate(ratingCurrentIssueId, r.status, r.assigned, `Citizen rated: ${currentRatingValue}/5 — ${comment}`);
  closeRatingModal();
  refreshAll();
  toast(`⭐ Feedback recorded — ${currentRatingValue}/5 stars`, 'ok');

  // Refresh panel
  if (document.getElementById('panel')?.classList.contains('open')) {
    setTimeout(() => openPanel(ratingCurrentIssueId), 80);
  }
};

// ─── Patch openPanel (chain with worker inject) ────────

// The worker system already patched openPanel once — we patch again here
const _poeOrigOpenPanel = window.openPanel;
window.openPanel = function (id) {
  _poeOrigOpenPanel(id);
  syncOpenPanelLocation(id);
  setTimeout(() => injectPoESection(id), 80);
};

// ─── DB reference schema (documentation comment) ──────
/*
  MYSQL SCHEMA (reference — for backend integration):

  CREATE TABLE issues (
    id              VARCHAR(50) PRIMARY KEY,
    issue_type      VARCHAR(80),
    description     TEXT,
    priority        ENUM('low','medium','high','critical'),
    location_lat    DECIMAL(10,7),
    location_lng    DECIMAL(10,7),
    location_name   VARCHAR(255),
    status          ENUM('submitted','acknowledged','in_progress','completed','verified','resolved','closed') DEFAULT 'submitted',
    assigned_dept   VARCHAR(80),
    assigned_worker_id VARCHAR(20),
    before_image_url TEXT,
    proof_image_url  TEXT,
    proof_note       TEXT,
    proof_uploaded_at DATETIME,
    admin_verified   TINYINT(1),
    admin_note       TEXT,
    citizen_rating   TINYINT,
    rating_comment   TEXT,
    rating_at        DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE workers (
    id           VARCHAR(20) PRIMARY KEY,
    name         VARCHAR(100),
    department   VARCHAR(80),
    experience   INT,
    active_tasks INT DEFAULT 0,
    phone        VARCHAR(20)
  );

  REST API ENDPOINTS:
  POST   /api/issues/:id/proof           — worker uploads proof image
  PATCH  /api/issues/:id/verify          — admin approves (body: {approved:true, note})
  PATCH  /api/issues/:id/verify          — admin rejects (body: {approved:false, note})
  POST   /api/issues/:id/rating          — citizen submits rating (body: {rating, comment})
  GET    /api/issues/:id/proof           — get before/after images for comparison
*/






