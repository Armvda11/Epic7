package com.epic7.backend.service.battle.rta;

import com.epic7.backend.dto.simple.SkillActionResultDTO;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.service.battle.engine.BattleEngine;
import com.epic7.backend.service.battle.engine.ParticipantFactory;
import com.epic7.backend.service.battle.engine.SkillEngine;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RtaBattleManager {

    private final BattleEngine battleEngine;
    private final ParticipantFactory participantFactory;
    private final PlayerHeroRepository playerHeroRepository;
    private final RedisBattleStorage redisBattleStorage;
    private final SkillEngine skillEngine;

    /**
     * Initialise un combat RTA entre deux joueurs.
     */
    public void startBattle(User player1, User player2, List<Long> picksPlayer1, List<Long> picksPlayer2) {
        List<BattleParticipant> participants = new ArrayList<>();

        for (Long id : picksPlayer1) {
            PlayerHero ph = playerHeroRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            participants.add(participantFactory.fromPlayerHero(ph));
        }

        for (Long id : picksPlayer2) {
            PlayerHero ph = playerHeroRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + id));
            participants.add(participantFactory.fromPlayerHero(ph));
        }

        battleEngine.sortParticipantsBySpeed(participants);

        BattleState state = new BattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setRoundCount(1);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("⚔️ Début du combat PvP !")));

        String battleId = player1.getId() + "-" + player2.getId();
        redisBattleStorage.saveBattle(battleId, battleEngine.processUntilNextPlayer(state));
    }

    public BattleState getBattleState(String battleId) {
        return redisBattleStorage.getBattle(battleId);
    }

    public void updateBattle(String battleId, BattleState state) {
        redisBattleStorage.saveBattle(battleId, state);
    }

    public SkillActionResultDTO useSkill(String battleId, Long skillId, Long targetId) {
        BattleState state = redisBattleStorage.getBattle(battleId);

        if (state == null || state.isFinished()) {
            return new SkillActionResultDTO(null, 0, null, "NONE");
        }

        SkillActionResultDTO result = skillEngine.useSkillWithResult(state, skillId, targetId);
        redisBattleStorage.saveBattle(battleId, state);


        return result;
    }
}
