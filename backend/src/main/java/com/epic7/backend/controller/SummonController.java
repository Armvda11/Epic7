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
import java.util.ArrayList;
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
     * Invoque un héros d'une bannière spécifique.
     * @param request La requête HTTP contenant le token JWT.
     * @param id_banner La bannière à invoquer.
     * @return Un objet JSON contenant le résultat de l'invocation.
     */
    @PostMapping("/random")
    public ResponseEntity<?> summon(HttpServletRequest request, @RequestBody Map<String, Long> id_banner) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        Long bannerId = id_banner.get("bannerId");
        Optional<Banner> bannerOpt = summonService.getBannerById(bannerId);
        if (bannerOpt.isEmpty()) {
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ Bannière non trouvée."
            ));
        }

        if (summonService.userOwnsAllHeroesInBanner(user, bannerOpt.get())) {
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

        Optional<PlayerHero> result = summonService.performSummon(user, bannerOpt.get());

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
     * Récupère les héros d'une bannière spécifique.
     */
    @GetMapping("/{bannerId}/heroes")
    public ResponseEntity<?> getBannerHeroes(@PathVariable Long bannerId) {
        Optional<Banner> bannerOpt = summonService.getBannerById(bannerId);
        if (bannerOpt.isEmpty()) {
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ Bannière non trouvée."
            ));
        }

        return ResponseEntity.ok(bannerOpt.get().getFeaturedHeroes());
    }

    /**
     * Récupère toutes les bannières actives.
     */
    @GetMapping("/active-banners")
    public ResponseEntity<?> getActiveBanners(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        User user = authService.getUserByEmail(email);

        System.out.println("✅ Utilisateur authentifié : " + user.getUsername());

        ArrayList<Banner> activeBanners = summonService.getActiveBanner();
        if (activeBanners.isEmpty()) {
            System.out.println("⚠️ Aucune bannière active trouvée.");
            return ResponseEntity.ok().body(Map.of(
                "error", true,
                "message", "❌ Aucune bannière active."
            ));
        }

        return ResponseEntity.ok(activeBanners);
    }
}
