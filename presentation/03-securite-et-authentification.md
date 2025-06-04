# Sécurité et Authentification dans Epic7

## Vue d'Ensemble

Le système de sécurité d'Epic7 est basé sur Spring Security avec une authentification JWT (JSON Web Token). Cette approche offre une solution sans état (stateless) adaptée aux applications modernes, en particulier pour les API REST et les applications SPA (Single Page Application).

## Architecture de Sécurité

### Configuration Principale

La configuration principale de la sécurité est définie dans `SecurityConfig.java` :

```java
@Configuration
public class SecurityConfig {
    // ...
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll() // login reste ouvert
                .requestMatchers("/api/skills/**").permitAll() // les compétences sont ouvertes
                .requestMatchers("/api/chat/rooms/global").authenticated() // allow accessing global chat without auth
                .requestMatchers("/api/combat/**").authenticated() // les combats sont ouverts
                .requestMatchers("/api/user/me").permitAll() // Allow checking user status without authentication
                // WebSocket endpoints - allow all for development (important for chat functionality)
                .requestMatchers("/ws-chat/**").authenticated()
                .requestMatchers("/topic/**").authenticated()
                .requestMatchers("/app/**").authenticated()
                .anyRequest().authenticated()               // tout le reste est protégé
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
      
        return http.build();
    }
    // ...
}
```

Cette configuration définit :
- Les chemins d'API accessibles sans authentification (`/api/auth/**`, `/api/user/me`, etc.)
- Les chemins qui nécessitent une authentification (la plupart des endpoints)
- L'ajout du filtre JWT avant le filtre d'authentification standard

### Filtre JWT

Le filtre JWT (`JwtAuthFilter`) intercepte chaque requête, extrait et valide le token JWT s'il est présent, et configure le contexte de sécurité Spring :

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    // ...
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) 
        throws ServletException, IOException {
        
        // Extraire le token de l'en-tête Authorization
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Extraire le token et l'email
        jwt = authHeader.substring(7);
        userEmail = jwtUtil.extractUsername(jwt);
        
        // Vérifier si l'utilisateur est déjà authentifié
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
            
            // Valider le token
            if (jwtUtil.validateToken(jwt, userDetails)) {
                // Créer l'authentification
                UsernamePasswordAuthenticationToken authToken = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

### Utilitaire JWT

L'utilitaire JWT (`JwtUtil`) gère la création, l'analyse et la validation des tokens JWT :

```java
@Component
public class JwtUtil {
    // Clé secrète pour signer les tokens
    private String SECRET_KEY = "votreClésecurisée"; // Idéalement dans les propriétés
    private long jwtExpirationInMs = 86400000; // 24 heures
    
    // Extraire le nom d'utilisateur du token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    // Extraire la date d'expiration
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    // Vérifier si le token est expiré
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    // Générer un token pour un utilisateur
    public String generateToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, username);
    }
    
    // Créer un token avec des claims et un sujet
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(subject)
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationInMs))
            .signWith(SignatureAlgorithm.HS256, SECRET_KEY)
            .compact();
    }
    
    // Valider un token
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
```

## Service d'Authentification

Le service d'authentification (`AuthService`) gère les opérations liées à l'authentification et l'enregistrement :

```java
@Service
public class AuthService {
    // ...
    
    /**
     * Connexion : vérifie les informations d'identification de l'utilisateur 
     * @param email
     * @param rawPassword
     * @return Un token JWT si les informations d'identification sont valides, sinon une valeur vide.
     */
    public Optional<String> loginAndGetToken(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .map(user -> jwtUtil.generateToken(email));
    }
    
    /**
     * Enregistrement d'un nouvel utilisateur
     */
    public User registerUser(RegisterRequest registerRequest) {
        // Vérifier si l'email existe déjà
        if (userRepository.findByEmail(registerRequest.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }
        
        // Créer un nouvel utilisateur
        User user = new User();
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setUsername(registerRequest.getUsername());
        // Initialiser d'autres champs par défaut
        
        return userRepository.save(user);
    }
    
    // ...
}
```

## Contrôleur d'Authentification

Le contrôleur d'authentification (`AuthController`) expose les endpoints pour l'inscription et la connexion :

```java
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {
    // ...
    
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            User user = authService.registerUser(registerRequest);
            
            // Générer un token pour le nouvel utilisateur
            String token = jwtUtil.generateToken(user.getEmail());
            
            // Retourner les informations de l'utilisateur et le token
            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("username", user.getUsername());
            response.put("token", token);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest loginRequest) {
        // Authentifier l'utilisateur
        Optional<Map<String, Object>> userInfo = authService.authenticateUser(
            loginRequest.getEmail(), 
            loginRequest.getPassword()
        );
        
        // Si l'authentification a réussi, retourner les informations de l'utilisateur
        return userInfo
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials"));
    }
    
    // ...
}
```

## Sécurité WebSocket

La sécurité est également appliquée aux endpoints WebSocket pour le chat et les combats en temps réel :

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    // ...
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extraire le token JWT de l'en-tête
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    if (authorization != null && !authorization.isEmpty()) {
                        String jwt = authorization.get(0).substring(7);
                        
                        // Valider le token et configurer l'authentification
                        String userEmail = jwtUtil.extractUsername(jwt);
                        UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
                        
                        if (jwtUtil.validateToken(jwt, userDetails)) {
                            UsernamePasswordAuthenticationToken authentication = 
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(authentication);
                        }
                    }
                }
                
                return message;
            }
        });
    }
    
    // ...
}
```

## Gestion des Mots de Passe

Les mots de passe sont hachés avec BCrypt pour une sécurité optimale :

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

## Protection CORS

La configuration CORS est définie pour permettre les requêtes du frontend :

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:5173") // Frontend URL
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

## Conclusion

Le système de sécurité d'Epic7 offre une protection robuste tout en restant flexible pour les différents besoins de l'application :

1. **Authentification Sans État** : L'utilisation des JWT permet une authentification sans état, idéale pour les API REST.
2. **Protection des Endpoints** : Chaque endpoint est protégé en fonction de ses besoins spécifiques.
3. **Sécurité WebSocket** : Les communications en temps réel sont également sécurisées.
4. **Hashage des Mots de Passe** : BCrypt offre une protection forte contre les attaques par force brute.
5. **Configuration CORS** : Permet une communication sécurisée entre le frontend et le backend.

Cette architecture de sécurité assure que seuls les utilisateurs authentifiés peuvent accéder aux ressources protégées, tout en offrant une expérience utilisateur fluide.
