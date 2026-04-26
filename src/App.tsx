import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import GenderSelect from './pages/GenderSelect'
import SizeAnalysis from './pages/SizeAnalysis'
import TryOnSelect from './pages/TryOnSelect'
import VirtualTryOn from './pages/VirtualTryOn'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import GarmentDesigner from './pages/GarmentDesigner'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gender" element={<GenderSelect />} />
      <Route path="/size" element={<SizeAnalysis />} />
      <Route path="/mode-select" element={<TryOnSelect />} />
      <Route path="/try-on" element={<VirtualTryOn />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/designer" element={<GarmentDesigner />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
