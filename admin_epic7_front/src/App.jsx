import { Routes, Route, Outlet } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/AdminLogin"; // Si tu veux une page de connexion
import PrivateRoute from "./components/PrivateRoute";
import AdminHeroesList from "./pages/GestionHeros";
import AdminUsersList from "./pages/GestionUtilisateur";
import CreateHeroForm from "./pages/CreateHeroe";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Outlet />}>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/heroes" element={<AdminHeroesList />} />
          <Route path="/admin/users" element={<AdminUsersList />} />
          <Route path="/admin/heroes/add" element={<CreateHeroForm />} />
          {/*<Route path="/admin/equipments" element={<EquipmentsPage />} /> */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
