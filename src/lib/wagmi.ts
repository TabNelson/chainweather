import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const baseBuilderDataSuffix =
  (process.env.NEXT_PUBLIC_BASE_BUILDER_DATA_SUFFIX || "0x") as `0x${string}`;

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: "ChainWeather",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  },
  ssr: true,
});

export const queryClient = new QueryClient();
