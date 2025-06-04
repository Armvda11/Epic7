package com.epic7.backend.service.rta;

import java.util.List;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;

import com.epic7.backend.dto.rta.RtaRankingDTO;
import com.epic7.backend.dto.rta.RtaTierInfoDTO;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service pour gérer le système de ranking RTA
 */
@Service
@RequiredArgsConstructor
public class RtaRankingService {
    
    private final UserRepository userRepository;
    
    // Tiers RTA avec leurs seuils de points
    public enum RtaTier {
        BRONZE(0, "Bronze"),
        SILVER(1200, "Silver"), 
        GOLD(1400, "Gold"),
        PLATINUM(1600, "Platinum"),
        DIAMOND(1800, "Diamond"),
        MASTER(2000, "Master"),
        GRANDMASTER(2200, "GrandMaster"),
        LEGEND(2400, "Legend");
        
        private final int minPoints;
        private final String displayName;
        
        RtaTier(int minPoints, String displayName) {
            this.minPoints = minPoints;
            this.displayName = displayName;
        }
        
        public int getMinPoints() {
            return minPoints;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    /**
     * Détermine le tier en fonction des points RTA
     */
    public String calculateTier(int rtaPoints) {
        RtaTier currentTier = RtaTier.BRONZE;
        
        for (RtaTier tier : RtaTier.values()) {
            if (rtaPoints >= tier.getMinPoints()) {
                currentTier = tier;
            } else {
                break;
            }
        }
        
        return currentTier.getDisplayName();
    }
    
    /**
     * Calcule les points gagnés/perdus en fonction du résultat du combat
     */
    public int calculatePointsChange(boolean isWin, int currentPoints, int opponentPoints) {
        // Système similaire à l'ELO
        double expectedScore = 1.0 / (1.0 + Math.pow(10.0, (opponentPoints - currentPoints) / 400.0));
        double actualScore = isWin ? 1.0 : 0.0;
        
        // Facteur K adaptatif selon le tier
        int kFactor = getKFactor(currentPoints);
        
        int pointsChange = (int) Math.round(kFactor * (actualScore - expectedScore));
        
        // Assurer un minimum de gain/perte
        if (isWin && pointsChange < 5) pointsChange = 5;
        if (!isWin && pointsChange > -5) pointsChange = -5;
        
        return pointsChange;
    }
    
    /**
     * Retourne le facteur K selon le niveau du joueur
     */
    private int getKFactor(int points) {
        if (points < 1200) return 50; // Bronze - progression rapide
        if (points < 1600) return 40; // Silver/Gold
        if (points < 2000) return 30; // Platinum/Diamond
        return 20; // Master+
    }
    
    /**
     * Valide que les points ne descendent pas en dessous de 0
     */
    public int clampPoints(int points) {
        return Math.max(0, points);
    }
    
    /**
     * Retourne le prochain tier et les points requis
     */
    public String getNextTierInfo(int currentPoints) {
        for (RtaTier tier : RtaTier.values()) {
            if (currentPoints < tier.getMinPoints()) {
                int pointsNeeded = tier.getMinPoints() - currentPoints;
                return tier.getDisplayName() + " (" + pointsNeeded + " points requis)";
            }
        }
        return "Legend Max";
    }
    
    /**
     * Récupère le leaderboard RTA
     */
    public List<RtaRankingDTO> getLeaderboard(int limit) {
        List<User> topUsers = userRepository.findTopRtaPlayers(limit);
        
        return IntStream.range(0, topUsers.size())
                .mapToObj(i -> {
                    User user = topUsers.get(i);
                    return new RtaRankingDTO(
                            user.getId(),
                            user.getUsername(),
                            user.getRtaPoints(),
                            user.getRtaTier(),
                            user.getWinNumber(),
                            user.getLoseNumber(),
                            i + 1 // position dans le classement
                    );
                })
                .toList();
    }
    
    /**
     * Récupère les informations détaillées sur le tier d'un joueur
     */
    public RtaTierInfoDTO getTierInfo(int currentPoints, String currentTierName) {
        RtaTier currentTier = getTierByName(currentTierName);
        RtaTier nextTier = getNextTier(currentTier);
        
        if (nextTier == null) {
            // Joueur au tier maximum
            return new RtaTierInfoDTO(
                    currentTier.getDisplayName(),
                    currentPoints,
                    null,
                    0,
                    0,
                    100.0,
                    true
            );
        }
        
        int pointsToNextTier = nextTier.getMinPoints() - currentPoints;
        double progress = RtaTierInfoDTO.calculateProgress(
                currentPoints, 
                currentTier.getMinPoints(), 
                nextTier.getMinPoints()
        );
        
        return new RtaTierInfoDTO(
                currentTier.getDisplayName(),
                currentPoints,
                nextTier.getDisplayName(),
                Math.max(0, pointsToNextTier),
                nextTier.getMinPoints(),
                progress,
                false
        );
    }
    
    /**
     * Récupère la position d'un utilisateur dans le classement global
     */
    public int getUserPosition(int rtaPoints) {
        return userRepository.countUsersWithHigherRtaPoints(rtaPoints) + 1;
    }
    
    /**
     * Trouve un tier par son nom
     */
    private RtaTier getTierByName(String tierName) {
        for (RtaTier tier : RtaTier.values()) {
            if (tier.getDisplayName().equals(tierName)) {
                return tier;
            }
        }
        return RtaTier.BRONZE; // fallback
    }
    
    /**
     * Retourne le tier suivant ou null si c'est le maximum
     */
    private RtaTier getNextTier(RtaTier currentTier) {
        RtaTier[] tiers = RtaTier.values();
        for (int i = 0; i < tiers.length - 1; i++) {
            if (tiers[i] == currentTier) {
                return tiers[i + 1];
            }
        }
        return null; // tier maximum atteint
    }
}
