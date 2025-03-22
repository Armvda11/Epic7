import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/authService";
import "../styles/Login.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await register(email, password);
      localStorage.setItem("token", response.token);
      setMessage("Inscription réussie !");
      navigate("/dashboard");
    } catch (error) {
      setMessage("Erreur : cet email est déjà utilisé.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-overlay">
        <form className="login-form" onSubmit={handleRegister}>
          <h2>Inscription</h2>
          <input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe (min. 6 caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Créer un compte</button>
          <p className="form-switch">
            Déjà inscrit ? <Link to="/">Se connecter</Link>
          </p>
          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default Register;
