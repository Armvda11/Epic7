package com.epic7.backend.service.battle.manager;

import com.epic7.backend.dto.simple.RewardDTO;
import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.dto.simple.SimpleSkillActionRequest;
import com.epic7.backend.dto.simple.SkillActionResultDTO;
import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.EquipmentType;
import com.epic7.backend.model.enums.ShopItemType;
import com.epic7.backend.repository.*;
import com.epic7.backend.service.HeroService;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.SkillService;
import com.epic7.backend.service.battle.engine.*;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class BossBattleManager {

    private final PlayerHeroService playerHeroService;
    private final HeroRepository heroRepository;
    private final HeroService heroService;
    private final EquipmentRepository equipmentRepository;
    private final PlayerEquipmentRepository playerEquipmentRepository;
    private final PlayerHeroRepository playerHeroRepository;
    private final UserRepository userRepository;

    private final ParticipantFactory participantFactory;
    private final BattleEngine battleEngine;
    private final SkillEngine skillEngine;

    /**
     * Initialise un combat contre un boss.
     */
    public BattleState initBattle(User user, Long bossHeroId, List<Long> selectedHeroIds) {
        if (selectedHeroIds.size() > 4) {
            throw new IllegalArgumentException("Tu ne peux sélectionner que 4 héros maximum.");
        }

        List<PlayerHero> playerHeroes = new ArrayList<>();
        for (Long id : selectedHeroIds) {
            PlayerHero ph = playerHeroService.findByIdAndUser(id, user);
            if (ph != null) {
                playerHeroes.add(ph);
            }
        }

        if (playerHeroes.size() != selectedHeroIds.size()) {
            throw new IllegalArgumentException("Un ou plusieurs héros sélectionnés ne vous appartiennent pas.");
        }

        Hero baseBossHero = heroRepository.findById(bossHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Boss introuvable: " + bossHeroId));

        Hero boss = heroService.copyForBoss(baseBossHero);
        boss.setBaseAttack(boss.getBaseAttack() + 30);
        boss.setBaseDefense(boss.getBaseDefense() + 200);

        List<BattleParticipant> participants = new ArrayList<>();

        for (PlayerHero ph : playerHeroes) {
            participants.add(participantFactory.fromPlayerHero(ph));
        }

        participants.add(participantFactory.fromBoss(boss));
        battleEngine.sortParticipantsBySpeed(participants);

        BattleState state = new BattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setRoundCount(1);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("Combat commencé contre " + boss.getName() + " !")));

        return battleEngine.processUntilNextPlayer(state);
    }

    /**
     * Utilisation d’une compétence avec retour du résultat.
     */
    public SkillActionResultDTO useSkill(BattleState state, SimpleSkillActionRequest request) {
        return skillEngine.useSkillWithResult(state, request.getSkillId(), request.getTargetId());
    }

    /**
     * Convertit l’état de combat en DTO.
     */
    public SimpleBattleStateDTO toDTO(BattleState state) {
        return new SimpleBattleStateDTO(state);
    }

    /**
     * Attribue une récompense après victoire.
     */
    public RewardDTO giveVictoryReward(User user, BattleState state) {
        ShopItemType type = state.getRewardType();
        int amount = state.getRewardAmount();

        switch (type) {
            case GOLD -> {
                user.setGold(user.getGold() + amount);
                userRepository.save(user);
                return new RewardDTO(type, amount, "💰 Vous avez gagné " + amount + " or !");
            }
            case DIAMOND -> {
                user.setDiamonds(user.getDiamonds() + amount);
                userRepository.save(user);
                return new RewardDTO(type, amount, "💎 Vous avez gagné " + amount + " diamants !");
            }
            case HERO -> {
                Optional<Hero> optionalHero = heroRepository.findRandomHero();
                if (optionalHero.isPresent()) {
                    Hero randomHero = optionalHero.get();
                    PlayerHero ph = new PlayerHero(user, randomHero);
                    playerHeroRepository.save(ph);
                    return new RewardDTO(type, 1, "🎉 Vous avez obtenu le héros : " + randomHero.getName());
                } else {
                    return new RewardDTO(type, 0, "❌ Aucun héros disponible pour le moment.");
                }
            }
            case EQUIPMENT -> {
                Equipment eq = new Equipment();
                eq.setName("Équipement " + new Random().nextInt(1000));
                eq.setType(EquipmentType.ARMOR);
                eq.setAttackBonus(new Random().nextInt(50));
                eq.setDefenseBonus(new Random().nextInt(50));
                eq.setSpeedBonus(new Random().nextInt(50));
                eq.setHealthBonus(new Random().nextInt(50));
                eq.setRarity("bon");

                Equipment saved = equipmentRepository.save(eq);

                PlayerEquipment playerEquipment = new PlayerEquipment();
                playerEquipment.setUser(user);
                playerEquipment.setEquipment(saved);
                playerEquipmentRepository.save(playerEquipment);

                return new RewardDTO(type, 1, "🛡️ Équipement obtenu : " + saved.getName() + " !");
            }
            default -> throw new IllegalStateException("Type de récompense inconnu");
        }
    }
}
