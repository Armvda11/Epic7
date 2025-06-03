package com.epic7.backend.controller.rta;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.epic7.backend.dto.rta.JoinMatchMessage;
import com.epic7.backend.dto.rta.SkillActionMessage;
import com.epic7.backend.model.User;
import com.epic7.backend.service.battle.manager.BattleManager;
import com.epic7.backend.service.battle.rta.MatchmakingService;
import com.epic7.backend.service.battle.rta.MatchmakingService.MatchResponse;

import com.epic7.backend.service.battle.state.BattleState;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@RequiredArgsConstructor
@Slf4j
public class RtaWebSocketController {
    private final MatchmakingService matchmakingService;
    private final BattleManager battleManager;
    private final SimpMessagingTemplate messaging;
    private final UserRepository userRepository;

    /**
     * Reçoit la demande de match (4 heroIds).  
     * Répond :
     * - "/user/queue/rta/match" → "waiting" ou battleId
     * - si match, les deux joueurs reçoivent battleId
     */
    @MessageMapping("/rta/join")
    public void join(JoinMatchMessage msg, Principal principal) {
        // 1) Récupérer l'utilisateur courant
        User user = userRepository.findByEmail(principal.getName())
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + principal.getName()));

        log.info("Demande de matchmaking pour l'utilisateur {} avec {} héros", user.getUsername(), msg.getHeroIds().size());

        // 2) Appeler le matchmaking
        MatchResponse resp = matchmakingService.join(user, msg.getHeroIds());

        if (resp == null) {
            // pas encore d'adversaire
            log.info("Utilisateur {} mis en file d'attente", user.getUsername());
            messaging.convertAndSendToUser(
                user.getEmail(), // Utiliser l'email au lieu du nom d'utilisateur
                "/queue/rta/match",
                "waiting"
            );
        } else {
            String battleId = resp.getBattleId();
            log.info("Match trouvé pour {} contre {} - battleId: {}", 
                    user.getUsername(), resp.getOpponent().getUsername(), battleId);
            
            // informer le demandeur
            messaging.convertAndSendToUser(
                user.getEmail(), // Utiliser l'email au lieu du nom d'utilisateur
                "/queue/rta/match",
                battleId
            );
            // informer l'adversaire
            messaging.convertAndSendToUser(
                resp.getOpponent().getEmail(), // Utiliser l'email au lieu du nom d'utilisateur
                "/queue/rta/match",
                battleId
            );
            
            // Étape importante: envoyer l'état initial de la bataille aux deux joueurs
            // Récupérer l'état actuel de la bataille
            BattleState state = (BattleState) battleManager.getBattleState(battleId);
            
            // Créer une copie personnalisée pour chaque joueur
            BattleState player1State = new BattleState();
            BattleState player2State = new BattleState();
            
            // Copier les propriétés importantes
            player1State.setParticipants(state.getParticipants());
            player1State.setCurrentTurnIndex(state.getCurrentTurnIndex());
            player1State.setRoundCount(state.getRoundCount());
            player1State.setFinished(state.isFinished());
            player1State.setLogs(state.getLogs());
            player1State.setCooldowns(state.getCooldowns());
            player1State.setPlayer1Id(state.getPlayer1Id());
            player1State.setPlayer2Id(state.getPlayer2Id());
            player1State.setPlayer1Name(state.getPlayer1Name());
            player1State.setPlayer2Name(state.getPlayer2Name());
            player1State.setCurrentUserId(state.getPlayer1Id()); // Indiquer que c'est le joueur 1
            
            // Copie pour le joueur 2
            player2State.setParticipants(state.getParticipants());
            player2State.setCurrentTurnIndex(state.getCurrentTurnIndex());
            player2State.setRoundCount(state.getRoundCount());
            player2State.setFinished(state.isFinished());
            player2State.setLogs(state.getLogs());
            player2State.setCooldowns(state.getCooldowns());
            player2State.setPlayer1Id(state.getPlayer1Id());
            player2State.setPlayer2Id(state.getPlayer2Id());
            player2State.setPlayer1Name(state.getPlayer1Name());
            player2State.setPlayer2Name(state.getPlayer2Name());
            player2State.setCurrentUserId(state.getPlayer2Id()); // Indiquer que c'est le joueur 2
            
            // Envoyer l'état personnalisé à chaque joueur
            messaging.convertAndSendToUser(
                user.getEmail(),
                "/queue/rta/state/" + battleId,
                player1State
            );
            
            messaging.convertAndSendToUser(
                resp.getOpponent().getEmail(),
                "/queue/rta/state/" + battleId,
                player2State
            );
            
            // Envoyer également le tour du premier joueur
            String nextHeroName = state
                .getParticipants()
                .get(state.getCurrentTurnIndex())
                .getName();
            log.info("Premier tour dans combat {}: {}", battleId, nextHeroName);
            messaging.convertAndSend(
                "/topic/rta/turn/" + battleId,
                nextHeroName
            );
        }
    }

    /**
     * Reçoit une action (skillId + targetId + battleId).  
     * Applique l'action, puis :
     * - "/topic/rta/state/{battleId}" → envoi du BattleState à tous  
     * - "/topic/rta/turn/{battleId}" → notification du prochain joueur  
     * - si fini → "/topic/rta/end/{battleId}"
     */
    @MessageMapping("/rta/action")
    public void action(SkillActionMessage msg, Principal principal) {
        String battleId = msg.getBattleId();
        Long skillId = msg.getSkillId();
        Long targetId = msg.getTargetId();
        
        // Amélioration des logs pour un meilleur débogage
        log.info("Action reçue de {} pour bataille {}: compétence {} (type: {}) sur cible {} (type: {})", 
                principal.getName(), battleId, skillId, skillId != null ? skillId.getClass().getSimpleName() : "null", 
                targetId, targetId != null ? targetId.getClass().getSimpleName() : "null");
                
        // Validation des paramètres
        if (battleId == null || skillId == null || targetId == null) {
            log.error("Paramètres invalides pour l'action: battleId={}, skillId={}, targetId={}", 
                    battleId, skillId, targetId);
            return;
        }

        try {
            // 1) Appliquer la compétence
            battleManager.applySkillAction(battleId, skillId, targetId);
            log.info("Compétence appliquée avec succès");

            // 2) Récupérer l'état à jour
            BattleState state = (BattleState) battleManager.getBattleState(battleId);

            // 3) Créer des états personnalisés pour chaque joueur
            BattleState player1State = new BattleState();
            BattleState player2State = new BattleState();
            
            // Copier les propriétés importantes
            player1State.setParticipants(state.getParticipants());
            player1State.setCurrentTurnIndex(state.getCurrentTurnIndex());
            player1State.setRoundCount(state.getRoundCount());
            player1State.setFinished(state.isFinished());
            player1State.setLogs(state.getLogs());
            player1State.setCooldowns(state.getCooldowns());
            player1State.setPlayer1Id(state.getPlayer1Id());
            player1State.setPlayer2Id(state.getPlayer2Id());
            player1State.setPlayer1Name(state.getPlayer1Name());
            player1State.setPlayer2Name(state.getPlayer2Name());
            player1State.setCurrentUserId(state.getPlayer1Id());
            
            player2State.setParticipants(state.getParticipants());
            player2State.setCurrentTurnIndex(state.getCurrentTurnIndex());
            player2State.setRoundCount(state.getRoundCount());
            player2State.setFinished(state.isFinished());
            player2State.setLogs(state.getLogs());
            player2State.setCooldowns(state.getCooldowns());
            player2State.setPlayer1Id(state.getPlayer1Id());
            player2State.setPlayer2Id(state.getPlayer2Id());
            player2State.setPlayer1Name(state.getPlayer1Name());
            player2State.setPlayer2Name(state.getPlayer2Name());
            player2State.setCurrentUserId(state.getPlayer2Id());
            
            // Envoyer l'état personnalisé à chaque joueur
            User player1 = userRepository.findById(Long.parseLong(state.getPlayer1Id()))
                .orElseThrow(() -> new RuntimeException("Joueur 1 non trouvé"));
                
            User player2 = userRepository.findById(Long.parseLong(state.getPlayer2Id()))
                .orElseThrow(() -> new RuntimeException("Joueur 2 non trouvé"));
                
            messaging.convertAndSendToUser(
                player1.getEmail(),
                "/queue/rta/state/" + battleId,
                player1State
            );
            
            messaging.convertAndSendToUser(
                player2.getEmail(),
                "/queue/rta/state/" + battleId,
                player2State
            );

            if (state.isFinished()) {
                // 4a) Fin de combat
                log.info("Combat {} terminé", battleId);
                messaging.convertAndSend(
                    "/topic/rta/end/" + battleId,
                    state
                );
                battleManager.endRtaBattle(battleId, null);
            } else {
                // 4b) Tour suivant
                String nextHeroName = state
                    .getParticipants()
                    .get(state.getCurrentTurnIndex())
                    .getName();
                log.info("Tour suivant dans combat {}: {}", battleId, nextHeroName);
                messaging.convertAndSend(
                    "/topic/rta/turn/" + battleId,
                    nextHeroName
                );
            }
        } catch (Exception e) {
            log.error("Erreur lors du traitement de l'action", e);
            messaging.convertAndSendToUser(
                principal.getName(), // Ici c'est déjà l'email via Principal
                "/queue/rta/error",
                e.getMessage()
            );
        }
    }
    
    /**
     * Gère le départ d'un joueur (abandon)
     */
    @MessageMapping("/rta/leave")
    public void leave(String battleId, Principal principal) {
        User user = userRepository.findByEmail(principal.getName())
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
        log.info("Abandon du combat {} par {}", battleId, user.getUsername());
        
        // Si en recherche de match, retirer de la file
        matchmakingService.leave(user);
        
        // Si en combat, terminer le combat avec abandon
        try {
            BattleState state = (BattleState) battleManager.getBattleState(battleId);
            state.setFinished(true);
            state.getLogs().add(user.getUsername() + " a abandonné le combat.");
            
            // Déterminer le gagnant (l'autre joueur)
            String abandonningUserId = user.getId().toString();
            String winnerId = null;
            String winnerName = "Adversaire";
            
            if (state.getPlayer1Id().equals(abandonningUserId)) {
                winnerId = state.getPlayer2Id();
                winnerName = state.getPlayer2Name() != null ? state.getPlayer2Name() : "Joueur 2";
            } else if (state.getPlayer2Id().equals(abandonningUserId)) {
                winnerId = state.getPlayer1Id();
                winnerName = state.getPlayer1Name() != null ? state.getPlayer1Name() : "Joueur 1";
            }
            
            // Ajouter le message de victoire dans les logs
            state.getLogs().add("🏆 " + winnerName + " remporte la victoire par abandon!");
            
            // Créer des états personnalisés pour chaque joueur
            BattleState abandonerState = new BattleState();
            BattleState winnerState = new BattleState();
            
            // Copier l'état de base
            abandonerState.setParticipants(state.getParticipants());
            abandonerState.setCurrentTurnIndex(state.getCurrentTurnIndex());
            abandonerState.setRoundCount(state.getRoundCount());
            abandonerState.setFinished(true);
            abandonerState.setLogs(state.getLogs());
            abandonerState.setCooldowns(state.getCooldowns());
            abandonerState.setPlayer1Id(state.getPlayer1Id());
            abandonerState.setPlayer2Id(state.getPlayer2Id());
            abandonerState.setPlayer1Name(state.getPlayer1Name());
            abandonerState.setPlayer2Name(state.getPlayer2Name());
            abandonerState.setCurrentUserId(abandonningUserId);
            
            winnerState.setParticipants(state.getParticipants());
            winnerState.setCurrentTurnIndex(state.getCurrentTurnIndex());
            winnerState.setRoundCount(state.getRoundCount());
            winnerState.setFinished(true);
            winnerState.setLogs(state.getLogs());
            winnerState.setCooldowns(state.getCooldowns());
            winnerState.setPlayer1Id(state.getPlayer1Id());
            winnerState.setPlayer2Id(state.getPlayer2Id());
            winnerState.setPlayer1Name(state.getPlayer1Name());
            winnerState.setPlayer2Name(state.getPlayer2Name());
            winnerState.setCurrentUserId(winnerId);
            
            // Envoyer les états personnalisés à chaque joueur
            User player1 = userRepository.findById(Long.parseLong(state.getPlayer1Id()))
                .orElseThrow(() -> new RuntimeException("Joueur 1 non trouvé"));
            User player2 = userRepository.findById(Long.parseLong(state.getPlayer2Id()))
                .orElseThrow(() -> new RuntimeException("Joueur 2 non trouvé"));
            
            if (state.getPlayer1Id().equals(abandonningUserId)) {
                // Player1 abandonne, Player2 gagne
                messaging.convertAndSendToUser(
                    player1.getEmail(),
                    "/queue/rta/state/" + battleId,
                    abandonerState
                );
                messaging.convertAndSendToUser(
                    player2.getEmail(),
                    "/queue/rta/state/" + battleId,
                    winnerState
                );
            } else {
                // Player2 abandonne, Player1 gagne
                messaging.convertAndSendToUser(
                    player1.getEmail(),
                    "/queue/rta/state/" + battleId,
                    winnerState
                );
                messaging.convertAndSendToUser(
                    player2.getEmail(),
                    "/queue/rta/state/" + battleId,
                    abandonerState
                );
            }
            
            // Notifier la fin du combat
            messaging.convertAndSend(
                "/topic/rta/end/" + battleId,
                state
            );
            
            // Terminer la session
            battleManager.endRtaBattle(battleId, winnerId != null ? Long.parseLong(winnerId) : null);
        } catch (IllegalStateException e) {
            // Combat déjà terminé ou inexistant, rien à faire
            log.warn("Tentative d'abandon d'un combat inexistant: {}", battleId);
        }
    }

    /**
     * Endpoint pour les heartbeats des clients
     * Permet de maintenir la connexion WebSocket active
     */
    @MessageMapping("/rta/heartbeat")
    public void heartbeat(Principal principal) {
        // Log à un niveau debug pour ne pas surcharger les logs
        log.debug("Heartbeat reçu de {}", principal.getName());
    }
    
    /**
     * Endpoint pour vérifier l'état d'un combat
     * Permet aux clients de demander l'état actuel de la bataille
     */
    @MessageMapping("/rta/check-state")
    public void checkState(String battleId, Principal principal) {
        log.info("Vérification d'état demandée pour la bataille {} par {}", battleId, principal.getName());
        
        try {
            User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
                
            try {
                // Casting explicite à BattleState
                BattleState state = (BattleState) battleManager.getBattleState(battleId);
                
                if (state != null) {
                    // Vérification et correction de l'état si nécessaire
                    if (state.getParticipants() == null || state.getParticipants().isEmpty()) {
                        log.error("État de bataille invalide (pas de participants): {}", battleId);
                        messaging.convertAndSendToUser(
                            principal.getName(),
                            "/queue/rta/error", 
                            "État de bataille invalide"
                        );
                        return;
                    }
                    
                    // Vérifier si l'index de tour est valide
                    int participantCount = state.getParticipants().size();
                    if (state.getCurrentTurnIndex() < 0 || state.getCurrentTurnIndex() >= participantCount) {
                        log.warn("Index de tour invalide ({}), correction...", state.getCurrentTurnIndex());
                        
                        // Trouver un héros vivant pour établir un nouvel index
                        for (int i = 0; i < participantCount; i++) {
                            if (state.getParticipants().get(i).getCurrentHp() > 0) {
                                state.setCurrentTurnIndex(i);
                                log.info("Index de tour corrigé à {}", i);
                                break;
                            }
                        }
                    }
                    
                    // Ajouter userId pour personnaliser l'état
                    state.setCurrentUserId(user.getId().toString());
                    
                    // Envoyer l'état corrigé
                    messaging.convertAndSendToUser(
                        principal.getName(),
                        "/queue/rta/state", 
                        state
                    );
                    
                    log.info("État envoyé à {} pour la bataille {}", principal.getName(), battleId);
                } else {
                    log.warn("Bataille {} introuvable lors d'une vérification d'état", battleId);
                    messaging.convertAndSendToUser(
                        principal.getName(),
                        "/queue/rta/error", 
                        "Bataille introuvable"
                    );
                }
            } catch (ClassCastException e) {
                log.error("Erreur de casting de l'état de bataille: {}", e.getMessage());
                messaging.convertAndSendToUser(
                    principal.getName(),
                    "/queue/rta/error", 
                    "Erreur interne de type"
                );
            }
        } catch (Exception e) {
            log.error("Erreur lors de la vérification d'état: {}", e.getMessage(), e);
            messaging.convertAndSendToUser(
                principal.getName(),
                "/queue/rta/error", 
                "Erreur: " + e.getMessage()
            );
        }
    }
}
