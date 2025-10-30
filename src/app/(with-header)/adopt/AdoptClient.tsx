"use client";

import styles from "./page.module.css";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdoptionList, type ServerAdoption } from "@/lib/api/adopt/adoption";
import { postAdoption } from "@/lib/api/adopt/post";
import { getMyPets } from "@/lib/api/pet";
import { getAccessToken } from "@/lib/api/auth";
import { handleImagesUpload } from "@/lib/utils/upload";
import {
  RegionCode,
  REGION_LABEL,
  DISTRICTS,
  BreedCode,
  BREED_LABEL,
  AdoptionStatus,
  ADOPTION_STATUS_LABEL,
} from "@/types";

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
  if (/^[\w\-./]+$/.test(src)) {
    return "/" + src.replace(/^\/+/, "");
  }

  // 그 외는 사용 불가 → 폴백
  return null;
}

interface SpringPet {
  petId: number;
  did: string;
  petProfile?: string;
  petName: string;
  old?: number;
  gender?: string;
  breed?: string;
}

interface AdoptClientProps {
  initialAdoptions: ServerAdoption[];
  initialNextCursor: number | null;
}

export default function AdoptClient({
  initialAdoptions,
  initialNextCursor,
}: AdoptClientProps) {
  const router = useRouter();

  // 글 작성
  const [IsModalOpen, setIsModalOpen] = useState(false);
  const [modalPetId, setModalPetId] = useState(""); // Pet Id
  const [modalTitle, setModalTitle] = useState(""); // 제목
  const [modalContent, setModalContent] = useState(""); // 내용
  const [modalRegion, setModalRegion] = useState<RegionCode | "">(""); // 광역시/도
  const [modalDistrict, setNodalDistrict] = useState(""); // 시군구

  // 에러 모달
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 광역시/도에 따른 시군구 옵션
  const modalSigunguOptions = useMemo(() => {
    if (!modalRegion) return [];
    return DISTRICTS[modalRegion] ?? [];
  }, [modalRegion]);

  // 광역시/도가 변경되면 시군구 초기화
  useEffect(() => {
    setNodalDistrict("");
  }, [modalRegion]);
  const [modalShelterName, setNodalShelterName] = useState(""); // 보호소명
  const [modalContact, setModalContact] = useState(""); // 연락처
  const [modalDeadline, setModalDeadline] = useState(""); // 모집 기한

  // 연락처 자동 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");

    // 최대 11자리
    const limited = numbers.slice(0, 11);

    // 포맷팅
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
    }
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setModalContact(formatted);
  };

  // 로컬 타임존 기준 YYYY-MM-DD (UTC 오프셋 보정)
  const todayLocal = () => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tz).toISOString().slice(0, 10);
  };

  // 검색어
  const [sido, setSido] = useState<RegionCode | "">("");
  const [sigungu, setSigungu] = useState("");
  const [breed, setBreed] = useState<BreedCode | "">("");
  const [keywordInput, setKeywordInput] = useState("");

  const sidoOptions = Object.entries(REGION_LABEL);
  const sigunguOptions = useMemo(() => {
    if (!sido) return [];
    return DISTRICTS[sido] ?? [];
  }, [sido]);

  // API - 초기 데이터를 props에서 받아서 사용
  const [apiItems, setApiItems] = useState<ServerAdoption[]>(initialAdoptions);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<Map<number, number | null>>(
    new Map([[1, null]]) // 첫 페이지는 cursor가 null
  );

  // API 호출 함수 (페이지 기반)
  const fetchAdoptions = async (page: number) => {
    try {
      setLoading(true);
      setApiError("");

      // 해당 페이지의 cursor 가져오기
      const cursor = pageCursors.get(page) ?? null;

      const res = await getAdoptionList({
        size: 9,
        cursor: cursor ?? undefined,
        breed: breed || undefined,
        region: sido || undefined,
        district: sigungu || undefined,
        keyword: keywordInput.trim() || undefined,
      });

      setApiItems(res.result.adoptions);

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

  // 검색 제출: URL 동기화 → API 새 호출
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // URL 쿼리 갱신
    const qs = new URLSearchParams();
    if (breed) qs.set("breed", breed);
    if (sido) qs.set("sido", sido);
    if (sigungu) qs.set("sigungu", sigungu);
    if (keywordInput.trim()) qs.set("keyword", keywordInput.trim());

    router.replace(`?${qs.toString()}`, { scroll: false });

    // 페이지 1로 초기화
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));

    // 새 검색 실행
    fetchAdoptions(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAdoptions(page);
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

  // 글 등록 시 '등록' 버튼 누르면 동작
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 간단 검증
    if (
      !modalPetId ||
      !modalTitle.trim() ||
      !modalRegion ||
      !modalDistrict.trim() ||
      !modalShelterName.trim() ||
      !modalContact.trim() ||
      !modalDeadline
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
          console.log("📤 [Adopt] Uploading images...");
          const uploadedKeys = await handleImagesUpload(images, accessToken);
          // 쉼표로 구분된 문자열로 변환
          imageString = uploadedKeys.join(",");
          console.log("✅ [Adopt] Images uploaded:", imageString);
        } catch (uploadError: any) {
          alert(`이미지 업로드 실패: ${uploadError.message}`);
          return;
        }
      }

      // 2. 입양 공고 등록
      const payload = {
        petId: Number(modalPetId),
        title: modalTitle.trim(),
        content: modalContent.trim(),
        region: modalRegion as any, // ServerRegion
        district: modalDistrict.trim(),
        shelterName: modalShelterName.trim(),
        contact: modalContact.trim(),
        deadLine: modalDeadline, // type="date"면 YYYY-MM-DD 포맷으로 옴
        status: "ACTIVE" as const, // 초기 상태는 ACTIVE로 등록
        images: imageString,
      };

      console.log("📋 [Adopt] Posting adoption:", payload);
      const res = await postAdoption(payload, accessToken);
      if (!res?.isSuccess) {
        throw new Error(res?.message || "등록 실패");
      }

      alert("입양 공고가 등록되었습니다.");

      // 모달 닫기 + 값 리셋
      setIsModalOpen(false);
      setModalPetId("");
      setModalTitle("");
      setModalContent("");
      setModalRegion("");
      setNodalDistrict("");
      setNodalShelterName("");
      setModalContact("");
      setModalDeadline("");
      setImages([]);

      // 목록 새로고침 (첫 페이지부터)
      setCurrentPage(1);
      setTotalPages(1);
      setPageCursors(new Map([[1, null]]));
      await fetchAdoptions(1);
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

  // ================= 이미지 5개 제한
  const [images, setImages] = useState<File[]>([]);
  // 파일 변경 핸들러
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 5) {
      alert("사진은 최대 5장까지 업로드할 수 있습니다. 다시 선택해주세요.");

      // 입력 초기화
      e.target.value = "";
      setImages([]);
      return;
    } else {
      setImages(files);
    }
  }

  // ============================= 동물 불러오기 (Spring API) =============================
  const [petList, setPetList] = useState<SpringPet[] | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState("");

  // 페이지 로드 시 펫 리스트 미리 가져오기 (로그인한 경우에만)
  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      // 로그인 안 했으면 가져오지 않음
      return;
    }

    if (petList !== null) return; // 이미 가져왔으면 재호출 X

    (async () => {
      try {
        setPetLoading(true);
        setPetError("");

        const res = await getMyPets(accessToken);
        console.log("📋 [Adopt] Loaded my pets:", res);
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

  return (
    <div className={styles.container}>
      {/* 제목 + 버튼 한 줄 */}
      <div className={styles.headerRow}>
        <h3 className={styles.title}>입양 공고</h3>
        <button
          type="button"
          className={styles.writeBtn}
          onClick={() => setIsModalOpen(true)}
        >
          + 글 작성
        </button>
      </div>

      {/* 검색 바 */}
      <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
        <select
          className={styles.select}
          value={sido}
          onChange={(e) => {
            setSido((e.target.value || "") as RegionCode | "");
            setSigungu("");
          }}
        >
          <option value="">광역시/도</option>
          {sidoOptions.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={sigungu}
          onChange={(e) => setSigungu(e.target.value || "")}
          disabled={!sido}
        >
          <option>시/군/구</option>
          {sigunguOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={breed}
          onChange={(e) => setBreed((e.target.value || "") as BreedCode | "")}
        >
          <option>품종 선택</option>
          {Object.entries(BREED_LABEL).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <input
          className={styles.input}
          type="text"
          placeholder="검색어 입력"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value || "")}
        />

        <button type="submit" className={styles.submitBtn}>
          검색
        </button>
      </form>

      {/* API 오류 표시 */}
      {apiError && <div className={styles.error}>API 오류: {apiError}</div>}

      {/* 로딩 표시 */}
      {loading && <div className={styles.loading}>불러오는 중...</div>}

      {/* 카드 */}
      <section className={styles.adoptSection}>
        <div className={styles.cardList}>
          {!loading && apiItems.length === 0 && (
            <div className={styles.empty}>
              조건에 맞는 입양 공고가 없습니다.
            </div>
          )}

          {apiItems.map((item) => {
            const thumb = normalizeImageSrc(item.thumbnail);
            const detailHref = `/adopt/${item.adoptId}`;

            return (
              <div
                key={item.adoptId}
                className={styles.card}
                role="link"
                tabIndex={0}
                onClick={() => router.push(detailHref)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    router.push(detailHref);
                }}
              >
                <div className={styles.imageWrapper}>
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={item.title}
                      width={300}
                      height={200}
                      className={styles.petImage}
                    />
                  ) : (
                    <div className={styles.noImage}>
                      <span className={styles.noImageIcon}>🖼️</span>
                    </div>
                  )}
                  {/* 입양 상태 배지 */}
                  <span className={styles.statusBadge}>
                    {ADOPTION_STATUS_LABEL[item.status as AdoptionStatus]}
                  </span>
                </div>

                <div className={styles.cardContent}>
                  <h3 className={styles.petName}>{item.title}</h3>
                  <p className={styles.petInfo}>
                    {BREED_LABEL[item.breed as BreedCode] || item.breed}
                    {item.old ? ` · ${item.old}살` : ""}
                    {item.color ? ` · ${item.color}` : ""}
                  </p>
                  <p className={styles.location}>
                    {REGION_LABEL[item.region]} {item.district}
                  </p>
                  <p className={styles.shelter}>{item.shelterName}</p>
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
        {IsModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>입양 공고 작성</h3>
              <form onSubmit={handleSubmit}>
                <p className={styles.modal_title}>공고 제목 *</p>
                <input
                  type="text"
                  placeholder="입양 공고 제목을 입력하세요"
                  value={modalTitle}
                  className={styles.input_full}
                  onChange={(e) => setModalTitle(e.target.value)}
                  required
                />

                <p className={styles.modal_title}>등록한 동물 불러오기 *</p>
                <select
                  id="pet_select"
                  className={styles.select_full}
                  required
                  value={modalPetId}
                  onChange={(e) => setModalPetId(e.target.value)}
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
                        BREED_LABEL[p.breed as BreedCode] ?? "기타";
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

                <h4 className={styles.sectionTitle}>보호소 정보</h4>

                {/* 광역시/도 + 시/군/구 */}
                <div className={styles.row}>
                  <div className={styles.col}>
                    <p className={styles.modal_title}>광역시/도 *</p>
                    <select
                      value={modalRegion}
                      onChange={(e) =>
                        setModalRegion(e.target.value as RegionCode | "")
                      }
                      required
                      className={styles.select_full}
                    >
                      <option value="">선택하세요</option>
                      {Object.entries(REGION_LABEL).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.col}>
                    <p className={styles.modal_title}>시/군/구 *</p>
                    <select
                      value={modalDistrict}
                      onChange={(e) => setNodalDistrict(e.target.value)}
                      required
                      className={styles.select_full}
                      disabled={!modalRegion}
                    >
                      <option value="">
                        {modalRegion
                          ? "선택하세요"
                          : "광역시/도를 먼저 선택하세요"}
                      </option>
                      {modalSigunguOptions.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 보호소명 */}
                <div className={styles.row}>
                  <div className={styles.colFull}>
                    <p className={styles.modal_title}>보호소명 *</p>
                    <input
                      type="text"
                      value={modalShelterName}
                      onChange={(e) => setNodalShelterName(e.target.value)}
                      required
                      className={styles.input_full}
                      placeholder="예: 멍냥보호소"
                    />
                  </div>
                </div>

                {/* 연락처 + 모집기한 */}
                <div className={styles.row}>
                  <div className={styles.col}>
                    <p className={styles.modal_title}>연락처 *</p>
                    <input
                      type="tel"
                      value={modalContact}
                      onChange={handleContactChange}
                      required
                      className={styles.input_full}
                      placeholder="010-1234-5678"
                      maxLength={13}
                    />
                  </div>

                  <div className={styles.col}>
                    <p className={styles.modal_title}>모집기한 *</p>
                    <input
                      type="date"
                      value={modalDeadline}
                      onChange={(e) => setModalDeadline(e.target.value)}
                      min={todayLocal()} // 오늘 이전 선택 불가
                      required
                      className={styles.input_full}
                    />
                  </div>
                </div>

                <h4 className={styles.sectionTitle}>입양 공고 상세</h4>
                <textarea
                  name="adoption_detail"
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  placeholder="입양을 위해 자세한 정보를 작성해주세요."
                />

                <p className={styles.modal_title}>사진 업로드(최대 5장)</p>
                <input
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className={styles.input_images}
                />

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
                    setIsModalOpen(false); // 글 작성 모달도 닫기
                    // 페이지 새로고침하여 목록 갱신
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
