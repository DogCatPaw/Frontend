import { defineChain } from "viem";

/**
 * Besu QBFT Private Network
 * Chain ID: 1337
 */
export const besuQBFT = defineChain({
  id: 1337,
  name: "Hyperledger Besu",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BESU_RPC_URL ||
          "http://ing-besunetwork-besurpci-c2714-112134690-ab00043af5a6.kr.lb.naverncp.com:8545",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_BESU_RPC_URL ||
          "http://ing-besunetwork-besurpci-c2714-112134690-ab00043af5a6.kr.lb.naverncp.com:8545",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Besu Explorer",
      url:
        process.env.NEXT_PUBLIC_BESU_EXPLORER_URL || "http://localhost:4000",
    },
  },
  testnet: true,
});
