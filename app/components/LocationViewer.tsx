"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { VEHICLES } from "../lib/vehicles";

type SharedLocation = { latitude: number; longitude: number; accuracy: number; speed: number; updatedAt: number };
type LocationMap = Record<string, SharedLocation>;
type ViewerLocation = { latitude: number; longitude: number; accuracy: number };

const distanceKm = (from: ViewerLocation, to: SharedLocation) => {
  const radians = (value: number) => value * Math.PI / 180;
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const deltaLat = radians(to.latitude - from.latitude);
  const deltaLng = radians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatEta = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes < 0) return "Calculating…";
  if (minutes < 1) return "Less than 1 min";
  if (minutes < 60) return `About ${Math.ceil(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.ceil(minutes % 60);
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

export default function LocationViewer() {
  const [locations, setLocations] = useState<LocationMap>({});
  const [selectedVehicle, setSelectedVehicle] = useState("abcd to dcb 1");
  const [locked, setLocked] = useState(true);
  const [viewerLocation, setViewerLocation] = useState<ViewerLocation | null>(null);
  const [viewerStatus, setViewerStatus] = useState("Finding your position…");
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const vehicleMarkers = useRef<Map<string, Marker>>(new Map());
  const viewerMarker = useRef<Marker | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("vehicle");
    if (requested && VEHICLES.includes(requested)) setSelectedVehicle(requested);

    let savedFleet: LocationMap = {};
    try {
      savedFleet = JSON.parse(window.localStorage.getItem("busbus-live-fleet") ?? "{}");
      setLocations(savedFleet);
    } catch {}

    const refresh = async () => {
      try {
        const response = await fetch("/api/location", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setLocations((current) => ({ ...savedFleet, ...current, ...(data.locations ?? {}) }));
        }
      } catch {}
    };

    const liveChannel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("busbus-live-fleet")
      : null;
    liveChannel?.addEventListener("message", (event) => {
      const update = event.data as { vehicle?: string; location?: SharedLocation };
      if (!update?.vehicle || !update.location) return;
      setLocations((current) => ({
        ...current,
        [update.vehicle as string]: update.location as SharedLocation,
      }));
    });

    void refresh();
    const timer = window.setInterval(refresh, 2000);
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshOnVisible);

    let viewerWatch: number | null = null;
    if (navigator.geolocation) {
      viewerWatch = navigator.geolocation.watchPosition(
        (position) => {
          setViewerLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
          setViewerStatus("Your position is active");
        },
        (error) => setViewerStatus(error.code === 1 ? "Enable location to estimate arrival" : "Could not find your position"),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    } else {
      setViewerStatus("Geolocation is not supported");
    }

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      liveChannel?.close();
      if (viewerWatch !== null) navigator.geolocation.clearWatch(viewerWatch);
    };
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
      vehicleMarkers.current.clear();
    };
  }, []);

  const location = locations[selectedVehicle] ?? null;
  const remainingKm = location && viewerLocation ? distanceKm(viewerLocation, location) : null;
  const travelSpeed = location && location.speed >= 2 ? location.speed : 30;
  const etaMinutes = remainingKm !== null ? remainingKm / travelSpeed * 60 : null;
  const availableVehicles = VEHICLES.filter((vehicle) => locations[vehicle]);
  const nearestBus = viewerLocation
    ? availableVehicles
        .map((vehicle) => ({ vehicle, distance: distanceKm(viewerLocation, locations[vehicle]) }))
        .sort((a, b) => a.distance - b.distance)[0] ?? null
    : null;

  useEffect(() => {
    if (!viewerLocation || !map.current) return;
    void import("leaflet").then((leaflet) => {
      if (!map.current) return;
      const position: [number, number] = [viewerLocation.latitude, viewerLocation.longitude];
      if (viewerMarker.current) {
        viewerMarker.current.setLatLng(position);
      } else {
        const icon = leaflet.divIcon({
          className: "viewer-position-marker",
          html: `<div class="viewer-position-pulse"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        viewerMarker.current = leaflet.marker(position, { icon, title: "Your position" }).addTo(map.current);
      }
    });
  }, [viewerLocation]);

  useEffect(() => {
    if (!map.current) return;
    void import("leaflet").then((leaflet) => {
      if (!map.current) return;
      const markerSize = window.innerWidth <= 520 ? 46 : 52;

      for (const [vehicle, marker] of vehicleMarkers.current) {
        if (!locations[vehicle]) {
          marker.remove();
          vehicleMarkers.current.delete(vehicle);
        }
      }

      for (const vehicle of availableVehicles) {
        const vehicleLocation = locations[vehicle];
        if (!vehicleLocation) continue;
        const position: [number, number] = [vehicleLocation.latitude, vehicleLocation.longitude];
        const vehicleNumber = vehicle.match(/\d+$/)?.[0] ?? vehicle;
        const isSelected = vehicle === selectedVehicle;
        const isNearest = nearestBus?.vehicle === vehicle;

        const icon = leaflet.divIcon({
          className: "vehicle-marker",
          html: `<div class="bus-marker ${isSelected ? "selected" : ""} ${isNearest ? "recommended" : ""}" aria-label="${vehicle}${isNearest ? " — nearest" : ""}"><svg viewBox="0 0 48 48" role="img"><rect x="8" y="5" width="32" height="36" rx="9" fill="#102d27"/><rect x="12" y="10" width="24" height="13" rx="3" fill="#dfe8df"/><rect x="12" y="26" width="24" height="7" rx="2" fill="#dbe96a"/><circle cx="15" cy="43" r="4" fill="#102d27"/><circle cx="33" cy="43" r="4" fill="#102d27"/></svg><strong>${vehicleNumber}</strong></div>`,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize],
        });

        const existing = vehicleMarkers.current.get(vehicle);
        if (existing) {
          existing.setLatLng(position);
          existing.setIcon(icon);
        } else {
          const created = leaflet.marker(position, { icon, title: vehicle }).addTo(map.current);
          created.on("click", () => {
            setSelectedVehicle(vehicle);
            setLocked(true);
          });
          vehicleMarkers.current.set(vehicle, created);
        }
      }

      if (locked && location) {
        const zoom = Math.max(map.current.getZoom(), 13);
        map.current.setView([location.latitude, location.longitude], zoom, { animate: true });
      }
    });
  }, [locations, locked, selectedVehicle, nearestBus?.vehicle, location]);

  return (
    <main className="location-shell viewer-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="BusBus! home"><span className="brand-mark">B</span><span>BusBus!</span></a>
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

          {nearestBus && viewerLocation && (
            <button className="nearest-card" onClick={() => { setSelectedVehicle(nearestBus.vehicle); setLocked(true); }}>
              <div className="nearest-badge">NEAREST</div>
              <div>
                <span>Recommended bus</span>
                <strong>{nearestBus.vehicle}</strong>
              </div>
              <small>{nearestBus.distance < 1 ? `${Math.round(nearestBus.distance * 1000)} m away` : `${nearestBus.distance.toFixed(1)} km away`} <b>→</b></small>
            </button>
          )}

          {location && (
            <div className="eta-card">
              <div className="eta-icon">↗</div>
              <div>
                <span>Estimated arrival to you</span>
                <strong>{viewerLocation ? formatEta(etaMinutes ?? 0) : "Share your position"}</strong>
              </div>
              {remainingKm !== null && viewerLocation && (
                <small>{remainingKm < 1 ? `${Math.round(remainingKm * 1000)} m` : `${remainingKm.toFixed(1)} km`} · {Math.round(travelSpeed)} km/h</small>
              )}
            </div>
          )}

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
