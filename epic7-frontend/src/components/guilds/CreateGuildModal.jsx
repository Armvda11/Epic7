import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";

const CreateGuildModal = ({ isOpen, onClose, onCreateGuild }) => {
const { language, t } = useSettings();
const [newGuildName, setNewGuildName] = useState("");
const [newGuildDescription, setNewGuildDescription] = useState("");
const [isCreating, setIsCreating] = useState(false);

if (!isOpen) return null;

const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newGuildName.trim()) {
    return; // Handle error: name required
    }
    
    try {
    setIsCreating(true);
    await onCreateGuild(newGuildName, newGuildDescription);
    
    // Reset form
    setNewGuildName("");
    setNewGuildDescription("");
    } catch (error) {
    console.error("Error in create guild form:", error);
    } finally {
    setIsCreating(false);
    }
};

return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
    <div className="absolute inset-0" onClick={onClose} />
    <div className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-lg w-full relative z-50">
        <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
        <FaTimes />
        </button>
        <h3 className="text-2xl font-bold mb-6">{t("createGuild", language)}</h3>
        
        <form onSubmit={handleSubmit}>
        <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="guildName">
            {t("guildName", language)} *
            </label>
            <input
            type="text"
            id="guildName"
            value={newGuildName}
            onChange={(e) => setNewGuildName(e.target.value)}
            required
            maxLength={30}
            className="w-full p-3 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder={t("guildNamePlaceholder", language)}
            />
        </div>
        <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="guildDescription">
            {t("guildDescription", language)}
            </label>
            <textarea
            id="guildDescription"
            value={newGuildDescription}
            onChange={(e) => setNewGuildDescription(e.target.value)}
            maxLength={200}
            rows={4}
            className="w-full p-3 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder={t("guildDescriptionPlaceholder", language)}
            ></textarea>
        </div>
        <button
            type="submit"
            disabled={isCreating || !newGuildName.trim()}
            className={`w-full py-3 rounded-lg ${
            isCreating || !newGuildName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            } text-white font-bold`}
        >
            {isCreating ? t("creating", language) : t("createGuild", language)}
        </button>
        </form>
    </div>
    </div>
);
};

export default CreateGuildModal;
