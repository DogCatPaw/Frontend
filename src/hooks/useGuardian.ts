"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useWalletClient } from "wagmi";
import {
  sendVerificationCode,
  verifyCode,
} from "@/lib/api/email";
import {
  registerGuardian,
  checkGuardianStatus,
  type RegisterGuardianRequest,
  type RegisterGuardianResponse,
  type GuardianInfo,
} from "@/lib/api/guardian";
import { getAccessToken } from "@/lib/api/auth";
import { generateWeb3Token } from "@/lib/utils/web3Token";

export interface UseGuardianReturn {
  // Email verification state
  email: string;
  setEmail: (email: string) => void;
  codeSent: boolean;
  codeVerified: boolean;

  // Guardian registration state
  isGuardian: boolean;
  guardianInfo: GuardianInfo | null;
  isLoading: boolean;
  error: string | null;

  // Email verification actions
  sendCode: () => Promise<boolean>;
  verifyEmailCode: (code: string) => Promise<boolean>;

  // Guardian registration actions
  register: (data: Omit<RegisterGuardianRequest, "email">) => Promise<boolean>;
  checkStatus: () => Promise<void>;
}

/**
 * Guardian registration hook with email verification
 *
 * Complete flow:
 * 1. Check email availability
 * 2. Send verification code
 * 3. Verify code
 * 4. Register as guardian on blockchain
 *
 * Usage:
 * ```tsx
 * const {
 *   email, setEmail,
 *   checkEmail, sendCode, verifyEmailCode,
 *   register, isGuardian
 * } = useGuardian();
 *
 * // Step 1: Check email
 * await checkEmail();
 *
 * // Step 2: Send code
 * await sendCode();
 *
 * // Step 3: Verify code
 * await verifyEmailCode('123456');
 *
 * // Step 4: Register
 * await register({ name: '홍길동', phone: '010-1234-5678' });
 * ```
 */
export function useGuardian(): UseGuardianReturn {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Email verification state
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // Guardian state
  const [isGuardian, setIsGuardian] = useState(false);
  const [guardianInfo, setGuardianInfo] = useState<GuardianInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send verification code to email
   */
  const sendCode = async (): Promise<boolean> => {
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return false;
    }

    if (!address) {
      setError("지갑을 먼저 연결해주세요.");
      return false;
    }

    if (!walletClient) {
      setError("지갑 클라이언트를 찾을 수 없습니다.");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate Web3Token for authentication
      const web3Token = await generateWeb3Token(
        walletClient,
        address.toLowerCase()
      );

      await sendVerificationCode(
        {
          email,
          walletAddress: address.toLowerCase(),
          purpose: "SIGNUP",
        },
        web3Token,
        address.toLowerCase()
      );

      setCodeSent(true);
      return true;
    } catch (err: any) {
      console.error("Send code error:", err);
      setError(
        err?.response?.data?.message || "인증 코드 발송에 실패했습니다."
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify email code
   */
  const verifyEmailCode = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      setError("인증 코드를 입력해주세요.");
      return false;
    }

    if (!address) {
      setError("지갑을 연결해주세요.");
      return false;
    }

    if (!walletClient) {
      setError("지갑 클라이언트를 찾을 수 없습니다.");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate Web3Token for authentication
      const web3Token = await generateWeb3Token(
        walletClient,
        address.toLowerCase()
      );

      const response = await verifyCode(
        {
          email,
          walletAddress: address?.toLowerCase(),
          code,
        },
        web3Token,
        address.toLowerCase()
      );

      if (response.success) {
        setCodeVerified(true);
        return true;
      } else {
        setError(response.error || "인증 코드가 일치하지 않습니다.");
        return false;
      }
    } catch (err: any) {
      console.error("Verify code error:", err);
      setError(
        err?.response?.data?.message || "인증 코드 확인에 실패했습니다."
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register as guardian on blockchain (Method 1)
   *
   * Step 1: Generate Web3Token
   * Step 2: Get transaction data from backend
   * Step 3: Frontend broadcasts transaction using eth_sendTransaction (MetaMask supported)
   * Step 4: Get transaction hash
   * Step 5: Send transaction hash to backend
   * Step 6: Backend waits for confirmation and processes
   */
  const register = async (
    data: Omit<RegisterGuardianRequest, "email" | "signedTx">
  ): Promise<boolean> => {
    if (!codeVerified) {
      setError("이메일 인증을 먼저 완료해주세요.");
      return false;
    }

    if (!address) {
      setError("지갑을 연결해주세요.");
      return false;
    }

    if (!walletClient) {
      setError("지갑 클라이언트를 찾을 수 없습니다.");
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("🔷 Step 1: Generating Web3Token...");

      // Step 1: Generate Web3Token for DID authentication
      const web3Token = await generateWeb3Token(
        walletClient,
        address.toLowerCase()
      );

      console.log("   Web3Token generated");

      console.log("🔷 Step 2: Getting transaction data from backend...");

      // Step 2: Call backend without signedTx to get transaction data
      const prepareResponse: any = await registerGuardian(
        {
          email,
          ...data,
          // No signedTx - backend will return transaction data
          walletAddress: address.toLowerCase(),
        } as any,
        web3Token
      );

      // Check if backend returned transaction data for signing
      if (prepareResponse.requiresSignature && prepareResponse.transactionData) {
        console.log("🔷 Step 3: Production mode - Signing/Broadcasting transaction...");

        const txData = prepareResponse.transactionData;
        console.log("   Transaction data:", {
          to: txData.to,
          dataLength: txData.data?.length,
          gasLimit: txData.gasLimit,
          gasPrice: txData.gasPrice,
          chainId: txData.chainId,
        });

        let signedTxOrHash: string;

        try {
          // Try to sign without broadcasting (only works with some wallets)
          console.log("   Attempting signTransaction...");
          signedTxOrHash = await walletClient.signTransaction({
            to: txData.to as `0x${string}`,
            data: txData.data as `0x${string}`,
            from: address,
            gas: BigInt(txData.gasLimit || 500000),
            gasPrice: BigInt(txData.gasPrice || 1000), // Minimum gas price (1000 wei)
            value: BigInt(txData.value || 0),
            nonce: txData.nonce ? Number(txData.nonce) : undefined,
            chainId: txData.chainId ? Number(txData.chainId) : 1337,
          });
          console.log("   Transaction signed (raw tx length):", signedTxOrHash.length);
        } catch (signError) {
          // Fallback for MetaMask - use sendTransaction instead
          console.log("   signTransaction not supported, using sendTransaction...");
          console.log("   Error was:", signError);

          try {
            signedTxOrHash = await walletClient.sendTransaction({
              to: txData.to as `0x${string}`,
              data: txData.data as `0x${string}`,
              from: address,
              gas: BigInt(txData.gasLimit || 500000),
              gasPrice: BigInt(txData.gasPrice || 1000), // Minimum gas price (1000 wei)
              value: BigInt(txData.value || 0),
            });
            console.log("   Transaction sent (hash):", signedTxOrHash);
          } catch (sendError: any) {
            console.error("   sendTransaction failed:", sendError);
            setError(
              `트랜잭션 전송 실패: ${sendError.message}\n\n` +
              `힌트: MetaMask 계정에 테스트 ETH가 필요할 수 있습니다.`
            );
            return false;
          }
        }

        console.log("🔷 Step 4: Sending signed transaction to backend...");

        // Step 4: Submit signed transaction or hash to backend
        const finalResponse = await registerGuardian(
          {
            email,
            ...data,
            walletAddress: address.toLowerCase(),
            signedTx: signedTxOrHash,
          } as any,
          web3Token
        );

        if (finalResponse.success) {
          console.log("✅ Guardian registered!");
          console.log("   TX Hash:", finalResponse.txHash);
          console.log("   Block:", finalResponse.blockNumber);

          setIsGuardian(true);
          await checkStatus();
          return true;
        } else {
          setError("Guardian 등록에 실패했습니다.");
          return false;
        }
      }

      // Backend processed the transaction (development mode - no signature required)
      const response = prepareResponse as RegisterGuardianResponse;

      if (response.success) {
        console.log("✅ Guardian registered!");
        console.log("   TX Hash:", response.txHash);
        console.log("   Block:", response.blockNumber);

        setIsGuardian(true);

        // Refresh guardian status
        await checkStatus();

        return true;
      } else {
        setError("Guardian 등록에 실패했습니다.");
        return false;
      }
    } catch (err: any) {
      console.error("❌ Guardian registration error:", err);

      // Handle specific errors
      if (err?.response?.data?.error) {
        const errorMsg = err.response.data.error;

        if (errorMsg.includes("이메일 인증이 필요합니다")) {
          setError("이메일 인증이 필요합니다. 먼저 인증을 완료해주세요.");
          setCodeVerified(false);
        } else if (errorMsg.includes("이미 블록체인에 등록된")) {
          setError("이미 Guardian으로 등록되어 있습니다.");
        } else {
          setError(errorMsg);
        }
      } else if (err?.message?.includes("User rejected")) {
        setError("트랜잭션 서명을 거부했습니다.");
      } else {
        setError(err?.message || "Guardian 등록에 실패했습니다.");
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check guardian registration status
   */
  const checkStatus = async (): Promise<void> => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      return;
    }

    try {
      const status = await checkGuardianStatus(accessToken);
      setIsGuardian(status.isRegistered);
      setGuardianInfo(status.guardianInfo ?? null);
    } catch (err) {
      console.error("Failed to check guardian status:", err);
    }
  };

  return {
    // Email verification state
    email,
    setEmail,
    codeSent,
    codeVerified,

    // Guardian state
    isGuardian,
    guardianInfo,
    isLoading,
    error,

    // Actions
    sendCode,
    verifyEmailCode,
    register,
    checkStatus,
  };
}
