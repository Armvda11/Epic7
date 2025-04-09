import { useState } from "react";
import { FaCrown, FaUser, FaUserShield, FaUserSlash, FaBan, FaTimes } from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";
import Notification from "../common/Notification";

const GuildMemberList = ({ 
members, 
userRole, 
onKickMember, 
onChangeRole,
onBanMember,
showManagement = false
}) => {
const { language, t } = useSettings();
const [actionMember, setActionMember] = useState(null);
const [showMemberActions, setShowMemberActions] = useState(false);
const [showBanModal, setShowBanModal] = useState(false);
const [banReason, setBanReason] = useState("");
const [isBanning, setIsBanning] = useState(false);
const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

const isLeader = userRole === "leader";
const isOfficer = userRole === "officer" || userRole === "conseiller" || isLeader;

const handleBanSubmit = async () => {
    if (!actionMember) return;
    
    setIsBanning(true);
    try {
    const success = await onBanMember(actionMember, banReason);
    if (success) {
        setShowBanModal(false);
        setShowMemberActions(false);
        setBanReason("");
        setNotification({
        show: true,
        message: `${actionMember.username} ${t("hasBeenBanned", language)}`,
        type: 'success'
        });
    }
    } finally {
    setIsBanning(false);
    }
};

return (
    <div className="mt-8">
    <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{t("guildMembers", language)}</h3>
    </div>
    
    {members && members.length > 0 ? (
        <ul className="space-y-3">
        {members.map(member => (
            <li 
            key={member.id} 
            className="flex items-center justify-between p-3 bg-purple-50 dark:bg-[#3a3660] rounded-lg"
            >
            <div className="flex items-center">
                {member.role === 'LEADER' && <FaCrown className="text-yellow-500 mr-2" />}
                {(member.role === 'CONSEILLER' || member.role === 'OFFICER') && <FaUserShield className="text-blue-500 mr-2" />}
                {(member.role === 'MEMBRE' || member.role === 'VETERAN') && <FaUser className="text-gray-400 mr-2" />}
                <img 
                src={member.avatar || "/epic7-Hero/sprite-hero/unknown.png"}
                alt=""
                className="w-10 h-10 rounded-full mr-3"
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
                }}
                />
                <div>
                <p className="font-bold">{member.username}</p>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span>{t("level", language)} {member.level} · {t(`role_${member.role.toLowerCase()}`, language) || member.role}</span>
                    {member.contributions > 0 && (
                    <span className="ml-2">{t("contributions", language)}: {member.contributions}</span>
                    )}
                </div>
                </div>
            </div>
            
            {/* Options for managing the member (according to permissions) */}
            {showManagement && (
                ((isLeader && member.role !== 'LEADER') || 
                (isOfficer && member.role !== 'LEADER' && member.role !== 'CONSEILLER' && member.role !== 'OFFICER')) && (
                <button
                    onClick={() => {
                    setActionMember(member);
                    setShowMemberActions(true);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ⋮
                </button>
                )
            )}
            </li>
        ))}
        </ul>
    ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">
        {t("noGuildMembers", language)}
        </p>
    )}
    
    {/* Modal for member actions */}
    {showMemberActions && actionMember && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
        <div className="absolute inset-0" onClick={() => setShowMemberActions(false)} />
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-sm w-full relative z-50">
            <h4 className="text-xl font-bold mb-4">
            {t("memberActions", language)} - {actionMember.username}
            </h4>
            <div className="space-y-3">
            {isLeader && actionMember.role !== 'LEADER' && (
                <>
                {actionMember.role === 'CONSEILLER' || actionMember.role === 'OFFICER' ? (
                    <button
                    onClick={() => {
                        onChangeRole(actionMember, "membre");
                        setShowMemberActions(false);
                    }}
                    className="flex items-center gap-2 w-full p-2 bg-blue-100 dark:bg-blue-900 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                    <FaUser className="text-blue-600 dark:text-blue-400" />
                    {t("demoteToMember", language)}
                    </button>
                ) : (
                    <button
                    onClick={() => {
                        onChangeRole(actionMember, "conseiller");
                        setShowMemberActions(false);
                    }}
                    className="flex items-center gap-2 w-full p-2 bg-blue-100 dark:bg-blue-900 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                    <FaUserShield className="text-blue-600 dark:text-blue-400" />
                    {t("promoteToOfficer", language)}
                    </button>
                )}
                </>
            )}
            
            {isLeader && actionMember.role !== 'LEADER' && actionMember.role !== 'CONSEILLER' && actionMember.role !== 'OFFICER' && (
                <button
                onClick={() => {
                    onChangeRole(actionMember, "veteran");
                    setShowMemberActions(false);
                }}
                className="flex items-center gap-2 w-full p-2 bg-purple-100 dark:bg-purple-900 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
                >
                <FaUserShield className="text-purple-600 dark:text-purple-400" />
                {t("promoteToVeteran", language)}
                </button>
            )}

            {((isLeader && actionMember.role !== 'LEADER') || 
                (isOfficer && actionMember.role !== 'LEADER' && actionMember.role !== 'CONSEILLER' && actionMember.role !== 'OFFICER')) && (
                <button
                onClick={() => {
                    onKickMember(actionMember);
                    setShowMemberActions(false);
                }}
                className="flex items-center gap-2 w-full p-2 bg-red-100 dark:bg-red-900 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                >
                <FaUserSlash className="text-red-600 dark:text-red-400" />
                {t("kickMember", language)}
                </button>
            )}
            
            {isOfficer && (
                <button
                onClick={() => {
                    setShowBanModal(true);
                    setShowMemberActions(false);
                }}
                className="flex items-center gap-2 w-full p-2 bg-red-100 dark:bg-red-900 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                >
                <FaBan className="text-red-600 dark:text-red-400" />
                {t("banMember", language)}
                </button>
            )}
            </div>
            <button
            onClick={() => setShowMemberActions(false)}
            className="mt-4 w-full p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
            {t("cancel", language)}
            </button>
        </div>
        </div>
    )}
    
    {/* Ban Member Modal */}
    {showBanModal && actionMember && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="absolute inset-0" onClick={() => setShowBanModal(false)} />
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-md w-full relative z-50">
            <button
            onClick={() => setShowBanModal(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
            <FaTimes />
            </button>
            <h4 className="text-xl font-bold mb-4">
            {t("banMember", language)} - {actionMember.username}
            </h4>
            <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
                {t("banReason", language)}:
            </label>
            <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full p-3 bg-purple-50 dark:bg-[#3a3660] rounded-lg text-gray-900 dark:text-white"
                rows={3}
                placeholder={t("banReasonPlaceholder", language)}
            />
            </div>
            <div className="flex gap-3">
            <button
                onClick={handleBanSubmit}
                disabled={isBanning}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center"
            >
                {isBanning ? t("banning", language) : t("confirmBan", language)}
            </button>
            <button
                onClick={() => setShowBanModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg"
            >
                {t("cancel", language)}
            </button>
            </div>
            <p className="mt-4 text-sm text-red-500 dark:text-red-400">
            {t("banWarning", language)}
            </p>
        </div>
        </div>
    )}

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
);
};

export default GuildMemberList;
