package com.epic7.backend.dto.rta;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO pour représenter les informations détaillées sur un tier RTA
 * @author hermas
 */
@Data
@AllArgsConstructor
public class RtaTierInfoDTO {
    private String currentTier;
    private int currentPoints;
    private String nextTier;
    private int pointsToNextTier;
    private int pointsRequiredForNextTier;
    private double progressToNextTier; // pourcentage de progression vers le tier suivant
    private boolean isMaxTier; // true si l'utilisateur est au tier maximum (Legend)
    
    /**
     * Calcule le pourcentage de progression vers le tier suivant
     * @param currentPoints points actuels
     * @param currentTierMinPoints points minimum du tier actuel
     * @param nextTierMinPoints points minimum du tier suivant
     * @return pourcentage de progression (0-100)
     */
    public static double calculateProgress(int currentPoints, int currentTierMinPoints, int nextTierMinPoints) {
        if (nextTierMinPoints <= currentTierMinPoints) return 100.0;
        
        int pointsInCurrentTier = currentPoints - currentTierMinPoints;
        int pointsNeededForNextTier = nextTierMinPoints - currentTierMinPoints;
        
        return Math.min(100.0, Math.max(0.0, (double) pointsInCurrentTier / pointsNeededForNextTier * 100));
    }
}
