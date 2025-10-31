// src/lib/api/story/delete.ts

import { getApiUrl } from "../config";

export interface DeleteStoryResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: null;
}

// ---- 호출 함수 ----
export async function deleteStory(storyId: number, accessToken: string): Promise<DeleteStoryResponse> {
  if (storyId == null || Number.isNaN(storyId)) {
    throw new Error("deleteStory: 유효한 storyId가 필요합니다.");
  }

  if (!accessToken) {
    throw new Error("deleteStory: accessToken이 필요합니다.");
  }

  const res = await fetch(
    getApiUrl(`/api/story/daily/${encodeURIComponent(String(storyId))}`),
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
    throw new Error(`일상 일지 삭제 실패: ${res.status} ${text}`);
  }

  const data: DeleteStoryResponse = await res.json();
  return data;
}
