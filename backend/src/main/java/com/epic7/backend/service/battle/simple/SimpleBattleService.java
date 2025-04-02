package com.epic7.backend.service.battle.simple;

import com.epic7.backend.dto.simple.SimpleActionRequest;
import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.service.PlayerHeroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SimpleBattleService {

    private final PlayerHeroService playerHeroService;
    private final HeroRepository heroRepository;

    public SimpleBattleState startBattle(User user, Long bossHeroId) {
        List<PlayerHero> allPlayerHeroes = playerHeroService.getAllByUser(user);

        List<PlayerHero> playerHeroes = allPlayerHeroes.stream()
                .sorted(Comparator.comparingInt(ph -> ph.getHero().getBaseSpeed()))
                .limit(4)
                .toList();

        Hero bossHero = heroRepository.findById(bossHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Boss introuvable: " + bossHeroId));

        List<SimpleBattleParticipant> participants = new ArrayList<>();

        for (PlayerHero ph : playerHeroes) {
            Hero h = ph.getHero();
            participants.add(new SimpleBattleParticipant(
                    ph.getId(),
                    h.getName(),
                    h.getHealth(),
                    h.getHealth(),
                    h.getBaseAttack(),
                    h.getBaseDefense(),
                    h.getBaseSpeed(),
                    true
            ));
        }

        participants.add(new SimpleBattleParticipant(
            -1L, // ou une valeur unique, genre -999
            bossHero.getName(),
            bossHero.getHealth(),
            bossHero.getHealth(),
            bossHero.getBaseAttack(),
            bossHero.getBaseDefense(),
            bossHero.getBaseSpeed(),
            false
        ));
        

        participants.sort(Comparator.comparingInt(SimpleBattleParticipant::getSpeed).reversed());

        SimpleBattleState state = new SimpleBattleState();
        state.setParticipants(participants);
        state.setCurrentTurnIndex(0);
        state.setFinished(false);
        state.setLogs(new ArrayList<>(List.of("Combat commencé contre " + bossHero.getName() + " !")));

        // Lancer l’IA immédiatement si le boss commence
        state = processUntilNextPlayer(state);

        return state;
    }

    public SimpleBattleState doTurn(SimpleBattleState state, SimpleActionRequest request) {
        if (state.isFinished()) return state;

        SimpleBattleParticipant actor = state.getParticipants().get(state.getCurrentTurnIndex());

        // Vérifie que c’est bien au joueur d’agir
        if (!actor.isPlayer()) {
            state.getLogs().add("❌ Ce n’est pas au joueur de jouer.");
            return state;
        }

        Optional<SimpleBattleParticipant> targetOpt = state.getParticipants().stream()
                .filter(p -> Objects.equals(p.getId(), request.getTargetId()))
                .findFirst();

        if (targetOpt.isEmpty()) {
            state.getLogs().add("❌ Cible invalide.");
            return state;
        }

        SimpleBattleParticipant target = targetOpt.get();
        int damage = Math.max(1, actor.getAttack() - target.getDefense());
        target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));

        state.getLogs().add(actor.getName() + " attaque " + target.getName() + " et inflige " + damage + " dégâts.");

        // Check fin du combat
        if (checkEnd(state)) return state;

        // Passer au tour suivant (et lancer IA si nécessaire)
        return processUntilNextPlayer(nextTurn(state));
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

    private SimpleBattleState processUntilNextPlayer(SimpleBattleState state) {
        while (!state.isFinished()) {
            SimpleBattleParticipant current = state.getParticipants().get(state.getCurrentTurnIndex());

            if (current.isPlayer()) {
                break;
            }

            // IA du boss
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

            state.getLogs().add(current.getName() + " (Boss) attaque " + target.getName() + " et inflige " + damage + " dégâts.");

            if (checkEnd(state)) return state;

            state = nextTurn(state);
        }

        return state;
    }

    private SimpleBattleState nextTurn(SimpleBattleState state) {
        int size = state.getParticipants().size();
        for (int i = 1; i <= size; i++) {
            int nextIndex = (state.getCurrentTurnIndex() + i) % size;
            if (state.getParticipants().get(nextIndex).getCurrentHp() > 0) {
                state.setCurrentTurnIndex(nextIndex);
                return state;
            }
        }

        state.setFinished(true);
        return state;
    }

    public SimpleBattleStateDTO convertToDTO(SimpleBattleState state) {
        return new SimpleBattleStateDTO(state);
    }
}
