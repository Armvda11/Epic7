package com.epic7.backend.exception;

import lombok.Getter;

@Getter
public class FriendRequestException extends RuntimeException {
    private final String errorCode;

    public FriendRequestException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }
}