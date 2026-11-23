"use client";

import { useEffect, useState } from "react";
import { VEHICLES } from "../lib/vehicles";

type SharedLocation = { latitude: number; longitude: number; accuracy: number; updatedAt: number };
type LocationMap = Record<string, SharedLocation>;

export default function LocationViewer() {
  const [locations, setLocations] = useState<LocationMap>({});
  const [selectedVehicle, setSelectedVehicle] = useState("Vehicle 1");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("vehicle");
    if (requested && VEHICLES.includes(requested)) setSelectedVehicle(requested);

    const refresh = async () => {
      try {
        const response = await fetch("/api/location", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations ?? {});
        }
      } catch {}
    };

    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const location = locations[selectedVehicle] ?? null;
  const mapUrl = location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.025}%2C${location.latitude - 0.018}%2C${location.longitude + 0.025}%2C${location.latitude + 0.018}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`
    : "";

  return (
    <main className="location-shell viewer-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Electro home"><span className="brand-mark">E</span><span>Electro</span></a>
        <a className="text-link" href="/send">Share a vehicle <span>↗</span></a>
      </header>

      <section className="viewer-layout">
        <div className="viewer-card">
          <p className="eyebrow">FLEET LOCATION VIEWER</p>
          <h1>Find every vehicle.</h1>

          <label className="vehicle-select viewer-select">
            <span>Select vehicle</span>
            <select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)}>
              {VEHICLES.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
            </select>
          </label>

          <div className={`viewer-status ${location ? "found" : ""}`}><span />{location ? `${selectedVehicle} location live` : `Waiting for ${selectedVehicle}`}</div>

          {location ? (
            <>
              <div className="location-details">
                <div><span>Latitude</span><strong>{location.latitude.toFixed(6)}</strong></div>
                <div><span>Longitude</span><strong>{location.longitude.toFixed(6)}</strong></div>
              </div>
              <a className="directions-button" href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">Open in Google Maps <span>↗</span></a>
            </>
          ) : (
            <div className="empty-state"><div className="empty-pin">•</div><strong>No location yet</strong><p>Ask this vehicle to start sharing its location.</p></div>
          )}
        </div>

        <div className="map-card">
          {location ? (
            <iframe title={`Live map for ${selectedVehicle}`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="map-placeholder"><div className="placeholder-grid" /><div className="placeholder-pin">●</div><p>Map will appear here</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
