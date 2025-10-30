"use client";

import styles from "./page.module.css";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoryList, type ServerStory } from "@/lib/api/story/list";
import { postStory } from "@/lib/api/story/post";
import { deleteStory } from "@/lib/api/story/delete";
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

export default function Story() {
  const router = useRouter();

  // 검색
  const [keyword, setKeyword] = useState("");

  // 내 글 보기 필터
  const [showMyStories, setShowMyStories] = useState(false);

  // ============================= API =============================
  const [apiItems, setApiItems] = useState<ServerStory[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<Map<number, number | null>>(
    new Map([[1, null]])
  );

  const fetchStories = async (page: number) => {
    try {
      setLoading(true);
      setApiError("");

      const cursor = pageCursors.get(page) ?? null;

      // Access Token 가져오기
      const accessToken = getAccessToken();

      // 내 글 보기일 때 walletAddress 가져오기
      let walletAddress: string | undefined = undefined;
      if (showMyStories) {
        walletAddress = getStoredWalletAddress()?.toLowerCase();
        if (!walletAddress) {
          alert("로그인이 필요합니다!");
          setShowMyStories(false);
          router.push("/login");
          return;
        }
      }

      const res = await getStoryList({
        size: 9,
        cursorId: cursor ?? undefined,
        keyword: keyword.trim() || undefined,
        walletAddress: walletAddress,
      }, accessToken || undefined);

      setApiItems(res.result.stories);

      // 다음 페이지 cursor 저장
      if (res.result.nextCursor) {
        setPageCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(page + 1, res.result.nextCursor);
          return newMap;
        });
        if (page >= totalPages) {
          setTotalPages(page + 1);
        }
      } else {
        setTotalPages(page);
      }
    } catch (e: any) {
      console.error(e);
      setApiError(e?.message ?? "API 호출 실패");
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStories(page);
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

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
    fetchStories(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMyStories]);

  // ============================= 검색 =============================
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (keyword) qs.set("keyword", keyword.trim());
    router.replace(`?${qs.toString()}`, { scroll: false });

    // 페이지 1로 초기화
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
    fetchStories(1);
  };

  // ============================= 글 등록(모달) =============================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
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
    if (!modalTitle.trim() || !modalContent.trim() || !petId) {
      alert("필수 항목을 모두 입력해주세요.");
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
        console.log("📤 [Story] Uploading images...");
        const fileKeys = await handleImagesUpload(images, accessToken);
        imageString = fileKeys.join(",");
        console.log("✅ [Story] Images uploaded:", imageString);
      }

      // 2. 스토리 등록
      const payload = {
        petId: Number(petId),
        title: modalTitle.trim(),
        content: modalContent.trim(),
        images: imageString,
      };

      console.log("📤 [Story] Submitting story:", payload);

      const res = await postStory(payload as any, accessToken);
      if (!res?.isSuccess) throw new Error(res?.message || "등록 실패");

      alert("일지가 등록되었습니다.");
      setIsModalOpen(false);
      setModalTitle("");
      setModalContent("");
      setImages([]);
      setPetId("");

      // 페이지 1로 초기화
      setCurrentPage(1);
      setTotalPages(1);
      setPageCursors(new Map([[1, null]]));
      await fetchStories(1);
    } catch (err: any) {
      console.error("❌ [Story] Error:", err);
      alert(
        `등록 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================= 삭제 기능 =============================
  const handleDelete = async (storyId: number) => {
    if (!confirm("정말 이 일지를 삭제하시겠습니까?")) return;

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        alert("로그인이 필요합니다!");
        router.push("/login");
        return;
      }

      await deleteStory(storyId, accessToken);
      alert("일지가 삭제되었습니다.");

      // 현재 페이지 새로고침
      await fetchStories(currentPage);
    } catch (err: any) {
      console.error("❌ [Story] Delete error:", err);
      alert(`삭제 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`);
    }
  };

  // ============================= 동물 불러오기 =============================
  const [petList, setPetList] = useState<ServerPet[] | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState("");

  // 모달 열릴 때 최초 1회만 호출
  useEffect(() => {
    if (!isModalOpen) return;
    if (petList !== null) return; // 이미 가져왔으면 재호출 X

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
        <h3 className={styles.title}>스토리</h3>

        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="스토리 제목 검색"
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
          onClick={() => setShowMyStories(!showMyStories)}
          style={{
            backgroundColor: showMyStories ? "#7fad39" : "#fff",
            color: showMyStories ? "#fff" : "#7fad39",
          }}
        >
          {showMyStories ? "✓ 내 글 보기" : "내 글 보기"}
        </button>

        <button
          type="button"
          className={styles.writeBtn}
          onClick={() => setIsModalOpen(true)}
        >
          + 글 작성
        </button>
      </div>

      {/* 오류/로딩 */}
      {apiError && <div className={styles.error}>API 오류: {apiError}</div>}
      {loading && <div className={styles.loading}>불러오는 중...</div>}

      {/* 스토리 카드 */}
      <section className={styles.storySection} aria-labelledby="story">
        <div className={styles.cardList}>
          {!loading && apiItems.length === 0 && (
            <div className={styles.empty}>조건에 맞는 스토리가 없습니다.</div>
          )}

          {apiItems.map((item) => {
            const detailHref = `/story/${item.storyId}`;
            const initial = item.memberName ? item.memberName[0] : "";
            const storyImg = normalizeImageSrc(item.images as any);

            return (
              <div
                key={item.storyId}
                className={styles.storyCard}
              >
                <header className={styles.storyCardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={styles.authorBadge} aria-hidden="true">
                      {initial}
                    </span>
                    <span className={styles.authorName}>{item.memberName}</span>
                  </div>
                  {showMyStories && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.storyId);
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

                <div className={styles.storyThumb}>
                  {storyImg ? (
                    <Image
                      src={storyImg}
                      alt={item.title}
                      width={384}
                      height={216}
                      className={styles.storyImg}
                    />
                  ) : (
                    <div className={styles.noImage} aria-label="이미지 없음">
                      🖼️
                    </div>
                  )}
                </div>

                <div className={styles.storyBody}>
                  <h4 className={styles.storyTitle}>{item.title}</h4>
                  <p className={styles.storyExcerpt}>{item.content}</p>

                  <div className={styles.storyFooter}>
                    <span className={styles.petMeta}>
                      {item.petName} •{" "}
                      {BREED_LABEL_BY_CODE[item.breed as BreedCode]}
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

      {/* 글 작성 모달 */}
      {isModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeading}>일지 작성</h3>
              <button
                className={styles.modalClose}
                aria-label="닫기"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 제목 */}
              <label className={styles.fieldLabel} htmlFor="story_title">
                제목 <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="story_title"
                type="text"
                placeholder="제목을 입력하세요"
                value={modalTitle}
                className={styles.input_full}
                onChange={(e) => setModalTitle(e.target.value)}
                required
              />

              {/* 동물 선택 */}
              <label className={styles.fieldLabel} htmlFor="pet_select">
                등록한 동물 불러오기{" "}
                <span className={styles.requiredMark}>*</span>
              </label>

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
                  {petLoading ? "불러오는 중..." : "동물을 선택하세요"}
                </option>

                {/* 오류가 없고 목록이 있으면 옵션 렌더링 */}
                {petError === "" &&
                  (petList ?? []).map((p) => {
                    const breedLabel =
                      BREED_LABEL_BY_CODE[p.breed as BreedCode] ?? "기타";
                    // 화면 라벨: "골든이 - 골든 리트리버" 같은 형식
                    const label = `${p.petName} - ${breedLabel}`;
                    return (
                      <option key={p.petId} value={String(p.petId)}>
                        {label}
                      </option>
                    );
                  })}
              </select>
              {/* 안내/오류 메시지 */}
              {petError ? (
                <p className={styles.error} role="alert">
                  동물 목록을 불러오지 못했습니다. 새로고침해주세요.
                </p>
              ) : (
                <p className={styles.info}>
                  마이페이지에서 등록한 동물 중에서 선택할 수 있습니다
                </p>
              )}

              {/* 내용 */}
              <label className={styles.fieldLabel} htmlFor="story_detail">
                내용 <span className={styles.requiredMark}>*</span>
              </label>
              <textarea
                id="story_detail"
                value={modalContent}
                onChange={(e) => setModalContent(e.target.value)}
                placeholder="일지 내용을 작성해주세요."
                required
                className={styles.textarea}
              />

              {/* 업로드 */}
              <p className={styles.fieldLabel}>사진 업로드 (최대 5장)</p>

              <input
                id="storyImages"
                type="file"
                name="images"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className={styles.input_images_hidden}
              />
              <label htmlFor="storyImages" className={styles.uploadBox}>
                <span className={styles.plusIcon}>＋</span>
              </label>

              {/* 썸네일 미리보기 & 개수 */}
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
                  {isSubmitting ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
