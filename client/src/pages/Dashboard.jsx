import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
} from "chart.js";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import ComplaintStatus from "../components/ComplaintStatus";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

/* ── DATA ── */
const complaints = [
  { id: "CMP-1024", issue: "Deep pothole on Main St.", category: "Roads",        ward: "Ward 5",  priority: "High",   status: "Pending",     date: "Oct 24, 2023" },
  { id: "CMP-1023", issue: "Streetlight not working",  category: "Electrical",   ward: "Ward 12", priority: "Low",    status: "Assigned",    date: "Oct 23, 2023" },
  { id: "CMP-1022", issue: "Garbage pile buildup",     category: "Sanitation",   ward: "Ward 2",  priority: "Medium", status: "In Progress", date: "Oct 22, 2023" },
  { id: "CMP-1021", issue: "Water leakage near park",  category: "Water Supply", ward: "Ward 9",  priority: "High",   status: "Resolved",    date: "Oct 20, 2023" },
];

const barData = {
  labels: ["Potholes", "Streetlights", "Garbage", "Footpath", "Drainage", "Water Supply"],
  datasets: [
    { label: "Reported", data: [235, 180, 205, 118, 155, 175], backgroundColor: "#1e3a5f", borderRadius: 4, borderSkipped: false },
    { label: "Resolved", data: [198, 148, 172,  96, 126, 143], backgroundColor: "#93c5fd", borderRadius: 4, borderSkipped: false },
  ],
};

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8" } },
    y: {
      grid: { color: "#f1f5f9" }, max: 260,
      ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8", stepSize: 50 },
    },
  },
};

const donutData = {
  labels: ["Resolved", "In Progress", "Assigned", "Pending"],
  datasets: [{
    data: [705, 250, 180, 110],
    backgroundColor: ["#14b8a6", "#3b82f6", "#f97316", "#cbd5e1"],
    borderWidth: 0, hoverOffset: 4,
  }],
};

const donutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: "72%",
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
};

const statusItems = [
  { label: "Resolved",    pct: "55%", count: "(705)", color: "#14b8a6" },
  { label: "In Progress", pct: "20%", count: "(250)", color: "#3b82f6" },
  { label: "Assigned",    pct: "15%", count: "(180)", color: "#f97316" },
  { label: "Pending",     pct: "10%", count: "(110)", color: "#cbd5e1" },
];

const mapMarkers = [
  { top: "43%", left: "40%", color: "#ef4444", label: "High" },
  { top: "30%", left: "66%", color: "#0d9488", label: "Low" },
  { top: "60%", left: "55%", color: "#d97706", label: "Medium" },
  { top: "67%", left: "27%", color: "#6b7280", label: "Resolved" },
];

const priorityMap = { High: "p-high", Medium: "p-medium", Low: "p-low" };
const statusMap   = { Pending: "s-pending", Assigned: "s-assigned", "In Progress": "s-inprogress", Resolved: "s-resolved" };

/* ── ICON HELPERS ── */
const DocIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const HourglassIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 00-.586-1.414L12 12M7 22v-4.172a2 2 0 01.586-1.414L12 12M17 2v4.172a2 2 0 01-.586 1.414L12 12M7 2v4.172a2 2 0 00.586 1.414L12 12"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const MapPin = ({ color }) => (
  <svg width="26" height="34" viewBox="0 0 26 34" fill="none">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 9.36 13 21 13 21s13-11.64 13-21C26 5.82 20.18 0 13 0z" fill={color}/>
    <circle cx="13" cy="13" r="5" fill="white"/>
  </svg>
);

/* ── COMPONENT ── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("This Month");
  const [activeView, setActiveView] = useState("Comfortable");

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Municipal Dashboard</h1>
              <p className="dashboard-subtitle">Monitor civic issues, assignments, and resolution progress.</p>
            </div>
            <div className="filter-group">
              {["This Month", "This Week", "Today"].map(f => (
                <button key={f} className={`filter-btn ${activeFilter === f ? "active" : ""}`} onClick={() => setActiveFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="stat-grid">
            <StatCard label="TOTAL ISSUES"   value="1,245" subtitle="Reported this month"    icon={<DocIcon />}      iconBg="#eff6ff" iconColor="#3b82f6" trendIcon="↗" trendClass="" />
            <StatCard label="PENDING ISSUES" value="342"   subtitle="Require attention"       icon={<HourglassIcon />} iconBg="#fff7ed" iconColor="#f97316" trendIcon="⚠" trendClass="warn" />
            <StatCard label="RESOLVED ISSUES" value="705"  subtitle="Successfully completed"  icon={<CheckIcon />}    iconBg="#f0fdf4" iconColor="#22c55e" trendIcon="↗" trendClass="" />
            <StatCard label="HIGH PRIORITY"  value="28"    subtitle="Need immediate action"   icon={<AlertIcon />}    iconBg="#fef2f2" iconColor="#ef4444" trendIcon="⚠" trendClass="urgent" urgent />
          </div>

          {/* Charts Row */}
          <div className="charts-row">

            {/* Bar Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Issue Overview</div>
                  <div className="card-subtitle">Reported vs Resolved civic issues by category</div>
                </div>
                <button className="more-btn">⋮</button>
              </div>
              <div style={{ height: 200 }}>
                <Bar data={barData} options={barOptions} />
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot" style={{ background: "#1e3a5f" }} /> Reported</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#93c5fd" }} /> Resolved</span>
              </div>
            </div>

            {/* Complaint Status Card */}
            <ComplaintStatus />
          </div>

          {/* Map Section */}
          <div className="card map-section">
            <div className="map-header">
              <div>
                <div className="card-title">Civic Issues Across Municipality</div>
                <div className="card-subtitle">124 active issues across 15 wards</div>
              </div>
              <div className="map-controls">
                <div className="search-location">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input placeholder="Search location..." />
                </div>
                <select className="map-select"><option>All Wards</option><option>Ward 1</option><option>Ward 2</option></select>
                <select className="map-select"><option>All Categories</option><option>Roads</option><option>Sanitation</option></select>
              </div>
            </div>
            <div className="map-container">
              {/* Decorative roads */}
              <div className="map-road-h" style={{ top: "38%", opacity: .5 }} />
              <div className="map-road-h" style={{ top: "65%", opacity: .4 }} />
              <div className="map-road-v" style={{ left: "45%", opacity: .5 }} />
              <div className="map-road-v" style={{ left: "70%", opacity: .4 }} />

              {mapMarkers.map((m, i) => (
                <div key={i} className="map-pin" style={{ top: m.top, left: m.left }}>
                  <MapPin color={m.color} />
                </div>
              ))}

              <div className="priority-legend">
                <div className="priority-legend-title">Priority Legend</div>
                {[
                  { label: "High (Red)",      color: "#ef4444" },
                  { label: "Medium (Orange)", color: "#d97706" },
                  { label: "Low (Teal)",      color: "#0d9488" },
                  { label: "Resolved (Gray)", color: "#6b7280" },
                ].map(p => (
                  <div key={p.label} className="priority-legend-item">
                    <span className="pdot" style={{ background: p.color }} />
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Complaints */}
          <div className="card">
            <div className="complaints-header">
              <div className="card-title">Recent Complaints</div>
              <div className="view-toggle">
                {["Comfortable", "Compact"].map(v => (
                  <button key={v} className={`view-btn ${activeView === v ? "active" : ""}`} onClick={() => setActiveView(v)}>{v}</button>
                ))}
              </div>
            </div>
            <table className="complaints-table">
              <thead>
                <tr>
                  {["ID", "Issue", "Category", "Ward", "Priority", "Status", "Date", "Action"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id}>
                    <td><span className="cid">{c.id}</span></td>
                    <td>{c.issue}</td>
                    <td>{c.category}</td>
                    <td>{c.ward}</td>
                    <td><span className={`badge ${priorityMap[c.priority]}`}>{c.priority}</span></td>
                    <td><span className={`badge ${statusMap[c.status]}`}>{c.status}</span></td>
                    <td>{c.date}</td>
                    <td><button className="review-btn">Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="view-all" onClick={() => navigate("/complaints")} style={{ cursor: "pointer" }}>View All 1,245 Complaints</div>
          </div>

          {/* Bottom Actions */}
          <div className="bottom-actions">
            <button className="action-btn primary" onClick={() => navigate("/complaints")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              View All Complaints
            </button>
            <button className="action-btn" onClick={() => navigate("/issue-map")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              View Issue Map
            </button>
            <button className="action-btn" onClick={() => navigate("/officials/assign")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Assign Official
            </button>
            <button className="action-btn" onClick={() => navigate("/analytics")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              View Analytics
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
