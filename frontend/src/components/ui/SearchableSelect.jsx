import { useState, useEffect, useRef } from "react";

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  isDisabled,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`w-full p-3 border border-border-color rounded-lg bg-bg-light flex justify-between items-center transition-all focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10 ${
          isDisabled
            ? "opacity-70 cursor-not-allowed select-none"
            : "cursor-pointer"
        }`}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
      >
        <span
          className={`truncate ${selectedOption ? "text-text-dark font-medium" : "text-text-muted"}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        ></i>
      </div>
      {isOpen && !isDisabled && (
        <div className="absolute z-50 w-full mt-2 bg-bg-white border border-border-color rounded-xl shadow-lg max-h-64 overflow-y-auto animate-fade-in">
          <div className="sticky top-0 bg-bg-white p-3 border-b border-border-color z-10">
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 border border-border-color rounded-lg bg-bg-light outline-none text-sm text-text-dark focus:border-primary"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-text-muted text-center font-medium">
                No results
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`p-3 text-sm rounded-lg cursor-pointer ${
                    opt.disabled
                      ? "opacity-50 cursor-not-allowed bg-bg-light/50 text-danger font-medium"
                      : "hover:bg-primary/10 text-text-dark font-medium"
                  }`}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
