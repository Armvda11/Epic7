import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center animate-backgroundZoom z-0"
        style={{ backgroundImage: "url('./mavuika.jpg')" }}
      ></div>

      <div className="absolute inset-0 bg-black bg-opacity-60 flex justify-center items-center z-10">
        <form
          onSubmit={handleLogin}
          className="w-80 p-10 bg-white/20 backdrop-blur-md rounded-xl text-center text-white animate-glowEffect shadow-2xl"
        >
          <h2 className="text-2xl font-bold mb-6">Connexion</h2>

          <input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 mb-4 rounded-md text-black placeholder-gray-500"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 mb-4 rounded-md text-black placeholder-gray-500"
          />

          <button
            type="submit"
            className="w-full p-3 rounded-md font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition duration-300"
          >
            Se connecter
          </button>

          <p className="text-sm mt-4">
            Pas encore de compte ?{" "}
            <Link to="/register" className="underline text-purple-300 hover:text-purple-400">
              S’inscrire
            </Link>
          </p>

          {message && <p className="text-white font-bold mt-3">{message}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
