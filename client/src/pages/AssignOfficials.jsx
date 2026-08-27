import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";

/* ── CONSTANTS ── */
const WARD_OPTIONS = Array.from({ length: 15 }, (_, i) => `Ward ${i + 1}`);
const CATEGORY_OPTIONS = ["Roads", "Electrical", "Sanitation", "Water Supply", "Drainage", "Footpath"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const DEPT_OPTIONS = ["Roads", "Electrical", "Sanitation", "Water Supply", "Drainage", "Public Works"];
const AVAIL_OPTIONS = ["All Availability", "Available", "Limited", "Full", "On Leave"];

/* ── MOCK DATA ── */
const INITIAL_UNASSIGNED = [
  {
    id: "CMP-1024",
    issue: "Deep pothole on Main St.",
    category: "Roads",
    ward: "Ward 5",
    priority: "High",
    date: "Oct 24, 2023",
    desc: "Large hazardous pothole in the center lane of Main street.",
    location: "Main Street",
    status: "Pending"
  },
  {
    id: "CMP-1019",
    issue: "Blocked drainage near market",
    category: "Drainage",
    ward: "Ward 3",
    priority: "High",
    date: "Oct 18, 2023",
    desc: "Plastic bottles and silt clogging market alley main drain.",
    location: "Commercial Alley 3",
    status: "Pending"
  },
  {
    id: "CMP-1017",
    issue: "Garbage pile near bus stand",
    category: "Sanitation",
    ward: "Ward 2",
    priority: "Medium",
    date: "Oct 17, 2023",
    desc: "Large commercial garbage dump accumulated next to bus stop.",
    location: "Central Bus Stand",
    status: "Pending"
  },
  {
    id: "CMP-1015",
    issue: "Streetlight not working",
    category: "Electrical",
    ward: "Ward 12",
    priority: "Low",
    date: "Oct 15, 2023",
    desc: "Light pole #41 has blown fuse.",
    location: "12th Cross Junction",
    status: "Pending"
  }
];

const INITIAL_OFFICIALS = [
  {
    id: 1,
    name: "Arun Kumar",
    initials: "AK",
    color: "#4f46e5",
    department: "Roads",
    ward: "Ward 5",
    assigned: 6,
    completed: 18,
    max: 10,
    availability: "Available"
  },
  {
    id: 2,
    name: "Karthik",
    initials: "K",
    color: "#0891b2",
    department: "Sanitation",
    ward: "Ward 2",
    assigned: 4,
    completed: 22,
    max: 10,
    availability: "Available"
  },
  {
    id: 3,
    name: "Ravi Kumar",
    initials: "RK",
    color: "#059669",
    department: "Water Supply",
    ward: "Ward 9",
    assigned: 8,
    completed: 15,
    max: 10,
    availability: "Limited"
  },
  {
    id: 4,
    name: "Suresh",
    initials: "S",
    color: "#7c3aed",
    department: "Electrical",
    ward: "Ward 12",
    assigned: 10,
    completed: 19,
    max: 10,
    availability: "Full"
  }
];

const INITIAL_RECENT = [
  { id: "CMP-1023", official: "Arun Kumar", department: "Roads", ward: "Ward 5", priority: "High", date: "Oct 24, 2023", status: "Assigned" },
  { id: "CMP-1020", official: "Karthik", department: "Sanitation", ward: "Ward 2", priority: "Medium", date: "Oct 23, 2023", status: "Assigned" },
  { id: "CMP-1018", official: "Ravi Kumar", department: "Water Supply", ward: "Ward 9", priority: "High", date: "Oct 22, 2023", status: "In Progress" }
];

/* ── ICONS ── */
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const CheckCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AssignOfficials = () => {
  const [unassigned, setUnassigned] = useState(INITIAL_UNASSIGNED);
  const [officials, setOfficials] = useState(INITIAL_OFFICIALS);
  const [recent, setRecent] = useState(INITIAL_RECENT);

  // Search & Filter state - Left Column
  const [compSearch, setCompSearch] = useState("");
  const [compWard, setCompWard] = useState("");
  const [compPri, setCompPri] = useState("");
  const [compCat, setCompCat] = useState("");

  // Search & Filter state - Right Column
  const [offSearch, setOffSearch] = useState("");
  const [offDept, setOffDept] = useState("");
  const [offWard, setOffWard] = useState("");
  const [offAvail, setOffAvail] = useState("All Availability");

  // Selection state
  const [selectedComp, setSelectedComp] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { pin, official }
  const [toastMsg, setToastMsg] = useState("");

  const handleRefresh = () => {
    setToastMsg("Official workloads updated.");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const selectComplaint = (comp) => {
    setSelectedComp(selectedComp && selectedComp.id === comp.id ? null : comp);
  };

  const handleAssignClick = (official, e) => {
    e.stopPropagation();
    if (!selectedComp) {
      alert("Please select an unassigned complaint from the left panel first.");
      return;
    }
    setConfirmModal({ comp: selectedComp, official });
  };

  const handleConfirmAssignment = (e) => {
    e.preventDefault();
    const { comp, official } = confirmModal;

    // Remove from unassigned list
    setUnassigned(prev => prev.filter(c => c.id !== comp.id));
    
    // Update official workload count
    setOfficials(prev => prev.map(o => {
      if (o.id === official.id) {
        return {
          ...o,
          assigned: o.assigned + 1,
          availability: o.assigned + 1 >= o.max ? "Full" : (o.assigned + 1 >= 8 ? "Limited" : "Available")
        };
      }
      return o;
    }));

    // Add to recent assignments
    const freshRecent = {
      id: comp.id,
      official: official.name,
      department: official.department,
      ward: official.ward,
      priority: comp.priority,
      date: "Oct 27, 2023",
      status: "Assigned"
    };
    setRecent([freshRecent, ...recent]);

    // Cleanup state
    setToastMsg(`Complaint ${comp.id} assigned successfully to ${official.name}.`);
    setSelectedComp(null);
    setConfirmModal(null);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Complaint filters
  const filteredComplaints = unassigned.filter(c => {
    const q = compSearch.toLowerCase();
    if (q && !c.id.toLowerCase().includes(q) && !c.issue.toLowerCase().includes(q)) return false;
    if (compWard && c.ward !== compWard) return false;
    if (compPri && c.priority !== compPri) return false;
    if (compCat && c.category !== compCat) return false;
    return true;
  });

  // Official filters
  const filteredOfficials = officials.filter(o => {
    const q = offSearch.toLowerCase();
    if (q && !o.name.toLowerCase().includes(q)) return false;
    if (offDept && o.department !== offDept) return false;
    if (offWard && o.ward !== offWard) return false;
    if (offAvail !== "All Availability" && o.availability !== offAvail) return false;
    return true;
  });

  // Matching check helper
  const getMatchScore = (official, comp) => {
    if (!comp) return null;
    return {
      dept: official.department === comp.category,
      ward: official.ward === comp.ward,
      avail: official.availability !== "Full" && official.availability !== "On Leave",
      workload: official.assigned < official.max
    };
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* Toast Alert */}
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
              <h1 className="dashboard-title">Assign Officials</h1>
              <p className="dashboard-subtitle">Assign municipal complaints to field officials and track their workload.</p>
            </div>
            <button className="btn-secondary" onClick={handleRefresh} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <RefreshIcon /> Refresh
            </button>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}><UsersIcon /></div>
              <div>
                <div className="scc-label">TOTAL OFFICIALS</div>
                <div className="scc-value">48</div>
                <div className="scc-meta">Active municipal officials</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#f0fdf4", color: "#22c55e" }}><CheckIcon /></div>
              <div>
                <div className="scc-label">AVAILABLE</div>
                <div className="scc-value">16</div>
                <div className="scc-meta">Ready for assignment</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}><ClockIcon /></div>
              <div>
                <div className="scc-label">ASSIGNED TODAY</div>
                <div className="scc-value">24</div>
                <div className="scc-meta">Complaints assigned today</div>
              </div>
            </div>
            <div className="card stat-card-compact">
              <div className="scc-icon" style={{ background: "#fef2f2", color: "#ef4444" }}><AlertIcon /></div>
              <div>
                <div className="scc-label">OVERLOADED</div>
                <div className="scc-value">8</div>
                <div className="scc-meta">Officials with high workload</div>
              </div>
            </div>
          </div>

          {/* ── TWO COLUMN WORKSPACE ── */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="settings-card-header" style={{ marginBottom: 16 }}>
              <h2 className="settings-card-title">Assign Complaint</h2>
              <p className="settings-card-subtitle">Select a complaint and assign it to the appropriate field official.</p>
            </div>

            <div className="ao-workspace-grid">
              
              {/* LEFT COLUMN: Complaints select list */}
              <div className="ao-left-col">
                <div className="ao-col-title">Unassigned Complaints ({filteredComplaints.length})</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  <div className="off-search">
                    <span>🔍</span>
                    <input
                      placeholder="Search complaint ID or issue..."
                      value={compSearch}
                      onChange={e => setCompSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }} value={compWard} onChange={e => setCompWard(e.target.value)}>
                      <option value="">Ward ▾</option>
                      {WARD_OPTIONS.map(w => <option key={w}>{w}</option>)}
                    </select>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }} value={compPri} onChange={e => setCompPri(e.target.value)}>
                      <option value="">Priority ▾</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }} value={compCat} onChange={e => setCompCat(e.target.value)}>
                      <option value="">Category ▾</option>
                      {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="ao-list-wrap scrollable-list">
                  {filteredComplaints.length === 0 ? (
                    <div className="off-no-results">
                      {unassigned.length === 0 ? "Great! There are currently no unassigned complaints." : "No matching unassigned complaints."}
                    </div>
                  ) : (
                    filteredComplaints.map(c => {
                      const isSelected = selectedComp && selectedComp.id === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`ao-complaint-item ${isSelected ? "active" : ""}`}
                          onClick={() => selectComplaint(c)}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span className="ao-item-id">{c.id}</span>
                            <span className={`badge ${c.priority === "High" ? "p-high" : c.priority === "Medium" ? "p-medium" : "p-low"}`}>{c.priority}</span>
                          </div>
                          <div className="ao-item-title">{c.issue}</div>
                          <div className="ao-item-meta">{c.category} • {c.ward} • {c.date}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Left side preview panel */}
                {selectedComp && (
                  <div className="ao-preview-box animation-fade" style={{ marginTop: 14 }}>
                    <div className="ao-preview-title">SELECTED COMPLAINT</div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-dark)" }}>{selectedComp.id}</span>
                      <span className={`badge ${selectedComp.priority === "High" ? "p-high" : selectedComp.priority === "Medium" ? "p-medium" : "p-low"}`}>{selectedComp.priority}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dark)", marginBottom: 6 }}>{selectedComp.issue}</div>
                    <div className="mdp-meta" style={{ gap: 4, fontSize: 11.5 }}>
                      <div><strong>Category:</strong> {selectedComp.category}</div>
                      <div><strong>Ward:</strong> {selectedComp.ward}</div>
                      <div><strong>Location:</strong> {selectedComp.location}</div>
                      <div><strong>Reported:</strong> {selectedComp.date}</div>
                    </div>
                    <a className="btn-secondary" style={{ width: "100%", textDecoration: "none", display: "inline-flex", justifyContent: "center", marginTop: 8 }} href={`/complaints`}>
                      View Complaint
                    </a>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: Officials card list */}
              <div className="ao-right-col">
                <div className="ao-col-title">Available Officials ({filteredOfficials.length})</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  <div className="off-search">
                    <span>🔍</span>
                    <input
                      placeholder="Search official name..."
                      value={offSearch}
                      onChange={e => setOffSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 6 }}>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }} value={offDept} onChange={e => setOffDept(e.target.value)}>
                      <option value="">Department ▾</option>
                      {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }} value={offWard} onChange={e => setOffWard(e.target.value)}>
                      <option value="">Ward ▾</option>
                      {WARD_OPTIONS.map(w => <option key={w}>{w}</option>)}
                    </select>
                    <select className="off-filter-select" style={{ fontSize: 11, padding: "6px 8px" }} value={offAvail} onChange={e => setOffAvail(e.target.value)}>
                      {AVAIL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="ao-officials-list scrollable-list">
                  {filteredOfficials.length === 0 ? (
                    <div className="off-no-results">
                      No suitable officials available
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-secondary" onClick={() => { setOffDept(""); setOffWard(""); setOffAvail("All Availability"); }}>
                          View All Officials
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredOfficials.map(o => {
                      const match = getMatchScore(o, selectedComp);
                      const isFull = o.assigned >= o.max;
                      return (
                        <div key={o.id} className="ao-official-card-item">
                          <div className="ao-off-top">
                            <div className="off-avatar-sm" style={{ background: o.color }}>{o.initials}</div>
                            <div>
                              <div className="ao-off-name">{o.name}</div>
                              <div className="ao-off-dept">{o.department} Department • {o.ward}</div>
                            </div>
                            <span className={`badge ${o.availability === "Available" ? "s-resolved" : o.availability === "Limited" ? "s-pending" : "s-inprogress"}`} style={{ marginLeft: "auto" }}>
                              {o.availability}
                            </span>
                          </div>

                          <div className="ao-off-workload">
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-medium)" }}>
                              <span>Assigned: {o.assigned} / {o.max} complaints</span>
                              <span style={{ fontWeight: 600 }}>Capacity: {Math.round((o.assigned / o.max) * 100)}%</span>
                            </div>
                            <div className="ao-progress-bar-wrap">
                              <div className="ao-progress-bar-fill" style={{
                                width: `${(o.assigned / o.max) * 100}%`,
                                background: isFull ? "#ef4444" : (o.assigned >= 8 ? "#f97316" : "#3b82f6")
                              }} />
                            </div>
                          </div>

                          {/* Matching Recommender */}
                          {match && (
                            <div className="ao-matching-indicators">
                              <div className="ao-match-title">Recommended for this complaint</div>
                              <div className="ao-match-row">
                                <span className="ao-match-check"><CheckCircle /> Dept: {o.department}</span>
                                <span className="ao-match-check"><CheckCircle /> Ward: {o.ward}</span>
                                <span className="ao-match-check"><CheckCircle /> Avail: {o.availability}</span>
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                            {isFull ? (
                              <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => alert(`Showing Suresh current 10 assignments workload.`)}>
                                View Workload
                              </button>
                            ) : (
                              <button className="btn-primary-settings" style={{ padding: "5px 12px", fontSize: 11.5 }} onClick={(e) => handleAssignClick(o, e)}>
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

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
                <thead>
                  <tr>
                    <th>Official</th>
                    <th>Department</th>
                    <th>Ward</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Workload</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officials.map(o => (
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
                              background: o.assigned >= 10 ? "#ef4444" : (o.assigned >= 8 ? "#f97316" : "#22c55e")
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${o.availability === "Available" ? "s-resolved" : o.availability === "Limited" ? "s-pending" : "s-inprogress"}`}>
                          {o.availability}
                        </span>
                      </td>
                      <td>
                        <button className="c-action-btn-link" onClick={() => alert(`Viewing full assignment details for ${o.name}.`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── RECENT ASSIGNMENTS TABLE ── */}
          <div className="card" style={{ padding: 20 }}>
            <div className="settings-card-header" style={{ marginBottom: 14 }}>
              <h2 className="settings-card-title">Recent Assignments</h2>
              <p className="settings-card-subtitle">List of complaints assigned to officials recently.</p>
            </div>
            <div className="off-table-wrap">
              <table className="complaints-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Official</th>
                    <th>Department</th>
                    <th>Ward</th>
                    <th>Priority</th>
                    <th>Assigned Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, idx) => (
                    <tr key={idx}>
                      <td><span className="cid">{r.id}</span></td>
                      <td style={{ fontWeight: 600, fontSize: 13, color: "var(--text-dark)" }}>{r.official}</td>
                      <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{r.department}</td>
                      <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{r.ward}</td>
                      <td>
                        <span className={`badge ${r.priority === "High" ? "p-high" : r.priority === "Medium" ? "p-medium" : "p-low"}`}>{r.priority}</span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-light)" }}>{r.date}</td>
                      <td>
                        <span className={`badge ${r.status === "Pending" ? "s-pending" : r.status === "Assigned" ? "s-assigned" : "s-inprogress"}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── ASSIGN CONFIRMATION MODAL ── */}
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
                    {confirmModal.comp.id} - {confirmModal.comp.issue}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-light)", fontWeight: 700 }}>To Field Official</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dark)", marginTop: 2 }}>
                    {confirmModal.official.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-medium)", marginTop: 1 }}>
                    {confirmModal.official.department} Department • {confirmModal.official.ward}
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
