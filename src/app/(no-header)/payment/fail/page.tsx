"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import styles from "./page.module.css";

function PaymentFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <XCircle size={64} className={styles.errorIcon} />
        </div>

        <h1 className={styles.title}>결제 실패</h1>

        <div className={styles.errorBox}>
          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : (
            <p className={styles.errorMessage}>
              결제가 실패했습니다. 다시 시도해주세요.
            </p>
          )}

          {errorCode && (
            <p className={styles.errorCode}>오류 코드: {errorCode}</p>
          )}
        </div>

        <div className={styles.info}>
          <h3>결제 실패 원인</h3>
          <ul>
            <li>카드 한도 초과</li>
            <li>잘못된 카드 정보 입력</li>
            <li>네트워크 오류</li>
            <li>결제 취소</li>
            <li>시스템 오류</li>
          </ul>
        </div>

        <div className={styles.buttons}>
          <button
            className={styles.primaryButton}
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

        <div className={styles.helpText}>
          <p>
            문제가 지속되면 고객센터로 문의해주세요.
            <br />
            📧 support@mengnyangpaw.com
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconContainer}>
              <XCircle size={64} className={styles.errorIcon} />
            </div>
            <h1 className={styles.title}>로딩 중...</h1>
          </div>
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
