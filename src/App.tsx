import { Routes, Route } from 'react-router-dom'
import './style.css'
import Dashboard from './components/Dashboard/Dashboard'
import Navbar from './components/Dashboard/Navbar/Navbar'

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

function CreatePost() {
  return (
    <div>
      <Navbar />
      <div style={{ paddingTop: '90px', paddingLeft: '40px', paddingRight: '40px' }}>
        <h1>Create Post</h1>
        <p>This is the create post page.</p>
      </div>
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
        {/*sign in/sign up page at start*/}
        <Route path="/" element={<Home />} />
        {/*dashboard page*/}
        <Route path="/dashboard" element={<Dashboard />} />
        {/*create post page*/}
        <Route path="/create-post" element={<CreatePost />} />
        {/*profile page*/}
        <Route path="/profile" element={<Profile />} />
        {/*sign up page*/}
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </div>
  )
}

export default App

