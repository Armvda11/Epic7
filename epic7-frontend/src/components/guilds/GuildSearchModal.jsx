import { useState, useRef, useEffect } from "react";
import { FaSearch, FaTimes, FaUserPlus, FaLockOpen, FaLock } from "react-icons/fa";
import { searchGuilds } from "../../services/guildService";
import { useSettings } from "../../context/SettingsContext";
import Notification from "../common/Notification";

const GuildSearchModal = ({ 
isOpen, 
onClose, 
onJoinGuild, 
onRequestJoin,
pendingJoinRequestGuildId 
}) => {
const { language, t } = useSettings();
const [searchTerm, setSearchTerm] = useState("");
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);
const [showSearchResults, setShowSearchResults] = useState(false);
const searchTimeoutRef = useRef(null);
const [notification, setNotification] = useState({ show: false, message: '', type: 'error' });

// Reset search when modal opens
useEffect(() => {
  if (isOpen) {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResults(false);
  }
}, [isOpen]);

const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    
    // Set new timeout (debounce)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`Searching guilds with query: "${value}"`);
        const response = await searchGuilds(value);
        
        // Check if response has expected structure
        let results = [];
        if (Array.isArray(response)) {
          results = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          results = response.data;
        } else if (response && response.success && response.data && Array.isArray(response.data)) {
          results = response.data;
        }
        
        // Log guild results with their open status
        console.log("Guild search results:", results);
        
        if (results.length === 0) {
          console.log("No guilds found in search results");
          setSearchResults([]);
          setShowSearchResults(true);
          setIsSearching(false);
          return;
        }
        
        // More explicit handling of isOpen property
        const processedResults = results.map(guild => {
          // Force isOpen to be a boolean based on multiple checks
          let isOpen = false;
          
          // First check direct boolean value
          if (typeof guild.isOpen === 'boolean') {
            isOpen = guild.isOpen;
          }
          // Check if isOpen is a string "true"
          else if (guild.isOpen === "true") {
            isOpen = true;
          }
          // Then check status text
          else if (guild.status && guild.status.toLowerCase() === "open") {
            isOpen = true;
          }
          
          console.log(`Processed guild ${guild.name}: isOpen=${isOpen} (from isOpen=${guild.isOpen}, status=${guild.status})`);
          
          return {
            ...guild,
            isOpen: isOpen,
            memberCount: guild.memberCount || 0,
            maxMembers: guild.maxMembers || 20,
            level: guild.level || 1
          };
        });
        
        setSearchResults(processedResults);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Error searching guilds:", error);
        setNotification({
          show: true,
          message: t("errorSearchingGuilds", language) || "Error searching guilds. Please try again.",
          type: 'error'
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 1000);
};

if (!isOpen) return null;

return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-white dark:bg-[#2f2b50] p-6 rounded-xl shadow-2xl max-w-2xl w-full mx-4 relative">
        <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
        <FaTimes />
        </button>
        <h3 className="text-2xl font-bold mb-6">{t("searchGuilds", language)}</h3>
        <div className="relative">
        <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t("searchGuildPlaceholder", language)}
            className="w-full p-3 pl-10 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            autoFocus
        />
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        {/* Search results */}
        <div className="mt-6 max-h-[60vh] overflow-y-auto">
        {isSearching && (
            <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
        )}
        
        {!isSearching && showSearchResults && searchResults.length > 0 && (
            <div>
            <h4 className="text-lg font-semibold mb-3">{t("searchResults", language)}</h4>
            <ul className="space-y-4">
                {searchResults.map(guild => (
                <li key={guild.id} className="bg-white dark:bg-[#3a3660] p-4 rounded-lg shadow-md flex justify-between items-center">
                    <div className="text-left">
                    <h4 className="text-lg font-bold">{guild.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{guild.description || ""}</p>
                    <div className="mt-2 flex gap-4 text-sm">
                        <span>{t("level", language)} {guild.level || 1}</span>
                        <span>{guild.memberCount || 0}/{guild.maxMembers || 20} {t("members", language)}</span>
                        <span>
                        {guild.isOpen === true ? (
                            <><FaLockOpen className="inline mr-1 text-green-500" /> {t("open", language)}</>
                        ) : (
                            <><FaLock className="inline mr-1 text-red-500" /> {t("closed", language)}</>
                        )}
                        </span>
                    </div>
                    </div>
                    <div>
                    {/* More defensive check for guild open status */}
                    {guild.isOpen === true ? (
                        <button
                        onClick={() => onJoinGuild(guild.id)}
                        disabled={guild.memberCount >= guild.maxMembers}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                            guild.memberCount >= guild.maxMembers 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                        >
                        <FaUserPlus />
                        {t("join", language)}
                        </button>
                    ) : (
                        <button
                        onClick={() => onRequestJoin(guild.id)}
                        disabled={guild.memberCount >= guild.maxMembers || pendingJoinRequestGuildId === guild.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                            pendingJoinRequestGuildId === guild.id
                            ? 'bg-green-500'
                            : guild.memberCount >= guild.maxMembers 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                        >
                        {pendingJoinRequestGuildId === guild.id ? (
                            t("requestSent", language)
                        ) : (
                            <>
                            <FaUserPlus />
                            {t("requestToJoin", language)}
                            </>
                        )}
                        </button>
                    )}
                    </div>
                </li>
                ))}
            </ul>
            </div>
        )}
        
        {!isSearching && showSearchResults && searchTerm && searchResults.length === 0 && (
            <div className="p-4 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-center">
            <p>{t("noGuildsFound", language)}</p>
            </div>
        )}
        
        {!isSearching && (!searchTerm || searchTerm.length < 2) && (
            <div className="p-4 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-center">
            <p>{t("searchGuildPlaceholder", language)}</p>
            </div>
        )}
        </div>
        
        {/* Notification Component */}
        {notification.show && (
          <Notification 
              message={notification.message} 
              type={notification.type} 
              duration={3000}
              onClose={() => setNotification({ ...notification, show: false })}
          />
        )}
    </div>
    </div>
);
};

export default GuildSearchModal;
