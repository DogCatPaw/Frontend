// src/lib/api/chat.ts

export interface CreateChatRoomRequest {
  adoptId: number;
  roomName: string;
}

export interface CreateChatRoomResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: {
    roomId: string;
    adoptId: number;
    initiatorId: string;
    targetId: string;
    roomName: string;
    createdAt: string;
  };
}

export interface ChatRoomInfo {
  roomId: string;
  roomName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  adoptId?: number; // ⭐ 입양 공고 ID
  participants?: Array<{
    userId: string;
    nickname: string;
  }>; // ⭐ Optional: 백엔드가 항상 반환하지 않을 수 있음
}

export interface GetChatRoomInfoResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ChatRoomInfo;
}

export async function createChatRoom(
  request: CreateChatRoomRequest,
  accessToken: string
): Promise<CreateChatRoomResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/room/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`채팅방 생성 실패 (${res.status}): ${errorText}`);
  }

  const data: CreateChatRoomResponse = await res.json();
  return data;
}

export async function getChatRoomInfo(
  roomId: string,
  accessToken: string
): Promise<GetChatRoomInfoResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/room/card?roomId=${encodeURIComponent(roomId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`채팅방 정보 조회 실패 (${res.status}): ${errorText}`);
  }

  const data: GetChatRoomInfoResponse = await res.json();
  return data;
}

// 채팅방 목록 조회
export interface ChatRoomListItem {
  roomId: number;
  roomName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  adoptId: number;
  participants?: Array<{
    userId: string;
    nickname: string;
  }>; // ⭐ Optional: 백엔드가 항상 반환하지 않을 수 있음
}

export interface GetChatRoomListResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ChatRoomListItem[];
}

export async function getChatRoomList(
  accessToken: string
): Promise<GetChatRoomListResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/room/list`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`채팅방 목록 조회 실패 (${res.status}): ${errorText}`);
  }

  const data: GetChatRoomListResponse = await res.json();
  return data;
}

// 채팅방의 입양 공고 정보 조회
export interface AdoptionInfoForChat {
  petId: number;
  adoptId: number;
  did: string;
  writerWallet: string; // ⭐ 펫 소유자 (작성자) 지갑 주소
  adopterWallet: string; // ⭐ 입양자 지갑 주소 (백엔드 추가됨!)
  petProfile: string;
  petName: string;
  old: number;
  status: "ACTIVE" | "ADOPTING" | "ADOPTED";
  gender: "FEMALE" | "MALE";
  breed: string;
  // Optional fields for transfer
  weight?: number;
  color?: string;
  feature?: string;
  neutral?: boolean;
  specifics?: string;
}

export interface GetAdoptionInfoForChatResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: AdoptionInfoForChat;
}

export async function getAdoptionInfoForChat(
  roomId: string,
  accessToken: string
): Promise<GetAdoptionInfoForChatResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat/room/${encodeURIComponent(roomId)}/adoption`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`입양 공고 정보 조회 실패 (${res.status}): ${errorText}`);
  }

  const data: GetAdoptionInfoForChatResponse = await res.json();
  return data;
}
