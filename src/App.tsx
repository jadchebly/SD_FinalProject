import { Routes, Route } from 'react-router-dom'
import './style.css'
import Dashboard from './components/Dashboard/Dashboard'
import CreatePost from "./pages/CreatePost";

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to your React Router app!</p>
    </div>
  )
}

function SignUp() {
  return (
    <div>
      <h1>Sign Up</h1>
      <p>This is the sign up page.</p>
    </div>
  )
}

function Profile() {
  return (
    <div>
      <h1>Profile</h1>
      <p>This is the profile page.</p>
    </div>
  )
}

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </div>
  )
}

export default App
