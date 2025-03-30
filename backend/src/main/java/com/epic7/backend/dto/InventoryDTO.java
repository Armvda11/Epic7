package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Représente l'inventaire d'un joueur dans le jeu.
 * Contient une liste d'équipements disponibles pour le joueur.
 * @author hermas
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class InventoryDTO {
    private List<ExtendedEquipmentDTO> items;
}
