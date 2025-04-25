package com.epic7.backend.service.battle.rta;

import java.util.Iterator;
import java.util.List;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.User;
import com.epic7.backend.service.battle.manager.BattleManager;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service de matchmaking RTA simple :
 * - file d'attente sans contrainte,
 * - lancement direct du combat dès que deux joueurs sont disponibles.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MatchmakingService {
    private final BattleManager battleManager;
    private final Queue<MatchRequest> queue = new ConcurrentLinkedQueue<>();

    /**
     * Le joueur rejoint la file avec ses 4 héros.
     * Si un adversaire est trouvé, le combat démarre et on renvoie les infos.
     * Sinon, le joueur est mis en attente (retourne null).
     */
    public synchronized MatchResponse join(User user, List<Long> heroIds) {
        validateTeam(heroIds);

        // Retirer toute entrée précédente du même joueur
        queue.removeIf(req -> req.getUser().getId().equals(user.getId()));

        // Chercher un adversaire
        MatchRequest opponentReq = null;
        Iterator<MatchRequest> it = queue.iterator();
        while (it.hasNext()) {
            MatchRequest req = it.next();
            if (!req.getUser().getId().equals(user.getId())) {
                opponentReq = req;
                it.remove();
                break;
            }
        }

        if (opponentReq == null) {
            // Pas d'adversaire, on ajoute et on attend
            queue.offer(new MatchRequest(user, heroIds));
            log.info("Utilisateur {} ajouté à la queue RTA", user.getUsername());
            return null;
        }

        // Adversaire trouvé → démarrage du combat
        String battleId = UUID.randomUUID().toString();
        battleManager.startRtaBattle(
            battleId,
            user, opponentReq.getUser(),
            heroIds, opponentReq.getHeroIds()
        );
        log.info("Combat RTA {} lancé : {} vs {}", battleId,
                 user.getUsername(), opponentReq.getUser().getUsername());

        return new MatchResponse(
            battleId,
            opponentReq.getUser(),
            opponentReq.getHeroIds()
        );
    }

    /** Annule la recherche de match du joueur s’il était en file. */
    public synchronized void leave(User user) {
        boolean removed = queue.removeIf(req -> req.getUser().getId().equals(user.getId()));
        if (removed) log.info("Utilisateur {} retiré de la queue RTA", user.getUsername());
    }

    /**  
     * Validation minimale de l’équipe : exactement 4 IDs, tous distincts.  
     */
    private void validateTeam(List<Long> heroIds) {
        if (heroIds == null || heroIds.size() != 4) {
            throw new IllegalArgumentException("L'équipe doit contenir exactement 4 héros");
        }
        long distinct = heroIds.stream().distinct().count();
        if (distinct != 4) {
            throw new IllegalArgumentException("L'équipe ne peut pas contenir de doublons");
        }
    }

    /** Requête de file d'attente */
    @Data
    private static class MatchRequest {
        private final User user;
        private final List<Long> heroIds;
    }

    /** Résultat de matchmaking */
    @Data
    public static class MatchResponse {
        private final String battleId;
        private final User opponent;
        private final List<Long> opponentHeroIds;
    }
}
