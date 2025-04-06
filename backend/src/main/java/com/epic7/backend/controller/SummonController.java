package com.epic7.backend.controller;

import com.epic7.backend.dto.SummonResultDTO;
import com.epic7.backend.model.Banner;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.SummonService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
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

    /**
     * Invoque un héros spécifique via son code.
     */
    @PostMapping("/random")
    public ResponseEntity<?> summon(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        Optional<Banner> activeBanner = summonService.getActiveBanner();
        if (activeBanner.isEmpty()) {
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ Aucune bannière active."
            ));
        }

        if (summonService.userOwnsAllHeroesInBanner(user, activeBanner.get())) {
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ Tu possèdes déjà tous les héros de la bannière !"
            ));
        }

        if (user.getDiamonds() < SummonService.SUMMON_COST) {
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ Pas assez de diamants !"
            ));
        }

        Optional<PlayerHero> result = summonService.performSummon(user);

        if (result.isPresent()) {
            PlayerHero hero = result.get();
            return ResponseEntity.ok(new SummonResultDTO(
                hero.getHero().getName(),
                hero.getHero().getRarity().toString(),
                hero.getHero().getElement().toString()
            ));
        } else {
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ L'invocation a échoué, retente ta chance."
            ));
        }
    }

    /**
     * Récupère la bannière d'invocation actuelle avec les héros mis en avant.
     */
    @GetMapping("/banner")
    public ResponseEntity<?> getCurrentBanner(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        System.out.println("✅ Utilisateur authentifié : " + user.getUsername());

        Optional<Banner> bannerOpt = summonService.getActiveBanner();
        if (bannerOpt.isEmpty()) {
            System.out.println("⚠️ Aucune bannière active trouvée.");
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(bannerOpt.get().getFeaturedHeroes());
    }
}
