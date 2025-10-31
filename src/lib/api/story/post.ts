// src/lib/api/adopt/post.ts

import { getApiUrl } from "../config";

export interface ServerStoryPost {
  memberName: string;
  storyId: number;
  petId: number;
  title: string;
  images: string;
  content: string;
  did: string;
}

export interface PostStoryResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerStoryPost;
}

export interface PostStoryRequest {
  petId: number;
  title: string;
  content: string;
  images: string;
}

// ---- 호출 함수 ----
export async function postStory(
  body: PostStoryRequest,
  accessToken: string
): Promise<PostStoryResponse> {
  const res = await fetch(
    getApiUrl('/api/story/daily'),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`일상 일지 등록 실패: ${res.status} ${text}`);
  }

  const data: PostStoryResponse = await res.json();
  return data;
}
