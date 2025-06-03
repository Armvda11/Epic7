import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { fetchUserProfile } from "../services/userService";
import { 
  fetchUserGuild, 
  searchGuilds, 
  joinGuild, 
  leaveGuild,
  fetchGuildMembers,
  kickGuildMember,
  changeGuildMemberRole,
  createGuild,
  requestToJoinGuild,
  updateGuildDescription,
  updateGuildOpenStatus,
  deleteGuild,
  banUserFromGuild,
  fetchRecentGuilds
} from "../services/guildService";
import { 
  FaSearch, 
  FaUserPlus, 
  FaSignOutAlt, 
  FaLock,
  FaLockOpen,
  FaPencilAlt,
  FaCog,
  FaTrash,
  FaUsers,
  FaComments,
  FaSync,
  FaCheck
} from "react-icons/fa";
import { motion } from "framer-motion";
import { ModernPageLayout, ModernCard, ModernButton, ModernSearchBar, ModernModal } from "../components/ui";
import GuildSearchModal from "../components/guilds/GuildSearchModal";
import GuildMemberList from "../components/guilds/GuildMemberList";
import CreateGuildModal from "../components/guilds/CreateGuildModal";
import NoGuildSection from "../components/guilds/NoGuildSection";
import Notification from "../components/common/Notification";

// Define GuildDetails component here since it seems to be missing
const GuildDetails = ({ 
  userGuild, 
  guildMembers, 
  onLeaveGuild, 
  onSearchClick, 
  onUpdateDescription, 
  onToggleGuildStatus, 
  onDeleteGuild, 
  onKickMember, 
  onChangeRole, 
  onBanMember,
  onOpenChat
}) => {
  const { language, t } = useSettings();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showGuildParams, setShowGuildParams] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guildParamsRef = useRef(null);

  // Determine user's role in the guild
  const userRole = userGuild?.userRole?.toLowerCase() || "";
  const isLeader = userRole === "leader";
  const isOfficer = userRole === "officer" || userRole === "conseiller" || isLeader;

  // Handle updating description
  const handleUpdateDescriptionSubmit = () => {
    onUpdateDescription(userGuild.id, newDescription);
    setEditDescription(false);
  };

  // Open edit description form
  const openEditDescription = () => {
    setNewDescription(userGuild.description || "");
    setEditDescription(true);
    setShowGuildParams(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ModernCard className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {userGuild.name?.charAt(0)?.toUpperCase() || 'G'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {userGuild.name}
                  </h2>
                  {isOfficer && (
                    <div className="relative" ref={guildParamsRef}>
                      <ModernButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowGuildParams(!showGuildParams)}
                        className="text-slate-600 hover:text-purple-500 dark:text-slate-300 dark:hover:text-purple-400"
                      >
                        <FaCog size={18} />
                      </ModernButton>
                      {/* Guild parameter dropdown */}
                      {showGuildParams && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-0 mt-2 w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 z-30"
                        >
                          <div className="py-2">
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-colors flex items-center gap-3"
                              onClick={openEditDescription}
                            >
                              <FaPencilAlt className="text-purple-500" size={14} />
                              <span className="text-sm">{t("editDescription", language)}</span>
                            </button>
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-colors flex items-center gap-3"
                              onClick={() => {
                                onToggleGuildStatus();
                                setShowGuildParams(false);
                              }}
                            >
                              {userGuild.isOpen ? (
                                <>
                                  <FaLock className="text-red-500" size={14} />
                                  <span className="text-sm">{t("closeGuild", language)}</span>
                                </>
                              ) : (
                                <>
                                  <FaLockOpen className="text-green-500" size={14} />
                                  <span className="text-sm">{t("openGuild", language)}</span>
                                </>
                              )}
                            </button>
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-colors flex items-center gap-3"
                              onClick={() => {
                                setShowUserManagement(!showUserManagement);
                                setShowGuildParams(false);
                              }}
                            >
                              <FaUsers className="text-blue-500" size={14} />
                              <span className="text-sm">{showUserManagement ? t("hideUserManagement", language) : t("manageUsers", language)}</span>
                            </button>
                            {isLeader && (
                              <button
                                className="w-full px-4 py-2 text-left hover:bg-red-50/50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 text-red-500"
                                onClick={() => {
                                  setConfirmDelete(true);
                                  setShowGuildParams(false);
                                }}
                              >
                                <FaTrash size={14} />
                                <span className="text-sm">{t("deleteGuild", language)}</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300">
                    {userGuild.isOpen === true ? (
                      <>
                        <FaLockOpen className="text-green-500" />
                        {t("open", language)}
                      </>
                    ) : (
                      <>
                        <FaLock className="text-red-500" />
                        {t("closed", language)}
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300">
                    {t(`role_${(userGuild.userRole || "member").toLowerCase()}`, language) || userGuild.userRole}
                  </span>
                </div>
              </div>
            </div>
            {editDescription ? (
              <motion.div 
                className="mt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <textarea 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-white/20 dark:border-gray-700/30 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  rows={3}
                  placeholder={t("enterDescription", language) || "Enter description..."}
                />
                <div className="flex gap-3 mt-3">
                  <ModernButton 
                    onClick={handleUpdateDescriptionSubmit}
                    variant="success"
                    size="sm"
                  >
                    {t("save", language)}
                  </ModernButton>
                  <ModernButton 
                    onClick={() => setEditDescription(false)}
                    variant="ghost"
                    size="sm"
                  >
                    {t("cancel", language)}
                  </ModernButton>
                </div>
              </motion.div>
            ) : (
              <div className="mt-4">
                <p className="text-slate-700 dark:text-slate-200">
                  {userGuild.description || t("noDescription", language) || "No description"}
                </p>
              </div>
            )}
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("level", language)}:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{userGuild.level || 1}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("members", language)}:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{userGuild.memberCount || 0}/{userGuild.maxMembers || 20}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("rank", language)}:</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">{userGuild.rank || "BRONZE"}</span>
                </div>
                {(userGuild.ranking > 0) && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("ranking", language)}:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">#{userGuild.ranking}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("yourRole", language)}:</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">{t(`role_${(userGuild.userRole || "member").toLowerCase()}`, language) || userGuild.userRole}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("guildPoints", language)}:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{userGuild.guildPoints || 0}</span>
                </div>
                {isLeader && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("gold", language)}:</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">{userGuild.gold || 0}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-6">
          {/* Button to leave the guild */}
          <ModernButton
            variant="danger"
            onClick={() => setConfirmLeave(true)}
            className="flex items-center gap-2"
          >
            <FaSignOutAlt /> {t("leaveGuild", language)}
          </ModernButton>
          {/* Button to open guild chat */}
          <ModernButton
            variant="primary"
            onClick={() => onOpenChat(userGuild.id)}
            className="flex items-center gap-2"
          >
            <FaComments /> {t("guildChat", language)}
          </ModernButton>
          {/* Button to show/hide the search bar */}
          <ModernButton
            variant="secondary"
            onClick={onSearchClick}
            className="flex items-center gap-2"
          >
            <FaSearch /> {t("searchGuilds", language)}
          </ModernButton>
        </div>
      </ModernCard>

      {/* Confirmation to delete the guild */}
      {confirmDelete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="mt-6"
        >
          <ModernCard className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-900/20 dark:to-pink-900/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FaTrash className="text-white text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                  {t("confirmDeleteGuild", language)}
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                  {t("deleteGuildWarning", language)}
                </p>
                <div className="flex gap-3">
                  <ModernButton
                    onClick={() => onDeleteGuild(userGuild.id)}
                    variant="danger"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FaCheck /> {t("yesDelete", language)}
                  </ModernButton>
                  <ModernButton
                    onClick={() => setConfirmDelete(false)}
                    variant="ghost"
                    size="sm"
                  >
                    {t("cancel", language)}
                  </ModernButton>
                </div>
              </div>
            </div>
          </ModernCard>
        </motion.div>
      )}

      {/* Confirmation to leave the guild */}
      {confirmLeave && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="mt-6"
        >
          <ModernCard className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-900/20 dark:to-pink-900/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FaSignOutAlt className="text-white text-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                  {t("confirmLeaveGuild", language)}
                </h3>
                <div className="flex gap-3">
                  <ModernButton
                    onClick={onLeaveGuild}
                    variant="danger"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FaCheck /> {t("yes", language)}
                  </ModernButton>
                  <ModernButton
                    onClick={() => setConfirmLeave(false)}
                    variant="ghost"
                    size="sm"
                  >
                    {t("cancel", language)}
                  </ModernButton>
                </div>
              </div>
            </div>
          </ModernCard>
        </motion.div>
      )}

      {/* Guild Member List Component */}
      <GuildMemberList
        members={guildMembers}
        userRole={userRole}
        onKickMember={onKickMember}
        onChangeRole={onChangeRole}
        onBanMember={onBanMember} 
        showManagement={showUserManagement}
      />
    </motion.div>
  );
};

// Main component
const GuildsPage = () => {
  const navigate = useNavigate();
  const { language, t } = useSettings();
  const [user, setUser] = useState(null);
  const [userGuild, setUserGuild] = useState(null);
  const [guildMembers, setGuildMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showCreateGuild, setShowCreateGuild] = useState(false);
  const [pendingJoinRequestGuildId, setPendingJoinRequestGuildId] = useState(null);
  const [editDescription, setEditDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [showGuildParams, setShowGuildParams] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guildParamsRef = useRef(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [recentGuilds, setRecentGuilds] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Close guild parameters dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (guildParamsRef.current && !guildParamsRef.current.contains(event.target)) {
        setShowGuildParams(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load user, guild data, and recent guilds on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("Loading user data...");
        // Load user profile
        const userData = await fetchUserProfile();
        setUser(userData);
        
        console.log("Loading guild data...");
        // Attempt to load guild information
        const guildData = await fetchUserGuild();
        console.log("Guild data received:", guildData);
        
        // Load recent guilds
        try {
          console.log("Loading recent guilds...");
          const recentGuildsData = await fetchRecentGuilds(10);
          console.log("Recent guilds response:", recentGuildsData);
          
          // Handle different response structures
          let guildsArray = [];
          if (recentGuildsData && recentGuildsData.data && Array.isArray(recentGuildsData.data)) {
            guildsArray = recentGuildsData.data;
            console.log("Using recentGuildsData.data array");
          } else if (recentGuildsData && Array.isArray(recentGuildsData)) {
            guildsArray = recentGuildsData;
            console.log("Using recentGuildsData array directly");
          } else if (recentGuildsData && recentGuildsData.success && recentGuildsData.data) {
            // API might return a success wrapper
            guildsArray = Array.isArray(recentGuildsData.data) ? recentGuildsData.data : [];
            console.log("Using success wrapper data");
          }
          
          console.log(`Found ${guildsArray.length} recent guilds`);
          setRecentGuilds(guildsArray);
        } catch (recentGuildsError) {
          console.error("Failed to load recent guilds:", recentGuildsError);
          setRecentGuilds([]);
        }
        
        // Only set guild data and fetch members if there is actual guild data
        if (guildData && guildData.id) {
          console.log("Setting user guild with data:", guildData);
          setUserGuild({
            ...guildData,
            memberCount: guildData.memberCount || 0,
            maxMembers: guildData.maxMembers || 20,
            gold: guildData.gold || 0,
            guildPoints: guildData.guildPoints || 0,
            rank: guildData.rank || "BRONZE",
            isOpen: guildData.isOpen !== undefined ? guildData.isOpen : true,
            userRole: guildData.userRole || "MEMBRE"
          });
          
          console.log("Loading guild members...");
          if (guildData.id) {
            try {
              // Only fetch members if we have a valid guild ID
              const members = await fetchGuildMembers(guildData.id);
              console.log(`Members response for guild ${guildData.id}:`, members);
              
              if (members && members.data) {
                setGuildMembers(members.data || []);
              } else {
                setGuildMembers(members || []);
              }
            } catch (memberError) {
              console.error("Failed to load guild members:", memberError);
              setGuildMembers([]);
            }
          }
        } else {
          // Clear guild data if none exists
          console.log("No guild data found, setting to null");
          setUserGuild(null);
          setGuildMembers([]);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load user or guild data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Handle joining a guild
  const handleJoinGuild = async (guildId) => {
    if (!guildId || guildId === "undefined") {
      console.error("Invalid guild ID:", guildId);
      return;
    }
    
    try {
      setJoinLoading(true);
      console.log(`Attempting to join guild: ${guildId}`);
      
      // Use the recent guilds data if we have it
      const guildInfo = recentGuilds.find(g => g.id === guildId);
      
      if (!guildInfo) {
        console.log("Guild info not found in cached data, proceeding anyway");
      } else {
        console.log("Using cached guild info:", guildInfo);
      }
      
      // Determine if the guild is open (if we have guild info)
      const isOpen = guildInfo ? guildInfo.isOpen : true; // Assume open if we don't have info
      console.log(`Guild ${guildId} isOpen status: ${isOpen}`);
      
      if (!isOpen) {
        // If the guild is closed, send a request to join
        console.log(`Guild ${guildId} is closed, sending request to join`);
        await requestToJoinGuild(guildId);
        
        // Show success message temporarily
        setPendingJoinRequestGuildId(guildId);
        setTimeout(() => {
          setPendingJoinRequestGuildId(null);
        }, 3000);
        
        // Close search modal
        setShowSearchModal(false);
        setJoinLoading(false);
        return;
      }
      
      // If the guild is open, join directly
      await joinGuild(guildId);
      
      // If we have guild info, use it
      if (guildInfo) {
        setUserGuild({
          ...guildInfo,
          userRole: "MEMBRE", // Default role for new members
          gold: 0,
          guildPoints: 0
        });
      } else {
        // Otherwise, fetch the guild data
        const guildData = await fetchUserGuild();
        if (guildData && guildData.id) {
          setUserGuild({
            ...guildData,
            memberCount: guildData.memberCount || 0,
            maxMembers: guildData.maxMembers || 20,
            gold: guildData.gold || 0,
            guildPoints: guildData.guildPoints || 0,
            rank: guildData.rank || "BRONZE",
            isOpen: guildData.isOpen !== undefined ? guildData.isOpen : true,
            userRole: guildData.userRole || "MEMBRE"
          });
        }
      }
      
      // Fetch members to update the member list with the user included
      try {
        // Only fetch members if we have a valid guild ID and userGuild is set
        const currentGuildId = userGuild?.id || guildId;
        if (currentGuildId && currentGuildId !== "undefined") {
          const members = await fetchGuildMembers(currentGuildId);
          setGuildMembers(members || []);
        }
      } catch (memberError) {
        console.error("Failed to load guild members:", memberError);
        setGuildMembers([]);
      }
      
      // Close search modal
      setShowSearchModal(false);
    } catch (error) {
      console.error("Error joining guild:", error);
      const errorMessage = error.response?.data || t("errorJoiningGuild", language);
      setNotification({
        show: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setJoinLoading(false);
    }
  };

  // Handle leaving a guild
  const handleLeaveGuild = async () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    
    try {
      await leaveGuild();
      setUserGuild(null);
      setGuildMembers([]);
      setConfirmLeave(false);
    } catch (error) {
      console.error("Error leaving guild:", error);
    }
  };

  // Handle creating a new guild
  const handleCreateGuild = async (guildData) => {
    if (!guildData) {
      console.error("No guild data received from creation");
      return false;
    }
    
    try {
      console.log("Guild created with data:", guildData);
      
      // If we already have the guild data from the creation response,
      // use it directly instead of making another API call
      if (guildData.id) {
        console.log("Using guild data from creation response:", guildData);
        setUserGuild({
          ...guildData,
          memberCount: guildData.memberCount || 1,
          maxMembers: guildData.maxMembers || 20,
          gold: guildData.gold || 0,
          guildPoints: guildData.guildPoints || 0,
          rank: guildData.rank || "BRONZE",
          isOpen: guildData.isOpen !== undefined ? guildData.isOpen : true,
          userRole: "LEADER" // As creator, should be leader
        });
        
        // Update recent guilds list with the newly created guild
        setRecentGuilds(prevGuilds => {
          const newGuild = {
            ...guildData,
            memberCount: 1,
            maxMembers: guildData.maxMembers || 20
          };
          return [newGuild, ...prevGuilds.filter(g => g.id !== guildData.id)];
        });
        
        // Only fetch members if we have a valid guild ID
        if (guildData.id) {
          try {
            // Wait a moment to ensure backend has updated the guild membership
            setTimeout(async () => {
              const members = await fetchGuildMembers(guildData.id);
              console.log("Members after guild creation:", members);
              
              if (members && Array.isArray(members)) {
                setGuildMembers(members);
              } else if (members && members.data && Array.isArray(members.data)) {
                setGuildMembers(members.data);
              } else {
                // Create a default member entry for the current user if none returned
                const defaultMember = {
                  id: Date.now(), // temporary ID
                  username: user?.username || "You",
                  role: "LEADER",
                  userId: user?.id,
                  level: user?.level || 1,
                  joinDate: new Date().toISOString()
                };
                setGuildMembers([defaultMember]);
                console.log("Created default member:", defaultMember);
              }
            }, 500); // Give the backend a moment to update
          } catch (memberError) {
            console.error("Failed to load guild members:", memberError);
            setGuildMembers([]);
          }
        }
        
        setNotification({
          show: true,
          message: t("guildCreatedSuccess", language) || "Guild created successfully!",
          type: 'success'
        });
        
        return true;
      } else {
        // As a fallback, get guild data from API
        console.log("No guild ID in response, fetching guild data from API");
        const fetchedGuildData = await fetchUserGuild();
        
        if (fetchedGuildData && fetchedGuildData.id) {
          setUserGuild({
            ...fetchedGuildData,
            memberCount: fetchedGuildData.memberCount || 1,
            maxMembers: fetchedGuildData.maxMembers || 20,
            gold: fetchedGuildData.gold || 0,
            guildPoints: fetchedGuildData.guildPoints || 0,
            rank: fetchedGuildData.rank || "BRONZE",
            isOpen: fetchedGuildData.isOpen !== undefined ? fetchedGuildData.isOpen : true,
            userRole: fetchedGuildData.userRole || "LEADER"
          });
          
          // Wait a moment to ensure backend has updated the guild membership
          setTimeout(async () => {
            const members = await fetchGuildMembers(fetchedGuildData.id);
            if (members && Array.isArray(members)) {
              setGuildMembers(members);
            } else if (members && members.data && Array.isArray(members.data)) {
              setGuildMembers(members.data);
            } else {
              // Create a default member entry for the current user
              const defaultMember = {
                id: Date.now(), // temporary ID
                username: user?.username || "You",
                role: "LEADER",
                userId: user?.id,
                level: user?.level || 1,
                joinDate: new Date().toISOString()
              };
              setGuildMembers([defaultMember]);
              console.log("Created default member:", defaultMember);
            }
          }, 500);
          
          return true;
        }
      }
      
      console.error("Failed to get guild data after creation");
      return false;
    } catch (error) {
      console.error("Error handling guild creation:", error);
      setNotification({
        show: true,
        message: error.response?.data || t("errorCreatingGuild", language),
        type: 'error'
      });
      return false;
    }
  };

  // Handle banning a member
  const handleBanMember = async (member, reason = "") => {
    try {
      // Check if we have the right permissions
      if (!userGuild || !isOfficer) {
        setNotification({
          show: true,
          message: t("noPermissionToBan", language),
          type: 'error'
        });
        return false;
      }
      
      // Use the userId property of the member object instead of the membership id
      await banUserFromGuild(userGuild.id, member.userId, reason);
      
      // Update member list after ban
      const members = await fetchGuildMembers(userGuild.id);
      setGuildMembers(members);
      
      setNotification({
        show: true,
        message: t("memberBanned", language),
        type: 'success'
      });
      return true;
    } catch (error) {
      console.error("Error banning member:", error);
      setNotification({
        show: true,
        message: error.response?.data || t("errorBanningMember", language),
        type: 'error'
      });
      return false;
    }
  };

  // Handle kicking a member
  const handleKickMember = async (member) => {
    try {
      // Use the userId property of the member object instead of the membership id
      await kickGuildMember(member.userId);
      
      // Update member list
      if (userGuild) {
        const members = await fetchGuildMembers(userGuild.id);
        setGuildMembers(members);
      }
    } catch (error) {
      console.error("Error kicking member:", error);
    }
  };

  // Handle changing a member's role
  const handleChangeRole = async (member, newRole) => {
    try {
      // Use the userId property of the member object instead of the membership id
      await changeGuildMemberRole(member.userId, newRole);
      
      // Update member list
      if (userGuild) {
        const members = await fetchGuildMembers(userGuild.id);
        setGuildMembers(members);
      }
    } catch (error) {
      console.error("Error changing member role:", error);
    }
  };

  // Handle requesting to join a guild
  const handleRequestJoin = async (guildId) => {
    try {
      setJoinLoading(true);
      setPendingJoinRequestGuildId(guildId);
      await requestToJoinGuild(guildId);
      
      // Show success message temporarily
      setTimeout(() => {
        setPendingJoinRequestGuildId(null);
      }, 3000);
    } catch (error) {
      console.error("Error requesting to join guild:", error);
      setPendingJoinRequestGuildId(null);
    } finally {
      setJoinLoading(false);
    }
  };

  // Handle updating guild description
  const handleUpdateDescription = async () => {
    if (!userGuild || !newDescription.trim()) return;
    
    try {
      await updateGuildDescription(userGuild.id, newDescription);
      
      // Update local state
      setUserGuild({
        ...userGuild,
        description: newDescription
      });
      
      setEditDescription(false);
    } catch (error) {
      console.error("Error updating guild description:", error);
    }
  };

  // Handle toggling guild open/closed status
  const handleToggleGuildStatus = async () => {
    if (!userGuild) return;
    
    try {
      const newStatus = !userGuild.isOpen;
      console.log(`Toggling guild ${userGuild.id} status to isOpen=${newStatus}`);
      
      await updateGuildOpenStatus(userGuild.id, newStatus);
      
      // Update local state
      setUserGuild({
        ...userGuild,
        isOpen: newStatus
      });

      setNotification({
        show: true,
        message: newStatus ? 
          t("guildNowOpen", language) || "Guild is now open for new members" : 
          t("guildNowClosed", language) || "Guild is now closed for new members",
        type: 'success'
      });
      
      console.log(`Guild status updated: isOpen=${newStatus}`);
    } catch (error) {
      console.error("Error updating guild status:", error);
      setNotification({
        show: true,
        message: error.response?.data || t("errorUpdatingGuildStatus", language),
        type: 'error'
      });
    }
  };

  // Handle deleting a guild
  const handleDeleteGuild = async () => {
    if (!userGuild || !isLeader) return;
    
    try {
      await deleteGuild(userGuild.id);
      setUserGuild(null);
      setGuildMembers([]);
      setConfirmDelete(false);
      setShowGuildParams(false);
    } catch (error) {
      console.error("Error deleting guild:", error);
    }
  };

  // Handle search button click
  const handleSearchButtonClick = () => {
    setShowSearchModal(true);
  };

  // Handle navigate to guild chat
  const handleOpenGuildChat = (guildId) => {
    navigate(`/guild/${guildId}/chat`);
  };

  // If data is loading
  if (loading) {
    return (
      <ModernPageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-200 dark:border-purple-700 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
            <p className="text-lg text-slate-700 dark:text-slate-200">
              {t("loading", language)}...
            </p>
          </motion.div>
        </div>
      </ModernPageLayout>
    );
  }

  // If an error occurred
  if (error) {
    return (
      <ModernPageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ModernCard className="max-w-md mx-auto border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
                  {t("error", language) || "Error"}
                </h3>
                <p className="text-red-700 dark:text-red-300 mb-6">
                  {error}
                </p>
                <ModernButton 
                  onClick={() => navigate("/dashboard")} 
                  variant="primary"
                  className="w-full"
                >
                  {t("returnToDashboard", language)}
                </ModernButton>
              </div>
            </ModernCard>
          </motion.div>
        </div>
      </ModernPageLayout>
    );
  }

  // Determine user's role in the guild
  const userRole = userGuild?.userRole?.toLowerCase() || "";
  const isLeader = userRole === "leader";
  const isOfficer = userRole === "officer" || userRole === "conseiller" || isLeader;

  console.log("Rendering GuildsPage with userGuild:", userGuild);

  return (
    <ModernPageLayout>
      {/* Search Modal Component */}
      <GuildSearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onJoinGuild={handleJoinGuild}
        onRequestJoin={handleRequestJoin}
        pendingJoinRequestGuildId={pendingJoinRequestGuildId}
      />
      
      {/* Create Guild Modal Component */}
      <CreateGuildModal
        isOpen={showCreateGuild}
        onClose={() => setShowCreateGuild(false)}
        onCreateGuild={handleCreateGuild}
      />

      {/* Notification Component */}
      {notification.show && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          duration={3000}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      {/* Header */}
      <motion.header 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ModernButton 
          variant="ghost"
          onClick={() => navigate("/dashboard")} 
          className="mb-4 flex items-center gap-2"
        >
          &larr; {t("returnToDashboard", language)}
        </ModernButton>
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {t("guilds", language)}
        </h1>
      </motion.header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto">
        
        {/* Display user's guild if it exists, otherwise show NoGuildSection */}
        {userGuild ? (
          <GuildDetails
            userGuild={userGuild}
            guildMembers={guildMembers}
            onLeaveGuild={handleLeaveGuild}
            onSearchClick={() => setShowSearchModal(true)}
            onUpdateDescription={handleUpdateDescription}
            onToggleGuildStatus={handleToggleGuildStatus}
            onDeleteGuild={handleDeleteGuild}
            onKickMember={handleKickMember}
            onChangeRole={handleChangeRole}
            onBanMember={handleBanMember}
            onOpenChat={handleOpenGuildChat}
          />
        ) : (
          <NoGuildSection
            onCreateClick={() => setShowCreateGuild(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />
        )}

        {/* Always show recent guilds section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ModernCard className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t("recentGuilds", language) || "Recently Created Guilds"}
              </h2>
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <FaSync />
                {t("refresh", language) || "Refresh"}
              </ModernButton>
            </div>
            
            {recentGuilds && recentGuilds.length > 0 ? (
              <div className="grid gap-4">
                {recentGuilds.map((guild, index) => (
                  <motion.div
                    key={guild.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="group p-4 rounded-xl bg-gradient-to-r from-white/50 to-purple-50/30 dark:from-gray-800/50 dark:to-purple-900/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 hover:border-purple-300/50 dark:hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                            {guild.name?.charAt(0)?.toUpperCase() || 'G'}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {guild.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                              <span className="flex items-center gap-1">
                                <FaUsers size={12} />
                                {guild.memberCount}/{guild.maxMembers}
                              </span>
                              <span className="flex items-center gap-1">
                                {guild.isOpen ? (
                                  <>
                                    <FaLockOpen className="text-green-500" size={12} />
                                    <span className="text-green-600 dark:text-green-400">{t("open", language)}</span>
                                  </>
                                ) : (
                                  <>
                                    <FaLock className="text-red-500" size={12} />
                                    <span className="text-red-600 dark:text-red-400">{t("closed", language)}</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        {guild.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 ml-13">
                            {guild.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Only show join buttons if user doesn't belong to this guild */}
                        {(!userGuild || userGuild.id !== guild.id) && (
                          <ModernButton
                            size="sm"
                            variant={guild.isOpen ? "primary" : "secondary"}
                            onClick={() => guild.isOpen ? handleJoinGuild(guild.id) : handleRequestJoin(guild.id)}
                            disabled={joinLoading || (pendingJoinRequestGuildId === guild.id) || (userGuild && userGuild.id !== guild.id)}
                            className="flex items-center gap-2"
                          >
                            {pendingJoinRequestGuildId === guild.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                {t("requestSent", language) || "Request Sent"}
                              </>
                            ) : userGuild ? (
                              t("alreadyInGuild", language) || "Already in a guild"
                            ) : guild.isOpen ? (
                              <>
                                <FaUserPlus size={12} />
                                {t("join", language)}
                              </>
                            ) : (
                              <>
                                <FaUserPlus size={12} />
                                {t("requestJoin", language)}
                              </>
                            )}
                          </ModernButton>
                        )}
                        {userGuild && userGuild.id === guild.id && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                            {t("yourGuild", language) || "Your guild"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  <FaUsers className="text-gray-400 dark:text-gray-500" size={24} />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("noRecentGuilds", language) || "No recently created guilds found."}
                </p>
              </div>
            )}
          </ModernCard>
        </motion.div>
      </div>
    </ModernPageLayout>
  );
};

export default GuildsPage;