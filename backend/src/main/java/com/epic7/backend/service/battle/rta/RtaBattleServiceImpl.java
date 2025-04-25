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
        skillEngine.useSkillWithResult(state, skillId, targetId);
        if (state.isFinished()) {
            endRtaBattle(battleId, null);
        }
        return true;
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
