// src/lib/api/adopt/detail.ts

import { getApiUrl } from "../config";

// ---- 서버 응답 타입(스웨거 기준) ----
export type ServerGender = "FEMALE" | "MALE";

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

export type ServerRegion =
  | "SEOUL"
  | "BUSAN"
  | "DAEGU"
  | "INCHEON"
  | "GWANGJU"
  | "DAEJEON"
  | "ULSAN"
  | "SEJONG"
  | "GYEONGGI"
  | "GANGWON"
  | "CHUNGBUK"
  | "CHUNGNAM"
  | "JEONBUK"
  | "JEONNAM"
  | "GYEONGBUK"
  | "GYEONGNAM"
  | "JEJU";

export type ServerAdoptionStatus = "ACTIVE" | "ADOPTING" | "ADOPTED";

export interface ServerAdoptionDetail {
  adoptId?: number; // 입양 공고 ID
  title: string;
  content: string | null;
  images: string;
  did: string;
  petProfile: string;
  petName: string;
  old: number;
  weight: number;
  color: string;
  specifics: string | null;
  gender: ServerGender;
  breed: ServerBreedCode;
  region: ServerRegion;
  district: string;
  shelterName: string;
  deadline: string;
  status: ServerAdoptionStatus;
  neutral: boolean;
  currentOwner?: string; // 입양 공고 작성자 지갑 주소
}

export interface GetAdoptionDetailResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerAdoptionDetail; // 단일 객체
}

// ---- 호출 함수 (그대로 리턴) ----
export async function getAdoptionDetail(adoptId: number) {
  if (adoptId == null || Number.isNaN(adoptId)) {
    throw new Error("getAdoptionDetail: 유효한 adoptId가 필요합니다.");
  }

  const res = await fetch(
    getApiUrl(`/api/adoption/detail/${encodeURIComponent(String(adoptId))}`),
    { method: "GET", next: { revalidate: 0 } }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getAdoptionDetail 실패 (${res.status}) ${text}`);
  }

  const data: GetAdoptionDetailResponse = await res.json();
  return data;
}
