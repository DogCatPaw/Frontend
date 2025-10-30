"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { BONE_PACKAGES } from "@/types";
import { preparePayment } from "@/lib/api/payment";
import styles from "./BoneChargeModal.module.css";

// Toss Payments SDK types
declare global {
  interface Window {
    TossPayments: any;
  }
}

interface BoneChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bones: number, newBalance: number) => void;
}

export default function BoneChargeModal({
  isOpen,
  onClose,
  onSuccess,
}: BoneChargeModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<number>(2); // Default: 5 bones
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const tossPaymentsRef = useRef<any>(null);

  // Load Toss Payments SDK
  useEffect(() => {
    if (!isOpen) return;

    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (window.TossPayments) {
          resolve(window.TossPayments);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://js.tosspayments.com/v1";
        script.async = true;
        script.onload = () => resolve(window.TossPayments);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    loadScript()
      .then(() => {
        const clientKey = "test_ck_ORzdMaqN3wPB1JpjlYxgV5AkYXQG";
        if (window.TossPayments) {
          tossPaymentsRef.current = window.TossPayments(clientKey);
          console.log("✅ [BoneChargeModal] Toss Payments loaded");
        }
      })
      .catch((err) => {
        console.error("❌ [BoneChargeModal] Failed to load Toss Payments:", err);
        setError("결제 시스템 로딩에 실패했습니다.");
      });
  }, [isOpen]);

  const handleCharge = async () => {
    if (!selectedPackage) {
      setError("패키지를 선택해주세요.");
      return;
    }

    if (!tossPaymentsRef.current) {
      setError("결제 시스템을 로딩하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Step 1: Prepare payment
      console.log("📤 [BoneChargeModal] Preparing payment for package:", selectedPackage);
      const response = await preparePayment(selectedPackage);
      console.log("📦 [BoneChargeModal] Prepare response:", response);

      if (!response.isSuccess || !response.result) {
        throw new Error(response.message || "결제 준비에 실패했습니다.");
      }

      const { orderId, orderName, totalAmount } = response.result;
      console.log("✅ [BoneChargeModal] Order prepared:", {
        orderId,
        orderName,
        totalAmount,
      });

      // Step 2: Launch Toss Payments
      const currentUrl = window.location.origin;

      // Prepare orderName with fallback
      const finalOrderName = orderName || `🍖 ${BONE_PACKAGES[selectedPackage].bones} 뼈다귀`;

      const paymentRequest = {
        method: "CARD",
        amount: totalAmount,
        orderId: orderId,
        orderName: finalOrderName,
        customerEmail: "test@example.com",
        customerName: "멍냥Paw 사용자",
        successUrl: `${currentUrl}/payment/success`,
        failUrl: `${currentUrl}/payment/fail`,
      };

      console.log("💳 [BoneChargeModal] Launching Toss Payments with request:", paymentRequest);
      await tossPaymentsRef.current.requestPayment(paymentRequest);
    } catch (err: any) {
      console.error("❌ [BoneChargeModal] Payment error:", err);
      setError(err.message || "결제 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2>뼈다귀 충전하기</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={24} />
          </button>
        </div>

        {/* Package Selection */}
        <div className={styles.content}>
          <p className={styles.description}>
            충전할 뼈다귀 개수를 선택해주세요
          </p>

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
                <div className={styles.packagePrice}>
                  {pkg.price.toLocaleString()}원
                </div>
              </button>
            ))}
          </div>

          {/* Selected Package Summary */}
          {selectedPackage && (
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>선택한 패키지</span>
                <strong>{BONE_PACKAGES[selectedPackage].label}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>결제 금액</span>
                <strong className={styles.amount}>
                  {BONE_PACKAGES[selectedPackage].price.toLocaleString()}원
                </strong>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Charge Button */}
          <button
            className={styles.chargeButton}
            onClick={handleCharge}
            disabled={isLoading || !selectedPackage}
          >
            {isLoading ? "결제 준비 중..." : "충전하기"}
          </button>

          {/* Info */}
          <div className={styles.info}>
            <p>💡 테스트 모드로 실제 결제가 진행되지 않습니다.</p>
            <p>• 충전된 뼈다귀는 후원에만 사용할 수 있습니다.</p>
            <p>• 충전 후 환불은 불가능합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
