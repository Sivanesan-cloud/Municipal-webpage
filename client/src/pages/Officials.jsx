import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import AddOfficialModal from "../components/AddOfficialModal";
import OfficialDetails from "../components/OfficialDetails";

/* ── CONSTANTS ── */
const DEPARTMENTS = ["Roads", "Electrical", "Sanitation", "Water Supply", "Drainage"];
const WARDS = Array.from({ length: 12 }, (_, i) => `Ward ${i + 1}`);

const DEPT_COLORS = {
  Roads:          { bg: "#eff6ff", color: "#1d4ed8" },
  Electrical:     { bg: "#fffbeb", color: "#d97706" },
  Sanitation:     { bg: "#f0fdf4", color: "#15803d" },
  "Water Supply": { bg: "#f0fdfa", color: "#0d9488" },
  Drainage:       { bg: "#faf5ff", color: "#7c3aed" },
};

/* ── SAMPLE DATA ── */
const OFFICIALS = [
  {
    id: 1, name: "Raj Kumar",   initials: "RK", avatarColor: "#4f46e5",
    email: "raj.kumar@example.com",  phone: "+91 98765 43210",
    department: "Roads",        ward: "Ward 5",
    activeTasks: 4, completedTasks: 37, avgResolution: "3.2 days",
    status: "On Task",
    assignedComplaints: [
      { id: "CMP-1024", issue: "Deep pothole on Main St.", ward: "Ward 5",  priority: "High",   status: "In Progress", date: "Oct 24, 2023" },
      { id: "CMP-1019", issue: "Road crack near school",  ward: "Ward 5",  priority: "Medium", status: "Assigned",    date: "Oct 20, 2023" },
      { id: "CMP-1016", issue: "Speed-breaker damaged",   ward: "Ward 5",  priority: "Low",    status: "Assigned",    date: "Oct 18, 2023" },
    ],
  },
  {
    id: 2, name: "Arun Kumar",  initials: "AK", avatarColor: "#0891b2",
    email: "arun.kumar@example.com", phone: "+91 87654 32109",
    department: "Electrical",   ward: "Ward 12",
    activeTasks: 2, completedTasks: 24, avgResolution: "2.8 days",
    status: "Available",
    assignedComplaints: [
      { id: "CMP-1023", issue: "Streetlight not working", ward: "Ward 12", priority: "Low",    status: "Assigned",    date: "Oct 23, 2023" },
      { id: "CMP-1011", issue: "Transformer sparking",    ward: "Ward 12", priority: "High",   status: "In Progress", date: "Oct 15, 2023" },
    ],
  },
  {
    id: 3, name: "Karthik",     initials: "K",  avatarColor: "#059669",
    email: "karthik@example.com",    phone: "+91 76543 21098",
    department: "Sanitation",   ward: "Ward 2",
    activeTasks: 3, completedTasks: 41, avgResolution: "1.9 days",
    status: "On Task",
    assignedComplaints: [
      { id: "CMP-1022", issue: "Garbage pile buildup",    ward: "Ward 2",  priority: "Medium", status: "In Progress", date: "Oct 22, 2023" },
      { id: "CMP-1015", issue: "Drain clogged with waste",ward: "Ward 2",  priority: "High",   status: "Assigned",    date: "Oct 17, 2023" },
    ],
  },
  {
    id: 4, name: "Ravi Kumar",  initials: "RK", avatarColor: "#7c3aed",
    email: "ravi.kumar@example.com", phone: "+91 65432 10987",
    department: "Water Supply", ward: "Ward 9",
    activeTasks: 1, completedTasks: 18, avgResolution: "4.1 days",
    status: "Available",
    assignedComplaints: [
      { id: "CMP-1021", issue: "Water leakage near park", ward: "Ward 9",  priority: "High",   status: "Assigned",    date: "Oct 20, 2023" },
    ],
  },
  {
    id: 5, name: "Suresh",      initials: "S",  avatarColor: "#be185d",
    email: "suresh@example.com",     phone: "+91 54321 09876",
    department: "Drainage",     ward: "Ward 7",
    activeTasks: 0, completedTasks: 29, avgResolution: "2.5 days",
    status: "Offline",
    assignedComplaints: [],
  },
];

/* ── ICONS ── */
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const CheckCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const WifiOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const TaskIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="9" x2="9" y2="21"/>
  </svg>
);
const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

/* ── COMPONENT ── */
const Officials = () => {
  const [view, setView]                   = useState("table");
  const [showAddModal, setShowAddModal]   = useState(false);
  const [selectedOff, setSelectedOff]     = useState(null);
  const [openMenuId, setOpenMenuId]       = useState(null);
  const [search, setSearch]               = useState("");
  const [deptFilter, setDeptFilter]       = useState("");
  const [wardFilter, setWardFilter]       = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [currentPage, setCurrentPage]     = useState(1);

  /* Close dropdown on outside click */
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  /* Filtering */
  const filtered = OFFICIALS.filter(o => {
    const q = search.toLowerCase();
    if (q && !o.name.toLowerCase().includes(q) && !o.email.toLowerCase().includes(q)) return false;
    if (deptFilter && o.department !== deptFilter) return false;
    if (wardFilter && o.ward !== wardFilter) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  const resetFilters = () => { setSearch(""); setDeptFilter(""); setWardFilter(""); setStatusFilter(""); };

  const openMenu = (e, id) => { e.stopPropagation(); setOpenMenuId(p => p === id ? null : id); };

  const doAction = (fn) => { fn(); setOpenMenuId(null); };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* ── Page Header ── */}
          <div className="page-header">
            <div>
              <h1 className="dashboard-title">Officials</h1>
              <p className="dashboard-subtitle">Manage municipal field officials, departments, wards and assignments.</p>
            </div>
            <button className="btn-add" onClick={() => setShowAddModal(true)}>
              <PlusIcon /> Add Official
            </button>
          </div>

          {/* ── Summary Cards ── */}
          <div className="stat-grid">
            <StatCard label="TOTAL OFFICIALS" value="48"
              subtitle="Registered officials"
              icon={<UsersIcon />} iconBg="#eff6ff" iconColor="#3b82f6"
              trendIcon="↗" trendClass="" />
            <StatCard label="AVAILABLE" value="21"
              subtitle="Ready for assignment"
              icon={<CheckCircle />} iconBg="#f0fdf4" iconColor="#22c55e"
              trendIcon="✓" trendClass="" />
            <StatCard label="ON TASK" value="19"
              subtitle="Actively working"
              icon={<ClockIcon />} iconBg="#eff6ff" iconColor="#3b82f6"
              trendIcon="⚡" trendClass="" />
            <StatCard label="OFFLINE" value="8"
              subtitle="Currently unavailable"
              icon={<WifiOff />} iconBg="#f8fafc" iconColor="#64748b"
              trendIcon="—" trendClass="" />
          </div>

          {/* ── Filter Bar ── */}
          <div className="card off-filter-bar">
            <div className="off-search">
              <SearchIcon />
              <input
                placeholder="Search official by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="off-filters">
              <select className="off-filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">Department ▾</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="off-filter-select" value={wardFilter} onChange={e => setWardFilter(e.target.value)}>
                <option value="">Ward ▾</option>
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <select className="off-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Status ▾</option>
                <option value="Available">Available</option>
                <option value="On Task">On Task</option>
                <option value="Offline">Offline</option>
              </select>
              <button className="btn-reset" onClick={resetFilters}>Reset Filters</button>
            </div>
          </div>

          {/* ── Officials Table / Cards ── */}
          <div className="card">
            <div className="off-table-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="card-title">Field Officials</span>
                <span className="off-count-pill">{filtered.length} officials</span>
              </div>
              <div className="view-toggle">
                <button className={`view-btn ${view === "table" ? "active" : ""}`}
                  onClick={() => setView("table")}>
                  <TableIcon /> Table
                </button>
                <button className={`view-btn ${view === "cards" ? "active" : ""}`}
                  onClick={() => setView("cards")}>
                  <GridIcon /> Cards
                </button>
              </div>
            </div>

            {/* TABLE VIEW */}
            {view === "table" && (
              <div className="off-table-wrap">
                <table className="complaints-table off-table">
                  <thead>
                    <tr>
                      <th>Official</th>
                      <th>Department</th>
                      <th>Ward</th>
                      <th>Active Tasks</th>
                      <th>Status</th>
                      <th>Contact</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="off-no-results">No officials match the current filters.</td></tr>
                    ) : filtered.map(o => {
                      const dc = DEPT_COLORS[o.department] ?? { bg: "#f1f5f9", color: "#475569" };
                      return (
                        <tr key={o.id}>
                          {/* Official */}
                          <td>
                            <div className="off-official-cell">
                              <div className="off-avatar-sm" style={{ background: o.avatarColor }}>{o.initials}</div>
                              <div>
                                <div className="off-name">{o.name}</div>
                                <div className="off-id-text">ID-{String(o.id).padStart(3, "0")}</div>
                              </div>
                            </div>
                          </td>
                          {/* Department */}
                          <td>
                            <span className="dept-badge" style={{ background: dc.bg, color: dc.color }}>
                              {o.department}
                            </span>
                          </td>
                          {/* Ward */}
                          <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{o.ward}</td>
                          {/* Active Tasks */}
                          <td>
                            {o.activeTasks === 0
                              ? <span className="off-no-task">No active tasks</span>
                              : <div className="off-tasks-cell"><TaskIcon />{o.activeTasks} Active</div>}
                          </td>
                          {/* Status */}
                          <td><StatusBadge status={o.status} /></td>
                          {/* Contact */}
                          <td className="off-email">{o.email}</td>
                          {/* Action */}
                          <td>
                            <div className="off-actions">
                              <button className="review-btn" onClick={() => setSelectedOff(o)}>View</button>
                              <div className="off-menu-wrap">
                                <button className="off-menu-btn" onClick={(e) => openMenu(e, o.id)}>⋮</button>
                                {openMenuId === o.id && (
                                  <div className="off-dropdown" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => doAction(() => setSelectedOff(o))}>View Profile</button>
                                    <button onClick={() => doAction(() => setSelectedOff(o))}>View Assigned Complaints</button>
                                    <button onClick={() => doAction(() => {})}>Assign Complaint</button>
                                    <hr />
                                    <button onClick={() => doAction(() => {})}>Edit Official</button>
                                    <button className="danger" onClick={() => doAction(() => {})}>Deactivate Official</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARDS VIEW */}
            {view === "cards" && (
              <div className="off-cards-grid">
                {filtered.length === 0
                  ? <div className="off-no-results" style={{ gridColumn: "1/-1" }}>No officials match the current filters.</div>
                  : filtered.map(o => {
                    const dc = DEPT_COLORS[o.department] ?? { bg: "#f1f5f9", color: "#475569" };
                    return (
                      <div key={o.id} className="official-card">
                        <div className="off-card-top">
                          <div className="off-avatar-sm" style={{ background: o.avatarColor }}>{o.initials}</div>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="off-card-name">{o.name}</div>
                        <div className="off-card-meta">
                          <span className="dept-badge" style={{ background: dc.bg, color: dc.color }}>{o.department}</span>
                          <span className="ward-badge">{o.ward}</span>
                        </div>
                        <div className="off-card-email">{o.email}</div>
                        <div className="off-card-tasks">
                          {o.activeTasks === 0
                            ? <span className="off-no-task">No active tasks</span>
                            : <span className="off-tasks-cell"><TaskIcon />{o.activeTasks} active task{o.activeTasks !== 1 ? "s" : ""}</span>}
                        </div>
                        <button className="btn-view-full" onClick={() => setSelectedOff(o)}>
                          View Profile →
                        </button>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* PAGINATION */}
            <div className="off-pagination">
              <span className="off-pagination-info">
                Showing 1–{Math.min(filtered.length, 10)} of 48 officials
              </span>
              <div className="off-page-controls">
                <button className="off-page-btn off-page-arrow"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}>
                  ← Previous
                </button>
                {[1, 2, 3, 4, 5].map(p => (
                  <button key={p}
                    className={`off-page-btn ${currentPage === p ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}>{p}
                  </button>
                ))}
                <button className="off-page-btn off-page-arrow"
                  disabled={currentPage === 5}
                  onClick={() => setCurrentPage(p => p + 1)}>
                  Next →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddOfficialModal onClose={() => setShowAddModal(false)} />}
      {selectedOff  && <OfficialDetails official={selectedOff} onClose={() => setSelectedOff(null)} />}
    </div>
  );
};

export default Officials;
