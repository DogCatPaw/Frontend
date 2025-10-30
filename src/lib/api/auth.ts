import axios from "axios";
import type { ApiResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ==================== Authentication Types ====================

export interface ChallengeRequest {
  walletAddress: string; // MUST be lowercase!
}

export interface ChallengeResponse {
  success: boolean;
  challenge: string; // Sign this with wallet
  vpSigningData: {
    message: object;
    messageHash: string;
    signingData: string;
  } | null;
  message: string;
  expiresIn: number; // Expires in seconds (300 = 5 minutes)
}

export interface LoginRequest {
  walletAddress: string; // MUST be lowercase!
  signature: string; // Signature of challenge
  challenge: string; // Original challenge
  vpSignature?: string; // VP signature (if VCs exist)
  vpMessage?: object; // VP message object
  vpSignedData?: string; // VP signed data
}

export interface GuardianInfo {
  guardianId: number;
  email: string;
  phone: string;
  name: string;
  isEmailVerified: boolean;
  isOnChainRegistered: boolean;
}

export interface UserProfile {
  walletAddress: string;
  guardianInfo: GuardianInfo | null;
  vcCount: number;
  pets: Array<{
    petDID: string;
    name: string;
    species: string;
    issuedAt: string;
  }>;
}

export interface ExtendedUserProfile {
  did: string; // "did:ethr:besu:0x..."
  walletAddress: string;
  isGuardian: boolean;
  guardianInfo: GuardianInfo | null;
  credentials: {
    total: number; // Total VCs
    pets: number; // Pet VCs
    identity: number; // Identity VCs
  };
  pets: Array<{
    petDID: string;
    name: string;
    species: string;
    issuedAt: string;
  }>;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string; // JWT token for API calls
  refreshToken: string; // Token to refresh access
  vpJwt: string; // VP JWT ("EMPTY" if no VCs)
  profile: UserProfile;
  message: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface ProfileResponse {
  success: boolean;
  profile: ExtendedUserProfile;
}

// ==================== API Functions ====================

/**
 * Step 1: Get authentication challenge
 * @param walletAddress - Wallet address (will be converted to lowercase)
 * @returns Challenge data including VP signing data if applicable
 */
export async function getChallenge(
  walletAddress: string
): Promise<ChallengeResponse> {
  const response = await axios.post<ChallengeResponse>(
    `${API_BASE_URL}/api/auth/challenge`,
    {
      walletAddress: walletAddress.toLowerCase(), // ✅ CRITICAL: Must be lowercase!
    }
  );
  return response.data;
}

/**
 * Step 2: Login with signed challenge
 * @param request - Login request with signatures
 * @returns Access token, refresh token, and user profile
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(
    `${API_BASE_URL}/api/auth/login`,
    {
      ...request,
      walletAddress: request.walletAddress.toLowerCase(), // ✅ CRITICAL: Must be lowercase!
    }
  );
  return response.data;
}

/**
 * Get current user profile
 * @param accessToken - JWT access token
 * @returns Extended user profile with DID, credentials, and pets
 */
export async function getProfile(
  accessToken: string
): Promise<ProfileResponse> {
  const response = await axios.get<ProfileResponse>(
    `${API_BASE_URL}/api/auth/profile`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Logout current session
 * @param accessToken - JWT access token
 */
export async function logout(accessToken: string): Promise<LogoutResponse> {
  const response = await axios.post<LogoutResponse>(
    `${API_BASE_URL}/api/auth/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

/**
 * Logout all sessions
 * @param accessToken - JWT access token
 */
export async function logoutAll(
  accessToken: string
): Promise<LogoutResponse> {
  const response = await axios.post<LogoutResponse>(
    `${API_BASE_URL}/api/auth/logout-all`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
}

// ==================== Helper Functions ====================

/**
 * Check if user is authenticated
 * @returns true if access token exists in localStorage
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

/**
 * Get stored access token
 * @returns Access token or null
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

/**
 * Get stored refresh token
 * @returns Refresh token or null
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

/**
 * Store authentication tokens
 * @param accessToken - Access token
 * @param refreshToken - Refresh token
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

/**
 * Clear authentication tokens
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("vpJwt");
}

/**
 * Get wallet address from localStorage
 * @returns Wallet address (lowercase) or null
 */
export function getStoredWalletAddress(): string | null {
  if (typeof window === "undefined") return null;
  const address = localStorage.getItem("walletAddress");
  return address ? address.toLowerCase() : null;
}

/**
 * Store wallet address (lowercase)
 * @param walletAddress - Wallet address
 */
export function storeWalletAddress(walletAddress: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("walletAddress", walletAddress.toLowerCase());
}

// ==================== Token Refresh ====================

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string; // Same refresh token (reusable)
  message: string;
}

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - Refresh token from localStorage
 * @returns New access token
 *
 * @example
 * ```typescript
 * const refreshToken = getRefreshToken();
 * if (refreshToken) {
 *   const response = await refreshAccessToken(refreshToken);
 *   if (response.success) {
 *     storeTokens(response.accessToken, response.refreshToken);
 *   }
 * }
 * ```
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const response = await axios.post<RefreshTokenResponse>(
    `${API_BASE_URL}/api/auth/refresh`,
    { refreshToken }
  );
  return response.data;
}
