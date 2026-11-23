"use client";

import { useEffect, useState } from "react";

type SharedLocation = { latitude: number; longitude: number; accuracy: number; updatedAt: number };

export default function LocationViewer() {
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [source, setSource] = useState("Waiting for a location link");

  useEffect(() => {
    const readLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const lat = params.get("lat");
      const lng = params.get("lng");
      if (lat && lng) {
        const next = { latitude: Number(lat), longitude: Number(lng), accuracy: 0, updatedAt: Date.now() };
        setLocation(next);
        setSource("Shared location");
        return;
      }
      const saved = window.localStorage.getItem("electro-location");
      if (saved) {
        try { setLocation(JSON.parse(saved)); setSource("Latest location on this device"); } catch {}
      }
    };

    readLocation();
    const channel = new BroadcastChannel("electro-location");
    channel.addEventListener("message", (event) => { setLocation(event.data); setSource("Live location"); });
    return () => channel.close();
  }, []);

  const mapUrl = location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.025}%2C${location.latitude - 0.018}%2C${location.longitude + 0.025}%2C${location.latitude + 0.018}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`
    : "";

  return (
    <main className="location-shell viewer-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Electro home"><span className="brand-mark">E</span><span>Electro</span></a>
        <a className="text-link" href="/send">Share my location <span>↗</span></a>
      </header>

      <section className="viewer-layout">
        <div className="viewer-card">
          <p className="eyebrow">LOCATION VIEWER</p>
          <h1>Someone shared their location.</h1>
          <div className={`viewer-status ${location ? "found" : ""}`}><span />{source}</div>

          {location ? (
            <>
              <div className="location-details">
                <div><span>Latitude</span><strong>{location.latitude.toFixed(6)}</strong></div>
                <div><span>Longitude</span><strong>{location.longitude.toFixed(6)}</strong></div>
              </div>
              <a className="directions-button" href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">Open in Google Maps <span>↗</span></a>
            </>
          ) : (
            <div className="empty-state"><div className="empty-pin">•</div><strong>No location yet</strong><p>Ask the sender to copy and open their view link.</p></div>
          )}
        </div>

        <div className="map-card">
          {location ? (
            <iframe title="Shared location map" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="map-placeholder"><div className="placeholder-grid" /><div className="placeholder-pin">●</div><p>Map will appear here</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
