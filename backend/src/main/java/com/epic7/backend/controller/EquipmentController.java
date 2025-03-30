package com.epic7.backend.controller;

import com.epic7.backend.dto.HeroEquipmentViewDTO;
import com.epic7.backend.dto.InventoryDTO;
import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.EquipmentService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentService equipmentService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public EquipmentController(EquipmentService equipmentService, AuthService authService, JwtUtil jwtUtil) {
        this.equipmentService = equipmentService;
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        return authService.getUserByEmail(jwtUtil.extractEmail(token));
    }

    @GetMapping("/my")
    public ResponseEntity<List<PlayerEquipment>> getAll(HttpServletRequest request) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(equipmentService.getAllEquipmentsByUser(user));
    }

    @GetMapping("/hero/{heroId}")
    public ResponseEntity<List<PlayerEquipment>> getByHero(@PathVariable Long heroId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(equipmentService.getEquippedItemsForHero(heroId, user));
    }

    @PostMapping("/{equipmentId}/equip/{heroId}")
    public ResponseEntity<String> equip(@PathVariable Long equipmentId, @PathVariable Long heroId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        try {
            equipmentService.equipItem(user, equipmentId, heroId);
            return ResponseEntity.ok("✅ Équipement équipé avec succès");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

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

    @GetMapping("/hero/{heroId}/inventory")
public ResponseEntity<HeroEquipmentViewDTO> getHeroInventory(@PathVariable Long heroId, HttpServletRequest request) {
    User user = getCurrentUser(request);
    return ResponseEntity.ok(equipmentService.getHeroEquipmentView(user, heroId));
}


@GetMapping("/inventory")
public ResponseEntity<InventoryDTO> getFullInventory(HttpServletRequest request) {
    
    User user = getCurrentUser(request);
    return ResponseEntity.ok(equipmentService.getFullInventory(user));
}
}
