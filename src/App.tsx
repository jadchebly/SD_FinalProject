import { Routes, Route, Navigate } from 'react-router-dom'
import './style.css'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './components/Dashboard/Dashboard'
import CreatePost from "./pages/CreatePost"
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-post" 
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/:id?" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
