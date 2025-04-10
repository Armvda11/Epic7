package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Représente une réponse du système, qu'elle soit un succès ou une erreur.
 * Contient un code, un message et des données supplémentaires.
 * @author corentin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResponseDTO {
    private String code;
    private String message;
    private Object data;
    private boolean success;

    /**
     * Constructeur pour une réponse simple avec code et message.
     * @param code Le code de la réponse.
     * @param message Le message de la réponse.
     * @param success Indique si c'est un succès ou une erreur.
     */
    public ResponseDTO(String code, String message, boolean success) {
        this.code = code;
        this.message = message;
        this.data = null;
        this.success = success;
    }

    /**
     * Constructeur pour une réponse d'erreur.
     * @param errorCode Le code d'erreur.
     * @param errorMessage Le message d'erreur.
     */
    public static ResponseDTO error(String errorCode, String errorMessage) {
        return new ResponseDTO(errorCode, errorMessage, null, false);
    }

    /**
     * Constructeur pour une réponse d'erreur avec données supplémentaires.
     * @param errorCode Le code d'erreur.
     * @param errorMessage Le message d'erreur.
     * @param data Les données supplémentaires.
     */
    public static ResponseDTO error(String errorCode, String errorMessage, Object data) {
        return new ResponseDTO(errorCode, errorMessage, data, false);
    }

    /**
     * Constructeur pour une réponse de succès.
     * @param successCode Le code de succès.
     * @param successMessage Le message de succès.
     */
    public static ResponseDTO success(String successCode, String successMessage) {
        return new ResponseDTO(successCode, successMessage, null, true);
    }

    /**
     * Constructeur pour une réponse de succès avec données.
     * @param successCode Le code de succès.
     * @param successMessage Le message de succès.
     * @param data Les données de la réponse.
     */
    public static ResponseDTO success(String successCode, String successMessage, Object data) {
        return new ResponseDTO(successCode, successMessage, data, true);
    }
}
