// package com.epic7.backend.service.battle.rta;

// import java.util.ArrayList;
// import java.util.List;

// import org.springframework.stereotype.Service;

// import com.epic7.backend.dto.simple.SkillActionResultDTO;
// import com.epic7.backend.model.PlayerHero;
// import com.epic7.backend.model.User;
// import com.epic7.backend.repository.PlayerHeroRepository;
// import com.epic7.backend.service.battle.engine.BattleEngine;
// import com.epic7.backend.service.battle.engine.ParticipantFactory;
// import com.epic7.backend.service.battle.engine.SkillEngine;
// import com.epic7.backend.service.battle.model.BattleParticipant;
// import com.epic7.backend.service.battle.state.BattleState;

// import lombok.RequiredArgsConstructor;

// @Service
// @RequiredArgsConstructor
// public class RtaBattleManager{

//     private final BattleEngine battleEngine;
//     private final ParticipantFactory participantFactory;
//     private final PlayerHeroRepository playerHeroRepository;
//     private final RedisBattleStorage redisBattleStorage;
//     private final SkillEngine skillEngine;


//     public void startBattle(User player1 , User player2, List<Long> picksPlayer1, List<Long> picksPlayer2) {
//         // la listes des particapants (les heros choisis par les joueurs)
//         List<BattleParticipant> participants = new ArrayList<>();

//         // on ajoute le premier joueur
//         for (Long heroId : picksPlayer1) {
//            PlayerHero heroPlayer1 = playerHeroRepository.findById(heroId)
//                     .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + heroId));
//             participants.add(participantFactory.fromPlayerHero(heroPlayer1));
//         }

//         // on ajoute le deuxieme joueur
//         for (Long heroId : picksPlayer2) {
//             PlayerHero heroPlayer2 = playerHeroRepository.findById(heroId)
//                     .orElseThrow(() -> new IllegalArgumentException("Héros introuvable : " + heroId));
//             participants.add(participantFactory.fromPlayerHero(heroPlayer2));
//         }
//         // on lance le combat , repartition des tours par le vitesse
//         battleEngine.sortParticipantsBySpeed(participants);

//         // on lance le comba
//         BattleState state = new BattleState();
//          state.setParticipants(participants);
//         state.setCurrentTurnIndex(0);
//         state.setRoundCount(1);
//         state.setFinished(false);
//         state.setLogs(new ArrayList<>(List.of("⚔️ Début du combat PvP !")));


//         String battleId = player1.getId() + "-" + player2.getId();
//         // on sauvegarde le combat dans redis
//         redisBattleStorage.saveBattle(battleId, battleEngine.processUntilNextPlayer(state));



    

      
//     }

//     public BattleState getBattleState(String battleId) {
//         return redisBattleStorage.getBattle(battleId);
//     }

//     public void updateBattle(String battleId, BattleState state) {
//         redisBattleStorage.saveBattle(battleId, state);
//     }

    
//     public SkillActionResultDTO useSkill(String battleId, Long skillId, Long targetId) {
//         BattleState state = redisBattleStorage.getBattle(battleId);

//         if (state == null || state.isFinished()) {
//             return new SkillActionResultDTO(null, 0, null, "NONE");
//         }

//         // Appel au moteur de skill
//         SkillActionResultDTO result = skillEngine.useSkillWithResult(state, skillId, targetId);

//         // Sauvegarde du nouvel état en Redis
//         redisBattleStorage.saveBattle(battleId, result.getBattleState().toBattleState());

//         return result;
//     }
    
// }
