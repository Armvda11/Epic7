package com.epic7.backend.dto.rta;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO pour représenter une entrée du leaderboard RTA
 * @author hermas
 */
@Data
@AllArgsConstructor
public class RtaRankingDTO {
    private Long userId;
    private String username;
    private int rtaPoints;
    private String rtaTier;
    private int winNumber;
    private int loseNumber;
    private int position;
    
    /**
     * Calcule le taux de victoire
     * @return taux de victoire en pourcentage
     */
    public double getWinRate() {
        int totalGames = winNumber + loseNumber;
        if (totalGames == 0) return 0.0;
        return ((double) winNumber / totalGames) * 100;
    }
}
