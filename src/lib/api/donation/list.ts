// src/lib/api/donation/list.ts

import { getApiUrl } from "../config";

// ---- 서버 응답 타입(스웨거 기준) ----
export type ServerDonationStatus = "ACTIVE" | "ACHIEVED" | "CLOSED";

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

export interface ServerDonation {
  donationId: number;
  thumbnail: string; //사진
  title: string; // 제목
  currentAmount: number; // 현재 모금 금액
  targetAmount: number; // 목표 금액
  donationStatus: ServerDonationStatus; // 후원 가능 상태
  patronCount: number; // 후원자 수
  progress: number; //
  dday: string;
}

export interface GetDonationListResponse {
  isSuccess: boolean;
  status: string; // EX. "100 CONTINUE"
  code: string;
  message: string;
  result: {
    donations: ServerDonation[];
    nextCursor: number | null;
  };
}

// ---- 쿼리 파라미터 ----
export interface GetDonationListParams {
  cursor?: number; // 스웨거: cursor
  size?: number; // 기본 9
  breed?: ServerBreedCode | "";
  status?: ServerDonationStatus | "";
  keyword?: string | "";
}

// ---- 호출 함수 (그대로 리턴) ----
export async function getDonationList(params: GetDonationListParams = {}) {
  const { size = 9, cursor, breed, status, keyword } = params;

  const qs = new URLSearchParams();
  qs.set("size", String(size));
  if (cursor !== undefined && cursor !== null) qs.set("cursor", String(cursor));
  if (breed) qs.set("breed", breed);
  if (status) qs.set("status", status);
  if (keyword) qs.set("keyword", keyword);

  const res = await fetch(
    getApiUrl(`/api/donation/list?${qs.toString()}`),
    { method: "GET", next: { revalidate: 0 } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getDonationList 실패 (${res.status}) ${text}`);
  }
  const data: GetDonationListResponse = await res.json();
  return data;
}
