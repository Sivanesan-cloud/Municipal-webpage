import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import complaintService from "../services/complaintService";

/* ── CONSTANTS & OPTIONS ── */
const STATUS_OPTIONS = ["All Status", "Pending", "Assigned", "In Progress", "Resolved"];
const CATEGORY_OPTIONS = ["All Categories", "Potholes", "Streetlights", "Garbage", "Footpath", "Drainage", "Water Supply"];
const PRIORITY_OPTIONS = ["All Priorities", "High", "Medium", "Low"];
const WARD_OPTIONS = ["All Wards", ...Array.from({ length: 15 }, (_, i) => `Ward ${i + 1}`)];
const DEPT_OPTIONS = ["All Departments", "Roads", "Electrical", "Sanitation", "Water Supply", "Drainage"];
const DATE_OPTIONS = ["All Dates", "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Custom Range"];

const OFFICIALS = ["Unassigned", "Raj Kumar", "Arun Kumar", "Karthik", "Ravi Kumar", "Suresh"];

/* ── DEFAULTS ── */
const today = new Date();
const formatDateOffset = (daysAgo) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const INITIAL_COMPLAINTS = [
  {
    id: "CMP-1024",
    issue: "Deep pothole on Main St.",
    location: "Main Street",
    category: "Roads",
    ward: "Ward 5",
    priority: "High",
    status: "Pending",
    date: formatDateOffset(0),
    official: "Unassigned",
    desc: "A very deep and dangerous pothole has formed in the middle of Main Street near the intersection. It poses a high risk to motorcyclists and has already caused several near-miss accidents.",
    gps: "11.0168° N, 76.9558° E",
    timeline: [
      { status: "Pending", date: `${formatDateOffset(0)} 10:15 AM`, remark: "Complaint submitted by citizen Anita R." }
    ],
    img: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "CMP-1023",
    issue: "Streetlight not working",
    location: "12th Cross Junction",
    category: "Electrical",
    ward: "Ward 12",
    priority: "Low",
    status: "Assigned",
    date: formatDateOffset(1),
    official: "Arun Kumar",
    desc: "The street lamp at the junction of 12th Cross has been flickering for a week and has now completely shut down. The area is extremely dark at night.",
    gps: "11.0201° N, 76.9612° E",
    timeline: [
      { status: "Pending", date: `${formatDateOffset(1)} 08:30 AM`, remark: "Complaint submitted by citizen Rajesh K." },
      { status: "Assigned", date: `${formatDateOffset(1)} 11:00 AM`, remark: "Assigned to field official Arun Kumar" }
    ],
    img: ""
  },
  {
    id: "CMP-1022",
    issue: "Garbage pile buildup",
    location: "Market Road Corner",
    category: "Sanitation",
    ward: "Ward 2",
    priority: "Medium",
    status: "In Progress",
    date: formatDateOffset(2),
    official: "Karthik",
    desc: "Large pile of household and organic waste has accumulated at the corner of Market Road. It has not been cleared for three days and is emitting a foul smell.",
    gps: "11.0112° N, 76.9451° E",
    timeline: [
      { status: "Pending", date: `${formatDateOffset(2)} 09:00 AM`, remark: "Complaint submitted by citizen Muthu S." },
      { status: "Assigned", date: `${formatDateOffset(2)} 10:45 AM`, remark: "Assigned to field official Karthik" },
      { status: "In Progress", date: `${formatDateOffset(2)} 02:30 PM`, remark: "Karthik started clearing operations" }
    ],
    img: ""
  },
  {
    id: "CMP-1021",
    issue: "Water leakage near park",
    location: "Park Avenue Road",
    category: "Water Supply",
    ward: "Ward 9",
    priority: "High",
    status: "Resolved",
    date: formatDateOffset(3),
    official: "Ravi Kumar",
    desc: "A drinking water main pipeline is leaking heavily near the entrance of the public park. Thousands of liters of water are being wasted.",
    gps: "11.0255° N, 76.9701° E",
    timeline: [
      { status: "Pending", date: `${formatDateOffset(3)} 07:15 AM`, remark: "Complaint submitted by citizen Priya M." },
      { status: "Assigned", date: `${formatDateOffset(3)} 08:00 AM`, remark: "Assigned to field official Ravi Kumar" },
      { status: "In Progress", date: `${formatDateOffset(3)} 09:30 AM`, remark: "Repair team arrived and isolated leakage" },
      { status: "Resolved", date: `${formatDateOffset(3)} 04:00 PM`, remark: "Pipeline patch completed and tested by Ravi Kumar" }
    ],
    img: ""
  },
  {
    id: "CMP-1020",
    issue: "Broken footpath near school",
    location: "St. Joseph School Lane",
    category: "Footpath",
    ward: "Ward 7",
    priority: "Medium",
    status: "Assigned",
    date: formatDateOffset(4),
    official: "Suresh",
    desc: "Concrete paving blocks have come loose on the walkway directly in front of the school gate. Children are tripping over them.",
    gps: "11.0182° N, 76.9504° E",
    timeline: [
      { status: "Pending", date: `${formatDateOffset(4)} 01:20 PM`, remark: "Complaint submitted by school admin." },
      { status: "Assigned", date: `${formatDateOffset(4)} 04:00 PM`, remark: "Assigned to field official Suresh" }
    ],
    img: ""
  },
  {
    id: "CMP-1019",
    issue: "Blocked drainage near market",
    location: "Commercial St. Alley 3",
    category: "Drainage",
    ward: "Ward 3",
    priority: "High",
    status: "Pending",
    date: formatDateOffset(5),
    official: "Unassigned",
    desc: "The open storm drain is completely blocked with plastic waste and silt, causing wastewater to overflow onto the pedestrian path.",
    gps: "11.0133° N, 76.9422° E",
    timeline: [
      { status: "Pending", date: `${formatDateOffset(5)} 11:45 AM`, remark: "Complaint submitted by vendor association." }
    ],
    img: ""
  }
];

/* ── ICONS ── */
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const LoaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" />
  </svg>
);
const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Complaints = () => {
  const [complaintsList, setComplaintsList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [catFilter, setCatFilter] = useState("All Categories");
  const [priFilter, setPriFilter] = useState("All Priorities");
  const [wardFilter, setWardFilter] = useState("All Wards");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [dateFilter, setDateFilter] = useState("All Dates");

  const [view, setView] = useState("table");
  const [sort, setSort] = useState("Newest");
  const [loading, setLoading] = useState(true);

  // Modals / Dropdowns
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [reviewedComplaint, setReviewedComplaint] = useState(null);
  const [rowMenuId, setRowMenuId] = useState(null);

  const exportRef = useRef(null);

  /* Load live data from Firestore reports collection */
  const fetchComplaints = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      let list = await complaintService.getComplaints();
      // If collection is empty, seed it with the mock data so the user has visual reports
      if (list.length === 0) {
        console.log("Firestore reports collection is empty. Seeding initial data...");
        for (const item of INITIAL_COMPLAINTS) {
          const { id, ...cleanItem } = item; // firebase auto-assigns document ids
          await complaintService.createComplaint(cleanItem);
        }
        list = await complaintService.getComplaints();
      }
      setComplaintsList(list);
    } catch (error) {
      console.error("Failed to load complaints from database:", error);
      // Fallback
      setComplaintsList(INITIAL_COMPLAINTS);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  /* Close row menus or export menus on click outside */
  useEffect(() => {
    const handleClose = () => {
      setRowMenuId(null);
      setShowExportMenu(false);
    };
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, []);

  /* Filter processing */
  const filteredComplaints = complaintsList.filter((c) => {
    // Search match
    const q = search.toLowerCase();
    if (q && !c.id.toLowerCase().includes(q) && !c.issue.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) {
      return false;
    }
    // Filters match
    if (statusFilter !== "All Status" && c.status !== statusFilter) return false;
    if (catFilter !== "All Categories" && c.category !== catFilter) return false;
    if (priFilter !== "All Priorities" && c.priority !== priFilter) return false;
    if (wardFilter !== "All Wards" && c.ward !== wardFilter) return false;
    
    // Department filtering mock: map categories to departments
    if (deptFilter !== "All Departments") {
      const deptMap = {
        "Roads": "Roads",
        "Electrical": "Electrical",
        "Sanitation": "Sanitation",
        "Water Supply": "Water Supply",
        "Drainage": "Drainage",
        "Footpath": "Roads" // Footpaths fall under Roads dept
      };
      if (deptMap[c.category] !== deptFilter) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All Status");
    setCatFilter("All Categories");
    setPriFilter("All Priorities");
    setWardFilter("All Wards");
    setDeptFilter("All Departments");
    setDateFilter("All Dates");
  };

  const handleSimulateLoading = () => {
    fetchComplaints(true);
  };

  // Row Action operations
  const handleStatusChange = async (id, newStatus) => {
    // Optimistic UI update
    setComplaintsList((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updatedTimeline = [
            ...c.timeline,
            { status: newStatus, date: new Date().toLocaleString(), remark: `Status changed to ${newStatus} by admin.` }
          ];
          return { ...c, status: newStatus, timeline: updatedTimeline };
        }
        return c;
      })
    );
    if (reviewedComplaint && reviewedComplaint.id === id) {
      setReviewedComplaint(prev => ({
        ...prev,
        status: newStatus,
        timeline: [
          ...prev.timeline,
          { status: newStatus, date: new Date().toLocaleString(), remark: `Status changed to ${newStatus} by admin.` }
        ]
      }));
    }

    try {
      await complaintService.updateComplaintStatus(id, newStatus);
    } catch (error) {
      console.error("Failed to update status in DB:", error);
      fetchComplaints(false); // Rollback on error
    }
  };

  const handlePriorityChange = async (id, newPri) => {
    setComplaintsList((prev) => prev.map((c) => (c.id === id ? { ...c, priority: newPri } : c)));
    if (reviewedComplaint && reviewedComplaint.id === id) {
      setReviewedComplaint(prev => ({ ...prev, priority: newPri }));
    }

    try {
      await complaintService.updateComplaintPriority(id, newPri);
    } catch (error) {
      console.error("Failed to update priority in DB:", error);
      fetchComplaints(false);
    }
  };

  const handleAssignOfficial = async (id, officialName) => {
    const isAssign = officialName !== "Unassigned";
    const status = isAssign ? "Assigned" : "Pending";
    setComplaintsList((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updatedTimeline = [
            ...c.timeline,
            { status, date: new Date().toLocaleString(), remark: isAssign ? `Assigned to field official ${officialName}` : "Unassigned official" }
          ];
          return { ...c, official: officialName, status, timeline: updatedTimeline };
        }
        return c;
      })
    );
    if (reviewedComplaint && reviewedComplaint.id === id) {
      setReviewedComplaint(prev => ({
        ...prev,
        official: officialName,
        status,
        timeline: [
          ...prev.timeline,
          { status, date: new Date().toLocaleString(), remark: isAssign ? `Assigned to field official ${officialName}` : "Unassigned official" }
        ]
      }));
    }

    try {
      await complaintService.assignOfficial(id, officialName);
    } catch (error) {
      console.error("Failed to assign official in DB:", error);
      fetchComplaints(false);
    }
  };

  // Add new complaint
  const handleCreateComplaint = async (newComp) => {
    try {
      const fresh = {
        issue: newComp.issue,
        location: newComp.location,
        category: newComp.category,
        ward: newComp.ward,
        priority: newComp.priority,
        official: newComp.official,
        desc: newComp.desc || "No detailed description provided.",
        gps: "11.0180° N, 76.9510° E",
        img: ""
      };
      
      await complaintService.createComplaint(fresh);
      setShowCreateModal(false);
      fetchComplaints(true); // Reload list
    } catch (error) {
      console.error("Failed to save new complaint:", error);
      alert("Error saving complaint to database. Please check your credentials.");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* ── PAGE HEADER ── */}
          <div className="page-header">
            <div>
              <h1 className="dashboard-title">Complaints</h1>
              <p className="dashboard-subtitle">Review, manage, assign, and track citizen-reported civic issues.</p>
            </div>
            <div className="an-header-actions">
              
              {/* Export Button & Popover */}
              <div className="an-export-wrap" ref={exportRef}>
                <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}>
                  <ExportIcon /> Export
                </button>
                {showExportMenu && (
                  <div className="an-export-menu" style={{ right: 0, top: 36 }}>
                    <button onClick={() => alert("Exporting CSV file...")}>Export CSV</button>
                    <button onClick={() => alert("Exporting PDF report...")}>Export PDF</button>
                  </div>
                )}
              </div>

              <button className="btn-add" onClick={() => setShowCreateModal(true)}>
                <PlusIcon /> Create Complaint
              </button>
            </div>
          </div>

          {/* ── COMPACT SUMMARY STATS ── */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}><FolderIcon /></div>
              <div>
                <div className="scc-label">TOTAL COMPLAINTS</div>
                <div className="scc-value">{loading ? "..." : complaintsList.length.toLocaleString()}</div>
                <div className="scc-meta">All reported issues</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#fff7ed", color: "#d97706" }}><ClockIcon /></div>
              <div>
                <div className="scc-label">PENDING</div>
                <div className="scc-value">{loading ? "..." : complaintsList.filter(c => c.status === "Pending").length.toLocaleString()}</div>
                <div className="scc-meta">Require attention</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#faf5ff", color: "#7c3aed" }}><LoaderIcon /></div>
              <div>
                <div className="scc-label">IN PROGRESS</div>
                <div className="scc-value">{loading ? "..." : complaintsList.filter(c => c.status === "In Progress" || c.status === "Assigned").length.toLocaleString()}</div>
                <div className="scc-meta">Currently being resolved</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><CheckIcon /></div>
              <div>
                <div className="scc-label">RESOLVED</div>
                <div className="scc-value">{loading ? "..." : complaintsList.filter(c => c.status === "Resolved").length.toLocaleString()}</div>
                <div className="scc-meta">Successfully completed</div>
              </div>
            </div>
          </div>

          {/* ── FIND COMPLAINTS (Filter Panel) ── */}
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <div className="card-title" style={{ marginBottom: "14px", fontSize: "14px" }}>Find Complaints</div>
            <div className="c-filter-grid">
              <div className="off-search" style={{ gridColumn: "1 / -1" }}>
                <span>🔍</span>
                <input
                  placeholder="Search complaint ID, issue, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="c-filters-row">
                <select className="off-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <select className="off-filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                  {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <select className="off-filter-select" value={priFilter} onChange={(e) => setPriFilter(e.target.value)}>
                  {PRIORITY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <select className="off-filter-select" value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
                  {WARD_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <select className="off-filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                  {DEPT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <select className="off-filter-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  {DATE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <button className="btn-reset" onClick={resetFilters}>Reset Filters</button>
                <button className="btn-secondary" onClick={handleSimulateLoading} style={{ marginLeft: "auto" }}>
                  Reload Data
                </button>
              </div>
            </div>
          </div>

          {/* ── COMPLAINTS TABLE / CARDS CONTENT ── */}
          <div className="card" style={{ padding: "20px" }}>
            <div className="off-table-header" style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="card-title">All Complaints</span>
                <span className="off-count-pill">{filteredComplaints.length} complaints</span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <select className="off-filter-select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: "6px 10px" }}>
                  <option>Sort: Newest</option>
                  <option>Sort: Oldest</option>
                  <option>Sort: Priority</option>
                </select>
                
                <div className="view-toggle">
                  <button className={`view-btn ${view === "table" ? "active" : ""}`} onClick={() => setView("table")}>
                    <TableIcon /> Table
                  </button>
                  <button className={`view-btn ${view === "cards" ? "active" : ""}`} onClick={() => setView("cards")}>
                    <GridIcon /> Cards
                  </button>
                </div>
              </div>
            </div>

            {/* SKELETON LOADING STATE */}
            {loading ? (
              <div className="c-loading-skeleton">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="c-skeleton-row">
                    <div className="c-skeleton-bar" style={{ width: "8%" }} />
                    <div className="c-skeleton-bar" style={{ width: "35%" }} />
                    <div className="c-skeleton-bar" style={{ width: "10%" }} />
                    <div className="c-skeleton-bar" style={{ width: "8%" }} />
                    <div className="c-skeleton-bar" style={{ width: "8%" }} />
                    <div className="c-skeleton-bar" style={{ width: "10%" }} />
                    <div className="c-skeleton-bar" style={{ width: "12%" }} />
                  </div>
                ))}
              </div>
            ) : filteredComplaints.length === 0 ? (
              /* EMPTY STATE */
              <div className="c-empty-state">
                <div className="c-empty-icon">📂</div>
                <div className="c-empty-title">No complaints found</div>
                <div className="c-empty-subtitle">Try changing your search or filters.</div>
                <button className="btn-add" onClick={resetFilters} style={{ marginTop: "14px" }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {/* TABLE VIEW */}
                {view === "table" && (
                  <div className="off-table-wrap">
                    <table className="complaints-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Issue</th>
                          <th>Category</th>
                          <th>Ward</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Reported Date</th>
                          <th>Assigned Official</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComplaints.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <button className="c-id-link" onClick={() => setReviewedComplaint(c)}>
                                {c.id}
                              </button>
                            </td>
                            <td>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-dark)" }}>{c.issue}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px" }}>{c.location}</div>
                              </div>
                            </td>
                            <td style={{ fontSize: "12.5px", color: "var(--text-medium)" }}>{c.category}</td>
                            <td style={{ fontSize: "12.5px", color: "var(--text-medium)" }}>{c.ward}</td>
                            <td>
                              <span className={`badge ${c.priority === "High" ? "p-high" : c.priority === "Medium" ? "p-medium" : "p-low"}`}>
                                {c.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${c.status === "Pending" ? "s-pending" : c.status === "Assigned" ? "s-assigned" : c.status === "In Progress" ? "s-inprogress" : "s-resolved"}`}>
                                {c.status}
                              </span>
                            </td>
                            <td style={{ fontSize: "12px", color: "var(--text-light)" }}>{c.date}</td>
                            <td>
                              {c.official === "Unassigned" ? (
                                <span className="off-no-task">Unassigned</span>
                              ) : (
                                <span style={{ fontWeight: 500, fontSize: "12.5px" }}>{c.official}</span>
                              )}
                            </td>
                            <td>
                              <div className="off-actions">
                                <button className="c-action-btn-link" onClick={() => setReviewedComplaint(c)}>
                                  Review
                                </button>
                                <div className="off-menu-wrap">
                                  <button className="off-menu-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    setRowMenuId(rowMenuId === c.id ? null : c.id);
                                  }}>⋮</button>
                                  {rowMenuId === c.id && (
                                    <div className="off-dropdown" style={{ right: 0, top: 32 }}>
                                      <button onClick={() => setReviewedComplaint(c)}>View Details</button>
                                      <hr />
                                      {OFFICIALS.filter(o => o !== c.official).map((o) => (
                                        <button key={o} onClick={() => handleAssignOfficial(c.id, o)}>
                                          Assign: {o}
                                        </button>
                                      ))}
                                      <hr />
                                      {STATUS_OPTIONS.slice(1).filter(s => s !== c.status).map((s) => (
                                        <button key={s} onClick={() => handleStatusChange(c.id, s)}>
                                          Mark: {s}
                                        </button>
                                      ))}
                                      <hr />
                                      {PRIORITY_OPTIONS.slice(1).filter(p => p !== c.priority).map((p) => (
                                        <button key={p} onClick={() => handlePriorityChange(c.id, p)}>
                                          Priority: {p}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* CARDS VIEW */}
                {view === "cards" && (
                  <div className="off-cards-grid">
                    {filteredComplaints.map((c) => (
                      <div key={c.id} className="official-card">
                        <div className="off-card-top">
                          <span className="c-id-link" style={{ fontWeight: 700 }} onClick={() => setReviewedComplaint(c)}>{c.id}</span>
                          <span className={`badge ${c.status === "Pending" ? "s-pending" : c.status === "Assigned" ? "s-assigned" : c.status === "In Progress" ? "s-inprogress" : "s-resolved"}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="off-card-name" style={{ fontSize: "13.5px", marginTop: "8px" }}>{c.issue}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-light)", marginBottom: "8px" }}>{c.location}</div>
                        <div className="off-card-meta">
                          <span className="dept-badge" style={{ background: "#eff6ff", color: "#3b82f6" }}>{c.category}</span>
                          <span className="ward-badge">{c.ward}</span>
                          <span className={`badge ${c.priority === "High" ? "p-high" : c.priority === "Medium" ? "p-medium" : "p-low"}`}>
                            {c.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                          <span style={{ color: "var(--text-light)" }}>Official:</span>
                          <span style={{ fontWeight: 500, color: c.official === "Unassigned" ? "var(--text-light)" : "var(--text-dark)" }}>{c.official}</span>
                        </div>
                        <button className="btn-view-full" style={{ marginTop: "14px" }} onClick={() => setReviewedComplaint(c)}>
                          Review Details →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* PAGINATION */}
                <div className="off-pagination">
                  <span className="off-pagination-info">
                    Showing 1–{filteredComplaints.length} of 1,245 complaints
                  </span>
                  <div className="off-page-controls">
                    <button className="off-page-btn off-page-arrow" disabled>← Previous</button>
                    <button className="off-page-btn active">1</button>
                    <button className="off-page-btn">2</button>
                    <button className="off-page-btn">3</button>
                    <button className="off-page-btn">4</button>
                    <button className="off-page-btn">5</button>
                    <span style={{ margin: "0 4px", color: "var(--text-light)" }}>...</span>
                    <button className="off-page-btn">125</button>
                    <button className="off-page-btn off-page-arrow">Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ── CREATE COMPLAINT MODAL ── */}
      {showCreateModal && (
        <CreateModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateComplaint} />
      )}

      {/* ── COMPLAINT DETAILS VIEW PANEL (conceptual page/modal) ── */}
      {reviewedComplaint && (
        <DetailsModal
          complaint={reviewedComplaint}
          onClose={() => setReviewedComplaint(null)}
          onAssignOfficial={handleAssignOfficial}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      )}

    </div>
  );
};

/* ── MODAL SUB-COMPONENTS ── */
const CreateModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    issue: "",
    category: "Potholes",
    description: "",
    ward: "Ward 1",
    location: "",
    priority: "Medium",
    official: "Unassigned"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(form);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-head">
          <div>
            <div className="modal-title">Create Complaint</div>
            <div className="modal-subtitle">Log a new municipal complaint manually in the database.</div>
          </div>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Issue Title</label>
              <input
                className="form-input"
                placeholder="e.g. Broken water valve"
                value={form.issue}
                onChange={(e) => setForm({ ...form, issue: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.slice(1).map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ward</label>
              <select
                className="form-input"
                value={form.ward}
                onChange={(e) => setForm({ ...form, ward: e.target.value })}
              >
                {WARD_OPTIONS.slice(1).map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Official</label>
              <select
                className="form-input"
                value={form.official}
                onChange={(e) => setForm({ ...form, official: e.target.value })}
              >
                {OFFICIALS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="form-group full">
              <label className="form-label">Location Address</label>
              <input
                className="form-input"
                placeholder="e.g. 5th Main St. corner next to bank"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
              />
            </div>

            <div className="form-group full">
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Provide detailed description of the reported issue..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ resize: "none", height: "80px", fontFamily: "inherit" }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: "18px" }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit">Create Complaint</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetailsModal = ({ complaint: c, onClose, onAssignOfficial, onStatusChange, onPriorityChange }) => {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="od-panel" style={{ maxWidth: "780px" }}>
        
        {/* Profile Header */}
        <div className="od-head" style={{ paddingBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="c-id-badge">{c.id}</span>
              <span className={`badge ${c.priority === "High" ? "p-high" : c.priority === "Medium" ? "p-medium" : "p-low"}`}>{c.priority}</span>
              <span className={`badge ${c.status === "Pending" ? "s-pending" : c.status === "Assigned" ? "s-assigned" : c.status === "In Progress" ? "s-inprogress" : "s-resolved"}`}>{c.status}</span>
            </div>
            <div className="od-name" style={{ marginTop: "8px", fontSize: "16px" }}>{c.issue}</div>
            <div className="od-contact">{c.location} ({c.ward})</div>
          </div>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        {/* Details Grid Info */}
        <div className="od-stats-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="od-stat-tile" style={{ padding: "12px" }}>
            <div className="od-stat-val" style={{ fontSize: "14px" }}>{c.category}</div>
            <div className="od-stat-label">Category</div>
          </div>
          <div className="od-stat-tile" style={{ padding: "12px" }}>
            <div className="od-stat-val" style={{ fontSize: "14px" }}>{c.date}</div>
            <div className="od-stat-label">Reported Date</div>
          </div>
          <div className="od-stat-tile" style={{ padding: "12px" }}>
            <div className="od-stat-val" style={{ fontSize: "14px", color: c.official === "Unassigned" ? "var(--text-light)" : "var(--text-dark)" }}>{c.official}</div>
            <div className="od-stat-label">Official Assigned</div>
          </div>
          <div className="od-stat-tile" style={{ padding: "12px" }}>
            <div className="od-stat-val" style={{ fontSize: "12.5px" }}>{c.gps}</div>
            <div className="od-stat-label">GPS Coordinates</div>
          </div>
        </div>

        {/* Middle Content */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", padding: "18px 24px" }}>
          
          <div>
            <div className="od-section-title">Description</div>
            <p style={{ fontSize: "13px", color: "var(--text-medium)", lineHeight: "1.6", marginBottom: "16px" }}>{c.desc}</p>
            
            <div className="od-section-title">Timeline & History</div>
            <div className="timeline-trail">
              {c.timeline.map((item, idx) => (
                <div key={idx} className="timeline-node">
                  <div className="timeline-node-bullet" />
                  <div className="timeline-node-info">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="timeline-node-status">{item.status}</span>
                      <span className="timeline-node-date">{item.date}</span>
                    </div>
                    <div className="timeline-node-remark">{item.remark}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {/* Attachment image */}
            <div className="od-section-title">Citizen Attachment</div>
            {c.img ? (
              <div className="c-detail-img-wrap">
                <img src={c.img} alt="Pothole" />
              </div>
            ) : (
              <div className="c-detail-no-img">
                <span>📷</span>
                <div>No attachments provided</div>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="c-details-action-box">
              <div className="od-section-title" style={{ marginBottom: "8px" }}>Administrative Actions</div>
              
              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "11px" }}>Reassign Official</label>
                <select
                  className="form-input"
                  value={c.official}
                  onChange={(e) => onAssignOfficial(c.id, e.target.value)}
                  style={{ padding: "6px 8px", fontSize: "12px" }}
                >
                  {OFFICIALS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>Change Status</label>
                  <select
                    className="form-input"
                    value={c.status}
                    onChange={(e) => onStatusChange(c.id, e.target.value)}
                    style={{ padding: "6px 8px", fontSize: "12px" }}
                  >
                    {STATUS_OPTIONS.slice(1).map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>Set Priority</label>
                  <select
                    className="form-input"
                    value={c.priority}
                    onChange={(e) => onPriorityChange(c.id, e.target.value)}
                    style={{ padding: "6px 8px", fontSize: "12px" }}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: "14px 24px" }}>
          <button className="btn-secondary" onClick={onClose}>Close Details</button>
        </div>
      </div>
    </div>
  );
};

export default Complaints;
