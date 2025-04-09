package com.epic7.backend.utils;

import com.epic7.backend.dto.ShopItemDTO;
import com.epic7.backend.model.ShopItem;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Component
public class ShopItemMapper {
    /**
     * Convertit un objet ShopItem en un objet ShopItemDTO.
     *
     * @param item L'objet ShopItem à convertir.
     * @return L'objet ShopItemDTO résultant.
     */
    public ShopItemDTO toDto(ShopItem item) {
        return new ShopItemDTO(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getPriceInDiamonds(),
                item.getPriceInGold(),
                item.getStartAt(),
                item.getEndAt(),
                item.getMaxPurchasePerUser(),
                item.getType()
        );
    }

    public List<ShopItemDTO> toDtoList(List<ShopItem> items) {
        return items.stream().map(this::toDto).collect(Collectors.toList());
    }
}