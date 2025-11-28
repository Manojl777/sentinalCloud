import React, { useState, useEffect } from 'react';

// Import dashboard components
import TrafficStats from '../components/TrafficStats/TrafficStats.jsx';
import AlertsPanel from '../components/AlertsPanel/AlertsPanel.jsx';
import './PageStyles.css';

// --------------------------------------------------
// 🔥 PRODUCTION API BASE (Cloud Run / Vercel)
// --------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + "/api";

/*
  --------------------------------------------------
  🔧 LOCAL DEVELOPMENT (Uncomment when running locally)
  --------------------------------------------------
  const API_BASE_URL = "http://localhost:8000/api";
*/

export default function Dashboard() {
  const [kpiData, setKpiData] = useState([
    { id: 1, title: 'Total Events Analyzed', value: '...' },
    { id: 2, title: 'High-Severity Alerts', value: '...' },
    { id: 3, title: 'Models Active', value: '...' },
    { id: 4, title: 'System Uptime (h)', value: '...' },
  ]);

  const [error, setError] = useState(null);

  // -------------------- FETCH KPI SUMMARY --------------------
  useEffect(() => {
    const fetchSummaryStats = async () => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/stats/summary`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const formattedKpiData = [
          {
            id: 1,
            title: 'Total Events Analyzed',
            value: data.total_packets_analyzed?.toLocaleString() ?? 'N/A'
          },
          {
            id: 2,
            title: 'High-Severity Alerts',
            value: data.attacks_detected?.toLocaleString() ?? 'N/A',
            status: 'danger'
          },
          {
            id: 3,
            title: 'Models Active',
            value: '3'
          },
          {
            id: 4,
            title: 'System Uptime (h)',
            value: data.system_uptime_hours ?? 'N/A',
            status: 'success'
          },
        ];

        setKpiData(formattedKpiData);

      } catch (err) {
        console.error("Failed to fetch summary stats:", err);
        setError(err.message);

        setKpiData(prev =>
          prev.map(kpi => ({ ...kpi, value: 'Error' }))
        );
      }
    };

    fetchSummaryStats();
  }, []);

  // -------------------- UI --------------------
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>High-level overview of network security events and metrics.</p>
      </header>

      {error && (
        <p className="error-message">Could not load KPI data: {error}</p>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        {kpiData.map(kpi => (
          <div key={kpi.id} className="stat-card">
            <h3 className="stat-card-title">{kpi.title}</h3>
            <p className={`stat-card-value ${kpi.status || ''}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Dashboard */}
      <div className="main-grid two-columns">

        <div className="card">
          <TrafficStats />
        </div>

        <div className="card">
          <AlertsPanel />
        </div>

      </div>
    </div>
  );
}
