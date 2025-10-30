"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { X, Heart } from "lucide-react";
import { BONE_PACKAGES } from "@/types";
import { getBoneBalance, makeDonation } from "@/lib/api/donation/donation";
import BoneChargeModal from "./BoneChargeModal";
import styles from "./DonateModal.module.css";

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationId: number;
  campaignTitle: string;
  onSuccess?: () => void;
}

export default function DonateModal({
  isOpen,
  onClose,
  donationId,
  campaignTitle,
  onSuccess,
}: DonateModalProps) {
  const { address } = useAccount();
  const [selectedPackage, setSelectedPackage] = useState<number>(2); // Default: 5 bones
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [error, setError] = useState<string>("");
  const [showChargeModal, setShowChargeModal] = useState(false);

  // Load bone balance when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBalance();
    }
  }, [isOpen]);

  const loadBalance = async () => {
    setIsLoadingBalance(true);
    setError("");

    try {
      console.log("🔍 [DonateModal] Loading bone balance...");
      const response = await getBoneBalance();
      console.log("📦 [DonateModal] Balance response:", response);

      if (response.isSuccess && response.result) {
        const balanceInKRW = response.result.currentBoneBalance || response.result.currentBalance || 0;
        // Convert KRW to bones (1000 KRW = 1 bone)
        const balanceInBones = Math.floor(balanceInKRW / 1000);
        console.log("✅ [DonateModal] Balance loaded:", balanceInKRW, "KRW =", balanceInBones, "bones");
        setCurrentBalance(balanceInBones);
      } else {
        console.error("❌ [DonateModal] Balance load failed:", response);
        setError("잔액 조회에 실패했습니다.");
        setCurrentBalance(0);
      }
    } catch (err: any) {
      console.error("❌ [DonateModal] Balance load error:", err);
      setError(err.message || "잔액을 불러올 수 없습니다.");
      setCurrentBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleDonate = async () => {
    const selectedBones = BONE_PACKAGES[selectedPackage].bones;

    // Check balance
    if (currentBalance < selectedBones) {
      setError(
        `뼈다귀가 부족합니다. ${selectedBones - currentBalance}개가 더 필요합니다.`
      );
      return;
    }

    // Check wallet address
    if (!address) {
      setError("지갑이 연결되지 않았습니다. 로그인해주세요.");
      return;
    }

    setIsDonating(true);
    setError("");

    try {
      console.log("📤 [DonateModal] Making donation:", {
        memberId: address.toLowerCase(),
        itemId: selectedPackage,
        donationId: donationId,
      });

      const response = await makeDonation({
        memberId: address.toLowerCase(), // Use wallet address instead of 0
        itemId: selectedPackage,
        donationId: donationId,
      });

      console.log("✅ [DonateModal] Donation response:", response);

      if (!response.isSuccess) {
        throw new Error(response.message || "후원에 실패했습니다.");
      }

      // Reload balance after donation
      await loadBalance();

      // Show success message
      alert(
        `🎉 ${selectedBones}개의 뼈다귀를 후원했습니다!\n남은 뼈다귀: ${currentBalance - selectedBones}개`
      );

      // Close modal and refresh
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Donation error:", err);
      setError(err.message || "후원 중 오류가 발생했습니다.");
    } finally {
      setIsDonating(false);
    }
  };

  const handleChargeSuccess = (bones: number, newBalance: number) => {
    setCurrentBalance(newBalance);
    setShowChargeModal(false);
    alert(`💰 ${bones}개의 뼈다귀가 충전되었습니다!`);
  };

  if (!isOpen) return null;

  const selectedBones = BONE_PACKAGES[selectedPackage]?.bones || 0;
  const isBalanceInsufficient = currentBalance < selectedBones;

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.header}>
            <h2>
              <Heart className={styles.heartIcon} size={24} />
              후원하기
            </h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="닫기"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* Current Balance */}
            <div className={styles.balanceCard}>
              <div className={styles.balanceRow}>
                <span>현재 보유 뼈다귀</span>
                {isLoadingBalance ? (
                  <span className={styles.loading}>조회 중...</span>
                ) : (
                  <strong className={styles.balance}>
                    🍖 {currentBalance}개
                  </strong>
                )}
              </div>
              <button
                className={styles.chargeLink}
                onClick={() => setShowChargeModal(true)}
              >
                뼈다귀 충전하기 →
              </button>
            </div>

            {/* Package Selection */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>후원할 뼈다귀 선택</p>

              <div className={styles.packages}>
                {Object.entries(BONE_PACKAGES).map(([id, pkg]) => (
                  <button
                    key={id}
                    className={`${styles.package} ${
                      selectedPackage === parseInt(id) ? styles.selected : ""
                    }`}
                    onClick={() => setSelectedPackage(parseInt(id))}
                  >
                    <div className={styles.packageLabel}>{pkg.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>후원할 뼈다귀</span>
                <strong>🍖 {selectedBones}개</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>후원 후 잔액</span>
                <strong
                  className={isBalanceInsufficient ? styles.insufficient : ""}
                >
                  🍖 {currentBalance - selectedBones}개
                </strong>
              </div>
            </div>

            {/* Error Message */}
            {error && <div className={styles.error}>{error}</div>}

            {/* Donate Button */}
            {isBalanceInsufficient ? (
              <button
                className={styles.chargeButton}
                onClick={() => setShowChargeModal(true)}
              >
                뼈다귀 충전하고 후원하기
              </button>
            ) : (
              <button
                className={styles.donateButton}
                onClick={handleDonate}
                disabled={isDonating || isLoadingBalance}
              >
                {isDonating ? "후원 중..." : `🍖 ${selectedBones}개 후원하기`}
              </button>
            )}

            {/* Info */}
            <div className={styles.info}>
              <p>💡 후원한 뼈다귀는 취소할 수 없습니다.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bone Charge Modal */}
      <BoneChargeModal
        isOpen={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        onSuccess={handleChargeSuccess}
      />
    </>
  );
}
