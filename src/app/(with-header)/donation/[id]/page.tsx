"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getDonationDetail } from "@/lib/api/donation/detail";
import { getBoneBalance } from "@/lib/api/donation/donation";
import type { DonationDetailResponse } from "@/types/api";
import DonateModal from "@/components/donation/DonateModal";
import BoneChargeModal from "@/components/donation/BoneChargeModal";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.css";

export default function DonationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const donationId = parseInt(id);
  const { isAuthenticated } = useAuth();

  const [detail, setDetail] = useState<DonationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [currentBones, setCurrentBones] = useState<number>(0);
  const [selectedImage, setSelectedImage] = useState<number>(0);

  useEffect(() => {
    loadDetail();
    if (isAuthenticated) {
      loadBones();
    }
  }, [donationId, isAuthenticated]);

  const loadDetail = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getDonationDetail(donationId, { size: 20 });

      if (!response.isSuccess) {
        throw new Error(response.message || "후원 정보를 불러올 수 없습니다.");
      }

      if (response.result && !response.result.donationPost) {
        const data: any = response.result;

        // Calculate progress if backend returns 0
        const calculatedProgress = data.targetAmount > 0
          ? (data.currentAmount / data.targetAmount) * 100
          : 0;
        const finalProgress = data.progress > 0 ? data.progress : calculatedProgress;

        console.log("🔍 [Donation Detail] Progress calculation:", {
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          backendProgress: data.progress,
          calculatedProgress: calculatedProgress,
          finalProgress: finalProgress,
        });
        console.log("🔍 [Donation Detail] recentDonations raw data:", data.recentDonations);

        const transformedResult = {
          donationPost: {
            donationId: donationId,
            title: data.title,
            content: data.content,
            category: data.category,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount,
            progress: finalProgress,
            status: data.donationStatus,
            deadline: data.deadline,
            patronCount: data.patronCount || 0,
            donorCount: data.patronCount || 0,
            images: data.images ? [data.images] : [],
            petInfo: {
              name: data.petName,
              breed: data.breed,
              age: data.age,
              imageUrl: data.petImage,
            },
            guardianInfo: {
              name: data.guardianName || "익명",
              walletAddress: data.memberId,
              shelterName: data.shelterName || "",
              shelterLocation: data.shelterLocation || "",
            }
          },
          donationHistory: (data.recentDonations || []).map((d: any) => {
            console.log("🔍 [Donation Detail] Processing donation:", d);
            return {
              donorNickname: "익명", // 모든 후원자를 익명으로 표시
              amount: d.amount || d.donationAmount || 0,
              donatedAt: d.donatedAt || d.createdAt || new Date().toISOString(),
            };
          }),
          nextCursor: data.cursor
        };
        setDetail(transformedResult as any);
      } else if (response.result && response.result.donationPost) {
        setDetail(response.result);
      } else {
        throw new Error("후원 정보가 올바르지 않습니다.");
      }
    } catch (err: any) {
      setError(err.message || "후원 상세 정보를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBones = async () => {
    try {
      const response = await getBoneBalance();
      if (response.isSuccess && response.result) {
        const balanceInKRW = response.result.currentBoneBalance || response.result.currentBalance || 0;
        const balanceInBones = Math.floor(balanceInKRW / 1000);
        setCurrentBones(balanceInBones);
      }
    } catch (err) {
      console.error("Failed to load bones:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    return `${days}일 전`;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || "후원을 찾을 수 없습니다."}</div>
        <Link href="/donation" className={styles.backLink}>
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const { donationPost, donationHistory } = detail;
  const images = donationPost.images || [];
  const mainImage = images[selectedImage] || donationPost.petInfo?.imageUrl || "/images/placeholder.jpg";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/donation" className={styles.backButton}>
          <ArrowLeft size={20} />
          뒤로가기
        </Link>
      </div>

      {/* Main Content - 2 Column Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column - Image Gallery */}
        <div className={styles.imageSection}>
          {/* Main Image */}
          <div className={styles.mainImageWrapper}>
            <img
              src={mainImage}
              alt={donationPost.title}
              className={styles.mainImage}
            />
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className={styles.thumbnailGallery}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`${styles.thumbnail} ${selectedImage === idx ? styles.thumbnailActive : ""}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img src={img} alt={`${donationPost.title} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Donation Info */}
        <div className={styles.infoSection}>
          {/* Title and Category */}
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{donationPost.title}</h1>
            <span className={`${styles.statusBadge} ${styles.categoryBadge}`}>
              {donationPost.category === "MEDICAL" ? "의료비" :
               donationPost.category === "FOOD" ? "사료/급식" :
               donationPost.category === "SHELTER" ? "보호소 운영" : "기타"}
            </span>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min(donationPost.progress, 100)}%`,
                  minWidth: donationPost.progress > 0 ? '2px' : '0'
                }}
              />
            </div>
            <div className={styles.progressInfo}>
              <span className={styles.currentAmount}>
                {donationPost.currentAmount.toLocaleString()}원
              </span>
              <span className={styles.progressPercent}>
                {donationPost.progress >= 1
                  ? `${Math.floor(donationPost.progress)}%`
                  : `${donationPost.progress.toFixed(1)}%`
                }
              </span>
            </div>
            <div className={styles.targetInfo}>
              <span>목표: {donationPost.targetAmount.toLocaleString()}원</span>
              <span>후원자 {donationPost.patronCount || 0}명</span>
            </div>
          </div>

          {/* Pet Info Grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>품종</span>
              <span className={styles.infoValue}>{donationPost.petInfo?.breed || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>펫</span>
              <span className={styles.infoValue}>{donationPost.petInfo?.name || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>마감일</span>
              <span className={styles.infoValue}>{formatDate(donationPost.deadline)}</span>
            </div>
          </div>

          {/* Content */}
          <div className={styles.contentBox}>
            <h3 className={styles.contentTitle}>후원 상세 내용</h3>
            <p className={styles.contentText}>{donationPost.content}</p>
          </div>

          {/* Shelter Info */}
          {donationPost.guardianInfo?.shelterName && (
            <div className={styles.shelterInfo}>
              <h3 className={styles.shelterTitle}>
                {donationPost.guardianInfo?.shelterLocation} {donationPost.guardianInfo?.shelterName}
              </h3>
              <p className={styles.shelterSubtitle}>광주시 시구</p>
            </div>
          )}

          {/* Current Bones */}
          {isAuthenticated && (
            <div className={styles.bonesInfo}>
              <span>현재 잔여:</span>
              <span className={styles.bonesAmount}>🍖 {currentBones}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              className={styles.chargeButton}
              onClick={() => setShowChargeModal(true)}
            >
              뼈다귀 충전하기
            </button>
            <button
              className={styles.donateButton}
              onClick={() => setShowDonateModal(true)}
              disabled={!isAuthenticated}
            >
              후원하기
            </button>
          </div>
        </div>
      </div>

      {/* Donation History */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>후원해주신 분들</h2>
        <div className={styles.historyList}>
          {donationHistory && donationHistory.length > 0 ? (
            donationHistory.map((donor, idx) => (
              <div key={idx} className={styles.historyItem}>
                <div className={styles.donorAvatar}>
                  {donor.donorNickname.charAt(0)}
                </div>
                <div className={styles.donorInfo}>
                  <span className={styles.donorName}>{donor.donorNickname}</span>
                  <span className={styles.donorTime}>{formatTime(donor.donatedAt)}</span>
                </div>
                <span className={styles.donorAmount}>
                  {donor.amount.toLocaleString()}원
                </span>
              </div>
            ))
          ) : (
            <p className={styles.noHistory}>아직 후원 내역이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Modals */}
      <DonateModal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        donationId={donationId}
        campaignTitle={donationPost.title}
        onSuccess={() => {
          loadDetail();
          loadBones();
        }}
      />

      <BoneChargeModal
        isOpen={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        onSuccess={(bones, newBalance) => {
          setCurrentBones(Math.floor(newBalance / 1000));
          setShowChargeModal(false);
        }}
      />
    </div>
  );
}
