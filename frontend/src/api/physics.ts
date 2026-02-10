import { API_BASE } from "../config";

export interface Advection1DResponse {
  x: number[];
  c: number;
  dt: number;
  dx: number;
  num_steps: number;
  series: Array<{ step: number; u: number[] }>;
}

export async function fetchAdvection1D(
  params?: { nx?: number; c?: number; num_steps?: number; output_interval?: number }
): Promise<Advection1DResponse> {
  const sp = new URLSearchParams();
  if (params?.nx != null) sp.set("nx", String(params.nx));
  if (params?.c != null) sp.set("c", String(params.c));
  if (params?.num_steps != null) sp.set("num_steps", String(params.num_steps));
  if (params?.output_interval != null) sp.set("output_interval", String(params.output_interval));
  const q = sp.toString();
  const r = await fetch(`${API_BASE}/physics/advection-1d${q ? `?${q}` : ""}`);
  if (!r.ok) throw new Error("Failed to fetch 1D advection");
  return r.json();
}

export interface Advection2DResponse {
  nx: number;
  ny: number;
  cx: number;
  cy: number;
  diffusion: number;
  num_steps: number;
  series: Array<{ step: number; u: number[] }>;
}

export async function fetchAdvection2D(
  params?: { nx?: number; ny?: number; cx?: number; cy?: number; diffusion?: number; num_steps?: number; output_interval?: number }
): Promise<Advection2DResponse> {
  const sp = new URLSearchParams();
  if (params?.nx != null) sp.set("nx", String(params.nx));
  if (params?.ny != null) sp.set("ny", String(params.ny));
  if (params?.cx != null) sp.set("cx", String(params.cx));
  if (params?.cy != null) sp.set("cy", String(params.cy));
  if (params?.diffusion != null) sp.set("diffusion", String(params.diffusion));
  if (params?.num_steps != null) sp.set("num_steps", String(params.num_steps));
  if (params?.output_interval != null) sp.set("output_interval", String(params.output_interval));
  const q = sp.toString();
  const r = await fetch(`${API_BASE}/physics/advection-2d${q ? `?${q}` : ""}`);
  if (!r.ok) throw new Error("Failed to fetch 2D advection-diffusion");
  return r.json();
}

export interface SoundingResponse {
  source: string;
  cape_j_kg: number;
  cin_j_kg: number;
  profile: Array<{ p_hpa: number; T_C: number; Td_C: number }>;
  station_id?: number;
  station_lat?: number;
  station_lon?: number;
  from_time?: string;
}

export type SoundingSource = "wyoming" | "rap" | "hrrr";

export async function fetchSounding(
  lat?: number | null,
  lon?: number | null,
  options?: { source?: SoundingSource }
): Promise<SoundingResponse> {
  const sp = new URLSearchParams();
  if (lat != null) sp.set("lat", String(lat));
  if (lon != null) sp.set("lon", String(lon));
  if (options?.source) sp.set("source", options.source);
  const q = sp.toString();
  const r = await fetch(`${API_BASE}/physics/sounding${q ? `?${q}` : ""}`);
  if (!r.ok) throw new Error("Failed to fetch sounding");
  return r.json();
}
