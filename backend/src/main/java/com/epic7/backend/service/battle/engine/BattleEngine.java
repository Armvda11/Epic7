package com.epic7.backend.service.battle.engine;

import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class BattleEngine {

    private final PassiveSkillProcessor passiveSkillProcessor;

    /**
     * Gère la logique de tour : si c’est un boss → attaque. Sinon → attend l’action du joueur.
     */
    public BattleState processUntilNextPlayer(BattleState state) {
        while (!state.isFinished()) {
            BattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());

            if (current.isPlayer())
                break; // à toi de jouer !

            // Sinon le boss joue
            List<BattleParticipant> targets = state.getParticipants().stream()
                    .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                    .toList();

            if (targets.isEmpty()) {
                state.getLogs().add("❌ Tous les héros sont morts.");
                state.setFinished(true);
                return state;
            }

            BattleParticipant target = targets.get(new Random().nextInt(targets.size()));
            int damage = Math.max(1, current.getAttack() - target.getDefense());
            target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));

            state.getLogs().add(current.getName() + " (Boss) attaque " + target.getName() + " et inflige " + damage + " dégâts.");

            if (checkEnd(state)) return state;

            nextTurn(state);
        }
        return state;
    }

    /**
     * Passe au participant suivant et applique les effets de début de tour.
     */
    public void nextTurn(BattleState state) {
        int size = state.getParticipants().size();
        int currentIndex = state.getCurrentTurnIndex();
        
        // Log pour débogage
        state.getLogs().add("ℹ️ Passage au tour suivant, index actuel: " + currentIndex);

        // Vérifier si l'index actuel est valide
        if (currentIndex < 0 || currentIndex >= size) {
            state.getLogs().add("⚠️ Index de tour invalide, réinitialisation à 0");
            currentIndex = 0;
        }

        // Compteur pour éviter une boucle infinie
        int attempts = 0;

        for (int i = 1; i <= size * 2; i++) {  // Multiplié par 2 pour s'assurer de faire un tour complet
            int nextIndex = (currentIndex + i) % size;
            
            // Vérifier si l'index est valide
            if (nextIndex < 0 || nextIndex >= state.getParticipants().size()) {
                state.getLogs().add("⚠️ Calcul d'index invalide: " + nextIndex + ", réinitialisation à 0");
                nextIndex = 0;
            }
            
            BattleParticipant next = state.getParticipants().get(nextIndex);

            // Passer au tour de ce héros s'il est vivant
            if (next != null && next.getCurrentHp() > 0) {
                if (nextIndex <= currentIndex) {
                    state.setRoundCount(state.getRoundCount() + 1);
                    state.getLogs().add("🔁 Début du tour " + state.getRoundCount());
                }

                state.setCurrentTurnIndex(nextIndex);
                state.reduceCooldownsForHero(next.getId());
                passiveSkillProcessor.handleTurnStartPassives(state, next);
                
                state.getLogs().add("👉 Au tour de " + next.getName() + " (index: " + nextIndex + ")");
                return;
            }
            
            attempts++;
            if (attempts >= size * 2) {
                state.getLogs().add("⚠️ Impossible de trouver un participant vivant après plusieurs tentatives");
                break;
            }
        }

        // Aucun survivant => fin du combat
        state.getLogs().add("❌ Aucun participant vivant trouvé, fin du combat");
        state.setFinished(true);
    }

    /**
     * Vérifie si un des deux camps a gagné.
     */
    public boolean checkEnd(BattleState state) {
        // Vérifier si c'est un combat RTA (joueur vs joueur)
        if (state.getPlayer1Id() != null && state.getPlayer2Id() != null) {
            // Pour les combats RTA, la logique est gérée par RtaBattleServiceImpl.checkBattleEnd()
            // Ne pas terminer le combat ici
            return false;
        }
        
        // Sinon c'est un combat contre un boss (PvE)
        boolean allPlayersDead = state.getParticipants().stream()
                .noneMatch(p -> p.isPlayer() && p.getCurrentHp() > 0);

        boolean bossDead = state.getParticipants().stream()
                .noneMatch(p -> !p.isPlayer() && p.getCurrentHp() > 0);

        if (allPlayersDead) {
            state.getLogs().add("❌ Tous vos héros sont morts. Défaite.");
            state.setFinished(true);
            return true;
        }

        if (bossDead) {
            state.getLogs().add("🎉 Le boss est vaincu. Victoire !");
            state.setFinished(true);
            return true;
        }

        return false;
    }

    /**
     * Trie les participants par vitesse décroissante pour l’ordre de tour initial.
     */
    public void sortParticipantsBySpeed(List<BattleParticipant> participants) {
        participants.sort(Comparator.comparingInt(BattleParticipant::getSpeed).reversed());
    }
}
