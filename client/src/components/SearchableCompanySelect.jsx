import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, X, Building2 } from "lucide-react";

const SearchableCompanySelect = ({ value, onChange, options, placeholder = "Select Target Company" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange({ target: { name: "company", value: option } });
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ target: { name: "company", value: "" } });
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`group relative flex items-center bg-[#0A0D14]/80 backdrop-blur-xl border rounded-2xl transition-all duration-300 cursor-text py-3.5 px-4 ${
          isOpen ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-800 hover:border-slate-700"
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Building2 className={`w-5 h-5 mr-3 transition-colors duration-300 ${value || isOpen ? "text-cyan-400" : "text-slate-500"}`} />
        
        <div className="flex-1 overflow-hidden">
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              className="w-full bg-transparent border-none outline-none text-white placeholder-slate-600 text-sm md:text-base font-medium"
              placeholder={value || placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          ) : (
            <span className={`text-sm md:text-base font-medium truncate ${value ? "text-white" : "text-slate-500"}`}>
              {value || placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] mt-3 w-full bg-[#0F111A] border border-cyan-500/20 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl"
            style={{ maxHeight: "320px" }}
          >
            <div className="p-2 overflow-y-auto max-h-[310px] custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all group ${
                      value === option ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-sm md:text-base font-medium">{option}</span>
                    {value === option && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="w-4 h-4" />
                      </motion.div>
                    )}
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="p-3 bg-slate-800/10 rounded-full mb-3">
                    <Search className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">No companies found</p>
                  <p className="text-slate-600 text-xs mt-1 italic">Type "Other" to proceed with a general experience</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-2">
                 List Updated 2026
               </span>
               <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-500/60 uppercase border border-cyan-500/20">
                 {filteredOptions.length} Results
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableCompanySelect;
