// src/components/TrafficStats/TrafficStats.jsx (Refined - Fetches Own Data)
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './TrafficStats.css';

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

const TrafficStats = () => {
  const chartRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let chartInstance = null;

    const fetchTrafficData = async () => {
      if (!isMounted || !canvasRef.current) return;
      setIsLoading(true);
      setError(null);

      try {
        /*
        const response = await fetch("http://localhost:8000/api/stats/traffic-over-time");
        */
        const response = await fetch(`${API_BASE_URL}/stats/traffic-over-time`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted || !canvasRef.current) return;

        // Destroy previous chart before making a new one
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }

        const ctx = canvasRef.current.getContext('2d');

        // Theme colors via CSS variables
        const textColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue('--text-secondary')
            .trim() || '#a0a6b1';

        const gridColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue('--border-color')
            .trim() || '#2a2e36';

        // Create the chart
        chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels || [],
            datasets: [
              {
                label: 'Benign Traffic',
                data:
                  data.datasets?.find(d => d.label === 'Benign Traffic')
                    ?.data || [],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.3
              },
              {
                label: 'Malicious Traffic',
                data:
                  data.datasets?.find(d => d.label === 'Malicious Traffic')
                    ?.data || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: textColor },
                grid: { color: gridColor }
              },
              x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
              }
            },
            plugins: {
              legend: {
                position: 'top',
                labels: { color: textColor }
              }
            }
          }
        });

        chartRef.current = chartInstance;
      } catch (err) {
        console.error("Failed to fetch traffic stats:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTrafficData();

    return () => {
      isMounted = false;
      const instanceToDestroy = chartRef.current || chartInstance;
      if (instanceToDestroy) {
        instanceToDestroy.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div className="traffic-stats-container card">
      <h2 className="card-title">Traffic Over Time</h2>
      <div className="chart-wrapper">
        {isLoading && <p>Loading chart...</p>}
        {error && <p className="error-message">Error: {error}</p>}
        {!isLoading && !error && <canvas ref={canvasRef}></canvas>}
      </div>
    </div>
  );
};

TrafficStats.propTypes = {};

export default TrafficStats;
