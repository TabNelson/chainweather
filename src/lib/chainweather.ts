import type { Address } from "viem";

export const chainWeatherAddress =
  "0x43cf7e971879be966853ef6b811ab35Ccd99dbEf" as Address;

export const chainWeatherAbi = [
  {
    type: "function",
    name: "setWeather",
    stateMutability: "nonpayable",
    inputs: [
      { name: "state", type: "string" },
      { name: "mood", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pingWeather",
    stateMutability: "nonpayable",
    inputs: [
      { name: "state", type: "string" },
      { name: "mood", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resetWeather",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "currentWeather",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "state", type: "string" },
      { name: "mood", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "version", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "historyCount",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "WeatherUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "state", type: "string", indexed: false },
      { name: "mood", type: "string", indexed: false },
      { name: "version", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WeatherReset",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "WeatherPing",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "state", type: "string", indexed: false },
      { name: "mood", type: "string", indexed: false },
    ],
  },
] as const;

export const weatherStates = [
  { state: "Sunny", emoji: "☀️", gradient: "from-amber-200 via-sky-200 to-white" },
  { state: "Rainy", emoji: "🌧", gradient: "from-sky-300 via-blue-300 to-slate-100" },
  { state: "Storm", emoji: "⛈", gradient: "from-zinc-900 via-violet-900 to-slate-700" },
  { state: "Calm", emoji: "🌙", gradient: "from-indigo-950 via-blue-900 to-slate-800" },
  { state: "Chaos", emoji: "🌪", gradient: "from-fuchsia-500 via-cyan-500 to-lime-300" },
  { state: "Hopeful", emoji: "🌈", gradient: "from-rose-200 via-emerald-200 to-sky-200" },
] as const;

export type WeatherState = (typeof weatherStates)[number]["state"];

export function getWeatherVisual(state?: string) {
  return weatherStates.find((item) => item.state === state) ?? weatherStates[0];
}

export function shortenAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

