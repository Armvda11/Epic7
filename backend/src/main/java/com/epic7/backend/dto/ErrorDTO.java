package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Représente une erreur dans le système.
 * Contient un code d'erreur, un message d'erreur et des données supplémentaires.
 * @author corentin
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorDTO {
    private String errorCode;
    private String errorMessage;
    private Object additionalData;

    /**
     * Constructeur de la classe ErrorDTO.
     * @param errorCode Le code d'erreur.
     * @param errorMessage Le message d'erreur.
     */
    public ErrorDTO(String errorCode, String errorMessage) {
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.additionalData = null; // Valeur par défaut
    }
}