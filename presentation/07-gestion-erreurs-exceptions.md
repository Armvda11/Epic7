# Gestion des Erreurs et Exceptions

## Vue d'Ensemble

Une gestion robuste des erreurs est essentielle pour toute application professionnelle. Dans Epic7, un système complet de gestion des exceptions a été mis en place pour :

1. **Améliorer l'Expérience Utilisateur** : Fournir des messages d'erreur clairs et compréhensibles
2. **Faciliter le Débogage** : Enregistrer des informations détaillées sur les erreurs
3. **Maintenir la Sécurité** : Éviter de divulguer des informations sensibles
4. **Assurer la Cohérence** : Garantir un format de réponse uniforme pour toutes les erreurs

## Hiérarchie des Exceptions

### Exceptions Personnalisées

Epic7 définit une hiérarchie d'exceptions personnalisées pour représenter différents types d'erreurs :

```java
// Exception de base pour toutes les exceptions métier
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
    
    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}

// Exception pour les ressources non trouvées
public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String resourceName) {
        super("Resource not found: " + resourceName);
    }
}

// Exception pour les accès non autorisés
public class UnauthorizedException extends BusinessException {
    public UnauthorizedException(String message) {
        super(message);
    }
}

// Exception pour les ressources insuffisantes (or, diamants, énergie, etc.)
public class InsufficientResourcesException extends BusinessException {
    public InsufficientResourcesException(String message) {
        super(message);
    }
}

// Exception pour les opérations invalides
public class InvalidOperationException extends BusinessException {
    public InvalidOperationException(String message) {
        super(message);
    }
}

// Exception pour les entités en conflit (nom d'utilisateur déjà pris, etc.)
public class EntityConflictException extends BusinessException {
    public EntityConflictException(String message) {
        super(message);
    }
}
```

## Gestionnaire Global d'Exceptions

Un gestionnaire global d'exceptions intercepte toutes les exceptions non gérées et les convertit en réponses HTTP appropriées :

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Structure de réponse commune pour toutes les erreurs
    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private String timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
    }

    // Méthode utilitaire pour créer une réponse d'erreur
    private ErrorResponse createErrorResponse(
            HttpServletRequest request,
            HttpStatus status,
            String error,
            String message) {
        return new ErrorResponse(
            Instant.now().toString(),
            status.value(),
            error,
            message,
            request.getRequestURI()
        );
    }

    // Gestionnaire pour ResourceNotFoundException
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex,
            HttpServletRequest request) {
        
        logger.error("Resource not found: {}", ex.getMessage());
        
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.NOT_FOUND,
            "Not Found",
            ex.getMessage()
        );
        
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    // Gestionnaire pour UnauthorizedException
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex,
            HttpServletRequest request) {
        
        logger.error("Unauthorized access: {}", ex.getMessage());
        
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.FORBIDDEN,
            "Forbidden",
            ex.getMessage()
        );
        
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    // Gestionnaire pour InsufficientResourcesException
    @ExceptionHandler(InsufficientResourcesException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientResourcesException(
            InsufficientResourcesException ex,
            HttpServletRequest request) {
        
        logger.error("Insufficient resources: {}", ex.getMessage());
        
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.BAD_REQUEST,
            "Bad Request",
            ex.getMessage()
        );
        
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // Gestionnaire pour InvalidOperationException
    @ExceptionHandler(InvalidOperationException.class)
    public ResponseEntity<ErrorResponse> handleInvalidOperationException(
            InvalidOperationException ex,
            HttpServletRequest request) {
        
        logger.error("Invalid operation: {}", ex.getMessage());
        
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.BAD_REQUEST,
            "Bad Request",
            ex.getMessage()
        );
        
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // Gestionnaire pour EntityConflictException
    @ExceptionHandler(EntityConflictException.class)
    public ResponseEntity<ErrorResponse> handleEntityConflictException(
            EntityConflictException ex,
            HttpServletRequest request) {
        
        logger.error("Entity conflict: {}", ex.getMessage());
        
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.CONFLICT,
            "Conflict",
            ex.getMessage()
        );
        
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    // Gestionnaire pour les violations de contraintes de validation
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        
        // Extraire les erreurs de validation
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        logger.error("Validation error: {}", errors);
        
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.BAD_REQUEST,
            "Validation Error",
            "Invalid input data: " + errors
        );
        
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // Gestionnaire pour les exceptions génériques
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest request) {
        
        // Pour les exceptions non spécifiques, enregistrer la stack trace complète
        logger.error("Unexpected error", ex);
        
        // Ne pas exposer les détails techniques à l'utilisateur
        ErrorResponse response = createErrorResponse(
            request,
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Internal Server Error",
            "An unexpected error occurred. Please try again later."
        );
        
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

## Utilisation des Exceptions dans les Services

Les services utilisent ces exceptions personnalisées pour signaler des erreurs spécifiques :

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    // Constructeur...

    /**
     * Trouve un utilisateur par ID.
     */
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User with ID " + id));
    }

    /**
     * Ajoute des diamants à un utilisateur.
     */
    public void addDiamonds(Long userId, int amount) {
        if (amount <= 0) {
            throw new InvalidOperationException("Diamond amount must be positive");
        }
        
        User user = findById(userId);
        user.setDiamonds(user.getDiamonds() + amount);
        userRepository.save(user);
    }

    /**
     * Utilise des diamants pour une action.
     */
    public void useDiamonds(Long userId, int amount, String reason) {
        if (amount <= 0) {
            throw new InvalidOperationException("Diamond amount must be positive");
        }
        
        User user = findById(userId);
        
        if (user.getDiamonds() < amount) {
            throw new InsufficientResourcesException(
                "Not enough diamonds. Required: " + amount + ", Available: " + user.getDiamonds()
            );
        }
        
        user.setDiamonds(user.getDiamonds() - amount);
        userRepository.save(user);
        
        // Enregistrer la transaction...
    }

    /**
     * Enregistre un nouvel utilisateur.
     */
    public User registerUser(String username, String email, String password) {
        // Vérifier si l'email est déjà utilisé
        if (userRepository.existsByEmail(email)) {
            throw new EntityConflictException("Email already in use: " + email);
        }
        
        // Vérifier si le nom d'utilisateur est déjà utilisé
        if (userRepository.existsByUsername(username)) {
            throw new EntityConflictException("Username already taken: " + username);
        }
        
        // Créer et sauvegarder l'utilisateur...
        User user = new User();
        // ...
        return userRepository.save(user);
    }
}
```

## Validation des Entrées

En plus des exceptions, Epic7 utilise Jakarta Validation (anciennement Bean Validation) pour valider les données d'entrée :

```java
// DTO pour l'enregistrement
public class RegisterRequest {
    
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
    private String username;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    // Getters et setters...
}

// Contrôleur utilisant la validation
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        // Si la validation échoue, MethodArgumentNotValidException est levée
        // et gérée par GlobalExceptionHandler
        
        User user = authService.registerUser(
            registerRequest.getUsername(),
            registerRequest.getEmail(),
            registerRequest.getPassword()
        );
        
        // Créer et renvoyer la réponse...
    }
}
```

## Traitement des Erreurs dans le Frontend

Le frontend gère ces réponses d'erreur de manière appropriée :

```javascript
// Service d'invocation
async function summon(bannerId) {
    try {
        const response = await api.post(`/api/summon/${bannerId}`);
        return response.data;
    } catch (error) {
        if (error.response) {
            // Erreur de l'API avec réponse
            const errorData = error.response.data;
            
            // Traiter les différents codes d'erreur
            switch (error.response.status) {
                case 400: // Bad Request
                    if (errorData.message.includes("Not enough diamonds")) {
                        // Afficher une boîte de dialogue pour acheter des diamants
                        showDiamondPurchaseDialog();
                    } else {
                        // Afficher un message générique
                        showErrorMessage(errorData.message);
                    }
                    break;
                    
                case 404: // Not Found
                    showErrorMessage("Banner not found. It may have expired.");
                    break;
                    
                case 403: // Forbidden
                    showErrorMessage("You don't have permission to access this banner.");
                    break;
                    
                default:
                    showErrorMessage("An error occurred. Please try again later.");
            }
        } else if (error.request) {
            // Erreur de réseau (pas de réponse)
            showErrorMessage("Network error. Please check your connection.");
        } else {
            // Erreur de configuration ou autre
            showErrorMessage("An unexpected error occurred.");
        }
        
        // Rejeter la promesse pour la chaîne d'appels
        throw error;
    }
}
```

## Logging des Erreurs

Epic7 utilise SLF4J avec Logback pour journaliser les erreurs :

```java
// Configuration dans logback.xml
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/epic7.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/epic7.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <!-- Logger pour les exceptions -->
    <logger name="com.epic7.backend.exception" level="ERROR" />
    
    <!-- Logger racine -->
    <root level="INFO">
        <appender-ref ref="CONSOLE" />
        <appender-ref ref="FILE" />
    </root>
</configuration>
```

Le gestionnaire d'exceptions utilise ce logger pour enregistrer les détails des erreurs :

```java
private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

// Dans une méthode de gestion d'exception
logger.error("Resource not found: {}", ex.getMessage());
```

## Surveillance et Alerte

Pour les erreurs critiques, Epic7 peut être configuré pour envoyer des alertes :

```java
@Component
public class ErrorNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(ErrorNotificationService.class);
    
    private final EmailService emailService;
    
    // Constructeur...
    
    /**
     * Envoie une notification pour une erreur critique.
     */
    public void notifyCriticalError(Exception ex, String context) {
        // Journaliser l'erreur
        logger.error("CRITICAL ERROR in {}: {}", context, ex.getMessage(), ex);
        
        // Préparer le message d'alerte
        String subject = "CRITICAL ERROR in Epic7 Backend: " + context;
        
        StringBuilder body = new StringBuilder();
        body.append("Time: ").append(Instant.now()).append("\n");
        body.append("Context: ").append(context).append("\n");
        body.append("Error: ").append(ex.getClass().getName()).append("\n");
        body.append("Message: ").append(ex.getMessage()).append("\n\n");
        
        // Ajouter la stack trace
        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));
        body.append("Stack Trace:\n").append(sw.toString());
        
        // Envoyer l'email
        try {
            emailService.sendEmail("admin@epic7.com", subject, body.toString());
        } catch (Exception e) {
            logger.error("Failed to send error notification email", e);
        }
    }
}
```

## Réponses aux Erreurs Webhook/WebSocket

Pour les erreurs qui se produisent dans les communications WebSocket, des gestionnaires spécifiques sont implémentés :

```java
@Component
public class WebSocketErrorHandler {

    private final SimpMessagingTemplate messagingTemplate;
    private static final Logger logger = LoggerFactory.getLogger(WebSocketErrorHandler.class);
    
    // Constructeur...
    
    /**
     * Gère une erreur WebSocket pour un utilisateur spécifique.
     */
    public void handleError(String username, String errorCode, String message) {
        // Journaliser l'erreur
        logger.error("WebSocket error for user {}: {} - {}", username, errorCode, message);
        
        // Créer la réponse d'erreur
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("type", "ERROR");
        errorResponse.put("code", errorCode);
        errorResponse.put("message", message);
        errorResponse.put("timestamp", Instant.now().toString());
        
        // Envoyer l'erreur à l'utilisateur spécifique
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/errors",
            errorResponse
        );
    }
    
    /**
     * Gère une erreur WebSocket pour tous les utilisateurs d'un canal.
     */
    public void handleChannelError(String channel, String errorCode, String message) {
        // Journaliser l'erreur
        logger.error("WebSocket channel error for {}: {} - {}", channel, errorCode, message);
        
        // Créer la réponse d'erreur
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("type", "ERROR");
        errorResponse.put("code", errorCode);
        errorResponse.put("message", message);
        errorResponse.put("timestamp", Instant.now().toString());
        
        // Envoyer l'erreur à tous les utilisateurs du canal
        messagingTemplate.convertAndSend(
            "/topic/" + channel + "/errors",
            errorResponse
        );
    }
}
```

## Bonnes Pratiques Appliquées

### 1. Hiérarchie d'Exceptions Métier

Les exceptions personnalisées sont organisées en une hiérarchie qui reflète les différents types d'erreurs métier.

### 2. Messages d'Erreur Clairs

Les messages d'erreur sont rédigés de manière claire et compréhensible pour les utilisateurs finaux.

### 3. Codes HTTP Appropriés

Chaque type d'exception est mappé à un code HTTP approprié.

### 4. Structure de Réponse Cohérente

Toutes les erreurs suivent le même format de réponse.

### 5. Journalisation Détaillée

Les erreurs sont journalisées avec des informations contextuelles pour faciliter le débogage.

### 6. Validation des Entrées

Les données d'entrée sont validées à la fois au niveau des contrôleurs et des services.

### 7. Traitement des Erreurs Frontend

Le frontend est conçu pour interpréter et afficher les erreurs de manière appropriée.

### 8. Sécurité des Messages d'Erreur

Les erreurs techniques sont masquées aux utilisateurs finaux pour éviter de divulguer des informations sensibles.

## Conclusion

Le système de gestion des erreurs d'Epic7 est conçu pour être robuste, cohérent et informatif. Il contribue à la fiabilité globale de l'application en :

1. **Fournissant un Feedback Clair** aux utilisateurs lorsque quelque chose ne va pas
2. **Facilitant le Débogage** grâce à une journalisation détaillée
3. **Maintenant la Sécurité** en évitant de divulguer des informations sensibles
4. **Améliorant l'Expérience Utilisateur** en guidant les utilisateurs vers des solutions

Cette approche de la gestion des erreurs aide à maintenir une application stable et facile à maintenir, tout en offrant une expérience utilisateur de qualité, même lorsque des problèmes surviennent.
