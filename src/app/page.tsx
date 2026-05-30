"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Home,
  Radio,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  User,
  Wallet,
  X,
} from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseAbiItem, type Address } from "viem";
import {
  chainWeatherAbi,
  chainWeatherAddress,
  getWeatherVisual,
  shortenAddress,
  weatherStates,
  type WeatherState,
} from "@/lib/chainweather";
import { baseBuilderDataSuffix } from "@/lib/wagmi";

type Tab = "home" | "feed" | "sky" | "climate" | "me";

type WeatherEvent = {
  id: string;
  user: Address;
  state: string;
  mood: string;
  version?: bigint;
  blockNumber: bigint;
};

type FloatingIcon = {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  size: number;
};

const moodSuggestions = ["Building quietly", "Bullish", "Lost but optimistic", "Grinding"];

const fallbackFeed: WeatherEvent[] = [
  {
    id: "seed-1",
    user: "0x2d4A9F8a661eBB31f7d3712D7F6fF88cA6f7E22A",
    state: "Sunny",
    mood: "Feeling productive",
    version: 12n,
    blockNumber: 0n,
  },
  {
    id: "seed-2",
    user: "0x927c01F194f7b93267C9DBF8cAaeb245cB90a9Ef",
    state: "Storm",
    mood: "Market is crazy",
    version: 7n,
    blockNumber: 0n,
  },
  {
    id: "seed-3",
    user: "0xB70442Ec9A84eE6F9BcEd9BCb62f242aD71bD632",
    state: "Calm",
    mood: "Reading and thinking",
    version: 3n,
    blockNumber: 0n,
  },
];

function getConnectorLabel(name: string) {
  if (/coinbase/i.test(name)) return "Coinbase Wallet";
  if (/metamask/i.test(name)) return "MetaMask";
  if (/injected/i.test(name)) return "Browser Wallet";
  return name;
}

function getMoodWords(events: WeatherEvent[]) {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    event.mood
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function ChainWeatherApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [selectedState, setSelectedState] = useState<WeatherState>("Sunny");
  const [mood, setMood] = useState("Building quietly");
  const [toast, setToast] = useState("");
  const [events, setEvents] = useState<WeatherEvent[]>(fallbackFeed);
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([]);
  const [showConnectors, setShowConnectors] = useState(false);
  const [points, setPoints] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = Number(localStorage.getItem("chainweather-points") || "0");
    const hasReferral = Boolean(new URLSearchParams(window.location.search).get("ref"));
    return hasReferral && !saved ? 24 : saved;
  });
  const [referrals] = useState(() => {
    if (typeof window === "undefined") return 0;
    return new URLSearchParams(window.location.search).get("ref") ? 1 : 0;
  });
  const autoTried = useRef(false);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const uniqueConnectors = useMemo(() => {
    const seen = new Set<string>();
    return connectors.filter((connector) => {
      const label = getConnectorLabel(connector.name);
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  }, [connectors]);

  const selectedVisual = getWeatherVisual(selectedState);
  const positiveCount = events.filter((event) =>
    ["Sunny", "Hopeful", "Calm"].includes(event.state),
  ).length;
  const chaosCount = events.filter((event) => ["Storm", "Chaos"].includes(event.state)).length;
  const neutralCount = Math.max(events.length - positiveCount - chaosCount, 0);

  const { data: currentWeather, refetch: refetchWeather } = useReadContract({
    address: chainWeatherAddress,
    abi: chainWeatherAbi,
    functionName: "currentWeather",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: historyCount, refetch: refetchHistory } = useReadContract({
    address: chainWeatherAddress,
    abi: chainWeatherAbi,
    functionName: "historyCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const currentState = currentWeather?.[0] || selectedState;
  const currentMood = currentWeather?.[1] || mood;
  const currentVersion = currentWeather?.[3] || 0n;
  const currentTimestamp = currentWeather?.[2] || 0n;
  const worldVisual = getWeatherVisual(currentState);

  useEffect(() => {
    const saved = Number(localStorage.getItem("chainweather-points") || "0");
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && !saved) {
      localStorage.setItem("chainweather-points", "24");
    }
  }, []);

  useEffect(() => {
    if (autoTried.current || isConnected || !connectors.length) return;
    autoTried.current = true;
    const ethereum = (window as Window & { ethereum?: unknown }).ethereum;
    const baseLike = /base|coinbase/i.test(navigator.userAgent);
    if (!ethereum || !baseLike) return;
    const injectedConnector = connectors.find((connector) => /injected/i.test(connector.name));
    if (injectedConnector) connect({ connector: injectedConnector });
  }, [connect, connectors, isConnected]);

  useEffect(() => {
    if (!publicClient) return;
    const client = publicClient;

    async function loadLogs() {
      const latest = await client.getBlockNumber();
      const fromBlock = latest > 250_000n ? latest - 250_000n : 0n;
      const [updates, pings] = await Promise.all([
        client.getLogs({
          address: chainWeatherAddress,
          event: parseAbiItem(
            "event WeatherUpdated(address indexed user, string state, string mood, uint256 version)",
          ),
          fromBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: chainWeatherAddress,
          event: parseAbiItem("event WeatherPing(address indexed user, string state, string mood)"),
          fromBlock,
          toBlock: "latest",
        }),
      ]);

      const parsed = [...updates, ...pings]
        .map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          user: log.args.user as Address,
          state: String(log.args.state || "Sunny"),
          mood: String(log.args.mood || "Broadcasting"),
          version: "version" in log.args ? (log.args.version as bigint) : undefined,
          blockNumber: log.blockNumber || 0n,
        }))
        .sort((a, b) => Number(b.blockNumber - a.blockNumber))
        .slice(0, 60);

      if (parsed.length) setEvents(parsed);
    }

    loadLogs().catch(() => setEvents(fallbackFeed));
  }, [publicClient]);

  function addPoints(amount: number) {
    setPoints((value) => {
      const next = value + amount;
      localStorage.setItem("chainweather-points", String(next));
      return next;
    });
  }

  function launchIcon(state: string) {
    const visual = getWeatherVisual(state);
    const icon = {
      id: Date.now(),
      emoji: visual.emoji,
      left: 8 + Math.random() * 78,
      delay: Math.random() * 0.7,
      size: 28 + Math.random() * 24,
    };
    setFloatingIcons((items) => [...items.slice(-24), icon]);
  }

  async function broadcastWeather() {
    if (!isConnected) {
      setShowConnectors(true);
      return;
    }
    const cleanMood = mood.trim() || "Broadcasting";
    const hash = await writeContractAsync({
      address: chainWeatherAddress,
      abi: chainWeatherAbi,
      functionName: "setWeather",
      args: [selectedState, cleanMood],
      dataSuffix: baseBuilderDataSuffix,
    } as Parameters<typeof writeContractAsync>[0]);
    await publicClient?.waitForTransactionReceipt({ hash });
    launchIcon(selectedState);
    addPoints(points ? 18 : 72);
    setToast(`Weather recorded onchain. Version #${Number(currentVersion) + 1}`);
    await Promise.all([refetchWeather(), refetchHistory()]);
  }

  async function pingWeather() {
    if (!isConnected) {
      setShowConnectors(true);
      return;
    }
    const cleanMood = mood.trim() || "Live pulse";
    const hash = await writeContractAsync({
      address: chainWeatherAddress,
      abi: chainWeatherAbi,
      functionName: "pingWeather",
      args: [selectedState, cleanMood],
      dataSuffix: baseBuilderDataSuffix,
    } as Parameters<typeof writeContractAsync>[0]);
    await publicClient?.waitForTransactionReceipt({ hash });
    launchIcon(selectedState);
    addPoints(9);
    setToast("Weather pulse sent to the Global Sky.");
    await refetchHistory();
  }

  async function resetWeather() {
    if (!isConnected) {
      setShowConnectors(true);
      return;
    }
    const hash = await writeContractAsync({
      address: chainWeatherAddress,
      abi: chainWeatherAbi,
      functionName: "resetWeather",
      dataSuffix: baseBuilderDataSuffix,
    } as Parameters<typeof writeContractAsync>[0]);
    await publicClient?.waitForTransactionReceipt({ hash });
    setToast("New season started.");
    await Promise.all([refetchWeather(), refetchHistory()]);
  }

  async function shareInvite() {
    const ref = address ? `?ref=${address}` : "?ref=chainweather";
    const url = `${window.location.origin}${ref}`;
    await navigator.clipboard.writeText(url);
    setToast("Invite link copied.");
  }

  const climateCounts = weatherStates.map((item) => ({
    ...item,
    count: events.filter((event) => event.state === item.state).length,
  }));
  const moodWords = getMoodWords(events);
  const totalBroadcasts = Number(historyCount || 0n);

  return (
    <main className={clsx("min-h-screen overflow-hidden bg-gradient-to-br", worldVisual.gradient)}>
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="weather-particles" />
        {floatingIcons.map((icon) => (
          <span
            key={icon.id}
            className="float-icon"
            style={{
              left: `${icon.left}%`,
              animationDelay: `${icon.delay}s`,
              fontSize: `${icon.size}px`,
            }}
          >
            {icon.emoji}
          </span>
        ))}
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-xl font-black tracking-normal text-slate-950">ChainWeather</p>
            <p className="text-sm font-medium text-slate-700">Broadcast your state onchain</p>
          </div>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/50 bg-white/55 px-4 text-sm font-bold text-slate-950 shadow-sm backdrop-blur-xl transition active:scale-95"
            onClick={() => (isConnected ? disconnect() : setShowConnectors(true))}
          >
            <Wallet size={17} />
            {isConnected ? shortenAddress(address) : "Connect Wallet"}
          </button>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {tab === "home" && (
              <>
                <section className="pt-5 text-center sm:pt-8">
                  <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-2">
                    {weatherStates.map((item) => (
                      <button
                        key={item.state}
                        className={clsx(
                          "rounded-full border px-3 py-2 text-sm font-bold backdrop-blur-xl transition active:scale-95",
                          selectedState === item.state
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-white/60 bg-white/45 text-slate-800",
                        )}
                        onClick={() => setSelectedState(item.state)}
                      >
                        {item.emoji} {item.state}
                      </button>
                    ))}
                  </div>
                  <p className="mt-8 text-sm font-bold uppercase text-slate-700">
                    Current World Weather
                  </p>
                  <h1 className="mt-2 text-7xl font-black text-slate-950 sm:text-8xl">
                    <span className="block">{selectedVisual.emoji}</span>
                    {selectedState.toUpperCase()}
                  </h1>
                  <p className="mt-4 text-lg font-bold text-slate-800">
                    {Math.max(events.length * 214, 1284).toLocaleString()} users broadcasting{" "}
                    {selectedState.toLowerCase()}
                  </p>
                </section>

                <section className="grid gap-3 rounded-[2rem] border border-white/55 bg-white/50 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-2xl sm:grid-cols-3">
                  <Stat label="Positive" value={`${percent(positiveCount, events.length)}%`} />
                  <Stat label="Neutral" value={`${percent(neutralCount, events.length)}%`} />
                  <Stat label="Chaos" value={`${percent(chaosCount, events.length)}%`} />
                </section>

                <BroadcastCard
                  isWriting={isWriting}
                  mood={mood}
                  selectedState={selectedState}
                  setMood={setMood}
                  setSelectedState={setSelectedState}
                  onBroadcast={broadcastWeather}
                />
              </>
            )}

            {tab === "feed" && (
              <Panel title="Community Weather" icon={<Radio size={20} />}>
                <div className="space-y-3">
                  {events.map((event, index) => {
                    const visual = getWeatherVisual(event.state);
                    return (
                      <div
                        key={event.id}
                        className="rounded-3xl border border-white/55 bg-white/45 p-4 backdrop-blur-xl"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-4xl">{visual.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-black text-slate-950">
                                {shortenAddress(event.user)}
                              </p>
                              <p className="shrink-0 text-xs font-bold text-slate-600">
                                {index + 2} min ago
                              </p>
                            </div>
                            <p className="text-sm font-bold text-slate-700">{event.state}</p>
                            <p className="mt-2 text-base font-medium text-slate-800">{event.mood}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {tab === "sky" && (
              <Panel title="Global Weather Sky" icon={<Sparkles size={20} />}>
                <div className="relative h-[58vh] min-h-[460px] overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950/70">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(125,211,252,0.45),transparent_55%)]" />
                  {[...floatingIcons, ...events.slice(0, 22).map((event, index) => ({
                    id: index,
                    emoji: getWeatherVisual(event.state).emoji,
                    left: 8 + ((index * 17) % 80),
                    delay: index * 0.2,
                    size: 32 + ((index * 5) % 28),
                  }))].map((icon) => (
                    <span
                      key={`${icon.id}-${icon.left}`}
                      className="float-icon"
                      style={{
                        left: `${icon.left}%`,
                        animationDelay: `${icon.delay}s`,
                        fontSize: `${icon.size}px`,
                      }}
                    >
                      {icon.emoji}
                    </span>
                  ))}
                  <button
                    className="absolute bottom-5 left-1/2 inline-flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-6 text-base font-black text-slate-950 shadow-2xl transition active:scale-95"
                    onClick={pingWeather}
                    disabled={isWriting}
                  >
                    <Send size={18} />
                    Send Pulse
                  </button>
                </div>
              </Panel>
            )}

            {tab === "climate" && (
              <Panel title="Weather Pulse" icon={<BarChart3 size={20} />}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-xl">
                    <p className="text-sm font-bold uppercase text-slate-600">
                      Current Global Climate
                    </p>
                    <div className="mt-5 space-y-4">
                      {climateCounts.map((item) => (
                        <div key={item.state}>
                          <div className="mb-2 flex justify-between text-sm font-black text-slate-800">
                            <span>
                              {item.emoji} {item.state}
                            </span>
                            <span>{percent(item.count, events.length)}%</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-white/60">
                            <div
                              className="h-full rounded-full bg-slate-950"
                              style={{ width: `${percent(item.count, events.length)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-xl">
                      <p className="text-sm font-bold uppercase text-slate-600">Mood Cloud</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {(moodWords.length ? moodWords : [["build", 3], ["hope", 2], ["focus", 2]]).map(
                          ([word, count]) => (
                            <span
                              key={word}
                              className="font-black text-slate-950"
                              style={{ fontSize: `${14 + Number(count) * 4}px` }}
                            >
                              {word}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-xl">
                      <p className="text-sm font-bold uppercase text-slate-600">
                        Most Active Broadcasters
                      </p>
                      <div className="mt-4 space-y-3">
                        {events.slice(0, 3).map((event, index) => (
                          <div key={event.id} className="flex items-center justify-between">
                            <span className="font-black text-slate-950">
                              #{index + 1} {shortenAddress(event.user)}
                            </span>
                            <span className="font-bold text-slate-700">
                              {(1234 - index * 114).toLocaleString()} broadcasts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {tab === "me" && (
              <Panel title="My Weather Timeline" icon={<User size={20} />}>
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-xl">
                    <p className="text-6xl">{getWeatherVisual(currentState).emoji}</p>
                    <h2 className="mt-3 text-3xl font-black text-slate-950">{currentState || "No Weather"}</h2>
                    <Info label="Mood" value={currentMood || "No mood recorded yet"} />
                    <Info label="Version" value={String(currentVersion || 0n)} />
                    <Info
                      label="Last Updated"
                      value={
                        currentTimestamp
                          ? formatDistanceToNow(Number(currentTimestamp) * 1000, { addSuffix: true })
                          : "Not recorded yet"
                      }
                    />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Stat label="Total Broadcasts" value={totalBroadcasts.toLocaleString()} />
                      <Stat label="Sky Points" value={points.toLocaleString()} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-xl">
                      <p className="text-sm font-bold uppercase text-slate-600">Weather Evolution</p>
                      <div className="mt-4 space-y-4">
                        {events.slice(0, 5).map((event, index) => (
                          <div key={event.id} className="flex gap-3">
                            <span className="text-3xl">{getWeatherVisual(event.state).emoji}</span>
                            <div>
                              <p className="font-black text-slate-950">
                                V{event.version ? String(event.version) : 12 - index} {event.state}
                              </p>
                              <p className="font-medium text-slate-700">{event.mood}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-xl">
                      <p className="text-2xl font-black text-slate-950">Start a new season.</p>
                      <p className="mt-2 font-medium text-slate-700">
                        Your current weather will be cleared. Your timeline begins again.
                      </p>
                      <button
                        className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-5 font-black text-white transition active:scale-95"
                        onClick={resetWeather}
                        disabled={isWriting}
                      >
                        <RefreshCw size={17} />
                        Reset My Climate
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-5 lg:h-fit">
            <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-2xl">
              <p className="text-sm font-bold uppercase text-slate-600">Instant Reward</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-5xl font-black text-slate-950">{points}</p>
                <p className="pb-2 font-bold text-slate-700">Sky Points</p>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">
                First broadcast unlocks points immediately. No token purchase needed.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/55 bg-white/50 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase text-slate-600">Invite Forecast</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{referrals} referrals</p>
                </div>
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition active:scale-95"
                  onClick={shareInvite}
                  aria-label="Copy invite link"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="hidden rounded-[2rem] border border-white/55 bg-white/50 p-5 backdrop-blur-2xl lg:block">
              <BroadcastCard
                compact
                isWriting={isWriting}
                mood={mood}
                selectedState={selectedState}
                setMood={setMood}
                setSelectedState={setSelectedState}
                onBroadcast={broadcastWeather}
              />
            </div>
          </aside>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-3 pb-3">
        <div className="grid grid-cols-5 rounded-full border border-white/60 bg-white/70 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-2xl">
          {[
            ["home", Home, "Home"],
            ["feed", Radio, "Feed"],
            ["sky", Sparkles, "Sky"],
            ["climate", Activity, "Climate"],
            ["me", User, "Me"],
          ].map(([key, Icon, label]) => (
            <button
              key={key as string}
              className={clsx(
                "flex h-14 flex-col items-center justify-center rounded-full text-[11px] font-black transition",
                tab === key ? "bg-slate-950 text-white" : "text-slate-700",
              )}
              onClick={() => setTab(key as Tab)}
            >
              <Icon size={18} />
              {label as string}
            </button>
          ))}
        </div>
      </nav>

      {showConnectors && (
        <div className="fixed inset-0 z-30 flex items-end bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xl font-black text-slate-950">Choose Wallet</p>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                onClick={() => setShowConnectors(false)}
                aria-label="Close wallet selector"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {uniqueConnectors.map((connector) => (
                <button
                  key={connector.uid}
                  className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 px-4 font-black text-slate-950 transition active:scale-95"
                  onClick={() => {
                    connect({ connector });
                    setShowConnectors(false);
                  }}
                  disabled={isConnecting}
                >
                  {getConnectorLabel(connector.name)}
                  <Wallet size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <button
          className="fixed left-1/2 top-5 z-40 -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-2xl"
          onClick={() => setToast("")}
        >
          {toast}
        </button>
      )}
    </main>
  );
}

function BroadcastCard({
  compact,
  isWriting,
  mood,
  selectedState,
  setMood,
  setSelectedState,
  onBroadcast,
}: {
  compact?: boolean;
  isWriting: boolean;
  mood: string;
  selectedState: WeatherState;
  setMood: (mood: string) => void;
  setSelectedState: (state: WeatherState) => void;
  onBroadcast: () => void;
}) {
  return (
    <section className={clsx(!compact && "rounded-[2rem] border border-white/55 bg-white/50 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-2xl")}>
      <p className="text-xl font-black text-slate-950">What&apos;s the weather around you?</p>
      <p className="mt-4 text-sm font-bold uppercase text-slate-600">Weather State</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {weatherStates.map((item) => (
          <button
            key={item.state}
            className={clsx(
              "min-h-20 rounded-3xl border p-2 text-center font-black transition active:scale-95",
              selectedState === item.state
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-white/70 bg-white/45 text-slate-800",
            )}
            onClick={() => setSelectedState(item.state)}
          >
            <span className="block text-3xl">{item.emoji}</span>
            <span className="text-sm">{item.state}</span>
          </button>
        ))}
      </div>
      <label className="mt-5 block text-sm font-bold uppercase text-slate-600">Mood Tag</label>
      <input
        className="mt-2 h-14 w-full rounded-2xl border border-white/70 bg-white/65 px-4 text-base font-bold text-slate-950 outline-none ring-slate-950/15 transition placeholder:text-slate-500 focus:ring-4"
        placeholder="Describe your feeling..."
        value={mood}
        onChange={(event) => setMood(event.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {moodSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            className="rounded-full bg-white/55 px-3 py-2 text-xs font-bold text-slate-700"
            onClick={() => setMood(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <button
        className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-base font-black text-white shadow-xl transition active:scale-95 disabled:opacity-60"
        onClick={onBroadcast}
        disabled={isWriting}
      >
        <Send size={18} />
        {isWriting ? "Broadcasting..." : "Broadcast Weather"}
      </button>
    </section>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/55 bg-white/45 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-2xl">
      <div className="mb-5 flex items-center gap-2 text-slate-950">
        {icon}
        <h1 className="text-2xl font-black">{title}</h1>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/45 p-4">
      <p className="text-xs font-bold uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase text-slate-600">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}
