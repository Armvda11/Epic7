package com.epic7.backend.service.battle.simple;

import com.epic7.backend.dto.simple.RewardDTO;
import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.dto.simple.SimpleSkillActionRequest;
import com.epic7.backend.dto.simple.SkillActionResultDTO;
import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.EquipmentType;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.model.enums.ShopItemType;
import com.epic7.backend.repository.PlayerHeroRepository;

import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.dto.*;

import com.epic7.backend.model.skill_kit.TargetGroup;
import com.epic7.backend.model.skill_kit.TriggerCondition;
import com.epic7.backend.repository.EquipmentRepository;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.PlayerEquipmentRepository;
import com.epic7.backend.service.HeroService;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service de gestion des combats simples.
 * Il gère l'initialisation du combat, le traitement des tours,
 * l'utilisation des compétences et la vérification de la fin du combat.
 * 
 * @author Hermas
 */
@Service
@RequiredArgsConstructor
public class SimpleBattleService {

    private final PlayerHeroService playerHeroService;
    private final HeroRepository heroRepository;
    private final HeroService heroService;
    private final SkillService skillService;
    private final PlayerEquipmentRepository playerEquipmentRepository;
    private final PlayerHeroRepository playerHeroRepository;
    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;

    /**
     * Initialise un combat simple avec un boss spécifique.
     * Récupère les héros du joueur, crée une copie du boss,
     * initialise les participants et l'état du combat.
     * Trie les héros par vitesse et limite le nombre de héros à 4.
     * 
     * @param user       L'utilisateur qui initie le combat.
     * @param bossHeroId L'identifiant du héros boss.
     * @return L'état du combat initialisé.
     */
    public SimpleBattleState initBattle(User user, Long bossHeroId, List<Long> selectedHeroIds) {
        if (selectedHeroIds.size() > 4) {
            throw new IllegalArgumentException("Tu ne peux sélectionner que 4 héros maximum.");
        }
    
        List<PlayerHero> playerHeroes = new ArrayList<>();
        for (Long id : selectedHeroIds) {
            PlayerHero ph = (PlayerHero) playerHeroService.findByIdAndUser(id, user);
            if (ph != null) {
                playerHeroes.add(ph);
            }
        }
    
        if (playerHeroes.size() != selectedHeroIds.size()) {
            throw new IllegalArgumentException("Un ou plusieurs héros sélectionnés ne vous appartiennent pas.");
        }
    
        Hero baseBossHero = heroRepository.findById(bossHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Boss introuvable: " + bossHeroId));
    
        Hero bossHero = heroService.copyForBoss(baseBossHero);
        bossHero.setBaseAttack(bossHero.getBaseAttack() + 30);
        bossHero.setBaseDefense(bossHero.getBaseDefense() + 200);
    
        List<SimpleBattleParticipant> participants = new ArrayList<>();
    
        for (PlayerHero ph : playerHeroes) {
            Hero h = ph.getHero();
    
            List<PlayerEquipment> equippedItems = playerEquipmentRepository.findByPlayerHeroId(ph.getId());
    
            int totalAttack = h.getBaseAttack();
            int totalDefense = h.getBaseDefense();
            int totalSpeed = h.getBaseSpeed();
            int totalHp = h.getHealth();
    
            for (PlayerEquipment pe : equippedItems) {
                Equipment eq = pe.getEquipment();
                totalAttack += eq.getAttackBonus();
                totalDefense += eq.getDefenseBonus();
                totalSpeed += eq.getSpeedBonus();
                totalHp += eq.getHealthBonus();
            }
    
            participants.add(new SimpleBattleParticipant(
                    ph.getId(), h.getName(), totalHp, totalHp,
                    totalAttack, totalDefense, totalSpeed, true));
        }
    
        participants.add(new SimpleBattleParticipant(
                -1L, bossHero.getName(), bossHero.getHealth(), bossHero.getHealth(),
                bossHero.getBaseAttack(), bossHero.getBaseDefense(), bossHero.getBaseSpeed(), false));
    
        participants.sort(Comparator.comparingInt(SimpleBattleParticipant::getSpeed).reversed());
    
        SimpleBattleState state = new SimpleBattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("Combat commencé contre " + bossHero.getName() + " !")));
    

    
        return processUntilNextPlayer(state);
    }
    

    /**
     * Traite le combat jusqu'au prochain joueur.
     * Vérifie si le combat est terminé après chaque action.
     * Si tous les héros sont morts, le combat est terminé.
     * Si le boss est vaincu, le combat est terminé.
     * Si le joueur est en train de jouer, il ne fait rien.
     * Sinon, le boss attaque un héros joueur au hasard.
     * 
     * @param state
     * @return
     */
    public SimpleBattleState processUntilNextPlayer(SimpleBattleState state) {
        // Vérifie si le combat est terminé
        while (!state.isFinished()) {

            SimpleBattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());
            // Vérifie si c'est le tour d'un joueur
            if (current.isPlayer())
                break;

            List<SimpleBattleParticipant> targets = state.getParticipants().stream()
                    .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                    .toList();

            if (targets.isEmpty()) {
                state.getLogs().add("❌ Tous les héros sont morts.");
                state.setFinished(true);
                return state;
            }

            SimpleBattleParticipant target = targets.get(new Random().nextInt(targets.size()));
            int damage = Math.max(1, current.getAttack() - target.getDefense());
            target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));

            state.getLogs().add(
                    current.getName() + " (Boss) attaque " + target.getName() + " et inflige " + damage + " dégâts.");

            if (checkEnd(state))
                return state;

            state = nextTurn(state);
        }
        return state;
    }

    /**
     * Passe au tour suivant.
     * Incrémente le compteur de tours si on boucle dans la liste des participants.
     * Réduit les cooldowns des compétences du héros actuel.
     * Active les passifs au début du tour.
     * Vérifie si le combat est terminé après chaque action.
     * Si tous les héros sont morts, le combat est terminé.
     * Si le boss est vaincu, le combat est terminé.
     * 
     * @param state
     * @return
     */
    private SimpleBattleState nextTurn(SimpleBattleState state) {
        int size = state.getParticipants().size();
        int currentIndex = state.getCurrentTurnIndex();

        // Parcourt la liste des participants pour trouver le prochain joueur
        for (int i = 1; i <= size; i++) {
            int nextIndex = (currentIndex + i) % size;
            SimpleBattleParticipant next = state.getParticipants().get(nextIndex);

            if (next.getCurrentHp() > 0) {
                // incrémente le compteur de tours si on boucle dans la liste
                if (nextIndex <= currentIndex) {
                    state.setRoundCount(state.getRoundCount() + 1);
                    state.getLogs().add("🔁 Début du tour " + state.getRoundCount());
                }
                state.setCurrentTurnIndex(nextIndex);
                state.reduceCooldownsForHero(next.getId());
                activateOnTurnStartPassives(state, next);
                return state;
            }
        }
        // Aucun survivant
        state.setFinished(true);
        return state;
    }

    /**
     * Active les passifs au début du tour.
     * 
     * @param state
     * @param participant
     */
    private void activateOnTurnStartPassives(SimpleBattleState state, SimpleBattleParticipant participant) {
        if (!participant.isPlayer())
            return; // Boss n'a pas encore de passif

        try {
            PlayerHero playerHero = playerHeroService.findById(participant.getId());
            Hero hero = playerHero.getHero();

            hero.getSkills().stream()
                    .filter(skill -> !skill.isActive() &&
                            skill.getTriggerCondition() == TriggerCondition.ON_TURN_START)
                    .forEach(skill -> {
                        if (skill.getPassiveBonus() != null) {
                            switch (skill.getPassiveBonus()) {
                                case ATTACK_UP -> {
                                    int bonus = (int) (participant.getAttack() * (skill.getBonusValue() / 100.0));
                                    participant.setAttack(participant.getAttack() + bonus);
                                    state.getLogs().add("✨ " + participant.getName() + " déclenche " + skill.getName()
                                            + " (passif) et gagne +" + bonus + " ATK (" + skill.getBonusValue()
                                            + "%).");
                                }
                                case DEFENSE_UP -> {
                                    int bonus = (int) (participant.getDefense() * (skill.getBonusValue() / 100.0));
                                    participant.setDefense(participant.getDefense() + bonus);
                                    state.getLogs().add("🛡️ " + participant.getName() + " déclenche " + skill.getName()
                                            + " (passif) et gagne +" + bonus + " DEF.");
                                }
                                case SPEED_UP -> {
                                    int bonus = (int) (participant.getSpeed() * (skill.getBonusValue() / 100.0));
                                    participant.setSpeed(participant.getSpeed() + bonus);
                                    state.getLogs().add("💨 " + participant.getName() + " déclenche " + skill.getName()
                                            + " (passif) et gagne +" + bonus + " Vitesse.");
                                }
                                default -> {
                                    state.getLogs().add("⚠️ Passif non géré : " + skill.getPassiveBonus());
                                }
                            }
                        } else if (skill.getAction() != null) {
                            // gestion des anciens passifs de type HEAL/DAMAGE
                            switch (skill.getAction()) {
                                case HEAL -> {
                                    int healAmount = (int) (skill.getScalingFactor() * participant.getMaxHp());
                                    participant.setCurrentHp(
                                            Math.min(participant.getMaxHp(), participant.getCurrentHp() + healAmount));
                                    state.getLogs().add("✨ " + participant.getName() + " déclenche " + skill.getName() +
                                            " (passif) et se soigne de " + healAmount + " points de vie.");
                                }
                                case DAMAGE -> {
                                    // implémenter si besoin
                                }
                            }
                        } else {
                            state.getLogs().add("❌ Passif mal configuré : aucun effet connu.");
                        }

                    });
        } catch (Exception e) {
            state.getLogs().add("❌ Erreur lors de l’activation du passif de " + participant.getName());
        }
    }

    private boolean checkEnd(SimpleBattleState state) {
        boolean allPlayersDead = state.getParticipants().stream().noneMatch(p -> p.isPlayer() && p.getCurrentHp() > 0);
        boolean bossDead = state.getParticipants().stream().noneMatch(p -> !p.isPlayer() && p.getCurrentHp() > 0);

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
     * Convertit l'état de la bataille simple en DTO.
     * 
     * @param state
     * @return
     */
    public SimpleBattleStateDTO convertToDTO(SimpleBattleState state) {
        return new SimpleBattleStateDTO(state);
    }

    /**
     * Utilise une compétence sur un héros.
     * Vérifie que la compétence appartient au héros, qu'elle est active,
     * 
     * @param state
     * @param request
     * @return
     */
    public SkillActionResultDTO useSkillWithResult(SimpleBattleState state, SimpleSkillActionRequest request) {
        // Vérifie si le combat est terminé
        if (state == null || state.isFinished()) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        SimpleBattleParticipant actor = state.getParticipants().get(state.getCurrentTurnIndex());
        Skill skill = skillService.getSkillById(request.getSkillId());

        // vérifier que la compétence appartient au héros
        if (actor.isPlayer()) {
            try {
                PlayerHero playerHero = playerHeroService.findById(actor.getId()); // actor.getId() = playerHeroId
                Hero hero = playerHero.getHero();

                boolean belongsToHero = hero.getSkills().stream()
                        .anyMatch(s -> s.getId().equals(skill.getId()));
                // vérifier que la compétence appartient au héros, sinon on ne peut pas
                // l'utiliser et l'erreur est remontée
                if (!belongsToHero) {
                    state.getLogs().add("❌ Cette compétence n'appartient pas au héros sélectionné.");
                    return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
                }
            } catch (Exception e) {
                // normalement pas possible car on a déjà vérifié que le héros est joueur
                // mais au cas où, on remonte l'erreur
                state.getLogs().add("❌ Erreur lors de la vérification du héros joueur.");
                return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
            }
        }

        if (!skill.isActive()) {
            state.getLogs().add("❌ Cette compétence n'est pas active.");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        if (actor.getCurrentHp() <= 0) {
            SimpleBattleState updated = processUntilNextPlayer(nextTurn(state));
            return new SkillActionResultDTO(new SimpleBattleStateDTO(updated), 0, null, "NONE");
        }

        if (state.isSkillOnCooldown(actor.getId(), skill.getId())) {
            state.getLogs().add("⏳ Compétence en recharge !");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        SimpleBattleParticipant target = state.getParticipants().stream()
                .filter(p -> p.getId().equals(request.getTargetId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ Cible non trouvée."));

        int[] amountHolder = new int[1];

        switch (skill.getAction()) {
            case DAMAGE -> {
                amountHolder[0] = (int) (skill.getScalingFactor() * actor.getAttack() - target.getDefense());
                amountHolder[0] = Math.max(1, amountHolder[0]);
                target.setCurrentHp(Math.max(0, target.getCurrentHp() - amountHolder[0]));
                state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                        " sur " + target.getName() + " et inflige " + amountHolder[0] + " dégâts.");
            }
            case HEAL -> {
                amountHolder[0] = (int) (skill.getScalingFactor() * actor.getMaxHp());
                if (skill.getTargetGroup() == TargetGroup.ALL_ALLIES) {
                    state.getParticipants().stream()
                            .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                            .forEach(p -> p.setCurrentHp(Math.min(p.getMaxHp(), p.getCurrentHp() + amountHolder[0])));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                            " et soigne tous les alliés de " + amountHolder[0] + " points de vie.");
                } else {
                    actor.setCurrentHp(Math.min(actor.getMaxHp(), actor.getCurrentHp() + amountHolder[0]));
                    state.getLogs().add(actor.getName() + " utilise " + skill.getName() +
                            " et se soigne de " + amountHolder[0] + " points de vie.");
                }
            }
        }

        int amount = amountHolder[0];

        if (skill.getCooldown() > 0) {
            state.putCooldown(actor.getId(), skill.getId(), skill.getCooldown());
        }

        if (checkEnd(state)) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), amount, target.getId(),
                    skill.getAction().name());
        }

        SimpleBattleState updated = processUntilNextPlayer(nextTurn(state));
        return new SkillActionResultDTO(new SimpleBattleStateDTO(updated), amount, target.getId(),
                skill.getAction().name());
    }


    public RewardDTO giveVictoryReward(User user, SimpleBattleState state) {
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
                    // Gérer le cas où aucun héros n'est trouvé
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
                
                // Sauvegarder l'équipement d'abord pour obtenir son ID
                Equipment savedEquipment = equipmentRepository.save(eq);
                
                // Créer et configurer le PlayerEquipment
                PlayerEquipment playerEquipment = new PlayerEquipment();
                playerEquipment.setUser(user);
                playerEquipment.setEquipment(savedEquipment);
                // Si un PlayerHero doit être associé, il faudrait ajouter :
                // playerEquipment.setPlayerHero(somePlayerHero);
                
                // Sauvegarder l'attribution de l'équipement au joueur
                playerEquipmentRepository.save(playerEquipment);
                
                return new RewardDTO(type, 1, "🛡️ Équipement obtenu : " + savedEquipment.getName() + " !");
            }
            default -> throw new IllegalStateException("Type de récompense inconnu");
        }
    }


    
}
