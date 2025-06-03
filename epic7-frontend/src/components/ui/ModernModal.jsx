// ModernModal.jsx - Modal moderne réutilisable
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";
import { FaTimes } from "react-icons/fa";

const ModernModal = ({ 
  isOpen = false,
  onClose,
  children,
  title,
  subtitle,
  size = "md", // sm, md, lg, xl, full
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = "",
  overlayClassName = "",
  contentClassName = "",
  ...props
}) => {
  const { theme } = useSettings();

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-full mx-4"
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.9,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 25 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: 50,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClassName}`}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Overlay */}
          <motion.div 
            className="absolute inset-0 backdrop-blur-sm bg-black/60"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />
          
          {/* Modal content */}
          <motion.div
            className={`
              relative
              w-full
              ${sizes[size]}
              mx-4
              backdrop-blur-md
              ${theme === 'dark' 
                ? 'bg-gray-900/95 border-white/20' 
                : 'bg-white/95 border-white/40'
              }
              border
              rounded-2xl
              shadow-2xl
              overflow-hidden
              ${contentClassName}
              ${className}
            `}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={`
                flex items-center justify-between
                px-6 py-4
                ${theme === 'dark' 
                  ? 'border-white/10' 
                  : 'border-gray-200/50'
                }
                border-b
              `}>
                <div>
                  {title && (
                    <h2 className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {subtitle}
                    </p>
                  )}
                </div>
                
                {showCloseButton && (
                  <motion.button
                    onClick={onClose}
                    className={`
                      p-2 rounded-full
                      ${theme === 'dark' 
                        ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      }
                      transition-all duration-200
                    `}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaTimes size={16} />
                  </motion.button>
                )}
              </div>
            )}
            
            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModernModal;
