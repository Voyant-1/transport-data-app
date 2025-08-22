import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import './TransportData.css';
import { Link } from 'react-router-dom';
import logo from './Assets/Voyant_Logo_White1.png';

function TransportData() {
  const [transportData, setTransportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([
    'dot_number', 'legal_name', 'power_units', 'phy_city', 'phy_state', 'phy_zip'
  ]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [totalRowsFetched, setTotalRowsFetched] = useState(0);
  const [maxRecords] = useState(2500000);
  const [cumulativeResultsCount, setCumulativeResultsCount] = useState(0);

  // Filter States
  const [stateFilter, setStateFilter] = useState(null);
  const [cityFilter, setCityFilter] = useState('');
  const [zipFilter, setZipFilter] = useState('');

  const limit = 1000;

  const stateOptions = [
    { value: 'AL', label: 'Alabama (AL)' },
    { value: 'AK', label: 'Alaska (AK)' },
    { value: 'AZ', label: 'Arizona (AZ)' },
    { value: 'AR', label: 'Arkansas (AR)' },
    { value: 'CA', label: 'California (CA)' },
    { value: 'CO', label: 'Colorado (CO)' },
    { value: 'CT', label: 'Connecticut (CT)' },
    { value: 'DE', label: 'Delaware (DE)' },
    { value: 'FL', label: 'Florida (FL)' },
    { value: 'GA', label: 'Georgia (GA)' },
    { value: 'HI', label: 'Hawaii (HI)' },
    { value: 'ID', label: 'Idaho (ID)' },
    { value: 'IL', label: 'Illinois (IL)' },
    { value: 'IN', label: 'Indiana (IN)' },
    { value: 'IA', label: 'Iowa (IA)' },
    { value: 'KS', label: 'Kansas (KS)' },
    { value: 'KY', label: 'Kentucky (KY)' },
    { value: 'LA', label: 'Louisiana (LA)' },
    { value: 'ME', label: 'Maine (ME)' },
    { value: 'MD', label: 'Maryland (MD)' },
    { value: 'MA', label: 'Massachusetts (MA)' },
    { value: 'MI', label: 'Michigan (MI)' },
    { value: 'MN', label: 'Minnesota (MN)' },
    { value: 'MS', label: 'Mississippi (MS)' },
    { value: 'MO', label: 'Missouri (MO)' },
    { value: 'MT', label: 'Montana (MT)' },
    { value: 'NE', label: 'Nebraska (NE)' },
    { value: 'NV', label: 'Nevada (NV)' },
    { value: 'NH', label: 'New Hampshire (NH)' },
    { value: 'NJ', label: 'New Jersey (NJ)' },
    { value: 'NM', label: 'New Mexico (NM)' },
    { value: 'NY', label: 'New York (NY)' },
    { value: 'NC', label: 'North Carolina (NC)' },
    { value: 'ND', label: 'North Dakota (ND)' },
    { value: 'OH', label: 'Ohio (OH)' },
    { value: 'OK', label: 'Oklahoma (OK)' },
    { value: 'OR', label: 'Oregon (OR)' },
    { value: 'PA', label: 'Pennsylvania (PA)' },
    { value: 'RI', label: 'Rhode Island (RI)' },
    { value: 'SC', label: 'South Carolina (SC)' },
    { value: 'SD', label: 'South Dakota (SD)' },
    { value: 'TN', label: 'Tennessee (TN)' },
    { value: 'TX', label: 'Texas (TX)' },
    { value: 'UT', label: 'Utah (UT)' },
    { value: 'VT', label: 'Vermont (VT)' },
    { value: 'VA', label: 'Virginia (VA)' },
    { value: 'WA', label: 'Washington (WA)' },
    { value: 'WV', label: 'West Virginia (WV)' },
    { value: 'WI', label: 'Wisconsin (WI)' },
    { value: 'WY', label: 'Wyoming (WY)' }
  ];

  const cargoOptions = [
    { value: 'crgo_genfreight', label: 'General Freight' },
    { value: 'crgo_household', label: 'Household Goods'},
    { value: 'crgo_metalsheet', label: 'Metal: Sheets, Coils, Rolls'},
    { value: 'crgo_motoveh',label: 'Motor Vehicles'},
    { value: 'crgo_drivetow', label: 'Driveaway/ Towaway'},
    { value: 'crgo_logpole', label: 'Logs, Poles, Beams, Lumber'},
    { value: 'crgo_bldgmat', label: 'Building Materials'},
    { value: 'crgo_mobilehome', label: 'Mobile Homes'},
    { value: 'crgo_machlrg', label: 'Machinery, Large Objects'},
    { value: 'crgo_produce', label: 'Fresh Produce'},
    { value: 'crgo_liqgas',label: 'Liquids/Gases'},
    { value:  'crgo_intermodal', label: 'Intermodal Containers'},
    { value: 'crgo_passengers', label: 'Passengers'},
    { value: 'crgo_oilfield', label: 'Oilfield Equipment'},
    { value: 'crgo_livestock', label: 'Livestock'},
    { value: 'crgo_grainfeed', label: 'Grain, Feed, Hay'},
    { value: 'crgo_coalcoke',label: 'Coal/Coke'},
    { value: 'crgo_meat', label: 'Meat'},
    { value: 'crgo_garbage', label: 'Garbage, Refuse, Trash'},
    { value: 'crgo_usmail', label: 'Mail'},
    { value: 'crgo_chem', label: 'Chemicals'},
    { value: 'crgo_drybulk', label: 'Commodities  Dry Bulk'},
    { value: 'crgo_coldfood', label: 'Refrigerated Food'},
    { value: 'crgo_beverages',label: 'Beverages'},
    { value: 'crgo_paperprod', label: 'Paper Products'},
    { value: 'crgo_utility', label: 'Utility'},
    { value: 'crgo_farmsupp', label: 'Farm Supplies'},
    { value: 'crgo_construct', label: 'Construction'},
    { value: 'crgo_waterwell', label: 'Water-Well'},
    { value: 'crgo_cargoothr', label: 'Other'},
  ];
  
  const [selectedCargoFilter, setSelectedCargoFilter] = useState(null);

  const columns = [
    'mcs150_date', 'add_date', 'status_code', 'dot_number', 'dun_bradstreet_no', 'phy_omc_region', 'safety_inv_terr',
    'carrier_operation', 'business_org_id', 'mcs150_mileage', 'mcs150_mileage_year', 'mcs151_mileage', 'total_cars',
    'mcs150_update_code_id', 'prior_revoke_flag', 'prior_revoke_dot_number', 'phone', 'fax', 'cell_phone',
    'company_officer_1', 'company_officer_2', 'business_org_desc', 'truck_units', 'power_units', 'bus_units',
    'fleetsize', 'review_id', 'recordable_crash_rate', 'mail_nationality_indicator', 'phy_nationality_indicator',
    'phy_barrio', 'mail_barrio', 'carship', 'docket1prefix', 'docket1', 'docket2prefix', 'docket2', 'docket3prefix',
    'docket3', 'pointnum', 'total_intrastate_drivers', 'mcsipstep', 'mcsipdate', 'hm_ind', 'interstate_beyond_100_miles',
    'interstate_within_100_miles', 'intrastate_beyond_100_miles', 'intrastate_within_100_miles', 'total_cdl',
    'total_drivers', 'avg_drivers_leased_per_month', 'classdef', 'legal_name', 'dba_name', 'phy_street', 'phy_city',
    'phy_country', 'phy_state', 'phy_zip', 'phy_cnty', 'carrier_mailing_street', 'carrier_mailing_state',
    'carrier_mailing_city', 'carrier_mailing_country', 'carrier_mailing_zip', 'carrier_mailing_cnty',
    'carrier_mailing_und_date', 'driver_inter_total', 'email_address', 'review_type', 'review_date', 'safety_rating',
    'safety_rating_date', 'undeliv_phy', 'crgo_genfreight', 'crgo_household', 'crgo_metalsheet', 'crgo_motoveh',
    'crgo_drivetow', 'crgo_logpole', 'crgo_bldgmat', 'crgo_mobilehome', 'crgo_machlrg', 'crgo_produce', 'crgo_liqgas',
    'crgo_intermodal', 'crgo_passengers', 'crgo_oilfield', 'crgo_livestock', 'crgo_grainfeed', 'crgo_coalcoke',
    'crgo_meat', 'crgo_garbage', 'crgo_usmail', 'crgo_chem', 'crgo_drybulk', 'crgo_coldfood', 'crgo_beverages',
    'crgo_paperprod', 'crgo_utility', 'crgo_farmsupp', 'crgo_construct', 'crgo_waterwell', 'crgo_cargoothr',
    'crgo_cargoothr_desc', 'owntruck', 'owntract', 'owntrail', 'owncoach', 'ownschool_1_8', 'ownschool_9_15',
    'ownschool_16', 'ownbus_16', 'ownvan_1_8', 'ownvan_9_15', 'ownlimo_1_8', 'ownlimo_9_15', 'ownlimo_16',
    'trmtruck', 'trmtract', 'trmtrail', 'trmcoach', 'trmschool_1_8', 'trmschool_9_15', 'trmschool_16', 'trmbus_16',
    'trmvan_1_8', 'trmvan_9_15', 'trmlimo_1_8', 'trmlimo_9_15', 'trmlimo_16', 'trptruck', 'trptract', 'trptrail',
    'trpcoach', 'trpschool_1_8', 'trpschool_9_15', 'trpschool_16', 'trpbus_16', 'trpvan_1_8', 'trpvan_9_15',
    'trplimo_1_8', 'trplimo_9_15', 'trplimo_16'
  ];

  const [powerUnitsComparison, setPowerUnitsComparison] = useState(''); // '<' or '>'
  const [powerUnitsValue, setPowerUnitsValue] = useState(''); // Number input


  // Function to fetch data from the API
  const fetchData = async (offset = 0, isLoadMore = false) => {
    try {
      setLoading(true);
      setNoResults(false);
  
      // Base query with limit and offset
      let query = `https://data.transportation.gov/resource/az4n-8mr2.json?$limit=${limit}&$offset=${offset}`;
      let whereClauses = [];
  
      // Construct the search term filter
      if (searchTerm) {
        const cleanedSearchTerm = searchTerm.trim();
        if (!isNaN(cleanedSearchTerm)) {
          whereClauses.push(`dot_number=${cleanedSearchTerm}`);
        } else {
          whereClauses.push(`upper(legal_name) like upper('%25${encodeURIComponent(cleanedSearchTerm)}%25')`);
        }
      }
  
      // Add state filter
      if (stateFilter) {
        whereClauses.push(`phy_state='${stateFilter.value}'`);
      }
  
      // Construct city filter
      if (cityFilter) {
        whereClauses.push(`upper(phy_city) like upper('%25${encodeURIComponent(cityFilter)}%25')`);
      }
  
      // Construct ZIP code filter
      if (zipFilter) {
        if (zipFilter.length === 3) {
          whereClauses.push(`starts_with(phy_zip, '${zipFilter}')`);
        } else if (zipFilter.length === 5) {
          whereClauses.push(`phy_zip='${zipFilter}'`);
        }
      }
  
      // Add cargo filter if selected
      if (selectedCargoFilter) {
        whereClauses.push(`${selectedCargoFilter.value}='X'`);
      }
  
      // Join all conditions with 'AND' and append to the query
      if (whereClauses.length > 0) {
        query += `&$where=${whereClauses.join(' AND ')}`;
      }
  
      // Log the constructed query for debugging
      console.log('Constructed Query:', query);
  
      const response = await fetch(query, {
        headers: {
          'X-App-Token': process.env.REACT_APP_API_TOKEN,
        },
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      let data = await response.json();
      console.log('Fetched data:', data);
  
      // Apply client-side power units filter
      if (powerUnitsComparison && powerUnitsValue) {
        console.log(`Applying client-side filter: power_units ${powerUnitsComparison} ${powerUnitsValue}`);
        data = data.filter(item => {
          const powerUnits = parseFloat(item.power_units);
          return !isNaN(powerUnits) && (
            powerUnitsComparison === '>' ? powerUnits > parseFloat(powerUnitsValue) : powerUnits < parseFloat(powerUnitsValue)
          );
        });
      }
  
      console.log('Filtered data after power_units filter:', data);
  
      if (data.length > 0) {
        setTransportData(prevData => isLoadMore ? [...prevData, ...data] : data);
        setCumulativeResultsCount(prevCount => prevCount + data.length);
        setTotalRowsFetched(prev => prev + data.length);
      } else {
        setNoResults(true);
      }
  
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      setNoResults(true);
    }
  };
  
  // Modify the handleLoadMore function to pass the updated offset
  const handleLoadMore = () => {
    if (totalRowsFetched < maxRecords) {
      fetchData(totalRowsFetched, true);
    }
  };
  
  
  // Effect to fetch data when search terms or filters change
  useEffect(() => {
    if (searchTerm || stateFilter || cityFilter || zipFilter || selectedCargoFilter || powerUnitsComparison || powerUnitsValue) {
      fetchData(0);
    }
  }, [searchTerm, stateFilter, cityFilter, zipFilter, selectedCargoFilter, powerUnitsComparison, powerUnitsValue]);

  // Function Handlers
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setTransportData([]);
    setTotalRowsFetched(0);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleColumnChange = (event) => {
    const column = event.target.value;
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(col => col !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleStateChange = (selectedOption) => {
    setStateFilter(selectedOption);
    setTransportData([]);
    setTotalRowsFetched(0);
    setCumulativeResultsCount(0);
  };

  const handleCityChange = (event) => {
    setCityFilter(event.target.value);
    setTransportData([]);
    setTotalRowsFetched(0);
    setCumulativeResultsCount(0);
  };

  const handleZipChange = (event) => {
    setZipFilter(event.target.value);
    setTransportData([]);
    setTotalRowsFetched(0);
    setCumulativeResultsCount(0);
  };

  const handleCargoFilterChange = (selectedOption) => {
    setSelectedCargoFilter(selectedOption);
    setTransportData([]);
    setTotalRowsFetched(0);
    setCumulativeResultsCount(0);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStateFilter(null);
    setCityFilter('');
    setZipFilter('');
    setTransportData([]);
    setTotalRowsFetched(0);
    setCumulativeResultsCount(0);
  };


  // Return JSX
 // Return JSX
return (
  <div className="TransportData">
    {/* Navigation Bar */}
    <nav className="navbar">
      <div className="navbar-logo">
        <img src={logo} alt="Logo" />
      </div>
      <div className="navbar-links">
        <a href="/" className="nav-link">Home</a>
        <a href="/about" className="nav-link">About</a>
        <a href="/contact" className="nav-link">Contact</a>
      </div>
    </nav>

    {/* Main Container */}
    <div className={`main-container ${isSidebarOpen ? 'open-sidebar' : 'collapsed-sidebar'}`}>
      {/* Sidebar */}
      <div className={`sidebar-container ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="filters-container">
          <h3>Column View</h3>
          <div className="scrollable-column-view">
            {columns.map((column, index) => (
              <div key={index}>
                <input
                  type="checkbox"
                  value={column}
                  checked={selectedColumns.includes(column)}
                  onChange={handleColumnChange}
                />
                <label>{column.replace(/_/g, ' ')}</label>
              </div>
            ))}
          </div>
          <h3>Filters</h3>
            <Select
              options={stateOptions}
              value={stateFilter}
              onChange={handleStateChange}
              placeholder="Select State"
              isClearable
              isSearchable
            />
            <input
              type="text"
              placeholder="Filter by City"
              value={cityFilter}
              onChange={handleCityChange}
            />
            <input
              type="text"
              placeholder="Filter by ZIP Code"
              value={zipFilter}
              onChange={handleZipChange}
            />
            <Select
              options={cargoOptions}
              value={selectedCargoFilter}
              onChange={handleCargoFilterChange}
              placeholder="Select Cargo Filter"
              isClearable
              isSearchable
            />

            {/* Power Units Filter */}
            <div className="power-units-filter">
              <select 
                value={powerUnitsComparison} 
                onChange={(e) => setPowerUnitsComparison(e.target.value)}
              >
                <option value="">Select Comparison</option>
                <option value=">">Greater Than</option>
                <option value="<">Less Than</option>
              </select>
              <input 
                type="number" 
                placeholder="Enter Power Units" 
                value={powerUnitsValue} 
                onChange={(e) => setPowerUnitsValue(e.target.value)} 
              />
            </div>

            <button onClick={clearAllFilters} className="clear-all-button">Clear All Filters</button>
            </div>
            </div>

      {/* Main Content */}
      <div className="content-container">
        {/* Sidebar Toggle Button */}
        <button className="toggle-sidebar-button" onClick={toggleSidebar}>
          {isSidebarOpen ? '✖' : '☰'}
        </button>

        <div className="header-search-container">
          <h1>Transportation Data Search</h1>
          <input
            type="text"
            placeholder="Search by DOT number or Legal Name"
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        <div className="results-count">
  {loading ? (
    <p>Loading data...</p>
  ) : (
    <p>
      {cumulativeResultsCount > 0
        ? `Total results: ${cumulativeResultsCount}`
        : 'No results found'}
    </p>
  )}
</div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {selectedColumns.map(column => (
                  <th key={column}>{column.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
            {transportData.length > 0 ? (
              transportData.map((item, index) => (
                <tr key={index}>
                  {selectedColumns.map(column => (
                    <td key={column}>
                      {column === 'legal_name' ? (
                        <Link to={`/result/${item.dot_number}`}>
                          {item.legal_name}
                        </Link>
                      ) : (
                        item[column]
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={selectedColumns.length}>
                  {loading ? "Loading..." : noResults ? "No matching results found" : "Start a search"}
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {transportData.length > 0 && !noResults && totalRowsFetched < maxRecords && (
          <button onClick={handleLoadMore} disabled={loading} className="load-more-button">
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  </div>
);
}
export default TransportData;  