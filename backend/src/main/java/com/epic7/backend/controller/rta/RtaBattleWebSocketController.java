package com.epic7.backend.controller.rta;

import com.epic7.backend.dto.simple.SkillActionResultDTO;
import com.epic7.backend.dto.simple.SkillUseMessage;
import com.epic7.backend.service.battle.rta.RtaBattleManager;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class RtaBattleWebSocketController {

    private final RtaBattleManager rtaBattleManager;

    @MessageMapping("/rta/use-skill/{battleId}")
    @SendTo("/topic/rta/state/{battleId}")
    public SkillActionResultDTO useSkill(@DestinationVariable String battleId,
                                         @Payload SkillUseMessage payload) {
        return rtaBattleManager.useSkill(battleId, payload.getSkillId(), payload.getTargetId());
    }
}
