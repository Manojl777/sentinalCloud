import React, { useState, useRef } from "react";
import PropTypes from 'prop-types';
import "./Radar.css";

// --------------------------------------------------
// 🔥 PRODUCTION API BASE (Cloud Run / Vercel)
// --------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + "/api";

/*
  --------------------------------------------------
  🔧 LOCAL DEVELOPMENT (Uncomment for running locally)
  --------------------------------------------------
  const API_BASE_URL = "http://localhost:8000/api";
*/

// --- Constants ---
const RADAR_DIAMETER = 300;
const BLIP_TTL = 5000;
const SIMULATION_INTERVAL_MS = 3000;

// --------------------------------------------------
// WIP Modal Component (unchanged)
// --------------------------------------------------
const WipModal = ({ show, onClose }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Feature Under Development</h2>
        <p>The Realtime Attack Simulation (Dynamic) feature is currently being built.</p>
        <button onClick={onClose} className="modal-close-button">Close</button>
      </div>
    </div>
  );
};

// --------------------------------------------------
// MAIN Radar Component
// --------------------------------------------------
const Radar = ({ onAttackDetected, onSimulationStart, onSimulationStop }) => {
  const [blips, setBlips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showWipModal, setShowWipModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [consecutiveNormals, setConsecutiveNormals] = useState(0);

  const simulationTimeoutRef = useRef(null);

  // Mode state + ref (for instant updates)
  const simulationModeRef = useRef('static');
  const [simulationMode, setSimulationMode] = useState('static');

  // --------------------------------------------------
  // 🔥 MAIN Simulation Cycle (unchanged)
  // --------------------------------------------------
  const runSimulationCycle = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    let eventData = null;

    try {
      let simResponse;

      // --- Choose STATIC vs DYNAMIC (ref fixes timing) ---
      if (simulationModeRef.current === "dynamic") {
        console.log("[Dynamic Mode] Requesting synthetic event...");

        simResponse = await fetch(`${API_BASE_URL}/simulation/dynamic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
      } else {
        // STATIC MODE
        let desired_type = null;
        if (consecutiveNormals >= 2) desired_type = "attack";

        const payload = desired_type ? { desired_type } : {};

        simResponse = await fetch(`${API_BASE_URL}/simulation/static`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!simResponse.ok) {
        let detail = simResponse.statusText;
        try {
          const body = await simResponse.json();
          detail = body.detail || detail;
        } catch (_) {}
        throw new Error(`Simulation Error: ${detail}`);
      }

      const simResult = await simResponse.json();

      const sampledData = simResult.data;
      const sourceFile = simResult.source;
      const modelKey = simResult.model_key;
      const trueLabel = simResult.label;

      if (!sampledData || !modelKey) {
        throw new Error("Invalid simulation data from backend.");
      }

      // -------------- SECOND CALL: /detect ----------------
      const detectResponse = await fetch(`${API_BASE_URL}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: sampledData, model_key: modelKey })
      });

      if (!detectResponse.ok) {
        let detail = detectResponse.statusText;
        try {
          const body = await detectResponse.json();
          detail = body.detail || detail;
        } catch (_) {}
        throw new Error(`Detection Error: ${detail}`);
      }

      const detectionResult = await detectResponse.json();

      const predictedType = detectionResult.prediction?.toLowerCase() || "unknown";
      const displayLabel = predictedType === "attack" ? "Attack" : "Normal";

      // FIX: dynamic mode uses its own mapping
      let specificLabel;
      if (simulationModeRef.current === "static") {
        specificLabel = trueLabel || displayLabel;
      } else {
        specificLabel = detectionResult.specific_label;
        if (!specificLabel || ["Unknown", "Attack", "Normal"].includes(specificLabel)) {
          specificLabel = displayLabel;
        }
      }

      // Final event object
      eventData = {
        event_id: detectionResult.event_id,
        id: detectionResult.event_id,
        label: displayLabel,
        specific_label: specificLabel,
        time: new Date().toLocaleTimeString(),
        type: predictedType,
        confidence: ((detectionResult.confidence ?? 0) * 100).toFixed(1),
        features: sampledData,
        sourceFile: sourceFile || "N/A",
        shap_explanation: detectionResult.shap_explanation
      };

      // -------------- Radar Blip Visual ----------------
      const isAttack = predictedType === "attack";
      const newBlip = {
        id: eventData.id,
        x: Math.random() * (RADAR_DIAMETER - 40) - (RADAR_DIAMETER / 2 - 20),
        y: Math.random() * (RADAR_DIAMETER - 40) - (RADAR_DIAMETER / 2 - 20),
        color: isAttack ? "var(--error-color)" : "var(--success-color)",
        label: eventData.specific_label
      };

      setBlips(prev => [...prev, newBlip].slice(-20));
      setTimeout(() => {
        setBlips(prev => prev.filter(b => b.id !== newBlip.id));
      }, BLIP_TTL);

      if (onAttackDetected) onAttackDetected(eventData);

    } catch (err) {
      console.error("Simulation Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      if (eventData?.type === "normal") {
        setConsecutiveNormals(p => p + 1);
      } else {
        setConsecutiveNormals(0);
      }
    }
  };

  // --------------------------------------------------
  // Stop Simulation (unchanged)
  // --------------------------------------------------
  const handleStopSimulation = () => {
    console.log("--- STOP Simulation ---");
    setIsSimulating(false);
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    if (onSimulationStop) onSimulationStop();
    setConsecutiveNormals(0);
  };

  // --------------------------------------------------
  // Continuous Loop
  // --------------------------------------------------
  const simulationLoop = async () => {
    await runSimulationCycle();
    if (simulationTimeoutRef.current) {
      simulationTimeoutRef.current = setTimeout(simulationLoop, SIMULATION_INTERVAL_MS);
    }
  };

  // --------------------------------------------------
  // Start Simulation (unchanged)
  // --------------------------------------------------
  const handleSimulateClick = async (mode) => {
    if (isSimulating) return;

    simulationModeRef.current = mode;
    setSimulationMode(mode);

    setIsSimulating(true);
    setError(null);
    setConsecutiveNormals(0);
    if (onSimulationStart) onSimulationStart();

    simulationTimeoutRef.current = true;
    simulationLoop();
  };

  // --------------------------------------------------
  // UI Rendering
  // --------------------------------------------------
  return (
    <div className="radar-container">
      {error && <div className="radar-error">Error: {error}</div>}

      <div className="radar-circle">
        <div className="radar-grid">
          <div className="circle-grid circle1"></div>
          <div className="circle-grid circle2"></div>
          <div className="circle-grid circle3"></div>
          <div className="circle-grid circle4"></div>
          <div className="radar-cross-lines"></div>
        </div>

        <div className="radar-sweep"></div>

        {blips.map(blip => (
          <div
            key={blip.id}
            className="radar-blip"
            style={{
              left: `${blip.x + RADAR_DIAMETER / 2}px`,
              top: `${blip.y + RADAR_DIAMETER / 2}px`,
              backgroundColor: blip.color
            }}
            title={`${blip.label} (${blip.id})`}
          />
        ))}
      </div>

      <div className="radar-controls">
        <button onClick={() => handleSimulateClick("static")} disabled={isSimulating}>
          {isSimulating && simulationMode === "static" ? "Simulating..." : "Simulate Static"}
        </button>

        {isSimulating && (
          <button className="button-stop" onClick={handleStopSimulation}>
            Stop Simulation
          </button>
        )}

        <button onClick={() => handleSimulateClick("dynamic")} disabled={isSimulating}>
          {isSimulating && simulationMode === "dynamic" ? "Simulating..." : "Simulate Dynamic"}
        </button>
      </div>

      <WipModal show={showWipModal} onClose={() => setShowWipModal(false)} />
    </div>
  );
};

Radar.propTypes = {
  onAttackDetected: PropTypes.func.isRequired,
  onSimulationStart: PropTypes.func,
  onSimulationStop: PropTypes.func
};

Radar.defaultProps = {
  onSimulationStart: () => {},
  onSimulationStop: () => {}
};

export default Radar;
