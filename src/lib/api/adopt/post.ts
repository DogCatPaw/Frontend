// src/lib/api/adopt/post.ts

export type ServerRegion =
  | "SEOUL"
  | "BUSAN"
  | "DAEGU"
  | "INCHEON"
  | "GWANGJU"
  | "DAEJEON"
  | "ULSAN"
  | "SEJONG"
  | "GYEONGGI"
  | "GANGWON"
  | "CHUNGBUK"
  | "CHUNGNAM"
  | "JEONBUK"
  | "JEONNAM"
  | "GYEONGBUK"
  | "GYEONGNAM"
  | "JEJU";

export type ServerAdoptionStatus = "ACTIVE" | "ADOPTING" | "ADOPTED";

export interface ServerAdoptionPost {
  petId: number;
  title: string;
  content: string;
  region: ServerRegion;
  district: string;
  shelterName: string;
  contact: string;
  deadLine: string; // YYYY-MM-DD
  status: ServerAdoptionStatus;
  images: string;
}

export interface PostAdoptionResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerAdoptionPost;
}

// ---- 호출 함수 (그대로 리턴) ----
// @param body - 등록할 입양 공고 정보
// @param accessToken - JWT 액세스 토큰
export async function postAdoption(
  body: ServerAdoptionPost,
  accessToken: string
): Promise<PostAdoptionResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/adoption/post`,
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
    const errorText = await res.text().catch(() => "");
    console.error("❌ [postAdoption] Error response:", {
      status: res.status,
      statusText: res.statusText,
      body: errorText,
    });
    throw new Error(`입양 공고 등록 실패 (${res.status}): ${errorText || res.statusText}`);
  }

  const data: PostAdoptionResponse = await res.json();
  console.log("✅ [postAdoption] Success:", data);
  return data;
}
