"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getPetById, getPetHistory } from "@/lib/api/pet";
import { getAccessToken } from "@/lib/api/auth";
import styles from "./page.module.css";

interface SpringPet {
  petId: number;
  did: string; // Pet DID
  petProfile?: string; // Profile image URL
  petName: string;
  old?: number; // Age
  gender?: string;
  breed?: string;
}

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [pet, setPet] = useState<SpringPet | null>(null);
  const [history, setHistory] = useState<any>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parameter name is "did" but we're treating it as petId now
  const petId = parseInt(params.did as string, 10);

  // Load pet info from Spring Backend
  useEffect(() => {
    const loadPet = async () => {
      if (isNaN(petId)) {
        setError("유효하지 않은 펫 ID입니다.");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setError("로그인이 필요합니다.");
        return;
      }

      setPetLoading(true);
      setError(null);

      try {
        const petData = await getPetById(petId, token);
        console.log("📋 [PetDetail] Loaded pet:", petData);
        setPet(petData);
      } catch (err: any) {
        console.error("Failed to load pet:", err);
        setError(err.message || "펫 정보를 불러올 수 없습니다.");
      } finally {
        setPetLoading(false);
      }
    };

    if (isAuthenticated && !isNaN(petId)) {
      loadPet();
    }
  }, [isAuthenticated, petId]);

  // Load pet history from blockchain (if did is available)
  useEffect(() => {
    const loadHistory = async () => {
      if (!pet?.did) {
        console.log("⚠️ [PetDetail] No DID available, skipping history");
        return;
      }

      const token = getAccessToken();
      if (!token) return;

      setHistoryLoading(true);
      try {
        const historyData = await getPetHistory(pet.did, token);
        console.log("📜 [PetDetail] Loaded history:", historyData);
        setHistory(historyData);
      } catch (err: any) {
        console.error("Failed to load history:", err);
        // History is optional, don't set error
      } finally {
        setHistoryLoading(false);
      }
    };

    if (isAuthenticated && pet) {
      loadHistory();
    }
  }, [isAuthenticated, pet]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || petLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>❌ {error}</p>
          <button onClick={() => router.push("/mypage")} className={styles.backBtn}>
            마이페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>펫 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← 돌아가기
        </button>
        <h1 className={styles.title}>펫 상세 정보</h1>
      </div>

      {/* Pet Info Card */}
      <div className={styles.petCard}>
        <div className={styles.petHeader}>
          {pet.petProfile ? (
            <img
              src={pet.petProfile}
              alt={pet.petName}
              className={styles.petImage}
            />
          ) : (
            <div className={styles.petAvatar}>
              {(pet.petName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.petHeaderInfo}>
            <h2 className={styles.petName}>{pet.petName || "이름 없음"}</h2>
            <p className={styles.petSpecies}>
              🐾 반려동물
            </p>
          </div>
        </div>

        <div className={styles.petDetails}>
          {pet.breed && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>품종</span>
              <span className={styles.detailValue}>{pet.breed}</span>
            </div>
          )}
          {pet.old !== undefined && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>나이</span>
              <span className={styles.detailValue}>{pet.old}살</span>
            </div>
          )}
          {pet.gender && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>성별</span>
              <span className={styles.detailValue}>
                {pet.gender === "MALE" ? "수컷" :
                 pet.gender === "FEMALE" ? "암컷" : "미상"}
              </span>
            </div>
          )}
          {pet.did && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Pet DID</span>
              <span className={styles.detailValue}>{pet.did}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ownership History */}
      {pet.did && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📜 소유권 이전 히스토리</h2>
          {historyLoading ? (
            <div className={styles.historyLoading}>
              <div className={styles.spinner}></div>
              <p>히스토리를 불러오는 중...</p>
            </div>
          ) : history && history.success ? (
            <div className={styles.historyCard}>
              <div className={styles.historyItem}>
                <span className={styles.historyLabel}>현재 소유자</span>
                <span className={styles.historyValue}>
                  {user?.guardianInfo?.name || "정보 없음"}
                </span>
              </div>
              <div className={styles.historyItem}>
                <span className={styles.historyLabel}>총 이전 횟수</span>
                <span className={styles.historyValue}>
                  {history.transferCount || 0}회
                </span>
              </div>
              {history.transfers && history.transfers.length > 0 && (
                <div className={styles.transferList}>
                  <h3 className={styles.transferTitle}>이전 내역</h3>
                  {history.transfers.map((transfer: any, index: number) => (
                    <div key={index} className={styles.transferItem}>
                      <div className={styles.transferInfo}>
                        <span className={styles.transferFrom}>
                          From: {transfer.from?.slice(0, 10)}...{transfer.from?.slice(-8)}
                        </span>
                        <span className={styles.transferArrow}>→</span>
                        <span className={styles.transferTo}>
                          To: {transfer.to?.slice(0, 10)}...{transfer.to?.slice(-8)}
                        </span>
                      </div>
                      <div className={styles.transferMeta}>
                        <span>Block: {transfer.blockNumber}</span>
                        <span>TX: {transfer.transactionHash?.slice(0, 10)}...</span>
                        {transfer.timestamp && (
                          <span>{new Date(transfer.timestamp).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.historyEmpty}>
              <p>소유권 이전 히스토리가 없습니다.</p>
              <p className={styles.historyHint}>
                이 펫은 처음 등록된 이후 소유권 이전이 없었습니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Blockchain Info */}
      {pet.did && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🔗 블록체인 정보</h2>
          <div className={styles.blockchainCard}>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>네트워크</span>
              <span className={styles.blockchainValue}>Hyperledger Besu (QBFT)</span>
            </div>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>Chain ID</span>
              <span className={styles.blockchainValue}>1337</span>
            </div>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>DID Method</span>
              <span className={styles.blockchainValue}>did:ethr:besu</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={() => router.push("/mypage")}
          className={`${styles.actionBtn} ${styles.primaryBtn}`}
        >
          마이페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}
