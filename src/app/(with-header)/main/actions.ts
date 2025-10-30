"use server";

import { getHomeList } from "@/lib/api/home";
import type { HomeResult } from "@/lib/api/home";

/**
 * Server Action: 홈 페이지 데이터 로드
 * - 클라이언트에서 호출 가능한 Server Action
 * - 서버에서 API 호출 후 결과 반환
 */
export async function loadHomeData(): Promise<HomeResult> {
  try {
    const data = await getHomeList();
    return data;
  } catch (error) {
    console.error("Failed to load home data:", error);
    // 에러 발생 시 빈 데이터 반환
    return {
      latestAdoptions: [],
      closingSoonDonations: [],
      popularReviews: [],
      popularStories: [],
    };
  }
}
