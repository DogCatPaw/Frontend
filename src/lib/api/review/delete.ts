// src/lib/api/review/delete.ts

import { getApiUrl } from "../config";

export interface DeleteReviewResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: null;
}

// ---- 호출 함수 ----
export async function deleteReview(reviewId: number, accessToken: string): Promise<DeleteReviewResponse> {
  if (reviewId == null || Number.isNaN(reviewId)) {
    throw new Error("deleteReview: 유효한 reviewId가 필요합니다.");
  }

  if (!accessToken) {
    throw new Error("deleteReview: accessToken이 필요합니다.");
  }

  const res = await fetch(
    getApiUrl(`/api/story/review/${encodeURIComponent(String(reviewId))}`),
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`입양 후기 삭제 실패: ${res.status} ${text}`);
  }

  const data: DeleteReviewResponse = await res.json();
  return data;
}
