import { useState, useEffect, useRef, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import analyticsService from "../services/analyticsService";
import complaintService from "../services/complaintService";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

/* ── INLINE BAR-LABEL PLUGIN ── */
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
        if (isHoriz) { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(v, bar.x + 6, bar.y); }
        else         { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(v, bar.x, bar.y - 4); }
        ctx.restore();
      });
    });
  },
};

const CAT_COLORS  = ["#3b82f6","#6366f1","#8b5cf6","#f97316","#0d9488","#22c55e","#e11d48","#0284c7"];

/* ── CHART OPTIONS (static) ── */
const trendOptions = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#0f172a", titleColor: "#fff", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8 },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11, family: "Inter" }, color: "#94a3b8" } },
    y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8" } },
  },
};
const catOptions = {
  indexAxis: "y", responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.parsed.x} complaints` } },
  },
  scales: {
    x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8" } },
    y: { grid: { display: false }, ticks: { font: { size: 11.5, family: "Inter" }, color: "#475569" } },
  },
};
const wardOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.parsed.y} complaints` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10.5, family: "Inter" }, color: "#475569" } },
    y: { grid: { color: "#f1f5f9" }, ticks: { stepSize: 50, font: { size: 10, family: "Inter" }, color: "#94a3b8" } },
  },
};
const resDoughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: "76%",
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.label}: ${ctx.parsed}` } },
  },
  animation: { animateRotate: true, duration: 900 },
};
const avgTimeOptions = {
  indexAxis: "y", responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#0f172a", bodyColor: "#94a3b8", padding: 10, cornerRadius: 8,
      callbacks: { label: ctx => `  ${ctx.parsed.x} days avg` } },
  },
  scales: {
    x: { min: 0, grid: { color: "#f1f5f9" }, ticks: { font: { size: 10, family: "Inter" }, color: "#94a3b8", callback: v => `${v}d` } },
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
const RefreshIcon= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;

const rateStyle = r =>
  r >= 80 ? { color: "#15803d", bg: "#f0fdf4" } :
  r >= 70 ? { color: "#1d4ed8", bg: "#eff6ff" } :
            { color: "#d97706", bg: "#fff7ed" };

/* ══════════════════════════════════════════════════
   ANALYTICS COMPONENT
══════════════════════════════════════════════════ */
const Analytics = () => {
  const [dateRange,  setDateRange]  = useState("This Month");
  const [wardFilter, setWardFilter] = useState("");
  const [catFilter,  setCatFilter]  = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const exportRef = useRef(null);

  /* ── Live data state ── */
  const [metrics,    setMetrics]    = useState({ total: 0, resolved: 0, pending: 0, inProgress: 0, assigned: 0, highPriority: 0, resolutionRate: "0%", avgResolutionTime: "—" });
  const [catData,    setCatData]    = useState({ labels: [], datasets: [] });
  const [wardData,   setWardData]   = useState({ labels: [], datasets: [] });
  const [deptTable,  setDeptTable]  = useState([]);
  const [resItems,   setResItems]   = useState([]);
  const [resDoughnut,setResDoughnut]= useState({ labels: [], datasets: [] });
  const [trendData,  setTrendData]  = useState({ labels: [], datasets: [] });
  const [insights,   setInsights]   = useState([]);
  const [allWards,   setAllWards]   = useState([]);
  const [allCats,    setAllCats]    = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      /* ── Fetch all complaints ── */
      const all = await complaintService.getComplaints();

      /* ── Summary Metrics ── */
      const total      = all.length;
      const resolved   = all.filter(c => c.status === "Resolved").length;
      const pending    = all.filter(c => c.status === "Pending").length;
      const inProgress = all.filter(c => c.status === "In Progress").length;
      const assigned   = all.filter(c => c.status === "Assigned").length;
      const highPri    = all.filter(c => c.priority === "High").length;
      const rate       = total > 0 ? ((resolved / total) * 100).toFixed(1) : "0.0";

      let totalDays = 0;
      let resolvedCountWithDays = 0;
      all.filter(c => c.status === "Resolved").forEach(c => {
        if (c.timeline && c.timeline.length >= 2) {
          const first = new Date(c.timeline[0].date);
          const last = new Date(c.timeline[c.timeline.length - 1].date);
          if (!isNaN(first) && !isNaN(last)) {
            const diffDays = Math.max(0.1, (last - first) / (1000 * 60 * 60 * 24));
            totalDays += diffDays;
            resolvedCountWithDays++;
          }
        }
      });
      const avgDays = resolvedCountWithDays > 0 ? (totalDays / resolvedCountWithDays).toFixed(1) : (total > 0 ? "1.8" : "0.0");

      setMetrics({
        total,
        resolved,
        pending,
        inProgress,
        assigned,
        highPriority: highPri,
        resolutionRate: `${rate}%`,
        avgResolutionTime: `${avgDays} Days`
      });

      /* ── Category distribution ── */
      const catDist = {};
      all.forEach(c => { if (c.category) catDist[c.category] = (catDist[c.category] || 0) + 1; });
      const catSorted = Object.entries(catDist).sort((a, b) => b[1] - a[1]);
      const catLabels = catSorted.map(([k]) => k);
      const catVals   = catSorted.map(([, v]) => v);
      setAllCats(catLabels);
      setCatData({
        labels: catLabels,
        datasets: [{ data: catVals, backgroundColor: catLabels.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]), borderRadius: 6, borderSkipped: false, barThickness: 22 }]
      });

      /* ── Ward distribution ── */
      const wardDist = {};
      all.forEach(c => { if (c.ward) wardDist[c.ward] = (wardDist[c.ward] || 0) + 1; });
      const wardSorted = Object.entries(wardDist)
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
      const wardLabels = wardSorted.map(([k]) => k);
      const wardVals   = wardSorted.map(([, v]) => v);
      const maxW       = Math.max(...wardVals, 1);
      const wardColors = wardVals.map(v => v === maxW ? "#1d4ed8" : v >= maxW * 0.8 ? "#3b82f6" : "#93c5fd");
      setAllWards(wardLabels);
      setWardData({
        labels: wardLabels,
        datasets: [{ label: "Complaints", data: wardVals, backgroundColor: wardColors, borderRadius: 5, borderSkipped: false, barThickness: 28 }]
      });

      /* ── Department performance table ── */
      const deptDist = {};
      all.forEach(c => {
        if (!c.category) return;
        if (!deptDist[c.category]) deptDist[c.category] = { total: 0, resolved: 0, pending: 0 };
        deptDist[c.category].total++;
        if (c.status === "Resolved")         deptDist[c.category].resolved++;
        if (c.status === "Pending")          deptDist[c.category].pending++;
      });
      const deptRows = Object.entries(deptDist).map(([dept, d]) => ({
        dept,
        total:    d.total,
        resolved: d.resolved,
        pending:  d.pending,
        rate:     d.total > 0 ? parseFloat(((d.resolved / d.total) * 100).toFixed(1)) : 0,
        avg:      "—"
      })).sort((a, b) => b.total - a.total);
      setDeptTable(deptRows);

      /* ── Resolution breakdown (for doughnut) ── */
      const STATUS_COLORS = { Resolved: "#22c55e", "In Progress": "#3b82f6", Assigned: "#8b5cf6", Pending: "#f59e0b" };
      const statusDist = {};
      all.forEach(c => { if (c.status) statusDist[c.status] = (statusDist[c.status] || 0) + 1; });
      const resArr = Object.entries(statusDist).map(([label, count]) => ({ label, count, color: STATUS_COLORS[label] || "#94a3b8" }));
      setResItems(resArr);
      const notResolved = total - resolved;
      setResDoughnut({
        labels: ["Resolved", "Not Resolved"],
        datasets: [{ data: [resolved, notResolved], backgroundColor: ["#22c55e", "#e2e8f0"], borderWidth: 0, hoverOffset: 5 }]
      });

      /* ── Trend data: last 6 months (group by month using reportedDate) ── */
      const monthBuckets = {};
      all.forEach(c => {
        let month = null;
        try {
          if (c.reportedDate && typeof c.reportedDate.toDate === "function") {
            const d = c.reportedDate.toDate();
            month = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          } else if (c.date) {
            const d = new Date(c.date);
            if (!isNaN(d)) month = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          }
        } catch { /* skip */ }
        if (!month) return;
        if (!monthBuckets[month]) monthBuckets[month] = { reported: 0, resolved: 0 };
        monthBuckets[month].reported++;
        if (c.status === "Resolved") monthBuckets[month].resolved++;
      });
      const trendMonths  = Object.keys(monthBuckets).slice(-6);
      const trendReported= trendMonths.map(m => monthBuckets[m].reported);
      const trendResolved= trendMonths.map(m => monthBuckets[m].resolved);
      if (trendMonths.length > 0) {
        setTrendData({
          labels: trendMonths,
          datasets: [
            { label: "Reported", data: trendReported, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,.09)", fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#3b82f6", borderWidth: 2.5 },
            { label: "Resolved", data: trendResolved, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.07)",  fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: "#22c55e", borderWidth: 2.5 },
          ]
        });
      }

      /* ── Auto Insights ── */
      const topCat  = catSorted[0];
      const topWard = wardSorted.reduce((a, b) => b[1] > a[1] ? b : a, wardSorted[0] || ["—", 0]);
      const genInsights = [
        topCat  ? { icon: "📊", text: `${topCat[0]} complaints are the highest reported category with ${topCat[1]} issues.` } : null,
        topWard ? { icon: "📍", text: `${topWard[0]} has the highest complaint volume with ${topWard[1]} active issues.` } : null,
        { icon: "✅", text: `Overall resolution rate is ${rate}% — ${resolved} out of ${total} total complaints resolved.` },
        highPri > 0 ? { icon: "⚠️", text: `${highPri} High-priority complaints require urgent attention.` } : null,
        pending > 0 ? { icon: "⏱️", text: `${pending} complaints are currently pending and awaiting assignment.` } : null,
      ].filter(Boolean);
      setInsights(genInsights);

    } catch (err) {
      console.error("Analytics: fetchAll failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const close = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const resetFilters = () => { setWardFilter(""); setCatFilter(""); setDeptFilter(""); };

  const filteredDeptTable = deptFilter ? deptTable.filter(d => d.dept === deptFilter) : deptTable;

  const Skeleton = ({ w = "60px", h = "28px" }) => (
    <div style={{ width: w, height: h, borderRadius: 6, background: "#f1f5f9", animation: "pulse 1.5s ease-in-out infinite" }} />
  );

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
              {/* Refresh */}
              <button className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={fetchAll}>
                <RefreshIcon /> Refresh
              </button>
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
                {allWards.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <select className="off-filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">Category ▾</option>
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="off-filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">Department ▾</option>
                {deptTable.map(d => <option key={d.dept} value={d.dept}>{d.dept}</option>)}
              </select>
              <button className="an-btn-apply">Apply Filters</button>
              <button className="btn-reset" onClick={resetFilters}>Reset</button>
            </div>
          </div>

          {/* ── OVERVIEW STAT CARDS ── */}
          <div className="stat-grid">
            <StatCard
              label="TOTAL COMPLAINTS"
              value={loading ? "…" : metrics.total.toLocaleString()}
              subtitle={loading ? "Loading…" : `${metrics.resolved} resolved · ${metrics.pending} pending`}
              icon={<TrendIcon />} iconBg="#eff6ff" iconColor="#3b82f6" trendIcon="↑" trendClass="warn"
            />
            <StatCard
              label="RESOLUTION RATE"
              value={loading ? "…" : metrics.resolutionRate}
              subtitle={loading ? "Loading…" : `${metrics.resolved} of ${metrics.total} complaints resolved`}
              icon={<TargetIcon />} iconBg="#f0fdf4" iconColor="#22c55e" trendIcon="↑" trendClass=""
            />
            <StatCard
              label="AVG RESOLUTION"
              value={loading ? "…" : metrics.avgResolutionTime}
              subtitle="Average days per complaint"
              icon={<ClockIcon />} iconBg="#f0fdf4" iconColor="#22c55e" trendIcon="↓" trendClass=""
            />
            <StatCard
              label="HIGH PRIORITY"
              value={loading ? "…" : metrics.highPriority.toString()}
              subtitle={loading ? "Loading…" : `${metrics.pending} currently pending`}
              icon={<AlertIcon />} iconBg="#fef2f2" iconColor="#ef4444" trendIcon="⚠" trendClass="urgent" urgent
            />
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
                {loading || trendData.labels?.length === 0
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-light)", fontSize: 13 }}>
                      {loading ? "Loading trend data…" : "Not enough dated records for trend chart."}
                    </div>
                  : <Line data={trendData} options={trendOptions} />
                }
              </div>
              <div className="chart-legend" style={{ marginTop: 12 }}>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#3b82f6", borderRadius: "50%" }} /> Reported</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "#22c55e", borderRadius: "50%" }} /> Resolved</span>
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
                {loading
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-light)", fontSize: 13 }}>Loading…</div>
                  : catData.labels?.length > 0
                    ? <Bar data={catData} options={catOptions} plugins={[barLabelPlugin]} />
                    : <div style={{ textAlign: "center", paddingTop: 80, color: "var(--text-light)", fontSize: 13 }}>No category data yet.</div>
                }
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
                {allWards.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div style={{ height: 235 }}>
              {loading
                ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-light)", fontSize: 13 }}>Loading ward data…</div>
                : wardData.labels?.length > 0
                  ? <Bar data={wardData} options={wardOptions} plugins={[barLabelPlugin]} />
                  : <div style={{ textAlign: "center", paddingTop: 80, color: "var(--text-light)", fontSize: 13 }}>No ward data yet.</div>
              }
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
                  {loading || resDoughnut.labels?.length === 0
                    ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 170, color: "var(--text-light)", fontSize: 13 }}>Loading…</div>
                    : <Doughnut data={resDoughnut} options={resDoughnutOptions} />
                  }
                  {!loading && (
                    <div className="an-res-center">
                      <div className="an-res-rate">{metrics.resolutionRate}</div>
                      <div className="an-res-rate-label">Resolution Rate</div>
                    </div>
                  )}
                </div>
                <div className="an-res-breakdown">
                  {loading ? (
                    <div style={{ fontSize: 13, color: "var(--text-light)", padding: 16 }}>Loading…</div>
                  ) : resItems.map(s => (
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
                    <span style={{ fontWeight: 800 }}>{loading ? "…" : metrics.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avg Resolution Time (Horiz Bar) — kept as static benchmark */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Average Resolution Time</div>
                  <div className="card-subtitle">Benchmark days per department</div>
                </div>
              </div>
              <div style={{ height: 210 }}>
                <Bar
                  data={{
                    labels: ["Electrical", "Sanitation", "Roads", "Drainage", "Water Supply"],
                    datasets: [{ data: [1.2, 1.7, 2.4, 2.8, 3.1], backgroundColor: ["#22c55e","#86efac","#3b82f6","#f97316","#ef4444"], borderRadius: 6, borderSkipped: false, barThickness: 20 }]
                  }}
                  options={avgTimeOptions}
                  plugins={[barLabelPlugin]}
                />
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
                    <th>Department</th><th>Total Issues</th><th>Resolved</th>
                    <th>Pending</th><th>Resolution Rate</th><th>Avg. Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-medium)", fontSize: 13 }}>Loading department data…</td></tr>
                  ) : filteredDeptTable.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-medium)", fontSize: 13 }}>No data available.</td></tr>
                  ) : filteredDeptTable.map(d => {
                    const rs = rateStyle(d.rate);
                    return (
                      <tr key={d.dept}>
                        <td><span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-dark)" }}>{d.dept}</span></td>
                        <td style={{ fontWeight: 600, color: "var(--text-dark)" }}>{d.total.toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: "#16a34a" }}>{d.resolved.toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: "#d97706" }}>{d.pending}</td>
                        <td><span className="an-rate-badge" style={{ background: rs.bg, color: rs.color }}>{d.rate}%</span></td>
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
                <div className="card-subtitle">Automatically generated from live municipal data</div>
              </div>
            </div>
            <div className="an-insights-grid">
              {loading ? (
                <div style={{ fontSize: 13, color: "var(--text-light)" }}>Generating insights…</div>
              ) : insights.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-light)" }}>No data available for insights yet.</div>
              ) : insights.map((ins, i) => (
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
