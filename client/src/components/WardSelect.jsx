import { useState, useEffect, useRef } from "react";

// Generate 100 wards
const WARDS_LIST = Array.from(
  { length: 100 },
  (_, index) => `Ward ${index + 1}`
);

const SearchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.6 }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: "var(--primary)" }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const WardSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset focus state when closed or search changes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setFocusedIdx(-1);
    } else {
      // Focus search input when opened
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setFocusedIdx(-1);
  }, [search]);

  // Filter wards based on query
  const filteredWards = ["All Wards", ...WARDS_LIST].filter(w => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    // Allow searching by number like "25" to match "Ward 25", or full name "Ward 25"
    return w.toLowerCase().includes(q) || w.replace("Ward ", "").includes(q);
  });

  const handleSelect = (ward) => {
    const selectedVal = ward === "All Wards" ? "" : ward;
    onChange(selectedVal);
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIdx(prev => (prev < filteredWards.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIdx(prev => (prev > 0 ? prev - 1 : filteredWards.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < filteredWards.length) {
          handleSelect(filteredWards[focusedIdx]);
        } else if (filteredWards.length > 0) {
          handleSelect(filteredWards[0]);
        }
        break;
      default:
        break;
    }
  };

  const displayLabel = value ? `${value} ▾` : "Ward ▾";

  return (
    <div 
      className="ward-select-container" 
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button 
        type="button"
        className="off-filter-select ward-select-btn"
        onClick={() => setIsOpen(p => !p)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{displayLabel}</span>
      </button>

      {/* Searchable Dropdown Overlay */}
      {isOpen && (
        <div className="ward-select-dropdown animation-fade">
          
          {/* Search Box */}
          <div className="ward-search-wrap">
            <span className="ward-search-lens"><SearchIcon /></span>
            <input
              ref={inputRef}
              type="text"
              className="ward-search-input"
              placeholder="Search ward..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                type="button" 
                className="ward-search-clear"
                onClick={() => {
                  setSearch("");
                  if (inputRef.current) inputRef.current.focus();
                }}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Ward List */}
          <div className="ward-list-scrollable" role="listbox">
            {filteredWards.length === 0 ? (
              <div className="ward-no-results">
                <div>No wards found</div>
                <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px" }}>
                  Try Ward 1–100.
                </div>
              </div>
            ) : (
              filteredWards.map((w, idx) => {
                const isSelected = (w === "All Wards" && !value) || (value === w);
                const isFocused = idx === focusedIdx;
                
                return (
                  <button
                    key={w}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ward-option-item ${isSelected ? "active" : ""} ${isFocused ? "focused" : ""}`}
                    onClick={() => handleSelect(w)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                  >
                    <span>{w}</span>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default WardSelect;
