// src/lib/api/member/profile.ts

export interface MemberProfile {
  walletAddress: string;
  profileImage: string;
  username: string;
  nickname: string;
  phoneNumber: string;
  createdAt: string;
}

export interface GetMemberProfileResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: MemberProfile;
}

/**
 * 마이페이지 프로필 조회
 */
export async function getMemberProfile(accessToken: string): Promise<GetMemberProfileResponse> {
  if (!accessToken) {
    throw new Error("getMemberProfile: accessToken이 필요합니다.");
  }

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/member/profile`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`마이페이지 프로필 조회 실패: ${res.status} ${text}`);
  }

  const data: GetMemberProfileResponse = await res.json();
  return data;
}
