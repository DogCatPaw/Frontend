"use client";

import { useState, useEffect } from "react";
import { MapPin, Phone, Clock, ExternalLink } from "lucide-react";
import { getShelterList } from "@/lib/api/shelter";
import type { Shelter, ShelterListParams } from "@/types/api";
import { REGION_LABEL, DISTRICTS } from "@/types";
import styles from "./page.module.css";

export default function ShelterPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Filter states
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageCursors, setPageCursors] = useState<Map<number, number | null>>(
    new Map([[1, null]]) // 1페이지는 cursor 없음
  );

  useEffect(() => {
    loadShelters(currentPage);
  }, [currentPage]);

  const loadShelters = async (page: number) => {
    setIsLoading(true);
    setError("");

    try {
      // 해당 페이지의 커서 가져오기
      const cursor = pageCursors.get(page) ?? null;

      const params: ShelterListParams = {
        size: 8,
        cursor: cursor ?? undefined,
      };

      if (selectedRegion) params.region = selectedRegion;
      if (selectedDistrict) params.district = selectedDistrict;
      if (keyword.trim()) params.keyword = keyword.trim();

      const response = await getShelterList(params);

      if (!response.isSuccess) {
        throw new Error(response.message || "보호소 목록을 불러올 수 없습니다.");
      }

      setShelters(response.result.shelters || []);

      // 다음 페이지 커서 저장
      if (response.result.nextCursor) {
        setPageCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(page + 1, response.result.nextCursor);
          return newMap;
        });
        // 다음 페이지가 있으면 총 페이지 수 업데이트
        if (page >= totalPages) {
          setTotalPages(page + 1);
        }
      }
    } catch (err: any) {
      setError(err.message || "보호소 목록을 불러오는데 실패했습니다.");
      setShelters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색 시 페이지네이션 초기화
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
    loadShelters(1);
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
    setSelectedDistrict(""); // Reset district when region changes
    // 지역 변경 시 자동 검색
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
    // 시군구 변경 시 자동 검색
    setCurrentPage(1);
    setTotalPages(1);
    setPageCursors(new Map([[1, null]]));
  };

  // 필터 변경 시 자동 검색
  useEffect(() => {
    if (currentPage === 1) {
      loadShelters(1);
    }
  }, [selectedRegion, selectedDistrict]);

  // 페이지네이션 함수들
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

  const availableDistricts = selectedRegion
    ? DISTRICTS[selectedRegion as keyof typeof DISTRICTS] || []
    : [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>보호소</h1>
      </div>

      {/* Search & Filter Form */}
      <form className={styles.searchForm} onSubmit={handleSearch}>
        <select
          className={styles.select}
          value={selectedRegion}
          onChange={handleRegionChange}
        >
          <option value="">광역시/도</option>
          {Object.entries(REGION_LABEL).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={selectedDistrict}
          onChange={handleDistrictChange}
          disabled={!selectedRegion}
        >
          <option value="">시/군/구</option>
          {availableDistricts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="보호소를 또는 지역 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <button type="submit" className={styles.searchButton}>
          검색
        </button>
      </form>

      {/* Loading State */}
      {isLoading && shelters.length === 0 && (
        <div className={styles.loading}>로딩 중...</div>
      )}

      {/* Error State */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Shelter List */}
      {!isLoading && shelters.length === 0 && !error && (
        <div className={styles.empty}>검색 결과가 없습니다.</div>
      )}

      <div className={styles.shelterList}>
        {shelters.map((shelter) => (
          <div key={shelter.shelterId} className={styles.shelterCard}>
            <h2 className={styles.shelterName}>{shelter.shelterName}</h2>

            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <MapPin size={16} className={styles.icon} />
                <span className={styles.infoText}>
                  {REGION_LABEL[shelter.region as keyof typeof REGION_LABEL] || shelter.region}{" "}
                  {shelter.district}
                </span>
              </div>

              <div className={styles.infoRow}>
                <MapPin size={16} className={styles.icon} />
                <span className={styles.infoText}>{shelter.address}</span>
              </div>

              <div className={styles.infoRow}>
                <Phone size={16} className={styles.icon} />
                <span className={styles.infoText}>{shelter.contact}</span>
              </div>

              {shelter.availableAnimals && (
                <div className={styles.infoRow}>
                  <Clock size={16} className={styles.icon} />
                  <span className={styles.infoText}>
                    보유 동물: {shelter.availableAnimals}마리
                  </span>
                </div>
              )}

              {shelter.website && (
                <div className={styles.infoRow}>
                  <ExternalLink size={16} className={styles.icon} />
                  <a
                    href={shelter.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.websiteLink}
                  >
                    웹사이트 방문
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {!isLoading && shelters.length > 0 && totalPages > 1 && (
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
    </div>
  );
}
