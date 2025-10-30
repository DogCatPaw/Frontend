"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { CheckCircle2, Loader2 } from "lucide-react";
import { approvePayment } from "@/lib/api/payment";
import { getBoneBalance } from "@/lib/api/donation/donation";
import styles from "./page.module.css";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const [status, setStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [result, setResult] = useState<{
    bones: number;
    newBalance: number;
    amount: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string>("");

  const handlePaymentApproval = useCallback(async () => {
    // Extract params from URL
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    // Validate params
    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setError("결제 정보가 올바르지 않습니다.");
      return;
    }

    if (!address) {
      setStatus("error");
      setError("지갑 주소를 찾을 수 없습니다.");
      return;
    }

    console.log("📤 [PaymentSuccess] Approving payment:", {
      paymentKey,
      orderId: orderId,
      amount: parseInt(amount),
      walletAddress: address,
    });

    try {
      // Approve payment
      const response = await approvePayment(
        {
          orderId: orderId,
          paymentKey: paymentKey,
          finalAmount: parseInt(amount),
        },
        address
      );

      if (!response.isSuccess) {
        throw new Error(response.message || "결제 승인에 실패했습니다.");
      }

      // Get package info to calculate bones
      const orderName = (response.result as any)?.orderName || "";
      const packageId = parseInt(orderName.match(/(\d+)뼈다귀/)?.[1] || "0");

      // Fetch updated balance
      const balanceResponse = await getBoneBalance();
      const balanceInKRW = balanceResponse.isSuccess
        ? (balanceResponse.result.currentBoneBalance || balanceResponse.result.currentBalance || 0)
        : 0;
      // Convert KRW to bones (1000 KRW = 1 bone)
      const newBalance = Math.floor(balanceInKRW / 1000);

      // Set success result
      const resultData = response.result as any;
      setResult({
        bones: packageId,
        newBalance: newBalance,
        amount: resultData.totalAmount || resultData.amount || parseInt(amount),
        message: resultData.message || "뼈다귀 충전이 완료되었습니다!",
      });
      setStatus("success");

      // Redirect to mypage after 3 seconds
      setTimeout(() => {
        router.push("/mypage");
      }, 3000);
    } catch (err: any) {
      console.error("Payment approval error:", err);
      setStatus("error");
      setError(err.message || "결제 승인 중 오류가 발생했습니다.");
    }
  }, [searchParams, address, router]);

  useEffect(() => {
    if (address) {
      handlePaymentApproval();
    } else {
      setStatus("error");
      setError("지갑 주소를 찾을 수 없습니다. 다시 로그인해주세요.");
    }
  }, [address, handlePaymentApproval]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === "loading" && (
          <>
            <div className={styles.iconContainer}>
              <Loader2 size={64} className={styles.spinner} />
            </div>
            <h1 className={styles.title}>결제 승인 중...</h1>
            <p className={styles.description}>
              잠시만 기다려주세요. 결제를 확인하고 있습니다.
            </p>
          </>
        )}

        {status === "success" && result && (
          <>
            <div className={styles.iconContainer}>
              <CheckCircle2 size={64} className={styles.successIcon} />
            </div>
            <h1 className={styles.title}>🎉 충전 완료!</h1>
            <p className={styles.description}>{result.message}</p>

            <div className={styles.resultBox}>
              <div className={styles.resultRow}>
                <span>충전된 뼈다귀</span>
                <strong>🍖 {result.bones}개</strong>
              </div>
              <div className={styles.resultRow}>
                <span>결제 금액</span>
                <strong>{result.amount.toLocaleString()}원</strong>
              </div>
              <div className={styles.resultRow}>
                <span>현재 잔액</span>
                <strong className={styles.balance}>
                  🍖 {result.newBalance}개
                </strong>
              </div>
            </div>

            <div className={styles.info}>
              <p>💡 3초 후 마이페이지로 이동합니다...</p>
            </div>

            <button
              className={styles.button}
              onClick={() => router.push("/mypage")}
            >
              마이페이지로 이동
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className={styles.iconContainer}>
              <div className={styles.errorIcon}>❌</div>
            </div>
            <h1 className={styles.title}>결제 승인 실패</h1>
            <p className={styles.errorMessage}>{error}</p>

            <div className={styles.buttons}>
              <button
                className={styles.button}
                onClick={() => router.push("/mypage")}
              >
                마이페이지로 이동
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => router.push("/donation")}
              >
                후원 페이지로 이동
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconContainer}>
              <Loader2 size={64} className={styles.spinner} />
            </div>
            <h1 className={styles.title}>결제 확인 중...</h1>
            <p className={styles.description}>
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
