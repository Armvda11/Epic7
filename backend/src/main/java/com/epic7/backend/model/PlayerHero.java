    package com.epic7.backend.model;

    import jakarta.persistence.*;
    import lombok.*;
    import java.time.Instant;
    import java.util.ArrayList;
    import java.util.List;
    import com.fasterxml.jackson.annotation.JsonIgnore;

    /**
     * Représente un héros appartenant à un joueur (niveau, équipements, etc.).
     * @author hermas
     */
    @Entity
    @Table(name = "player_heroes")
    @Getter @Setter
    @NoArgsConstructor @AllArgsConstructor
    public class PlayerHero {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        /**
         * Référence vers le joueur possédant ce héros.
         */
        @ManyToOne(optional = false)
        @JoinColumn(name = "user_id", nullable = false)
        @JsonIgnore
        private User user;

        /**
         * Référence vers le héros de base.
         */
        @ManyToOne(optional = false)
        @JoinColumn(name = "hero_id", nullable = false)
        private Hero hero;

        @Column(nullable = false)
        private int level = 1;

        @Column(nullable = false)
        private int experience = 0;

        @Column(nullable = false)
        private int awakeningLevel = 0;

        @Column(nullable = false)
        private boolean isLocked = false;

        /**
         * Liste des équipements associés à ce héros.
         */
        @OneToMany(mappedBy = "playerHero", cascade = CascadeType.ALL, orphanRemoval = true)
        private List<PlayerEquipment> ownedEquipments = new ArrayList<>();

        /**
         * Date d'obtention du héros.
         */
        @Column(name = "obtained_at", nullable = false, updatable = false)
        private Instant obtainedAt = Instant.now();

        public PlayerHero(User user, Hero hero) {
            this.user = user;
            this.hero = hero;
        }

        /**
         * Avant la suppression du héros, on détache les équipements pour éviter les références orphelines.
         */
        @PreRemove
        private void detachEquipmentsBeforeDeletion() {
            for (PlayerEquipment eq : ownedEquipments) {
                eq.setPlayerHero(null);
            }
        }
    }
