// src/lib/api/donations/mine.ts

// ---- 서버 응답 타입 ----
export interface MyDonation {
  donationTitle: string;
  donationAmount: number; // KRW
  donationTime: string; // ISO 8601 날짜
}

export interface GetMyDonationsResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: {
    totalAmount: number; // 총 후원 금액 (KRW)
    currentBoneBalance: number; // 현재 뼈다귀 잔액 (KRW)
    donations: MyDonation[];
    cursor: number | null;
  };
}

// ---- 쿼리 파라미터 ----
export interface GetMyDonationsParams {
  cursor?: number;
  size?: number;
}

// ---- 호출 함수 ----
export async function getMyDonations(
  params: GetMyDonationsParams = {}
): Promise<GetMyDonationsResponse> {
  const { cursor, size = 10 } = params;

  const qs = new URLSearchParams();
  qs.set("size", String(size));
  if (cursor !== undefined && cursor !== null) qs.set("cursor", String(cursor));

  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/donations/mine?${qs.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: headers,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getMyDonations 실패 (${res.status}) ${text}`);
  }

  const data: GetMyDonationsResponse = await res.json();
  return data;
}
