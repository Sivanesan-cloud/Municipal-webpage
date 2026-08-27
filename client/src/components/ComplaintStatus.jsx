import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

const TOTAL = 1245;

const STATUS_DATA = [
  { label: "Pending",     value: 342, color: "#f59e0b", track: "#fffbeb" },
  { label: "Assigned",    value: 150, color: "#3b82f6", track: "#eff6ff" },
  { label: "In Progress", value: 198, color: "#8b5cf6", track: "#f5f3ff" },
  { label: "Resolved",    value: 555, color: "#22c55e", track: "#f0fdf4" },
];

const donutData = {
  labels: STATUS_DATA.map(s => s.label),
  datasets: [{
    data: STATUS_DATA.map(s => s.value),
    backgroundColor: STATUS_DATA.map(s => s.color),
    hoverBackgroundColor: STATUS_DATA.map(s => s.color),
    borderWidth: 3,
    borderColor: "#ffffff",
    hoverOffset: 8,
  }],
};

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a",
      titleColor: "#fff",
      bodyColor: "#94a3b8",
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) =>
          `  ${ctx.label}: ${ctx.parsed.toLocaleString()} (${((ctx.parsed / TOTAL) * 100).toFixed(1)}%)`,
      },
    },
  },
  animation: { animateRotate: true, animateScale: false, duration: 900 },
};

const ComplaintStatus = ({ complaints = [] }) => {
  const isLoaded = complaints.length > 0;
  
  // Dynamic metrics from firestore
  const pending = complaints.filter(c => c.status === "Pending").length;
  const assigned = complaints.filter(c => c.status === "Assigned").length;
  const inProgress = complaints.filter(c => c.status === "In Progress").length;
  const resolved = complaints.filter(c => c.status === "Resolved").length;

  const STATUS_DATA = [
    { label: "Pending",     value: isLoaded ? pending : 342, color: "#f59e0b", track: "#fffbeb" },
    { label: "Assigned",    value: isLoaded ? assigned : 150, color: "#3b82f6", track: "#eff6ff" },
    { label: "In Progress", value: isLoaded ? inProgress : 198, color: "#8b5cf6", track: "#f5f3ff" },
    { label: "Resolved",    value: isLoaded ? resolved : 555, color: "#22c55e", track: "#f0fdf4" },
  ];

  const total = STATUS_DATA.reduce((sum, s) => sum + s.value, 0);

  const donutData = {
    labels: STATUS_DATA.map(s => s.label),
    datasets: [{
      data: STATUS_DATA.map(s => s.value),
      backgroundColor: STATUS_DATA.map(s => s.color),
      hoverBackgroundColor: STATUS_DATA.map(s => s.color),
      borderWidth: 3,
      borderColor: "#ffffff",
      hoverOffset: 8,
    }],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "74%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#fff",
        bodyColor: "#94a3b8",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) =>
            `  ${ctx.label}: ${ctx.parsed.toLocaleString()} (${((ctx.parsed / total) * 100).toFixed(1)}%)`,
        },
      },
    },
    animation: { animateRotate: true, animateScale: false, duration: 900 },
  };

  return (
    <div className="cs-card">
      {/* Header */}
      <div className="cs-header">
        <div>
          <h2 className="cs-title">Complaint Status</h2>
          <p className="cs-subtitle">Current status of all reported civic issues</p>
        </div>
        <span className="cs-badge">Live</span>
      </div>

      {/* Donut Chart */}
      <div className="cs-chart-wrap">
        <div className="cs-donut-outer">
          <Doughnut data={donutData} options={donutOptions} />
          <div className="cs-center-text">
            <span className="cs-center-num">
              {total.toLocaleString()}
            </span>
            <span className="cs-center-label">Total Complaints</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="cs-legend">
        {STATUS_DATA.map(s => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={s.label} className="cs-legend-row">
              <div className="cs-legend-left">
                <span className="cs-dot" style={{ background: s.color }} />
                <span className="cs-legend-name">{s.label}</span>
              </div>
              <div className="cs-legend-right">
                <span className="cs-legend-count">{s.value.toLocaleString()}</span>
                <span className="cs-legend-pct" style={{ color: s.color }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComplaintStatus;
