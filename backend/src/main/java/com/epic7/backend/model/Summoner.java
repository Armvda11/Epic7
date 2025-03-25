package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;



@Entity
@Table(name = "summons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Summoner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "hero_id")
    private Hero hero;

    private double proba;

    @Column(name = "summon_date")
    private Instant summonDate = Instant.now();

    public Summoner(User user, Hero hero) {
        this.user = user;
        this.hero = hero;

        switch (hero.getRarity()) {
            case "Normal":
                this.proba = 0.5;
                break;
            case "Rare":
                this.proba = 0.3;
                break;
            case "Epic":
                this.proba = 0.15;
                break;
            case "Legendary":
                this.proba = 0.05;
                break;
            default:
                break;
        }
    }

    public Boolean Summon() {
        float tirage = (float) Math.random();

        if (tirage < proba) {
            PlayerHero playerHero = new PlayerHero(user, hero);
            user.addHero(playerHero);
            return true;
        } else {
            return false;
        }
    }
}