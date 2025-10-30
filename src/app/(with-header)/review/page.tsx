"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { getReviewList, type ServerReview } from "@/lib/api/review/list";
import { postReview } from "@/lib/api/review/post";
import { deleteReview } from "@/lib/api/review/delete";
import { getPet, type ServerPet } from "@/lib/api/pet/pet";
import { handleImagesUpload } from "@/lib/utils/upload";
import { getAccessToken, getStoredWalletAddress } from "@/lib/api/auth";

// ==================== 이미지 src 정규화 유틸 ====================
function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v.length ? v[0] : null;
  return v ?? null;
}
function normalizeImageSrc(srcIn?: string | string[] | null): string | null {
  let src = pickFirst(srcIn);
  if (!src) return null;
  src = src.trim().replace(/^['"]|['"]$/g, "");
  if (/^data:image\//i.test(src)) return src;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return src;
  if (/^[\w\-./]+$/.test(src)) return "/" + src.replace(/^\/+/, "");
  return null;
}

// ==================== 품종 라벨 ====================
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

// 서버 응답에서 품종 코드를 안전하게 뽑아 라벨로 바꿔주는 헬퍼
function getBreedLabel(obj: any): string {
  const code =
    obj?.breed ??
    obj?.breedCode ??
    obj?.breed_code ??
    obj?.petBreed ??
    obj?.pet_breed ??
    null;

  if (!code) return "기타";
  const key = String(code).toUpperCase().replace(/\s+/g, "_") as BreedCode;
  return BREED_LABEL_BY_CODE[key] ?? "기타";
}

export default function Review() {
  const router = useRouter();
  const { address } = useAccount();

  // 검색
  const [keyword, setKeyword] = useState("");

  // 내 글 보기 필터
  const [showMyReviews, setShowMyReviews] = useState(false);

  // ============================= API =============================
  const [apiItems, setApiItems] = useState<ServerReview[]>([]);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<Map<number, number | null>>(
    new Map([[1, null]]) // 1페이지는 cursor 없음
  );

  const fetchReviews = async (page: number) => {
    try {
      setLoading(true);
      setApiError("");

      // 해당 페이지의 커서 가져오기
      const cursor = pageCursors.get(page) ?? null;

      // 내 글 보기일 때 walletAddress 가져오기
      let walletAddress: string | undefined = undefined;
      if (showMyReviews) {
        walletAddress = getStoredWalletAddress()?.toLowerCase();
        if (!walletAddress) {
          alert("로그인이 필요합니다!");
          setShowMyReviews(false);
          router.push("/login");
          return;
        }
      }

      console.log("📤 [Review Page] Fetching page:", page, "cursor:", cursor, "keyword:", keyword, "walletAddress:", walletAddress);

      const res = await getReviewList({
        size: 9,
        cursorId: cursor ?? undefined,
        keyword: keyword.trim() || undefined,
        walletAddress: walletAddress,
      });

      console.log("✅ [Review Page] Received data:", {
        isSuccess: res.isSuccess,
        reviewCount: res.result.reviews?.length || 0,
        reviews: res.result.reviews || []
      });

      setApiItems(res.result.reviews || []);

      // 다음 페이지 커서 저장
      if (res.result.nextCursor) {
        setPageCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(page + 1, res.result.nextCursor);
          return newMap;
        });
        // 다음 페이지가 있으면 총 페이지 수 업데이트
        if (page >= totalPages) {
          setTotalPages(page + 1);
        }
      }
    } catch (e: any) {
      console.error("❌ [Review] Fetch error:", e);
      console.error("❌ [Review] Error message:", e?.message);
      console.error("❌ [Review] Error stack:", e?.stack);
      setApiItems([]);
      setApiError(e?.message || "리뷰를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
    fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMyReviews]);

  // ============================= 검색 =============================
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (keyword) qs.set("keyword", keyword.trim());
    router.replace(`?${qs.toString()}`, { scroll: false });
    // 검색 시 페이지네이션 초기화
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
    fetchReviews(1);
  };

  // ============================= 페이지네이션 =============================
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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

  // 페이지 번호 목록 생성 (최대 5개 표시)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // 끝에서 시작 페이지 조정
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // ============================= 삭제 기능 =============================
  const handleDelete = async (reviewId: number) => {
    if (!confirm("정말 이 후기를 삭제하시겠습니까?")) return;

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        alert("로그인이 필요합니다!");
        router.push("/login");
        return;
      }

      await deleteReview(reviewId, accessToken);
      alert("후기가 삭제되었습니다.");

      // 현재 페이지 새로고침
      await fetchReviews(currentPage);
    } catch (err: any) {
      console.error("❌ [Review] Delete error:", err);
      alert(`삭제 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`);
    }
  };

  // ============================= 글 등록(모달) =============================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [modalAdoptionAgency, setModalAdoptionAgency] = useState("");
  const [modalAdoptionDate, setModalAdoptionDate] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [petId, setPetId] = useState<string>("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 5) {
      alert("사진은 최대 5장까지 업로드할 수 있습니다. 다시 선택해주세요.");
      e.target.value = "";
      setImages([]);
      return;
    }
    setImages(files);
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !petId ||
      !modalAdoptionAgency.trim() ||
      !modalAdoptionDate.trim() ||
      !modalTitle.trim() ||
      !modalContent.trim()
    ) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    // 지갑 주소
    const walletAddress =
      (window as any)?.ethereumSelectedAddress ||
      localStorage.getItem("walletAddress") ||
      "";
    if (!walletAddress) {
      alert("로그인이 필요합니다!");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      // Access Token 가져오기
      const accessToken = getAccessToken();
      if (!accessToken) {
        alert("로그인이 필요합니다!");
        router.push("/login");
        return;
      }

      // 1. 이미지 업로드 (S3)
      let imageString = "";
      if (images.length > 0) {
        console.log("📤 [Review] Uploading images...");
        const fileKeys = await handleImagesUpload(images, accessToken);
        imageString = fileKeys.join(",");
        console.log("✅ [Review] Images uploaded:", imageString);
      }

      // 2. 후기 등록
      const payload = {
        petId: Number(petId),
        title: modalTitle.trim(),
        content: modalContent.trim(),
        adoptionAgency: modalAdoptionAgency.trim(),
        adoptionDate: modalAdoptionDate.trim(),
        images: imageString,
      };

      console.log("📤 [Review] Submitting review:", payload);

      const res = await postReview(walletAddress, payload);
      if (!res?.isSuccess) throw new Error(res?.message || "등록 실패");

      alert("입양 후기가 등록되었습니다.");
      setIsModalOpen(false);
      setModalTitle("");
      setModalContent("");
      setModalAdoptionAgency("");
      setModalAdoptionDate("");
      setImages([]);
      setPetId("");

      // 1페이지로 이동하여 새 글 확인
      setCurrentPage(1);
      setTotalPages(1);
      setPageCursors(new Map([[1, null]]));
      await fetchReviews(1);
    } catch (err: any) {
      console.error("❌ [Review] Error:", err);
      alert(
        `등록 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================= 동물 불러오기 =============================
  const [petList, setPetList] = useState<ServerPet[] | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState("");

  // 모달 열릴 때 최초 1회
  useEffect(() => {
    if (!isModalOpen) return;
    if (petList !== null) return;
    (async () => {
      try {
        setPetLoading(true);
        setPetError("");
        const res = await getPet();
        setPetList(res.result ?? []);
      } catch (e: any) {
        console.error(e);
        setPetError(e?.message ?? "동물 목록을 불러오지 못했습니다.");
        setPetList([]);
      } finally {
        setPetLoading(false);
      }
    })();
  }, [isModalOpen, petList]);

  // ============================= UI =============================
  return (
    <div className={styles.container}>
      {/* 상단 바 */}
      <div className={styles.topBar}>
        <h3 className={styles.title}>입양 후기</h3>

        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="입양 후기 제목 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value || "")}
          />
          <button className={styles.searchButton} type="submit">
            검색
          </button>
        </form>

        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setShowMyReviews(!showMyReviews)}
          style={{
            backgroundColor: showMyReviews ? "#7fad39" : "#fff",
            color: showMyReviews ? "#fff" : "#7fad39",
          }}
        >
          {showMyReviews ? "✓ 내 글 보기" : "내 글 보기"}
        </button>

        <button
          type="button"
          className={styles.writeBtn}
          onClick={() => setIsModalOpen(true)}
        >
          + 글 작성
        </button>
      </div>

      {/* 로딩 */}
      {loading && apiItems.length === 0 && (
        <div className={styles.loading}>불러오는 중...</div>
      )}

      {/* 카드 */}
      <section className={styles.reviewSection} aria-labelledby="review">
        <div className={styles.cardList}>
          {!loading && apiItems.length === 0 && (
            <div className={styles.empty}>
              아직 등록된 입양 후기가 없습니다.
              <br />
              <span style={{ fontSize: "14px", color: "#999", marginTop: "8px", display: "block" }}>
                첫 번째 입양 후기를 작성해보세요!
              </span>
            </div>
          )}

          {apiItems.map((item) => {
            const detailHref = `/review/${item.reviewId}`;
            const initial = item.memberName ? item.memberName[0] : "";
            const reviewImg = normalizeImageSrc(item.images as any);

            return (
              <div
                key={item.reviewId}
                className={styles.reviewCard}
              >
                <header className={styles.reviewCardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={styles.authorBadge} aria-hidden="true">
                      {initial}
                    </span>
                    <span className={styles.authorName}>{item.memberName}</span>
                  </div>
                  {showMyReviews && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.reviewId);
                      }}
                      aria-label="삭제"
                    >
                      🗑️
                    </button>
                  )}
                </header>

                <div
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(detailHref)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      router.push(detailHref);
                  }}
                  style={{ cursor: "pointer" }}
                >

                <div className={styles.reviewThumb}>
                  {reviewImg ? (
                    <Image
                      src={reviewImg}
                      alt={item.title}
                      width={384}
                      height={216}
                      className={styles.reviewImg}
                    />
                  ) : (
                    <div className={styles.noImage} aria-label="이미지 없음">
                      🖼️
                    </div>
                  )}
                </div>

                <div className={styles.reviewBody}>
                  <h4 className={styles.reviewTitle}>{item.title}</h4>
                  <p className={styles.reviewExcerpt}>{item.content}</p>

                  <div className={styles.reviewFooter}>
                    <span className={styles.petMeta}>
                      {item.petName} • {getBreedLabel(item)}
                    </span>

                    <div className={styles.engage}>
                      <span className={styles.icon} aria-hidden="true">
                        ♡
                      </span>
                      <span className={styles.count}>{item.likeCount}</span>
                      <span className={styles.dot} aria-hidden="true">
                        •
                      </span>
                      <span className={styles.icon} aria-hidden="true">
                        💬
                      </span>
                      <span className={styles.count}>{item.commentCount}</span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 페이지네이션 */}
      {!loading && apiItems.length > 0 && totalPages >= 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            aria-label="이전 페이지"
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
            aria-label="다음 페이지"
          >
            ›
          </button>
        </div>
      )}

      {/* ===== 글 작성 모달 ===== */}
      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeading}>입양 후기 작성</h3>
              <button
                className={styles.modalClose}
                aria-label="닫기"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              {/* 입양 완료된 동물 선택 */}
              <label htmlFor="pet_select" className={styles.fieldLabelRow}>
                <span>
                  입양 완료된 동물 선택{" "}
                  <span className={styles.requiredMark}>*</span>
                </span>
                <select
                  id="pet_select"
                  className={styles.select_full}
                  required
                  value={petId}
                  onChange={(e) => setPetId(e.target.value)}
                  disabled={
                    petLoading || (petList !== null && petList.length === 0)
                  }
                >
                  <option value="">
                    {petLoading ? "불러오는 중..." : "입양한 동물을 선택하세요"}
                  </option>
                  {petError === "" &&
                    (petList ?? []).map((p) => (
                      <option key={p.petId} value={String(p.petId)}>
                        {p.petName} - {getBreedLabel(p)}
                      </option>
                    ))}
                </select>
                <p className={styles.helperText}>
                  마이페이지에서 조회 가능한 입양 완료된 동물만 선택할 수
                  있습니다
                </p>
              </label>

              {/* 입양처 + 입양 날짜 */}
              <div className={styles.row2}>
                <label className={styles.fieldLabelCol} htmlFor="agency">
                  <span>
                    입양처 <span className={styles.requiredMark}>*</span>
                  </span>
                  <input
                    id="agency"
                    type="text"
                    className={styles.input_full}
                    placeholder="예: 서울동물보호소"
                    value={modalAdoptionAgency}
                    onChange={(e) => setModalAdoptionAgency(e.target.value)}
                    required
                  />
                </label>

                <label className={styles.fieldLabelCol} htmlFor="adopt_date">
                  <span>
                    입양 날짜 <span className={styles.requiredMark}>*</span>
                  </span>
                  <div className={styles.dateWrap}>
                    <input
                      id="adopt_date"
                      type="date"
                      className={`${styles.input_full} ${styles.dateInput}`}
                      value={modalAdoptionDate}
                      onChange={(e) => setModalAdoptionDate(e.target.value)}
                      required
                    />
                    <span className={styles.calIcon} aria-hidden>
                      📅
                    </span>
                  </div>
                </label>
              </div>

              {/* 제목 */}
              <label className={styles.fieldLabelRow} htmlFor="review_title">
                <span>
                  제목 <span className={styles.requiredMark}>*</span>
                </span>
                <input
                  id="review_title"
                  type="text"
                  className={styles.input_full}
                  placeholder="입양 후기 제목을 입력해주세요"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  required
                />
              </label>

              {/* 내용 */}
              <label className={styles.fieldLabelRow} htmlFor="review_detail">
                <span>
                  내용 <span className={styles.requiredMark}>*</span>
                </span>
                <textarea
                  id="review_detail"
                  className={styles.textarea}
                  placeholder="입양 후기 내용을 작성해주세요. 입양 후 어떻게 지내고 있는지, 함께한 특별한 순간들을 공유해주세요."
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  required
                />
              </label>

              {/* 사진 업로드 */}
              <div className={styles.fieldLabelRow}>
                <span>사진 업로드 (최대 5장)</span>
                <div>
                  <input
                    id="reviewImages"
                    type="file"
                    name="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className={styles.input_images_hidden}
                  />
                  <label htmlFor="reviewImages" className={styles.uploadBox}>
                    <span className={styles.plusIcon}>＋</span>
                  </label>
                  <p className={styles.helperText} style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                    💡 여러 장을 선택하려면 Ctrl(또는 Cmd) 키를 누른 채로 파일을 선택하세요
                  </p>

                  {images.length > 0 && (
                    <>
                      <div className={styles.previewGrid}>
                        {images.map((f, i) => {
                          const url = URL.createObjectURL(f);
                          return (
                            <div key={i} className={styles.previewItem}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={f.name} />
                            </div>
                          );
                        })}
                      </div>
                      <div className={styles.previewInfo}>
                        선택된 사진 {images.length}/5
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className={styles.modalButtons}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancel}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles.submitPrimary}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "업로드 중..." : "등록하기"}
                </button>
              </div>

              {/* 에러 안내 */}
              {petError && (
                <p
                  className={styles.error}
                  role="alert"
                  style={{ marginTop: 6 }}
                >
                  동물 목록을 불러오지 못했습니다. 새로고침해주세요.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
