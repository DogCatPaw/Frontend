"use client";

import styles from "./page.module.css";
import Image from "next/image";
import Link from "next/link";
import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  getAdoptionDetail,
  type ServerAdoptionDetail,
} from "@/lib/api/adopt/detail";
import { createChatRoom } from "@/lib/api/chat";
import { getAccessToken } from "@/lib/api/auth";

// ==================== 이미지 src 정규화 유틸 ====================

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v.length ? v[0] : null;
  return v ?? null;
}

/** next/image가 허용하는 형태로 정규화. 불가하면 null */
function normalizeImageSrc(srcIn?: string | string[] | null): string | null {
  let src = pickFirst(srcIn);
  if (!src) return null;

  // 공백/양끝 따옴표 제거 (e.g. "'123'" -> 123)
  src = src.trim().replace(/^['"]|['"]$/g, "");

  // data URL 허용
  if (/^data:image\//i.test(src)) return src;

  // 절대 URL 허용
  if (/^https?:\/\//i.test(src)) return src;

  // 루트 상대 경로 허용
  if (src.startsWith("/")) return src;

  // 일반적인 상대경로 보정 (예: images/foo.jpg -> /images/foo.jpg)
  if (/^[\w\-./%]+$/.test(src)) {
    return "/" + src.replace(/^\/+/, "");
  }

  // 그 외는 사용 불가 → 폴백
  return null;
}

/** 문자열/배열/JSON문자열/구분자 혼재 모두 흡수 → URL 배열 */
function toUrlArray(input?: string | string[] | null): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);

  const s = input.trim().replace(/^['"]|['"]$/g, ""); // 양끝 따옴표 제거

  // ["a","b"] 같은 JSON 배열 문자열?
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
    } catch {
      // 무시 후 아래 구분자 분리로 진행
    }
  }

  // 콤마/세미콜론/파이프/공백 등 구분자로 분리
  return s
    .split(/[,;|\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// 입양 진행 상태
type status = "ACTIVE" | "ADOPTING" | "ADOPTED";

const status_LABE: Record<status, string> = {
  ACTIVE: "입양 가능",
  ADOPTING: "입양중",
  ADOPTED: "입양 완료",
};

// 품종
export type BreedCode =
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

const BREED_LABEL_BY_CODE: Record<BreedCode, string> = {
  MALTESE: "말티즈",
  POODLE: "푸들",
  POMERANIAN: "포메라니안",
  CHIHUAHUA: "치와와",
  SHIH_TZU: "시츄",
  YORKSHIRE_TERRIER: "요크셔 테리어",
  PUG: "퍼그",
  MINIATURE_SCHNAUZER: "미니어처 슈나우저",
  CAVALIER_KING_CHARLES_SPANIEL: "카발리에 킹 찰스 스패니얼",
  BICHON_FRISE: "비숑 프리제",
  FRENCH_BULLDOG: "프렌치 불도그",
  DACHSHUND: "닥스훈트",
  BEAGLE: "비글",
  CORGI: "웰시코기",
  GOLDEN_RETRIEVER: "골든 리트리버",
  LABRADOR_RETRIEVER: "래브라도 리트리버",
  GERMAN_SHEPHERD: "저먼 셰퍼드",
  SIBERIAN_HUSKY: "시베리안 허스키",
  SHIBA_INU: "시바견",
  MIXED: "믹스견",
  OTHERS: "기타",
};

// 지역
export type Region =
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

const REGION_LABEL: Record<Region, string> = {
  SEOUL: "서울특별시",
  BUSAN: "부산광역시",
  DAEGU: "대구광역시",
  INCHEON: "인천광역시",
  GWANGJU: "광주광역시",
  DAEJEON: "대전광역시",
  ULSAN: "울산광역시",
  SEJONG: "세종특별자치시",
  GYEONGGI: "경기도",
  GANGWON: "강원특별자치도",
  CHUNGBUK: "충청북도",
  CHUNGNAM: "충청남도",
  JEONBUK: "전북특별자치도",
  JEONNAM: "전라남도",
  GYEONGBUK: "경상북도",
  GYEONGNAM: "경상남도",
  JEJU: "제주특별자치도",
};

// 성별
export type Gender = "FEMALE" | "MALE";

const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: "암컷",
  MALE: "수컷",
};

export default function AdoptDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useAccount(); // 현재 연결된 지갑 주소

  // API
  const [apiItems, setApiItems] = useState<ServerAdoptionDetail>(); // 서버에서 받아온 데이터
  const [apiError, setApiError] = useState(""); // 에러 메시지
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [creatingChat, setCreatingChat] = useState(false); // 채팅방 생성 중

  // 이미지 갤러리 인덱스
  const [currentIdx, setCurrentIdx] = useState(0);

  // currentOwner를 서버에서 제공하지 않으므로 제거

  // API 호출 함수
  const fetchAdoptionDetails = async () => {
    try {
      setLoading(true);
      setApiError("");

      const res = await getAdoptionDetail(Number(id));
      setApiItems((res as any).result ?? res);
    } catch (e: any) {
      console.error(e);
      setApiError(e?.message ?? "API 호출 실패");
      setApiItems(undefined);
    } finally {
      setLoading(false);
    }
  };

  // 최초 1회 + id 변경 시
  useEffect(() => {
    fetchAdoptionDetails();
  }, [id]);

  // ---------- 파생 데이터: 갤러리 ----------
  const gallery: string[] = useMemo(() => {
    const imgs: Array<string | null> = [];

    // 후보 필드들에서 전부 수집 → 배열화 → 정규화
    const sources: (string | string[] | null | undefined)[] = [
      apiItems?.images,
      (apiItems as any)?.imageUrls,
      (apiItems as any)?.thumbnails,
      (apiItems as any)?.photos,
    ];

    for (const src of sources) {
      for (const v of toUrlArray(src)) {
        const n = normalizeImageSrc(v);
        if (n) imgs.push(n);
      }
    }

    // 대표 이미지 후보
    const thumb =
      normalizeImageSrc((apiItems as any)?.thumbnail) ??
      normalizeImageSrc((apiItems as any)?.mainImage);
    if (thumb) imgs.unshift(thumb);

    // 중복 제거
    const uniq = Array.from(new Set(imgs.filter(Boolean) as string[]));

    // 최소 폴백
    if (!uniq.length) {
      uniq.push("/placeholder-dog.jpg"); // 정적 폴백 이미지
    }
    return uniq;
  }, [apiItems]);

  // 갤러리가 바뀌면 첫 이미지로 리셋
  useEffect(() => {
    setCurrentIdx(0);
  }, [gallery.length]);

  // 채팅방 생성 및 이동
  const handleStartChat = async () => {
    if (!apiItems) return;

    // 로그인 확인
    const accessToken = getAccessToken();
    if (!accessToken) {
      alert("로그인이 필요합니다!");
      router.push("/login");
      return;
    }

    // 지갑 연결 확인
    if (!address) {
      alert("지갑을 연결해주세요.");
      return;
    }

    setCreatingChat(true);

    try {
      console.log("📩 채팅방 생성 중...");

      // adoptId와 roomName(입양 공고 제목)만 전송
      const response = await createChatRoom(
        {
          adoptId: Number(id), // URL의 입양 공고 ID
          roomName: apiItems.title, // 입양 공고 제목을 채팅방 이름으로
        },
        accessToken
      );

      console.log("✅ 채팅방 생성 완료:", response.result.roomId);

      // 채팅 페이지로 이동 (roomId를 쿼리 파라미터로 전달)
      router.push(`/chat?roomId=${response.result.roomId}`);
    } catch (error: any) {
      console.error("❌ 채팅방 생성 실패:", error);

      // 에러 메시지에서 자신의 공고인지 확인
      const errorMsg = error.message || "";
      if (errorMsg.includes("자신") || errorMsg.includes("본인") || errorMsg.includes("same user")) {
        alert("자신의 입양 공고에는 문의할 수 없습니다.");
      } else {
        alert(`채팅방 생성 실패: ${errorMsg}`);
      }
    } finally {
      setCreatingChat(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link href="/adopt" className={styles.adoptButton}>
        ← 목록으로 돌아가기
      </Link>

      {/* 상태 표시 */}
      {loading && <p>로딩 중...</p>}
      {apiError && !loading && <p style={{ color: "crimson" }}>{apiError}</p>}

      {/* 내용 출력 */}
      {apiItems && (
        <div className={styles.contentWrap}>
          {/* 좌측: 이미지 영역 */}
          <section className={styles.leftPane}>
            <div className={styles.hero}>
              <Image
                src={gallery[currentIdx] ?? "/placeholder-dog.jpg"}
                alt={apiItems.title}
                fill
                sizes="(max-width: 1024px) 100vw, 640px"
                className={styles.heroImg}
                priority
              />
              <span className={styles.badge}>
                {status_LABE[apiItems.status as status]}
              </span>
            </div>

            {gallery.length > 1 && (
              <ul className={styles.thumbList}>
                {gallery.slice(0, 4).map((src, i) => (
                  <li key={src} className={styles.thumbItem}>
                    <button
                      type="button"
                      className={`${styles.thumbBtn} ${
                        i === currentIdx ? styles.thumbActive : ""
                      }`}
                      onClick={() => setCurrentIdx(i)}
                      aria-label={`이미지 ${i + 1} 보기`}
                    >
                      <Image
                        src={src}
                        alt={`thumbnail-${i + 1}`}
                        fill
                        sizes="96px"
                        className={styles.thumbImg}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 우측: 상세 정보 */}
          <section className={styles.rightPane}>
            <h1 className={styles.title}>
              {apiItems?.title || "입양 상세 정보"}
            </h1>

            <dl className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>이름</dt>
                <dd className={styles.metaValue}>{apiItems.petName}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>품종</dt>
                <dd className={styles.metaValue}>
                  {BREED_LABEL_BY_CODE[apiItems.breed as BreedCode]}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>DID</dt>
                <dd className={styles.metaValue}>{apiItems.did}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>성별</dt>
                <dd className={styles.metaValue}>
                  {GENDER_LABEL[apiItems.gender as Gender]}
                  {apiItems.neutral === true
                    ? "(중성화 완료)"
                    : apiItems.neutral === false
                    ? "(중성화 미완료)"
                    : "정보 없음"}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>털색깔</dt>
                <dd className={styles.metaValue}>
                  {apiItems.color || "정보 없음"}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>몸무게</dt>
                <dd className={styles.metaValue}>
                  {apiItems.weight > 0 ? `${apiItems.weight.toFixed(1)}kg` : "정보 없음"}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>나이</dt>
                <dd className={styles.metaValue}>{apiItems.old}살</dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>지역</dt>
                <dd className={styles.metaValue}>
                  {REGION_LABEL[apiItems.region as Region]} {apiItems.district}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>보호소</dt>
                <dd className={styles.metaValue}>{apiItems.shelterName}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>마감일</dt>
                <dd className={styles.metaValue}>{apiItems.deadline}</dd>
              </div>
            </dl>

            {apiItems.content && (
              <div className={styles.memoBox}>
                <p>{apiItems.content}</p>
              </div>
            )}

            <div className={styles.shelterCard}>
              <div className={styles.shelterInfo}>
                <strong className={styles.shelterName}>
                  {apiItems.shelterName}
                </strong>
                <span className={styles.shelterRegion}>
                  {REGION_LABEL[apiItems.region as Region]} {apiItems.district}
                </span>
              </div>
              <Link href="/shelter" className={styles.shelterBtn} type="button">
                보호소 보기
              </Link>
            </div>

            {/* 입양 문의 버튼 - ACTIVE 상태일 때만 표시 */}
            {apiItems.status === "ACTIVE" && (
              <div className={styles.actions}>
                <button
                  onClick={handleStartChat}
                  disabled={creatingChat}
                  className={styles.primaryBtn}
                  type="button"
                >
                  {creatingChat ? "채팅방 생성 중..." : "입양 문의하기"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
