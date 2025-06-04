# Communication en Temps Réel avec WebSockets

## Introduction

Un aspect crucial d'Epic7 est sa capacité à fournir des interactions en temps réel entre les joueurs. Cela est particulièrement important pour des fonctionnalités comme le chat, les combats RTA (Real-Time Arena) et les notifications. Pour implémenter cette communication bidirectionnelle, le backend utilise WebSockets via le protocole STOMP (Simple Text Oriented Messaging Protocol) supporté par Spring.

## Configuration WebSocket

### Configuration de Base

La configuration WebSocket est définie dans `WebSocketConfig.java` :

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Préfixe pour les canaux de diffusion (serveur vers client)
        registry.enableSimpleBroker("/topic", "/queue");
        
        // Préfixe pour les destinations des messages (client vers serveur)
        registry.setApplicationDestinationPrefixes("/app");
        
        // Configuration pour les messages privés
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Point d'entrée WebSocket avec fallback SockJS
        registry.addEndpoint("/ws-chat")
               .setAllowedOrigins("http://localhost:5173")
               .withSockJS();
    }
}
```

Cette configuration établit :
- Le point d'entrée WebSocket `/ws-chat`
- Des canaux de diffusion avec préfixe `/topic` (public) et `/queue` (privé)
- Un préfixe d'application `/app` pour les messages envoyés par les clients
- Un préfixe utilisateur `/user` pour les messages ciblant des utilisateurs spécifiques

### Sécurité WebSocket

La sécurité est assurée par `ChatStompAuthenticationHandler.java` qui vérifie les tokens JWT :

```java
@Configuration
public class ChatStompAuthenticationHandler extends StompAuthenticationHandler {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extraire le token JWT
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    if (authorization != null && !authorization.isEmpty()) {
                        String jwt = authorization.get(0).replace("Bearer ", "");
                        
                        try {
                            // Valider le token
                            String username = jwtUtil.extractUsername(jwt);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            
                            if (jwtUtil.validateToken(jwt, userDetails)) {
                                // Créer une authentification valide
                                UsernamePasswordAuthenticationToken authentication = 
                                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(null));
                                accessor.setUser(authentication);
                            }
                        } catch (Exception e) {
                            // Token invalide
                        }
                    }
                }
                
                return message;
            }
        });
    }
}
```

## Système de Chat

### Contrôleur WebSocket

Le contrôleur WebSocket pour le chat (`ChatController.java`) gère les messages entrants :

```java
@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private ChatService chatService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    /**
     * Endpoint pour envoyer un message au canal global
     */
    @MessageMapping("/chat.sendGlobal")
    public void sendGlobalMessage(MessageRequest messageRequest, Principal principal) {
        // Récupérer l'utilisateur à partir du principal
        String username = principal.getName();
        User user = chatService.getUserByUsername(username);
        
        // Créer et enregistrer le message
        Message message = chatService.saveGlobalMessage(user, messageRequest.getContent());
        
        // Convertir en DTO pour l'envoi
        MessageDTO messageDTO = MessageDTO.fromMessage(message);
        
        // Diffuser à tous les abonnés du canal global
        messagingTemplate.convertAndSend("/topic/chat.global", messageDTO);
    }
    
    /**
     * Endpoint pour envoyer un message à une guilde
     */
    @MessageMapping("/chat.sendGuild")
    public void sendGuildMessage(MessageRequest messageRequest, Principal principal) {
        String username = principal.getName();
        User user = chatService.getUserByUsername(username);
        
        // Vérifier si l'utilisateur appartient à une guilde
        Guild guild = chatService.getUserGuild(user);
        if (guild == null) {
            // Envoyer une erreur à l'utilisateur
            messagingTemplate.convertAndSendToUser(
                username,
                "/queue/errors",
                new ErrorMessage("You are not a member of any guild")
            );
            return;
        }
        
        // Créer et enregistrer le message
        Message message = chatService.saveGuildMessage(user, guild, messageRequest.getContent());
        MessageDTO messageDTO = MessageDTO.fromMessage(message);
        
        // Diffuser à tous les membres de la guilde
        messagingTemplate.convertAndSend("/topic/chat.guild." + guild.getId(), messageDTO);
    }
    
    /**
     * Endpoint pour envoyer un message privé
     */
    @MessageMapping("/chat.sendPrivate")
    public void sendPrivateMessage(PrivateMessageRequest messageRequest, Principal principal) {
        String senderUsername = principal.getName();
        User sender = chatService.getUserByUsername(senderUsername);
        User receiver = chatService.getUserById(messageRequest.getReceiverId());
        
        if (receiver == null) {
            // Envoyer une erreur si le destinataire n'existe pas
            messagingTemplate.convertAndSendToUser(
                senderUsername,
                "/queue/errors",
                new ErrorMessage("Recipient not found")
            );
            return;
        }
        
        // Créer et enregistrer le message
        Message message = chatService.savePrivateMessage(sender, receiver, messageRequest.getContent());
        MessageDTO messageDTO = MessageDTO.fromMessage(message);
        
        // Envoyer au destinataire
        messagingTemplate.convertAndSendToUser(
            receiver.getUsername(),
            "/queue/messages",
            messageDTO
        );
        
        // Confirmer au expéditeur
        messagingTemplate.convertAndSendToUser(
            senderUsername,
            "/queue/messages",
            messageDTO
        );
    }
    
    /**
     * Endpoint pour récupérer l'historique des messages globaux
     */
    @MessageMapping("/chat.history.global")
    public void getGlobalMessageHistory(Principal principal) {
        List<MessageDTO> messageHistory = chatService.getGlobalMessageHistory(50);
        
        // Envoyer l'historique à l'utilisateur qui l'a demandé
        messagingTemplate.convertAndSendToUser(
            principal.getName(),
            "/queue/chat.history.global",
            messageHistory
        );
    }
}
```

### Service de Chat

Le service de chat (`ChatService.java`) implémente la logique métier :

```java
@Service
public class ChatService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private MessageRepository messageRepository;
    
    /**
     * Récupère un utilisateur par son nom d'utilisateur
     */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
    
    /**
     * Récupère un utilisateur par son ID
     */
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
            .orElse(null);
    }
    
    /**
     * Récupère la guilde d'un utilisateur
     */
    public Guild getUserGuild(User user) {
        if (user.getGuildMembership() == null) {
            return null;
        }
        return user.getGuildMembership().getGuild();
    }
    
    /**
     * Enregistre un message global
     */
    public Message saveGlobalMessage(User sender, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setContent(content);
        message.setChannel("GLOBAL");
        message.setTimestamp(Instant.now());
        
        return messageRepository.save(message);
    }
    
    /**
     * Enregistre un message de guilde
     */
    public Message saveGuildMessage(User sender, Guild guild, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setContent(content);
        message.setChannel("GUILD:" + guild.getId());
        message.setTimestamp(Instant.now());
        
        return messageRepository.save(message);
    }
    
    /**
     * Enregistre un message privé
     */
    public Message savePrivateMessage(User sender, User receiver, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        message.setChannel("PRIVATE");
        message.setTimestamp(Instant.now());
        
        return messageRepository.save(message);
    }
    
    /**
     * Récupère l'historique des messages globaux
     */
    public List<MessageDTO> getGlobalMessageHistory(int limit) {
        List<Message> messages = messageRepository.findByChannelOrderByTimestampDesc("GLOBAL", PageRequest.of(0, limit));
        
        // Convertir en DTO et inverser l'ordre (du plus ancien au plus récent)
        List<MessageDTO> messageDTOs = messages.stream()
            .map(MessageDTO::fromMessage)
            .collect(Collectors.toList());
        
        Collections.reverse(messageDTOs);
        return messageDTOs;
    }
}
```

## Système de Combat en Temps Réel (RTA)

### Configuration Spécifique

Pour les combats RTA, une configuration WebSocket dédiée est utilisée :

```java
@Configuration
@EnableWebSocketMessageBroker
public class RtaWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic/rta");
        registry.setApplicationDestinationPrefixes("/app/rta");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-rta")
               .setAllowedOrigins("http://localhost:5173")
               .withSockJS();
    }
}
```

### Contrôleur RTA

```java
@Controller
public class RtaController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private RtaService rtaService;
    
    /**
     * Endpoint pour rejoindre la file d'attente RTA
     */
    @MessageMapping("/rta.queue.join")
    public void joinQueue(Principal principal) {
        String username = principal.getName();
        
        // Ajouter le joueur à la file d'attente
        rtaService.addPlayerToQueue(username);
        
        // Notifier le joueur qu'il est en file d'attente
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/rta.status",
            new QueueStatus("WAITING")
        );
        
        // Vérifier si un match peut être formé
        rtaService.tryCreateMatch();
    }
    
    /**
     * Endpoint pour quitter la file d'attente
     */
    @MessageMapping("/rta.queue.leave")
    public void leaveQueue(Principal principal) {
        String username = principal.getName();
        
        // Retirer le joueur de la file d'attente
        rtaService.removePlayerFromQueue(username);
        
        // Notifier le joueur qu'il n'est plus en file d'attente
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/rta.status",
            new QueueStatus("IDLE")
        );
    }
    
    /**
     * Endpoint pour effectuer une action pendant un combat
     */
    @MessageMapping("/rta.battle.action")
    public void performAction(BattleAction action, Principal principal) {
        String username = principal.getName();
        
        // Vérifier si le joueur est dans un combat
        String matchId = rtaService.getPlayerMatchId(username);
        if (matchId == null) {
            // Envoyer une erreur si le joueur n'est pas dans un combat
            messagingTemplate.convertAndSendToUser(
                username,
                "/queue/errors",
                new ErrorMessage("You are not in a battle")
            );
            return;
        }
        
        // Traiter l'action et mettre à jour l'état du combat
        BattleUpdate update = rtaService.processAction(matchId, username, action);
        
        // Diffuser la mise à jour aux deux joueurs
        messagingTemplate.convertAndSend("/topic/rta.battle." + matchId, update);
        
        // Vérifier si le combat est terminé
        if (update.isGameOver()) {
            // Envoyer les résultats finaux
            BattleResult result = rtaService.getBattleResult(matchId);
            messagingTemplate.convertAndSend("/topic/rta.battle." + matchId + ".result", result);
            
            // Nettoyer les ressources du combat
            rtaService.cleanupMatch(matchId);
        }
    }
}
```

## Gestion des Connexions et Reconnexions

### Intercepteur de Handshake

Pour gérer les connexions et déconnexions, un intercepteur de handshake est utilisé :

```java
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, 
                                 WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        
        // Récupérer le token JWT de la requête
        String token = extractToken(request);
        if (token == null) {
            return false;
        }
        
        try {
            // Valider le token
            String username = jwtUtil.extractUsername(token);
            if (username == null) {
                return false;
            }
            
            // Stocker l'utilisateur dans les attributs de la session
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                return false;
            }
            
            attributes.put("user", user);
            return true;
            
        } catch (Exception e) {
            return false;
        }
    }
    
    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, 
                             WebSocketHandler wsHandler, Exception exception) {
        // Rien à faire après le handshake
    }
    
    private String extractToken(ServerHttpRequest request) {
        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            return null;
        }
        
        String authHeader = authHeaders.get(0);
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        
        return null;
    }
}
```

### Gestionnaire de Sessions

Un service spécial gère les sessions WebSocket actives :

```java
@Service
public class WebSocketSessionService {

    private final Map<String, Set<String>> userSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUser = new ConcurrentHashMap<>();
    
    /**
     * Enregistre une nouvelle session pour un utilisateur
     */
    public void registerSession(String username, String sessionId) {
        userSessions.computeIfAbsent(username, k -> new CopyOnWriteArraySet<>()).add(sessionId);
        sessionUser.put(sessionId, username);
    }
    
    /**
     * Supprime une session
     */
    public void removeSession(String sessionId) {
        String username = sessionUser.remove(sessionId);
        if (username != null) {
            Set<String> sessions = userSessions.get(username);
            if (sessions != null) {
                sessions.remove(sessionId);
                if (sessions.isEmpty()) {
                    userSessions.remove(username);
                }
            }
        }
    }
    
    /**
     * Vérifie si un utilisateur a des sessions actives
     */
    public boolean isUserConnected(String username) {
        Set<String> sessions = userSessions.get(username);
        return sessions != null && !sessions.isEmpty();
    }
    
    /**
     * Récupère toutes les sessions d'un utilisateur
     */
    public Set<String> getUserSessions(String username) {
        return userSessions.getOrDefault(username, Collections.emptySet());
    }
}
```

## Écouteur d'Événements WebSocket

Un écouteur d'événements WebSocket détecte les connexions et déconnexions :

```java
@Component
public class WebSocketEventListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private WebSocketSessionService sessionService;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Gérer les connexions
     */
    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        
        // Récupérer l'utilisateur de la session
        Principal principal = accessor.getUser();
        if (principal != null) {
            String username = principal.getName();
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (user != null) {
                // Enregistrer la session
                sessionService.registerSession(username, sessionId);
                
                // Notifier les amis de la connexion
                notifyFriendsOfStatusChange(user, true);
            }
        }
    }
    
    /**
     * Gérer les déconnexions
     */
    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        
        // Récupérer l'utilisateur de la session
        Principal principal = accessor.getUser();
        if (principal != null) {
            String username = principal.getName();
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (user != null) {
                // Supprimer la session
                sessionService.removeSession(sessionId);
                
                // Vérifier s'il reste des sessions actives pour cet utilisateur
                if (!sessionService.isUserConnected(username)) {
                    // Notifier les amis de la déconnexion
                    notifyFriendsOfStatusChange(user, false);
                }
            }
        }
    }
    
    /**
     * Notifier les amis d'un changement de statut (connexion/déconnexion)
     */
    private void notifyFriendsOfStatusChange(User user, boolean online) {
        // Récupérer les amis
        List<User> friends = user.getFriends();
        if (friends == null) return;
        
        // Créer la notification
        UserStatusDTO status = new UserStatusDTO();
        status.setUserId(user.getId());
        status.setUsername(user.getUsername());
        status.setOnline(online);
        status.setTimestamp(Instant.now().toString());
        
        // Envoyer la notification à chaque ami connecté
        for (User friend : friends) {
            if (sessionService.isUserConnected(friend.getUsername())) {
                messagingTemplate.convertAndSendToUser(
                    friend.getUsername(),
                    "/queue/friends.status",
                    status
                );
            }
        }
    }
}
```

## Conclusion

L'implémentation WebSocket dans Epic7 offre une communication en temps réel robuste pour plusieurs fonctionnalités clés :

1. **Chat Global, de Guilde et Privé** : Permet aux joueurs de communiquer en temps réel, avec historique des messages et notifications.

2. **Combats RTA** : Offre une expérience de combat en temps réel entre joueurs, avec des mises à jour instantanées des actions et de l'état du jeu.

3. **Statut des Amis** : Permet de suivre l'état de connexion des amis en temps réel.

4. **Notifications** : Système de notification en temps réel pour les événements importants.

La sécurité est assurée à chaque étape, avec une authentification JWT pour les connexions WebSocket. La gestion des sessions permet de suivre les connexions multiples d'un même utilisateur et de gérer proprement les déconnexions.

Cette architecture WebSocket est essentielle pour offrir une expérience de jeu interactive et dynamique, où les joueurs peuvent interagir entre eux sans avoir à rafraîchir constamment leur interface.
