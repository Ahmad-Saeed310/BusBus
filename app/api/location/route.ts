import { NextResponse } from "next/server";
import { VEHICLES } from "../../lib/vehicles";

const locations = new Map<string, {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  updatedAt: number;
}>();

export async function GET() {
  return NextResponse.json({ locations: Object.fromEntries(locations) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const vehicle = typeof body.vehicle === "string" ? body.vehicle : "";
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy);
  const speed = Number(body.speed);

  if (!VEHICLES.includes(vehicle) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Invalid vehicle or location" }, { status: 400 });
  }

  const location = { latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : 0, speed: Number.isFinite(speed) && speed >= 0 ? speed : 0, updatedAt: Date.now() };
  locations.set(vehicle, location);
  return NextResponse.json({ vehicle, location });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const vehicle = typeof body.vehicle === "string" ? body.vehicle : "";

  if (!VEHICLES.includes(vehicle)) {
    return NextResponse.json({ error: "Invalid vehicle" }, { status: 400 });
  }

  locations.delete(vehicle);
  return NextResponse.json({ vehicle, ended: true });
}
