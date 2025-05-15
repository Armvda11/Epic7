package com.epic7.backend.config;

import com.epic7.backend.controller.ChatController;
import com.epic7.backend.controller.rta.RtaWebSocketController;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Listener for application shutdown events.
 * Ensures a graceful shutdown by notifying clients before connections are terminated.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // Run this early in the shutdown sequence
@RequiredArgsConstructor
@Slf4j
public class ShutdownListener implements ApplicationListener<ContextClosedEvent> {

    private final ChatController chatController;
    
    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        log.info("Application shutdown detected - notifying chat clients");
        
        try {
            // Notify chat clients
            chatController.notifyClientsOfShutdown();
            
            // Allow some time for messages to be sent before connections are closed
            // This is important to give websocket messages time to be delivered
            try {
                log.info("Waiting for shutdown messages to be delivered...");
                Thread.sleep(1000); // 1 second delay
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Shutdown notification delay was interrupted", e);
            }
            
            log.info("Shutdown notifications completed");
        } catch (Exception e) {
            log.error("Error during graceful shutdown notification", e);
        }
    }
}
