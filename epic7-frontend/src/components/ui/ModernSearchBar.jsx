// ModernSearchBar.jsx - Barre de recherche moderne réutilisable
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";
import { FaSearch, FaTimes } from "react-icons/fa";

const ModernSearchBar = ({ 
  value = "",
  onChange,
  onClear,
  placeholder = "",
  className = "",
  showResults = false,
  results = [],
  onResultClick,
  renderResult,
  maxResults = 5,
  ...props
}) => {
  const { theme, t, language } = useSettings();
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange("");
    }
  };

  const defaultRenderResult = (result, index) => (
    <motion.div
      key={result.id || index}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-3 hover:bg-white/10 cursor-pointer transition-colors ${
        theme === 'dark' ? 'text-white' : 'text-gray-800'
      }`}
      onClick={() => onResultClick && onResultClick(result)}
    >
      {result.name || result.title || result.label || result}
    </motion.div>
  );

  return (
    <div className={`relative ${className}`}>
      <motion.div 
        className={`relative backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/30 border-white/40'
        } border rounded-2xl overflow-hidden transition-all duration-300 ${
          isFocused ? 'ring-2 ring-purple-500/50' : ''
        }`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="flex items-center p-4">
          <motion.div
            animate={{ 
              scale: isFocused ? 1.1 : 1,
              color: isFocused ? (theme === 'dark' ? '#a78bfa' : '#7c3aed') : undefined
            }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <FaSearch className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            } mr-3`} />
          </motion.div>
          
          <input
            type="text"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder || t("search", language) || "Rechercher..."}
            className={`flex-1 bg-transparent border-none outline-none text-lg ${
              theme === 'dark' ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-500'
            }`}
            {...props}
          />
          
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={handleClear}
                className={`p-2 rounded-full transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                    : 'hover:bg-black/10 text-gray-600 hover:text-gray-800'
                }`}
              >
                <FaTimes size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Résultats de recherche */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full mt-2 left-0 right-0 backdrop-blur-md ${
              theme === 'dark' 
                ? 'bg-black/40 border-white/20' 
                : 'bg-white/40 border-white/40'
            } border rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto`}
          >
            {results.slice(0, maxResults).map((result, index) => 
              renderResult ? renderResult(result, index) : defaultRenderResult(result, index)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModernSearchBar;
