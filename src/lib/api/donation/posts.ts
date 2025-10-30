// src/lib/api/donation/posts.ts

export type ServerDonationCategory = "MEDICAL" | "FOOD" | "SHELTER" | "OTHER";

export interface ServerDonationPost {
  petId: number;
  title: string;
  content: string;
  category: ServerDonationCategory;
  targetAmount: number;
  deadline: string; // YYYY-MM-DD
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  images: string; // 쉼표로 구분된 이미지 키들
}

export interface PostDonationResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: {
    donationId: number;
  };
}

/**
 * 후원 공고 등록 API
 * @param body - 등록할 후원 공고 정보
 * @param accessToken - JWT 액세스 토큰
 */
export async function postDonation(
  body: ServerDonationPost,
  accessToken: string
): Promise<PostDonationResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donation/posts`,
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
    console.error("❌ [postDonation] Error response:", {
      status: res.status,
      statusText: res.statusText,
      body: errorText,
    });
    throw new Error(`후원 공고 등록 실패 (${res.status}): ${errorText || res.statusText}`);
  }

  const data: PostDonationResponse = await res.json();
  console.log("✅ [postDonation] Success:", data);
  return data;
}
