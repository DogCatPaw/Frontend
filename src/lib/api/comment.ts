// ---- 서버 응답 타입(스웨거 기준) ----
// ================================ GET ================================
export interface ServerComment {
  nickName: string;
  storyId: number;
  commentId: number;
  savedComment: string;
  createdAt: string;
}

export interface GetCommentResponse {
  isSuccess: boolean;
  status: string; // Ex. "100 CONTINUE"
  code: string;
  message: string;
  result: {
    commentList: ServerComment[];
    nextCursor: number | null;
  };
}

// 쿼리 파라미터
export interface GetCommentParams {
  storyId: number;
  cursor?: number | null;
  size?: number; // 기본 5
}

// ================================ 호출 함수(GET) ================================
export async function getComment({
  storyId,
  cursor,
  size = 5,
}: GetCommentParams) {
  if (storyId == null) throw new Error("getComment: storyId는 필수입니다.");

  const q = new URLSearchParams();
  q.set("storyId", String(storyId));
  q.set("size", String(size));
  if (cursor != null) q.set("cursor", String(cursor));

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comment/?${q.toString()}`;

  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers: headers,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getComment 실패 (${res.status}) ${text}`);
  }

  const data: GetCommentResponse = await res.json();
  return data;
}

// ================================ POST ================================
export interface ServerPostComment {
  memberId: string;
  commentId: number;
  savedComment: string;
}

export interface PostCommentResponse {
  isSuccess: boolean;
  status: string; // Ex. "100 CONTINUE"
  code: string;
  message: string;
  result: ServerPostComment;
}

// 요청 바디
export interface PostCommentBody {
  storyId: number;
  comment: string;
}

// ================================ 호출 함수(POST) ================================
export async function postComment(body: PostCommentBody) {
  if (body?.storyId == null)
    throw new Error("postComment: storyId는 필수입니다.");
  if (!body?.comment?.trim())
    throw new Error("postComment: comment는 필수입니다.");

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/comment/`;

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
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`postComment 실패 (${res.status}) ${text}`);
  }

  const data: PostCommentResponse = await res.json();
  return data;
}
