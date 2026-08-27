const StatCard = ({ label, value, subtitle, icon, iconBg, iconColor, urgent, trendIcon, trendClass }) => (
  <div className={`stat-card ${urgent ? "urgent" : ""}`}>
    <div className="stat-header">
      <span className="stat-label">{label}</span>
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
    </div>
    <div className="stat-value" style={{ color: urgent ? "#ef4444" : undefined }}>{value}</div>
    <div className="stat-subtitle">
      <span className={`stat-trend ${trendClass}`}>{trendIcon}</span>
      {subtitle}
    </div>
  </div>
);

export default StatCard;
