package com.epic7.backend.service;

import com.epic7.backend.dto.EquipmentDTO;
import com.epic7.backend.dto.ExtendedEquipmentDTO;
import com.epic7.backend.dto.HeroEquipmentViewDTO;
import com.epic7.backend.dto.InventoryDTO;
import com.epic7.backend.model.*;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final PlayerEquipmentRepository playerEquipmentRepository;
    private final PlayerHeroRepository playerHeroRepository;
    private final UserRepository userRepository;

    public EquipmentService(EquipmentRepository equipmentRepository,
                            PlayerEquipmentRepository playerEquipmentRepository,
                            PlayerHeroRepository playerHeroRepository,
                            UserRepository userRepository) {
        this.equipmentRepository = equipmentRepository;
        this.playerEquipmentRepository = playerEquipmentRepository;
        this.playerHeroRepository = playerHeroRepository;
        this.userRepository = userRepository;
    }

    /**
     * Récupère tous les équipements d’un utilisateur (inventaire complet).
     */
    public List<PlayerEquipment> getAllEquipmentsByUser(User user) {
        return playerEquipmentRepository.findByUser(user);
    }

    /**
     * Récupère tous les équipements équipés sur un héros donné.
     */
    public List<PlayerEquipment> getEquippedItemsForHero(Long playerHeroId, User user) {
        PlayerHero hero = playerHeroRepository.findById(playerHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));

        if (!hero.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Accès non autorisé à ce héros");
        }

        return playerEquipmentRepository.findByPlayerHeroId(playerHeroId);
    }

    /**
     * Équipe un équipement sur un héros si toutes les conditions sont respectées.
     */
    @Transactional
    public void equipItem(User user, Long playerEquipmentId, Long playerHeroId) {
        // Vérifie que l'équipement et le héros appartiennent à l'utilisateur
        PlayerEquipment playerEquipment = playerEquipmentRepository.findById(playerEquipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Équipement joueur introuvable"));

        PlayerHero playerHero = playerHeroRepository.findById(playerHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));

        if (!playerEquipment.getUser().getId().equals(user.getId()) ||
            !playerHero.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Équipement ou héros non appartenant à l'utilisateur");
        }

        if (playerEquipment.isEquipped()) {
            throw new IllegalStateException("Équipement déjà équipé sur un héros");
        }

        // Vérifie que le slot n’est pas déjà utilisé
        boolean slotConflict = playerHero.getOwnedEquipments().stream()
                .anyMatch(eq -> eq.isEquipped() &&
                        eq.getEquipment().getType() == playerEquipment.getEquipment().getType());

        if (slotConflict) {
            throw new IllegalStateException("Ce héros a déjà un équipement de ce type");
        }

        playerEquipment.setPlayerHero(playerHero);
        playerEquipmentRepository.save(playerEquipment);
    }

    /**
     * Déséquipe un équipement du héros auquel il est lié.
     */
    @Transactional
    public void unequipItem(User user, Long playerEquipmentId) {
        PlayerEquipment playerEquipment = playerEquipmentRepository.findById(playerEquipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Équipement introuvable"));

        if (!playerEquipment.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Accès non autorisé à cet équipement");
        }

        if (!playerEquipment.isEquipped()) {
            throw new IllegalStateException("Cet équipement n'est pas actuellement équipé");
        }

        playerEquipment.setPlayerHero(null);
        playerEquipmentRepository.save(playerEquipment);
    }

    /**
     * Calcule les statistiques finales du héros (base + bonus des équipements).
     */
    public String calculateFinalStats(User user, Long playerHeroId) {
        PlayerHero playerHero = playerHeroRepository.findById(playerHeroId)
                .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));

        if (!playerHero.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Accès non autorisé à ce héros");
        }

        Hero base = playerHero.getHero();
        int atk = base.getBaseAttack();
        int def = base.getBaseDefense();
        int spd = base.getBaseSpeed();
        int hp = base.getHealth();

        List<PlayerEquipment> equipped = playerHero.getOwnedEquipments().stream()
                .filter(PlayerEquipment::isEquipped)
                .toList();

        for (PlayerEquipment eq : equipped) {
            Equipment e = eq.getEquipment();
            atk += e.getAttackBonus();
            def += e.getDefenseBonus();
            spd += e.getSpeedBonus();
            hp += e.getHealthBonus();
        }

        return String.format("ATK: %d | DEF: %d | SPD: %d | HP: %d", atk, def, spd, hp);
    }

    /**
     * Méthode utilitaire : vérifie si un utilisateur est bien propriétaire d’un équipement
     */
    public boolean ownsEquipment(User user, Long playerEquipmentId) {
        return playerEquipmentRepository.findById(playerEquipmentId)
                .filter(e -> e.getUser().getId().equals(user.getId()))
                .isPresent();
    }

    /**
     * Méthode utilitaire : vérifie si un héros appartient à l'utilisateur
     */
    public boolean ownsHero(User user, Long playerHeroId) {
        return playerHeroRepository.findById(playerHeroId)
                .filter(h -> h.getUser().getId().equals(user.getId()))
                .isPresent();
    }



public HeroEquipmentViewDTO getHeroEquipmentView(User user, Long playerHeroId) {
    PlayerHero hero = playerHeroRepository.findById(playerHeroId)
        .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));

    if (!hero.getUser().getId().equals(user.getId())) {
        throw new SecurityException("Ce héros ne vous appartient pas.");
    }

    List<PlayerEquipment> allEquipments = playerEquipmentRepository.findByUser(user);

    List<EquipmentDTO> equipped = allEquipments.stream()
        .filter(eq -> eq.getPlayerHero() != null && eq.getPlayerHero().getId().equals(playerHeroId))
        .map(this::mapToDTO)
        .toList();

    List<EquipmentDTO> available = allEquipments.stream()
        .filter(eq -> eq.getPlayerHero() == null)
        .map(this::mapToDTO)
        .toList();

    return new HeroEquipmentViewDTO(
        hero.getId(),
        hero.getHero().getName(),
        equipped,
        available
    );
}

private EquipmentDTO mapToDTO(PlayerEquipment eq) {
    Equipment e = eq.getEquipment();
    return new EquipmentDTO(
        eq.getId(),
        e.getName(),
        e.getType().name(),
        e.getRarity(),
        eq.getLevel(),
        eq.getExperience(),
        eq.isEquipped(),
        e.getAttackBonus(),
        e.getDefenseBonus(),
        e.getSpeedBonus(),
        e.getHealthBonus()
    );
}



public InventoryDTO getFullInventory(User user) {
    List<PlayerEquipment> all = playerEquipmentRepository.findByUser(user);



    List<ExtendedEquipmentDTO> items = all.stream().map(eq -> {
        Equipment e = eq.getEquipment();
        return new ExtendedEquipmentDTO(
            eq.getId(),
            e.getName(),
            e.getType().name(),
            e.getRarity(),
            e.getAttackBonus(),
            e.getDefenseBonus(),
            e.getSpeedBonus(),
            e.getHealthBonus(),
            eq.getLevel(),
            eq.getExperience(),
            eq.isEquipped(),
            eq.getPlayerHero() != null ? eq.getPlayerHero().getId() : null,
            eq.getPlayerHero() != null ? eq.getPlayerHero().getHero().getName() : null
        );
    }).toList();

    return new InventoryDTO(items);
}
}
