package com.epic7.backend.model;


public class SummonResult {
    private final Hero hero;
    private final Equipment equipment;

    public SummonResult(Hero hero, Equipment equipment) {
        if (hero != null && equipment != null) {
            throw new IllegalArgumentException("Un SummonResult ne peut pas contenir à la fois un héros et un équipement.");
        }
        if (hero == null && equipment == null) {
            throw new IllegalArgumentException("Un SummonResult doit contenir soit un héros, soit un équipement.");
        }
        this.hero = hero;
        this.equipment = equipment;
    }

    public SummonResult(Hero hero) {
        this(hero, null);
    }

    public SummonResult(Equipment equipment) {
        this(null, equipment);
    }

    public boolean isHero() {
        return hero != null;
    }

    public boolean isEquipment() {
        return equipment != null;
    }

    public Hero getHero() {
        if (!isHero()) {
            throw new IllegalStateException("Ce SummonResult ne contient pas de héros.");
        }
        return hero;
    }

    public Equipment getEquipment() {
        if (!isEquipment()) {
            throw new IllegalStateException("Ce SummonResult ne contient pas d'équipement.");
        }
        return equipment;
    }
}
