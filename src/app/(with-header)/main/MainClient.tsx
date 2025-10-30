"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import type {
  ServerAdoption,
  ServerDonation,
  ServerReview,
  ServerStory,
} from "@/lib/api/home";
import {
  BREED_LABEL,
  ADOPTION_STATUS_LABEL,
  DONATION_STATUS_LABEL,
  type BreedCode,
  type AdoptionStatus,
  type DonationStatus,
} from "@/types";
import { normalizeImageSrc } from "@/lib/utils/image";
import { loadHomeData } from "./actions";

/**
 * 메인 페이지 클라이언트 컴포넌트
 * - Server Action으로 데이터 로드
 * - 로딩 상태 관리
 * - 점진적 UI 렌더링
 */
export default function MainClient() {
  const [latestAdoptions, setLatestAdoptions] = useState<ServerAdoption[]>([]);
  const [closingSoonDonations, setClosingSoonDonations] = useState<ServerDonation[]>([]);
  const [popularReviews, setPopularReviews] = useState<ServerReview[]>([]);
  const [popularStories, setPopularStories] = useState<ServerStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await loadHomeData();
        setLatestAdoptions(data.latestAdoptions);
        setClosingSoonDonations(data.closingSoonDonations);
        setPopularReviews(data.popularReviews);
        setPopularStories(data.popularStories);
      } catch (error) {
        console.error("Failed to load home data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  return (
    <div className={styles.container}>
      {/* Hero 섹션 */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>
            한 마리의 유기동물도, 반려동물도 잊히지 않도록
          </h1>
          <p className={styles.subtitle}>
            DID를 통해 유기동물의 존재를 기록하고 입양과 후원을 연결하는 플랫폼
          </p>
          <Link href="/DID_info" className={styles.didButton}>
            DID 알아보기 →
          </Link>
        </div>
      </section>

      {/* 최신 입양 공고 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>최신 입양 공고</h2>
          <Link href="/adopt" className={styles.moreLink}>
            더보기 →
          </Link>
        </div>
        <div className={styles.grid}>
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.cardSkeleton}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonText} />
                  </div>
                </div>
              ))}
            </>
          ) : latestAdoptions.length === 0 ? (
            <p className={styles.emptyMessage}>데이터가 없습니다.</p>
          ) : (
            latestAdoptions.map((item) => (
              <Link
                key={item.adoptId}
                href={`/adopt/${item.adoptId}`}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={normalizeImageSrc(item.thumbnail) || "/placeholder-dog.jpg"}
                    alt={`${item.title || '입양 공고'}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className={styles.cardImage}
                  />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardInfo}>
                    {BREED_LABEL[item.breed as BreedCode] || item.breed}
                  </p>
                  <p className={styles.cardStatus}>
                    {ADOPTION_STATUS_LABEL[item.status as AdoptionStatus] || item.status}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* 마감 임박 후원 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>마감 임박 후원</h2>
          <Link href="/donation" className={styles.moreLink}>
            더보기 →
          </Link>
        </div>
        <div className={styles.grid}>
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.cardSkeleton}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonText} />
                  </div>
                </div>
              ))}
            </>
          ) : closingSoonDonations.length === 0 ? (
            <p className={styles.emptyMessage}>데이터가 없습니다.</p>
          ) : (
            closingSoonDonations.map((item) => (
              <Link
                key={item.donationId}
                href={`/donation/${item.donationId}`}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={normalizeImageSrc(item.thumbnail) || "/placeholder-dog.jpg"}
                    alt={`${item.title} 후원`}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className={styles.cardImage}
                  />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardProgress}>
                    {item.currentAmount?.toLocaleString() || 0}원 / {item.targetAmount?.toLocaleString() || 0}원
                  </p>
                  <p className={styles.cardStatus}>
                    {DONATION_STATUS_LABEL[item.donationStatus as DonationStatus] || item.donationStatus}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* 인기 스토리 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>인기 스토리</h2>
          <Link href="/story" className={styles.moreLink}>
            더보기 →
          </Link>
        </div>
        <div className={styles.grid}>
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.cardSkeleton}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonText} />
                  </div>
                </div>
              ))}
            </>
          ) : popularStories.length === 0 ? (
            <p className={styles.emptyMessage}>데이터가 없습니다.</p>
          ) : (
            popularStories.map((item) => (
              <Link
                key={item.storyId}
                href={`/story/${item.storyId}`}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={normalizeImageSrc(item.images) || "/placeholder-dog.jpg"}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className={styles.cardImage}
                  />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardMeta}>
                    좋아요 {item.likeCount} · 댓글 {item.commentCount}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* 인기 입양 후기 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>인기 입양 후기</h2>
          <Link href="/review" className={styles.moreLink}>
            더보기 →
          </Link>
        </div>
        <div className={styles.grid}>
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.cardSkeleton}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonText} />
                  </div>
                </div>
              ))}
            </>
          ) : popularReviews.length === 0 ? (
            <p className={styles.emptyMessage}>데이터가 없습니다.</p>
          ) : (
            popularReviews.map((item) => (
              <Link
                key={item.reviewId}
                href={`/review/${item.reviewId}`}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={normalizeImageSrc(item.images) || "/placeholder-dog.jpg"}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className={styles.cardImage}
                  />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardMeta}>
                    좋아요 {item.likeCount} · 댓글 {item.commentCount}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
