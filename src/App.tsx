import { Routes, Route, Link } from 'react-router-dom'
import './style.css'
import Dashboard from './Dashboard'

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to your React Router app!</p>
    </div>
  )
}

function About() {
  return (
    <div>
      <h1>About</h1>
      <p>This is the about page.</p>
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
        <Route path="/create-post" element={<About />} />
        {/*profile page*/}
        <Route path="/profile" element={<About />} />
        {/*sign up page*/}
        <Route path="/signup" element={<About />} />
      </Routes>
    </div>
  )
}

export default App

