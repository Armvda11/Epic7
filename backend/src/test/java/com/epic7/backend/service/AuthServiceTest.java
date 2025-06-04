package com.epic7.backend.service;

import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.repository.model.User;
import com.epic7.backend.utils.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour le service d'authentification
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setUsername("testuser");
        testUser.setPassword("encoded_password");
        testUser.setLevel(1);
        testUser.setGold(1000);
        testUser.setDiamonds(50);
        testUser.setEnergy(100);
    }

    @Test
    void authenticateUser_ValidCredentials_ShouldReturnUserInfo() {
        // Given
        String email = "test@example.com";
        String password = "password123";
        String token = "jwt_token";

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(password, testUser.getPassword())).thenReturn(true);
        when(jwtUtil.generateToken(email)).thenReturn(token);

        // When
        Optional<Object> result = Optional.ofNullable(authService.authenticateAndGetUserInfo(email, password));

        // Then
        assertTrue(result.isPresent());
        verify(userRepository).findByEmail(email);
        verify(passwordEncoder).matches(password, testUser.getPassword());
        verify(jwtUtil).generateToken(email);
    }

    @Test
    void authenticateUser_InvalidCredentials_ShouldReturnEmpty() {
        // Given
        String email = "test@example.com";
        String password = "wrong_password";

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(password, testUser.getPassword())).thenReturn(false);

        // When
        Optional<Object> result = Optional.ofNullable(authService.authenticateAndGetUserInfo(email, password));

        // Then
        assertFalse(result.isPresent());
        verify(userRepository).findByEmail(email);
        verify(passwordEncoder).matches(password, testUser.getPassword());
        verify(jwtUtil, never()).generateToken(anyString());
    }

    @Test
    void authenticateUser_UserNotFound_ShouldReturnEmpty() {
        // Given
        String email = "nonexistent@example.com";
        String password = "password123";

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        // When
        Optional<Object> result = Optional.ofNullable(authService.authenticateAndGetUserInfo(email, password));

        // Then
        assertFalse(result.isPresent());
        verify(userRepository).findByEmail(email);
        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(jwtUtil, never()).generateToken(anyString());
    }

    @Test
    void getUserByEmail_ExistingUser_ShouldReturnUser() {
        // Given
        String email = "test@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));

        // When
        User result = authService.getUserByEmail(email);

        // Then
        assertNotNull(result);
        assertEquals(testUser.getId(), result.getId());
        assertEquals(testUser.getEmail(), result.getEmail());
        verify(userRepository).findByEmail(email);
    }

    @Test
    void getUserByEmail_NonExistingUser_ShouldReturnNull() {
        // Given
        String email = "nonexistent@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        // When
        User result = authService.getUserByEmail(email);

        // Then
        assertNull(result);
        verify(userRepository).findByEmail(email);
    }

    @Test
    void validateToken_ValidToken_ShouldReturnTrue() {
        // Given
        String token = "valid_token";
        when(jwtUtil.validateToken(token)).thenReturn(true);

        // When
        boolean result = authService.validateToken(token);

        // Then
        assertTrue(result);
        verify(jwtUtil).validateToken(token);
    }

    @Test
    void validateToken_InvalidToken_ShouldReturnFalse() {
        // Given
        String token = "invalid_token";
        when(jwtUtil.validateToken(token)).thenReturn(false);

        // When
        boolean result = authService.validateToken(token);

        // Then
        assertFalse(result);
        verify(jwtUtil).validateToken(token);
    }

    @Test
    void extractEmail_ValidToken_ShouldReturnEmail() {
        // Given
        String token = "valid_token";
        String email = "test@example.com";
        when(jwtUtil.extractEmail(token)).thenReturn(email);

        // When
        String result = authService.extractEmail(token);

        // Then
        assertEquals(email, result);
        verify(jwtUtil).extractEmail(token);
    }
}
