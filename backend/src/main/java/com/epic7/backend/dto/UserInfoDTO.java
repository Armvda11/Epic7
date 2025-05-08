package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for basic user information used in chat messages.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDTO {
    private Long id;
    private String username;
}