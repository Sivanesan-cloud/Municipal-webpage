import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [view, setView] = useState("login"); // "login" or "forgot"
  
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Reset form state
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Validation & Loading state
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetEmailError, setResetEmailError] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setApiError("");

    let valid = true;
    if (!email.trim()) {
      setEmailError("Email address is required.");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);

    // Simulate authentication processing
    setTimeout(() => {
      // Dummy check: email must have admin/gov domain, password length >= 6
      const isValidEmail = email.includes("@") && (email.endsWith(".gov") || email.endsWith(".in") || email.includes("admin"));
      const isValidPassword = password === "password" || password.length >= 6;

      if (isValidEmail && isValidPassword) {
        setLoading(false);
        navigate("/dashboard");
      } else {
        setLoading(false);
        setApiError("Invalid email or password. Please try again.");
      }
    }, 1500);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setResetEmailError("");

    if (!resetEmail.trim()) {
      setResetEmailError("Email address is required.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 1200);
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrap">
        
        {/* Logo Branding */}
        <div className="login-brand">
          <div className="login-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div>
            <div className="login-brand-title">CivicFix Admin</div>
            <div className="login-brand-subtitle">Municipality Portal</div>
          </div>
        </div>

        {/* View Switch */}
        {view === "login" ? (
          <div className="login-view-body">
            <div className="login-header-group">
              <h1 className="login-header-title">Welcome Back</h1>
              <p className="login-header-subtitle">Sign in to access the Municipal Admin Portal.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="login-form-fields" noValidate>
              
              {/* Email Address */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: "relative" }}>
                  <span className="login-input-icon">✉</span>
                  <input
                    type="email"
                    className={`form-input login-input ${emailError ? "input-error" : ""}`}
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (e.target.value) setEmailError("");
                    }}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
                {emailError && <div className="validation-error-msg">{emailError}</div>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: "relative" }}>
                  <span className="login-input-icon">🔒</span>
                  <input
                    type={showPw ? "text" : "password"}
                    className={`form-input login-input ${passwordError ? "input-error" : ""}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (e.target.value) setPasswordError("");
                    }}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    className="login-pw-toggle"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? "👁️" : "🙈"}
                  </button>
                </div>
                {passwordError && <div className="validation-error-msg">{passwordError}</div>}
              </div>

              {/* Remember / Forgot Row */}
              <div className="login-options-row">
                <label className="login-remember-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => {
                    setView("forgot");
                    setApiError("");
                    setResetSent(false);
                    setResetEmail("");
                  }}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Inline API Error */}
              {apiError && <div className="login-api-error-alert">{apiError}</div>}

              {/* Submit Sign In Button */}
              <button
                type="submit"
                className="btn-submit login-btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span className="login-spinner" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>

            </form>

            <div className="login-security-footer">
              <div className="login-secure-notice">🔒 Secure municipal administrator access</div>
              <div className="login-auth-notice">Authorized personnel only</div>
            </div>
          </div>
        ) : (
          /* Forgot Password View */
          <div className="login-view-body">
            <div className="login-header-group">
              <h1 className="login-header-title">Reset Password</h1>
              {!resetSent ? (
                <p className="login-header-subtitle">
                  Enter your administrator email and we'll send instructions to reset your password.
                </p>
              ) : (
                <p className="login-header-subtitle" style={{ color: "#16a34a", fontWeight: 500 }}>
                  Instructions sent successfully! Please check your inbox.
                </p>
              )}
            </div>

            {!resetSent ? (
              <form onSubmit={handleForgotSubmit} className="login-form-fields" noValidate>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: "relative" }}>
                    <span className="login-input-icon">✉</span>
                    <input
                      type="email"
                      className={`form-input login-input ${resetEmailError ? "input-error" : ""}`}
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (e.target.value) setResetEmailError("");
                      }}
                      disabled={loading}
                      required
                    />
                  </div>
                  {resetEmailError && <div className="validation-error-msg">{resetEmailError}</div>}
                </div>

                <button
                  type="submit"
                  className="btn-submit login-btn-submit"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", margin: "16px 0" }}>
                <span style={{ fontSize: "28px" }}>✉️</span>
                <p style={{ fontSize: "13px", color: "var(--text-medium)", marginTop: "8px" }}>
                  A reset link has been dispatched to <strong>{resetEmail}</strong>.
                </p>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button
                type="button"
                className="login-back-link"
                onClick={() => setView("login")}
                disabled={loading}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
