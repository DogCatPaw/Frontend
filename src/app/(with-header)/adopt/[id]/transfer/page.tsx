"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import styles from "./page.module.css";
import { getAccessToken } from "@/lib/api/auth";
import {
  getTransferData,
  updateTransferStatus,
  cancelTransfer,
  prepareTransfer,
  verifyTransfer,
  acceptTransfer,
  type PrepareTransferResponse,
  type VerificationProof,
  type PetTransferData,
} from "@/lib/api/adopt/transfer";

export default function AdoptionTransferPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const adoptionId = params.id as string;
  const petDID = searchParams.get("petDID");
  const roomId = searchParams.get("roomId");

  // 단계 상태 (1~4)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Prepare Transfer Data
  const [prepareData, setPrepareData] = useState<PrepareTransferResponse | null>(null);

  // Step 2: Signature
  const [signature, setSignature] = useState<string>("");

  // Step 3: Biometric Verification
  const [noseImage, setNoseImage] = useState<File | null>(null);
  const [noseImagePreview, setNoseImagePreview] = useState<string | null>(null);
  const [verificationProof, setVerificationProof] = useState<VerificationProof | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);

  // Step 4: Transaction
  const [txHash, setTxHash] = useState<string>("");

  // 초기화: 로그인 및 petDID 확인, Redis에서 데이터 로드
  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken || !isConnected) {
      alert("로그인이 필요합니다!");
      router.push("/login");
      return;
    }

    if (!petDID) {
      alert("펫 DID가 필요합니다.");
      router.push(`/adopt/${adoptionId}`);
      return;
    }

    // Redis에서 이전 데이터 로드
    loadTransferDataFromRedis();
  }, []);

  // ============================= Redis에서 이전 데이터 로드 =============================
  const loadTransferDataFromRedis = async () => {
    try {
      setLoading(true);
      setError(null);

      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error("로그인이 필요합니다.");
      }

      console.log("📥 Redis에서 이전 데이터 로드 중...");
      console.log("  - Adoption ID:", adoptionId);

      const response = await getTransferData(Number(adoptionId), accessToken);

      if (!response.success || !response.data) {
        console.warn("⚠️ Redis에 이전 데이터가 없습니다.");
        setError(
          "입양 이전이 승인되지 않았습니다. 소유자가 채팅방에서 '입양 승인' 버튼을 먼저 클릭해야 합니다."
        );
        setLoading(false);
        return;
      }

      const transferData = response.data;
      console.log("✅ Redis 데이터 로드 성공:", transferData);

      // prepareData 설정
      setPrepareData(transferData.prepareData);

      // 상태에 따라 단계 설정
      switch (transferData.status) {
        case "INITIATED":
          console.log("  - 상태: INITIATED → Step 2 (서명)으로 이동");
          setStep(2);
          break;
        case "SIGNED":
          console.log("  - 상태: SIGNED → Step 3 (비문 검증)으로 이동");
          setSignature(transferData.signature || "");
          setStep(3);
          break;
        case "VERIFIED":
          console.log("  - 상태: VERIFIED → Step 4 (블록체인 실행)으로 이동");
          setSignature(transferData.signature || "");
          setVerificationProof(transferData.verificationProof || null);
          setSimilarity(transferData.verificationProof?.similarity || null);
          setStep(4);
          break;
        case "COMPLETED":
          console.log("  - 상태: COMPLETED → 이미 완료됨");
          alert("이 입양은 이미 완료되었습니다.");
          router.push(`/adopt/${adoptionId}`);
          break;
        default:
          setStep(2);
      }
    } catch (err: any) {
      console.error("❌ Redis 데이터 로드 실패:", err);
      setError(
        err.message ||
          "입양 이전 데이터를 불러오는데 실패했습니다. 소유자가 먼저 입양을 승인해야 합니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================= Cancel Transfer =============================
  const handleCancelTransfer = async () => {
    if (!confirm("입양 이전을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("로그인이 필요합니다.");

      console.log("📤 입양 이전 취소 중...");

      await cancelTransfer(Number(adoptionId), accessToken);

      console.log("✅ 입양 이전이 취소되었습니다.");
      alert("입양 이전이 취소되었습니다.");

      // Redirect to chat or adoption page
      if (roomId) {
        router.push(`/chat?roomId=${roomId}`);
      } else {
        router.push(`/adopt/${adoptionId}`);
      }
    } catch (err: any) {
      console.error("❌ Cancel failed:", err);
      setError(err.message || "취소에 실패했습니다.");
      alert(`취소 실패: ${err.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================= Step 2: Sign Message =============================
  const handleSignMessage = async () => {
    if (!prepareData) return;

    try {
      setLoading(true);
      setError(null);

      console.log("📤 Step 2: Signing message...");
      console.log("  - Signing data:", prepareData.signingData);

      const sig = await signMessageAsync({
        message: prepareData.signingData,
      });

      console.log("✅ Message signed!");
      console.log("  - Signature:", sig);

      setSignature(sig);

      // Redis에 서명 저장
      const accessToken = getAccessToken();
      if (accessToken) {
        console.log("📤 Redis에 서명 상태 업데이트 중...");
        await updateTransferStatus(
          Number(adoptionId),
          "SIGNED",
          { signature: sig },
          accessToken
        );
        console.log("✅ Redis 업데이트 완료");
      }

      setStep(3);
    } catch (err: any) {
      console.error("❌ Signing failed:", err);
      setError(err.message || "서명에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ============================= Step 3: Upload Nose Print =============================
  const handleNoseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    // 파일 형식 체크
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPG, PNG, WEBP 형식만 지원합니다.");
      return;
    }

    setNoseImage(file);

    // 미리보기
    const reader = new FileReader();
    reader.onloadend = () => {
      setNoseImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyBiometric = async () => {
    if (!noseImage || !petDID) return;

    try {
      setLoading(true);
      setError(null);

      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("로그인이 필요합니다.");

      console.log("📤 Step 3: Uploading nose print...");

      // 1. Get presigned URL
      const presignedResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/common`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!presignedResponse.ok) {
        throw new Error("presigned URL 생성 실패");
      }

      const { url: presignedUrl } = await presignedResponse.json();

      // 2. Upload to S3
      await fetch(presignedUrl, {
        method: "PUT",
        body: noseImage,
        headers: {
          "Content-Type": noseImage.type,
        },
      });

      // 3. Extract filename
      const fileName = new URL(presignedUrl).pathname.split("/").pop();
      if (!fileName) throw new Error("파일명 추출 실패");

      console.log("  - Uploaded file:", fileName);

      // 4. Verify biometric
      console.log("📤 Step 3: Verifying biometric...");
      const response = await verifyTransfer(
        petDID,
        { image: fileName },
        accessToken
      );

      console.log("✅ Biometric verification result:");
      console.log("  - Success:", response.success);
      console.log("  - Similarity:", response.similarity, "%");

      if (!response.success) {
        setError(
          response.message ||
            `비문이 일치하지 않습니다. (유사도: ${response.similarity}%)`
        );
        return;
      }

      if (!response.verificationProof) {
        throw new Error("검증 증명을 받지 못했습니다.");
      }

      setVerificationProof(response.verificationProof);
      setSimilarity(response.similarity);

      // Redis에 검증 결과 저장
      console.log("📤 Redis에 검증 상태 업데이트 중...");
      await updateTransferStatus(
        Number(adoptionId),
        "VERIFIED",
        {
          verificationProof: response.verificationProof,
          similarity: response.similarity,
        },
        accessToken
      );
      console.log("✅ Redis 업데이트 완료");

      setStep(4);
    } catch (err: any) {
      console.error("❌ Biometric verification failed:", err);
      setError(err.message || "비문 검증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ============================= Step 4: Accept Transfer =============================
  const handleAcceptTransfer = async () => {
    if (!prepareData || !signature || !verificationProof || !address || !petDID) {
      alert("필수 데이터가 누락되었습니다.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("로그인이 필요합니다.");

      console.log("📤 Step 4: Submitting to backend...");
      console.log("📋 Checking data before submit:");
      console.log("  - Current user (adopter):", address.toLowerCase());
      console.log("  - prepareData.message:", prepareData.message);
      console.log("  - VC guardian:", prepareData.message?.vc?.credentialSubject?.guardian);
      console.log("  - VC previousGuardian:", prepareData.message?.vc?.credentialSubject?.previousGuardian);
      console.log("  - Verification newGuardian:", verificationProof?.newGuardian);

      // ⚠️ 중요: VC의 guardian이 현재 사용자(입양자)와 일치해야 함!
      if (prepareData.message?.vc?.credentialSubject?.guardian?.toLowerCase() !== address.toLowerCase()) {
        console.error("❌ Guardian mismatch!");
        console.error("  - Expected:", address.toLowerCase());
        console.error("  - Got:", prepareData.message?.vc?.credentialSubject?.guardian);
        throw new Error(
          "VC의 guardian이 현재 사용자와 일치하지 않습니다. " +
          "prepareTransfer에 올바른 newGuardianAddress가 전달되었는지 확인하세요."
        );
      }

      // ⭐ Redis에 저장된 서명된 트랜잭션 사용 (소유자가 이미 서명함)
      const signedTx = (prepareData as any).signedTx;
      if (!signedTx) {
        throw new Error(
          "소유자가 서명한 트랜잭션을 찾을 수 없습니다. 소유자가 '입양 승인' 버튼을 먼저 클릭해야 합니다."
        );
      }

      console.log("  - Using signed transaction from owner:", signedTx);

      const response = await acceptTransfer(
        petDID,
        Number(adoptionId),
        {
          signature,
          message: prepareData.message,
          petData: prepareData.message.vc.credentialSubject.petData,
          verificationProof,
          signedTx, // ⭐ 소유자가 서명한 트랜잭션!
          vcSignedData: prepareData.signingData,
        },
        accessToken
      );

      console.log("✅ Transfer accepted by backend!");
      console.log("  - TX Hash:", response.txHash);
      console.log("  - Block Number:", response.blockNumber);

      setTxHash(response.txHash || "");

      // Redis에 완료 상태 업데이트
      console.log("📤 Redis에 완료 상태 업데이트 중...");
      await updateTransferStatus(
        Number(adoptionId),
        "COMPLETED",
        {},
        accessToken
      );
      console.log("✅ Redis 업데이트 완료");

      alert(
        `🎉 입양이 완료되었습니다!\n\n트랜잭션 해시: ${response.txHash}\n블록 번호: ${response.blockNumber}`
      );

      // Redirect to adoption detail page
      setTimeout(() => {
        router.push(`/adopt/${adoptionId}`);
      }, 3000);
    } catch (err: any) {
      console.error("❌ Accept transfer failed:", err);
      setError(err.message || "입양 완료에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ============================= UI =============================
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>펫 입양 프로세스</h1>
        <p className={styles.subtitle}>
          블록체인 기반 안전한 소유권 이전
        </p>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`${styles.progressStep} ${
                s === step
                  ? styles.progressStepActive
                  : s < step
                  ? styles.progressStepCompleted
                  : ""
              }`}
            >
              <div className={styles.progressCircle}>{s}</div>
              <div className={styles.progressLabel}>
                {s === 1 && "이전 준비"}
                {s === 2 && "서명"}
                {s === 3 && "비문 검증"}
                {s === 4 && "완료"}
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorBox}>
            <strong>❌ 오류:</strong> {error}
          </div>
        )}

        {/* Step 1: Prepare Transfer */}
        {step === 1 && (
          <div className={styles.stepCard}>
            <h2 className={styles.stepTitle}>Step 1: 이전 준비 중...</h2>
            <p className={styles.stepDescription}>
              현재 소유자가 이전 데이터를 준비하고 있습니다.
            </p>
            {loading && <div className={styles.loader}>로딩 중...</div>}
          </div>
        )}

        {/* Step 2: Sign Message */}
        {step === 2 && (
          <div className={styles.stepCard}>
            <h2 className={styles.stepTitle}>Step 2: 메시지 서명</h2>
            <p className={styles.stepDescription}>
              입양을 진행하시려면 아래 메시지에 서명해주세요.
            </p>
            <div className={styles.infoBox}>
              <p>
                <strong>펫 DID:</strong> {petDID}
              </p>
              <p>
                <strong>새 보호자:</strong> {address}
              </p>
            </div>
            <button
              className={styles.primaryButton}
              onClick={handleSignMessage}
              disabled={loading}
            >
              {loading ? "서명 중..." : "서명하기"}
            </button>
            <button
              className={styles.cancelButton}
              onClick={handleCancelTransfer}
              disabled={loading}
            >
              취소
            </button>
          </div>
        )}

        {/* Step 3: Biometric Verification */}
        {step === 3 && (
          <div className={styles.stepCard}>
            <h2 className={styles.stepTitle}>Step 3: 비문 사진 업로드</h2>
            <p className={styles.stepDescription}>
              펫의 코 비문 사진을 업로드하여 본인 확인을 진행합니다. (유사도
              50% 이상 필요)
            </p>

            <div className={styles.uploadBox}>
              <input
                id="noseImage"
                type="file"
                accept="image/*"
                onChange={handleNoseImageChange}
                className={styles.fileInput}
              />
              <label htmlFor="noseImage" className={styles.uploadLabel}>
                {noseImagePreview ? (
                  <img
                    src={noseImagePreview}
                    alt="Nose Print"
                    className={styles.preview}
                  />
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    📷 <br />
                    비문 사진 선택
                  </div>
                )}
              </label>
            </div>

            {noseImage && (
              <>
                <button
                  className={styles.primaryButton}
                  onClick={handleVerifyBiometric}
                  disabled={loading}
                >
                  {loading ? "검증 중..." : "비문 검증하기"}
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelTransfer}
                  disabled={loading}
                >
                  취소
                </button>
              </>
            )}
            {!noseImage && (
              <button
                className={styles.cancelButton}
                onClick={handleCancelTransfer}
                disabled={loading}
              >
                취소
              </button>
            )}
          </div>
        )}

        {/* Step 4: Complete Transfer */}
        {step === 4 && (
          <div className={styles.stepCard}>
            <h2 className={styles.stepTitle}>Step 4: 입양 완료</h2>
            <p className={styles.stepDescription}>
              모든 검증이 완료되었습니다. 입양을 최종 완료하시겠습니까?
            </p>

            <div className={styles.successBox}>
              <p>
                <strong>✅ 비문 검증 성공!</strong>
              </p>
              <p>유사도: {similarity}%</p>
            </div>

            <div className={styles.infoBox}>
              <p>
                <strong>펫 DID:</strong> {petDID}
              </p>
              <p>
                <strong>입양 공고 ID:</strong> {adoptionId}
              </p>
              <p>
                <strong>새 보호자:</strong> {address}
              </p>
            </div>

            <button
              className={styles.primaryButton}
              onClick={handleAcceptTransfer}
              disabled={loading}
            >
              {loading ? "처리 중..." : "🎉 입양 완료하기"}
            </button>

            {!txHash && (
              <button
                className={styles.cancelButton}
                onClick={handleCancelTransfer}
                disabled={loading}
              >
                취소
              </button>
            )}

            {txHash && (
              <div className={styles.successBox}>
                <p>
                  <strong>✅ 입양이 완료되었습니다!</strong>
                </p>
                <p>트랜잭션 해시: {txHash}</p>
                <p>잠시 후 입양 공고 페이지로 이동합니다...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
