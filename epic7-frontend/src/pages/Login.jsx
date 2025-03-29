// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  // Lock scrolling while on login
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  // Handle login process
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await login(email, password);
      localStorage.setItem("token", response.token);
      navigate("/dashboard");
    } catch (error) {
      setMessage("Échec de la connexion. Vérifie tes identifiants.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <main className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center text-white overflow-hidden">

      {/* Background image with animation */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-backgroundZoom -z-10"
        style={{ backgroundImage: "url('/mavuika.jpg')" }}
        aria-hidden="true"
      />

      {/* Form container with animation */}
      <motion.form
        onSubmit={handleLogin}
        className={`w-80 p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl text-white ${
          shake ? "animate-shake" : ""
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-label="Connexion"
      >
        <h2 className="text-3xl font-bold text-center mb-6">Connexion</h2>

        {/* Email */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <FaEnvelope /> Adresse e-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-500"
            placeholder="email@example.com"
          />
        </label>

        {/* Password */}
        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <FaLock /> Mot de passe
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full px-4 py-2 rounded-md bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-500"
            placeholder="••••••••"
          />
        </label>

        {/* Animated message */}
        <AnimatePresence>
          {message && (
            <motion.p
              className="text-sm font-semibold text-center mb-4 text-red-400"
              role="alert"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-2 rounded-md font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition transform hover:scale-105"
        >
          Se connecter
        </button>

        {/* Link to register */}
        <p className="text-sm mt-4 text-center">
          Pas encore de compte ?{" "}
          <Link
            to="/register"
            className="underline text-purple-300 hover:text-purple-400"
          >
            S’inscrire
          </Link>
        </p>
      </motion.form>
    </main>
  );
}

export default Login;
