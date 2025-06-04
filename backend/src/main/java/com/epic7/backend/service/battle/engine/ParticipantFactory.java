package com.epic7.backend.service.battle.engine;

import com.epic7.backend.repository.PlayerEquipmentRepository;
import com.epic7.backend.repository.model.Equipment;
import com.epic7.backend.repository.model.Hero;
import com.epic7.backend.repository.model.PlayerEquipment;
import com.epic7.backend.repository.model.PlayerHero;
import com.epic7.backend.service.battle.model.BattleParticipant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParticipantFactory {

    private final PlayerEquipmentRepository playerEquipmentRepository;

    /**
     * Crée un participant à partir d’un PlayerHero (avec équipements).
     */
    public BattleParticipant fromPlayerHero(PlayerHero playerHero) {
        Hero hero = playerHero.getHero();
        List<PlayerEquipment> equipmentList = playerEquipmentRepository.findByPlayerHeroId(playerHero.getId());

        int totalAttack = hero.getBaseAttack();
        int totalDefense = hero.getBaseDefense();
        int totalSpeed = hero.getBaseSpeed();
        int totalHp = hero.getHealth();

        for (PlayerEquipment pe : equipmentList) {
            Equipment eq = pe.getEquipment();
            totalAttack += eq.getAttackBonus();
            totalDefense += eq.getDefenseBonus();
            totalSpeed += eq.getSpeedBonus();
            totalHp += eq.getHealthBonus();
        }

        return new BattleParticipant(
                playerHero.getId(),
                hero.getName(),
                totalHp, totalHp,
                totalAttack,
                totalDefense,
                totalSpeed,
                true, // joueur
                null  // userId sera défini dans le service RTA
        );
    }
    
    /**
     * Crée un participant à partir d'un PlayerHero avec l'ID de l'utilisateur (pour RTA).
     */
    public BattleParticipant fromPlayerHeroWithUserId(PlayerHero playerHero, String userId) {
        BattleParticipant participant = fromPlayerHero(playerHero);
        participant.setUserId(userId);
        return participant;
    }

    /**
     * Crée un participant à partir d’un boss (Hero brut).
     */
    public BattleParticipant fromBoss(Hero boss) {
        return new BattleParticipant(
                -1L,
                boss.getName(),
                boss.getHealth(), boss.getHealth(),
                boss.getBaseAttack(),
                boss.getBaseDefense(),
                boss.getBaseSpeed(),
                false, // boss = ennemi
                null   // pas d'utilisateur associé
        );
    }
}
