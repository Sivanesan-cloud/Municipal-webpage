import { useState } from "react";

const DEPARTMENTS = ["Roads", "Electrical", "Sanitation", "Water Supply", "Drainage"];
const WARDS = Array.from({ length: 12 }, (_, i) => `Ward ${i + 1}`);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const AddOfficialModal = ({ onClose }) => {
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", department: "", ward: "", password: "",
  });
  const [showPw, setShowPw] = useState(false);

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: wire to API
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">

        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="modal-title">Add Field Official</div>
            <div className="modal-subtitle">Fill in the details to register a new field official.</div>
          </div>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="fullName" placeholder="e.g. Raj Kumar"
                value={form.fullName} onChange={set} required />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email"
                placeholder="e.g. raj@civicfix.in" value={form.email} onChange={set} required />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" type="tel" name="phone"
                placeholder="+91 98765 43210" value={form.phone} onChange={set} required />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" name="department" value={form.department} onChange={set} required>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ward</label>
              <select className="form-input" name="ward" value={form.ward} onChange={set} required>
                <option value="">Select ward</option>
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input className="form-input" type={showPw ? "text" : "password"}
                  name="password" placeholder="Set a secure password"
                  value={form.password} onChange={set} required
                  style={{ width: "100%", paddingRight: 52 }} />
                <button type="button" className="pw-toggle"
                  onClick={() => setShowPw(p => !p)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit">Add Official</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOfficialModal;
