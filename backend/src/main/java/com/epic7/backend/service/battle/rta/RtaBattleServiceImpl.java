package com.epic7.backend.service.battle.rta;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.service.battle.engine.BattleEngine;
import com.epic7.backend.service.battle.engine.ParticipantFactory;
import com.epic7.backend.service.battle.engine.SkillEngine;
import com.epic7.backend.service.battle.manager.BattleManager;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RtaBattleServiceImpl implements BattleManager {
    private final ParticipantFactory participantFactory;
    private final BattleEngine battleEngine;
    private final SkillEngine skillEngine;
    private final PlayerHeroRepository playerHeroRepo;

    // Stockage en mémoire des sessions actives
    private final Map<String, BattleState> activeBattles = new ConcurrentHashMap<>();

    @Override
    public boolean startRtaBattle(String battleId,
                                  User player1, User player2,
                                  List<Long> player1HeroIds,
                                  List<Long> player2HeroIds) {
        // Construire les participants
        List<BattleParticipant> participants = new ArrayList<>();
        for (Long id : player1HeroIds) {
            PlayerHero ph = playerHeroRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            participants.add(participantFactory.fromPlayerHero(ph));
        }
        for (Long id : player2HeroIds) {
            PlayerHero ph = playerHeroRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            participants.add(participantFactory.fromPlayerHero(ph));
        }

        // Ordonner par vitesse et initialiser l'état
        battleEngine.sortParticipantsBySpeed(participants);
        BattleState state = new BattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setRoundCount(1);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("⚔️ Combat RTA démarré !")));

        // Avancer jusqu'au premier tour joueur
        state = battleEngine.processUntilNextPlayer(state);

        // Stocker la session
        activeBattles.put(battleId, state);
        return true;
    }

    @Override
    public boolean applySkillAction(String battleId, Long skillId, Long targetId) {
        BattleState state = getBattleState(battleId);
        
        // Vérifier si c'est bien au tour du joueur qui fait l'action
        BattleParticipant currentParticipant = state.getParticipants().get(state.getCurrentTurnIndex());
        
        // Vérifier que la cible est valide
        BattleParticipant targetParticipant = state.getParticipants().stream()
                .filter(p -> p.getId().equals(targetId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Cible invalide: " + targetId));
        
        // Utiliser la compétence et obtenir le résultat
        skillEngine.useSkillWithResult(state, skillId, targetId);
        
        // Vérifier si combat terminé
        if (checkBattleEnd(state)) {
            state.setFinished(true);
            return true;
        }
        
        // Passer au joueur suivant
        battleEngine.nextTurn(state);
        
        return true;
    }
    
    /**
     * Vérifie si le combat est terminé (un camp a été éliminé).
     */
    private boolean checkBattleEnd(BattleState state) {
        // Identifier les deux joueurs par leurs participant.isPlayer
        boolean player1Alive = false;
        boolean player2Alive = false;
        
        // On parcourt les 4 premiers participants (joueur 1) et les 4 derniers (joueur 2)
        int participantCount = state.getParticipants().size();
        int midPoint = participantCount / 2;
        
        for (int i = 0; i < midPoint; i++) {
            if (state.getParticipants().get(i).getCurrentHp() > 0) {
                player1Alive = true;
                break;
            }
        }
        
        for (int i = midPoint; i < participantCount; i++) {
            if (state.getParticipants().get(i).getCurrentHp() > 0) {
                player2Alive = true;
                break;
            }
        }
        
        // Si un des joueurs n'a plus de héros vivants
        if (!player1Alive || !player2Alive) {
            if (!player1Alive) {
                state.getLogs().add("Le joueur 2 remporte la victoire!");
            } else {
                state.getLogs().add("Le joueur 1 remporte la victoire!");
            }
            return true;
        }
        
        return false;
    }

    @Override
    public void endRtaBattle(String battleId, Long winnerId) {
        activeBattles.remove(battleId);
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
