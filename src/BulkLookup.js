import React, { useState } from 'react';
import axios from 'axios';
import './ResultDetails.css';

const ZipCodeRadiusSearch = () => {
    const [zipCode, setZipCode] = useState('');
    const [radius, setRadius] = useState(50);  // Default radius is 50 miles
    const [results, setResults] = useState([]);

    // Example dataset of ZIP codes with coordinates
    const zipData = [
        { zip: '37934', lat: 35.8722, lon: -84.1746 },
        // Add other ZIP codes here with lat/lon
    ];

    // Haversine formula for distance calculation
    const haversine = (lat1, lon1, lat2, lon2) => {
        const r = 3959;  // Radius of Earth in miles
        const toRadians = angle => (Math.PI / 180) * angle;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
        return 2 * r * Math.asin(Math.sqrt(a));
    };

    // Function to fetch coordinates for the target ZIP code
    const fetchCoordinates = async () => {
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    postalcode: zipCode,
                    country: 'us',
                    format: 'json',
                },
            });
            if (response.data.length > 0) {
                const { lat, lon } = response.data[0];
                calculateNearbyZipCodes(parseFloat(lat), parseFloat(lon));
            } else {
                alert('ZIP code not found.');
            }
        } catch (error) {
            console.error('Error fetching coordinates:', error);
        }
    };

    // Calculate ZIP codes within the specified radius
    const calculateNearbyZipCodes = (targetLat, targetLon) => {
        const nearbyZips = zipData.filter(entry => {
            const distance = haversine(targetLat, targetLon, entry.lat, entry.lon);
            return distance <= radius;
        }).map(entry => entry.zip);

        setResults(nearbyZips);
    };

    // Form submit handler
    const handleSearch = (e) => {
        e.preventDefault();
        if (zipCode) {
            fetchCoordinates();
        } else {
            alert("Please enter a ZIP code.");
        }
    };

    return (
        <div>
            <h2>ZIP Code Radius Search</h2>
            <form onSubmit={handleSearch}>
                <label>
                    ZIP Code:
                    <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                    />
                </label>
                <label>
                    Radius (miles):
                    <input
                        type="number"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                    />
                </label>
                <button type="submit">Search</button>
            </form>
            <div>
                <h3>ZIP Codes within {radius} miles of {zipCode}:</h3>
                {results.length > 0 ? (
                    <ul>
                        {results.map((zip, index) => (
                            <li key={index}>{zip}</li>
                        ))}
                    </ul>
                ) : (
                    <p>No results found.</p>
                )}
            </div>
        </div>
    );
};

export default ZipCodeRadiusSearch;
