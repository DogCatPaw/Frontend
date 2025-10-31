// src/lib/api/story/detail.ts

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

export interface ServerStoryDetail {
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
  createdAt: string; //"2025-10-24T10:55:16.517Z"
  did: string;
}

export interface GetStoryDetailResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerStoryDetail;
}

// ---- 호출 함수 ----
export async function getStoryDetail(storyId: number, accessToken?: string) {
  if (storyId == null || Number.isNaN(storyId)) {
    throw new Error("getStoryDetail: 유효한 storyId가 필요합니다.");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(
    getApiUrl(`/api/story/daily/${encodeURIComponent(String(storyId))}`),
    {
      method: "GET",
      headers,
      next: { revalidate: 0 }
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getStoryDetail 실패 (${res.status}) ${text}`);
  }

  const data: GetStoryDetailResponse = await res.json();
  return data;
}
