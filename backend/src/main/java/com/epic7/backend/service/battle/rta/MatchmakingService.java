package com.epic7.backend.service.battle.rta;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.User;
import com.epic7.backend.service.battle.manager.BattleManager;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    private final BattleManager battleManager;
    
    // Structure pour stocker les joueurs en attente
    private final Map<String, QueueEntry> queue = new ConcurrentHashMap<>();
    
    /**
     * Réponse d'un match trouvé
     */
    @Data
    public static class MatchResponse {
        private final User opponent;
        private final String battleId;
    }
    
    /**
     * Entrée dans la file d'attente
     */
    @Data
    private static class QueueEntry {
        private final User user;
        private final List<Long> heroIds;
        private final long timestamp = System.currentTimeMillis();
    }
    
    /**
     * Rejoindre la file d'attente
     * @param user L'utilisateur qui recherche un match
     * @param heroIds Les IDs des héros sélectionnés (2)
     * @return null si en attente, ou MatchResponse si un adversaire est trouvé
     */
    public synchronized MatchResponse join(User user, List<Long> heroIds) {
        String userId = user.getId().toString();
        
        // Vérifier que le nombre de héros est correct
        if (heroIds.size() != 2) {
            throw new IllegalArgumentException("Le joueur doit sélectionner exactement 2 héros.");
        }
        
        // Si déjà dans la file, actualiser la sélection
        if (queue.containsKey(userId)) {
            queue.put(userId, new QueueEntry(user, heroIds));
            return null;
        }
        
        // Rechercher un adversaire
        Optional<Map.Entry<String, QueueEntry>> match = findMatch(userId);
        
        if (match.isPresent()) {
            // Adversaire trouvé
            String opponentId = match.get().getKey();
            QueueEntry opponent = match.get().getValue();
            
            // Retirer les deux joueurs de la file
            queue.remove(opponentId);
            
            // Générer un ID de bataille
            String battleId = UUID.randomUUID().toString();
            
            // Démarrer la bataille
            battleManager.startRtaBattle(
                battleId,
                user, opponent.getUser(),
                heroIds, opponent.getHeroIds()
            );
            
            log.info("Match trouvé: {} vs {}", user.getUsername(), opponent.getUser().getUsername());
            
            return new MatchResponse(opponent.getUser(), battleId);
        } else {
            // Pas d'adversaire, mettre en file d'attente
            queue.put(userId, new QueueEntry(user, heroIds));
            log.info("Joueur {} mis en file d'attente", user.getUsername());
            return null;
        }
    }
    
    /**
     * Quitter la file d'attente
     */
    public void leave(User user) {
        String userId = user.getId().toString();
        if (queue.remove(userId) != null) {
            log.info("Joueur {} retiré de la file", user.getUsername());
        }
    }
    
    /**
     * Recherche un adversaire disponible
     */
    private Optional<Map.Entry<String, QueueEntry>> findMatch(String userId) {
        return queue.entrySet().stream()
            .filter(entry -> !entry.getKey().equals(userId))
            .findFirst();
    }
    
    /**
     * Obtenir le nombre de joueurs en file d'attente
     */
    public int getQueueSize() {
        return queue.size();
    }
    
    /**
     * Nettoyer les entrées trop anciennes (plus de 5 minutes)
     */
    public void cleanupQueue() {
        long now = System.currentTimeMillis();
        long timeout = 5 * 60 * 1000; // 5 minutes
        
        queue.entrySet().removeIf(entry -> 
            (now - entry.getValue().getTimestamp()) > timeout);
    }
}
