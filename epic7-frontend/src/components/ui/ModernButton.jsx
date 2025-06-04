// ModernButton.jsx - Composant bouton moderne réutilisable
import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";

const ModernButton = ({ 
  children, 
  variant = "primary", // primary, secondary, accent, danger, success
  size = "md", // sm, md, lg
  className = "",
  glassEffect = true,
  icon,
  iconPosition = "left", // left, right
  onClick,
  disabled = false,
  loading = false,
  ...props
}) => {
  const { theme } = useSettings();

  const variants = {
    primary: theme === 'dark' 
      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white' 
      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white',
    secondary: theme === 'dark' 
      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' 
      : 'bg-white/60 hover:bg-white/80 border-white/40 text-gray-800',
    accent: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white',
    success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const buttonVariants = {
    hover: {
      scale: disabled ? 1 : 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    },
    tap: {
      scale: disabled ? 1 : 0.95,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    }
  };

  return (
    <motion.button
      className={`
        relative
        rounded-xl
        font-medium
        transition-all duration-300
        ${glassEffect && (variant === 'secondary') ? 'backdrop-blur-sm border' : ''}
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        flex items-center justify-center gap-2
        shadow-lg
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      disabled={disabled}
      {...props}
    >
      {loading && (
        <motion.div
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}
      
      {icon && iconPosition === "left" && !loading && (
        <span className="flex items-center">
          {icon}
        </span>
      )}
      
      <span>{children}</span>
      
      {icon && iconPosition === "right" && !loading && (
        <span className="flex items-center">
          {icon}
        </span>
      )}
    </motion.button>
  );
};

export default ModernButton;
