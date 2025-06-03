// ModernPageLayout.jsx - Composant layout unifié pour toutes les pages
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { FaArrowLeft, FaMoon, FaSun, FaCog } from "react-icons/fa";

const ModernPageLayout = ({ 
  children, 
  title, 
  subtitle, 
  backTo = "/dashboard",
  showBackButton = true,
  showThemeToggle = true,
  showSettings = false,
  onSettingsClick,
  className = "",
  headerActions = null
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme, t, language } = useSettings();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    }
  };

  // Particules de fond
  const generateParticles = () => {
    return Array.from({ length: 25 }, (_, i) => (
      <motion.div
        key={i}
        className={`absolute w-1 h-1 rounded-full ${
          theme === 'dark' ? 'bg-blue-400/40' : 'bg-purple-400/40'
        }`}
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.4, 0.8, 0.4],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ));
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    } ${className}`}>
      
      {/* Particules de fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {generateParticles()}
      </div>

      {/* Header moderne */}
      <motion.header 
        className={`relative z-10 backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/20 border-white/30'
        } border-b`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Section gauche - Bouton retour */}
            {showBackButton && (
              <motion.button
                onClick={() => navigate(backTo)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' 
                    : 'bg-white/40 hover:bg-white/60 border-white/40 text-gray-800'
                } border`}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <FaArrowLeft size={16} />
                <span className="font-medium">{t("back", language)}</span>
              </motion.button>
            )}

            {/* Titre central */}
            <motion.div 
              className="text-center flex-1"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-blue-400 via-purple-400 to-pink-400' 
                  : 'from-purple-600 via-blue-600 to-indigo-600'
              } bg-clip-text text-transparent mb-2`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`text-lg ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {subtitle}
                </p>
              )}
            </motion.div>

            {/* Actions droite */}
            <div className="flex items-center space-x-2">
              {headerActions}
              
              {showThemeToggle && (
                <motion.button
                  onClick={toggleTheme}
                  className={`p-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-yellow-400' 
                      : 'bg-white/40 hover:bg-white/60 text-purple-600'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
                </motion.button>
              )}

              {showSettings && (
                <motion.button
                  onClick={onSettingsClick}
                  className={`p-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-gray-300' 
                      : 'bg-white/40 hover:bg-white/60 text-gray-600'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <FaCog size={20} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Contenu principal */}
      <motion.main 
        className="relative z-10 max-w-7xl mx-auto px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          {children}
        </motion.div>
      </motion.main>
    </div>
  );
};

export default ModernPageLayout;
