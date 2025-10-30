"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { getDonationList, type ServerDonation } from "@/lib/api/donation/list";

// ---------------------------
// 1️⃣ 타입 정의
// ---------------------------
type BreedCode =
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
  | "OTHERS"
  | "";

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
  "": "품종 선택",
};

type StatusCode = "ACTIVE" | "ACHIEVED" | "CLOSED" | "";

const STATUS_LABEL_BY_CODE: Record<StatusCode, string> = {
  ACTIVE: "후원 가능",
  ACHIEVED: "목표 달성",
  CLOSED: "마감",
  "": "후원 상태 선택",
};

// ---------------------------
// 2️⃣ 메인 컴포넌트
// ---------------------------
export default function Donation() {
  const router = useRouter();

  // ========== 검색 상태 (새로고침 하면 사라짐) ==========
  const [breed, setBreed] = useState<BreedCode | "">("");
  const [status, setStatus] = useState<StatusCode | "">("");
  const [keywordInput, setKeywordInput] = useState("");

  // ========== API 상태 ==========
  const [apiItems, setApiItems] = useState<ServerDonation[]>([]); // 서버에서 받아온 후원 데이터
  const [nextCursor, setNextCursor] = useState<number | null>(null); // 다음 조회 커서 값
  const [apiError, setApiError] = useState(""); // 에러 메시지 문자열 저장 (추후 삭제 필요)
  const [loading, setLoading] = useState(false); // API 호출 중인지의 여부: true(로딩중), false(로딩 끝)

  // ---------------------------
  // 공통: API 호출 함수
  // ---------------------------
  const fetchDonations = async (opts?: {
    cursor?: number | null;
    replaceItems?: boolean; // true면 새 검색(리스트 교체), false면 더보기(append)
  }) => {
    try {
      setLoading(true); // 로딩 표시
      setApiError(""); // 이전 에러 메시지 초기화
      const res = await getDonationList({
        size: 9,
        cursor: opts?.cursor ?? undefined, // opts가 있으면 그 안의 cursor, 없으면 undefined
        breed: breed || undefined, // 값이 빈 문자열이면 전송하지 않도록 undefined로 바꿔서 보냄
        status: status || undefined,
        keyword: keywordInput.trim() || undefined,
      });

      // 리스트 새로 교체할지 뒤에 이어붙일지 정하기
      if (opts?.replaceItems) {
        setApiItems(res.result.donations);
      } else {
        // 더보기(append)
        setApiItems((prev) => [...prev, ...res.result.donations]); // 함수형 업데이트 (이어붙이는 형식)
      }

      setNextCursor(res.result.nextCursor ?? null); //다음 페이지가 있는지 확인 후 값 업데이트
    } catch (e: any) {
      console.error(e);
      setApiError(e?.message ?? "API 호출 실패"); // 에러 출력
    } finally {
      setLoading(false); // 로딩 표시 끝
    }
  };

  // ---------------------------
  // 3️⃣ 마운트 시: URL에 이미 파라미터가 있으면 그 값으로 검색
  // ---------------------------
  useEffect(() => {
    // 최초 목록 (URL 파라미터 반영)
    fetchDonations({ replaceItems: true }); // 새 목록으로 실행
  }, []); // 최초 1회

  // ---------------------------
  // 4️⃣ 검색 제출: URL 동기화 → API 새 호출
  // ---------------------------
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // URL 쿼리 갱신
    const qs = new URLSearchParams();
    if (breed) qs.set("breed", breed);
    if (status) qs.set("status", status);
    if (keywordInput.trim()) qs.set("keyword", keywordInput.trim());

    router.replace(`?${qs.toString()}`, { scroll: false });

    // 새 검색 실행(리스트 교체)
    fetchDonations({ replaceItems: true });
  };

  // ---------------------------
  // 새로운 글 작성
  // ---------------------------
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 닫힌 상태(기본)
  const [title, setTitle] = useState(""); // 제목
  const [targetamount, setTargetamount] = useState(""); // 목표 금액
  const [category, setCategory] = useState(""); // 후원 목적
  const [deadline, setDeadline] = useState(""); // 데드라인(날짜형)
  const [bankName, setBankName] = useState(""); // 은행 이름
  const [accountNumber, setAccountNumber] = useState(""); // 계좌번호
  const [accountHolder, setAccountHolder] = useState(""); // 예금주명

  // 글 등록 시 '등록' 버튼 누르면 동작하는 버튼
  const handleSubmit = (e: React.FormEvent) => {
    console.log(`제목: ${title}, 금액: ${targetamount}`);
    e.preventDefault(); // 페이지 새로고침 방지
    setIsModalOpen(false); // 입력 후 닫기
    // 값 초기화
    setTitle("");
    setTargetamount("");
    setCategory("");
    setBankName("");
    setAccountNumber("");
    setAccountHolder("");
  };

  // 로컬 타임존 기준 YYYY-MM-DD (UTC 오프셋 보정)
  const todayLocal = () => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tz).toISOString().slice(0, 10);
  };

  // ---------------------------
  // 5️⃣ 화면 렌더링
  // ---------------------------
  return (
    <div className={styles.container}>
      {/* 제목 + 글쓰기 버튼 */}
      <div className={styles.headcontainer}>
        <h3 className={styles.headtext}>후원 공고</h3>
        <button
          onClick={() => {
            setIsModalOpen(true);
          }}
          className={styles.writeButton}
        >
          + 글 작성
        </button>
      </div>

      {/* 검색 영역 */}
      <form className={styles.searchBox} onSubmit={handleSearchSubmit}>
        <select
          value={breed}
          onChange={(e) => setBreed(e.target.value as BreedCode)}
          className={styles.select}
        >
          {Object.entries(BREED_LABEL_BY_CODE).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusCode | "")}
          className={styles.select}
        >
          {Object.entries(STATUS_LABEL_BY_CODE).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="검색어 입력"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          className={styles.input}
        />

        <button type="submit" className={styles.button}>
          검색
        </button>
      </form>

      {/* API 오류 표시 */}
      {apiError && <div className={styles.error}>API 오류: {apiError}</div>}

      {/* 로딩 표시 */}
      {loading && <div className={styles.loading}>불러오는 중...</div>}

      {/* 후원 카드 리스트 */}
      <section className={styles.donationSection}>
        <div className={styles.donationList}>
          {!loading && apiItems.length === 0 && (
            <div className={styles.empty}>
              조건에 맞는 후원 공고가 없습니다.
            </div>
          )}

          {apiItems.map((item) => (
            <div key={item.donationId} className={styles.donationCard}>
              <div className={styles.status}>
                {STATUS_LABEL_BY_CODE[item.donationStatus as StatusCode]}
              </div>
              {item.dday && <div className={styles.dday}>{item.dday}</div>}

              <div className={styles.donationImage}>
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    width={300}
                    height={180}
                    className={styles.donationImg}
                  />
                ) : (
                  <div className={styles.noImage}>🖼️</div>
                )}
              </div>

              <div className={styles.donationInfo}>
                <h4 className={styles.donationTitle}>{item.title}</h4>
                <p className={styles.donationAmount}>
                  {item.currentAmount}원
                  <span className={styles.percent}>{item.progress}%</span>
                </p>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className={styles.goal}>목표: {item.targetAmount}원</p>
                <div className={styles.bottomInfo}>
                  <span>후원자 {item.patronCount}명</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 더보기 (스크롤) */}
        {!loading && nextCursor !== null && (
          <div className={styles.moreWrap}>
            <button
              className={styles.moreButton}
              onClick={() =>
                fetchDonations({ cursor: nextCursor, replaceItems: false })
              }
            >
              더 보기
            </button>
          </div>
        )}

        {/* 글 작성 폼 (모달) */}
        {isModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>후원 공고 작성</h3>
              <form onSubmit={handleSubmit}>
                <p className={styles.modal_title}>제목 *</p>
                <input
                  type="text"
                  placeholder="후원 공고 제목을 입력하세요"
                  value={title}
                  className={styles.input_full}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <p className={styles.modal_title}>등록한 동물 불러오기 *</p>
                <select className={styles.select_full}>
                  <option value=""></option>
                  {/* 사용자 계정에 등록한 동물 불러오기 해야 됨 */}
                </select>
                <p className={styles.info}>
                  마이페이지에서 등록한 동물만 선택할 수 있습니다.
                </p>
                <div className={styles.formGrid}>
                  <div>
                    <p className={styles.modal_title}>후원 목적 *</p>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      <option value="surgery">수술비</option>
                      <option value="treatment">치료비</option>
                      <option value="feed">사료비</option>
                      <option value="shelter">보호소 운영비</option>
                    </select>
                  </div>
                  <div>
                    <p className={styles.modal_title}>목표 금액 (원) *</p>
                    <input
                      type="number"
                      placeholder="예: 100000"
                      value={targetamount}
                      onChange={(e) => setTargetamount(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <p className={styles.modal_title}>마감일 *</p>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      min={todayLocal()} // 오늘 이전 선택 불가
                      required
                      className={styles.dateInput} // 기존 input과 같은 스타일을 쓰면 OK
                    />
                  </div>
                  <div>
                    <p className={styles.modal_title}>은행 *</p>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    >
                      <option value="kb">KB국민은행</option>
                      <option value="shinhan">신한은행</option>
                      <option value="woori">우리은행</option>
                      <option value="hana">하나은행</option>
                      <option value="nh">NH농협은행</option>
                      <option value="ibk">IBK기업은행</option>
                      <option value="kakaobank">카카오뱅크</option>
                      <option value="tossbank">토스뱅크</option>
                      <option value="kbank">케이뱅크</option>
                    </select>
                  </div>
                  <div>
                    <p className={styles.modal_title}>계좌번호 *</p>
                    <input
                      type="text"
                      placeholder="'-' 없이 입력"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <p className={styles.modal_title}>예금주명 *</p>
                    <input
                      type="text"
                      placeholder="예금주명 입력"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <p className={styles.modal_title}>후원 상세 내용</p>
                <textarea
                  name="donation_detail"
                  placeholder="후원이 필요한 이유와 상세한 내용을 입력하세요"
                ></textarea>

                <p className={styles.modal_title}>사진 업로드(최대 5장)</p>
                <input
                  type="file"
                  name="imgaes"
                  accept="image/*"
                  multiple
                ></input>

                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={styles.cancel}
                  >
                    닫기
                  </button>
                  <button type="submit">등록하기</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* (디버그) */}
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 12,
          background: "#fafafa",
          padding: 8,
        }}
      >
        {JSON.stringify(
          {
            query: {
              breed,
              status,
              keyword: keywordInput.trim() || undefined,
            },
            nextCursor,
            items: apiItems,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
