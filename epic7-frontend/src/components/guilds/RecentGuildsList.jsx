import React from "react";
import { FaLockOpen, FaLock } from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";

const RecentGuildsList = ({ 
  recentGuilds, 
  onJoinGuild, 
  onRequestJoin, 
  joinLoading, 
  pendingJoinRequestGuildId,
  userHasGuild // New prop to check if user already has a guild
}) => {
  const { language, t } = useSettings();

  return (
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
                {!userHasGuild && ( // Only show join button if user doesn't already have a guild
                  <button
                    onClick={() => guild.isOpen ? onJoinGuild(guild.id) : onRequestJoin(guild.id)}
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
                )}
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
  );
};

export default RecentGuildsList;
