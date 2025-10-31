// src/lib/api/review/detail.ts

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

export interface ServerReviewDetail {
  profileUrl: string;
  memberName: string;
  petId: number;
  title: string;
  images: string;
  content: string;
  breed: ServerBreedCode;
  petName: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  adoptionAgency: string;
  adoptionDate: string;
  createdAt: string;
  did: string;
}

export interface GetReviewDetailResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerReviewDetail; // 단일 객체
}

// ---- 호출 함수 (그대로 리턴) ----
export async function getReviewDetail(reviewId: number, accessToken?: string) {
  if (reviewId == null || Number.isNaN(reviewId)) {
    throw new Error("getReviewDetail: 유효한 reviewId가 필요합니다.");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = getApiUrl(`/api/story/review/${encodeURIComponent(String(reviewId))}`);

  console.log("📤 [Review API] Fetching review detail:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: headers,
    next: { revalidate: 0 },
  });

  console.log("📦 [Review API] Detail response status:", res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ [Review API] Detail error:", text);
    throw new Error(`getReviewDetail 실패 (${res.status}) ${text}`);
  }

  const data: GetReviewDetailResponse = await res.json();
  return data;
}
