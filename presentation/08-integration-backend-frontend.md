# Intégration Backend-Frontend

## Vue d'Ensemble

L'intégration entre le backend Java Spring Boot et le frontend React d'Epic7 est un aspect crucial de l'architecture globale. Cette intégration repose sur plusieurs technologies et pratiques qui permettent une communication fluide et sécurisée entre les deux parties de l'application.

## Architecture de Communication

### Approche REST

Le backend expose une API RESTful que le frontend consomme pour :
- Récupérer des données (GET)
- Créer de nouvelles ressources (POST)
- Mettre à jour des ressources existantes (PUT/PATCH)
- Supprimer des ressources (DELETE)

### Communication en Temps Réel

Pour les fonctionnalités nécessitant des mises à jour en temps réel, comme le chat et les combats RTA, WebSocket est utilisé via le protocole STOMP.

## Configuration CORS

Pour permettre au frontend de communiquer avec le backend depuis un domaine différent (en développement), une configuration CORS (Cross-Origin Resource Sharing) est mise en place :

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:5173") // URL du frontend en développement
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type", "X-User-Id", "x-user-id")
            .allowCredentials(true);
    }
}
```

Cette configuration est également appliquée aux endpoints WebSocket :

```java
@Override
public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws-chat")
        .setAllowedOrigins("http://localhost:5173")
        .withSockJS();
}
```

## Client HTTP côté Frontend

Le frontend utilise Axios pour effectuer des requêtes HTTP vers le backend :

```javascript
// src/api/axiosInstance.jsx
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Intercepteur pour ajouter le token JWT à chaque requête
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

## Services API côté Frontend

Des services spécifiques sont créés pour interagir avec les différents endpoints de l'API :

```javascript
// src/services/userService.js
import api from '../api/axiosInstance';

export const UserService = {
  // Récupérer le profil de l'utilisateur courant
  getCurrentUser: async () => {
    try {
      const response = await api.get('/user/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },
  
  // Récupérer les héros de l'utilisateur
  getUserHeroes: async () => {
    try {
      const response = await api.get('/user/heroes');
      return response.data;
    } catch (error) {
      console.error('Error fetching user heroes:', error);
      throw error;
    }
  },
  
  // Envoyer une demande d'ami
  sendFriendRequest: async (friendId) => {
    try {
      const response = await api.post(`/user/friends/add/${friendId}`);
      return response.data;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },
  
  // Accepter une demande d'ami
  acceptFriendRequest: async (friendId) => {
    try {
      const response = await api.post(`/user/friends/accept/${friendId}`);
      return response.data;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }
};
```

## Authentification et Gestion des Tokens

### Côté Backend

Le backend génère et valide les tokens JWT :

```java
@Service
public class AuthService {
    
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // Constructeur...
    
    public Optional<String> loginAndGetToken(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .map(user -> jwtUtil.generateToken(email));
    }
    
    public Map<String, Object> authenticateUser(String email, String rawPassword) {
        Optional<String> tokenOpt = loginAndGetToken(email, rawPassword);
        
        if (tokenOpt.isPresent()) {
            User user = userRepository.findByEmail(email).get();
            
            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("token", tokenOpt.get());
            
            return response;
        }
        
        return null;
    }
}
```

### Côté Frontend

Le frontend stocke et utilise le token JWT :

```javascript
// src/services/authService.js
import api from '../api/axiosInstance';

export const AuthService = {
  // Connexion
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Stocker le token et les informations utilisateur
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Déconnexion
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    
    // Rediriger vers la page de connexion
    window.location.href = '/login';
  },
  
  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  
  // Inscription
  register: async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password
      });
      
      // Stocker le token et les informations utilisateur
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
};
```

## Routes Protégées dans le Frontend

Pour protéger les routes qui nécessitent une authentification, un composant `PrivateRoute` est utilisé :

```jsx
// src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { AuthService } from '../services/authService';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = AuthService.isAuthenticated();
  
  // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Sinon, afficher le composant enfant
  return children;
};

export default PrivateRoute;
```

Ce composant est utilisé dans la configuration des routes :

```jsx
// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import HeroesPage from './pages/HeroesPage';
import SummonPage from './pages/SummonPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        } />
        <Route path="/heroes" element={
          <PrivateRoute>
            <HeroesPage />
          </PrivateRoute>
        } />
        <Route path="/summon" element={
          <PrivateRoute>
            <SummonPage />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
```

## WebSocket pour la Communication en Temps Réel

### Configuration côté Frontend

Le frontend utilise la bibliothèque `@stomp/stompjs` pour se connecter au WebSocket :

```javascript
// src/services/chatService.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class ChatService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.statusHandlers = [];
  }
  
  // Connecter au WebSocket
  connect() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found for WebSocket connection');
      return;
    }
    
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-chat'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: function (str) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });
    
    // Gestionnaire de connexion
    this.client.onConnect = (frame) => {
      this.isConnected = true;
      console.log('Connected to WebSocket');
      
      // S'abonner au canal global
      this.client.subscribe('/topic/chat.global', (message) => {
        const receivedMessage = JSON.parse(message.body);
        this.notifyMessageHandlers(receivedMessage);
      });
      
      // S'abonner aux messages privés
      const username = localStorage.getItem('username');
      this.client.subscribe(`/user/${username}/queue/messages`, (message) => {
        const receivedMessage = JSON.parse(message.body);
        this.notifyMessageHandlers(receivedMessage);
      });
      
      // S'abonner aux erreurs
      this.client.subscribe(`/user/${username}/queue/errors`, (message) => {
        const error = JSON.parse(message.body);
        console.error('WebSocket error:', error);
      });
      
      // S'abonner aux mises à jour de statut des amis
      this.client.subscribe(`/user/${username}/queue/friends.status`, (message) => {
        const status = JSON.parse(message.body);
        this.notifyStatusHandlers(status);
      });
      
      // Demander l'historique des messages
      this.client.publish({
        destination: '/app/chat.history.global',
        body: JSON.stringify({})
      });
      
      // S'abonner à l'historique des messages
      this.client.subscribe(`/user/${username}/queue/chat.history.global`, (message) => {
        const history = JSON.parse(message.body);
        history.forEach(msg => this.notifyMessageHandlers(msg));
      });
    };
    
    // Gestionnaire de déconnexion
    this.client.onDisconnect = () => {
      this.isConnected = false;
      console.log('Disconnected from WebSocket');
    };
    
    // Gestionnaire d'erreur
    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame);
    };
    
    // Démarrer la connexion
    this.client.activate();
  }
  
  // Déconnecter du WebSocket
  disconnect() {
    if (this.client && this.isConnected) {
      this.client.deactivate();
      this.isConnected = false;
    }
  }
  
  // Envoyer un message global
  sendGlobalMessage(content) {
    if (!this.isConnected) {
      console.error('Not connected to WebSocket');
      return;
    }
    
    this.client.publish({
      destination: '/app/chat.sendGlobal',
      body: JSON.stringify({ content })
    });
  }
  
  // Envoyer un message privé
  sendPrivateMessage(receiverId, content) {
    if (!this.isConnected) {
      console.error('Not connected to WebSocket');
      return;
    }
    
    this.client.publish({
      destination: '/app/chat.sendPrivate',
      body: JSON.stringify({ receiverId, content })
    });
  }
  
  // Ajouter un gestionnaire de messages
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }
  
  // Supprimer un gestionnaire de messages
  removeMessageHandler(handler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }
  
  // Notifier tous les gestionnaires de messages
  notifyMessageHandlers(message) {
    this.messageHandlers.forEach(handler => handler(message));
  }
  
  // Ajouter un gestionnaire de statut
  addStatusHandler(handler) {
    this.statusHandlers.push(handler);
  }
  
  // Supprimer un gestionnaire de statut
  removeStatusHandler(handler) {
    this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
  }
  
  // Notifier tous les gestionnaires de statut
  notifyStatusHandlers(status) {
    this.statusHandlers.forEach(handler => handler(status));
  }
}

// Exporter une instance singleton
export default new ChatService();
```

### Contexte React pour le Chat

Un contexte React est utilisé pour rendre le service de chat accessible à tous les composants :

```jsx
// src/context/ChatContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import chatService from '../services/chatService';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState({});
  
  useEffect(() => {
    // Connecter au WebSocket lors du montage du composant
    chatService.connect();
    
    // Ajouter un gestionnaire de messages
    const messageHandler = (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    };
    chatService.addMessageHandler(messageHandler);
    
    // Ajouter un gestionnaire de statut
    const statusHandler = (status) => {
      setOnlineFriends(prev => ({
        ...prev,
        [status.userId]: status.online
      }));
    };
    chatService.addStatusHandler(statusHandler);
    
    // Nettoyer lors du démontage
    return () => {
      chatService.removeMessageHandler(messageHandler);
      chatService.removeStatusHandler(statusHandler);
      chatService.disconnect();
    };
  }, []);
  
  // Exposer les fonctions et données du chat
  const value = {
    messages,
    onlineFriends,
    sendGlobalMessage: chatService.sendGlobalMessage.bind(chatService),
    sendPrivateMessage: chatService.sendPrivateMessage.bind(chatService)
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
```

### Composant de Chat

Un composant utilisant le contexte de chat :

```jsx
// src/components/chat/ChatPanel.jsx
import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import './ChatPanel.css';

const ChatPanel = () => {
  const { messages, sendGlobalMessage } = useChat();
  const [newMessage, setNewMessage] = useState('');
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (newMessage.trim()) {
      sendGlobalMessage(newMessage);
      setNewMessage('');
    }
  };
  
  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            <div className="message-header">
              <span className="message-sender">{msg.senderName}</span>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
      </div>
      
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
        />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
};

export default ChatPanel;
```

## Transfert de Données

### Utilisation de DTO

Les Data Transfer Objects (DTO) sont utilisés pour structurer les données échangées entre le backend et le frontend :

```java
// Backend - UserProfileResponse.java
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String avatarUrl;
    private int level;
    private int gold;
    private int diamonds;
    private int energy;
    private int heroesNumber;
    private String guildName;
    private String lastLoginDate;
    private String registerDate;
    
    // Getters et setters...
}

// Backend - UserService.java
public UserProfileResponse createUserProfile(User user) {
    UserProfileResponse profile = new UserProfileResponse();
    profile.setId(user.getId());
    profile.setUsername(user.getUsername());
    profile.setEmail(user.getEmail());
    profile.setAvatarUrl(user.getAvatarUrl());
    profile.setLevel(user.getLevel());
    profile.setGold(user.getGold());
    profile.setDiamonds(user.getDiamonds());
    profile.setEnergy(user.getEnergy());
    profile.setHeroesNumber(user.getHeroesNumber());
    profile.setGuildName(user.getGuildName());
    profile.setLastLoginDate(user.getLastLoginDateString());
    profile.setRegisterDate(user.getRegisterDateString());
    return profile;
}
```

Le frontend utilise ces structures pour typer les données :

```typescript
// Frontend - src/types/user.ts
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  level: number;
  gold: number;
  diamonds: number;
  energy: number;
  heroesNumber: number;
  guildName: string;
  lastLoginDate: string;
  registerDate: string;
}
```

### Gestion des Assets

Le backend peut fournir des informations sur les assets (images, sons) que le frontend doit charger :

```java
// Backend - HeroController.java
@GetMapping("/{heroId}/assets")
public ResponseEntity<?> getHeroAssets(@PathVariable Long heroId) {
    try {
        Hero hero = heroService.findById(heroId);
        
        // Construire le chemin des assets
        String basePath = "heroes/" + hero.getCode().toLowerCase();
        
        Map<String, String> assets = new HashMap<>();
        assets.put("portrait", basePath + "/portrait.webp");
        assets.put("sprite", basePath + "/sprite.webp");
        assets.put("skill1Icon", basePath + "/skill1.webp");
        assets.put("skill2Icon", basePath + "/skill2.webp");
        assets.put("skill3Icon", basePath + "/skill3.webp");
        
        // Ajouter les sons
        assets.put("voice", basePath + "/voice.mp3");
        assets.put("attack", basePath + "/attack.mp3");
        assets.put("skill1Sound", basePath + "/skill1.mp3");
        assets.put("skill2Sound", basePath + "/skill2.mp3");
        assets.put("skill3Sound", basePath + "/skill3.mp3");
        
        return ResponseEntity.ok(assets);
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}
```

Le frontend utilise ces informations pour charger les assets :

```javascript
// Frontend - src/hooks/useHeroAssets.js
import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

const useHeroAssets = (heroId) => {
  const [assets, setAssets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/heroes/${heroId}/assets`);
        setAssets(response.data);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };
    
    fetchAssets();
  }, [heroId]);
  
  return { assets, loading, error };
};

export default useHeroAssets;
```

## Optimisation des Performances

### Mise en Cache côté Frontend

Le frontend utilise des techniques de mise en cache pour réduire les appels API :

```javascript
// src/services/cacheService.js
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

class CacheService {
  constructor() {
    this.cache = {};
  }
  
  // Récupérer une valeur du cache
  get(key) {
    const item = this.cache[key];
    
    if (!item) {
      return null;
    }
    
    // Vérifier si l'élément a expiré
    if (Date.now() > item.expiry) {
      delete this.cache[key];
      return null;
    }
    
    return item.value;
  }
  
  // Stocker une valeur dans le cache
  set(key, value, ttl = CACHE_DURATION) {
    const expiry = Date.now() + ttl;
    
    this.cache[key] = {
      value,
      expiry
    };
  }
  
  // Supprimer une valeur du cache
  remove(key) {
    delete this.cache[key];
  }
  
  // Vider tout le cache
  clear() {
    this.cache = {};
  }
}

export default new CacheService();
```

Ce service est utilisé dans les services API :

```javascript
// src/services/heroService.js
import api from '../api/axiosInstance';
import cacheService from './cacheService';

export const HeroService = {
  // Récupérer tous les héros
  getAllHeroes: async () => {
    // Vérifier si les données sont en cache
    const cachedHeroes = cacheService.get('all_heroes');
    if (cachedHeroes) {
      return cachedHeroes;
    }
    
    // Sinon, faire l'appel API
    try {
      const response = await api.get('/heroes');
      
      // Mettre en cache pour 5 minutes
      cacheService.set('all_heroes', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching heroes:', error);
      throw error;
    }
  },
  
  // Récupérer un héros par ID
  getHeroById: async (heroId) => {
    // Vérifier si les données sont en cache
    const cacheKey = `hero_${heroId}`;
    const cachedHero = cacheService.get(cacheKey);
    if (cachedHero) {
      return cachedHero;
    }
    
    // Sinon, faire l'appel API
    try {
      const response = await api.get(`/heroes/${heroId}`);
      
      // Mettre en cache pour 5 minutes
      cacheService.set(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching hero ${heroId}:`, error);
      throw error;
    }
  }
};
```

### Pagination côté Backend

Pour les listes potentiellement longues, le backend implémente la pagination :

```java
// Backend - HeroController.java
@GetMapping
public ResponseEntity<Page<HeroDTO>> getAllHeroes(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String name,
        @RequestParam(required = false) String element,
        @RequestParam(required = false) String rarity) {
    
    // Créer une spécification de filtrage
    Specification<Hero> spec = Specification.where(null);
    
    if (name != null && !name.isEmpty()) {
        spec = spec.and((root, query, cb) -> 
            cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
    }
    
    if (element != null && !element.isEmpty()) {
        spec = spec.and((root, query, cb) -> 
            cb.equal(root.get("element"), Element.valueOf(element.toUpperCase())));
    }
    
    if (rarity != null && !rarity.isEmpty()) {
        spec = spec.and((root, query, cb) -> 
            cb.equal(root.get("rarity"), Rarity.valueOf(rarity.toUpperCase())));
    }
    
    // Créer la pagination
    Pageable pageable = PageRequest.of(page, size, Sort.by("rarity").descending().and(Sort.by("name")));
    
    // Récupérer les héros
    Page<Hero> heroes = heroRepository.findAll(spec, pageable);
    
    // Convertir en DTO
    Page<HeroDTO> heroesDTO = heroes.map(hero -> modelMapper.map(hero, HeroDTO.class));
    
    return ResponseEntity.ok(heroesDTO);
}
```

Le frontend gère cette pagination :

```jsx
// src/components/hero/HeroList.jsx
import { useState, useEffect } from 'react';
import { HeroService } from '../../services/heroService';
import HeroCard from './HeroCard';
import Pagination from '../ui/Pagination';
import './HeroList.css';

const HeroList = ({ filters }) => {
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        setLoading(true);
        
        // Construire les paramètres de requête
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        
        if (filters.name) {
          params.append('name', filters.name);
        }
        
        if (filters.element) {
          params.append('element', filters.element);
        }
        
        if (filters.rarity) {
          params.append('rarity', filters.rarity);
        }
        
        // Faire l'appel API
        const response = await HeroService.getAllHeroesWithParams(params);
        
        setHeroes(response.content);
        setTotalPages(response.totalPages);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };
    
    fetchHeroes();
  }, [page, size, filters]);
  
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  if (loading) {
    return <div className="loading">Chargement...</div>;
  }
  
  if (error) {
    return <div className="error">Erreur: {error.message}</div>;
  }
  
  return (
    <div className="hero-list-container">
      <div className="hero-list">
        {heroes.map(hero => (
          <HeroCard key={hero.id} hero={hero} />
        ))}
      </div>
      
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default HeroList;
```

## Conclusion

L'intégration entre le backend Spring Boot et le frontend React d'Epic7 repose sur plusieurs principes clés :

1. **API RESTful** : Le backend expose une API bien structurée que le frontend consomme.
2. **WebSocket** : Pour les fonctionnalités en temps réel, WebSocket est utilisé.
3. **Authentification JWT** : Un système d'authentification basé sur les tokens assure la sécurité.
4. **DTO** : Des objets de transfert de données structurent les échanges.
5. **Services Frontend** : Des services encapsulent la logique d'appel API.
6. **Gestion du Cache** : Des stratégies de mise en cache améliorent les performances.
7. **Pagination** : Pour gérer les grandes quantités de données.

Cette architecture assure une communication fluide entre le frontend et le backend tout en maintenant la sécurité et les performances de l'application. La séparation claire des responsabilités et l'utilisation de bonnes pratiques facilitent également la maintenance et l'évolution de l'application au fil du temps.
