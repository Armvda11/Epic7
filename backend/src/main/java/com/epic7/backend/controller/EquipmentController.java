package com.epic7.backend.controller;

import com.epic7.backend.dto.HeroEquipmentViewDTO;
import com.epic7.backend.dto.InventoryDTO;
import com.epic7.backend.repository.model.PlayerEquipment;
import com.epic7.backend.repository.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.EquipmentService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Contrôleur REST pour gérer les équipements des joueurs.
 * Ce contrôleur permet de récupérer, équiper et déséquiper des équipements.
 * 
 * @author hermas
 */
@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentService equipmentService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    /**
     * Constructeur de la classe EquipmentController.
     *
     * @param equipmentService Le service d'équipement.
     * @param authService      Le service d'authentification.
     * @param jwtUtil          L'utilitaire JWT pour la gestion des tokens.
     */
    public EquipmentController(EquipmentService equipmentService, AuthService authService, JwtUtil jwtUtil) {
        this.equipmentService = equipmentService;
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Utilitaire pour extraire l'utilisateur connecté via le token JWT dans les
     * headers.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @return L'utilisateur connecté.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        return authService.getUserByEmail(jwtUtil.extractEmail(token));
    }

    /**
     * Récupère tous les équipements de l'utilisateur connecté.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @return Une liste d'équipements de l'utilisateur.
     */
    @GetMapping("/my")
    public ResponseEntity<List<PlayerEquipment>> getAll(HttpServletRequest request) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(equipmentService.getAllEquipmentsByUser(user));
    }

    /**
     * Récupère tous les équipements équipés sur un héros donné.
     *
     * @param heroId  L'ID du héros.
     * @param request La requête HTTP contenant le token JWT.
     * @return Une liste d'équipements équipés sur le héros.
     */
    @GetMapping("/hero/{heroId}")
    public ResponseEntity<List<PlayerEquipment>> getByHero(@PathVariable Long heroId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(equipmentService.getEquippedItemsForHero(heroId, user));
    }

    /**
     * Équipe un équipement sur un héros.
     *
     * @param equipmentId L'ID de l'équipement.
     * @param heroId      L'ID du héros.
     * @param request     La requête HTTP contenant le token JWT.
     * @return Un message de succès ou d'erreur.
     */
    @PostMapping("/{equipmentId}/equip/{heroId}")
    public ResponseEntity<String> equip(@PathVariable Long equipmentId, @PathVariable Long heroId,
            HttpServletRequest request) {
        User user = getCurrentUser(request);
        try {
            equipmentService.equipItem(user, equipmentId, heroId);
            return ResponseEntity.ok("✅ Équipement équipé avec succès");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Déséquipe un équipement d'un héros.
     *
     * @param equipmentId L'ID de l'équipement.
     * @param request     La requête HTTP contenant le token JWT.
     * @return Un message de succès ou d'erreur.
     */
    @PostMapping("/{equipmentId}/unequip")
    public ResponseEntity<String> unequip(@PathVariable Long equipmentId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        try {
            equipmentService.unequipItem(user, equipmentId);
            return ResponseEntity.ok("✅ Équipement déséquipé");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Récupère l'inventaire d'un héros spécifique.
     * Les équipements équipés sur le héros sont inclus dans la réponse.
     * @param heroId  L'ID du héros.
     * @param request La requête HTTP contenant le token JWT.
     * @return L'inventaire du héros.
     */
    @GetMapping("/hero/{heroId}/inventory")
    public ResponseEntity<HeroEquipmentViewDTO> getHeroInventory(@PathVariable Long heroId,
            HttpServletRequest request) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(equipmentService.getHeroEquipmentView(user, heroId));
    }

    /**
     * Récupère l'inventaire complet de l'utilisateur.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @return L'inventaire complet de l'utilisateur.
     */
    @GetMapping("/inventory")
    public ResponseEntity<InventoryDTO> getFullInventory(HttpServletRequest request) {

        User user = getCurrentUser(request);
        return ResponseEntity.ok(equipmentService.getFullInventory(user));
    }
}
