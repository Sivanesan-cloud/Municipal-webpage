import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

/* ── ICONS ── */
const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const SlidersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [toastMsg, setToastMsg] = useState("");
  
  // Profile settings
  const [profileForm, setProfileForm] = useState({
    name: "Municipal Administrator",
    email: "admin@civicfix.gov",
    phone: "+91 98765 43210"
  });

  // Notification toggles
  const [notifForm, setNotifForm] = useState({
    complaintSubmitted: true,
    complaintAssigned: true,
    complaintStatusUpdated: true,
    issueResolved: true,
    highPriorityComplaint: true,
    systemNotifications: true,
  });

  // Municipality settings
  const [muniForm, setMuniForm] = useState({
    name: "CivicFix Municipal Corporation",
    district: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    wards: 15,
    email: "municipality@civicfix.gov",
    emergency: "+91 422 230 0103"
  });

  // Security Toggles
  const [tfa, setTfa] = useState(false);

  // System Preferences
  const [prefsForm, setPrefsForm] = useState({
    language: "English",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    defaultView: "Table",
    itemsPerPage: "10",
    realtimeUpdates: true
  });

  // Toast trigger
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg("");
    }, 3000);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    showToast("Profile settings updated successfully.");
  };

  const handleNotifSave = () => {
    showToast("Notification preferences updated successfully.");
  };

  const handleMuniSave = (e) => {
    e.preventDefault();
    showToast("Municipality configuration updated successfully.");
  };

  const handlePrefsSave = (e) => {
    e.preventDefault();
    showToast("System preferences updated successfully.");
  };

  const handleTfaToggle = () => {
    setTfa(!tfa);
    showToast(`Two-factor authentication ${!tfa ? "enabled" : "disabled"} successfully.`);
  };

  const handleSignOutAll = () => {
    if (confirm("Are you sure you want to end all other active administrator sessions?")) {
      showToast("Signed out from all other devices.");
    }
  };

  const handleViewSessions = () => {
    alert("Active sessions:\n- Chrome on Windows (Current session)\n- Safari on iOS (Last active 2 hrs ago)\n- Firefox on macOS (Last active yesterday)");
  };

  const handleViewActivity = () => {
    alert("Recent Login Activity:\n- Aug 27, 2026 20:41 (127.0.0.1) - Success\n- Aug 27, 2026 15:02 (127.0.0.1) - Success\n- Aug 26, 2026 09:15 (127.0.0.1) - Success");
  };

  const handleWardManage = (wardNum) => {
    alert(`Managing ward configuration for Ward ${wardNum}. Routing rules, boundary data, and officer schedules can be edited here.`);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="content">
          
          {/* Toast Notification */}
          {toastMsg && (
            <div className="settings-toast">
              <span className="toast-check"><CheckIcon /></span>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* ── PAGE HEADER ── */}
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h1 className="dashboard-title">Settings</h1>
              <p className="dashboard-subtitle">Manage your administrator account and municipal portal preferences.</p>
            </div>
          </div>

          {/* ── SETTINGS LAYOUT ── */}
          <div className="settings-layout">
            
            {/* LEFT SIDE: Navigation Menu */}
            <aside className="settings-sidebar">
              <button 
                className={`set-nav-item ${activeTab === "profile" ? "active" : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <ProfileIcon />
                <span>Profile</span>
              </button>
              <button 
                className={`set-nav-item ${activeTab === "notifications" ? "active" : ""}`}
                onClick={() => setActiveTab("notifications")}
              >
                <BellIcon />
                <span>Notifications</span>
              </button>
              <button 
                className={`set-nav-item ${activeTab === "municipality" ? "active" : ""}`}
                onClick={() => setActiveTab("municipality")}
              >
                <MapPinIcon />
                <span>Municipality</span>
              </button>
              <button 
                className={`set-nav-item ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                <ShieldIcon />
                <span>Security</span>
              </button>
              <button 
                className={`set-nav-item ${activeTab === "preferences" ? "active" : ""}`}
                onClick={() => setActiveTab("preferences")}
              >
                <SlidersIcon />
                <span>System Preferences</span>
              </button>
            </aside>

            {/* RIGHT SIDE: Content Area */}
            <div className="settings-content">

              {/* 1. PROFILE SETTINGS */}
              {activeTab === "profile" && (
                <div className="card settings-card animation-fade">
                  <div className="settings-card-header">
                    <h2 className="settings-card-title">Administrator Profile</h2>
                    <p className="settings-card-subtitle">Manage your administrator account information.</p>
                  </div>
                  
                  <div className="profile-upload-section">
                    <div className="profile-avatar-large">A</div>
                    <div>
                      <div className="profile-details-name">Municipal Administrator</div>
                      <div className="profile-details-role">Administrator</div>
                      <button className="btn-secondary" onClick={() => alert("Upload new profile photo functionality would trigger here.")}>
                        Change Photo
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSave}>
                    <div className="settings-form-grid">
                      <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={profileForm.name} 
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input 
                          className="form-input" 
                          type="email" 
                          value={profileForm.email} 
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={profileForm.phone} 
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <input 
                          className="form-input read-only-input" 
                          type="text" 
                          value="Administrator" 
                          readOnly 
                        />
                      </div>
                    </div>
                    
                    <div className="settings-card-footer">
                      <button type="button" className="btn-secondary" onClick={() => setProfileForm({ name: "Municipal Administrator", email: "admin@civicfix.gov", phone: "+91 98765 43210" })}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary-settings">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 2. NOTIFICATION SETTINGS */}
              {activeTab === "notifications" && (
                <div className="card settings-card animation-fade">
                  <div className="settings-card-header">
                    <h2 className="settings-card-title">Notifications</h2>
                    <p className="settings-card-subtitle">Choose which municipal system notifications you receive.</p>
                  </div>
                  
                  <div className="toggles-list">
                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-title">Complaint Submitted</div>
                        <div className="toggle-desc">Receive notifications when a new civic complaint is submitted.</div>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifForm.complaintSubmitted} 
                          onChange={(e) => setNotifForm({ ...notifForm, complaintSubmitted: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-title">Complaint Assigned</div>
                        <div className="toggle-desc">Receive notifications when a complaint is assigned to a field official.</div>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifForm.complaintAssigned} 
                          onChange={(e) => setNotifForm({ ...notifForm, complaintAssigned: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-title">Complaint Status Updated</div>
                        <div className="toggle-desc">Receive notifications when complaint status changes.</div>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifForm.complaintStatusUpdated} 
                          onChange={(e) => setNotifForm({ ...notifForm, complaintStatusUpdated: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-title">Issue Resolved</div>
                        <div className="toggle-desc">Receive notifications when a field official marks an issue as resolved.</div>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifForm.issueResolved} 
                          onChange={(e) => setNotifForm({ ...notifForm, issueResolved: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-title">High Priority Complaint</div>
                        <div className="toggle-desc">Receive immediate notifications for high-priority complaints.</div>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifForm.highPriorityComplaint} 
                          onChange={(e) => setNotifForm({ ...notifForm, highPriorityComplaint: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-title">System Notifications</div>
                        <div className="toggle-desc">Receive important system and maintenance notifications.</div>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifForm.systemNotifications} 
                          onChange={(e) => setNotifForm({ ...notifForm, systemNotifications: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="settings-card-footer">
                    <button type="button" className="btn-secondary" onClick={() => setNotifForm({
                      complaintSubmitted: true, complaintAssigned: true, complaintStatusUpdated: true,
                      issueResolved: true, highPriorityComplaint: true, systemNotifications: true
                    })}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary-settings" onClick={handleNotifSave}>
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* 3. MUNICIPALITY SETTINGS */}
              {activeTab === "municipality" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="animation-fade">
                  
                  <div className="card settings-card">
                    <div className="settings-card-header">
                      <h2 className="settings-card-title">Municipality Configuration</h2>
                      <p className="settings-card-subtitle">Manage basic municipality information used throughout the portal.</p>
                    </div>
                    
                    <form onSubmit={handleMuniSave}>
                      <div className="settings-form-grid">
                        <div className="form-group">
                          <label className="form-label">Municipality Name</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            value={muniForm.name} 
                            onChange={(e) => setMuniForm({ ...muniForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">District</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            value={muniForm.district} 
                            onChange={(e) => setMuniForm({ ...muniForm, district: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">State</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            value={muniForm.state} 
                            onChange={(e) => setMuniForm({ ...muniForm, state: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Country</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            value={muniForm.country} 
                            onChange={(e) => setMuniForm({ ...muniForm, country: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Number of Wards</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            value={muniForm.wards} 
                            onChange={(e) => setMuniForm({ ...muniForm, wards: parseInt(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Primary Contact Email</label>
                          <input 
                            className="form-input" 
                            type="email" 
                            value={muniForm.email} 
                            onChange={(e) => setMuniForm({ ...muniForm, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group full">
                          <label className="form-label">Emergency Contact Number</label>
                          <input 
                            className="form-input" 
                            type="text" 
                            value={muniForm.emergency} 
                            onChange={(e) => setMuniForm({ ...muniForm, emergency: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="settings-card-footer" style={{ marginTop: "20px" }}>
                        <button type="submit" className="btn-primary-settings">
                          Save Municipality Settings
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Ward Management Card */}
                  <div className="card settings-card">
                    <div className="settings-card-header" style={{ marginBottom: "14px" }}>
                      <h2 className="settings-card-title">Ward Management</h2>
                      <p className="settings-card-subtitle">Manage municipal wards used for complaint routing and assignment.</p>
                    </div>
                    
                    <div className="off-table-wrap">
                      <table className="complaints-table" style={{ marginTop: 0 }}>
                        <thead>
                          <tr>
                            <th>Ward</th>
                            <th>Name</th>
                            <th>Active Issues</th>
                            <th>Assigned Officials</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><span style={{ fontWeight: 600, fontSize: "12.5px" }}>Ward 01</span></td>
                            <td style={{ color: "var(--text-medium)" }}>North Zone</td>
                            <td><span style={{ fontWeight: 600 }}>32</span></td>
                            <td>4</td>
                            <td><span className="sbadge" style={{ background: "#f0fdf4", color: "#15803d" }}><span className="sbadge-dot" style={{ background: "#22c55e" }} />Active</span></td>
                            <td><button className="review-btn" onClick={() => handleWardManage("01")}>Manage</button></td>
                          </tr>
                          <tr>
                            <td><span style={{ fontWeight: 600, fontSize: "12.5px" }}>Ward 02</span></td>
                            <td style={{ color: "var(--text-medium)" }}>East Zone</td>
                            <td><span style={{ fontWeight: 600 }}>48</span></td>
                            <td>5</td>
                            <td><span className="sbadge" style={{ background: "#f0fdf4", color: "#15803d" }}><span className="sbadge-dot" style={{ background: "#22c55e" }} />Active</span></td>
                            <td><button className="review-btn" onClick={() => handleWardManage("02")}>Manage</button></td>
                          </tr>
                          <tr>
                            <td><span style={{ fontWeight: 600, fontSize: "12.5px" }}>Ward 03</span></td>
                            <td style={{ color: "var(--text-medium)" }}>Central Zone</td>
                            <td><span style={{ fontWeight: 600 }}>27</span></td>
                            <td>3</td>
                            <td><span className="sbadge" style={{ background: "#f0fdf4", color: "#15803d" }}><span className="sbadge-dot" style={{ background: "#22c55e" }} />Active</span></td>
                            <td><button className="review-btn" onClick={() => handleWardManage("03")}>Manage</button></td>
                          </tr>
                          <tr>
                            <td><span style={{ fontWeight: 600, fontSize: "12.5px" }}>Ward 04</span></td>
                            <td style={{ color: "var(--text-medium)" }}>South Zone</td>
                            <td><span style={{ fontWeight: 600 }}>41</span></td>
                            <td>4</td>
                            <td><span className="sbadge" style={{ background: "#f0fdf4", color: "#15803d" }}><span className="sbadge-dot" style={{ background: "#22c55e" }} />Active</span></td>
                            <td><button className="review-btn" onClick={() => handleWardManage("04")}>Manage</button></td>
                          </tr>
                          <tr>
                            <td><span style={{ fontWeight: 600, fontSize: "12.5px" }}>Ward 05</span></td>
                            <td style={{ color: "var(--text-medium)" }}>West Zone</td>
                            <td><span style={{ fontWeight: 600 }}>55</span></td>
                            <td>5</td>
                            <td><span className="sbadge" style={{ background: "#f0fdf4", color: "#15803d" }}><span className="sbadge-dot" style={{ background: "#22c55e" }} />Active</span></td>
                            <td><button className="review-btn" onClick={() => handleWardManage("05")}>Manage</button></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                      <button className="btn-secondary" onClick={() => alert("Displaying all 15 wards configuration list.")}>
                        View All Wards
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* 4. SECURITY SETTINGS */}
              {activeTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="animation-fade">
                  
                  <div className="card settings-card">
                    <div className="settings-card-header">
                      <h2 className="settings-card-title">Security</h2>
                      <p className="settings-card-subtitle">Manage administrator account security.</p>
                    </div>

                    <div className="sec-setting-item">
                      <div className="sec-setting-left">
                        <div className="sec-icon-circle">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        </div>
                        <div>
                          <div className="sec-title">Password</div>
                          <div className="sec-meta">Last changed 30 days ago</div>
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={() => {
                        const op = prompt("Enter old password:");
                        if (op) {
                          const np = prompt("Enter new password:");
                          if (np) showToast("Password changed successfully.");
                        }
                      }}>
                        Change Password
                      </button>
                    </div>

                    <div className="sec-setting-item">
                      <div className="sec-setting-left">
                        <div className="sec-icon-circle">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                        </div>
                        <div>
                          <div className="sec-title">Two-Factor Authentication</div>
                          <div className="sec-meta">Status: <span style={{ color: tfa ? "#16a34a" : "#64748b", fontWeight: 600 }}>{tfa ? "Configured & Active" : "Not configured"}</span></div>
                        </div>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={tfa} onChange={handleTfaToggle} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="sec-setting-item">
                      <div className="sec-setting-left">
                        <div className="sec-icon-circle">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                        </div>
                        <div>
                          <div className="sec-title">Session Management</div>
                          <div className="sec-meta">Manage active administrator sessions.</div>
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={handleViewSessions}>
                        View Active Sessions
                      </button>
                    </div>

                    <div className="sec-setting-item" style={{ borderBottom: "none" }}>
                      <div className="sec-setting-left">
                        <div className="sec-icon-circle">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        </div>
                        <div>
                          <div className="sec-title">Login Activity</div>
                          <div className="sec-meta">Review recent administrator login activity.</div>
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={handleViewActivity}>
                        View Login Activity
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="card settings-card" style={{ borderLeft: "4px solid #ef4444" }}>
                    <div className="settings-card-header">
                      <h2 className="settings-card-title" style={{ color: "#ef4444" }}>Danger Zone</h2>
                    </div>
                    <div className="sec-setting-item" style={{ borderBottom: "none", padding: "8px 0 0 0" }}>
                      <div className="sec-setting-left">
                        <div>
                          <div className="sec-title">Sign out from all devices</div>
                          <div className="sec-meta" style={{ marginTop: "2px" }}>End all active administrator sessions except this one.</div>
                        </div>
                      </div>
                      <button className="btn-danger-settings" onClick={handleSignOutAll}>
                        Sign Out All Sessions
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* 5. SYSTEM PREFERENCES */}
              {activeTab === "preferences" && (
                <div className="card settings-card animation-fade">
                  <div className="settings-card-header">
                    <h2 className="settings-card-title">System Preferences</h2>
                    <p className="settings-card-subtitle">Configure municipal portal preferences and defaults.</p>
                  </div>
                  
                  <form onSubmit={handlePrefsSave}>
                    <div className="settings-form-grid">
                      <div className="form-group">
                        <label className="form-label">Language</label>
                        <select 
                          className="form-input"
                          value={prefsForm.language}
                          onChange={(e) => setPrefsForm({ ...prefsForm, language: e.target.value })}
                        >
                          <option>English</option>
                          <option>Tamil</option>
                          <option>Hindi</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Time Zone</label>
                        <select 
                          className="form-input"
                          value={prefsForm.timezone}
                          onChange={(e) => setPrefsForm({ ...prefsForm, timezone: e.target.value })}
                        >
                          <option>Asia/Kolkata</option>
                          <option>UTC</option>
                          <option>GMT</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date Format</label>
                        <select 
                          className="form-input"
                          value={prefsForm.dateFormat}
                          onChange={(e) => setPrefsForm({ ...prefsForm, dateFormat: e.target.value })}
                        >
                          <option>DD/MM/YYYY</option>
                          <option>MM/DD/YYYY</option>
                          <option>YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Default Complaint View</label>
                        <select 
                          className="form-input"
                          value={prefsForm.defaultView}
                          onChange={(e) => setPrefsForm({ ...prefsForm, defaultView: e.target.value })}
                        >
                          <option>Table</option>
                          <option>Cards</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Items Per Page</label>
                        <select 
                          className="form-input"
                          value={prefsForm.itemsPerPage}
                          onChange={(e) => setPrefsForm({ ...prefsForm, itemsPerPage: e.target.value })}
                        >
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                          <option>100</option>
                        </select>
                      </div>
                      
                      <div className="toggle-row form-group full" style={{ padding: "10px 0 0 0", borderBottom: "none" }}>
                        <div className="toggle-info">
                          <div className="toggle-title" style={{ fontSize: "13px" }}>Enable Real-Time Updates</div>
                          <div className="toggle-desc" style={{ fontSize: "11.5px" }}>Automatically refresh complaints dashboard and maps.</div>
                        </div>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={prefsForm.realtimeUpdates} 
                            onChange={(e) => setPrefsForm({ ...prefsForm, realtimeUpdates: e.target.checked })}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-card-footer" style={{ marginTop: "24px" }}>
                      <button type="button" className="btn-secondary" onClick={() => setPrefsForm({
                        language: "English", timezone: "Asia/Kolkata", dateFormat: "DD/MM/YYYY",
                        defaultView: "Table", itemsPerPage: "10", realtimeUpdates: true
                      })}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary-settings">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
