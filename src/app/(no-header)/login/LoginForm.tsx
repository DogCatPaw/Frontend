"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.css";

/**
 * 로그인 폼 (클라이언트 컴포넌트)
 * - 지갑 연결 및 서명
 * - DID 기반 인증
 */
export default function LoginForm() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isAuthenticated, isLoading, error, errorCode, login } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/main");
    }
  }, [isAuthenticated, router]);

  // Redirect to signup if 401 (not registered)
  useEffect(() => {
    if (errorCode === 401) {
      alert("등록되지 않은 지갑 주소입니다. 회원가입 페이지로 이동합니다.");
      router.push("/signup");
    }
  }, [errorCode, router]);

  const handleLogin = async () => {
    const success = await login();
    if (success) {
      router.push("/main");
    }
  };

  return (
    <div className={styles.loginBox}>
      <div className={styles.header}>
        <h1 className={styles.title}>멍냥Paw 로그인</h1>
        <p className={styles.subtitle}>
          DID 기반 지갑 인증으로 안전하게 로그인하세요
        </p>
      </div>

      <div className={styles.content}>
        {/* Step 1: Connect Wallet */}
        <div className={styles.step}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>지갑 연결</h3>
            <p className={styles.stepDescription}>
              메타마스크 등의 지갑을 연결해주세요
            </p>
            <div className={styles.connectButtonWrapper}>
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Step 2: Sign & Login */}
        {isConnected && (
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>서명 및 로그인</h3>
              <p className={styles.stepDescription}>
                지갑 서명을 통해 본인 인증을 완료하세요
              </p>
              <div className={styles.walletInfo}>
                <span className={styles.walletLabel}>연결된 지갑:</span>
                <span className={styles.walletAddress}>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className={styles.loginButton}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </button>

              {error && (
                <div className={styles.error}>
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className={styles.info}>
          <p className={styles.infoText}>
            💡 멍냥Paw는 DID 기반 인증을 사용합니다.
            <br />
            지갑 주소를 통해 안전하게 본인 인증이 이루어집니다.
          </p>
        </div>

        {/* Signup Link */}
        <div className={styles.signupLink}>
          <p>
            계정이 없으신가요?{" "}
            <a href="/signup" className={styles.link}>
              회원가입하기 →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
