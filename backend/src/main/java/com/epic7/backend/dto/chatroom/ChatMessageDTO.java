package com.epic7.backend.dto.chatroom;

import com.epic7.backend.dto.UserInfoDTO;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.Deflater;
import java.util.zip.Inflater;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Data Transfer Object for chat messages.
 * Used for transferring chat message data between the server and client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private Long roomId;
    private UserInfoDTO sender;
    private String content;
    private String timestamp;
    private boolean isFromCurrentUser;
    private String roomType; // Added roomType field
    
    /**
     * Creates a ChatMessageDTO from a ChatMessage entity
     * 
     * @param message The chat message entity
     * @param currentUserId The ID of the current user (used to determine if the message is from the current user)
     * @return A new ChatMessageDTO
     */
    public static ChatMessageDTO fromEntity(ChatMessage message, Long currentUserId) {
        if (message == null) {
            return null;
        }
        
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(message.getId());
        dto.setRoomId(message.getChatRoom().getId());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp().toString());
        dto.setRoomType(message.getChatRoom().getType().toString()); // Set room type from chat room
        
        // Set sender information
        User sender = message.getSender();
        if (sender != null) {
            UserInfoDTO senderDto = new UserInfoDTO();
            senderDto.setId(sender.getId());
            senderDto.setUsername(sender.getUsername());
            dto.setSender(senderDto);
            
            // Check if message is from current user
            dto.setFromCurrentUser(currentUserId != null && currentUserId.equals(sender.getId()));
        }
        
        return dto;
    }
    
    /**
     * Creates a ChatMessageDTO from a ChatMessage entity without checking if it's from the current user
     * 
     * @param message The chat message entity
     * @return A new ChatMessageDTO with isFromCurrentUser set to false
     */
    public static ChatMessageDTO fromEntity(ChatMessage message) {
        if (message == null) {
            return null;
        }
        
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(message.getId());
        dto.setRoomId(message.getChatRoom().getId());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp().toString());
        dto.setRoomType(message.getChatRoom().getType().toString()); // Set room type from chat room
        
        // Set sender information
        User sender = message.getSender();
        if (sender != null) {
            UserInfoDTO senderDto = new UserInfoDTO();
            senderDto.setId(sender.getId());
            senderDto.setUsername(sender.getUsername());
            dto.setSender(senderDto);
            
            // No current user to compare with, set to false by default
            dto.setFromCurrentUser(false);
        }
        
        return dto;
    }
    
    /**
     * Compresses a string using ZLIB algorithm and returns a Base64 encoded result
     * Used for efficiently transmitting large message content
     * 
     * @param input The string to compress
     * @return Base64 encoded compressed string
     */
    public static String compressString(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }
        
        try {
            // Convert string to bytes
            byte[] inputBytes = input.getBytes(StandardCharsets.UTF_8);
            
            // Create deflater for compression
            Deflater deflater = new Deflater();
            deflater.setInput(inputBytes);
            deflater.finish();
            
            // Prepare output buffer
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream(inputBytes.length);
            byte[] buffer = new byte[1024];
            
            // Compress data
            while (!deflater.finished()) {
                int count = deflater.deflate(buffer);
                outputStream.write(buffer, 0, count);
            }
            outputStream.close();
            
            // Get compressed result
            byte[] compressedBytes = outputStream.toByteArray();
            
            // Base64 encode for safe transport
            return Base64.getEncoder().encodeToString(compressedBytes);
        } catch (IOException e) {
            // In case of compression error, return original string
            return input;
        }
    }
    
    /**
     * Decompresses a string that was compressed with compressString
     * 
     * @param compressedBase64 Base64 encoded compressed string
     * @return Original decompressed string
     */
    public static String decompressString(String compressedBase64) {
        if (compressedBase64 == null || compressedBase64.isEmpty()) {
            return compressedBase64;
        }
        
        try {
            // Decode Base64
            byte[] compressedBytes = Base64.getDecoder().decode(compressedBase64);
            
            // Create inflater for decompression
            Inflater inflater = new Inflater();
            inflater.setInput(compressedBytes);
            
            // Prepare output buffer
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream(compressedBytes.length);
            byte[] buffer = new byte[1024];
            
            // Decompress data
            while (!inflater.finished()) {
                int count = inflater.inflate(buffer);
                outputStream.write(buffer, 0, count);
            }
            outputStream.close();
            
            // Get decompressed result
            byte[] decompressedBytes = outputStream.toByteArray();
            
            // Convert back to string
            return new String(decompressedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // In case of decompression error, return original string
            return compressedBase64;
        }
    }
}