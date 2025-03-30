package com.epic7.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;



/**
 * Représente un utilisateur du jeu.
 * Contient des informations sur le compte, les héros possédés, etc.
 */
@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @NotBlank
    @Email
    private String email;

    @Column(nullable = false)
    @NotBlank
    private String password;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private int level = 1; // Niveau de l'utilisateur (ex. 1, 2, 3, etc.)

    @Column(nullable = false)
    private int gold = 0; // Quantité d'or possédée par l'utilisateur (ex. 0, 100, 1000, etc.)

    @Column(nullable = false)
    private int diamonds = 0; // Quantité de diamants possédée par l'utilisateur (ex. 0, 100, 1000, etc.)
    //( diamants utiliesés pour acheter des objets dans la boutique, et invoquer des héros)

    @Column(nullable = false)
    private Integer energy = 100; // Quantité d'énergie possédée par l'utilisateur (ex. 0, 100, 1000, etc.)
    //( énergie utilisée pour faire des combats, et des quêtes)
    //( l'énergie se régénère automatiquement au fil du temps, et peut être achetée dans la boutique)


    
    @Column(name = "last_energy_update")
    private Instant lastEnergyUpdate = Instant.now(); // Date de la dernière mise à jour de l'énergie
    // (a modifier lorsque l'énergie est utiliser , achetée, ou régénérée)

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlayerHero> ownedHeroes = new ArrayList<>(); // Liste des héros possédés par l'utilisateur

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GuildMembership> guildMemberships = new ArrayList<>(); // Liste des guildes auxquelles l'utilisateur appartient

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlayerEquipment> equipments = new ArrayList<>(); // Liste des équipements possédés par l'utilisateur


    /**
     * Ajoute un héros à la liste des héros possédés par l'utilisateur.
     * @param playerHero Le héros à ajouter.
     */
    public void addHero(PlayerHero playerHero) {
        ownedHeroes.add(playerHero);
        playerHero.setUser(this);
    }
}
