import React from 'react';
import { Link } from 'react-router-dom';
import logo from './Assets/Voyant_Logo_White1.png'; // Corrected import for logo
import postalIcon from './Assets/Map_postal.png';
import SearchIcon from './Assets/Carrier_Search2.png';
import './Home.css';

function Home() {
  return (
    <div className="page-container">
      {/* Logo Section */}
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>

      {/* Icons Section */}
      <div className="icons-container">
        {/* Transportation Census Card */}
        <div className="card">
          <Link to="/transport-data">
            <div className="card-content">
              <img src={SearchIcon} alt="Carrier Search" className="card-icon" />
              <h2>Carrier Search</h2>
            </div>
          </Link>
        </div>

        {/* Postal Lookup Card */}
        <div className="card">
          <Link to="/Bulk-lookup">
            <div className="card-content">
              <img src={postalIcon} alt="Postal Lookup" className="card-icon" />
              <h2>Bulk Lookup</h2>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
