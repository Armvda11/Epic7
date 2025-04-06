import API from "../api/axiosInstance.jsx";

// Récupérer les informations de la guilde de l'utilisateur courant
export const fetchUserGuild = async () => {
  try {
    const response = await API.get('/guilds/user');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // L'utilisateur n'appartient à aucune guilde
      return null;
    }
    throw error;
  }
};

// Rechercher des guildes par nom
export const searchGuilds = async (query) => {
  try {
    const response = await API.get(`/guilds/search?query=${encodeURIComponent(query)}`);
    console.log("Search guilds response:", response.data);
    
    // Add isOpen property if it doesn't exist but status does
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(guild => {
        if (guild.isOpen === undefined && guild.status) {
          return {
            ...guild,
            isOpen: guild.status.toLowerCase() === "open"
          };
        }
        return guild;
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error searching guilds:', error);
    throw error;
  }
};

// Récupérer les détails d'une guilde par son nom
export const fetchGuildByName = async (name) => {
  try {
    const response = await API.post('/guilds/', null, {
      params: { name }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching guild details:', error);
    throw error;
  }
};

// Récupérer les informations de guilde d'un membre par son ID
export const fetchGuildByMember = async (userId) => {
  try {
    const response = await API.post('/guilds/member', null, {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching member guild:', error);
    throw error;
  }
};

// Rejoindre une guilde
export const joinGuild = async (guildId) => {
  try {
    const response = await API.post('/guilds/join', null, {
      params: { guildId }
    });
    return response.data;
  } catch (error) {
    console.error('Error joining guild:', error);
    throw error;
  }
};

// Ajouter un utilisateur à une guilde
export const addUserToGuild = async (guildId, userId) => {
  try {
    const response = await API.post('/guilds/add', {
      params: { guildId, userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding user to guild:', error);
    throw error;
  }
};

// Quitter une guilde
export const leaveGuild = async () => {
  try {
    const response = await API.post('/guilds/remove');
    return response.data;
  } catch (error) {
    console.error('Error leaving guild:', error);
    throw error;
  }
};

// Expulser un membre de la guilde
export const kickGuildMember = async (memberId) => {
  try {
    const response = await API.post('/guilds/remove', null, {
      params: { userId: memberId }
    });
    return response.data;
  } catch (error) {
    console.error('Error kicking member:', error);
    throw error;
  }
};

// Récupérer tous les membres d'une guilde
export const fetchGuildMembers = async (guildId) => {
  try {
    const response = await API.get(`/guilds/${guildId}/members`);
    return response.data;
  } catch (error) {
    console.error('Error fetching guild members:', error);
    throw error;
  }
};

// Récupérer tous les membres d'une guilde avec informations détaillées
export const fetchDetailedGuildMembers = async (guildId) => {
  try {
    const response = await API.get(`/guilds/${guildId}/members/detailed`);
    return response.data;
  } catch (error) {
    console.error('Error fetching detailed guild members:', error);
    throw error;
  }
};

// Changer le rôle d'un membre
export const changeGuildMemberRole = async (memberId, role) => {
  try {
    const response = await API.post('/guilds/change_role', null, {
      params: { memberId, role }
    });
    return response.data;
  } catch (error) {
    console.error('Error changing member role:', error);
    throw error;
  }
};

// Créer une nouvelle guilde
export const createGuild = async (name, description) => {
  try {
    // Fix: params should be URL parameters for this endpoint
    const response = await API.post('/guilds/create', null, {
      params: { name, description }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating guild:', error);
    throw error;
  }
};

// Mettre à jour la description d'une guilde
export const updateGuildDescription = async (guildId, description) => {
  try {
    const response = await API.post(`/guilds/${guildId}/description`, null, {
      params: { description }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating guild description:', error);
    throw error;
  }
};

// Supprimer une guilde
export const deleteGuild = async (guildId) => {
  try {
    const response = await API.delete(`/guilds/${guildId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting guild:', error);
    throw error;
  }
};

// Bannir un utilisateur d'une guilde
export const banUserFromGuild = async (guildId, userId, reason) => {
  try {
    const response = await API.post(`/guilds/${guildId}/ban`, null, {
      params: { userId, reason }
    });
    return response.data;
  } catch (error) {
    console.error('Error banning user from guild:', error);
    throw error;
  }
};

// Récupérer la liste des utilisateurs bannis d'une guilde
export const getGuildBannedUsers = async (guildId) => {
  try {
    const response = await API.get(`/guilds/${guildId}/bans`);
    return response.data;
  } catch (error) {
    console.error('Error fetching guild banned users:', error);
    throw error;
  }
};

// Débannir un utilisateur d'une guilde
export const unbanUserFromGuild = async (guildId, userId) => {
  try {
    const response = await API.post(`/guilds/${guildId}/unban`, null, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error unbanning user from guild:', error);
    throw error;
  }
};

// Changer le statut ouvert/fermé d'une guilde
export const updateGuildOpenStatus = async (guildId, isOpen) => {
  try {
    const response = await API.post(`/guilds/${guildId}/status`, null, {
      params: { isOpen }
    });
    console.log("Guild status update response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating guild open status:', error);
    throw error;
  }
};

// Récupérer la liste des membres triés par contributions
export const getMembersByContributions = async (guildId) => {
  try {
    const response = await API.get(`/guilds/${guildId}/contributions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching members by contributions:', error);
    throw error;
  }
};

// Ajouter des points de contribution
export const addContributionPoints = async (guildId, points) => {
  try {
    const response = await API.post(`/guilds/${guildId}/contribute`, null, {
      params: { points }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding contribution points:', error);
    throw error;
  }
}

// Inviter un utilisateur à rejoindre une guilde
export const inviteUserToGuild = async (userId) => {
  try {
    const response = await API.post('/guilds/invite', null, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error inviting user to guild:', error);
    throw error;
  }
};

// Accepter une invitation à rejoindre une guilde
export const acceptGuildInvite = async (guildId) => {
  try {
    const response = await API.post('/guilds/accept_invite', null, {
      params: { guildId }
    });
    return response.data;
  } catch (error) {
    console.error('Error accepting guild invite:', error);
    throw error;
  }
};

// Refuser une invitation à rejoindre une guilde
export const declineGuildInvite = async (guildId) => {
  try {
    const response = await API.post('/guilds/decline_invite', null, {
      params: { guildId }
    });
    return response.data;
  } catch (error) {
    console.error('Error declining guild invite:', error);
    throw error;
  }
};

// Accepter une demande d'adhésion à une guilde
export const acceptGuildRequest = async (userId) => {
  try {
    const response = await API.post('/guilds/accept_request', null, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error accepting guild request:', error);
    throw error;
  }
};

// Refuser une demande d'adhésion à une guilde
export const declineGuildRequest = async (userId) => {
  try {
    const response = await API.post('/guilds/decline_request', null, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error declining guild request:', error);
    throw error;
  }
}

// Envoyer une demande d'adhésion à une guilde
export const requestToJoinGuild = async (guildId) => {
  try {
    // Fix: Add debugging logs for API request
    console.log(`Sending request to join guild ${guildId}`);
    const response = await API.post('/guilds/request_join', null, {
      params: { guildId }
    });
    console.log("Request to join response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error requesting to join guild:', error);
    throw error;
  }
};

// Additional helper for debugging guild open status
export const checkGuildStatus = async (guildId) => {
  try {
    const response = await API.get(`/guilds/${guildId}`);
    console.log(`Guild ${guildId} status check:`, {
      isOpen: response.data.isOpen,
      status: response.data.isOpen ? 'open' : 'closed'
    });
    return response.data;
  } catch (error) {
    console.error('Error checking guild status:', error);
    throw error;
  }
};

/**
 * Bans a member from the guild
 * @param {string} memberId - The ID of the member to ban
 * @param {string} reason - The reason for the ban
 * @returns {Promise} - Promise resolving to the ban result
 */
export const banGuildMember = async (memberId, reason = "") => {
  try {
    // Get user's current guild
    const userGuild = await fetchUserGuild();
    if (!userGuild) {
      throw new Error('You are not in a guild');
    }

    // Use the existing API instance instead of fetch
    const response = await API.post(`/guilds/${userGuild.id}/ban`, null, {
      params: { userId: memberId, reason }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error banning guild member (ID: ${memberId}):`, error);
    throw error;
  }
};

// Récupérer les guildes les plus récentes
export const fetchRecentGuilds = async (limit = 10) => {
  try {
    const response = await API.get(`/guilds/recent?limit=${limit}`);
    
    // Add isOpen property for consistency with other guild data
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(guild => {
        if (guild.isOpen === undefined && guild.status) {
          return {
            ...guild,
            isOpen: guild.status.toLowerCase() === "open"
          };
        }
        return guild;
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching recent guilds:', error);
    throw error;
  }
};
