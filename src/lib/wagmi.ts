import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { besuQBFT } from "./chains";

export const config = getDefaultConfig({
  appName: "Pet DID Platform",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [besuQBFT],
  ssr: true, // Server-side rendering support
});
