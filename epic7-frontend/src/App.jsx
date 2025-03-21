import { useState } from "react";
import { login } from "./services/authService";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      setMessage(data.message || "Connexion réussie !");
      setToken(localStorage.getItem("token")); // Mise à jour du token dans l'état
    } catch (error) {
      setMessage("Erreur de connexion.");
    }
  };

  const testToken = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/auth/check-token", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const result = await response.text();
      alert("Réponse du backend : " + result);
    } catch (error) {
      alert("Erreur lors de la vérification du token.");
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setMessage("Déconnecté");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Connexion</h1>

      <button onClick={testToken}>Tester le token JWT</button>

      {!token ? (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <br />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <br />
          <button type="submit">Se connecter</button>
        </form>
      ) : (
        <>
          <p>{message}</p>
          <p><strong>Token JWT :</strong></p>
          <code style={{ display: "inline-block", maxWidth: "90%", wordWrap: "break-word" }}>
            {token}
          </code>
          <br />
          <button onClick={handleLogout}>Se déconnecter</button>
        </>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}

export default App;
