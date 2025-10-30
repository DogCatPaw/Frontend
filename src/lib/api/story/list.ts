// src/lib/api/story/list.ts

// ---- 서버 응답 타입(스웨거 기준) ----
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

export interface GetStoryListResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: { stories: ServerStory[]; nextCursor: number | null };
}

// 쿼리 파라미터
export interface GetStoryListParams {
  keyword?: string;
  cursorId?: number; // 스웨거: cursor
  size?: number; // 기본 9
  walletAddress?: string; // 내 글만 조회
}

// 호출 함수 (그대로 리턴)
export async function getStoryList(params: GetStoryListParams = {}, accessToken?: string) {
  const { size = 9, cursorId, keyword, walletAddress } = params;

  const q = new URLSearchParams();
  q.set("size", String(size));
  if (cursorId !== undefined && cursorId !== null)
    q.set("cursorId", String(cursorId));
  if (keyword !== undefined && keyword !== null)
    q.set("keyword", String(keyword));
  if (walletAddress !== undefined && walletAddress !== null)
    q.set("walletAddress", String(walletAddress));

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_BASE_URL
    }/api/story/daily/stories?${q.toString()}`,
    {
      method: "GET",
      headers,
      next: { revalidate: 0 }
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getStoryList 실패 (${res.status}) ${text}`);
  }

  const data: GetStoryListResponse = await res.json();
  return data;
}
