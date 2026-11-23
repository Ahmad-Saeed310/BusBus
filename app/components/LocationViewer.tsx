"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { VEHICLES } from "../lib/vehicles";

type SharedLocation = { latitude: number; longitude: number; accuracy: number; updatedAt: number };
type LocationMap = Record<string, SharedLocation>;

export default function LocationViewer() {
  const [locations, setLocations] = useState<LocationMap>({});
  const [selectedVehicle, setSelectedVehicle] = useState("Vehicle 1");
  const [locked, setLocked] = useState(true);
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !mapElement.current || map.current) return;
      map.current = leaflet.map(mapElement.current);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map.current);
      map.current.setView([20, 0], 2);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  const location = locations[selectedVehicle] ?? null;

  useEffect(() => {
    if (!location || !map.current) return;
    void import("leaflet").then((leaflet) => {
      if (!map.current) return;
      const position: [number, number] = [location.latitude, location.longitude];
      const vehicleNumber = selectedVehicle.replace("Vehicle ", "");
      const icon = leaflet.divIcon({
        className: "vehicle-marker",
        html: `<div class="bus-marker" aria-label="${selectedVehicle}"><svg viewBox="0 0 48 48" role="img"><rect x="8" y="5" width="32" height="36" rx="9" fill="#102d27"/><rect x="12" y="10" width="24" height="13" rx="3" fill="#dfe8df"/><rect x="12" y="26" width="24" height="7" rx="2" fill="#dbe96a"/><circle cx="15" cy="43" r="4" fill="#102d27"/><circle cx="33" cy="43" r="4" fill="#102d27"/></svg><strong>${vehicleNumber}</strong></div>`,
        iconSize: [58, 58],
        iconAnchor: [29, 48],
      });

      if (marker.current) {
        marker.current.setLatLng(position);
        marker.current.setIcon(icon);
      } else {
        marker.current = leaflet.marker(position, { icon, title: selectedVehicle }).addTo(map.current);
      }
      if (locked) {
        const zoom = Math.max(map.current.getZoom(), 13);
        map.current.setView(position, zoom, { animate: true });
      }
    });
  }, [location, locked, selectedVehicle]);

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
            <select value={selectedVehicle} onChange={(event) => { setSelectedVehicle(event.target.value); setLocked(true); }}>
              {VEHICLES.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
            </select>
          </label>

          {location && (
            <button className={`lock-button ${locked ? "locked" : ""}`} onClick={() => setLocked((value) => !value)}>
              <span>{locked ? "●" : "○"}</span>{locked ? `Locked to ${selectedVehicle}` : `Lock on ${selectedVehicle}`}
            </button>
          )}

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
          <div ref={mapElement} className="leaflet-map" />
        </div>
      </section>
    </main>
  );
}
