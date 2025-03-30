package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * Représente la vue d'équipement d'un héros dans le jeu.
 * Contient des informations sur le héros, y compris son nom,
 * les objets équipés et les objets disponibles.
 * @author hermas
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class HeroEquipmentViewDTO {
    private Long heroId;
    private String heroName;
    private List<EquipmentDTO> equippedItems;
    private List<EquipmentDTO> availableItems;
}
