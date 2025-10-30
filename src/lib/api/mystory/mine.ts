// src/lib/api/review/list.ts

// ---- 서버 응답 타입(스웨거 기준) ----
export type ServerTypeCode =
  | "DAILY"
  | "REVIEW"
  | "ADOPTION"
  | "DONATION"

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

export interface ServerStory {
  storyId: number;
  profileUrl: string;
  memberName: string;
  title: string;
  images: string;
  content: string;
  breed: ServerBreedCode;
  petName: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

export interface GetMyStoryResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: { stories: ServerStory[]; nextCursor: number | null };
}

// 쿼리 파라미터
export interface GetMyStoryParams {
  cursor?: number; // 스웨거: cursor
  size?: number; // 기본 9
  type?: ServerTypeCode
}

// 호출 함수 (그대로 리턴)
export async function getMystory(params: GetMyStoryParams = {}) {
  const { size = 9, cursor, type } = params;

  const q = new URLSearchParams();
  q.set("size", String(size));
  if (cursor !== undefined && cursor !== null)
    q.set("cursor", String(cursor));
  if (type !== undefined && type !== null)
    q.set("type", String(type));

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/member/stories?${q.toString()}`;

  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  console.log("📤 [Review API] Fetching myStory with token:", accessToken ? "✓" : "✗");

  const res = await fetch(url, {
    method: "GET",
    headers: headers,
    next: { revalidate: 0 },
  });

  console.log("📦 [Review API] List response status:", res.status);
  console.log("📦 [Review API] Request URL:", url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ [MyStory API] List error:", text);
    throw new Error(`getMyStory 실패 (${res.status}) ${text}`);
  }

  const data: GetMyStoryResponse = await res.json();
  console.log("📦 [Review API] Response data:", {
    isSuccess: data.isSuccess,
    reviewCount: data.result?.stories?.length || 0,
    nextCursor: data.result?.nextCursor,
    sampleReview: data.result?.stories?.[0] || null
  });

  return data;
}
