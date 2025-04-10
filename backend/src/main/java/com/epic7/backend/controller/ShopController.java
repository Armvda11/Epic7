package com.epic7.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.ShopService;
import com.epic7.backend.utils.JwtUtil;


import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/shop")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;
    private final JwtUtil jwtUtil;
    private final AuthService authService;



    private User getUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        return authService.getUserByEmail(jwtUtil.extractEmail(token));
    }

    @GetMapping("/items")
    public ResponseEntity<?> getAvailableItems(HttpServletRequest request) {
        return ResponseEntity.ok(shopService.toDtoList(shopService.getAvailableItems()));
    }

    @PostMapping("/buy/{itemId}")
    public ResponseEntity<?> purchase(@PathVariable Long itemId, HttpServletRequest request) {
        User user = getUser(request);
        try {
            String result = shopService.purchaseItem(user, itemId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
}
