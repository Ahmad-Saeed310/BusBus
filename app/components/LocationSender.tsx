"use client";

import { useEffect, useRef, useState } from "react";

const LOCATION_KEY = "electro-location";
type SharedLocation = { latitude: number; longitude: number; accuracy: number; updatedAt: number };

export default function LocationSender() {
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [status, setStatus] = useState("Ready to share");
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const watcher = useRef<number | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channel.current = new BroadcastChannel("electro-location");
    const saved = window.localStorage.getItem(LOCATION_KEY);
    if (saved) { try { setLocation(JSON.parse(saved)); } catch {} }
    return () => {
      if (watcher.current !== null) navigator.geolocation.clearWatch(watcher.current);
      channel.current?.close();
    };
  }, []);

  const saveLocation = (position: GeolocationPosition) => {
    const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, updatedAt: Date.now() };
    window.localStorage.setItem(LOCATION_KEY, JSON.stringify(next));
    channel.current?.postMessage(next);
    setLocation(next);
    setStatus("Location is live");
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
      (position) => { saveLocation(position); setIsSharing(true); },
      (error) => { setIsSharing(false); setStatus(error.code === 1 ? "Location permission was denied" : "Could not determine your location"); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  };

  const shareUrl = location ? `${window.location.origin}/view?lat=${location.latitude}&lng=${location.longitude}` : "";
  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="location-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Electro home"><span className="brand-mark">E</span><span>Electro</span></a>
        <a className="text-link" href="/view">Open viewer <span>↗</span></a>
      </header>

      <section className="sender-layout">
        <div className="sender-copy">
          <p className="eyebrow">LIVE LOCATION</p>
          <h1>Share where you are.</h1>
          <p className="intro">Allow location access, then send a private link so someone can see your position on a map.</p>

          <div className="status-card">
            <span className={`status-dot ${isSharing ? "active" : ""}`} />
            <div><strong>{status}</strong>{location && <small>Accuracy within {Math.round(location.accuracy)} meters</small>}</div>
          </div>

          <button className="primary-button" onClick={toggleSharing}><span className="button-icon">◎</span>{isSharing ? "Stop sharing" : location ? "Update location" : "Share my location"}</button>

          {location && (
            <div className="share-panel">
              <div className="coordinates"><span>Latitude</span><strong>{location.latitude.toFixed(6)}</strong></div>
              <div className="coordinates"><span>Longitude</span><strong>{location.longitude.toFixed(6)}</strong></div>
              <button className="copy-button" onClick={copyLink}>{copied ? "Copied!" : "Copy view link"}</button>
            </div>
          )}
        </div>

        <div className="sender-visual" aria-label="Location illustration">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="phone-card"><div className="phone-notch" /><div className="mini-map">
            <div className="road road-one" /><div className="road road-two" /><div className="road road-three" /><div className="location-pulse"><span /></div>
          </div><div className="phone-info"><span>You are here</span><strong>{location ? "Location found" : "Waiting for access"}</strong></div></div>
        </div>
      </section>
    </main>
  );
}
