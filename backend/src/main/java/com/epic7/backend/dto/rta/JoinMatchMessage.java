package com.epic7.backend.dto.rta;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinMatchMessage {
    private List<Long> heroIds;  // IDs des héros sélectionnés par le joueur
}