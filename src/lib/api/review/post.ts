// src/lib/api/review/post.ts

import { getApiUrl } from "../config";

export interface PostReviewRequest {
  petId: number;
  title: string;
  content: string;
  adoptionAgency: string;
  adoptionDate: string;
  images: string;
}

export interface ServerReviewPost {
  memberName: string;
  storyId: number;
  petId: number;
}

export interface PostReviewResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerReviewPost;
}

/**
 * 입양 후기 등록
 * @param walletAddress - 필수 쿼리 파라미터 (?walletAddress=...)
 * @param body - 스웨거 Request body
 */
export async function postReview(
  walletAddress: string,
  body: PostReviewRequest
): Promise<PostReviewResponse> {
  if (!walletAddress) {
    throw new Error("walletAddress가 없습니다.");
  }

  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = getApiUrl(`/api/story/review?walletAddress=${encodeURIComponent(walletAddress)}`);

  console.log("📤 [Review API] Creating review with token:", accessToken ? "✓" : "✗");
  console.log("📤 [Review API] URL:", url);
  console.log("📤 [Review API] Body:", body);

  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });

  console.log("📦 [Review API] Response status:", res.status);

  // 실패 시 서버 메시지를 최대한 뽑아보기
  if (!res.ok) {
    let detail = "";
    try {
      const errJson = await res.json();
      detail = errJson?.message || JSON.stringify(errJson);
    } catch {
      detail = await res.text();
    }
    throw new Error(`입양 후기 등록 실패 (${res.status}): ${detail}`);
  }

  const data: PostReviewResponse = await res.json();
  return data;
}
