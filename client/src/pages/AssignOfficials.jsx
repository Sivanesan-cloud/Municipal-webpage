import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import wardService from "../services/wardService";
import officialService from "../services/officialService";
import complaintService from "../services/complaintService";

/* ── CONSTANTS ── */
const WARD_OPTIONS     = Array.from({ length: 15 }, (_, i) => `Ward ${i + 1}`);
const CATEGORY_OPTIONS = ["Roads", "Electrical", "Sanitation", "Water Supply", "Drainage", "Footpath"];

/* ── MOCK DATA ── */
const INITIAL_UNASSIGNED = [
  { id: "CMP-1024", issue: "Deep pothole on Main St.",     category: "Roads",      ward: "Ward 5",  priority: "High",   date: "Oct 24, 2023", location: "Main Street",       status: "Pending" },
  { id: "CMP-1019", issue: "Blocked drainage near market", category: "Drainage",   ward: "Ward 3",  priority: "High",   date: "Oct 18, 2023", location: "Commercial Alley 3", status: "Pending" },
  { id: "CMP-1017", issue: "Garbage pile near bus stand",  category: "Sanitation", ward: "Ward 2",  priority: "Medium", date: "Oct 17, 2023", location: "Central Bus Stand",  status: "Pending" },
  { id: "CMP-1015", issue: "Streetlight not working",      category: "Electrical", ward: "Ward 12", priority: "Low",    date: "Oct 15, 2023", location: "12th Cross Junction", status: "Pending" }
];

/* ── Avatar helpers (also used by workload table) ── */
const mapOfficial = (o) => {
  const name = o.name || "Official";
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "OF";
  const COLORS = ["#4f46e5","#0891b2","#059669","#7c3aed","#be185d","#d97706","#dc2626","#0284c7"];
  const color = o.avatarColor || COLORS[name.charCodeAt(0) % COLORS.length];
  const assigned  = o.assignedComplaints  ?? o.assigned  ?? 0;
  const completed = o.completedComplaints ?? o.completed ?? 0;
  const max       = o.maximumCapacity     ?? o.max       ?? 10;
  const availability = o.availability || o.status || "Available";
  return { id: o.id, name, initials, color, department: o.department || "—", ward: o.ward || "—", assigned, completed, max, availability };
};

/* ── ROLE LABEL MAP ── */
const ROLE_LABELS = {
  assistantEngineer:  "Assistant Engineer",
  juniorEngineer:     "Junior Engineer",
  sanitaryInspector:  "Sanitary Inspector",
  electricalOfficer:  "Electrical Officer",
  roadsOfficer:       "Roads Officer",
  waterSupplyOfficer: "Water Supply Officer"
};

/* ── ICONS ── */
const RefreshIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;
const UsersIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
const CheckIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;
const ClockIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AlertIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const CloseIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const MapPinIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ChevronRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
const ChevronLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;

/* ── AVATAR helpers ── */
const AVATAR_COLORS = ["#4f46e5","#0891b2","#059669","#7c3aed","#be185d","#d97706","#dc2626","#0284c7"];
const nameToColor   = (n = "") => AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length];
const nameInitials  = (n = "") => n.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "OF";

/* ══════════════════════════════════════════════════
   INLINE WARD DIRECTORY COLUMN
══════════════════════════════════════════════════ */
const WardDirectory = ({ selectedComp, onAssignClick }) => {
  const [wards,         setWards]         = useState([]);
  const [loadingWards,  setLoadingWards]  = useState(true);
  const [selectedWard,  setSelectedWard]  = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [wardSearch,    setWardSearch]    = useState("");

  useEffect(() => {
    wardService.getWards().then(list => { setWards(list); setLoadingWards(false); });
  }, []);

  const handleViewWard = async (wardId) => {
    setLoadingDetail(true);
    setSelectedWard(null);
    const detail = await wardService.getWardWithOfficials(wardId);
    setSelectedWard(detail);
    setLoadingDetail(false);
  };

  const filteredWards = wards.filter(w =>
    w.id.toLowerCase().includes(wardSearch.toLowerCase())
  );

  const officialEntries = selectedWard ? Object.entries(selectedWard.officials || {}) : [];

  return (
    <div className="ao-right-col">
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="ao-col-title" style={{ marginBottom: 0 }}>
          Ward Directory {selectedWard ? `› ${selectedWard.id}` : `(${wards.length})`}
        </div>
        {selectedWard && (
          <button className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11.5 }}
            onClick={() => setSelectedWard(null)}>
            <ChevronLeft /> Back
          </button>
        )}
      </div>

      {/* Ward list view */}
      {!selectedWard && (
        <>
          <div className="off-search" style={{ marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Search ward (WARD01…)" value={wardSearch}
              onChange={e => setWardSearch(e.target.value)} />
          </div>

          <div className="scrollable-list">
            {loadingWards ? (
              <div className="off-no-results">Loading wards…</div>
            ) : filteredWards.length === 0 ? (
              <div className="off-no-results">No wards found.</div>
            ) : filteredWards.map(w => (
              <div key={w.id} className="ao-ward-row">
                <div className="ao-ward-row-icon"><MapPinIcon /></div>
                <div className="ao-ward-row-body">
                  <div className="ao-ward-row-id">{w.id}</div>
                  <div className="ao-ward-row-sub">
                    {Object.keys(w.officials || {}).length} official{Object.keys(w.officials || {}).length !== 1 ? "s" : ""}
                  </div>
                </div>
                <button className="review-btn" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}
                  onClick={() => handleViewWard(w.id)}>
                  View <ChevronRight />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ward detail: officials */}
      {selectedWard && (
        <div className="scrollable-list" style={{ maxHeight: 400 }}>
          {loadingDetail ? (
            <div className="off-no-results">Loading officials…</div>
          ) : officialEntries.length === 0 ? (
            <div className="off-no-results">No officials assigned to this ward.</div>
          ) : officialEntries.map(([role, official]) => {
            if (!official) return null;
            const name    = official.name || "—";
            const color   = official.avatarColor || nameToColor(name);
            const inits   = official.initials    || nameInitials(name);
            const avail   = official.availability || official.status || "Available";
            const dept    = official.department  || "—";
            const ward    = official.ward        || "—";
            const assigned = official.assignedComplaints || 0;
            const max     = official.maximumCapacity || 10;
            const isFull  = assigned >= max;
            const roleLabel = ROLE_LABELS[role] || role;

            return (
              <div key={role} className="ao-official-card-item" style={{ margin: "10px 10px 0", borderRadius: 8 }}>
                <div className="ao-off-top">
                  <div className="off-avatar-sm" style={{ background: color }}>{inits}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ao-off-name">{name}</div>
                    <div className="ao-off-dept" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                      <span className="ward-role-pill">{roleLabel}</span>
                      <span>{dept} · {ward}</span>
                    </div>
                  </div>
                  <span className={`badge ${avail === "Available" ? "s-resolved" : avail === "Limited" ? "s-pending" : "s-inprogress"}`}
                    style={{ marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {avail}
                  </span>
                </div>

                <div className="ao-off-workload">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-medium)" }}>
                    <span>Assigned: {assigned} / {max}</span>
                    <span style={{ fontWeight: 600 }}>Capacity: {Math.round((assigned / max) * 100)}%</span>
                  </div>
                  <div className="ao-progress-bar-wrap">
                    <div className="ao-progress-bar-fill" style={{
                      width: `${Math.min((assigned / max) * 100, 100)}%`,
                      background: isFull ? "#ef4444" : (assigned >= 8 ? "#f97316" : "#3b82f6")
                    }} />
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  {isFull ? (
                    <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11.5 }}>View Workload</button>
                  ) : (
                    <button className="btn-primary-settings" style={{ padding: "4px 12px", fontSize: 11.5 }}
                      onClick={() => onAssignClick && onAssignClick({ ...official, name })}>
                      Assign
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ height: 10 }} />
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
const AssignOfficials = () => {
  const [unassigned,   setUnassigned]   = useState(INITIAL_UNASSIGNED);
  const [officials,    setOfficials]    = useState([]);
  const [recent,       setRecent]       = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [workloadPage, setWorkloadPage] = useState(1);
  const [recentPage,   setRecentPage]   = useState(1);
  const PAGE_SIZE = 10;

  /* Live summary metrics */
  const [metrics, setMetrics] = useState({ total: 0, available: 0, assignedToday: 0, overloaded: 0 });

  const [compSearch, setCompSearch] = useState("");
  const [compWard,   setCompWard]   = useState("");
  const [compPri,    setCompPri]    = useState("");
  const [compCat,    setCompCat]    = useState("");

  const [selectedComp, setSelectedComp] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toastMsg,     setToastMsg]     = useState("");

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 4000); };

  /* ── Fetch live data from Firebase ── */
  const fetchLiveData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Officials workload
      const rawOfficials = await officialService.getOfficials();
      const mapped = rawOfficials.map(mapOfficial);
      setOfficials(mapped);
      setWorkloadPage(1);  // reset to page 1 on fresh data

      // Recent assignments: complaints with status Assigned or In Progress
      const allComplaints = await complaintService.getComplaints();

      // ── Compute live metrics ──
      const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      setMetrics({
        total:         rawOfficials.length,
        available:     rawOfficials.filter(o => (o.availability || o.status) === "Available").length,
        assignedToday: allComplaints.filter(c =>
          (c.status === "Assigned" || c.status === "In Progress") &&
          (c.date === todayStr || (c.reportedDate && c.reportedDate.toDate && c.reportedDate.toDate().toDateString() === new Date().toDateString()))
        ).length,
        overloaded:    rawOfficials.filter(o => {
          const assigned = o.assignedComplaints ?? o.assigned ?? 0;
          const max      = o.maximumCapacity    ?? o.max      ?? 10;
          return assigned >= max * 0.8; // 80%+ = overloaded
        }).length
      });

      const assignedComplaints = allComplaints
        .filter(c => c.status === "Assigned" || c.status === "In Progress")
        .slice(0, 10)
        .map(c => ({
          id:         c.id,
          official:   c.assignedOfficial || "Unassigned",
          department: c.category         || "—",
          ward:       c.ward             || "—",
          priority:   c.priority         || "Low",
          date:       c.date             || "—",
          status:     c.status           || "Assigned"
        }));
      setRecent(assignedComplaints);
      setRecentPage(1);   // reset to page 1 on fresh data
    } catch (err) {
      console.error("AssignOfficials: live data fetch failed:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchLiveData(); }, [fetchLiveData]);

  const handleRefresh = () => { fetchLiveData(); showToast("Official workloads refreshed."); };

  const selectComplaint = (c) =>
    setSelectedComp(selectedComp?.id === c.id ? null : c);

  /* Called by WardDirectory when Assign is clicked on an official */
  const handleWardOfficialAssign = (official) => {
    if (!selectedComp) {
      alert("Please select an unassigned complaint from the left panel first.");
      return;
    }
    setConfirmModal({ comp: selectedComp, official: { ...official, name: official.name || "Official" } });
  };

  const handleConfirmAssignment = (e) => {
    e.preventDefault();
    const { comp, official } = confirmModal;
    setUnassigned(prev => prev.filter(c => c.id !== comp.id));
    setOfficials(prev => prev.map(o => {
      if (o.id === official.id) {
        const a = (o.assigned || 0) + 1;
        return { ...o, assigned: a, availability: a >= o.max ? "Full" : a >= 8 ? "Limited" : "Available" };
      }
      return o;
    }));
    setRecent([{ id: comp.id, official: official.name, department: official.department || "—",
      ward: official.ward || "—", priority: comp.priority, date: "Today", status: "Assigned" }, ...recent]);
    showToast(`Complaint ${comp.id} assigned to ${official.name}.`);
    setSelectedComp(null);
    setConfirmModal(null);
  };

  const filteredComplaints = unassigned.filter(c => {
    const q = compSearch.toLowerCase();
    if (q && !c.id.toLowerCase().includes(q) && !c.issue.toLowerCase().includes(q)) return false;
    if (compWard && c.ward !== compWard) return false;
    if (compPri  && c.priority !== compPri) return false;
    if (compCat  && c.category !== compCat) return false;
    return true;
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* Toast */}
          {toastMsg && (
            <div className="settings-toast">
              <span className="toast-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* ── PAGE HEADER ── */}
          <div className="page-header">
            <div>
              <h1 className="dashboard-title">Assign Officials</h1>
              <p className="dashboard-subtitle">Browse wards, view assigned officials, and manage complaint assignments.</p>
            </div>
            <button className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              onClick={handleRefresh}>
              <RefreshIcon /> Refresh
            </button>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}><UsersIcon /></div>
              <div>
                <div className="scc-label">TOTAL OFFICIALS</div>
                <div className="scc-value">{loadingData ? "…" : metrics.total}</div>
                <div className="scc-meta">Active municipal officials</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#f0fdf4", color: "#22c55e" }}><CheckIcon /></div>
              <div>
                <div className="scc-label">AVAILABLE</div>
                <div className="scc-value">{loadingData ? "…" : metrics.available}</div>
                <div className="scc-meta">Ready for assignment</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}><ClockIcon /></div>
              <div>
                <div className="scc-label">ASSIGNED TODAY</div>
                <div className="scc-value">{loadingData ? "…" : metrics.assignedToday}</div>
                <div className="scc-meta">Complaints assigned today</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#fef2f2", color: "#ef4444" }}><AlertIcon /></div>
              <div>
                <div className="scc-label">OVERLOADED</div>
                <div className="scc-value">{loadingData ? "…" : metrics.overloaded}</div>
                <div className="scc-meta">Officials with high workload</div>
              </div>
            </div>
          </div>

          {/* ══ ASSIGN COMPLAINT (2-col: Unassigned Complaints | Ward Directory) ══ */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="settings-card-header" style={{ marginBottom: 16 }}>
              <div>
                <h2 className="settings-card-title">Assign Complaint</h2>
                <p className="settings-card-subtitle">Select a complaint, then browse a ward to assign its official.</p>
              </div>
            </div>

            <div className="ao-workspace-grid">

              {/* LEFT: Unassigned Complaints */}
              <div className="ao-left-col">
                <div className="ao-col-title">Unassigned Complaints ({filteredComplaints.length})</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <div className="off-search">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input placeholder="Search complaint ID or issue…"
                      value={compSearch} onChange={e => setCompSearch(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }}
                      value={compWard} onChange={e => setCompWard(e.target.value)}>
                      <option value="">Ward ▾</option>
                      {WARD_OPTIONS.map(w => <option key={w}>{w}</option>)}
                    </select>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }}
                      value={compPri} onChange={e => setCompPri(e.target.value)}>
                      <option value="">Priority ▾</option>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }}
                      value={compCat} onChange={e => setCompCat(e.target.value)}>
                      <option value="">Category ▾</option>
                      {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="ao-list-wrap scrollable-list">
                  {filteredComplaints.length === 0 ? (
                    <div className="off-no-results">
                      {unassigned.length === 0 ? "No unassigned complaints." : "No matching complaints."}
                    </div>
                  ) : filteredComplaints.map(c => {
                    const isSel = selectedComp?.id === c.id;
                    return (
                      <div key={c.id}
                        className={`ao-complaint-item ${isSel ? "active" : ""}`}
                        onClick={() => selectComplaint(c)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span className="ao-item-id">{c.id}</span>
                          <span className={`badge ${c.priority === "High" ? "p-high" : c.priority === "Medium" ? "p-medium" : "p-low"}`}>{c.priority}</span>
                        </div>
                        <div className="ao-item-title">{c.issue}</div>
                        <div className="ao-item-meta">{c.category} • {c.ward} • {c.date}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected complaint preview */}
                {selectedComp && (
                  <div className="ao-preview-box animation-fade" style={{ marginTop: 12 }}>
                    <div className="ao-preview-title">SELECTED COMPLAINT</div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0" }}>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: "var(--text-dark)" }}>{selectedComp.id}</span>
                      <span className={`badge ${selectedComp.priority === "High" ? "p-high" : selectedComp.priority === "Medium" ? "p-medium" : "p-low"}`}>{selectedComp.priority}</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-dark)", marginBottom: 5 }}>{selectedComp.issue}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-medium)", lineHeight: 1.6 }}>
                      <div><strong>Category:</strong> {selectedComp.category}</div>
                      <div><strong>Ward:</strong> {selectedComp.ward}</div>
                      <div><strong>Reported:</strong> {selectedComp.date}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Ward Directory (inline) */}
              <WardDirectory selectedComp={selectedComp} onAssignClick={handleWardOfficialAssign} />

            </div>
          </div>

          {/* ── OFFICIAL WORKLOAD TABLE ── */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="settings-card-header" style={{ marginBottom: 14 }}>
              <h2 className="settings-card-title">Official Workload</h2>
              <p className="settings-card-subtitle">Current complaint assignments by official.</p>
            </div>
            <div className="off-table-wrap">
              <table className="complaints-table" style={{ marginTop: 0 }}>
                <thead><tr>
                  <th>Official</th><th>Department</th><th>Ward</th>
                  <th>Assigned</th><th>Completed</th><th>Workload</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {loadingData ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-medium)", fontSize: 13 }}>Loading officials from database…</td></tr>
                  ) : officials.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-medium)", fontSize: 13 }}>No officials found in the database.</td></tr>
                  ) : (() => {
                    const totalPages = Math.max(1, Math.ceil(officials.length / PAGE_SIZE));
                    const safePage   = Math.min(workloadPage, totalPages);
                    const startIdx   = (safePage - 1) * PAGE_SIZE;
                    return officials.slice(startIdx, startIdx + PAGE_SIZE).map(o => (
                      <tr key={o.id}>
                        <td>
                          <div className="off-official-cell">
                            <div className="off-avatar-sm" style={{ background: o.color }}>{o.initials}</div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-dark)" }}>{o.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{o.department}</td>
                        <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{o.ward}</td>
                        <td style={{ fontWeight: 600 }}>{o.assigned}</td>
                        <td style={{ color: "#16a34a", fontWeight: 600 }}>{o.completed}</td>
                        <td style={{ width: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11.5, minWidth: 32 }}>{o.assigned} / {o.max}</span>
                            <div className="ao-progress-bar-wrap" style={{ flex: 1, margin: 0 }}>
                              <div className="ao-progress-bar-fill" style={{
                                width: `${(o.assigned / o.max) * 100}%`,
                                background: o.assigned >= 10 ? "#ef4444" : o.assigned >= 8 ? "#f97316" : "#22c55e"
                              }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${o.availability === "Available" ? "s-resolved" : o.availability === "Limited" ? "s-pending" : "s-inprogress"}`}>
                            {o.availability}
                          </span>
                        </td>
                        <td><button className="c-action-btn-link">View</button></td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {/* Workload Pagination */}
            {!loadingData && officials.length > PAGE_SIZE && (() => {
              const totalPages = Math.ceil(officials.length / PAGE_SIZE);
              const safePage   = Math.min(workloadPage, totalPages);
              const startIdx   = (safePage - 1) * PAGE_SIZE;
              const delta = 2;
              const left  = Math.max(2, safePage - delta);
              const right = Math.min(totalPages - 1, safePage + delta);
              const pageNums = [1];
              if (left > 2)                pageNums.push("...");
              for (let p = left; p <= right; p++) pageNums.push(p);
              if (right < totalPages - 1)  pageNums.push("...");
              if (totalPages > 1)          pageNums.push(totalPages);
              return (
                <div className="off-pagination" style={{ marginTop: 14 }}>
                  <span className="off-pagination-info">
                    Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, officials.length)} of {officials.length} officials
                  </span>
                  <div className="off-page-controls">
                    <button className="off-page-btn off-page-arrow"
                      disabled={safePage === 1}
                      onClick={() => setWorkloadPage(p => Math.max(1, p - 1))}>← Previous</button>
                    {pageNums.map((p, i) =>
                      p === "..." ? <span key={`e${i}`} className="off-page-ellipsis">…</span> :
                      <button key={p} className={`off-page-btn ${safePage === p ? "active" : ""}`}
                        onClick={() => setWorkloadPage(p)}>{p}</button>
                    )}
                    <button className="off-page-btn off-page-arrow"
                      disabled={safePage === totalPages}
                      onClick={() => setWorkloadPage(p => Math.min(totalPages, p + 1))}>Next →</button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── RECENT ASSIGNMENTS ── */}
          <div className="card" style={{ padding: 20 }}>
            <div className="settings-card-header" style={{ marginBottom: 14 }}>
              <h2 className="settings-card-title">Recent Assignments</h2>
              <p className="settings-card-subtitle">Complaints recently assigned to officials.</p>
            </div>
            <div className="off-table-wrap">
              <table className="complaints-table" style={{ marginTop: 0 }}>
                <thead><tr>
                  <th>Complaint</th><th>Official</th><th>Department</th>
                  <th>Ward</th><th>Priority</th><th>Assigned Date</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {loadingData ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-medium)", fontSize: 13 }}>Loading recent assignments…</td></tr>
                  ) : recent.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-medium)", fontSize: 13 }}>No assigned complaints found.</td></tr>
                  ) : (() => {
                    const totalPages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
                    const safePage   = Math.min(recentPage, totalPages);
                    const startIdx   = (safePage - 1) * PAGE_SIZE;
                    return recent.slice(startIdx, startIdx + PAGE_SIZE).map((r, i) => (
                      <tr key={i}>
                        <td><span className="cid">{r.id}</span></td>
                        <td style={{ fontWeight: 600, fontSize: 13, color: "var(--text-dark)" }}>{r.official}</td>
                        <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{r.department}</td>
                        <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{r.ward}</td>
                        <td><span className={`badge ${r.priority === "High" ? "p-high" : r.priority === "Medium" ? "p-medium" : "p-low"}`}>{r.priority}</span></td>
                        <td style={{ fontSize: 12, color: "var(--text-light)" }}>{r.date}</td>
                        <td><span className={`badge ${r.status === "Pending" ? "s-pending" : r.status === "Assigned" ? "s-assigned" : "s-inprogress"}`}>{r.status}</span></td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {/* Recent Assignments Pagination */}
            {!loadingData && recent.length > PAGE_SIZE && (() => {
              const totalPages = Math.ceil(recent.length / PAGE_SIZE);
              const safePage   = Math.min(recentPage, totalPages);
              const startIdx   = (safePage - 1) * PAGE_SIZE;
              const delta = 2;
              const left  = Math.max(2, safePage - delta);
              const right = Math.min(totalPages - 1, safePage + delta);
              const pageNums = [1];
              if (left > 2)                pageNums.push("...");
              for (let p = left; p <= right; p++) pageNums.push(p);
              if (right < totalPages - 1)  pageNums.push("...");
              if (totalPages > 1)          pageNums.push(totalPages);
              return (
                <div className="off-pagination" style={{ marginTop: 14 }}>
                  <span className="off-pagination-info">
                    Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, recent.length)} of {recent.length} assignments
                  </span>
                  <div className="off-page-controls">
                    <button className="off-page-btn off-page-arrow"
                      disabled={safePage === 1}
                      onClick={() => setRecentPage(p => Math.max(1, p - 1))}>← Previous</button>
                    {pageNums.map((p, i) =>
                      p === "..." ? <span key={`e${i}`} className="off-page-ellipsis">…</span> :
                      <button key={p} className={`off-page-btn ${safePage === p ? "active" : ""}`}
                        onClick={() => setRecentPage(p)}>{p}</button>
                    )}
                    <button className="off-page-btn off-page-arrow"
                      disabled={safePage === totalPages}
                      onClick={() => setRecentPage(p => Math.min(totalPages, p + 1))}>Next →</button>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Confirm Assignment</div>
                <div className="modal-subtitle">Verify the assignment details below.</div>
              </div>
              <button className="modal-close" onClick={() => setConfirmModal(null)}><CloseIcon /></button>
            </div>
            <form onSubmit={handleConfirmAssignment} className="modal-form">
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-light)", fontWeight: 700 }}>Assign Complaint</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dark)", marginTop: 2 }}>
                    {confirmModal.comp.id} – {confirmModal.comp.issue}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-light)", fontWeight: 700 }}>To Field Official</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dark)", marginTop: 2 }}>{confirmModal.official.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-medium)", marginTop: 1 }}>
                    {confirmModal.official.department} Department · {confirmModal.official.ward}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
                <button type="submit" className="btn-submit">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignOfficials;
