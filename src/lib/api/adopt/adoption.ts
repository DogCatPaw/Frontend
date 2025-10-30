// src/lib/api/adopt/adoption.ts

import {
  BreedCode,
  AdoptionStatus,
  RegionCode,
  REGION_LABEL,
  DISTRICTS,
} from "@/types/enums";

// ---- 서버 응답 타입(스웨거 기준) ----
export interface ServerAdoption {
  adoptId: number;
  thumbnail: string;
  title: string;
  breed: BreedCode;
  did: string;
  old?: number; // 나이
  color?: string; // 털색깔
  region: RegionCode;
  district: string;
  shelterName: string;
  status: AdoptionStatus;
  dday: string;
}

// Re-export for convenience
export { REGION_LABEL, DISTRICTS };

export interface GetAdoptionListResponse {
  isSuccess: boolean;
  status: string; // EX. "100 CONTINUE"
  code: string;
  message: string;
  result: {
    adoptions: ServerAdoption[];
    nextCursor: number | null;
  };
}

// ---- 쿼리 파라미터 ----
export interface GetAdoptionListParams {
  cursor?: number; // 스웨거: cursor
  size?: number; // 기본 9
  breed?: BreedCode | "";
  status?: AdoptionStatus | "";
  region?: RegionCode | "";
  district?: string | "";
  keyword?: string | "";
}

// ---- 호출 함수 (그대로 리턴) ----
export async function getAdoptionList(params: GetAdoptionListParams = {}) {
  const { size = 9, cursor, breed, status, region, district, keyword } = params;

  const q = new URLSearchParams();
  q.set("size", String(size));
  if (cursor !== undefined && cursor !== null) q.set("cursor", String(cursor));
  if (breed) q.set("breed", String(breed));
  if (status) q.set("status", String(status));
  if (region) q.set("region", String(region));
  if (district) q.set("district", String(district));
  if (keyword) q.set("keyword", String(keyword));

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/adoption?${q.toString()}`,
    { method: "GET", next: { revalidate: 0 } }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getAdoptionList 실패 (${res.status}) ${text}`);
  }

  const data: GetAdoptionListResponse = await res.json();
  return data;
}
