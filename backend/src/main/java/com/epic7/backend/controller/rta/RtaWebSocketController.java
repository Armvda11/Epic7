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

@Controller
@RequiredArgsConstructor
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

        // 2) Appeler le matchmaking
        MatchResponse resp = matchmakingService.join(user, msg.getHeroIds());

        if (resp == null) {
            // pas encore d'adversaire
            messaging.convertAndSendToUser(
                user.getUsername(),
                "/queue/rta/match",
                "waiting"
            );
        } else {
            String battleId = resp.getBattleId();
            // informer le demandeur
            messaging.convertAndSendToUser(
                user.getUsername(),
                "/queue/rta/match",
                battleId
            );
            // informer l'adversaire
            messaging.convertAndSendToUser(
                resp.getOpponent().getUsername(),
                "/queue/rta/match",
                battleId
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
            messaging.convertAndSend(
                "/topic/rta/turn/" + battleId,
                nextHeroName
            );
        }
    }
}
