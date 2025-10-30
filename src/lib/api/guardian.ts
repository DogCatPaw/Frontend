import axios from "axios";
import type { ApiResponse } from "@/types/api";
import { Gender, Role } from "@/types/enums";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ==================== Guardian Types ====================

/**
 * Guardian registration request
 * Based on actual API spec from Swagger
 */
export interface RegisterGuardianRequest {
  email: string; // Required - must be verified first
  role: Role; // Required - USER or ADMIN (enum number)
  phone: string; // Required - phone number
  name: string; // Required - full name
  nickname: string; // Required - display nickname
  profileUrl: string; // Required - S3 temp filename (uploaded via /common)
  gender: Gender; // Required - MALE(0) or FEMALE(1) (enum number)
  old: number; // Required - age (1-150)
  address: string; // Required - physical address
  verificationMethod?: number; // Default: 2 (Email verified)
  signedTx?: string; // Optional - if not provided, backend handles blockchain transaction
}

/**
 * Guardian registration response (with profile image)
 */
export interface RegisterGuardianResponseWithImage {
  success: boolean;
  authId: number; // VC service auth record ID
  txHash: string; // Blockchain transaction hash
  blockNumber: number; // Block number
  vcJobId: string; // BullMQ VC sync job ID
  imageMoveJobId: string; // BullMQ image move job ID
  message: string;
}

/**
 * Guardian registration response (without profile image)
 */
export interface RegisterGuardianResponseNoImage {
  success: boolean;
  authId: number;
  txHash: string;
  blockNumber: number;
  vcJobId: string;
  springJobId: string; // Direct Spring registration job ID
  message: string;
}

export type RegisterGuardianResponse =
  | RegisterGuardianResponseWithImage
  | RegisterGuardianResponseNoImage;

/**
 * Guardian information from profile
 */
export interface GuardianInfo {
  guardianId: number;
  email: string;
  phone: string;
  name: string;
  isEmailVerified: boolean;
  isOnChainRegistered: boolean;
}

// ==================== API Functions ====================

/**
 * Register guardian (Method 1 - Production Mode)
 *
 * Two-step process:
 *
 * STEP 1: Get transaction data (call without signedTx)
 * - Backend returns { requiresSignature: true, transactionData: {...} }
 *
 * STEP 2: Broadcast and submit (call with signedTx)
 * - Frontend broadcasts transaction using MetaMask's eth_sendTransaction
 * - Get 66-character transaction hash
 * - Call this function again with the tx hash
 * - Backend waits for confirmation and processes
 *
 * @param request - Guardian registration details (optionally with signedTx)
 * @param web3Token - Web3Token for DID authentication (NOT JWT!)
 * @returns Either transaction data OR registration result
 *
 * @example
 * ```typescript
 * // Step 1: Generate Web3Token
 * const web3Token = await generateWeb3Token(walletClient, address);
 *
 * // Step 2: Get transaction data from backend
 * const prepareResponse = await registerGuardian({
 *   email: 'user@example.com',
 *   name: '홍길동',
 *   phone: '010-1234-5678',
 *   role: Role.USER,
 *   gender: Gender.MALE,
 *   // ... other fields
 *   // NO signedTx
 * }, web3Token);
 *
 * // Step 3: Broadcast transaction with MetaMask
 * const txHash = await walletClient.sendTransaction({
 *   to: prepareResponse.transactionData.to,
 *   data: prepareResponse.transactionData.data,
 *   gas: BigInt(prepareResponse.transactionData.gasLimit)
 * });
 *
 * // Step 4: Submit transaction hash to backend
 * const finalResponse = await registerGuardian({
 *   email: 'user@example.com',
 *   // ... same fields as before
 *   signedTx: txHash  // 66-character tx hash
 * }, web3Token);
 *
 * console.log('TX Hash:', finalResponse.txHash);
 * console.log('Block:', finalResponse.blockNumber);
 * ```
 */
export async function registerGuardian(
  request: RegisterGuardianRequest,
  web3Token: string
): Promise<RegisterGuardianResponse> {
  // Extract wallet address from request or token
  // For now, we'll assume the address is in the request
  const walletAddress = (request as any).walletAddress || "";

  // Convert gender from enum (0=MALE, 1=FEMALE) to string ('MALE', 'FEMALE')
  let genderString: string | undefined;
  if (request.gender === Gender.MALE) {
    genderString = 'MALE';
  } else if (request.gender === Gender.FEMALE) {
    genderString = 'FEMALE';
  }

  const requestBody = {
    ...request,
    role: request.role, // Send enum number (0=ADMIN, 1=USER)
    gender: genderString, // Send string ('MALE' or 'FEMALE')
    verificationMethod: request.verificationMethod ?? 2,
  };

  console.log("📤 Sending to backend:", JSON.stringify(requestBody, null, 2));

  const response = await axios.post<RegisterGuardianResponse>(
    `${API_BASE_URL}/api/guardian/register`,
    requestBody,
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
 * Get guardian information from profile
 * Note: This uses the auth profile endpoint since there's no separate guardian info endpoint
 *
 * @param accessToken - JWT access token
 * @returns Guardian information from user profile
 */
export async function getGuardianInfo(
  accessToken: string
): Promise<GuardianInfo | null> {
  try {
    // Use the auth profile endpoint
    const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = response.data.profile;
    if (!profile || !profile.guardianInfo) {
      return null;
    }

    return profile.guardianInfo;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if user is registered as guardian
 *
 * @param accessToken - JWT access token
 * @returns Registration status and guardian info if registered
 */
export async function checkGuardianStatus(
  accessToken: string
): Promise<{ isRegistered: boolean; guardianInfo?: GuardianInfo | null }> {
  try {
    const guardianInfo = await getGuardianInfo(accessToken);
    return {
      isRegistered: guardianInfo?.isOnChainRegistered ?? false,
      guardianInfo,
    };
  } catch (error: any) {
    console.error("Failed to check guardian status:", error);
    return { isRegistered: false };
  }
}
