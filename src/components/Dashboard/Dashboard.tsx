import Navbar from "./Navbar/Navbar";
import "./Dashboard.css";


export default function Dashboard() {


    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content">
          <h1>Dashboard</h1>
          <p>This is the dashboard page.</p>
        </div>
      </div>
    );
  }