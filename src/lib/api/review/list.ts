// src/lib/api/review/list.ts

import { getApiUrl } from "../config";

// ---- 서버 응답 타입(스웨거 기준) ----
export type ServerBreedCode =
  | "MALTESE"
  | "POODLE"
  | "POMERANIAN"
  | "CHIHUAHUA"
  | "SHIH_TZU"
  | "YORKSHIRE_TERRIER"
  | "PUG"
  | "MINIATURE_SCHNAUZER"
  | "CAVALIER_KING_CHARLES_SPANIEL"
  | "BICHON_FRISE"
  | "FRENCH_BULLDOG"
  | "DACHSHUND"
  | "BEAGLE"
  | "CORGI"
  | "GOLDEN_RETRIEVER"
  | "LABRADOR_RETRIEVER"
  | "GERMAN_SHEPHERD"
  | "SIBERIAN_HUSKY"
  | "SHIBA_INU"
  | "MIXED"
  | "OTHERS";

export interface ServerReview {
  reviewId: number;
  profileUrl: string;
  memberName: string;
  title: string;
  images: string;
  content: string;
  breed: ServerBreedCode;
  petName: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

export interface GetReviewListResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: { reviews: ServerReview[]; nextCursor: number | null };
}

// 쿼리 파라미터
export interface GetReviewListParams {
  keyword?: string;
  cursorId?: number; // 스웨거: cursor
  size?: number; // 기본 9
  walletAddress?: string; // 지갑 주소 (필수)
}

// 호출 함수 (그대로 리턴)
export async function getReviewList(params: GetReviewListParams = {}) {
  const { size = 9, cursorId, keyword, walletAddress } = params;

  const q = new URLSearchParams();
  q.set("size", String(size));
  if (cursorId !== undefined && cursorId !== null)
    q.set("cursorId", String(cursorId));
  if (keyword !== undefined && keyword !== null)
    q.set("keyword", String(keyword));
  if (walletAddress)
    q.set("walletAddress", walletAddress);

  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = getApiUrl(`/api/story/review/reviews?${q.toString()}`);

  console.log("📤 [Review API] Fetching reviews with token:", accessToken ? "✓" : "✗");

  const res = await fetch(url, {
    method: "GET",
    headers: headers,
    next: { revalidate: 0 },
  });

  console.log("📦 [Review API] List response status:", res.status);
  console.log("📦 [Review API] Request URL:", url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ [Review API] List error:", text);
    throw new Error(`getReviewList 실패 (${res.status}) ${text}`);
  }

  const data: GetReviewListResponse = await res.json();
  console.log("📦 [Review API] Response data:", {
    isSuccess: data.isSuccess,
    reviewCount: data.result?.reviews?.length || 0,
    nextCursor: data.result?.nextCursor,
    sampleReview: data.result?.reviews?.[0] || null
  });

  return data;
}
