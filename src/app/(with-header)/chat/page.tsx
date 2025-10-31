"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useWalletClient } from "wagmi";
import { io, Socket } from "socket.io-client";
import { ethers } from "ethers";
import styles from "./page.module.css";
import { getAccessToken } from "@/lib/api/auth";
import {
  getChatRoomList,
  getChatRoomInfo,
  getAdoptionInfoForChat,
  type ChatRoomListItem,
  type ChatRoomInfo,
  type AdoptionInfoForChat,
} from "@/lib/api/chat";
import {
  initTransfer,
  prepareTransfer,
  type PrepareTransferRequest,
} from "@/lib/api/adopt/transfer";
import { API_BASE_URL } from "@/lib/api/config";

// NestJS ChatMessageDto 타입 (실제 WebSocket 응답)
interface ChatMessage {
  messageId: number;
  roomId: number;
  senderId: string;
  senderName?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const PET_DID_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_PET_DID_REGISTRY || "0x22BbF60B7B2f0dbB0B815c84E3C238a4566120c3";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // 채팅방 목록
  const [chatRooms, setChatRooms] = useState<ChatRoomListItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // 선택된 채팅방
  const [roomInfo, setRoomInfo] = useState<ChatRoomInfo | null>(null);
  const [adoptionInfo, setAdoptionInfo] = useState<AdoptionInfoForChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initiatingTransfer, setInitiatingTransfer] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 사용자 ID (소문자 지갑 주소)
  const currentUserId = address?.toLowerCase() || "";

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 초기화: 로그인 확인 및 채팅방 목록 로드
  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    loadChatRoomList(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // roomId 변경 시: 선택된 채팅방 로드
  useEffect(() => {
    if (!roomId) {
      // roomId 없으면 WebSocket 연결 해제
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setMessages([]);
      setRoomInfo(null);
      setAdoptionInfo(null);
      setIsConnected(false);
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) return;

    // 선택된 채팅방 로드
    loadSelectedRoom(roomId, accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // 채팅방 목록 로드
  const loadChatRoomList = async (accessToken: string) => {
    try {
      setLoadingRooms(true);
      console.log("📥 채팅방 목록 로드 중...");
      const response = await getChatRoomList(accessToken);
      setChatRooms(response.result || []);
      console.log(`✅ ${response.result?.length || 0}개의 채팅방 로드 완료`);
    } catch (err: any) {
      console.error("❌ 채팅방 목록 로드 실패:", err);
      // 에러가 있어도 빈 배열로 처리
      setChatRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  // 선택된 채팅방 로드
  const loadSelectedRoom = async (roomId: string, accessToken: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1. 채팅방 정보 로드
      console.log("📥 채팅방 정보 로드 중...", roomId);
      const response = await getChatRoomInfo(roomId, accessToken);

      console.log("✅ 채팅방 정보 로드 완료:", response.result);
      console.log("   - roomName:", response.result?.roomName);
      console.log("   - participants:", response.result?.participants);

      // participants가 없으면 빈 배열로 설정
      if (response.result && !response.result.participants) {
        console.warn("⚠️ participants 필드가 없습니다. 빈 배열로 설정합니다.");
        response.result.participants = [];
      }

      setRoomInfo(response.result);

      // 2. 입양 공고 정보 로드 (있는 경우)
      try {
        const adoptionResponse = await getAdoptionInfoForChat(roomId, accessToken);
        if (adoptionResponse.result) {
          setAdoptionInfo(adoptionResponse.result);
          console.log("✅ 입양 공고 정보 로드 완료:", adoptionResponse.result);
        }
      } catch (err: any) {
        console.log("ℹ️ 입양 공고 정보 없음 (일반 채팅방일 수 있음)");
        setAdoptionInfo(null);
      }

      // 3. WebSocket 연결 및 방 참가
      connectWebSocket(roomId, accessToken);
    } catch (err: any) {
      console.error("❌ 채팅방 로드 실패:", err);
      setError(err.message || "채팅방을 불러올 수 없습니다.");
      setLoading(false);
    }
  };

  // WebSocket 연결 및 방 참가
  const connectWebSocket = (roomId: string, accessToken: string) => {
    // 기존 연결이 있으면 해제
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Socket.IO connection: server uses namespace '/chat'
    // Socket.IO automatically connects to /socket.io/ path
    console.log("🔌 WebSocket 연결 중...", `${API_BASE_URL}/chat`);

    const socket = io(`${API_BASE_URL}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // 연결 성공
    socket.on("connect", () => {
      console.log("✅ WebSocket 연결 성공");
      setIsConnected(true);

      // 방 참가: 메시지 히스토리 + 읽음 처리 + 실시간 구독
      console.log("🚪 채팅방 참가 중...", roomId);
      socket.emit("joinRoom", { roomId: Number(roomId) }, (response: any) => {
        console.log("📜 방 참가 응답:", response);

        if (response?.success) {
          // 메시지 히스토리 설정 (이미 읽음 처리됨)
          if (response.messages && Array.isArray(response.messages)) {
            setMessages(response.messages);
            console.log(`✅ ${response.messages.length}개의 메시지 로드 완료 (읽음 처리됨)`);
          }
        } else {
          console.error("❌ 방 참가 실패:", response?.error);
          setError(response?.error || "채팅방에 참가할 수 없습니다.");
        }

        setLoading(false);
      });
    });

    // 연결 실패
    socket.on("connect_error", (err) => {
      console.error("❌ WebSocket 연결 실패:", err);
      setError("채팅 서버에 연결할 수 없습니다.");
      setIsConnected(false);
      setLoading(false);
    });

    // 연결 해제
    socket.on("disconnect", () => {
      console.log("🔌 WebSocket 연결 해제됨");
      setIsConnected(false);
    });

    // 새 메시지 수신 (실시간 브로드캐스트)
    socket.on("message", (message: ChatMessage) => {
      console.log("💬 새 메시지 수신:", message);
      setMessages((prev) => [...prev, message]);

      // 채팅방 목록 새로고침 (최신 메시지 업데이트)
      const token = getAccessToken();
      if (token) {
        loadChatRoomList(token);
      }
    });

    // 이전 프로세스 시작 알림
    socket.on("transferInitiated", (data: any) => {
      console.log("🔔 이전 프로세스 시작 알림:", data);

      // adoptionInfo에서 펫 이름 가져오기
      const petName = adoptionInfo?.petName || '펫';
      const message = `${petName}의 입양 이전이 승인되었습니다! 비문 검증을 진행해주세요.`;

      alert(message);

      // 입양 정보 새로고침
      if (roomId) {
        const token = getAccessToken();
        if (token) {
          getAdoptionInfoForChat(roomId, token)
            .then((response) => {
              if (response.result) {
                setAdoptionInfo(response.result);
              }
            })
            .catch((err) => console.error("입양 정보 새로고침 실패:", err));
        }
      }
    });

    // 이전 상태 업데이트 알림
    socket.on("transferUpdated", (data: any) => {
      console.log("🔔 이전 상태 업데이트:", data);

      // adoptionInfo에서 펫 이름 가져오기
      const petName = adoptionInfo?.petName || '펫';
      let message = "";

      switch (data.status) {
        case "SIGNED":
          message = `${petName}: 서명이 완료되었습니다.`;
          break;
        case "VERIFIED":
          message = `${petName}: 비문 검증이 완료되었습니다. (일치도: ${data.similarity}%)`;
          break;
        case "COMPLETED":
          message = `${petName}의 입양이 완료되었습니다! 🎉`;
          break;
      }

      if (message) {
        alert(message);
      }

      // 입양 정보 새로고침
      if (roomId) {
        const token = getAccessToken();
        if (token) {
          getAdoptionInfoForChat(roomId, token)
            .then((response) => {
              if (response.result) {
                setAdoptionInfo(response.result);
              }
            })
            .catch((err) => console.error("입양 정보 새로고침 실패:", err));
        }
      }
    });

    // 이전 취소 알림
    socket.on("transferCancelled", (data: any) => {
      console.log("🔔 이전 취소 알림:", data);

      // adoptionInfo에서 펫 이름 가져오기
      const petName = adoptionInfo?.petName || '펫';
      const message = `${petName}의 입양 이전이 취소되었습니다.`;

      alert(message);

      // 입양 정보 새로고침
      if (roomId) {
        const token = getAccessToken();
        if (token) {
          getAdoptionInfoForChat(roomId, token)
            .then((response) => {
              if (response.result) {
                setAdoptionInfo(response.result);
              }
            })
            .catch((err) => console.error("입양 정보 새로고침 실패:", err));
        }
      }
    });
  };

  // 메시지 전송
  const handleSendMessage = () => {
    if (!input.trim() || !socketRef.current || !isConnected || !roomId) return;

    const messageData = {
      roomId: Number(roomId),
      message: input.trim(),
    };

    console.log("📤 메시지 전송:", messageData);

    socketRef.current.emit("sendMessage", messageData, (response: any) => {
      console.log("📨 메시지 전송 응답:", response);
      if (response?.success) {
        setInput("");
      } else {
        alert("메시지 전송에 실패했습니다.");
      }
    });
  };

  // 엔터키로 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 입양 승인 및 이전 시작 (소유자만 가능)
  const handleInitiateTransfer = async () => {
    if (!adoptionInfo || !roomId) {
      alert("입양 정보를 불러올 수 없습니다.");
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!address) {
      alert("지갑을 연결해주세요.");
      return;
    }

    setInitiatingTransfer(true);

    try {
      console.log("🔄 입양 이전 프로세스 시작...");

      // 입양자 주소 확인
      if (!adoptionInfo.adopterWallet) {
        alert("입양자 정보를 찾을 수 없습니다. 채팅방을 새로고침해주세요.");
        return;
      }

      console.log("👤 소유자 (현재 사용자):", address.toLowerCase());
      console.log("👤 입양자 (새 보호자):", adoptionInfo.adopterWallet.toLowerCase());

      // Step 1: prepareTransfer 호출하여 서명 데이터 생성
      const prepareRequest: PrepareTransferRequest = {
        newGuardianAddress: adoptionInfo.adopterWallet.toLowerCase(), // ✅ 입양자 주소!
        petData: {
          petName: adoptionInfo.petName,
          breed: adoptionInfo.breed,
          old: adoptionInfo.old,
          gender: adoptionInfo.gender,
          weight: adoptionInfo.weight || 0,
          color: adoptionInfo.color || "알 수 없음",
          feature: adoptionInfo.feature || "알 수 없음",
          neutral: adoptionInfo.neutral ?? false,
          specifics: adoptionInfo.specifics || "dog",
        },
      };

      console.log("  - petDID:", adoptionInfo.did);
      console.log("  - newGuardianAddress:", adoptionInfo.adopterWallet.toLowerCase());

      const prepareData = await prepareTransfer(
        adoptionInfo.did,
        prepareRequest,
        accessToken
      );

      console.log("✅ prepareTransfer 성공:", prepareData);

      // Step 2: 소유자가 changeController 트랜잭션 서명
      console.log("🔐 소유자가 changeController 트랜잭션 서명 중...");

      if (!walletClient) {
        alert("지갑 클라이언트를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      // Get provider for nonce
      const rpcUrl = process.env.NEXT_PUBLIC_BESU_RPC_URL || "http://ing-besunetwork-besurpci-c2714-112438542-11db0fa2d284.kr.lb.naverncp.com";
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // ⭐ Step 2-1: 블록체인에서 현재 controller 확인
      console.log("🔍 블록체인에서 현재 controller 확인 중...");
      console.log("  - Pet DID from DB:", adoptionInfo.did);

      const petContract = new ethers.Contract(
        PET_DID_REGISTRY_ADDRESS,
        [
          "function getDIDDocument(string) view returns (address biometricOwner, address controller, uint256 created, uint256 updated, bool exists)",
        ],
        provider
      );

      let didDoc;
      try {
        didDoc = await petContract.getDIDDocument(adoptionInfo.did);
        console.log("  - DID Document raw result:", didDoc);
        console.log("  - biometricOwner:", didDoc.biometricOwner || didDoc[0]);
        console.log("  - controller:", didDoc.controller || didDoc[1]);
        console.log("  - created:", didDoc.created || didDoc[2]);
        console.log("  - updated:", didDoc.updated || didDoc[3]);
        console.log("  - exists:", didDoc.exists || didDoc[4]);

        // exists 확인 (named property 또는 index 4)
        const exists = didDoc.exists !== undefined ? didDoc.exists : didDoc[4];
        if (!exists) {
          throw new Error(
            `이 펫은 블록체인에 등록되지 않았습니다.\n\n` +
            `Pet DID: ${adoptionInfo.did}\n\n` +
            `펫을 먼저 블록체인에 등록해야 입양 승인을 할 수 있습니다.`
          );
        }

        // controller 가져오기 (named property 또는 index 1)
        const controller = didDoc.controller || didDoc[1];
        console.log("  - Blockchain Controller:", controller.toLowerCase());
        console.log("  - Current User (Owner):", address.toLowerCase());

        // 현재 사용자가 controller인지 확인
        if (controller.toLowerCase() !== address.toLowerCase()) {
          throw new Error(
            `현재 사용자는 이 펫의 소유자가 아닙니다.\n\n` +
            `블록체인 Controller: ${controller}\n` +
            `현재 사용자: ${address}\n\n` +
            `입양 공고 작성자만 입양 승인을 할 수 있습니다.`
          );
        }

        console.log("✅ 현재 사용자가 controller임을 확인했습니다.");
      } catch (err: any) {
        console.error("❌ getDIDDocument 실패:", err);

        // 디코딩 에러인 경우 (Pet이 등록되지 않음)
        if (err.code === "BAD_DATA" || err.message?.includes("could not decode")) {
          throw new Error(
            `이 펫은 블록체인에 등록되지 않았습니다.\n\n` +
            `Pet DID: ${adoptionInfo.did}\n\n` +
            `펫을 먼저 블록체인에 등록해야 입양 승인을 할 수 있습니다.\n\n` +
            `원본 에러: ${err.message}`
          );
        }

        throw err;
      }

      // Encode changeController transaction
      const iface = new ethers.Interface([
        "function changeController(string _petDID, address _newController)",
      ]);

      const txData = iface.encodeFunctionData("changeController", [
        adoptionInfo.did,
        adoptionInfo.adopterWallet.toLowerCase(), // 새 보호자
      ]);

      // Get nonce
      const nonce = await provider.getTransactionCount(address);

      console.log("  - Current controller (owner):", address.toLowerCase());
      console.log("  - New controller (adopter):", adoptionInfo.adopterWallet.toLowerCase());
      console.log("  - Pet DID:", adoptionInfo.did);
      console.log("  - Nonce:", nonce);

      // Create transaction params (Pet 등록과 동일)
      const txParams: any = {
        to: PET_DID_REGISTRY_ADDRESS.toLowerCase() as `0x${string}`,
        data: txData as `0x${string}`,
      };

      // gasLimit 추가 (선택사항)
      txParams.gas = BigInt(3000000);

      console.log("  - Transaction params:", txParams);

      // 소유자(현재 사용자)가 트랜잭션 서명 및 전송
      const txHash = await walletClient.sendTransaction(txParams);

      console.log("✅ changeController 트랜잭션 전송 완료!");
      console.log("  - TX Hash:", txHash);

      // Wait for transaction confirmation
      console.log("⏳ 트랜잭션 확인 대기 중...");
      const receipt = await provider.waitForTransaction(txHash);

      if (!receipt) {
        throw new Error("트랜잭션 영수증을 받을 수 없습니다.");
      }

      if (receipt.status === 0) {
        throw new Error("트랜잭션이 블록체인에서 revert되었습니다.");
      }

      console.log("✅ 트랜잭션 확인 완료!");
      console.log("  - Block Number:", receipt.blockNumber);

      // Step 3: Redis에 이전 데이터 저장 (서명된 트랜잭션 해시 포함)
      await initTransfer(
        adoptionInfo.adoptId,
        adoptionInfo.did,
        Number(roomId),
        {
          ...prepareData,
          signedTx: txHash, // ⭐ 서명된 트랜잭션 해시 추가!
        },
        adoptionInfo.adopterWallet.toLowerCase(), // ✅ 입양자 주소!
        accessToken
      );

      console.log("✅ Redis에 이전 데이터 저장 완료 (트랜잭션 해시 포함)");

      alert(
        `입양 승인이 완료되었습니다!\n\n트랜잭션 해시: ${txHash}\n블록 번호: ${receipt.blockNumber}\n\n입양자가 비문 검증을 진행할 수 있습니다.`
      );

      // 채팅방 목록 새로고침
      loadChatRoomList(accessToken);
    } catch (err: any) {
      console.error("❌ 입양 승인 실패:", err);
      alert(`입양 승인 실패: ${err.message || "알 수 없는 오류"}`);
    } finally {
      setInitiatingTransfer(false);
    }
  };

  // 시간 포맷팅
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${minutes.toString().padStart(2, "0")}`;
  };

  // 채팅방 선택
  const handleSelectRoom = (selectedRoomId: number) => {
    router.push(`/chat?roomId=${selectedRoomId}`);
  };

  // 컴포넌트 언마운트 시 WebSocket 연결 해제
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log("🔌 WebSocket 연결 해제");
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.containerBox}>
        {/* 좌측: 채팅방 목록 */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>메시지</div>

          {loadingRooms ? (
            <div className={styles.loadingRooms}>채팅방 목록 로드 중...</div>
          ) : chatRooms.length === 0 ? (
            <div className={styles.emptyRooms}>채팅방이 없습니다.</div>
          ) : (
            <ul className={styles.threadList} role="list">
              {chatRooms.map((room) => (
                <li
                  key={room.roomId}
                  className={`${styles.threadItem} ${
                    String(room.roomId) === roomId ? styles.active : ""
                  }`}
                  onClick={() => handleSelectRoom(room.roomId)}
                >
                  <div className={styles.threadBadge}>
                    {room.roomName.charAt(0)}
                  </div>
                  <div className={styles.threadMeta}>
                    <div className={styles.threadTitle}>
                      <span>{room.roomName}</span>
                      {room.lastMessageAt && (
                        <span className={styles.timeAgo}>
                          {new Date(room.lastMessageAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className={styles.threadPreview}>
                      {room.lastMessage || "메시지가 없습니다."}
                    </div>
                  </div>
                  {room.unreadCount > 0 && (
                    <span className={styles.unread}>{room.unreadCount}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 우측: 채팅 영역 */}
        {!roomId ? (
          <main className={styles.chatPane}>
            <div className={styles.noRoomSelected}>
              <p>채팅방을 선택하세요</p>
            </div>
          </main>
        ) : loading ? (
          <main className={styles.chatPane}>
            <div className={styles.loading}>채팅방을 불러오는 중...</div>
          </main>
        ) : error ? (
          <main className={styles.chatPane}>
            <div className={styles.error}>
              <h3>오류</h3>
              <p>{error}</p>
            </div>
          </main>
        ) : (
          <main className={styles.chatPane}>
            {/* 헤더 */}
            <header className={styles.header}>
              <div className={styles.headerTitle}>{roomInfo?.roomName || "채팅방"}</div>
              <div className={styles.headerStatus}>
                {isConnected ? (
                  <span className={styles.statusConnected}>● 연결됨</span>
                ) : (
                  <span className={styles.statusDisconnected}>● 연결 끊김</span>
                )}
              </div>
            </header>

            {/* 입양 공고 정보 카드 */}
            {adoptionInfo && (
              <section className={styles.adoptionCard}>
                <div className={styles.adoptionCardContent}>
                  <img
                    src={adoptionInfo.petProfile}
                    alt={adoptionInfo.petName}
                    className={styles.petProfileImage}
                  />
                  <div className={styles.adoptionInfo}>
                    <div className={styles.adoptionHeader}>
                      <h3 className={styles.petNameTitle}>{adoptionInfo.petName}</h3>
                      <div className={styles.adoptionButtons}>
                        <Link
                          href={`/adopt/${adoptionInfo.adoptId}`}
                          className={styles.viewButton}
                        >
                          공고 보기
                        </Link>
                        {adoptionInfo.status === "ACTIVE" && (
                          <>
                            {/* 소유자: 입양 승인 버튼 */}
                            {adoptionInfo.writerWallet?.toLowerCase() === currentUserId && (
                              <button
                                onClick={handleInitiateTransfer}
                                disabled={initiatingTransfer}
                                className={styles.adoptButton}
                              >
                                {initiatingTransfer ? "승인 중..." : "입양 승인"}
                              </button>
                            )}
                            {/* 입양자: 비문 검증 시작 버튼 */}
                            {adoptionInfo.writerWallet?.toLowerCase() !== currentUserId && (
                              <Link
                                href={`/adopt/${adoptionInfo.adoptId}/transfer?petDID=${encodeURIComponent(adoptionInfo.did)}`}
                                className={styles.adoptButton}
                              >
                                비문 검증 시작
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <p className={styles.petDetails}>
                      {adoptionInfo.breed} • {adoptionInfo.old}살 • {adoptionInfo.gender === "MALE" ? "수컷" : "암컷"}
                    </p>
                    <p className={styles.petDid}>DID: {adoptionInfo.did}</p>
                    <span className={styles.statusBadgeActive}>
                      {adoptionInfo.status === "ACTIVE" ? "입양 가능" :
                       adoptionInfo.status === "ADOPTING" ? "입양 진행중" : "입양 완료"}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* 채팅창 */}
            <section className={styles.messages}>
              {messages.length === 0 ? (
                <div className={styles.emptyMessages}>
                  아직 메시지가 없습니다. 첫 메시지를 보내보세요!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUserId;
                  return (
                    <div
                      key={`${m.messageId}`}
                      className={`${styles.messageContainer} ${
                        isMe ? styles.containerMe : styles.containerThem
                      }`}
                    >
                      {!isMe && m.senderName && (
                        <div className={styles.senderName}>{m.senderName}</div>
                      )}
                      <div className={styles.bubbleRow}>
                        <div
                          className={`${styles.bubble} ${
                            isMe ? styles.me : styles.them
                          }`}
                        >
                          <div className={styles.bubbleText}>{m.message}</div>
                        </div>
                        <div className={styles.time}>{formatTime(m.createdAt)}</div>
                        {isMe && m.isRead && (
                          <span className={styles.readStatus}>읽음</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </section>

            {/* 입력 박스 */}
            <footer className={styles.inputBar}>
              <input
                className={styles.textInput}
                placeholder={
                  isConnected
                    ? "메시지를 입력하세요…"
                    : "연결을 기다리는 중..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isConnected}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSendMessage}
                disabled={!isConnected || !input.trim()}
              >
                전송
              </button>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.loading}>채팅방 로딩 중...</div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
