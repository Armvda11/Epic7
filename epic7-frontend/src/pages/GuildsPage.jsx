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
  FaUsers
} from "react-icons/fa";
import GuildSearchModal from "../components/guilds/GuildSearchModal";
import GuildMemberList from "../components/guilds/GuildMemberList";
import CreateGuildModal from "../components/guilds/CreateGuildModal";

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
        console.log("Guild data:", guildData);
        
        // Load recent guilds
        try {
          const recentGuildsData = await fetchRecentGuilds(10);
          setRecentGuilds(recentGuildsData || []);
        } catch (recentGuildsError) {
          console.error("Failed to load recent guilds:", recentGuildsError);
          setRecentGuilds([]);
        }
        
        // Initialize default values for properties that might be missing
        if (guildData) {
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
          try {
            const members = await fetchGuildMembers(guildData.id);
            console.log("Guild members:", members);
            setGuildMembers(members || []);
          } catch (memberError) {
            console.error("Failed to load guild members:", memberError);
            setGuildMembers([]);
          }
        } else {
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
        if (guildData) {
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
        const members = await fetchGuildMembers(guildId);
        setGuildMembers(members || []);
      } catch (memberError) {
        console.error("Failed to load guild members:", memberError);
        setGuildMembers([]);
      }
      
      // Close search modal
      setShowSearchModal(false);
    } catch (error) {
      console.error("Error joining guild:", error);
      const errorMessage = error.response?.data || t("errorJoiningGuild", language);
      alert(errorMessage);
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
  const handleCreateGuild = async (name, description) => {
    try {
      await createGuild(name, description);
      
      // Reload guild data
      const guildData = await fetchUserGuild();
      setUserGuild(guildData);
      
      if (guildData) {
        const members = await fetchGuildMembers(guildData.id);
        setGuildMembers(members);
      }
      
      // Close the create guild modal
      setShowCreateGuild(false);
      return true;
    } catch (error) {
      console.error("Error creating guild:", error);
      return false;
    }
  };

  // Handle banning a member
  const handleBanMember = async (member, reason = "") => {
    try {
      // Check if we have the right permissions
      if (!userGuild || !isOfficer) {
        alert(t("noPermissionToBan", language));
        return false;
      }
      
      // Use the userId property of the member object instead of the membership id
      await banUserFromGuild(userGuild.id, member.userId, reason);
      
      // Update member list after ban
      const members = await fetchGuildMembers(userGuild.id);
      setGuildMembers(members);
      
      // Show success notification
      alert(t("memberBanned", language));
      return true;
    } catch (error) {
      console.error("Error banning member:", error);
      alert(error.response?.data || t("errorBanningMember", language));
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
      
      console.log(`Guild status updated: isOpen=${newStatus}`);
    } catch (error) {
      console.error("Error updating guild status:", error);
      alert(error.response?.data || t("errorUpdatingGuildStatus", language));
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

  // If data is loading
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
          {t("loading", language)}...
      </main>
    );
  }

  // If an error occurred
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
          <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
          {error}
          <button 
              onClick={() => navigate("/dashboard")} 
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded block mx-auto"
          >
              {t("returnToDashboard", language)}
          </button>
          </div>
      </main>
    );
  }

  // Determine user's role in the guild
  const userRole = userGuild?.userRole?.toLowerCase() || "";
  const isLeader = userRole === "leader";
  const isOfficer = userRole === "officer" || userRole === "conseiller" || isLeader;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
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

      {/* Header */}
      <header className="mb-8">
        <button 
          onClick={() => navigate("/dashboard")} 
          className="mb-4 text-purple-600 dark:text-purple-400 hover:underline flex items-center"
        >
          &larr; {t("returnToDashboard", language)}
        </button>
        <h1 className="text-3xl font-bold text-center">{t("guilds", language)}</h1>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto">
        {/* Display user's guild if it exists */}
        {userGuild ? (
          <section className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 shadow-xl mb-8">
            <div className="flex justify-between items-start mb-5">
              <div className="flex-1">
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold">{userGuild.name}</h2>
                  {isOfficer && (
                    <div className="relative ml-3" ref={guildParamsRef}>
                      <button
                        onClick={() => setShowGuildParams(!showGuildParams)}
                        className="text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400 p-1"
                        title={t("guildSettings", language)}
                      >
                        <FaCog size={18} />
                      </button>
                      {/* Guild parameter dropdown */}
                      {showGuildParams && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#3a3660] rounded-lg shadow-lg z-30">
                          <ul className="py-2">
                            <li className="px-4 py-2 hover:bg-purple-50 dark:hover:bg-[#4a4670] cursor-pointer"
                                onClick={() => {
                                  setNewDescription(userGuild.description || "");
                                  setEditDescription(true);
                                  setShowGuildParams(false);
                                }}>
                              <div className="flex items-center">
                                <FaPencilAlt className="mr-2 text-purple-500" size={14} />
                                {t("editDescription", language)}
                              </div>
                            </li>
                            <li className="px-4 py-2 hover:bg-purple-50 dark:hover:bg-[#4a4670] cursor-pointer"
                                onClick={() => {
                                  handleToggleGuildStatus();
                                  setShowGuildParams(false);
                                }}>
                              <div className="flex items-center">
                                {userGuild.isOpen ? (
                                  <>
                                    <FaLock className="mr-2 text-red-500" size={14} />
                                    {t("closeGuild", language)}
                                  </>
                                ) : (
                                  <>
                                    <FaLockOpen className="mr-2 text-green-500" size={14} />
                                    {t("openGuild", language)}
                                  </>
                                )}
                              </div>
                            </li>
                            <li className="px-4 py-2 hover:bg-purple-50 dark:hover:bg-[#4a4670] cursor-pointer"
                                onClick={() => {
                                  setShowUserManagement(!showUserManagement);
                                  setShowGuildParams(false);
                                }}>
                              <div className="flex items-center">
                                <FaUsers className="mr-2 text-blue-500" size={14} />
                                {showUserManagement ? t("hideUserManagement", language) : t("manageUsers", language)}
                              </div>
                            </li>
                            {isLeader && (
                              <li className="px-4 py-2 hover:bg-purple-50 dark:hover:bg-[#4a4670] cursor-pointer"
                                  onClick={() => {
                                    setConfirmDelete(true);
                                    setShowGuildParams(false);
                                  }}>
                                <div className="flex items-center text-red-500 hover:text-red-700">
                                  <FaTrash className="mr-2" size={14} />
                                  {t("deleteGuild", language)}
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {editDescription ? (
                  <div className="mt-2">
                    <textarea 
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full p-2 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-gray-900 dark:text-white"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={handleUpdateDescription}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-lg text-sm"
                      >
                        {t("save", language)}
                      </button>
                      <button 
                        onClick={() => setEditDescription(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded-lg text-sm"
                      >
                        {t("cancel", language)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <p className="text-gray-600 dark:text-gray-300 mt-2">{userGuild.description || ""}</p>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>{t("level", language)}:</strong> {userGuild.level || 1}</p>
                    <p><strong>{t("members", language)}:</strong> {userGuild.memberCount || 0}/{userGuild.maxMembers || 20}</p>
                    <p><strong>{t("rank", language)}:</strong> {userGuild.rank || "BRONZE"}</p>
                    {(userGuild.ranking > 0) && <p><strong>{t("ranking", language)}:</strong> {userGuild.ranking}</p>}
                  </div>
                  <div>
                    <p><strong>{t("yourRole", language)}:</strong> {t(`role_${(userGuild.userRole || "member").toLowerCase()}`, language) || userGuild.userRole}</p>
                    <p><strong>{t("status", language)}:</strong> 
                      <span className="ml-2 inline-flex items-center">
                        {userGuild.isOpen === true ? (
                          <>
                            <FaLockOpen className="text-green-500 mr-1" />
                            {t("open", language)}
                          </>
                        ) : (
                          <>
                            <FaLock className="text-red-500 mr-1" />
                            {t("closed", language)}
                          </>
                        )}
                      </span>
                    </p>
                    <p><strong>{t("guildPoints", language)}:</strong> {userGuild.guildPoints || 0}</p>
                    {isLeader && <p><strong>{t("gold", language)}:</strong> {userGuild.gold || 0}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {/* Button to leave the guild */}
                <button
                  onClick={() => setConfirmLeave(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <FaSignOutAlt className="mr-2" /> {t("leaveGuild", language)}
                </button>
                {/* Button to show/hide the search bar */}
                <button
                  onClick={handleSearchButtonClick}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <FaSearch className="mr-2" /> {t("searchGuilds", language)}
                </button>
              </div>
            </div>

            {/* Confirmation to delete the guild */}
            {confirmDelete && (
              <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                <p className="font-bold">{t("confirmDeleteGuild", language)}</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">{t("deleteGuildWarning", language)}</p>
                <div className="flex mt-4 gap-4">
                  <button
                    onClick={handleDeleteGuild}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    {t("yesDelete", language)}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    {t("cancel", language)}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation to leave the guild */}
            {confirmLeave && (
              <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                <p className="font-bold">{t("confirmLeaveGuild", language)}</p>
                <div className="flex mt-4 gap-4">
                  <button
                    onClick={handleLeaveGuild}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    {t("yes", language)}
                  </button>
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    {t("cancel", language)}
                  </button>
                </div>
              </div>
            )}

            {/* Guild Member List Component */}
            <GuildMemberList
              members={guildMembers}
              userRole={userRole}
              onKickMember={handleKickMember}
              onChangeRole={handleChangeRole}
              onBanMember={handleBanMember} 
              showManagement={showUserManagement}
            />
          </section>
        ) : (
          <section className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 shadow-xl mb-8 text-center">
            <h2 className="text-2xl font-bold mb-4">{t("noGuild", language)}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t("noGuildDescription", language)}
            </p>
            
            {/* Buttons to join or create a guild */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => setShowCreateGuild(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <FaUserPlus /> {t("createGuild", language)}
              </button>
              <button
                onClick={handleSearchButtonClick}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <FaSearch /> {t("searchGuilds", language)}
              </button>
            </div>
          </section>
        )}

        {/* Display recently created guilds */}
        <section className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 shadow-xl mb-8">
          <h2 className="text-2xl font-bold mb-4">{t("recentGuilds", language) || "Recently Created Guilds"}</h2>
          
          {recentGuilds.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentGuilds.map(guild => (
                <li key={guild.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{guild.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t("members", language)}: {guild.memberCount}/{guild.maxMembers}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{guild.description || t("noDescription", language)}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-4 flex items-center">
                      {guild.isOpen ? (
                        <><FaLockOpen className="text-green-500 mr-1" /> {t("open", language)}</>
                      ) : (
                        <><FaLock className="text-red-500 mr-1" /> {t("closed", language)}</>
                      )}
                    </span>
                    <button
                      onClick={() => guild.isOpen ? handleJoinGuild(guild.id) : handleRequestJoin(guild.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                      disabled={joinLoading || (pendingJoinRequestGuildId === guild.id)}
                    >
                      {pendingJoinRequestGuildId === guild.id ? (
                        t("requestSent", language)
                      ) : guild.isOpen ? (
                        t("join", language)
                      ) : (
                        t("requestJoin", language)
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">
              {t("noRecentGuilds", language) || "No recently created guilds found."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
};

export default GuildsPage;