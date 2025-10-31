"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, usePublicClient, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/hooks/useAuth";
import { uploadImageWithJWT } from "@/lib/utils/imageUpload";
import {
  prepareRegistration,
  registerPet,
  PetSpecies,
  PetGender,
  PetBreed,
  type PetData,
} from "@/lib/api/pet";
import { getAccessToken } from "@/lib/api/auth";
import styles from "./page.module.css";

// 단계 정의
enum RegistrationStep {
  AUTH = 1,           // 로그인 확인
  IMAGE_UPLOAD = 2,   // 이미지 업로드
  PET_INFO = 3,       // 펫 정보 입력
  PREPARE = 4,        // 서명 데이터 준비
  SIGN = 5,           // 트랜잭션 서명
  SUBMIT = 6,         // 최종 제출
  COMPLETE = 7,       // 완료
}

export default function PetRegisterPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 단계 관리
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(
    RegistrationStep.AUTH
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미지 파일
  const [noseImage, setNoseImage] = useState<File | null>(null);
  const [noseImagePreview, setNoseImagePreview] = useState<string>("");
  const [petImage, setPetImage] = useState<File | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string>("");

  // 업로드된 이미지 파일명
  const [uploadedNoseImage, setUploadedNoseImage] = useState<string>("");
  const [uploadedPetImage, setUploadedPetImage] = useState<string>("");

  // 펫 정보
  const [petData, setPetData] = useState<PetData>({
    petName: "",
    specifics: PetSpecies.DOG,
    breed: PetBreed.MIXED,
    old: 0,
    gender: PetGender.UNKNOWN,
    weight: 0,
    color: "",
    feature: "",
    neutral: false,
  });

  // 서명 데이터
  const [prepareResult, setPrepareResult] = useState<any>(null);
  const [signatures, setSignatures] = useState<any>(null);

  // 최종 결과
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  // Step 1: 로그인 확인
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        alert("로그인이 필요합니다.");
        router.push("/login");
      } else {
        setCurrentStep(RegistrationStep.IMAGE_UPLOAD);
      }
    }
  }, [authLoading, isAuthenticated, router]);

  // 이미지 선택 핸들러
  const handleNoseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNoseImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNoseImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPetImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPetImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 2: 이미지 업로드
  const handleUploadImages = async () => {
    if (!noseImage) {
      alert("코 사진은 필수입니다!");
      return;
    }
    if (!petImage) {
      alert("펫 사진은 필수입니다!");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Access token not found");

      // 코 사진 업로드
      console.log("📤 Uploading nose image...");
      const noseFileName = await uploadImageWithJWT(noseImage, accessToken);
      setUploadedNoseImage(noseFileName);
      console.log("✅ Nose image uploaded:", noseFileName);

      // 펫 사진 업로드
      console.log("📤 Uploading pet image...");
      const petFileName = await uploadImageWithJWT(petImage, accessToken);
      setUploadedPetImage(petFileName);
      console.log("✅ Pet image uploaded:", petFileName);

      alert("이미지 업로드 완료!");
      setCurrentStep(RegistrationStep.PET_INFO);
    } catch (err: any) {
      console.error("❌ Image upload error:", err);
      setError(err.message || "이미지 업로드 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: 펫 정보 입력 (다음 단계로)
  const handlePetInfoNext = () => {
    if (!petData.petName) {
      alert("펫 이름은 필수입니다!");
      return;
    }
    setCurrentStep(RegistrationStep.PREPARE);
  };

  // Step 4: Prepare Registration
  const handlePrepare = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Access token not found");

      console.log("📝 Preparing registration...");
      const result = await prepareRegistration(
        {
          noseImage: uploadedNoseImage,
          images: uploadedPetImage,
          ...petData,
        },
        accessToken
      );

      console.log("✅ Prepare result:", result);

      // ⭐ Check if backend returned error
      if (!result.success || result.error) {
        const errorMessage = result.error || "준비 실패";
        console.error("❌ Backend returned error:", errorMessage);

        // 가디언 미등록 에러인 경우 특별 처리
        if (errorMessage.includes("가디언이 등록되지 않았습니다")) {
          alert("⚠️ 가디언(보호자) 등록이 필요합니다!\n\n먼저 가디언 등록을 완료해주세요.\n가디언 등록 페이지로 이동합니다.");
          router.push("/guardian/register");
          return;
        }

        throw new Error(errorMessage);
      }

      // ⭐ Validate response structure
      if (!result.petDID || !result.petRegistrationTxData || !result.guardianLinkTxData || !result.vcSigningData) {
        throw new Error("서명 데이터가 완전하지 않습니다. 다시 시도해주세요.");
      }

      console.log("🐾 Pet DID:", result.petDID);
      setPrepareResult(result);
      setCurrentStep(RegistrationStep.SIGN);
    } catch (err: any) {
      console.error("❌ Prepare error:", err);
      setError(err.message || "준비 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: 서명
  const handleSign = async () => {
    // 지갑 연결 상태 확인
    if (!isConnected || !address) {
      alert("지갑을 먼저 연결해주세요!");
      return;
    }

    // walletClient가 로드될 때까지 대기
    if (!walletClient) {
      alert("지갑 클라이언트를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!publicClient) {
      alert("네트워크 클라이언트를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("✍️ Signing transactions...");
      console.log("Address:", address);
      console.log("WalletClient:", walletClient);

      // ⭐ DEBUG: Check prepareResult structure
      console.log("🔍 Full prepareResult:", JSON.stringify(prepareResult, null, 2));
      console.log("🔍 petRegistrationTxData:", prepareResult?.petRegistrationTxData);
      console.log("🔍 guardianLinkTxData:", prepareResult?.guardianLinkTxData);

      // Validate prepareResult structure
      if (!prepareResult?.petRegistrationTxData) {
        throw new Error("Pet registration transaction data is missing from prepare result");
      }
      if (!prepareResult?.guardianLinkTxData) {
        throw new Error("Guardian link transaction data is missing from prepare result");
      }
      if (!prepareResult?.vcSigningData) {
        throw new Error("VC signing data is missing from prepare result");
      }

      // 1. Send Pet Registration TX
      console.log("1️⃣ Sending Pet Registration TX...");
      const petTxParams: any = {
        to: prepareResult.petRegistrationTxData.to as `0x${string}`,
        data: prepareResult.petRegistrationTxData.data as `0x${string}`,
      };

      // Add gas only if provided and valid
      if (prepareResult.petRegistrationTxData.gasLimit && prepareResult.petRegistrationTxData.gasLimit !== "0") {
        petTxParams.gas = BigInt(prepareResult.petRegistrationTxData.gasLimit);
      }

      const petTxHash = await walletClient.sendTransaction(petTxParams);
      console.log("✅ Pet Registration TX sent:", petTxHash);

      // 2. Send Guardian Link TX
      console.log("2️⃣ Sending Guardian Link TX...");
      const linkTxParams: any = {
        to: prepareResult.guardianLinkTxData.to as `0x${string}`,
        data: prepareResult.guardianLinkTxData.data as `0x${string}`,
      };

      // Add gas only if provided and valid
      if (prepareResult.guardianLinkTxData.gasLimit && prepareResult.guardianLinkTxData.gasLimit !== "0") {
        linkTxParams.gas = BigInt(prepareResult.guardianLinkTxData.gasLimit);
      }

      const guardianLinkTxHash = await walletClient.sendTransaction(linkTxParams);
      console.log("✅ Guardian Link TX sent:", guardianLinkTxHash);

      // 3. Sign VC Message
      console.log("3️⃣ Signing VC Message...");
      console.log("📝 Signing message (first 100 chars):", prepareResult.vcSigningData.signingData.substring(0, 100) + "...");

      // ✅ 원본 문자열을 직접 서명 (해시 없이)
      // signMessageAsync는 내부적으로 Ethereum Signed Message 프리픽스를 추가하고 해싱함
      const vcSignature = await signMessageAsync({
        message: prepareResult.vcSigningData.signingData, // 원본 문자열 직접 서명
      });
      console.log("✅ VC Message signed");

      const sigs = {
        petTxHash,
        guardianLinkTxHash,
        vcSignature,
        vcMessage: prepareResult.vcSigningData.message,
        vcSignedData: prepareResult.vcSigningData.signingData, // ⭐ 원본 서명 데이터
      };

      setSignatures(sigs);
      alert("3개의 서명이 완료되었습니다!");
      setCurrentStep(RegistrationStep.SUBMIT);
    } catch (err: any) {
      console.error("❌ Signing error:", err);
      setError(err.message || "서명 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: 최종 제출
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Access token not found");

      console.log("📤 Submitting registration...");
      const result = await registerPet(
        {
          noseImage: uploadedNoseImage,
          images: uploadedPetImage,
          ...petData,
          signedTx: signatures.petTxHash,  // Transaction hash from sendTransaction
          guardianLinkSignedTx: signatures.guardianLinkTxHash,  // Transaction hash from sendTransaction
          vcSignature: signatures.vcSignature,
          vcMessage: JSON.stringify(signatures.vcMessage),
          vcSignedData: signatures.vcSignedData, // ⭐ 원본 서명 데이터 (백엔드 검증용)
        },
        accessToken
      );

      console.log("✅ Registration complete:", result);
      setRegistrationResult(result);
      setCurrentStep(RegistrationStep.COMPLETE);
      alert("펫 등록이 완료되었습니다!");
    } catch (err: any) {
      console.error("❌ Submit error:", err);
      setError(err.message || "제출 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 중
  if (authLoading || currentStep === RegistrationStep.AUTH) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로그인 확인 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>펫 등록</h1>
        <div className={styles.progress}>
          {currentStep === RegistrationStep.COMPLETE ? "✅ 등록 완료!" : `Step ${currentStep - 1} / 5`}
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className={styles.error}>
          <p>❌ {error}</p>
        </div>
      )}

      {/* Step 1: 이미지 업로드 */}
      {currentStep === RegistrationStep.IMAGE_UPLOAD && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 1: 이미지 업로드</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>코 사진 (필수) *</label>
            <p className={styles.hint}>
              반려동물의 코 사진은 생체 인증에 사용됩니다.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleNoseImageChange}
              required
              className={styles.input}
            />
            {noseImagePreview && (
              <img
                src={noseImagePreview}
                alt="Nose preview"
                className={styles.imagePreview}
              />
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>펫 사진 (필수) *</label>
            <p className={styles.hint}>
              반려동물의 전체 모습이 잘 보이는 사진을 올려주세요.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handlePetImageChange}
              required
              className={styles.input}
            />
            {petImagePreview && (
              <img
                src={petImagePreview}
                alt="Pet preview"
                className={styles.imagePreview}
              />
            )}
          </div>

          <button
            onClick={handleUploadImages}
            disabled={isLoading || !noseImage || !petImage}
            className={styles.button}
          >
            {isLoading ? "업로드 중..." : "다음 단계"}
          </button>
        </div>
      )}

      {/* Step 2: 펫 정보 입력 */}
      {currentStep === RegistrationStep.PET_INFO && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 2: 펫 정보 입력</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>펫 이름 *</label>
            <input
              type="text"
              value={petData.petName}
              onChange={(e) =>
                setPetData({ ...petData, petName: e.target.value })
              }
              placeholder="예: 바둑이"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>품종</label>
            <select
              value={petData.breed}
              onChange={(e) =>
                setPetData({ ...petData, breed: e.target.value as PetBreed })
              }
              className={styles.input}
            >
              <option value={PetBreed.MIXED}>믹스견</option>
              <option value={PetBreed.GOLDEN_RETRIEVER}>골든 리트리버</option>
              <option value={PetBreed.LABRADOR_RETRIEVER}>
                래브라도 리트리버
              </option>
              <option value={PetBreed.POODLE}>푸들</option>
              <option value={PetBreed.CHIHUAHUA}>치와와</option>
              <option value={PetBreed.MALTESE}>말티즈</option>
              <option value={PetBreed.POMERANIAN}>포메라니안</option>
              <option value={PetBreed.SHIH_TZU}>시츄</option>
              <option value={PetBreed.YORKSHIRE_TERRIER}>요크셔 테리어</option>
              {/* 더 많은 품종... */}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>나이 (세)</label>
            <input
              type="number"
              value={petData.old}
              onChange={(e) =>
                setPetData({ ...petData, old: Number(e.target.value) })
              }
              min="0"
              max="50"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>성별</label>
            <select
              value={petData.gender}
              onChange={(e) =>
                setPetData({ ...petData, gender: e.target.value as PetGender })
              }
              className={styles.input}
            >
              <option value={PetGender.MALE}>수컷</option>
              <option value={PetGender.FEMALE}>암컷</option>
              <option value={PetGender.UNKNOWN}>모름</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>몸무게 (kg)</label>
            <input
              type="number"
              value={petData.weight}
              onChange={(e) =>
                setPetData({ ...petData, weight: Number(e.target.value) })
              }
              min="0"
              step="0.1"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>색상</label>
            <input
              type="text"
              value={petData.color}
              onChange={(e) => setPetData({ ...petData, color: e.target.value })}
              placeholder="예: 갈색, 흰색"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>특징</label>
            <textarea
              value={petData.feature}
              onChange={(e) =>
                setPetData({ ...petData, feature: e.target.value })
              }
              placeholder="펫의 특징을 입력하세요"
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={petData.neutral}
                onChange={(e) =>
                  setPetData({ ...petData, neutral: e.target.checked })
                }
              />
              <span>중성화 완료</span>
            </label>
          </div>

          <button onClick={handlePetInfoNext} className={styles.button}>
            다음 단계
          </button>
        </div>
      )}

      {/* Step 3: Prepare */}
      {currentStep === RegistrationStep.PREPARE && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 3: 서명 데이터 준비</h2>
          <p className={styles.hint}>
            블록체인에 등록하기 위한 데이터를 준비합니다.
          </p>
          <button
            onClick={handlePrepare}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? "준비 중..." : "서명 데이터 준비"}
          </button>
        </div>
      )}

      {/* Step 4: Sign */}
      {currentStep === RegistrationStep.SIGN && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 4: 트랜잭션 서명</h2>
          <p className={styles.hint}>
            3개의 트랜잭션에 서명해야 합니다:
          </p>
          <ul className={styles.list}>
            <li>1. 펫 등록 트랜잭션</li>
            <li>2. 보호자 연결 트랜잭션</li>
            <li>3. VC 동의 서명</li>
          </ul>
          <p className={styles.warning}>
            ⚠️ MetaMask에서 3번의 서명 요청이 나타납니다.
          </p>

          {/* 지갑 연결 상태 표시 */}
          {!isConnected ? (
            <div className={styles.walletConnectBox}>
              <div className={styles.warning}>
                ⚠️ 지갑 연결이 필요합니다
              </div>
              <div className={styles.connectButtonWrapper}>
                <ConnectButton />
              </div>
            </div>
          ) : !walletClient ? (
            <div className={styles.hint}>
              🔄 지갑 클라이언트를 로드하는 중...
            </div>
          ) : (
            <div className={styles.hint} style={{ color: '#27ae60' }}>
              ✓ 지갑이 연결되었습니다: {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={isLoading || !isConnected || !walletClient || !publicClient}
            className={styles.button}
          >
            {isLoading ? "서명 중..." : "3개 트랜잭션 서명하기"}
          </button>
        </div>
      )}

      {/* Step 5: Submit */}
      {currentStep === RegistrationStep.SUBMIT && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 5: 최종 제출</h2>
          <p className={styles.hint}>
            서명이 완료되었습니다. 이제 블록체인에 등록합니다.
          </p>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? "제출 중..." : "펫 등록 완료"}
          </button>
        </div>
      )}

      {/* Step 7: Complete */}
      {currentStep === RegistrationStep.COMPLETE && registrationResult && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>✅ 등록 완료!</h2>
          <div className={styles.resultBox}>
            <p>
              <strong>Pet DID:</strong> {registrationResult.petDID}
            </p>
            <p>
              <strong>TX Hash:</strong> {registrationResult.txHash}
            </p>
            <p>
              <strong>Block Number:</strong> {registrationResult.blockNumber}
            </p>
            <p className={styles.note}>{registrationResult.note}</p>
          </div>
          <button onClick={() => router.push("/mypage")} className={styles.button}>
            마이페이지로 이동
          </button>
        </div>
      )}
    </div>
  );
}
