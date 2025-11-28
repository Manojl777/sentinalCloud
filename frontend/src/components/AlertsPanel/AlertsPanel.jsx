// src/components/AlertsPanel/AlertsPanel.jsx (Final Production Version)
import React from 'react';
import './AlertsPanel.css';

// --------------------------------------------------
// NOTE: AlertsPanel does NOT fetch from backend.
// It receives alerts from Dashboard/Radar via props.
// API URL is not required here.
// --------------------------------------------------

// Helper: Determine severity from confidence %
const getSeverityFromConfidence = (confidenceStr) => {
  const confidence = parseFloat(confidenceStr);
  if (confidence >= 90) return { label: 'High', className: 'severity-high' };
  if (confidence >= 70) return { label: 'Medium', className: 'severity-medium' };
  return { label: 'Low', className: 'severity-low' };
};

const AlertsPanel = ({ alerts = [] }) => {
  return (
    <div className="alerts-panel-container card">
      <h2 className="card-title">Recent Alerts</h2>

      <ul className="activity-list">
        {alerts && alerts.length > 0 ? (
          alerts.map(alert => {
            const severity = getSeverityFromConfidence(alert.confidence);

            return (
              <li key={alert.event_id} className="activity-list-item">
                <div className="activity-item-main">
                  {/* Display attack name like "DDoS", "Port Scan", etc. */}
                  <span className="activity-item-title">{alert.specific_label}</span>

                  <span className="activity-item-time">
                    {alert.time}
                    <span className="activity-item-confidence">
                      {alert.confidence}%
                    </span>
                  </span>
                </div>

                {/* Severity badge */}
                <span className={`severity-badge ${severity.className}`}>
                  {severity.label}
                </span>
              </li>
            );
          })
        ) : (
          <p className="no-alerts">No recent alerts.</p>
        )}
      </ul>
    </div>
  );
};

export default AlertsPanel;
