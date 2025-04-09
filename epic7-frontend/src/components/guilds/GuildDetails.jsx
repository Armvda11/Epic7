import { useState, useRef, useEffect } from "react";
import { 
FaLockOpen, 
FaLock, 
FaSignOutAlt, 
FaSearch,
FaPencilAlt,
FaCog,
FaTrash,
FaUsers
} from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";
import GuildMemberList from "./GuildMemberList";
import ConfirmationModal from "./ConfirmationModal";

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
onBanMember
}) => {
const { language, t } = useSettings();
const [confirmLeave, setConfirmLeave] = useState(false);
const [confirmDelete, setConfirmDelete] = useState(false);
const [editDescription, setEditDescription] = useState(false);
const [newDescription, setNewDescription] = useState("");
const [showGuildParams, setShowGuildParams] = useState(false);
const [showUserManagement, setShowUserManagement] = useState(false);
const guildParamsRef = useRef(null);

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

// Handle local state updates before calling parent handlers
const handleUpdateDescription = () => {
    if (!userGuild || !newDescription.trim()) return;
    onUpdateDescription(userGuild.id, newDescription);
    setEditDescription(false);
};

const handleDeleteConfirm = () => {
    onDeleteGuild(userGuild.id);
    setConfirmDelete(false);
    setShowGuildParams(false);
};

const handleLeaveConfirm = () => {
    onLeaveGuild();
    setConfirmLeave(false);
};

// Determine user's role in the guild
const userRole = userGuild?.userRole?.toLowerCase() || "";
const isLeader = userRole === "leader";
const isOfficer = userRole === "officer" || userRole === "conseiller" || isLeader;

return (
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
                            onToggleGuildStatus(userGuild.id);
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
            onClick={onSearchClick}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
            <FaSearch className="mr-2" /> {t("searchGuilds", language)}
        </button>
        </div>
    </div>

    {/* Confirmation to delete the guild */}
    <ConfirmationModal
        isOpen={confirmDelete}
        title={t("confirmDeleteGuild", language)}
        message={t("deleteGuildWarning", language)}
        confirmText={t("yesDelete", language)}
        cancelText={t("cancel", language)}
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
    />

    {/* Confirmation to leave the guild */}
    <ConfirmationModal
        isOpen={confirmLeave}
        title={t("confirmLeaveGuild", language)}
        confirmText={t("yes", language)}
        cancelText={t("cancel", language)}
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        className="bg-slate-200 dark:bg-slate-700"
        onConfirm={handleLeaveConfirm}
        onCancel={() => setConfirmLeave(false)}
    />

    {/* Guild Member List Component */}
    <GuildMemberList
        members={guildMembers}
        userRole={userRole}
        onKickMember={onKickMember}
        onChangeRole={onChangeRole}
        onBanMember={onBanMember} 
        showManagement={showUserManagement}
    />
    </section>
);
};

export default GuildDetails;
