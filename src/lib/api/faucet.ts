import axios from "axios";
import { getApiUrl } from "./config";

// ==================== Faucet Types ====================

export interface RequestFundsRequest {
  walletAddress: string; // Ethereum address (lowercase)
  amount?: string; // Optional, default 100 ETH
}

export interface RequestFundsResponse {
  success: boolean;
  data: {
    transactionHash: string;
    walletAddress: string;
    amount: string;
    timestamp: string;
  } | null;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  timestamp: string;
}

export interface FaucetBalanceResponse {
  success: boolean;
  data: {
    balance: string; // Balance in ETH
    address: string;
  } | null;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface FaucetHistoryResponse {
  success: boolean;
  data: {
    transactions: Array<{
      transactionHash: string;
      toAddress: string;
      amount: string;
      timestamp: string;
      status: "success" | "failed";
    }>;
  } | null;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface FaucetHealthResponse {
  status: "success" | "error";
  grpcStatus: number | string;
  message: string;
  timestamp: string;
  version?: string;
}

// ==================== API Functions ====================

/**
 * Request test ETH from faucet (using JWT access token)
 * @param request - Wallet address and optional amount
 * @param accessToken - JWT access token
 * @returns Transaction details if successful
 */
export async function requestFaucetFunds(
  request: RequestFundsRequest,
  accessToken: string
): Promise<RequestFundsResponse> {
  const response = await axios.post<RequestFundsResponse>(
    getApiUrl('/api/faucet/request'),
    {
      walletAddress: request.walletAddress.toLowerCase(),
      amount: request.amount || "100", // Default 100 ETH
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

/**
 * Request test ETH from faucet (using Web3Token for DID authentication)
 * Use this BEFORE Guardian registration when user doesn't have JWT yet
 * @param request - Wallet address and optional amount
 * @param web3Token - Web3Token for DID authentication
 * @param walletAddress - Wallet address (lowercase)
 * @returns Transaction details if successful
 */
export async function requestFaucetFundsWithWeb3Token(
  request: RequestFundsRequest,
  web3Token: string,
  walletAddress: string
): Promise<RequestFundsResponse> {
  const response = await axios.post<RequestFundsResponse>(
    getApiUrl('/api/faucet/request'),
    {
      walletAddress: request.walletAddress.toLowerCase(),
      amount: request.amount || "1", // Default 1 ETH (minimal for gas)
    },
    {
      headers: {
        Authorization: web3Token, // Web3Token (NOT "Bearer ${token}")
        walletaddress: walletAddress.toLowerCase(),
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

/**
 * Get balance of faucet or specific wallet
 * @param accessToken - JWT access token
 * @param address - Optional wallet address to check (defaults to faucet balance)
 * @returns Balance in ETH
 */
export async function getFaucetBalance(
  accessToken: string,
  address?: string
): Promise<FaucetBalanceResponse> {
  const params = address ? { address: address.toLowerCase() } : {};
  const response = await axios.get<FaucetBalanceResponse>(
    getApiUrl('/api/faucet/balance'),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params,
    }
  );
  return response.data;
}

/**
 * Get faucet transaction history
 * @param accessToken - JWT access token
 * @param address - Optional wallet address to filter
 * @param limit - Number of transactions to return (default: 10, max: 100)
 * @returns List of faucet transactions
 */
export async function getFaucetHistory(
  accessToken: string,
  address?: string,
  limit: number = 10
): Promise<FaucetHistoryResponse> {
  const params: any = { limit };
  if (address) {
    params.address = address.toLowerCase();
  }

  const response = await axios.get<FaucetHistoryResponse>(
    getApiUrl('/api/faucet/history'),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params,
    }
  );
  return response.data;
}

/**
 * Check faucet service health
 * @returns Service health status
 */
export async function getFaucetHealth(): Promise<FaucetHealthResponse> {
  const response = await axios.get<FaucetHealthResponse>(
    getApiUrl('/api/faucet/health')
  );
  return response.data;
}
