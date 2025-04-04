// src/components/SettingsModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import SettingsPanel from "../SettingsPanel";

const SettingsModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center"  initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md p-6 rounded-xl bg-white dark:bg-[#2e2e45] shadow-lg text-black dark:text-white"
          >
            <SettingsPanel />
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
