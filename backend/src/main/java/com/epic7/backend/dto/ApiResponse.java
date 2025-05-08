package com.epic7.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Standard API response wrapper for consistent response format
 * @param <T> Type of data returned in the response
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApiResponse<T> {
    private String code;
    private String message;
    private T data;
    private boolean success;

    public ApiResponse() {
    }

    public ApiResponse(String code, String message, T data, boolean success) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.success = success;
    }

    /**
     * Create a success response
     * @param code The success code
     * @param message The success message
     * @param data The response data
     * @param <T> The type of data
     * @return A success ApiResponse
     */
    public static <T> ApiResponse<T> success(String code, String message, T data) {
        return new ApiResponse<>(code, message, data, true);
    }

    /**
     * Create a success response without data
     * @param code The success code
     * @param message The success message
     * @return A success ApiResponse
     */
    public static <T> ApiResponse<T> success(String code, String message) {
        return new ApiResponse<>(code, message, null, true);
    }

    /**
     * Create an error response
     * @param code The error code
     * @param message The error message
     * @param <T> The type of data
     * @return An error ApiResponse
     */
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(code, message, null, false);
    }

    /**
     * Create an error response with data
     * @param code The error code
     * @param message The error message
     * @param data The error data
     * @param <T> The type of data
     * @return An error ApiResponse
     */
    public static <T> ApiResponse<T> error(String code, String message, T data) {
        return new ApiResponse<>(code, message, data, false);
    }
}