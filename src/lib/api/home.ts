// src/lib/api/home.ts

import {
  BreedCode,
  AdoptionStatus,
  DonationStatus,
  RegionCode,
} from "@/types/enums";
import { getApiUrl } from "./config";

// ------------------------------------------
// 서버 응답 타입(스웨거 기준)
// ------------------------------------------

// ===================== Adoption =====================
export interface ServerAdoption {
  adoptId: number;
  thumbnail: string;
  title: string;
  breed: BreedCode;
  did: string;
  region: RegionCode;
  district: string;
  shelterName: string;
  status: AdoptionStatus;
  dday: string;
}

// ===================== Donation =====================
export interface ServerDonation {
  donationId: number;
  thumbnail: string; //사진
  title: string; // 제목
  currentAmount: number; // 현재 모금 금액
  targetAmount: number; // 목표 금액
  donationStatus: DonationStatus; // 후원 가능 상태
  patronCount: number; // 후원자 수
  progress: number; //
  dday: string;
}

// ===================== Review =====================
export interface ServerReview {
  reviewId: number;
  profileUrl: string;
  memberName: string;
  images: string;
  title: string;
  content: string;
  breed: BreedCode;
  petName: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

// ===================== Story =====================
export interface ServerStory {
  storyId: number;
  profileUrl: string;
  memberName: string;
  title: string;
  images: string;
  content: string;
  breed: BreedCode;
  petName: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

// ===================== 최종 응답 타입 =====================
export interface HomeResult {
  latestAdoptions: ServerAdoption[];
  closingSoonDonations: ServerDonation[];
  popularReviews: ServerReview[];
  popularStories: ServerStory[];
}
export interface GetResponse {
  isSuccess: boolean;
  status: string; // EX. "100 CONTINUE"
  code: string;
  message: string;
  result: HomeResult;
}

// ------------------------------------------
// 호출 함수(그대로 출력)
// ------------------------------------------
export async function getHomeList() {
  const res = await fetch(
    getApiUrl('/api/adoption/home'),
    {
      method: "GET",
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getHomeList 실패(home.ts) (${res.status}) ${text}`);
  }
  const data: GetResponse = await res.json();
  return data.result;
}
