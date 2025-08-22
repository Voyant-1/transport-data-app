// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import TransportData from './TransportData';
import BulkLookup from './BulkLookup';
import NotFound from './NotFound';
import ResultDetails from './ResultDetails'; // Import the new ResultDetails component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transport-data" element={<TransportData />} />
        <Route path="/result/:dotNumber" element={<ResultDetails />} /> {/* Dynamic route */}
        <Route path="/Bulk-lookup" element={<BulkLookup />} />
        <Route path="*" element={<NotFound />} /> {/* Catch-all for unmatched routes */}
      </Routes>
    </Router>
  );
}

export default App;
