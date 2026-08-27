import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Complaints from "../pages/Complaints";
import Officials from "../pages/Officials";
import Analytics from "../pages/Analytics";
import Settings from "../pages/Settings";
import Login from "../pages/Login";

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/"           element={<Dashboard />} />
      <Route path="/dashboard"  element={<Dashboard />} />
      <Route path="/complaints" element={<Complaints />} />
      <Route path="/officials"  element={<Officials />} />
      <Route path="/analytics"  element={<Analytics />} />
      <Route path="/settings"   element={<Settings />} />
      <Route path="/login"      element={<Login />} />
      {/* Redirect unknown routes to dashboard */}
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
