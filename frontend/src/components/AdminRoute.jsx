import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  return children
}
