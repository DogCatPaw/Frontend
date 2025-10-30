"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { getDonationList, type ServerDonation } from "@/lib/api/donation/list";
import { postDonation } from "@/lib/api/donation/posts";
import { getMyPets } from "@/lib/api/pet";
import { getAccessToken } from "@/lib/api/auth";
import { handleImagesUpload } from "@/lib/utils/upload";
import { useAuth } from "@/hooks/useAuth";

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

interface SpringPet {
  petId: number;
  did: string;
  petProfile?: string;
  petName: string;
  old?: number;
  gender?: string;
  breed?: string;
}

// ---------------------------
// 2️⃣ 메인 컴포넌트
// ---------------------------
export default function Donation() {
  const router = useRouter();
  const { user } = useAuth();

  // ========== 검색 상태 (새로고침 하면 사라짐) ==========
  const [breed, setBreed] = useState<BreedCode | "">("");
  const [status, setStatus] = useState<StatusCode>("");
  const [keywordInput, setKeywordInput] = useState("");

  // ========== API 상태 ==========
  const [apiItems, setApiItems] = useState<ServerDonation[]>([]); // 서버에서 받아온 후원 데이터
  const [nextCursor, setNextCursor] = useState<number | null>(null); // 다음 조회 커서 값
  const [apiError, setApiError] = useState(""); // 에러 메시지 문자열 저장 (추후 삭제 필요)
  const [loading, setLoading] = useState(false); // API 호출 중인지의 여부: true(로딩중), false(로딩 끝)

  // ========== 페이지네이션 상태 ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<Map<number, number | null>>(
    new Map([[1, null]]) // 첫 페이지는 cursor가 null
  );

  // ---------------------------
  // 공통: API 호출 함수 (페이지 기반)
  // ---------------------------
  const fetchDonations = async (page: number) => {
    try {
      setLoading(true);
      setApiError("");

      // 해당 페이지의 cursor 가져오기
      const cursor = pageCursors.get(page) ?? null;

      const res = await getDonationList({
        size: 9,
        cursor: cursor ?? undefined,
        breed: breed || undefined,
        status: status || undefined,
        keyword: keywordInput.trim() || undefined,
      });

      setApiItems(res.result.donations);

      // 다음 페이지 cursor 저장
      if (res.result.nextCursor) {
        setPageCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(page + 1, res.result.nextCursor);
          return newMap;
        });
        // 다음 페이지가 있으면 totalPages 업데이트
        if (page >= totalPages) {
          setTotalPages(page + 1);
        }
      } else {
        // nextCursor가 null이면 현재 페이지가 마지막
        setTotalPages(page);
      }
    } catch (e: any) {
      console.error(e);
      setApiError(e?.message ?? "API 호출 실패");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // 3️⃣ 마운트 시: URL에 이미 파라미터가 있으면 그 값으로 검색
  // ---------------------------
  useEffect(() => {
    // 최초 목록
    fetchDonations(1);
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

    // 페이지 1로 초기화
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));

    // 새 검색 실행
    fetchDonations(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchDonations(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // 페이지 번호 표시 (최대 5개)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // ---------------------------
  // 새로운 글 작성
  // ---------------------------
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 닫힌 상태(기본)
  const [title, setTitle] = useState(""); // 제목
  const [selectedPet, setSelectedPet] = useState(""); // 선택된 반려동물 petId
  const [content, setContent] = useState(""); // 상세 내용
  const [targetamount, setTargetamount] = useState(""); // 목표 금액
  const [category, setCategory] = useState(""); // 후원 목적
  const [deadline, setDeadline] = useState(""); // 데드라인(날짜형)
  const [bankName, setBankName] = useState(""); // 은행 이름
  const [accountNumber, setAccountNumber] = useState(""); // 계좌번호
  const [accountHolder, setAccountHolder] = useState(""); // 예금주명
  const [images, setImages] = useState<File[]>([]); // 업로드할 이미지들
  const [submitting, setSubmitting] = useState(false); // 등록 중 상태

  // 에러 모달
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 글 등록 시 '등록' 버튼 누르면 동작
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 페이지 새로고침 방지

    // 간단 검증
    if (
      !selectedPet ||
      !title.trim() ||
      !category ||
      !targetamount ||
      !deadline ||
      !bankName ||
      !accountNumber.trim() ||
      !accountHolder.trim()
    ) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        alert("로그인이 필요합니다!");
        router.push("/login");
        return;
      }

      // 1. 이미지 업로드 (있는 경우)
      let imageString = "";
      if (images.length > 0) {
        try {
          console.log("📤 [Donation] Uploading images...");
          const uploadedKeys = await handleImagesUpload(images, accessToken);
          imageString = uploadedKeys.join(",");
          console.log("✅ [Donation] Images uploaded:", imageString);
        } catch (uploadError: any) {
          alert(`이미지 업로드 실패: ${uploadError.message}`);
          return;
        }
      }

      // 2. 후원 공고 등록
      const payload = {
        petId: Number(selectedPet),
        title: title.trim(),
        content: content.trim(),
        category: category as any,
        targetAmount: Number(targetamount),
        deadline: deadline,
        bankName: bankName,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        images: imageString,
      };

      console.log("📋 [Donation] Posting donation:", payload);
      const res = await postDonation(payload, accessToken);
      if (!res?.isSuccess) {
        throw new Error(res?.message || "등록 실패");
      }

      alert("후원 공고가 등록되었습니다.");

      // 모달 닫기 + 값 리셋
      setIsModalOpen(false);
      setTitle("");
      setSelectedPet("");
      setContent("");
      setTargetamount("");
      setCategory("");
      setDeadline("");
      setBankName("");
      setAccountNumber("");
      setAccountHolder("");
      setImages([]);

      // 목록 새로고침 (첫 페이지부터)
      setCurrentPage(1);
      setTotalPages(1);
      setPageCursors(new Map([[1, null]]));
      await fetchDonations(1);
    } catch (err: any) {
      console.error(err);

      // 에러 메시지 추출
      let displayMessage = err?.message ?? "알 수 없는 오류";

      // JSON 에러 메시지 파싱 시도
      if (displayMessage.includes("{")) {
        try {
          const jsonMatch = displayMessage.match(/(\{.*\})/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[1]);
            displayMessage = errorData.error || errorData.message || displayMessage;
          }
        } catch {
          // JSON 파싱 실패 시 원본 메시지 사용
        }
      }

      setErrorMessage(displayMessage);
      setErrorModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  // 이미지 5개 제한
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 5) {
      alert("사진은 최대 5장까지 업로드할 수 있습니다. 다시 선택해주세요.");
      e.target.value = "";
      setImages([]);
      return;
    }
    setImages(files);
  };

  // 로컬 타임존 기준 YYYY-MM-DD (UTC 오프셋 보정)
  const todayLocal = () => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tz).toISOString().slice(0, 10);
  };

  // 동물 불러오기 (Spring API)
  const [petList, setPetList] = useState<SpringPet[] | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState("");

  // 페이지 로드 시 펫 리스트 미리 가져오기 (로그인한 경우에만)
  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      return;
    }

    if (petList !== null) return; // 이미 가져왔으면 재호출 X

    (async () => {
      try {
        setPetLoading(true);
        setPetError("");

        const res = await getMyPets(accessToken);
        console.log("📋 [Donation] Loaded my pets:", res);
        setPetList(res.result ?? []);
      } catch (e: any) {
        console.error(e);
        setPetError(e?.message ?? "동물 목록을 불러오지 못했습니다.");
        setPetList([]);
      } finally {
        setPetLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 페이지 로드 시 1회만

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
          <option value="">품종 선택</option>
          {Object.entries(BREED_LABEL_BY_CODE)
            .filter(([code]) => code !== "")
            .map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusCode)}
          className={styles.select}
        >
          <option value="">후원 상태 선택</option>
          {Object.entries(STATUS_LABEL_BY_CODE)
            .filter(([code]) => code !== "")
            .map(([code, label]) => (
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

      {/* 로딩 표시 */}
      {loading && <div className={styles.loading}>불러오는 중...</div>}

      {/* 후원 카드 리스트 */}
      <section className={styles.donationSection}>
        <div className={styles.donationList}>
          {!loading && apiItems.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>🍖</p>
              <p className={styles.emptyTitle}>후원 공고가 없습니다</p>
              <p className={styles.emptyDescription}>
                도움이 필요한 반려동물들을 위한 후원 공고를 작성해보세요.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className={styles.createPostBtn}
              >
                후원 공고 작성하기
              </button>
            </div>
          )}

          {apiItems.map((item) => {
            // 프론트엔드에서 progress 계산
            const calculatedProgress = item.targetAmount > 0
              ? Math.min(Math.round((item.currentAmount / item.targetAmount) * 100), 100)
              : 0;

            return (
              <div
                key={item.donationId}
                className={styles.donationCard}
                onClick={() => router.push(`/donation/${item.donationId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    router.push(`/donation/${item.donationId}`);
                }}
              >
                <div className={styles.cardImageWrapper}>
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      width={300}
                      height={220}
                      className={styles.cardImage}
                    />
                  ) : (
                    <div className={styles.noImage}>🖼️</div>
                  )}
                  <div className={styles.badge}>후원</div>
                  {item.dday && <div className={styles.dday}>{item.dday}</div>}
                </div>

                <div className={styles.cardContent}>
                  <h4 className={styles.cardTitle}>{item.title}</h4>
                  <div className={styles.progressLabel}>
                    <span>후원 현황</span>
                    <span style={{ fontWeight: 600, color: '#333' }}>{calculatedProgress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${calculatedProgress}%` }}
                    />
                  </div>
                  <div className={styles.amountInfo}>
                    <span className={styles.currentAmount}>
                      {item.currentAmount?.toLocaleString()}원
                    </span>
                    <span className={styles.targetAmount}>
                      목표: {item.targetAmount?.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 페이지네이션 */}
        {!loading && totalPages >= 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageButton}
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {getPageNumbers().map((page) => (
              <button
                key={page}
                className={`${styles.pageButton} ${
                  currentPage === page ? styles.active : ""
                }`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className={styles.pageButton}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              ›
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
                <select
                  className={styles.select_full}
                  value={selectedPet}
                  onChange={(e) => setSelectedPet(e.target.value)}
                  required
                  disabled={petLoading || (petList !== null && petList.length === 0)}
                >
                  <option value="">
                    {petLoading ? "불러오는 중..." : "반려동물을 선택하세요"}
                  </option>
                  {petError === "" &&
                    (petList ?? []).map((p) => (
                      <option key={p.petId} value={String(p.petId)}>
                        {p.petName} - {BREED_LABEL_BY_CODE[p.breed as BreedCode] ?? "기타"}
                      </option>
                    ))}
                </select>
                {petError ? (
                  <p className={styles.error} role="alert">
                    동물 목록을 불러오지 못했습니다. 새로고침해주세요.
                  </p>
                ) : (
                  <p className={styles.info}>
                    마이페이지에서 등록한 동물 중에서 선택할 수 있습니다.
                  </p>
                )}
                <div className={styles.formGrid}>
                  <div>
                    <p className={styles.modal_title}>후원 목적 *</p>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      <option value="">선택하세요</option>
                      <option value="MEDICAL">의료비</option>
                      <option value="FOOD">사료/급식</option>
                      <option value="SHELTER">보호소 운영</option>
                      <option value="OTHER">기타</option>
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
                      <option value="">선택하세요</option>
                      <option value="KB국민은행">KB국민은행</option>
                      <option value="신한은행">신한은행</option>
                      <option value="우리은행">우리은행</option>
                      <option value="하나은행">하나은행</option>
                      <option value="NH농협은행">NH농협은행</option>
                      <option value="IBK기업은행">IBK기업은행</option>
                      <option value="카카오뱅크">카카오뱅크</option>
                      <option value="토스뱅크">토스뱅크</option>
                      <option value="케이뱅크">케이뱅크</option>
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
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="후원이 필요한 이유와 상세한 내용을 입력하세요"
                ></textarea>

                <p className={styles.modal_title}>사진 업로드(최대 5장)</p>
                <input
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                ></input>

                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={styles.cancel}
                    disabled={submitting}
                  >
                    닫기
                  </button>
                  <button type="submit" disabled={submitting}>
                    {submitting ? "등록 중..." : "등록하기"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 에러 모달 */}
        {errorModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.errorModal}>
              <h3 className={styles.errorTitle}>오류</h3>
              <p className={styles.errorText}>{errorMessage}</p>
              <div className={styles.errorButtons}>
                <button
                  type="button"
                  onClick={() => {
                    setErrorModalOpen(false);
                    setIsModalOpen(false);
                    window.location.reload();
                  }}
                  className={styles.errorConfirm}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
