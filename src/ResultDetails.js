import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import logo from './Assets/Voyant_Logo_White1.png';
import './ResultDetails.css';

function ResultDetails() {
  const { dotNumber } = useParams();
  const [resultDetails, setResultDetails] = useState([]);
  const [vinDetails, setVinDetails] = useState([]);
  const [equipmentSummary, setEquipmentSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('authority'); // To track which tab is active

  const limit = 1000;
  const batchSize = 250;

  const equipmentTypeMapping = {
    "Box or Van Enclosed Trailer": "Dry Van",
    "Intermodal Container Chassis or Trailer": "Chassis",
    "Flatbed or Platform Trailer": "Flatbed",
    "Reefer Trailer": "Reefer",
  };

  // Helper function to calculate the equipment summary
  const calculateEquipmentSummary = (vinResults) => {
    const equipmentMap = {};

    vinResults.forEach((vin) => {
      const equipmentType = equipmentTypeMapping[vin.TrailerBodyType] || vin.TrailerBodyType;
      const key = `${equipmentType}_${vin.TrailerLength}`;

      if (!equipmentMap[equipmentType]) {
        equipmentMap[equipmentType] = {};
      }

      if (!equipmentMap[equipmentType][vin.TrailerLength]) {
        equipmentMap[equipmentType][vin.TrailerLength] = { count: 0, totalYear: 0 };
      }

      equipmentMap[equipmentType][vin.TrailerLength].count++;
      equipmentMap[equipmentType][vin.TrailerLength].totalYear += parseInt(vin.ModelYear, 10) || 0;
    });

    const equipmentSummaryObj = {};
    Object.keys(equipmentMap).forEach((type) => {
      equipmentSummaryObj[type] = Object.keys(equipmentMap[type]).map((size) => {
        const equipment = equipmentMap[type][size];
        const currentYear = new Date().getFullYear();
        const averageAge = currentYear - Math.round(equipment.totalYear / equipment.count);
        return { size, count: equipment.count, averageAge };
      });
    });

    console.log("Equipment Summary Object:", equipmentSummaryObj); // Log the calculated summary
    setEquipmentSummary(equipmentSummaryObj);
  };

  // Function to fetch inspection data
  const fetchInspectionData = async (offset = 0) => {
    try {
      if (offset === 0) {
        setResultDetails([]);
      }

      console.log(`Fetching inspection data with offset: ${offset}`);

      const response = await fetch(
        `https://data.transportation.gov/resource/fx4q-ay7w.json?$limit=${limit}&$offset=${offset}&dot_number=${dotNumber}`,
        {
          headers: {
            'X-App-Token': process.env.REACT_APP_API_TOKEN,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Inspection Data:", data); // Log the fetched inspection data
      setResultDetails((prevData) => [...prevData, ...data]);

      if (data.length === limit) {
        fetchInspectionData(offset + limit);
      } else {
        const inspectionIds = data.map((item) => item.inspection_id);
        await fetchUnitDataInBatches(inspectionIds);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching inspection data:", err); // Log any errors
    } finally {
      setLoading(false);
    }
  };

  // Function to batch fetch unit data
  const fetchUnitDataInBatches = async (inspectionIds) => {
    const allUnitData = [];
    const promises = [];

    for (let i = 0; i < inspectionIds.length; i += batchSize) {
      const batch = inspectionIds.slice(i, i + batchSize);
      console.log(`Fetching unit data for batch: ${batch}`);

      const soqlQuery = `$where=inspection_id IN (${batch.map((id) => `'${id}'`).join(',')})`;

      const fetchPromise = fetch(`https://data.transportation.gov/resource/wt8s-2hbx.json?${soqlQuery}`, {
        headers: {
          'X-App-Token': process.env.REACT_APP_API_TOKEN,
        },
      })
        .then((response) => response.json())
        .then((unitData) => {
          console.log("Unit Data for Batch:", unitData); // Log the unit data for this batch
          allUnitData.push(...unitData);
        })
        .catch((err) => {
          setError(err.message);
          console.error("Error fetching unit data for batch:", err); // Log errors
        });

      promises.push(fetchPromise);
    }

    await Promise.all(promises);

    console.log("All Unit Data:", allUnitData); // Log all accumulated unit data

    const vehicleIds = allUnitData
      .filter((item) => item.insp_unit_type_id === '9' || item.insp_unit_type_id === '14')
      .map((item) => item.insp_unit_vehicle_id_number);

    console.log("Filtered Vehicle IDs for VIN decoding:", vehicleIds);

    if (vehicleIds.length > 0) {
      await fetchVinData(vehicleIds);
    }
  };

  // Function to fetch VIN decoding data
  const fetchVinData = async (vehicleIds) => {
    const vinBatches = [];
    for (let i = 0; i < vehicleIds.length; i += 50) {
      vinBatches.push(vehicleIds.slice(i, i + 50));
    }

    const allVinResults = [];

    for (const batch of vinBatches) {
      console.log("Sending VIN batch to API:", batch);

      const response = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `format=json&data=${batch.join(';')}`,
      });

      const vinData = await response.json();
      console.log("VIN API response:", vinData); // Log the response from the VIN API
      allVinResults.push(...vinData.Results);
    }

    console.log("Decoded VIN results:", allVinResults); // Log the decoded VIN results
    setVinDetails(allVinResults);
    calculateEquipmentSummary(allVinResults);
  };

  useEffect(() => {
    console.log("Component loaded. Fetching inspection data...");
    fetchInspectionData(0);
  }, [dotNumber]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const carrierName = resultDetails[0]?.insp_carrier_name || "N/A";
  const dbaName = resultDetails[0]?.dba_name || "N/A";

  return (
    <div className="ResultDetails">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <img src={logo} alt="Logo" />
        </div>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/transport-data" className="nav-link">Transport Data</Link>
          <Link to="/postal-lookup" className="nav-link">Postal Lookup</Link>
          <Link to="/about" className="nav-link">About</Link>
        </div>
      </nav>

      {/* Carrier Information */}
      <div className="carrier-info">
        <div className="carrier-details">
          <h2>Carrier Information</h2>
          <p><strong>Legal Name:</strong> {carrierName}</p>
          <p><strong>DBA:</strong> {dbaName}</p>
          <p><strong>DOT Number:</strong> {dotNumber}</p>
        </div>
        <div className="equipment-summary">
          <h2>Equipment Summary</h2>
          {Object.keys(equipmentSummary).map((equipmentType) => (
            <div key={equipmentType}>
              <h3>{equipmentType}</h3>
              <ul>
                {equipmentSummary[equipmentType].map((item, index) => (
                  <li key={index}>
                    Size: {item.size}, Count: {item.count}, Avg. Age: {item.averageAge} years
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="content-container">
        <div className="tab-navigation">
          <button onClick={() => setActiveTab('authority')} className={activeTab === 'authority' ? 'active-tab' : ''}>Authority</button>
          <button onClick={() => setActiveTab('lanes')} className={activeTab === 'lanes' ? 'active-tab' : ''}>Lanes</button>
          <button onClick={() => setActiveTab('insurance')} className={activeTab === 'insurance' ? 'active-tab' : ''}>Insurance</button>
          <button onClick={() => setActiveTab('crashes')} className={activeTab === 'crashes' ? 'active-tab' : ''}>Crashes</button>
          <button onClick={() => setActiveTab('inspections')} className={activeTab === 'inspections' ? 'active-tab' : ''}>Inspections</button>
        </div>

        <div className="tab-content">
          {activeTab === 'authority' && (
            <section id="authority">
              <h2>Authority</h2>
              <p>Authority details...</p>
            </section>
          )}
          {activeTab === 'lanes' && (
            <section id="lanes">
              <h2>Lanes</h2>
              <p>Lanes details...</p>
            </section>
          )}
          {activeTab === 'insurance' && (
            <section id="insurance">
              <h2>Insurance</h2>
              <p>Insurance details...</p>
            </section>
          )}
          {activeTab === 'crashes' && (
            <section id="crashes">
              <h2>Crashes</h2>
              <p>Crash details...</p>
            </section>
          )}
          {activeTab === 'inspections' && (
            <section id="inspections">
              <h2>Inspections</h2>
              <div className="inspection-container">
                <div className="scrollable-inspections">
                  {resultDetails.map((inspection, index) => (
                    <div key={index}>
                      <p>Inspection ID: {inspection.inspection_id}</p>
                      <p>Date: {inspection.insp_date}</p>
                      <p>Location: {inspection.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultDetails;
