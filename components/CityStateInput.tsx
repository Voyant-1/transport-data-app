"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CityStateSuggestion {
  city: string;
  state: string;
  display: string;
  count: number;
}

interface CityStateInputProps {
  value: string;
  onChange: (city: string, state: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function CityStateInput({ value, onChange, placeholder, style }: CityStateInputProps) {
  const [input, setInput] = useState(value || "");
  const [suggestions, setSuggestions] = useState<CityStateSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const justSelected = useRef(false);

  useEffect(() => {
    if (value !== undefined && value !== input && !justSelected.current) {
      setInput(value);
    }
    justSelected.current = false;
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = await res.json();
      const data: CityStateSuggestion[] = raw.map((r) => ({
        city: r.city || "",
        state: r.state || "",
        display: r.display || `${r.city}, ${r.state}`,
        count: typeof r.count === "number" ? r.count : parseInt(r.count, 10) || 0,
      }));
      setSuggestions(data);
      if (data.length > 0) setShowDropdown(true);
      else setShowDropdown(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    setActiveIdx(-1);

    if (!val.trim()) {
      onChange("", "");
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 200);
  }, [fetchSuggestions, onChange]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectSuggestion = (s: CityStateSuggestion) => {
    justSelected.current = true;
    const displayVal = `${s.city}, ${s.state}`;
    setInput(displayVal);
    onChange(s.city, s.state);
    setShowDropdown(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "ArrowDown" && input.length >= 2) {
        fetchSuggestions(input);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        selectSuggestion(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    } else if (e.key === "Tab" && activeIdx < 0 && suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      e.preventDefault();
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...style }}>
      <input
        type="text"
        value={input}
        placeholder={placeholder || "Start typing a city..."}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
          else if (input.length >= 2) fetchSuggestions(input);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className="input-field"
        style={{ paddingRight: loading ? "32px" : "12px" }}
      />

      {loading && (
        <div
          className="spinner-sm"
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          }}
        />
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul className="city-state-dropdown">
          {suggestions.map((s, idx) => (
            <li
              key={`${s.city}-${s.state}`}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIdx(idx)}
              className={idx === activeIdx ? "active" : ""}
            >
              <span>
                <strong>{s.city}</strong>
                <span style={{ color: "var(--color-text-secondary)" }}>, {s.state}</span>
              </span>
              <span style={{ fontSize: "11px", color: "#aaa" }}>
                {s.count ? s.count.toLocaleString() : ""} {s.count ? "carriers" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
