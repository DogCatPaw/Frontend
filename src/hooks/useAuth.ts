"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  getChallenge,
  login as apiLogin,
  logout as apiLogout,
  logoutAll as apiLogoutAll,
  getProfile,
  storeTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  storeWalletAddress,
  type UserProfile,
  type ExtendedUserProfile,
} from "@/lib/api/auth";

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  errorCode: number | null; // HTTP error code (401, 403, etc.)
  user: UserProfile | null;

  // Actions
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * Authentication hook using DID-based wallet authentication
 *
 * Usage:
 * ```tsx
 * const { isAuthenticated, login, logout, user } = useAuth();
 *
 * <button onClick={login}>Connect & Login</button>
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with true to check token
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false); // Prevent duplicate calls

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (token) {
        setIsAuthenticated(true);
        // Load profile once
        await loadProfile(token);
      }
      setIsLoading(false); // Done checking
    };

    checkAuth();
  }, []); // Run only once on mount

  // Load user profile with automatic token refresh
  const loadProfile = async (token: string, retryCount = 0) => {
    // Prevent duplicate calls
    if (profileLoading) {
      console.log("Profile already loading, skipping...");
      return;
    }

    setProfileLoading(true);
    try {
      const response = await getProfile(token);
      console.log("📋 [useAuth] Profile API Response:", response);
      console.log("📋 [useAuth] Pets from API:", response.profile?.pets);

      if (response.success) {
        const profile: UserProfile = {
          walletAddress: response.profile.walletAddress,
          guardianInfo: response.profile.guardianInfo ? {
            ...response.profile.guardianInfo,
            isOnChainRegistered: true, // 임시: 항상 true로 설정 (CORS 이슈 해결 전까지)
          } : null,
          vcCount: response.profile.credentials.total,
          pets: response.profile.pets || [],
        };
        console.log("📋 [useAuth] Profile state:", profile);
        console.log("📋 [useAuth] Pets in state:", profile.pets);
        setUser(profile);
      }
    } catch (err: any) {
      console.error("Failed to load profile:", err);

      // If 401 (unauthorized), try to refresh token
      if (err?.response?.status === 401 && retryCount === 0) {
        console.log("🔄 Token expired, attempting to refresh...");
        const refreshToken = getRefreshToken();

        if (refreshToken) {
          try {
            const refreshResponse = await refreshAccessToken(refreshToken);
            if (refreshResponse.success) {
              console.log("✅ Token refreshed successfully, retrying profile load...");
              storeTokens(refreshResponse.accessToken, refreshResponse.refreshToken);
              setProfileLoading(false);
              // Retry loading profile with new token (only once)
              return loadProfile(refreshResponse.accessToken, 1);
            }
          } catch (refreshError) {
            console.error("❌ Token refresh failed:", refreshError);
          }
        }

        // If refresh failed or no refresh token, logout
        console.log("Token invalid and refresh failed, logging out...");
        clearTokens();
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * DID-based login with wallet signature
   *
   * Flow:
   * 1. Get challenge from server
   * 2. Sign challenge with wallet
   * 3. Sign VP if user has VCs
   * 4. Submit signatures to server
   * 5. Store tokens
   */
  const login = async (): Promise<boolean> => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);

      // ✅ CRITICAL: Convert wallet address to lowercase
      const walletAddress = address.toLowerCase();

      // Step 1: Get challenge
      console.log("🔑 Step 1: Getting challenge...");
      const challengeData = await getChallenge(walletAddress);
      const { challenge, vpSigningData } = challengeData;

      // Step 2: Sign challenge
      console.log("✍️ Step 2: Signing challenge...");
      const challengeSignature = await signMessageAsync({
        message: challenge,
      });

      // Step 3: Sign VP message (if exists)
      let vpSignature: string | undefined = undefined;
      let vpMessage: object | undefined = undefined;
      let vpSignedData: string | undefined = undefined;

      if (vpSigningData) {
        console.log("🔐 Step 3: Signing VP...");
        vpMessage = vpSigningData.message;
        vpSignedData = vpSigningData.signingData; // ⭐ 원본 signingData 저장

        console.log("📝 VP Signing Data (first 100 chars):", vpSignedData.substring(0, 100) + "...");

        // ✅ 원본 문자열을 직접 서명 (해시 없이)
        // signMessageAsync는 내부적으로 Ethereum Signed Message 프리픽스를 추가하고 해싱함
        vpSignature = await signMessageAsync({
          message: vpSignedData, // 원본 문자열 직접 서명
        });

        console.log("✅ VP Signature created");
        console.log("📝 VP Signature:", vpSignature);
      }

      // Step 4: Login
      console.log("🚀 Step 4: Logging in...");
      const loginResponse = await apiLogin({
        walletAddress,
        signature: challengeSignature,
        challenge,
        vpSignature,
        vpMessage,
        vpSignedData, // ⭐ 원본 signingData 전달
      });

      if (!loginResponse.success) {
        throw new Error(loginResponse.message || "Login failed");
      }

      // Step 5: Store tokens and wallet address
      console.log("💾 Step 5: Storing tokens...");
      storeTokens(loginResponse.accessToken, loginResponse.refreshToken);
      storeWalletAddress(walletAddress);

      if (loginResponse.vpJwt && loginResponse.vpJwt !== "EMPTY") {
        localStorage.setItem("vpJwt", loginResponse.vpJwt);
      }

      // Update state with temporary fix for isOnChainRegistered
      setIsAuthenticated(true);
      setUser({
        ...loginResponse.profile,
        guardianInfo: loginResponse.profile.guardianInfo ? {
          ...loginResponse.profile.guardianInfo,
          isOnChainRegistered: true, // 임시: 항상 true로 설정
        } : null,
        pets: loginResponse.profile.pets || [], // pets가 없으면 빈 배열
      });

      console.log("✅ Login successful!");
      return true;
    } catch (err: any) {
      console.error("❌ Login error:", err);

      // Extract error code from axios error
      const statusCode = err?.response?.status || null;
      setErrorCode(statusCode);

      // Set error message based on status code
      if (statusCode === 401) {
        setError("지갑 주소가 등록되지 않았습니다. 회원가입이 필요합니다.");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout current session
   */
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const token = getAccessToken();

      if (token) {
        try {
          await apiLogout(token);
        } catch (err) {
          console.error("Logout API error:", err);
          // Continue with local logout even if API fails
        }
      }

      // Clear local state
      clearTokens();
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout all sessions
   */
  const logoutAll = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const token = getAccessToken();

      if (token) {
        try {
          await apiLogoutAll(token);
        } catch (err) {
          console.error("Logout all API error:", err);
          // Continue with local logout even if API fails
        }
      }

      // Clear local state
      clearTokens();
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user profile from server
   */
  const refreshProfile = async (): Promise<void> => {
    const token = getAccessToken();
    if (token) {
      await loadProfile(token);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    errorCode,
    user,
    login,
    logout,
    logoutAll,
    refreshProfile,
  };
}
