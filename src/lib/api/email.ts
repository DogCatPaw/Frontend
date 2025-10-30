import axios from "axios";
import type { ApiResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ==================== Email 관련 타입 ====================

export interface SendVerificationCodeRequest {
  email: string;
  walletAddress?: string; // Guardian 등록 시 필요
  purpose?: "SIGNUP" | "PASSWORD_RESET" | "EMAIL_CHANGE"; // 용도
}

export interface SendVerificationCodeResponse {
  success: boolean;
  message: string;
  error?: string;
  expiresAt?: number; // 인증 코드 만료 시간 (Unix timestamp)
}

export interface VerifyCodeRequest {
  email: string;
  walletAddress?: string; // Guardian 등록 시 필요
  code: string; // 인증 코드 (6자리 숫자 등)
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  error?: string;
  warning?: string;
  email: string;
  remainingAttempts?: number;
}

// ==================== API 함수 ====================

/**
 * 이메일로 인증 코드 발송
 * @param request - 이메일과 용도
 * @param web3Token - Web3Token for authentication
 * @param walletAddress - Wallet address (lowercase)
 * @returns 발송 결과
 */
export async function sendVerificationCode(
  request: SendVerificationCodeRequest,
  web3Token: string,
  walletAddress: string
): Promise<SendVerificationCodeResponse> {
  const response = await axios.post<SendVerificationCodeResponse>(
    `${API_BASE_URL}/email/send-code`,
    { email: request.email },
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
 * 인증 코드 확인
 * @param request - 이메일과 인증 코드
 * @param web3Token - Web3Token for authentication
 * @param walletAddress - Wallet address (lowercase)
 * @returns 인증 결과
 */
export async function verifyCode(
  request: VerifyCodeRequest,
  web3Token: string,
  walletAddress: string
): Promise<VerifyCodeResponse> {
  const response = await axios.post<VerifyCodeResponse>(
    `${API_BASE_URL}/email/verify-code`,
    { code: request.code },
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
 * 이메일 중복 확인
 * @param email - 확인할 이메일
 * @returns 사용 가능 여부
 */
export async function checkEmailAvailability(
  email: string
): Promise<ApiResponse<{ available: boolean }>> {
  const response = await axios.get<ApiResponse<{ available: boolean }>>(
    `${API_BASE_URL}/api/email/check-availability`,
    {
      params: { email },
    }
  );
  return response.data;
}
