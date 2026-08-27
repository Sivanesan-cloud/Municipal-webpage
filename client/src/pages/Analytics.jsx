import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

/* ── INLINE BAR-LABEL PLUGIN (not globally registered) ── */
const barLabelPlugin = {
  id: "barLabel",
  afterDatasetsDraw(chart) {
    const { ctx, data, options } = chart;
    const isHoriz = options.indexAxis === "y";
    data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) return;
      meta.data.forEach((bar, j) => {
        const v = ds.data[j];
        if (v == null) return;
        ctx.save();
        ctx.font = "600 10.5px Inter, sans-serif";
        ctx.fillStyle = "#475569";
        if (isHoriz) {
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(v, bar.x + 6, bar.y);
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(v, bar.x, bar.y - 4);
        }
        ctx.restore();
      });
    });
  },
};

/* ── STATIC DATA ── */
const MONTHS          = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const REPORTED        = [820, 910, 980, 1050, 1140, 1245];
const RESOLVED_LINE   = [690, 740, 800, 850, 910, 980];

const CAT_LABELS  = ["Garbage", "Potholes", "Drainage", "Streetlights", "Water Supply", "Footpath"];
const CAT_VALUES  = [220, 180, 160, 140, 110, 95];
const CAT_COLORS  = ["#3b82f6", "#6366f1", "#8b5cf6", "#f97316", "#0d9488", "#22c55e"];

const WARD_LABELS = ["Ward 1","Ward 2","Ward 3","Ward 4","Ward 5","Ward 6","Ward 7","Ward 8","Ward 9","Ward 10","Ward 11","Ward 12"];
const WARD_VALUES = [72, 128, 84, 115, 156, 63, 109, 91, 137, 76, 102, 112];
const maxWardVal  = Math.max(...WARD_VALUES);
const WARD_COLORS = WARD_VALUES.map(v =>
  v === maxWardVal ? "#1d4ed8" : v >= 120 ? "#3b82f6" : "#93c5fd"
);

const DEPT_TABLE = [
  { dept: "Roads",         total: 280, resolved: 205, pending: 75,  rate: 73.2, avg: "2.4 days" },
  { dept: "Electrical",    total: 190, resolved: 165, pending: 25,  rate: 86.8, avg: "1.2 days" },
  { dept: "Sanitation",    total: 310, resolved: 250, pending: 60,  rate: 80.6, avg: "1.7 days" },
  { dept: "Water Supply",  total: 240, resolved: 165, pending: 75,  rate: 68.8, avg: "3.1 days" },
  { dept: "Drainage",      total: 225, resolved: 180, pending: 45,  rate: 80.0, avg: "2.8 days" },
];

const RES_ITEMS = [
  { label: "Resolved",    count: 705, color: "#22c55e" },
  { label: "In Progress", count: 198, color: "#3b82f6" },
  { label: "Assigned",    count: 150, color: "#8b5cf6" },
  { label: "Pending",     count: 342, color: "#f59e0b" },
];

const INSIGHTS = [
  { icon: "📊", text: "Garbage complaints are the highest reported category this month with 220 issues." },
  { icon: "📍", text: "Ward 5 has the highest complaint volume with 156 active issues across the municipality." },
  { icon: "⚡", text: "Electrical department has the fastest average resolution time at 1.2 days per complaint." },
  { icon: "⏱️", text: "Water Supply has the longest average resolution time at 3.1 days — may need more resources." },
];

/* ── CHART DATA & OPTIONS ── */
const trendData = {
  labels: MONTHS,
  datasets: [
    {
      label: "Reported",
      data: REPORTED,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,.09)",
      fill: true, tension: 0.4,
      pointRadius: 4, pointHoverRadius: 7,
      pointBackgroundColor: "#3b82f6",
      borderWidth: 2.5,
    },
    {
      label: "Resolved",
      data: RESOLVED_LINE,
      borderColor: "#22c55e",
      backgroundColor: "rgba(34,197,94,.07)",
      fill: true, tension: 0.4,
      pointRadius: 4, pointHoverRadius: 7,
      pointBackgroundColor: "#22c55e",
      borderWidth: 2.5,
    },
  ],
};

const trendOptions = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a", titleColor: "#fff",
      bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11, family: "Inter" }, color: "#94a3b8" } },
    y: {
      min: 0, max: 1350, grid: { color: "#f1f5f9" },
      ticks: { stepSize: 250, font: { size: 10, family: "Inter" }, color: "#94a3b8" },
    },
  },
};

const catData = {
  labels: CAT_LABELS,
  datasets: [{
    data: CAT_VALUES,
    backgroundColor: CAT_COLORS,
    borderRadius: 6, borderSkipped: false, barThickness: 22,
  }],
};

const catOptions = {
  indexAxis: "y",
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.parsed.x} complaints` },
    },
  },
  scales: {
    x: { min: 0, max: 270, grid: { color: "#f1f5f9" }, ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8" } },
    y: { grid: { display: false }, ticks: { font: { size: 11.5, family: "Inter" }, color: "#475569" } },
  },
};

const wardChartData = {
  labels: WARD_LABELS,
  datasets: [{
    label: "Complaints",
    data: WARD_VALUES,
    backgroundColor: WARD_COLORS,
    borderRadius: 5, borderSkipped: false, barThickness: 28,
  }],
};

const wardOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.parsed.y} complaints` },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10.5, family: "Inter" }, color: "#475569" } },
    y: {
      min: 0, max: 185, grid: { color: "#f1f5f9" },
      ticks: { stepSize: 50, font: { size: 10, family: "Inter" }, color: "#94a3b8" },
    },
  },
};

const resDoughnutData = {
  labels: ["Resolved", "Not Resolved"],
  datasets: [{
    data: [705, 540],
    backgroundColor: ["#22c55e", "#e2e8f0"],
    borderWidth: 0, hoverOffset: 5,
  }],
};

const resDoughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: "76%",
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.label}: ${ctx.parsed}` },
    },
  },
  animation: { animateRotate: true, duration: 900 },
};

const avgTimeData = {
  labels: ["Electrical", "Sanitation", "Roads", "Drainage", "Water Supply"],
  datasets: [{
    data: [1.2, 1.7, 2.4, 2.8, 3.1],
    backgroundColor: ["#22c55e", "#86efac", "#3b82f6", "#f97316", "#ef4444"],
    borderRadius: 6, borderSkipped: false, barThickness: 20,
  }],
};

const avgTimeOptions = {
  indexAxis: "y",
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.parsed.x} days avg` },
    },
  },
  scales: {
    x: {
      min: 0, max: 4, grid: { color: "#f1f5f9" },
      ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8", callback: v => `${v}d` },
    },
    y: { grid: { display: false }, ticks: { font: { size: 11.5, family: "Inter" }, color: "#475569" } },
  },
};

/* ── ICONS ── */
const TrendIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const TargetIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const ClockIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AlertIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const DlIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

/* ── RATE COLOR ── */
const rateStyle = r =>
  r >= 80 ? { color: "#15803d", bg: "#f0fdf4" } :
  r >= 70 ? { color: "#1d4ed8", bg: "#eff6ff" } :
            { color: "#d97706", bg: "#fff7ed" };

/* ── COMPONENT ── */
const Analytics = () => {
  const [dateRange,   setDateRange]   = useState("This Month");
  const [wardFilter,  setWardFilter]  = useState("");
  const [catFilter,   setCatFilter]   = useState("");
  const [deptFilter,  setDeptFilter]  = useState("");
  const [showExport,  setShowExport]  = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const close = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const resetFilters = () => { setWardFilter(""); setCatFilter(""); setDeptFilter(""); };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">

          {/* ── PAGE HEADER ── */}
          <div className="page-header">
            <div>
              <h1 className="dashboard-title">Analytics</h1>
              <p className="dashboard-subtitle">Monitor municipal complaint trends, resolution performance and service delivery.</p>
            </div>
            <div className="an-header-actions">
              {/* Export dropdown */}
              <div className="an-export-wrap" ref={exportRef}>
                <button className="an-btn-export" onClick={() => setShowExport(p => !p)}>
                  <DlIcon /> Export Report
                </button>
                {showExport && (
                  <div className="an-export-menu" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowExport(false)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:7}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Export PDF
                    </button>
                    <button onClick={() => setShowExport(false)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:7}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
              {/* Date range */}
              <select className="off-filter-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>Last 3 Months</option>
                <option>This Year</option>
              </select>
            </div>
          </div>

          {/* ── FILTER BAR ── */}
          <div className="card off-filter-bar">
            <div className="off-search" style={{ maxWidth: 210, flexShrink: 0 }}>
              <SearchIcon />
              <input placeholder="Search ward, category..." />
            </div>
            <div className="off-filters">
              <select className="off-filter-select" value={wardFilter} onChange={e => setWardFilter(e.target.value)}>
                <option value="">Ward ▾</option>
                {WARD_LABELS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <select className="off-filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">Category ▾</option>
                {CAT_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="off-filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">Department ▾</option>
                {DEPT_TABLE.map(d => <option key={d.dept} value={d.dept}>{d.dept}</option>)}
              </select>
              <button className="an-btn-apply">Apply Filters</button>
              <button className="btn-reset" onClick={resetFilters}>Reset</button>
            </div>
          </div>

          {/* ── OVERVIEW STAT CARDS ── */}
          <div className="stat-grid">
            <StatCard label="TOTAL COMPLAINTS"  value="1,245"   subtitle="+12.5% from last month"     icon={<TrendIcon />}  iconBg="#eff6ff" iconColor="#3b82f6" trendIcon="↑" trendClass="warn" />
            <StatCard label="RESOLUTION RATE"   value="78.5%"   subtitle="+5.2% from last month"      icon={<TargetIcon />} iconBg="#f0fdf4" iconColor="#22c55e" trendIcon="↑" trendClass="" />
            <StatCard label="AVG RESOLUTION"    value="2.4 Days" subtitle="−0.6 days from last month" icon={<ClockIcon />}  iconBg="#f0fdf4" iconColor="#22c55e" trendIcon="↓" trendClass="" />
            <StatCard label="HIGH PRIORITY"     value="28"      subtitle="8 currently pending"        icon={<AlertIcon />}  iconBg="#fef2f2" iconColor="#ef4444" trendIcon="⚠" trendClass="urgent" urgent />
          </div>

          {/* ── CHART ROW 1 — Trends + Category ── */}
          <div className="an-chart-row">

            {/* Complaint Trends (Line) */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Complaint Trends</div>
                  <div className="card-subtitle">Monthly reported and resolved civic issues</div>
                </div>
                <button className="more-btn">⋮</button>
              </div>
              <div style={{ height: 250 }}>
                <Line data={trendData} options={trendOptions} />
              </div>
              <div className="chart-legend" style={{ marginTop: 12 }}>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: "#3b82f6", borderRadius: "50%" }} /> Reported
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: "#22c55e", borderRadius: "50%" }} /> Resolved
                </span>
              </div>
            </div>

            {/* Issues by Category (Horiz Bar) */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Issues by Category</div>
                  <div className="card-subtitle">Distribution of reported civic issues</div>
                </div>
              </div>
              <div style={{ height: 250 }}>
                <Bar data={catData} options={catOptions} plugins={[barLabelPlugin]} />
              </div>
            </div>
          </div>

          {/* ── WARD CHART — Full width ── */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Issues by Ward</div>
                <div className="card-subtitle">Complaint distribution across municipal wards</div>
              </div>
              <select className="off-filter-select">
                <option>All Wards ▾</option>
                {WARD_LABELS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div style={{ height: 235 }}>
              <Bar data={wardChartData} options={wardOptions} plugins={[barLabelPlugin]} />
            </div>
            <div className="chart-legend" style={{ marginTop: 10, justifyContent: "flex-end" }}>
              <span className="legend-item"><span className="legend-dot" style={{ background: "#1d4ed8", borderRadius: 3 }} /> Highest Volume</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: "#3b82f6", borderRadius: 3 }} /> High</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: "#93c5fd", borderRadius: 3 }} /> Normal</span>
            </div>
          </div>

          {/* ── PERFORMANCE ROW — Resolution + Avg Time ── */}
          <div className="an-perf-row">

            {/* Resolution Performance (Donut) */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div>
                  <div className="card-title">Resolution Performance</div>
                  <div className="card-subtitle">Overall municipal resolution rate</div>
                </div>
              </div>
              <div className="an-resolution-wrap">
                <div className="an-donut-outer">
                  <Doughnut data={resDoughnutData} options={resDoughnutOptions} />
                  <div className="an-res-center">
                    <div className="an-res-rate">78.5%</div>
                    <div className="an-res-rate-label">Resolution Rate</div>
                  </div>
                </div>
                <div className="an-res-breakdown">
                  {RES_ITEMS.map(s => (
                    <div key={s.label} className="an-res-item">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0, display: "inline-block" }} />
                        <span className="an-res-label">{s.label}</span>
                      </div>
                      <span className="an-res-count">{s.count.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="an-res-total-row">
                    <span>Total</span>
                    <span style={{ fontWeight: 800 }}>1,245</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avg Resolution Time (Horiz Bar) */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Average Resolution Time</div>
                  <div className="card-subtitle">Days taken to resolve complaints by department</div>
                </div>
              </div>
              <div style={{ height: 210 }}>
                <Bar data={avgTimeData} options={avgTimeOptions} plugins={[barLabelPlugin]} />
              </div>
              <div className="chart-legend" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#22c55e", borderRadius: "50%" }} /> Fast (&lt;2d)</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#3b82f6", borderRadius: "50%" }} /> Average</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#ef4444", borderRadius: "50%" }} /> Slow (&gt;3d)</span>
              </div>
            </div>
          </div>

          {/* ── DEPARTMENT PERFORMANCE TABLE ── */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Department Performance</div>
                <div className="card-subtitle">Complaint resolution metrics by municipal department</div>
              </div>
              <button className="more-btn">⋮</button>
            </div>
            <div className="off-table-wrap">
              <table className="complaints-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Total Issues</th>
                    <th>Resolved</th>
                    <th>Pending</th>
                    <th>Resolution Rate</th>
                    <th>Avg. Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPT_TABLE.map(d => {
                    const rs = rateStyle(d.rate);
                    return (
                      <tr key={d.dept}>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-dark)" }}>{d.dept}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text-dark)" }}>{d.total.toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: "#16a34a" }}>{d.resolved.toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: "#d97706" }}>{d.pending}</td>
                        <td>
                          <span className="an-rate-badge" style={{ background: rs.bg, color: rs.color }}>
                            {d.rate}%
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: "var(--text-medium)" }}>{d.avg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── KEY INSIGHTS ── */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div>
                <div className="card-title">Key Insights</div>
                <div className="card-subtitle">Automatically generated from current municipal data</div>
              </div>
            </div>
            <div className="an-insights-grid">
              {INSIGHTS.map((ins, i) => (
                <div key={i} className="an-insight-item">
                  <span className="an-insight-icon">{ins.icon}</span>
                  <p className="an-insight-text">{ins.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Analytics;
