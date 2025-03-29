package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserProfileResponse {
    private String username;
    private int level;
    private int gold;
    private int diamonds;
    private int energy;
}
