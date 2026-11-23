"use client";

import { useEffect, useRef, useState } from "react";
import { VEHICLES } from "../lib/vehicles";

type SharedLocation = { latitude: number; longitude: number; accuracy: number; speed: number; updatedAt: number };

export default function LocationSender() {
  const [selectedVehicle, setSelectedVehicle] = useState("Vehicle 1");
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [status, setStatus] = useState("Choose a vehicle and start sharing");
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const watcher = useRef<number | null>(null);
  const selectedRef = useRef(selectedVehicle);
  const previousPosition = useRef<{ latitude: number; longitude: number; updatedAt: number } | null>(null);

  useEffect(() => { selectedRef.current = selectedVehicle; }, [selectedVehicle]);
  useEffect(() => () => {
    if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
  }, []);

  const saveLocation = async (position: GeolocationPosition) => {
    const now = Date.now();
    let speedKmh = position.coords.speed != null && position.coords.speed >= 0
      ? position.coords.speed * 3.6
      : 0;

    if (speedKmh === 0 && previousPosition.current) {
      const previous = previousPosition.current;
      const elapsedHours = (now - previous.updatedAt) / 3600000;
      const toRadians = (value: number) => value * Math.PI / 180;
      const lat1 = toRadians(previous.latitude);
      const lat2 = toRadians(position.coords.latitude);
      const deltaLat = toRadians(position.coords.latitude - previous.latitude);
      const deltaLng = toRadians(position.coords.longitude - previous.longitude);
      const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
      const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (elapsedHours > 0) speedKmh = distanceKm / elapsedHours;
    }

    previousPosition.current = { latitude: position.coords.latitude, longitude: position.coords.longitude, updatedAt: now };
    const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, speed: speedKmh, updatedAt: now };
    setLocation(next);
    setStatus(`${selectedRef.current} location is live`);

    await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle: selectedRef.current, ...next }),
    }).catch(() => setStatus("Could not send location to the server"));
  };

  const toggleSharing = () => {
    if (isSharing) {
      if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
      watcher.current = null;
      setIsSharing(false);
      setStatus("Sharing paused");
      return;
    }
    if (!navigator.geolocation) { setStatus("Geolocation is not supported by this browser"); return; }

    setStatus("Finding your location…");
    watcher.current = navigator.geolocation.watchPosition(
      (position) => { void saveLocation(position); setIsSharing(true); },
      (error) => { setIsSharing(false); setStatus(error.code === 1 ? "Location permission was denied" : "Could not determine your location"); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  };

  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/view?vehicle=${encodeURIComponent(selectedVehicle)}`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="location-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Electro home"><span className="brand-mark">E</span><span>Electro</span></a>
        <a className="text-link" href="/view">Open fleet viewer <span>↗</span></a>
      </header>

      <section className="sender-layout">
        <div className="sender-copy">
          <p className="eyebrow">15-VEHICLE FLEET</p>
          <h1>Share a vehicle location.</h1>
          <p className="intro">Select the vehicle you are using, allow location access, and keep its position visible to fleet viewers.</p>

          <label className="vehicle-select">
            <span>Vehicle</span>
            <select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)} disabled={isSharing}>
              {VEHICLES.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
            </select>
          </label>

          <div className="status-card">
            <span className={`status-dot ${isSharing ? "active" : ""}`} />
            <div><strong>{status}</strong>{location && <small>Accuracy within {Math.round(location.accuracy)} meters</small>}</div>
          </div>

          <button className="primary-button" onClick={toggleSharing}><span className="button-icon">◎</span>{isSharing ? "Stop sharing" : location ? "Update location" : `Share ${selectedVehicle}`}</button>

          {location && (
            <div className="share-panel">
              <div className="coordinates"><span>Latitude</span><strong>{location.latitude.toFixed(6)}</strong></div>
              <div className="coordinates"><span>Longitude</span><strong>{location.longitude.toFixed(6)}</strong></div>
              <button className="copy-button" onClick={copyLink}>{copied ? "Copied!" : "Copy view link"}</button>
            </div>
          )}
        </div>

        <div className="sender-visual" aria-label="Vehicle location illustration">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="phone-card"><div className="phone-notch" /><div className="mini-map">
            <div className="road road-one" /><div className="road road-two" /><div className="road road-three" /><div className="location-pulse"><span /></div>
          </div><div className="phone-info"><span>{selectedVehicle}</span><strong>{location ? "Location found" : "Waiting for access"}</strong></div></div>
        </div>
      </section>
    </main>
  );
}
