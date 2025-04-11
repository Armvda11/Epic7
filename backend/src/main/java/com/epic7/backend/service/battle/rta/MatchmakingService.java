package com.epic7.backend.service.battle.rta;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.User;

import lombok.extern.slf4j.Slf4j;

/**
 * Service de matchmaking pour trouver des adversaires pour les joueurs.
 * Il utilise une queue pour gérer les joueurs en attente de matchmaking.
 * Lorsqu'un joueur se connecte, il est ajouté à la queue.
 * Si un autre joueur est déjà dans la queue, il est associé à ce joueur.
 * Sinon, le joueur reste en attente dans la queue.
 * @author hermas
 */
@Service
@Slf4j
public class MatchmakingService {

    // une queue pour le matchmaking
    private final Queue<User> matchmakingQueue = new ConcurrentLinkedQueue<>();

    // ajouter un joueur à la queue et retourner un adversaire si disponible
    public synchronized User findOppoentOrWait(User joueur){

        // si la queue est vide, on ajoute le joueur et on attend
        if (matchmakingQueue.isEmpty()) {
            matchmakingQueue.offer(joueur);
            log.info("Joueur {} ajouté à la queue de matchmaking", joueur.getUsername());
            return null;
        }
        // sinon, on retire le premier joueur de la queue et on lui retourne l'adversaire
        User opponent = matchmakingQueue.poll();
        log.info("Joueur {} trouvé pour le joueur {}", opponent.getUsername(), joueur.getUsername());
        // on retire le joueur de la queue
        return opponent;

    }

    // retirer un joueur de la queue
    public synchronized void removeFromQueue(User joueur) {
        matchmakingQueue.remove(joueur);
        log.info("Joueur {} retiré de la queue de matchmaking", joueur.getUsername());
    }

    
}
