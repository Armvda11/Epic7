import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/adminAuthService";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Page de connexion admin.
 */
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await login(email, password);
      localStorage.setItem("token", response.token);
      navigate("/dashboard"); // Redirige vers le tableau de bord admin
    } catch (error) {
      setMessage("Échec de la connexion. Vérifie tes identifiants.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <main className="fixed inset-0 bg-blue-100 flex items-center justify-center text-gray-800 overflow-hidden">

      <motion.form
        onSubmit={handleLogin}
        className={`w-80 p-8 bg-white rounded-xl shadow-xl ${
          shake ? "animate-shake" : ""
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-label="Connexion admin"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Connexion Admin</h2>

        {/* Email */}
        <label className="block mb-4">
          <span className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <FaEnvelope /> Adresse e-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full px-4 py-2 rounded-md bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
            placeholder="email@example.com"
          />
        </label>

        {/* Password */}
        <label className="block mb-6">
          <span className="text-sm font-medium flex items-center gap-2 text-gray-700">
            <FaLock /> Mot de passe
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full px-4 py-2 rounded-md bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
            placeholder="••••••••"
          />
        </label>

        {/* Animated error message */}
        <AnimatePresence>
          {message && (
            <motion.p
              className="text-sm font-semibold text-center mb-4 text-red-500"
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
          className="w-full py-2 rounded-md font-semibold bg-blue-500 text-white hover:bg-blue-600 transition transform hover:scale-105"
        >
          Se connecter
        </button>
      </motion.form>
    </main>
  );
}

export default Login;
