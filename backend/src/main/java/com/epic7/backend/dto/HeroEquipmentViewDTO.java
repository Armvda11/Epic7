package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class HeroEquipmentViewDTO {
    private Long heroId;
    private String heroName;
    private List<EquipmentDTO> equippedItems;
    private List<EquipmentDTO> availableItems;
}
