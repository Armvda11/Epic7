package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Représente une bannière de héros dans le jeu.
 * Contient des informations sur la période de disponibilité et les héros en vedette.
 * @author hermas
 */
// TODO : Ajouter une image pour la bannière
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Identifiant unique de la bannière

    private String name; // Nom de la bannière (ex. "Bannière de Noël", "Bannière de la Saint-Valentin", etc.)

    @CreationTimestamp
    private LocalDateTime createdAt; // Date de création de la bannière

    @Column(name = "starts_at")
    private LocalDateTime startsAt; // Date de début de la bannière
    @Column(name = "ends_at")
    private LocalDateTime endsAt; // Date de fin de la bannière

    // Liste des héros en vedette dans la bannière
    // Utilisation de @ManyToMany pour représenter la relation entre les bannières et les héros
    // Chaque bannière peut avoir plusieurs héros en vedette et chaque héros peut apparaître dans plusieurs bannières
    @ManyToMany
    @JoinTable(
        name = "banner_heroes",
        joinColumns = @JoinColumn(name = "banner_id"),
        inverseJoinColumns = @JoinColumn(name = "hero_id")
    )
    private List<Hero> featuredHeroes; // Liste des héros en vedette dans la bannière

    /**
     * Vérifie si la bannière est active en fonction de la date actuelle.
     * La bannière est considérée comme active si la date actuelle est comprise entre
     * la date de début et la date de fin de la bannière.
     * @return true si la bannière est active, false sinon
     */
    public boolean isActive() {
        LocalDateTime now = LocalDateTime.now();
        return (startsAt == null || startsAt.isBefore(now)) &&
               (endsAt == null || endsAt.isAfter(now));
    }
}
