package com.epic7.backend.config.seeds;

import java.util.List;

import org.springframework.stereotype.Component;

import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.enums.EquipmentType;
import com.epic7.backend.repository.EquipmentRepository;

import lombok.*;

@Component
@RequiredArgsConstructor
public class EquipmentSeeder {
    private final EquipmentRepository equipRepo;

    public void seedEquipment() {
        if (equipRepo.count() == 0) {
            equipRepo.saveAll(List.of(
                equipment("Épée de feu", EquipmentType.WEAPON, "RARE", 150, 0, 0, 0),
                equipment("Armure lourde", EquipmentType.ARMOR, "NORMAL", 0, 120, 0, 50),
                equipment("Bottes agiles", EquipmentType.BOOTS, "EPIC", 0, 0, 60, 0)
            ));
            System.out.println("✅ Équipements créés.");
        }
    }

    private Equipment equipment(String name, EquipmentType type, String rarity, int atk, int def, int spd, int hp) {
        return Equipment.builder()
                .name(name)
                .type(type)
                .rarity(rarity)
                .attackBonus(atk)
                .defenseBonus(def)
                .speedBonus(spd)
                .healthBonus(hp)
                .level(1)
                .experience(0)
                .build();
    }
}
