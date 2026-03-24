import Admin from './pages/Admin'
import AdminRoute from './components/AdminRoute'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ParentDashboard from './pages/ParentDashboard'
import BottomNav from './components/BottomNav'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navbar />
      
      <Routes>
      <Route path="/admin" element={
     <AdminRoute><Admin /></AdminRoute>
    } />
        <Route path="/login" element={<Login />} />
        
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
        
        <Route path="/quiz" element={
          <ProtectedRoute><Quiz /></ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        
        <Route path="/parent-dashboard" element={
       <ProtectedRoute><ParentDashboard /></ProtectedRoute>
      }  />
      
      
      </Routes>
      
      
      
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
