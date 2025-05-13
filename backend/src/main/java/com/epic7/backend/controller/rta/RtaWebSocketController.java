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
            
            // Envoyer immédiatement l'état initial à tous les abonnés
            messaging.convertAndSend(
                "/topic/rta/state/" + battleId,
                state
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
        log.info("Action reçue de {} pour bataille {}: compétence {} sur cible {}", 
                principal.getName(), battleId, msg.getSkillId(), msg.getTargetId());

        try {
            // 1) Appliquer la compétence
            battleManager.applySkillAction(battleId, msg.getSkillId(), msg.getTargetId());

            // 2) Récupérer l'état à jour
            BattleState state = (BattleState) battleManager.getBattleState(battleId);

            // 3) Diffuser l'état à tous les clients abonnés
            messaging.convertAndSend(
                "/topic/rta/state/" + battleId,
                state
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
        
        // Si en combat, terminer le combat
        try {
            BattleState state = (BattleState) battleManager.getBattleState(battleId);
            state.setFinished(true);
            state.getLogs().add(user.getUsername() + " a abandonné le combat.");
            
            // Notifier l'autre joueur de l'abandon
            messaging.convertAndSend(
                "/topic/rta/end/" + battleId,
                state
            );
            
            // Terminer la session
            battleManager.endRtaBattle(battleId, null);
        } catch (IllegalStateException e) {
            // Combat déjà terminé ou inexistant, rien à faire
        }
    }
}
