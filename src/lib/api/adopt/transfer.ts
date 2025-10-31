// src/lib/api/adopt/transfer.ts

/**
 * Pet Ownership Transfer API Functions
 *
 * Complete Flow:
 * 1. prepareTransfer() - Current owner prepares signing data
 * 2. Client signs message with wallet
 * 3. verifyTransfer() - New guardian uploads nose print (≥50% match)
 * 4. acceptTransfer() - New guardian submits signature + proof → Blockchain execution
 */

import { getApiUrl } from "../config";

// ==================== Type Definitions ====================

export interface PetTransferData {
  petName: string;
  breed: string;
  old: number;
  gender: string;
  weight?: number;
  color?: string;
  feature?: string;
  neutral?: boolean;
  specifics: string;
}

// Step 1: Prepare Transfer
export interface PrepareTransferRequest {
  newGuardianAddress: string;
  petData: PetTransferData;
}

export interface PrepareTransferResponse {
  success: boolean;
  message: {
    vc: {
      vcType: string;
      credentialSubject: {
        previousGuardian: string;
        guardian: string;
        petDID: string;
        biometricHash: string;
        petData: PetTransferData;
      };
      issuedAt: string;
      nonce: string;
    };
  };
  messageHash: string;
  signingData: string; // ⭐ Original string to sign directly
  header?: any;
  encodedHeader?: string;
  encodedPayload?: string;
  instruction?: string;
  nextStep: string;
}

// Step 3: Verify Transfer
export interface VerifyTransferRequest {
  image: string; // Filename uploaded to S3
}

export interface VerificationProof {
  petDID: string;
  newGuardian: string;
  similarity: number;
  verifiedAt: string;
  nonce: string;
}

export interface VerifyTransferResponse {
  success: boolean;
  similarity: number;
  message: string;
  error?: string;
  threshold?: number;
  verificationProof?: VerificationProof;
  proofHash?: string;
  nextStep?: string;
}

// Step 4: Accept Transfer
export interface AcceptTransferRequest {
  signature: string;
  message: any;
  petData: PetTransferData;
  verificationProof: VerificationProof;
  signedTx: string;
  vcSignedData: string; // ⭐ 백엔드 수정에 맞춰 추가! (원본 서명 데이터)
}

export interface AcceptTransferResponse {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  similarity?: number;
  vcTransferJobId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  details?: any;
}

// ==================== API Functions ====================

/**
 * Redis-based Transfer Flow: Initialize Transfer
 * Current owner initiates transfer and stores data in Redis
 */
export async function initTransfer(
  adoptionId: number,
  petDID: string,
  roomId: number,
  prepareData: any,
  newGuardianAddress: string,
  accessToken: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(getApiUrl(`/api/pet/transfer/init/${adoptionId}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      petDID,
      roomId,
      prepareData,
      newGuardianAddress,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`이전 초기화 실패 (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Redis-based Transfer Flow: Get Transfer Data
 * Adopter retrieves transfer data from Redis
 */
export async function getTransferData(
  adoptionId: number,
  accessToken: string
): Promise<{
  success: boolean;
  data?: {
    petDID: string;
    adoptionId: number;
    roomId: number;
    status: "INITIATED" | "SIGNED" | "VERIFIED" | "COMPLETED";
    prepareData: PrepareTransferResponse;
    signature?: string;
    verificationProof?: VerificationProof;
    currentGuardianAddress: string;
    newGuardianAddress: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}> {
  const response = await fetch(
    getApiUrl(`/api/pet/transfer/data/${adoptionId}`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`이전 데이터 조회 실패 (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Redis-based Transfer Flow: Update Transfer Status
 * Adopter updates transfer status after each step
 */
export async function updateTransferStatus(
  adoptionId: number,
  status: "SIGNED" | "VERIFIED" | "COMPLETED",
  additionalData: {
    signature?: string;
    verificationProof?: VerificationProof;
    similarity?: number;
  },
  accessToken: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(
    getApiUrl(`/api/pet/transfer/update/${adoptionId}`),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        status,
        ...additionalData,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`이전 상태 업데이트 실패 (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Cancel Transfer
 * Owner cancels the ongoing transfer process
 */
export async function cancelTransfer(
  adoptionId: number,
  accessToken: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(
    getApiUrl(`/api/pet/transfer/cancel/${adoptionId}`),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`취소 실패 (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Step 1: Prepare Pet Ownership Transfer
 * Current owner initiates transfer by generating signing data for new guardian
 */
export async function prepareTransfer(
  petDID: string,
  request: PrepareTransferRequest,
  accessToken: string
): Promise<PrepareTransferResponse> {
  const url = getApiUrl(`/api/pet/prepare-transfer/${encodeURIComponent(petDID)}`);

  console.log("🔗 prepareTransfer API call:");
  console.log("  - URL:", url);
  console.log("  - Request:", request);

  const response = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    }
  );

  console.log("  - Response status:", response.status);
  console.log("  - Response OK:", response.ok);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("  - Error response body:", errorText);
    throw new Error(`이전 준비 실패 (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  console.log("  - Response data:", data);

  if (!data.success) {
    console.error("  - Backend returned success=false");
    console.error("  - Error:", data.error);
    console.error("  - Message:", data.message);

    // error 또는 message 필드에서 에러 메시지 추출
    const errorMessage = data.error || data.message?.toString() || "이전 준비에 실패했습니다.";
    throw new Error(errorMessage);
  }

  return data as PrepareTransferResponse;
}

/**
 * Step 3: Verify New Guardian Biometric
 * New guardian uploads nose print for matching (≥50% similarity required)
 */
export async function verifyTransfer(
  petDID: string,
  request: VerifyTransferRequest,
  accessToken: string
): Promise<VerifyTransferResponse> {
  const response = await fetch(
    getApiUrl(`/api/pet/verify-transfer/${encodeURIComponent(petDID)}`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`비문 검증 실패 (${response.status}): ${errorText}`);
  }

  const data: VerifyTransferResponse = await response.json();
  return data;
}

/**
 * Step 4: Accept Pet Ownership Transfer
 * New guardian submits signature + verification proof → Executes blockchain transaction
 */
export async function acceptTransfer(
  petDID: string,
  adoptionId: number,
  request: AcceptTransferRequest,
  accessToken: string
): Promise<AcceptTransferResponse> {
  const response = await fetch(
    getApiUrl(`/api/pet/accept-transfer/${encodeURIComponent(petDID)}/${adoptionId}`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    }
  );

  const data: AcceptTransferResponse = await response.json();

  // Handle both success and error responses
  if (!response.ok) {
    // Service unavailable (retryable errors) or Bad Request
    throw new Error(
      data.error || data.message || `입양 완료 실패 (${response.status})`
    );
  }

  if (!data.success) {
    throw new Error(data.error || data.message || "입양 완료에 실패했습니다.");
  }

  return data;
}
