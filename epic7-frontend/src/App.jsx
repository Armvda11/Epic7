import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyHeroes from "./pages/MyHeroes";
import Inventory from "./pages/Inventory";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeroView from "./pages/HeroView";
import PrivateRoute from "./components/PrivateRoute";
import { MailboxProvider } from "./context/MailboxContext";
import Shop from "./pages/Shop";

function App() {
  return (
    <MailboxProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/my-heroes" element={<MyHeroes />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/hero" element={<PrivateRoute />}>
          <Route path=":heroId" element={<HeroView />} /> 
        </Route>
      </Routes>

      {/* Toast container en-dehors des Routes */}
      <ToastContainer position="top-center" autoClose={3000} />
    </MailboxProvider>
  );
}

export default App;
