package com.epic7.backend.controller;

import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.SummonService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/summons")
public class SummonController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final SummonService summonService;

    public SummonController(JwtUtil jwtUtil, AuthService authService, SummonService summonService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.summonService = summonService;
    }

    @PostMapping("/code/{heroCode}")
    public ResponseEntity<String> summonByCode(@PathVariable String heroCode, HttpServletRequest request) {
        User user = authService.getUserByEmail(jwtUtil.extractEmail(jwtUtil.extractTokenFromHeader(request)));

        Optional<Hero> heroOpt = summonService.getHeroById(heroCode);
        if (heroOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ Héros introuvable");
        }

        Optional<PlayerHero> result = summonService.performSummon(user, heroOpt.get());

        return result.isPresent()
                ? ResponseEntity.ok("✅ Héros invoqué !")
                : ResponseEntity.ok("❌ Invocation échouée");
    }
}
