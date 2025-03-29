import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyHeroes from "./pages/MyHeroes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    
    <>
    
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-heroes" element={<MyHeroes />} />
      </Routes>

      {/* Toast container en-dehors des Routes */}
      <ToastContainer position="top-center" autoClose={3000} />
    </>
  );
}

export default App;
