// ModernCard.jsx - Composant carte moderne réutilisable
import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";

const ModernCard = ({ 
  children, 
  className = "",
  glassEffect = true,
  hoverEffect = true,
  padding = "p-6",
  rounded = "rounded-2xl",
  onClick,
  whileHover,
  whileTap,
  variants,
  ...props
}) => {
  const { theme } = useSettings();

  const defaultHover = hoverEffect ? {
    scale: 1.02,
    y: -4,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  } : {};

  const defaultTap = hoverEffect ? {
    scale: 0.98,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  } : {};

  return (
    <motion.div
      className={`
        ${glassEffect ? `backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/80 border-white/40'
        } border` : ''}
        ${rounded}
        ${padding}
        shadow-2xl
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={whileHover || defaultHover}
      whileTap={whileTap || defaultTap}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default ModernCard;
