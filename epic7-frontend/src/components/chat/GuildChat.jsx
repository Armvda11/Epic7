import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatComponent from './ChatComponent';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { useSettings } from '../../context/SettingsContext';

const GuildChat = ({ guild }) => {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useSettings();

  return (
    <div className="flex flex-col h-full">
      <header className="bg-purple-700 dark:bg-purple-900 text-white p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate("/guilds")}
          className="flex items-center text-white hover:text-purple-200 transition"
        >
          <FaArrowLeft className="mr-2" /> {t("backToGuilds", language)}
        </button>
        
        <div className="flex items-center">
          <FaUsers className="mr-2" />
          <h1 className="text-xl font-bold">{guild?.name || ''} - {t("chat", language)}</h1>
        </div>
        
        <div></div> {/* Empty div for flex alignment */}
      </header>
      
      <div className="flex-1 overflow-hidden">
        <ChatComponent roomType="guild" guildId={guildId} />
      </div>
    </div>
  );
};

export default GuildChat;