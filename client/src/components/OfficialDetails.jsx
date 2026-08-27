import StatusBadge from "./StatusBadge";

const PRI = { High: "p-high", Medium: "p-medium", Low: "p-low" };
const STA = { Assigned: "s-assigned", "In Progress": "s-inprogress", Resolved: "s-resolved", Pending: "s-pending" };

const DEPT_COLORS = {
  Roads:         { bg: "#eff6ff", color: "#1d4ed8" },
  Electrical:    { bg: "#fffbeb", color: "#d97706" },
  Sanitation:    { bg: "#f0fdf4", color: "#15803d" },
  "Water Supply":{ bg: "#f0fdfa", color: "#0d9488" },
  Drainage:      { bg: "#faf5ff", color: "#7c3aed" },
};

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const OfficialDetails = ({ official: o, onClose }) => {
  const dc = DEPT_COLORS[o.department] ?? { bg: "#f1f5f9", color: "#475569" };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="od-panel">

        {/* Profile Header */}
        <div className="od-head">
          <div className="od-profile-wrap">
            <div className="od-avatar-lg" style={{ background: o.avatarColor }}>{o.initials}</div>
            <div>
              <div className="od-name">{o.name}</div>
              <div className="od-contact">{o.email}</div>
              <div className="od-contact">{o.phone}</div>
              <div className="od-tags">
                <span className="dept-badge" style={{ background: dc.bg, color: dc.color }}>{o.department}</span>
                <span className="ward-badge">{o.ward}</span>
                <StatusBadge status={o.status} />
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        {/* Performance Metrics */}
        <div className="od-stats-row">
          <div className="od-stat-tile">
            <div className="od-stat-val">{o.activeTasks}</div>
            <div className="od-stat-label">Active Tasks</div>
          </div>
          <div className="od-stat-tile">
            <div className="od-stat-val">{o.completedTasks}</div>
            <div className="od-stat-label">Completed Tasks</div>
          </div>
          <div className="od-stat-tile">
            <div className="od-stat-val">{o.avgResolution}</div>
            <div className="od-stat-label">Avg Resolution Time</div>
          </div>
        </div>

        {/* Assigned Complaints */}
        <div className="od-complaints">
          <div className="od-section-title">Current Assignments</div>
          {o.assignedComplaints.length === 0 ? (
            <div className="od-empty">No active complaints assigned to this official.</div>
          ) : (
            <table className="complaints-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  {["Complaint ID", "Issue", "Ward", "Priority", "Status", "Assigned Date", "Action"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {o.assignedComplaints.map(c => (
                  <tr key={c.id}>
                    <td><span className="cid">{c.id}</span></td>
                    <td>{c.issue}</td>
                    <td>{c.ward}</td>
                    <td><span className={`badge ${PRI[c.priority]}`}>{c.priority}</span></td>
                    <td><span className={`badge ${STA[c.status]}`}>{c.status}</span></td>
                    <td>{c.date}</td>
                    <td><button className="review-btn">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficialDetails;
