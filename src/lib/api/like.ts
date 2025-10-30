// ---- 서버 응답 타입(스웨거 기준) ----

export interface ServerLike {
  storyId: number;
  memberId?: string;
  totalLikes: number;
  liked: boolean;
}

export interface PostLikeResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerLike;
}

export async function postLike(storyId: number) {
  if (storyId == null) throw new Error("postLike: storyId는 필수입니다.");

  // storyId를 쿼리 파라미터로 전달
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/like?storyId=${storyId}`;

  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    // body 제거 - storyId는 쿼리 파라미터로 전달
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`postLike 실패 (${res.status}) ${text}`);
  }

  const data: PostLikeResponse = await res.json();
  return data;
}
