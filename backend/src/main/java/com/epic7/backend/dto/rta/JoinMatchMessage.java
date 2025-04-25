package com.epic7.backend.dto.rta;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinMatchMessage {
    // la liste des 4 IDs de PlayerHero du client
    private List<Long> heroIds;
}