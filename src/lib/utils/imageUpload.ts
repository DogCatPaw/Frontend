import axios from "axios";
import { generateWeb3Token } from "./web3Token";
import type { WalletClient } from "viem";
import { getApiUrl } from "../api/config";

/**
 * Web3Token을 사용하여 이미지를 S3에 업로드
 *
 * @param file - 업로드할 이미지 파일
 * @param walletClient - Wallet client (for Web3Token generation)
 * @param walletAddress - Wallet address (lowercase)
 * @returns fileKey - S3에 저장된 파일 키 (예: "temp/uuid.jpg")
 */
export async function uploadImageWithWeb3Token(
  file: File,
  walletClient: WalletClient,
  walletAddress: string
): Promise<string> {
  console.log("📤 Uploading image:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Step 1: Generate Web3Token for authentication
  const web3Token = await generateWeb3Token(walletClient, walletAddress.toLowerCase());

  // Step 2: Get presigned URL from backend
  const response = await axios.post(
    getApiUrl('/api/common'),
    {},
    {
      headers: {
        Authorization: web3Token,
        walletaddress: walletAddress.toLowerCase(),
        "Content-Type": "application/json",
      },
    }
  );

  console.log("✅ Presigned URL received:", response.data);

  const presignedUrl = response.data.url;
  if (!presignedUrl) {
    throw new Error("Presigned URL이 응답에 없습니다.");
  }

  // Step 3: Extract fileKey from presigned URL
  // URL format: https://bucket.s3.region.amazonaws.com/temp/uuid.jpg?...
  const urlObj = new URL(presignedUrl);
  const fileKey = urlObj.pathname.substring(1); // Remove leading '/'
  console.log("📝 Extracted fileKey:", fileKey);

  // Step 4: Upload to S3 using presigned URL
  console.log("⬆️ Uploading to S3...");
  try {
    await axios.put(presignedUrl, file, {
      headers: {
        // Don't set Content-Type, let browser set it
      },
    });

    console.log("✅ Image uploaded successfully, fileKey:", fileKey);
    return fileKey;
  } catch (uploadError: any) {
    console.error("S3 Upload error:", {
      message: uploadError.message,
      status: uploadError?.response?.status,
      data: uploadError?.response?.data,
    });

    // Check if it's a CORS error
    if (!uploadError.response && uploadError.message.includes("Network Error")) {
      throw new Error(
        "CORS 오류: Object Storage 버킷의 CORS 설정을 확인하세요.\n" +
        "백엔드 관리자에게 버킷 CORS 설정을 요청하세요."
      );
    }

    throw uploadError;
  }
}

/**
 * JWT를 사용하여 이미지를 S3에 업로드
 *
 * @param file - 업로드할 이미지 파일
 * @param accessToken - JWT access token
 * @returns fileKey - S3에 저장된 파일 키
 */
export async function uploadImageWithJWT(
  file: File,
  accessToken: string
): Promise<string> {
  console.log("📤 Uploading image with JWT:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Step 1: Get presigned URL from backend
  const response = await axios.post(
    getApiUrl('/api/common'),
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const presignedUrl = response.data.url;
  if (!presignedUrl) {
    throw new Error("Presigned URL이 응답에 없습니다.");
  }

  // Step 2: Extract fileKey
  const urlObj = new URL(presignedUrl);
  const fileKey = urlObj.pathname.substring(1);

  // Step 3: Upload to S3
  await axios.put(presignedUrl, file);

  console.log("✅ Image uploaded successfully, fileKey:", fileKey);
  return fileKey;
}
