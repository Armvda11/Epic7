import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import "../styles/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      setMessage("Connexion réussie !");
      navigate("/dashboard");
    } catch (error) {
      setMessage("Échec de la connexion. Vérifie tes identifiants.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-overlay">
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Bienvenue dans Epic7</h2>
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Se connecter</button>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
