package com.epic7.backend.dto.simple;

import com.epic7.backend.service.battle.simple.SimpleBattleParticipant;
import com.epic7.backend.service.battle.simple.SimpleBattleState;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

/**
 * DTO pour exposer l'état du combat au frontend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimpleBattleStateDTO {

    private List<ParticipantDTO> participants;
    private int currentTurnIndex;
    private boolean finished;
    private List<String> logs;

    public SimpleBattleStateDTO(SimpleBattleState state) {
        this.participants = state.getParticipants().stream()
                .map(ParticipantDTO::new)
                .collect(Collectors.toList());
        this.currentTurnIndex = state.getCurrentTurnIndex();
        this.finished = state.isFinished();
        this.logs = state.getLogs();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantDTO {
        private Long id;
        private String name;
        private int maxHp;
        private int currentHp;
        private int attack;
        private int defense;
        private int speed;
        private boolean isPlayer;

        public ParticipantDTO(SimpleBattleParticipant p) {
            this.id = p.getId();
            this.name = p.getName();
            this.maxHp = p.getMaxHp();
            this.currentHp = p.getCurrentHp();
            this.attack = p.getAttack();
            this.defense = p.getDefense();
            this.speed = p.getSpeed();
            this.isPlayer = p.isPlayer();
        }
    }
} 
