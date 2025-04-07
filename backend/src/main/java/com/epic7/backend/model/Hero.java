package com.epic7.backend.model;

import java.util.ArrayList;
import java.util.List;

import com.epic7.backend.model.enums.Element;
import com.epic7.backend.model.enums.Rarity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * Entité représentant un héros disponible dans le jeu.
 * Chaque héros a un nom, un élément, une rareté,
 * des statistiques de base (attaque, défense, vitesse, vie)
 * et un code unique généré automatiquement à partir de son nom.
 * Le code est utilisé pour les images ou la correspondance front-end.
 * @author hermas
 */
@Entity
@Table(name = "heroes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Hero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String name; // Nom du héros (unique)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Element element; // Élément (Feu, Glace, etc.)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rarity rarity; // Rareté du héros (★, ★★, etc.)

    @Min(0)
    @Column(name = "base_attack", nullable = false)
    private int baseAttack;

    @Min(0)
    @Column(name = "base_defense", nullable = false)
    private int baseDefense;

    @Min(0)
    @Column(name = "base_speed", nullable = false)
    private int baseSpeed;

    @Min(1)
    @Column(nullable = false)
    private int health;


    @OneToMany(mappedBy = "hero", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Skill> skills = new ArrayList<>();

    @ManyToMany(mappedBy = "featuredHeroes")
    @JsonIgnore // Empêche la sérialisation de la relation inverse
    private List<Banner> banners;

    /**
     * Code unique généré automatiquement à partir du nom
     * Utilisé pour les images ou la correspondance front.
     */
    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @PrePersist
    public void generateCodeIfNull() {
        if (this.code == null || this.code.isEmpty()) {
            this.code = generateCodeFromName();
        }
    }

    private String generateCodeFromName() {
        return name
            .toUpperCase()
            .replaceAll("\\s+", "-")          // Remplace les espaces par des tirets
            .replaceAll("[^A-Z0-9\\-]", "");  // Supprime les caractères spéciaux
    }
}
