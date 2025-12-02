import { Routes, Route } from 'react-router-dom'
import './style.css'
import Dashboard from './components/Dashboard/Dashboard'
import CreatePost from "./pages/CreatePost";

function SignIn() {
  return (
    <div>
      <h1>Sign In</h1>
      <p>This is the sign in page.</p>
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
        {/*sign in/sign up page at start*/}
        <Route path="/" element={<SignIn />} />
        <Route path="/signin" element={<SignIn />} />
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
