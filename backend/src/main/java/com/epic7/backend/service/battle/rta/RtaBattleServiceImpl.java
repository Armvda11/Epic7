package com.epic7.backend.service.battle.rta;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.service.battle.engine.BattleEngine;
import com.epic7.backend.service.battle.engine.ParticipantFactory;
import com.epic7.backend.service.battle.engine.SkillEngine;
import com.epic7.backend.service.battle.manager.BattleManager;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import com.epic7.backend.service.rta.RtaRankingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RtaBattleServiceImpl implements BattleManager {
    private final ParticipantFactory participantFactory;
    private final BattleEngine battleEngine;
    private final SkillEngine skillEngine;
    private final PlayerHeroRepository playerHeroRepo;
    private final UserRepository userRepository;
    private final RtaRankingService rtaRankingService;

    // Stockage en mémoire des sessions actives
    private final Map<String, BattleState> activeBattles = new ConcurrentHashMap<>();

    @Override
    public boolean startRtaBattle(String battleId,
                                  User player1, User player2,
                                  List<Long> player1HeroIds,
                                  List<Long> player2HeroIds) {
        // CORRECTION: Nettoyer toute session existante pour cette bataille
        if (activeBattles.containsKey(battleId)) {
            log.info("Nettoyage d'une ancienne session pour battleId: {}", battleId);
            activeBattles.remove(battleId);
        }
        
        // Nettoyer également les anciennes sessions (plus de 30 minutes)
        cleanupOldBattles();

        // Construire les participants
        List<BattleParticipant> participants = new ArrayList<>();
        
        // Ajouter les héros du joueur 1 avec son ID
        String player1Id = player1.getId().toString();
        for (Long id : player1HeroIds) {
            PlayerHero ph = playerHeroRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            BattleParticipant participant = participantFactory.fromPlayerHeroWithUserId(ph, player1Id);
            participants.add(participant);
        }
        
        // Ajouter les héros du joueur 2 avec son ID
        String player2Id = player2.getId().toString();
        for (Long id : player2HeroIds) {
            PlayerHero ph = playerHeroRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            BattleParticipant participant = participantFactory.fromPlayerHeroWithUserId(ph, player2Id);
            participants.add(participant);
        }

        // Ordonner par vitesse et initialiser l'état
        battleEngine.sortParticipantsBySpeed(participants);
        BattleState state = new BattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setRoundCount(1);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("⚔️ Combat RTA démarré !")));
        
        // Stockage explicite des IDs des joueurs pour faciliter les vérifications côté client
        state.setPlayer1Id(player1Id);
        state.setPlayer2Id(player2Id);
        
        // Ajouter les noms des joueurs pour l'affichage
        state.setPlayer1Name(player1.getUsername());
        state.setPlayer2Name(player2.getUsername());

        // Avancer jusqu'au premier tour joueur
        state = battleEngine.processUntilNextPlayer(state);

        // Stocker la session
        activeBattles.put(battleId, state);
        return true;
    }

    @Override
    public boolean applySkillAction(String battleId, Long skillId, Long targetId) {
        if (battleId == null || skillId == null || targetId == null) {
            throw new IllegalArgumentException("Paramètres invalides pour applySkillAction: " +
                "battleId=" + battleId + ", skillId=" + skillId + ", targetId=" + targetId);
        }
        
        BattleState state = getBattleState(battleId);
        if (state == null) {
            throw new IllegalStateException("Bataille introuvable: " + battleId);
        }
        
        // Vérifier si l'index de tour est valide et le corriger si besoin
        if (state.getCurrentTurnIndex() < 0 || state.getCurrentTurnIndex() >= state.getParticipants().size()) {
            state.getLogs().add("⚠️ Index de tour invalide: " + state.getCurrentTurnIndex() + ", correction...");
            
            // Trouver le premier héros vivant pour corriger l'index
            for (int i = 0; i < state.getParticipants().size(); i++) {
                if (state.getParticipants().get(i).getCurrentHp() > 0) {
                    state.setCurrentTurnIndex(i);
                    break;
                }
            }
            
            if (state.getCurrentTurnIndex() < 0 || state.getCurrentTurnIndex() >= state.getParticipants().size()) {
                state.getLogs().add("❌ Impossible de trouver un héros vivant pour corriger l'index.");
                return false;
            }
        }
        
        BattleParticipant currentParticipant = state.getParticipants().get(state.getCurrentTurnIndex());
        
        // Logging amélioré pour le débogage
        state.getLogs().add("ℹ️ Tentative d'utilisation de compétence " + skillId + " par " + 
            currentParticipant.getName() + " (ID: " + currentParticipant.getId() + ", userId: " + 
            currentParticipant.getUserId() + ") sur cible " + targetId);
        
        try {
            // Vérification plus robuste que la cible est valide
            BattleParticipant targetParticipant = null;
            
            for (BattleParticipant p : state.getParticipants()) {
                if (p != null && p.getId() != null && p.getId().equals(targetId)) {
                    targetParticipant = p;
                    break;
                }
            }
            
            if (targetParticipant == null) {
                state.getLogs().add("❌ Cible invalide: " + targetId);
                return false;
            }
            
            // Utiliser la compétence et obtenir le résultat
            skillEngine.useSkillWithResult(state, skillId, targetId);
            state.getLogs().add("✅ Compétence " + skillId + " utilisée avec succès");
        } catch (Exception e) {
            state.getLogs().add("❌ Erreur lors de l'utilisation de la compétence: " + e.getMessage());
            return false;
        }
        
        // Vérifier si combat terminé en utilisant la logique spécifique aux combats RTA
        if (checkBattleEnd(state)) {
            state.getLogs().add("⚔️ Combat RTA terminé !");
            state.setFinished(true);
            return true;
        }
        
        // Passer au joueur suivant avec une vérification
        try {
            battleEngine.nextTurn(state);
            
            // Vérification supplémentaire après le changement de tour
            int newIndex = state.getCurrentTurnIndex();
            if (newIndex < 0 || newIndex >= state.getParticipants().size()) {
                state.getLogs().add("⚠️ L'index après nextTurn est invalide: " + newIndex + ", correction...");
                state.setCurrentTurnIndex(0); // Reset à 0 par sécurité
            } else {
                BattleParticipant nextParticipant = state.getParticipants().get(newIndex);
                if (nextParticipant.getCurrentHp() <= 0) {
                    state.getLogs().add("⚠️ Le prochain participant est mort, nouvelle tentative...");
                    battleEngine.nextTurn(state); // Essayer encore une fois
                }
            }
        } catch (Exception e) {
            state.getLogs().add("⚠️ Erreur lors du changement de tour: " + e.getMessage());
            // Ne pas échouer complètement, essayer de continuer
        }
        
        return true;
    }
    
    /**
     * Vérifie si un des deux joueurs a gagné dans le mode RTA (tous les héros de l'autre sont morts)
     * @param state L'état actuel du combat
     * @return true si un joueur a gagné, false sinon
     */
    private boolean checkBattleEnd(BattleState state) {
        // Récupérer tous les userId uniques des participants
        Set<String> userIds = state.getParticipants().stream()
            .map(BattleParticipant::getUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        
        if (userIds.size() != 2) {
            // Cas anormal: il devrait y avoir exactement 2 joueurs
            state.getLogs().add("⚠️ Nombre incorrect de joueurs dans la partie RTA: " + userIds.size());
            return false;
        }
        
        // Pour chaque joueur, vérifier s'il a encore des héros vivants
        Map<String, Boolean> playerAliveStatus = new HashMap<>();
        Map<String, String> playerNames = new HashMap<>();
        
        for (String userId : userIds) {
            // Vérifier si le joueur a encore des héros vivants
            boolean isAlive = state.getParticipants().stream()
                .filter(p -> userId.equals(p.getUserId()))
                .anyMatch(p -> p.getCurrentHp() > 0);
            
            playerAliveStatus.put(userId, isAlive);
            
            // Récupérer le nom d'un des héros pour afficher un nom à la place de l'ID
            String playerName = state.getParticipants().stream()
                .filter(p -> userId.equals(p.getUserId()))
                .map(BattleParticipant::getName)
                .findFirst()
                .orElse("Joueur " + userId);
                
            playerNames.put(userId, playerName);
        }
        
        // Vérifier si un des joueurs n'a plus de héros vivants
        if (playerAliveStatus.containsValue(false)) {
            // Trouver le gagnant - utiliser une variable finale
            final String winnerIdFinal = findWinnerId(playerAliveStatus);
            
            // Ajouter le résultat aux logs avec un meilleur message
            if (winnerIdFinal != null) {
                String winnerName = playerNames.get(winnerIdFinal);
                state.getLogs().add("🏆 " + winnerName + " remporte la victoire!");
                
                // CORRECTION: Attribution des récompenses au gagnant
                giveVictoryReward(winnerIdFinal, winnerName, state);
            } else {
                state.getLogs().add("⚠️ Match nul! Tous les héros sont morts.");
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Trouve l'ID du gagnant parmi les statuts des joueurs
     */
    private String findWinnerId(Map<String, Boolean> playerAliveStatus) {
        for (Map.Entry<String, Boolean> entry : playerAliveStatus.entrySet()) {
            if (entry.getValue()) { // Ce joueur est vivant
                return entry.getKey();
            }
        }
        return null;
    }
    
    /**
     * Trouve l'ID du perdant dans un combat RTA
     */
    private String findLoserId(BattleState state, String winnerId) {
        // Récupérer tous les userId uniques des participants
        Set<String> userIds = state.getParticipants().stream()
            .map(BattleParticipant::getUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        
        // Le perdant est l'autre joueur (pas le gagnant)
        for (String userId : userIds) {
            if (!userId.equals(winnerId)) {
                return userId;
            }
        }
        
        return null;
    }
    
    /**
     * Attribue les récompenses de victoire au gagnant et met à jour les points RTA
     */
    private void giveVictoryReward(String winnerId, String winnerName, BattleState state) {
        try {
            User winner = userRepository.findById(Long.valueOf(winnerId))
                .orElseThrow(() -> new IllegalArgumentException("Joueur introuvable : " + winnerId));
            
            // Trouver l'adversaire pour calculer la différence de points
            String loserId = findLoserId(state, winnerId);
            User loser = null;
            
            if (loserId != null) {
                loser = userRepository.findById(Long.valueOf(loserId))
                    .orElse(null);
            }
            
            // Calcul des points RTA
            if (loser != null) {
                // Calculer les changements de points RTA
                int winnerPointsChange = rtaRankingService.calculatePointsChange(true, winner.getRtaPoints(), loser.getRtaPoints());
                int loserPointsChange = rtaRankingService.calculatePointsChange(false, loser.getRtaPoints(), winner.getRtaPoints());
                
                // Mettre à jour les points et tiers
                int newWinnerPoints = rtaRankingService.clampPoints(winner.getRtaPoints() + winnerPointsChange);
                int newLoserPoints = rtaRankingService.clampPoints(loser.getRtaPoints() + loserPointsChange);
                
                winner.setRtaPoints(newWinnerPoints);
                winner.setRtaTier(rtaRankingService.calculateTier(newWinnerPoints));
                
                loser.setRtaPoints(newLoserPoints);
                loser.setRtaTier(rtaRankingService.calculateTier(newLoserPoints));
                
                // Incrémenter les statistiques de combat
                winner.setWinNumber(winner.getWinNumber() + 1);
                loser.setLoseNumber(loser.getLoseNumber() + 1);
                
                userRepository.save(winner);
                userRepository.save(loser);
                
                // Messages de log pour les points RTA
                state.getLogs().add("🏆 " + winnerName + " gagne " + winnerPointsChange + " points RTA (" + newWinnerPoints + " total)");
                state.getLogs().add("📉 " + loser.getUsername() + " perd " + Math.abs(loserPointsChange) + " points RTA (" + newLoserPoints + " total)");
                
                // Vérifier si changement de tier
                if (!winner.getRtaTier().equals(rtaRankingService.calculateTier(winner.getRtaPoints() - winnerPointsChange))) {
                    state.getLogs().add("🎖️ " + winnerName + " monte en " + winner.getRtaTier() + "!");
                }
                
                log.info("Points RTA mis à jour - Gagnant: {} (+{} -> {}), Perdant: {} ({} -> {})", 
                         winner.getUsername(), winnerPointsChange, newWinnerPoints,
                         loser.getUsername(), loserPointsChange, newLoserPoints);
            }
            
            // Récompense : 100 diamants au gagnant (configurable)
            int rewardDiamonds = 100;
            winner.setDiamonds(winner.getDiamonds() + rewardDiamonds);
            userRepository.save(winner);
            
            state.getLogs().add("💎 " + winnerName + " reçoit " + rewardDiamonds + " diamants en récompense!");
            log.info("Récompense attribuée : {} diamants à l'utilisateur {} (ID: {})", 
                     rewardDiamonds, winner.getUsername(), winnerId);
        } catch (Exception e) {
            state.getLogs().add("⚠️ Erreur lors de l'attribution de la récompense: " + e.getMessage());
            log.error("Erreur lors de l'attribution de la récompense pour le joueur {}: {}", winnerId, e.getMessage());
        }
    }
    
    /**
     * Nettoie les anciennes sessions pour éviter les fuites mémoire
     */
    private void cleanupOldBattles() {
        // Pour l'instant, simple nettoyage basé sur la taille
        // Dans une vraie implémentation, on utiliserait un timestamp
        if (activeBattles.size() > 50) {
            log.info("Nettoyage de {} anciennes sessions de combat", activeBattles.size());
            activeBattles.clear();
        }
    }

    @Override
    public void endRtaBattle(String battleId, Long winnerId) {
        // CORRECTION: Supprimer immédiatement la bataille terminée
        BattleState state = activeBattles.remove(battleId);
        if (state != null) {
            log.info("Combat terminé pour battleId: {}, session supprimée immédiatement", battleId);
        } else {
            log.warn("Tentative de fin de combat pour une session inexistante: {}", battleId);
        }
    }

    @Override
    public BattleState getBattleState(String battleId) {
        BattleState state = activeBattles.get(battleId);
        if (state == null) {
            throw new IllegalStateException("Session introuvable : " + battleId);
        }
        return state;
    }
}
