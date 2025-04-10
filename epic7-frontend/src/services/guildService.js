import API from "../api/axiosInstance.jsx";

// Récupérer les informations de la guilde de l'utilisateur courant
export const fetchUserGuild = async () => {
  try {
    const response = await API.get('/guilds/user');
    console.log("User guild response:", response);
    
    // Check if response has data property and extract actual guild data
    if (response.data && response.data.data) {
      return response.data.data;
    } else if (response.data && !response.data.data) {
      // If response has no data property but is the guild object itself
      return response.data;
    }
    return null;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // L'utilisateur n'appartient à aucune guilde
      return null;
    }
    console.error("Error fetching user guild:", error);
    return null;
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
  if (!guildId || guildId === "undefined" || guildId === undefined) {
    console.warn("Attempted to fetch guild members with invalid guildId:", guildId);
    return [];
  }
  
  try {
    console.log(`Fetching members for guild ${guildId}`);
    const response = await API.get(`/guilds/${guildId}/members`);
    console.log("Guild members response:", response);
    
    // Better handling of different response structures
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      console.log("Returning members from response.data.data");
      return response.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      console.log("Returning members from response.data");
      return response.data;
    } else if (response.data && response.data.success && response.data.data) {
      console.log("Returning members from response.data.data (non-array)");
      // Try to handle non-array response
      return Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    }
    
    console.warn("No valid member data found in response");
    return [];
  } catch (error) {
    console.error(`Error fetching guild members for guild ${guildId}:`, error);
    return [];
  }
};

// Récupérer tous les membres d'une guilde avec informations détaillées
export const fetchDetailedGuildMembers = async (guildId) => {
  if (!guildId || guildId === "undefined" || guildId === undefined) {
    console.warn("Attempted to fetch detailed guild members with invalid guildId:", guildId);
    return [];
  }
  
  try {
    const response = await API.get(`/guilds/${guildId}/members/detailed`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching detailed guild members for guild ${guildId}:`, error);
    return [];
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

// Créer une nouvelle guilde - this is now a wrapper function to maintain API compatibility
// but the actual API call is made directly in the CreateGuildModal component
export const createGuild = async (name, description) => {
  try {
    console.warn("createGuild function in guildService.js is deprecated. Use direct axios call instead.");
    
    if (!name) {
      return { 
        success: false, 
        code: "INVALID_INPUT", 
        message: "Guild name is required"
      };
    }
    
    // Create URL parameters
    const params = new URLSearchParams();
    params.append('name', name);
    if (description) params.append('description', description);
    
    // Send as form data
    const response = await API.post('/guilds/create', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
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
    console.log(`Fetching recent guilds with limit=${limit}`);
    const response = await API.get(`/guilds/recent?limit=${limit}`);
    console.log("Recent guilds API response:", response);
    
    // Handle different response structures
    let guildsData;
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // Response format: { success: true, data: [...] }
      guildsData = response.data.data;
      console.log("Using guilds from response.data.data array");
    } else if (response.data && Array.isArray(response.data)) {
      // Response format: [...] (direct array)
      guildsData = response.data;
      console.log("Using guilds from response.data array");
    } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      // Response might be a single guild or a wrapper object
      if (response.data.success && response.data.data) {
        guildsData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        console.log("Using guilds from success wrapper object");
      } else {
        // If it looks like a single guild object with expected properties
        if (response.data.id && response.data.name) {
          guildsData = [response.data];
          console.log("Found a single guild object, converting to array");
        } else {
          guildsData = [];
          console.warn("Response data format not recognized:", response.data);
        }
      }
    } else {
      guildsData = [];
      console.warn("No valid guilds data found in response");
    }
    
    // Process and normalize the guild data
    const processedGuilds = guildsData.map(guild => {
      // Ensure each guild has the required properties
      return {
        ...guild,
        id: guild.id || 0,
        name: guild.name || "Unknown Guild",
        description: guild.description || "",
        memberCount: guild.memberCount || 0,
        maxMembers: guild.maxMembers || 20,
        level: guild.level || 1,
        // Force isOpen to be a boolean based on multiple checks
        isOpen: typeof guild.isOpen === 'boolean' ? guild.isOpen : 
                guild.status ? guild.status.toLowerCase() === "open" : true
      };
    });
    
    console.log(`Processed ${processedGuilds.length} guilds:`, 
      processedGuilds.map(g => ({ id: g.id, name: g.name, isOpen: g.isOpen })));
    
    return processedGuilds;
  } catch (error) {
    console.error('Error fetching recent guilds:', error);
    console.error('Error details:', error.response?.data || error.message);
    // Return empty array instead of throwing, to avoid breaking the UI
    return [];
  }
};
