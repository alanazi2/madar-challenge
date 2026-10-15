import { Routes, Route, Navigate } from "react-router-dom";
import Participant from "./pages/Participant.jsx";
import Screen from "./pages/Screen.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Participant />} />
      <Route path="/screen" element={<Screen />} />
      <Route path="/screen.html" element={<Screen />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin.html" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
