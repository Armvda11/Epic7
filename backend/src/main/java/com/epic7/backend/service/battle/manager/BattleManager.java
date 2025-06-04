package com.epic7.backend.service.battle.manager;

import java.util.List;

import com.epic7.backend.model.User;

/**
 * Interface pour la gestion des combats PvP RTA (Real-Time Arena).
 * <p>
 * Les héros sont référencés par leurs IDs pour découpler de JPA et
 * faciliter la sérialisation via WebSocket/REST.
 */
public interface BattleManager {

    /**
     * Démarre un combat RTA entre deux joueurs avec leurs sélections de héros.
     *
     * @param battleId        Identifiant unique du combat (généré par le matchmaking)
     * @param player1         Premier joueur
     * @param player2         Deuxième joueur
     * @param player1HeroIds  Liste des IDs des héros sélectionnés par le premier joueur (exactement 4)
     * @param player2HeroIds  Liste des IDs des héros sélectionnés par le deuxième joueur (exactement 4)
     * @return true si le combat a bien été initialisé et stocké en mémoire
     * @throws IllegalArgumentException si l’un des joueurs ne possède pas bien ces héros
     */
    boolean startRtaBattle(
        String battleId,
        User player1,
        User player2,
        List<Long> player1HeroIds,
        List<Long> player2HeroIds
    );

    /**
     * Applique une action de compétence dans un combat en cours.
     *
     * @param battleId Identifiant du combat
     * @param skillId  ID de la compétence utilisée
     * @param targetId ID du participant cible (PlayerHero ID)
     * @return true si l’action a été appliquée avec succès, false sinon
     */
    boolean applySkillAction(
        String battleId,
        Long skillId,
        Long targetId
    );

    /**
     * Termine un combat RTA et nettoie la session.
     *
     * @param battleId Identifiant du combat à terminer
     * @param winnerId Identifiant du joueur gagnant (ou null en cas d’égalité)
     */
    void endRtaBattle(
        String battleId,
        Long winnerId
    );

    /**
     * Récupère l’état de combat (BattleState) pour l’affichage en temps réel.
     *
     * @param battleId Identifiant du combat
     * @return l’état courant du combat
     * @throws IllegalStateException si la session n’existe pas
     */
    Object getBattleState(
        String battleId
    );
}
