import { useState } from "react";
import { FaCrown, FaUser, FaUserShield, FaUserSlash, FaBan, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";
import { ModernCard, ModernButton } from "../ui";
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
    <motion.div 
      className="mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <ModernCard>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t("guildMembers", language)}
          </h3>
        </div>        {members && members.length > 0 ? (
        <div className="space-y-4">
        {members.map((member, index) => (
            <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="group p-4 rounded-xl bg-gradient-to-r from-white/50 to-purple-50/30 dark:from-gray-800/50 dark:to-purple-900/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 hover:border-purple-300/50 dark:hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
            >
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                {member.role === 'LEADER' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <FaCrown className="text-white" size={14} />
                  </div>
                )}
                {(member.role === 'CONSEILLER' || member.role === 'OFFICER') && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <FaUserShield className="text-white" size={14} />
                  </div>
                )}
                {(member.role === 'MEMBRE' || member.role === 'VETERAN') && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-lg">
                    <FaUser className="text-white" size={14} />
                  </div>
                )}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg overflow-hidden">
                  <img 
                  src={member.avatar || "/epic7-Hero/sprite-hero/unknown.png"}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
                  }}
                  />
                </div>
                <div>
                <p className="font-bold text-slate-900 dark:text-white">{member.username}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300">
                      {t("level", language)} {member.level}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300">
                      {t(`role_${member.role.toLowerCase()}`, language) || member.role}
                    </span>
                    {member.contributions > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300">
                      {t("contributions", language)}: {member.contributions}
                    </span>
                    )}
                </div>
                </div>
            </div>
            
            {/* Options for managing the member (according to permissions) */}
            {showManagement && (
                ((isLeader && member.role !== 'LEADER') || 
                (isOfficer && member.role !== 'LEADER' && member.role !== 'CONSEILLER' && member.role !== 'OFFICER')) && (
                <ModernButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                    setActionMember(member);
                    setShowMemberActions(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                    ⋮
                </ModernButton>
                )
            )}
            </div>
            </motion.div>
        ))}
        </div>
    ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
            <FaUser className="text-slate-500 dark:text-slate-400" size={24} />
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            {t("noGuildMembers", language)}
          </p>
        </div>
    )}
    
    {/* Modal for member actions */}
    {showMemberActions && actionMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowMemberActions(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 w-full max-w-sm"
          >
            <ModernCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t("memberActions", language)}
                </h4>
                <button
                  onClick={() => setShowMemberActions(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <FaTimes className="text-slate-600 dark:text-slate-300" size={14} />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-500/20">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {actionMember.username}
                </p>
              </div>

              <div className="space-y-3">
                {isLeader && actionMember.role !== 'LEADER' && (
                  <>
                    {actionMember.role === 'CONSEILLER' || actionMember.role === 'OFFICER' ? (
                      <ModernButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onChangeRole(actionMember, "membre");
                          setShowMemberActions(false);
                        }}
                        className="w-full justify-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <FaUser className="text-white" size={14} />
                        </div>
                        {t("demoteToMember", language)}
                      </ModernButton>
                    ) : (
                      <ModernButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onChangeRole(actionMember, "conseiller");
                          setShowMemberActions(false);
                        }}
                        className="w-full justify-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <FaUserShield className="text-white" size={14} />
                        </div>
                        {t("promoteToOfficer", language)}
                      </ModernButton>
                    )}
                  </>
                )}
                
                {isLeader && actionMember.role !== 'LEADER' && actionMember.role !== 'CONSEILLER' && actionMember.role !== 'OFFICER' && (
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onChangeRole(actionMember, "veteran");
                      setShowMemberActions(false);
                    }}
                    className="w-full justify-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <FaUserShield className="text-white" size={14} />
                    </div>
                    {t("promoteToVeteran", language)}
                  </ModernButton>
                )}

                {((isLeader && actionMember.role !== 'LEADER') || 
                  (isOfficer && actionMember.role !== 'LEADER' && actionMember.role !== 'CONSEILLER' && actionMember.role !== 'OFFICER')) && (
                  <ModernButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onKickMember(actionMember);
                      setShowMemberActions(false);
                    }}
                    className="w-full justify-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                      <FaUserSlash className="text-white" size={14} />
                    </div>
                    {t("kickMember", language)}
                  </ModernButton>
                )}
                
                {isOfficer && (
                  <ModernButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setShowBanModal(true);
                      setShowMemberActions(false);
                    }}
                    className="w-full justify-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                      <FaBan className="text-white" size={14} />
                    </div>
                    {t("banMember", language)}
                  </ModernButton>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <ModernButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMemberActions(false)}
                  className="w-full"
                >
                  {t("cancel", language)}
                </ModernButton>
              </div>
            </ModernCard>
          </motion.div>
        </div>
    )}
    
    {/* Ban Member Modal */}
    {showBanModal && actionMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowBanModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 w-full max-w-md"
          >
            <ModernCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                    <FaBan className="text-white" size={16} />
                  </div>
                  <h4 className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                    {t("banMember", language)}
                  </h4>
                </div>
                <button
                  onClick={() => setShowBanModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <FaTimes className="text-slate-600 dark:text-slate-300" size={14} />
                </button>
              </div>

              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-500/20">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                  {t("targetMember", language)}:
                </p>
                <p className="font-bold text-red-600 dark:text-red-400">
                  {actionMember.username}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">
                  {t("banReason", language)}:
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200/50 dark:border-gray-600/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-300 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-200 resize-none"
                  rows={3}
                  placeholder={t("banReasonPlaceholder", language)}
                />
              </div>

              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-red-50 dark:from-yellow-900/20 dark:to-red-900/20 border border-yellow-200/50 dark:border-yellow-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {t("banWarning", language)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ModernButton
                  variant="danger"
                  onClick={handleBanSubmit}
                  disabled={isBanning}
                  className="flex-1"
                  size="sm"
                >
                  {isBanning ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("banning", language)}
                    </div>
                  ) : (
                    t("confirmBan", language)
                  )}
                </ModernButton>
                <ModernButton
                  variant="ghost"
                  onClick={() => setShowBanModal(false)}
                  className="flex-1"
                  size="sm"
                >
                  {t("cancel", language)}
                </ModernButton>
              </div>
            </ModernCard>
          </motion.div>
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
      </ModernCard>
    </motion.div>
);
};

export default GuildMemberList;
