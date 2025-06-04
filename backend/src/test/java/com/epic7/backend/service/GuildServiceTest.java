package com.epic7.backend.service;

import com.epic7.backend.dto.GuildDTO;
import com.epic7.backend.dto.GuildInfoDTO;
import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.GuildRole;
import com.epic7.backend.repository.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires pour GuildService.
 * Teste les fonctionnalités de gestion des guildes incluant la création,
 * l'adhésion, la sortie, les invitations et les demandes d'adhésion.
 */
@ExtendWith(MockitoExtension.class)
class GuildServiceTest {

    @Mock
    private GuildRepository guildRepository;

    @Mock
    private GuildMembershipRepository guildMembershipRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GuildBanRepository guildBanRepository;

    @Mock
    private MessageService messageService;

    @Mock
    private ChatService chatService;

    @InjectMocks
    private GuildService guildService;

    private User testUser;
    private Guild testGuild;
    private GuildMembership testMembership;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testUser");
        testUser.setEmail("test@example.com");

        testGuild = new Guild();
        testGuild.setId(1L);
        testGuild.setName("Test Guild");
        testGuild.setDescription("Test Description");
        testGuild.setMaxMembers(50);
        testGuild.setOpen(true);
        testGuild.setMembers(new ArrayList<>());
       
        testMembership = new GuildMembership();
        testMembership.setId(1L);
        testMembership.setGuild(testGuild);
        testMembership.setUser(testUser);
        testMembership.setRole(GuildRole.LEADER);
        testMembership.setJoinDate(Instant.now());
    }

    @Test
    void createGuild_Success() {
        // Given
        when(guildRepository.findByName("Test Guild")).thenReturn(Optional.empty());
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.save(any(Guild.class))).thenReturn(testGuild);
        when(guildMembershipRepository.save(any(GuildMembership.class))).thenReturn(testMembership);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        Guild result = guildService.createGuild(testUser, "Test Guild", "Test Description");

        // Then
        assertNotNull(result);
        assertEquals("Test Guild", result.getName());
        assertEquals("Test Description", result.getDescription());
        verify(guildRepository).save(any(Guild.class));
        verify(guildMembershipRepository).save(any(GuildMembership.class));
        verify(userRepository).save(testUser);
    }

    @Test
    void createGuild_UserAlreadyInGuild_ThrowsException() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(testMembership);

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.createGuild(testUser, "Test Guild", "Test Description"));
        
        assertEquals("L'utilisateur appartient déjà à une guilde.", exception.getMessage());
        verify(guildRepository, never()).save(any());
    }

    @Test
    void createGuild_GuildNameAlreadyExists_ThrowsException() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.findByName("Test Guild")).thenReturn(Optional.of(testGuild));

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
            () -> guildService.createGuild(testUser, "Test Guild", "Test Description"));
        
        assertEquals("Ce nom de guilde est déjà utilisé.", exception.getMessage());
        verify(guildRepository, never()).save(any());
    }

    @Test
    void joinGuild_Success() {
        // Given
        testUser.setGuildMembership(null);
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));
        when(guildBanRepository.findByGuildIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        // When
        guildService.joinGuild(testUser, 1L);

        // Then
        verify(guildRepository).findById(1L);
        verify(guildBanRepository).findByGuildIdAndUserId(1L, 1L);
    }

    @Test
    void joinGuild_UserAlreadyInGuild_ThrowsException() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(testMembership);

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.joinGuild(testUser, 1L));
        
        assertEquals("L'utilisateur est déjà dans une guilde.", exception.getMessage());
    }

    @Test
    void joinGuild_GuildNotFound_ThrowsException() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
            () -> guildService.joinGuild(testUser, 1L));
        
        assertEquals("Guilde introuvable", exception.getMessage());
    }

    @Test
    void joinGuild_UserBanned_ThrowsException() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));
        when(guildBanRepository.findByGuildIdAndUserId(1L, 1L)).thenReturn(Optional.of(new GuildBan()));

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.joinGuild(testUser, 1L));
        
        assertEquals("L'utilisateur est banni de cette guilde.", exception.getMessage());
    }

    @Test
    void joinGuild_GuildFull_ThrowsException() {
        // Given
        testGuild.setMaxMembers(1);
        testGuild.getMembers().add(testMembership); // Guild is now full
        
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));
        when(guildBanRepository.findByGuildIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.joinGuild(testUser, 1L));
        
        assertEquals("La guilde est pleine.", exception.getMessage());
    }

    @Test
    void joinGuild_GuildClosed_ThrowsException() {
        // Given
        testGuild.setOpen(false);
        
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));
        when(guildBanRepository.findByGuildIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.joinGuild(testUser, 1L));
        
        assertEquals("La guilde est fermée.", exception.getMessage());
    }

    @Test
    void leaveGuild_Success() {
        // Given
        testUser.setGuildMembership(testMembership);
        testGuild.getMembers().add(testMembership);

        // When
        guildService.leaveGuild(testUser);

        // Then
        assertNull(testUser.getGuildMembership());
        verify(guildMembershipRepository).delete(testMembership);
        verify(userRepository).save(testUser);
    }

    @Test
    void leaveGuild_UserNotInGuild_ThrowsException() {
        // Given
        testUser.setGuildMembership(null);

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.leaveGuild(testUser));
        
        assertEquals("L'utilisateur n'appartient à aucune guilde.", exception.getMessage());
    }

    @Test
    void getGuildById_Success() {
        // Given
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));

        // When
        Optional<Guild> result = guildService.getGuildById(1L);

        // Then
        assertTrue(result.isPresent());
        assertEquals(testGuild, result.get());
        verify(guildRepository).findById(1L);
    }

    @Test
    void getGuildById_NotFound() {
        // Given
        when(guildRepository.findById(1L)).thenReturn(Optional.empty());

        // When
        Optional<Guild> result = guildService.getGuildById(1L);

        // Then
        assertFalse(result.isPresent());
        verify(guildRepository).findById(1L);
    }

    @Test
    void getMembers_Success() {
        // Given
        testGuild.getMembers().add(testMembership);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));

        // When
        List<GuildMembership> result = guildService.getMembers(1L);

        // Then
        assertEquals(1, result.size());
        assertEquals(testMembership, result.get(0));
        verify(guildRepository).findById(1L);
    }

    @Test
    void getMembers_GuildNotFound_ThrowsException() {
        // Given
        when(guildRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
            () -> guildService.getMembers(1L));
        
        assertEquals("Guilde introuvable", exception.getMessage());
    }

    @Test
    void isMemberOfGuild_True() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(testMembership);

        // When
        boolean result = guildService.isMemberOfGuild(testUser, 1L);

        // Then
        assertTrue(result);
        verify(guildMembershipRepository).findByUser(testUser);
    }

    @Test
    void isMemberOfGuild_False() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);

        // When
        boolean result = guildService.isMemberOfGuild(testUser, 1L);

        // Then
        assertFalse(result);
        verify(guildMembershipRepository).findByUser(testUser);
    }

    @Test
    void searchGuildsByName_Success() {
        // Given
        List<Guild> guilds = Arrays.asList(testGuild);
        when(guildRepository.searchByNameContaining("Test")).thenReturn(guilds);

        // When
        List<GuildInfoDTO> result = guildService.searchGuildsByName("Test");

        // Then
        assertEquals(1, result.size());
        assertEquals("Test Guild", result.get(0).getName());
        verify(guildRepository).searchByNameContaining("Test");
    }

    @Test
    void getUserGuildDTO_Success() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(testMembership);

        // When
        Optional<GuildDTO> result = guildService.getUserGuildDTO(testUser, true);

        // Then
        assertTrue(result.isPresent());
        assertEquals("LEADER", result.get().getUserRole());
        verify(guildMembershipRepository).findByUser(testUser);
    }

    @Test
    void getUserGuildDTO_UserNotInGuild() {
        // Given
        when(guildMembershipRepository.findByUser(testUser)).thenReturn(null);

        // When
        Optional<GuildDTO> result = guildService.getUserGuildDTO(testUser, true);

        // Then
        assertFalse(result.isPresent());
        verify(guildMembershipRepository).findByUser(testUser);
    }

    @Test
    void acceptGuildInvite_Success() {
        // Given
        testUser.setGuildMembership(null);
        testGuild.addPendingInvitation(testUser.getId());
        
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));
        when(guildMembershipRepository.save(any(GuildMembership.class))).thenReturn(testMembership);
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(guildRepository.save(any(Guild.class))).thenReturn(testGuild);

        // When
        guildService.acceptGuildInvite(testUser, 1L);

        // Then
        verify(guildMembershipRepository).save(any(GuildMembership.class));
        verify(userRepository).save(testUser);
        verify(guildRepository).save(testGuild);
    }

    @Test
    void acceptGuildInvite_UserAlreadyInGuild_ThrowsException() {
        // Given
        testUser.setGuildMembership(testMembership);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.acceptGuildInvite(testUser, 1L));
        
        assertEquals("Vous êtes déjà membre d'une guilde", exception.getMessage());
    }

    @Test
    void acceptGuildInvite_GuildNotFound_ThrowsException() {
        // Given
        when(guildRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
            () -> guildService.acceptGuildInvite(testUser, 1L));
        
        assertEquals("Guilde introuvable", exception.getMessage());
    }

    @Test
    void requestToJoinGuild_Success() {
        // Given
        testUser.setGuildMembership(null);
        User leader = new User();
        leader.setId(2L);
        GuildMembership leaderMembership = new GuildMembership();
        leaderMembership.setUser(leader);
        leaderMembership.setRole(GuildRole.LEADER);
        testGuild.getMembers().add(leaderMembership);
        
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));
        when(guildBanRepository.findByGuildIdAndUserId(1L, 1L)).thenReturn(Optional.empty());
        doNothing().when(messageService).sendMessage(any(User.class), any(User.class), anyString(), anyString());

        // When
        guildService.requestToJoinGuild(testUser, 1L);

        // Then
        verify(guildRepository).findById(1L);
        verify(messageService).sendMessage(eq(testUser), eq(leader), anyString(), anyString());
    }

    @Test
    void requestToJoinGuild_UserAlreadyInGuild_ThrowsException() {
        // Given
        testUser.setGuildMembership(testMembership);

        // When & Then
        IllegalStateException exception = assertThrows(IllegalStateException.class, 
            () -> guildService.requestToJoinGuild(testUser, 1L));
        
        assertEquals("Vous êtes déjà membre d'une guilde", exception.getMessage());
    }

    @Test
    void getGuildMemberCount_Success() {
        // Given
        testGuild.getMembers().add(testMembership);
        when(guildRepository.findById(1L)).thenReturn(Optional.of(testGuild));

        // When
        int result = guildService.getGuildMemberCount(1L);

        // Then
        assertEquals(1, result);
        verify(guildRepository).findById(1L);
    }

    @Test
    void getGuildMemberCount_GuildNotFound_ThrowsException() {
        // Given
        when(guildRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, 
            () -> guildService.getGuildMemberCount(1L));
        
        assertEquals("Guild not found", exception.getMessage());
    }
}
