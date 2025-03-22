import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
      const response = await login(email, password);
      localStorage.setItem("token", response.token);
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
          <h2>Connexion</h2>
          <input
            type="email"
            placeholder="Adresse e-mail"
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
          <p className="form-switch">
            Pas encore de compte ? <Link to="/register">S’inscrire</Link>
          </p>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
