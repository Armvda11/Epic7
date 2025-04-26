package com.epic7.backend.dto.boss;

import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * DTO pour représenter l'état d'une bataille simple.
 * Il contient des informations sur les participants, l'index du tour actuel,
 * l'état de la bataille (terminée ou non), les logs de la bataille,
 * le nombre de tours effectués et les cooldowns des compétences.
 *  @author Hermas
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimpleBattleStateDTO {

    private List<ParticipantDTO> participants;
    private int currentTurnIndex; // Index du participant dont c'est le tour
    private boolean finished;   // Indique si la bataille est terminée
    private List<String> logs;   // Logs de la bataille
    private int roundCount = 1; // Nombre de tours effectués
    private Map<Long, Map<Long, Integer>> cooldowns;  // Cooldowns des compétences



    /**
     * Constructeur pour initialiser le DTO à partir d'un état de bataille simple.
     * @param state L'état de la bataille simple à partir duquel initialiser le DTO.
     */
    public SimpleBattleStateDTO(BattleState state) {

        this.participants = state.getParticipants().stream()
                .map(ParticipantDTO::new)
                .collect(Collectors.toList());
        this.currentTurnIndex = state.getCurrentTurnIndex();
        this.finished = state.isFinished();
        this.logs = state.getLogs();
        this.cooldowns = state.getCooldowns();
        this.roundCount = state.getRoundCount();
    }
    
    /**
     * DTO pour représenter un participant à la bataille.
     * Il contient des informations sur l'identifiant, le nom, les points de vie,
     * l'attaque, la défense, la vitesse et si c'est un joueur ou non.
     */
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

        public ParticipantDTO(BattleParticipant p) {
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
