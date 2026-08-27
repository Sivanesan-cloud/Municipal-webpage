import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";

/* ── CONSTANTS ── */
const WARD_OPTIONS = Array.from({ length: 15 }, (_, i) => `Ward ${i + 1}`);
const CATEGORY_OPTIONS = ["Potholes", "Streetlights", "Garbage", "Footpath", "Drainage", "Water Supply"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const STATUS_OPTIONS = ["Pending", "Assigned", "In Progress", "Resolved"];

const OFFICIALS = ["Arun Kumar", "Karthik", "Ravi Kumar", "Suresh"];

const INITIAL_PINS = [
  {
    id: "CMP-1024",
    issue: "Deep pothole on Main St.",
    category: "Roads",
    ward: "Ward 5",
    priority: "High",
    status: "Pending",
    date: "Oct 24, 2023",
    location: "Main Street, Ward 5",
    gps: "11.0168, 76.9558",
    official: "Unassigned",
    desc: "A very deep and dangerous pothole has formed in the middle of Main Street.",
    x: 230, y: 140, // Map relative coordinates (SVG space 0-600)
    img: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=100&auto=format&fit=crop&q=60"
  },
  {
    id: "CMP-1023",
    issue: "Streetlight not working",
    category: "Electrical",
    ward: "Ward 12",
    priority: "Low",
    status: "Assigned",
    date: "Oct 23, 2023",
    location: "12th Cross Junction, Ward 12",
    gps: "11.0201, 76.9612",
    official: "Arun Kumar",
    desc: "The street lamp at the junction of 12th Cross has been flickering.",
    x: 480, y: 80,
    img: ""
  },
  {
    id: "CMP-1022",
    issue: "Garbage pile buildup",
    category: "Sanitation",
    ward: "Ward 2",
    priority: "Medium",
    status: "In Progress",
    date: "Oct 22, 2023",
    location: "Market Road Corner, Ward 2",
    gps: "11.0112, 76.9451",
    official: "Karthik",
    desc: "Large pile of waste has accumulated at the corner of Market Road.",
    x: 120, y: 220,
    img: ""
  },
  {
    id: "CMP-1021",
    issue: "Water leakage near park",
    category: "Water Supply",
    ward: "Ward 9",
    priority: "High",
    status: "Resolved",
    date: "Oct 20, 2023",
    location: "Park Avenue Road, Ward 9",
    gps: "11.0255, 76.9701",
    official: "Ravi Kumar",
    desc: "A drinking water main pipeline is leaking heavily near the park entrance.",
    x: 350, y: 190,
    img: ""
  },
  {
    id: "CMP-1020",
    issue: "Broken footpath near school",
    category: "Footpath",
    ward: "Ward 7",
    priority: "Medium",
    status: "Assigned",
    date: "Oct 19, 2023",
    location: "St. Joseph School Lane, Ward 7",
    gps: "11.0182, 76.9504",
    official: "Suresh",
    desc: "Concrete blocks have come loose on the walkway directly in front of school.",
    x: 290, y: 310,
    img: ""
  },
  {
    id: "CMP-1019",
    issue: "Blocked drainage near market",
    category: "Drainage",
    ward: "Ward 3",
    priority: "High",
    status: "Pending",
    date: "Oct 18, 2023",
    location: "Commercial St. Alley, Ward 3",
    gps: "11.0133, 76.9422",
    official: "Unassigned",
    desc: "The storm drain is blocked with plastic waste causing overflow.",
    x: 180, y: 280,
    img: ""
  }
];

const WARD_POLYGONS = [
  { id: "Ward 1",  label: "Ward 1",  pts: "20,20 180,20 150,110 20,110" },
  { id: "Ward 2",  label: "Ward 2",  pts: "20,110 150,110 120,250 20,250" },
  { id: "Ward 3",  label: "Ward 3",  pts: "20,250 120,250 140,380 20,380" },
  { id: "Ward 4",  label: "Ward 4",  pts: "180,20 320,20 300,120 150,110" },
  { id: "Ward 5",  label: "Ward 5",  pts: "150,110 300,120 280,260 120,250" },
  { id: "Ward 6",  label: "Ward 6",  pts: "120,250 280,260 260,380 140,380" },
  { id: "Ward 7",  label: "Ward 7",  pts: "320,20 460,20 440,130 300,120" },
  { id: "Ward 8",  label: "Ward 8",  pts: "300,120 440,130 420,270 280,260" },
  { id: "Ward 9",  label: "Ward 9",  pts: "280,260 420,270 400,380 260,380" },
  { id: "Ward 10", label: "Ward 10", pts: "460,20 580,20 580,140 440,130" },
  { id: "Ward 11", label: "Ward 11", pts: "440,130 580,140 580,280 420,270" },
  { id: "Ward 12", label: "Ward 12", pts: "420,270 580,280 580,380 400,380" }
];

/* ── ICONS ── */
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);
const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const LocateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
  </svg>
);
const FullscreenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
  </svg>
);
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const getMarkerColor = (priority, status) => {
  if (status === "Resolved") return "#94a3b8"; // Gray
  if (priority === "High") return "#ef4444"; // Red
  if (priority === "Medium") return "#f97316"; // Orange
  return "#0d9488"; // Teal (Low)
};

const IssueMap = () => {
  const [pins, setPins] = useState(INITIAL_PINS);
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [priFilter, setPriFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [zoom, setZoom] = useState(1);
  const [selectedPin, setSelectedPin] = useState(null);
  const [assigningPin, setAssigningPin] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  
  // Assign modal state
  const [selectedOfficial, setSelectedOfficial] = useState("");

  const handleApplyFilters = () => {
    // Conceptual filter update
  };

  const handleResetFilters = () => {
    setSearch("");
    setWardFilter("");
    setCatFilter("");
    setPriFilter("");
    setStatusFilter("");
    setSelectedPin(null);
  };

  const handleRefresh = () => {
    setToastMsg("Map data refreshed.");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const triggerAssignModal = (pin, e) => {
    e.stopPropagation();
    setAssigningPin(pin);
    setSelectedOfficial(OFFICIALS[0]);
  };

  const handleAssignConfirm = (e) => {
    e.preventDefault();
    setPins(prev => prev.map(p => {
      if (p.id === assigningPin.id) {
        return { ...p, official: selectedOfficial, status: "Assigned" };
      }
      return p;
    }));
    
    // Update selected pin preview if open
    if (selectedPin && selectedPin.id === assigningPin.id) {
      setSelectedPin(prev => ({ ...prev, official: selectedOfficial, status: "Assigned" }));
    }

    setToastMsg("Official assigned successfully.");
    setAssigningPin(null);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Filter computation
  const filteredPins = pins.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.id.toLowerCase().includes(q) && !p.issue.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q)) {
      return false;
    }
    if (wardFilter && p.ward !== wardFilter) return false;
    if (catFilter && p.category !== catFilter) return false;
    if (priFilter && p.priority !== priFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* Toast Notification */}
          {toastMsg && (
            <div className="settings-toast">
              <span className="toast-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* ── PAGE HEADER ── */}
          <div className="page-header">
            <div>
              <h1 className="dashboard-title">Municipal Issue Map</h1>
              <p className="dashboard-subtitle">Monitor reported civic issues across municipal wards in real time.</p>
            </div>
            <div className="an-header-actions">
              <button className="btn-secondary" onClick={handleRefresh} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <RefreshIcon /> Refresh Map
              </button>
              <button className="btn-secondary" onClick={() => alert("Exporting GIS coordinates list...")} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <ExportIcon /> Export
              </button>
            </div>
          </div>

          {/* ── MAP TOOLBAR (Filters Panel) ── */}
          <div className="card off-filter-bar" style={{ marginBottom: 16 }}>
            <div className="off-search" style={{ flex: 1, minWidth: 260 }}>
              <span>🔍</span>
              <input
                placeholder="Search location or complaint ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="off-filters">
              <select className="off-filter-select" value={wardFilter} onChange={e => setWardFilter(e.target.value)}>
                <option value="">All Wards ▾</option>
                {WARD_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <select className="off-filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories ▾</option>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="off-filter-select" value={priFilter} onChange={e => setPriFilter(e.target.value)}>
                <option value="">All Priorities ▾</option>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="off-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status ▾</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="an-btn-apply" onClick={handleApplyFilters}>Apply Filters</button>
              <button className="btn-reset" onClick={handleResetFilters}>Reset</button>
            </div>
          </div>

          {/* ── MAIN MAP SECTION ── */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="off-table-header" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="card-title">Live Issue Map</span>
                <span className="map-live-badge">
                  <span className="live-dot" /> Live
                </span>
                <span className="map-time-label">Last updated just now</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-medium)" }}>
                {filteredPins.length} reported issues displayed
              </span>
            </div>

            {/* Map Box */}
            <div className="map-box-container">
              
              {/* INTERACTIVE SVG MAP */}
              <div className="map-canvas-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
                <svg viewBox="0 0 600 400" className="map-city-svg">
                  {/* Water feature */}
                  <path d="M 0,320 C 150,310 250,390 350,370 C 450,350 500,400 600,380 L 600,400 L 0,400 Z" fill="#e0f2fe" opacity="0.8" />
                  
                  {/* Parks */}
                  <rect x="330" y="200" width="70" height="50" rx="6" fill="#dcfce7" opacity="0.9" />
                  <circle cx="80" cy="80" r="40" fill="#dcfce7" opacity="0.9" />
                  
                  {/* Wards Boundary Paths */}
                  {WARD_POLYGONS.map(wp => {
                    const isFocused = wardFilter === wp.id;
                    return (
                      <polygon
                        key={wp.id}
                        points={wp.pts}
                        className={`map-ward-path ${isFocused ? "focused" : ""}`}
                        fill={isFocused ? "rgba(59, 130, 246, 0.08)" : "#f8fafc"}
                        onClick={() => setWardFilter(wp.id)}
                      />
                    );
                  })}

                  {/* Ward Labels */}
                  {WARD_POLYGONS.map(wp => {
                    // Compute label centroid mockup
                    const ptsArray = wp.pts.split(" ").map(pt => pt.split(",").map(Number));
                    const avgX = ptsArray.reduce((acc, pt) => acc + pt[0], 0) / ptsArray.length;
                    const avgY = ptsArray.reduce((acc, pt) => acc + pt[1], 0) / ptsArray.length;
                    return (
                      <text
                        key={wp.id}
                        x={avgX}
                        y={avgY}
                        className="map-ward-text-label"
                        textAnchor="middle"
                      >
                        {wp.label}
                      </text>
                    );
                  })}

                  {/* Major Roads Grid */}
                  <polyline points="0,110 600,130" stroke="#cbd5e1" strokeWidth="4" fill="none" opacity="0.6" />
                  <polyline points="0,250 600,270" stroke="#cbd5e1" strokeWidth="4" fill="none" opacity="0.6" />
                  <polyline points="150,0 120,400" stroke="#cbd5e1" strokeWidth="4" fill="none" opacity="0.6" />
                  <polyline points="300,0 260,400" stroke="#cbd5e1" strokeWidth="4" fill="none" opacity="0.6" />
                  <polyline points="440,0 400,400" stroke="#cbd5e1" strokeWidth="4" fill="none" opacity="0.6" />

                  {/* Major Streets text */}
                  <text x="240" y="105" fill="#94a3b8" fontSize="8.5" fontWeight="600" transform="rotate(2, 240, 105)">MAIN STREET</text>
                  <text x="445" y="180" fill="#94a3b8" fontSize="8.5" fontWeight="600" transform="rotate(82, 445, 180)">12TH CROSS ROAD</text>

                  {/* Map Pin Markers */}
                  {filteredPins.map(p => {
                    const isSelected = selectedPin && selectedPin.id === p.id;
                    const color = getMarkerColor(p.priority, p.status);
                    return (
                      <g
                        key={p.id}
                        transform={`translate(${p.x}, ${p.y})`}
                        className={`map-marker-pin ${isSelected ? "selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPin(p);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle cx="0" cy="0" r={isSelected ? "11" : "8"} fill={color} stroke="#ffffff" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r={isSelected ? "5" : "3.5"} fill="#ffffff" />
                      </g>
                    );
                  })}
                </svg>

                {/* Map Cluster mock */}
                {(!wardFilter && !catFilter && !priFilter && !statusFilter) && (
                  <div className="map-cluster-bubble" style={{ left: "75%", top: "72%" }}>
                    <span>24 Issues</span>
                  </div>
                )}

              </div>

              {/* Floating Legend */}
              <div className="map-floating-legend">
                <div className="mfl-title">Priority</div>
                <div className="mfl-item">
                  <span className="mfl-dot" style={{ background: "#ef4444" }} /> High
                </div>
                <div className="mfl-item">
                  <span className="mfl-dot" style={{ background: "#f97316" }} /> Medium
                </div>
                <div className="mfl-item">
                  <span className="mfl-dot" style={{ background: "#0d9488" }} /> Low
                </div>
                <div className="mfl-item">
                  <span className="mfl-dot" style={{ background: "#94a3b8" }} /> Resolved
                </div>
              </div>

              {/* Floating Controls */}
              <div className="map-floating-controls">
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))}>+</button>
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.75))}>−</button>
                <button title="Locate Me" onClick={() => {
                  setZoom(1.2);
                  setToastMsg("Centering map viewport...");
                  setTimeout(() => setToastMsg(""), 2000);
                }}><LocateIcon /></button>
                <button title="Fullscreen View" onClick={() => alert("Entering GIS Fullscreen Mode...")}><FullscreenIcon /></button>
              </div>

              {/* Selected Pin Panel Overlay */}
              {selectedPin && (
                <div className="map-detail-panel animation-fade">
                  <div className="mdp-head">
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="mdp-id">{selectedPin.id}</span>
                      <span className={`badge ${selectedPin.priority === "High" ? "p-high" : selectedPin.priority === "Medium" ? "p-medium" : "p-low"}`}>{selectedPin.priority}</span>
                      <span className={`badge ${selectedPin.status === "Pending" ? "s-pending" : selectedPin.status === "Assigned" ? "s-assigned" : selectedPin.status === "In Progress" ? "s-inprogress" : "s-resolved"}`}>{selectedPin.status}</span>
                    </div>
                    <button className="mdp-close" onClick={() => setSelectedPin(null)}><CloseIcon /></button>
                  </div>
                  <div className="mdp-body">
                    <div className="mdp-title">{selectedPin.issue}</div>
                    <div className="mdp-meta">
                      <div><strong>Category:</strong> {selectedPin.category}</div>
                      <div><strong>Ward:</strong> {selectedPin.ward}</div>
                      <div><strong>Reported:</strong> {selectedPin.date}</div>
                      <div><strong>Location:</strong> {selectedPin.location}</div>
                      <div><strong>Coordinates:</strong> {selectedPin.gps}</div>
                      <div><strong>Assigned Official:</strong> {selectedPin.official}</div>
                    </div>
                    {selectedPin.img ? (
                      <div className="mdp-img-wrap">
                        <img src={selectedPin.img} alt="issue" />
                      </div>
                    ) : (
                      <div className="mdp-no-img">No attachment photo provided</div>
                    )}
                  </div>
                  <div className="mdp-footer">
                    <a className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center" }} href={`/complaints`}>
                      View Details
                    </a>
                    <button className="btn-primary-settings" onClick={(e) => triggerAssignModal(selectedPin, e)}>
                      Assign Official
                    </button>
                  </div>
                </div>
              )}

              {/* No matches state overlay */}
              {filteredPins.length === 0 && (
                <div className="map-empty-state-overlay">
                  <div className="c-empty-icon" style={{ fontSize: 28 }}>🗺️</div>
                  <div className="c-empty-title">No issues found in this area</div>
                  <div className="c-empty-subtitle">Try changing your filters or selecting another ward.</div>
                  <button className="btn-add" onClick={handleResetFilters} style={{ marginTop: 12 }}>Reset Filters</button>
                </div>
              )}

            </div>
          </div>

          {/* ── BOTTOM MAP SUMMARY ── */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
              </div>
              <div>
                <div className="scc-label">VISIBLE ISSUES</div>
                <div className="scc-value">{filteredPins.length}</div>
                <div className="scc-meta">Filtered count</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              </div>
              <div>
                <div className="scc-label">HIGH PRIORITY</div>
                <div className="scc-value">{filteredPins.filter(p => p.priority === "High").length}</div>
                <div className="scc-meta">High severity count</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#fff7ed", color: "#d97706" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </div>
              <div>
                <div className="scc-label">UNASSIGNED</div>
                <div className="scc-value">{filteredPins.filter(p => p.official === "Unassigned").length}</div>
                <div className="scc-meta">Need attention</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div>
                <div className="scc-label">RESOLVED</div>
                <div className="scc-value">{filteredPins.filter(p => p.status === "Resolved").length}</div>
                <div className="scc-meta">Resolved count</div>
              </div>
            </div>
          </div>

          {/* ── RECENT MAP ISSUES TABLE ── */}
          <div className="card" style={{ padding: 20 }}>
            <div className="card-title" style={{ marginBottom: 14, fontSize: 14 }}>Recent Issues on Map</div>
            <div className="off-table-wrap">
              <table className="complaints-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Issue</th>
                    <th>Ward</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPins.map(p => (
                    <tr key={p.id}>
                      <td>
                        <button className="c-id-link" onClick={() => setSelectedPin(p)}>{p.id}</button>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: 13 }}>{p.issue}</td>
                      <td style={{ color: "var(--text-medium)", fontSize: 12.5 }}>{p.ward}</td>
                      <td>
                        <span className={`badge ${p.priority === "High" ? "p-high" : p.priority === "Medium" ? "p-medium" : "p-low"}`}>{p.priority}</span>
                      </td>
                      <td>
                        <span className={`badge ${p.status === "Pending" ? "s-pending" : p.status === "Assigned" ? "s-assigned" : p.status === "In Progress" ? "s-inprogress" : "s-resolved"}`}>{p.status}</span>
                      </td>
                      <td style={{ color: "var(--text-light)", fontSize: 12 }}>{p.date}</td>
                      <td>
                        <button className="c-action-btn-link" onClick={() => setSelectedPin(p)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── COMPACT ASSIGN OFFICIAL MODAL ── */}
      {assigningPin && (
        <div className="modal-overlay" onClick={() => setAssigningPin(null)}>
          <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Assign Field Official</div>
                <div className="modal-subtitle">Assign a field officer to resolve this complaint.</div>
              </div>
              <button className="modal-close" onClick={() => setAssigningPin(null)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleAssignConfirm} className="modal-form">
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-medium)" }}>
                  <strong>Complaint:</strong> {assigningPin.id}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-medium)" }}>
                  <strong>Issue:</strong> {assigningPin.issue}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-medium)" }}>
                  <strong>Ward:</strong> {assigningPin.ward}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-medium)" }}>
                  <strong>Department:</strong> {assigningPin.category}
                </div>
                <div className="form-group">
                  <label className="form-label">Select Official</label>
                  <select
                    className="form-input"
                    value={selectedOfficial}
                    onChange={e => setSelectedOfficial(e.target.value)}
                    required
                  >
                    {OFFICIALS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setAssigningPin(null)}>Cancel</button>
                <button type="submit" className="btn-submit">Assign Official</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default IssueMap;
