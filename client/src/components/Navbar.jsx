const Navbar = () => (
  <header className="navbar">
    <div className="navbar-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" placeholder="Search issues, officials..." className="search-input" />
    </div>

    <div className="navbar-title">Municipal Admin</div>

    <div className="navbar-actions">
      <button className="icon-btn" title="Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </button>
      <button className="icon-btn" title="Help">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
      <div className="profile">
        <div className="avatar">A</div>
        <div>
          <div className="profile-name">Admin</div>
          <div className="profile-role">Profile</div>
        </div>
      </div>
    </div>
  </header>
);

export default Navbar;
