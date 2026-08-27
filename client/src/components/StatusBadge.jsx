const CONFIG = {
  "Available": { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Task":   { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  "Offline":   { bg: "#f8fafc", color: "#475569", dot: "#94a3b8" },
};

const StatusBadge = ({ status }) => {
  const c = CONFIG[status] ?? CONFIG["Offline"];
  return (
    <span className="sbadge" style={{ background: c.bg, color: c.color }}>
      <span className="sbadge-dot" style={{ background: c.dot }} />
      {status}
    </span>
  );
};

export default StatusBadge;
