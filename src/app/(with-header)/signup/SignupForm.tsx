"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGuardian } from "@/hooks/useGuardian";
import { Gender, Role, GENDER_LABEL, ROLE_LABEL } from "@/types/enums";
import { requestFaucetFundsWithWeb3Token } from "@/lib/api/faucet";
import { uploadImageWithWeb3Token } from "@/lib/utils/imageUpload";
import { registerGuardian } from "@/lib/api/guardian";
import { generateWeb3Token } from "@/lib/utils/web3Token";
import styles from "./page.module.css";

/**
 * 회원가입 폼 (클라이언트 컴포넌트)
 * - Guardian 등록 플로우
 * - 이메일 인증 → ETH 받기 → 정보 입력 → 블록체인 등록 → 자동 로그인
 */
export default function SignupForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const {
    email,
    setEmail,
    codeSent,
    codeVerified,
    isGuardian,
    isLoading,
    error: guardianError,
    sendCode,
    verifyEmailCode,
    register,
    checkStatus,
  } = useGuardian();

  // Show guardian error if exists
  useEffect(() => {
    if (guardianError) {
      console.error("Guardian error from hook:", guardianError);
    }
  }, [guardianError]);

  // Form state
  const [verificationCode, setVerificationCode] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [old, setOld] = useState<number>(20);
  const [userAddress, setUserAddress] = useState("");
  const [role, setRole] = useState<Role>(Role.USER);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);

  // Faucet state
  const [ethReceived, setEthReceived] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState("");

  // No need to check guardian status on signup page
  // Users who are already guardians should not be on this page

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Handle send code
  const handleSendCode = async () => {
    const success = await sendCode();
    if (success) {
      setTimeLeft(300); // 5 minutes
      alert("인증 코드가 발송되었습니다. 이메일을 확인해주세요.");
    }
  };

  // Handle verify code
  const handleVerifyCode = async () => {
    const success = await verifyEmailCode(verificationCode);
    if (success) {
      alert("이메일 인증이 완료되었습니다! 이제 테스트 ETH를 받으세요.");
    }
  };

  // Handle request ETH from faucet
  const handleRequestETH = async () => {
    if (!address) {
      alert("지갑을 먼저 연결해주세요.");
      return;
    }

    if (!walletClient) {
      alert("지갑 클라이언트를 찾을 수 없습니다.");
      return;
    }

    setFaucetLoading(true);
    setFaucetMessage("");

    try {
      // Generate Web3Token for authentication
      console.log("🔑 Generating Web3Token for Faucet...");
      const web3Token = await generateWeb3Token(
        walletClient,
        address.toLowerCase()
      );

      // Call faucet API directly
      console.log("📤 Requesting faucet funds...");
      const result = await requestFaucetFundsWithWeb3Token(
        {
          walletAddress: address.toLowerCase(),
          amount: "1", // 1 ETH
        },
        web3Token,
        address.toLowerCase()
      );

      if (result.success && result.data) {
        setEthReceived(true);
        setFaucetMessage(
          `✅ 1 ETH를 받았습니다! TX: ${result.data.transactionHash?.slice(0, 10)}...`
        );
        alert("테스트 ETH를 받았습니다! 이제 Guardian 정보를 입력하세요.");
      } else {
        if (result.errorCode === "COOLDOWN_ACTIVE") {
          setFaucetMessage(`⏳ ${result.errorMessage || "잠시 후 다시 시도해주세요."}`);
        } else {
          setFaucetMessage(`❌ ${result.errorMessage || "Faucet 요청 실패"}`);
        }
      }
    } catch (error: any) {
      console.error("Faucet error:", error);
      const errorMsg = error?.response?.data?.errorMessage || error.message || "Faucet 요청 실패";
      setFaucetMessage(`❌ ${errorMsg}`);
    } finally {
      setFaucetLoading(false);
    }
  };

  // Handle profile image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to S3 and get fileKey
  const uploadProfileImage = async (): Promise<string> => {
    if (!profileImage) {
      throw new Error("프로필 이미지를 선택해주세요.");
    }

    if (!address || !walletClient) {
      throw new Error("지갑을 연결해주세요.");
    }

    setUploadingImage(true);
    try {
      // Upload image using utility function
      console.log("📤 Uploading profile image...");
      const fileKey = await uploadImageWithWeb3Token(
        profileImage,
        walletClient,
        address.toLowerCase()
      );

      console.log("✅ Image uploaded, fileKey:", fileKey);
      return fileKey;
    } catch (error: any) {
      console.error("❌ Image upload error:", error?.message);
      throw new Error(`이미지 업로드 실패: ${error?.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeVerified) {
      alert("이메일 인증을 먼저 완료해주세요.");
      return;
    }

    // Validate all required fields
    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }
    if (!phone.trim()) {
      alert("전화번호를 입력해주세요.");
      return;
    }
    if (!userAddress.trim()) {
      alert("주소를 입력해주세요.");
      return;
    }
    if (!profileImage) {
      alert("프로필 이미지를 선택해주세요.");
      return;
    }

    try {
      // Upload profile image first
      console.log("📤 Uploading profile image...");
      const profileUrl = await uploadProfileImage();
      console.log("✅ Profile image uploaded:", profileUrl);

      if (!address || !walletClient) {
        throw new Error("지갑을 연결해주세요.");
      }

      // Generate Web3Token for Guardian registration
      console.log("🔑 Generating Web3Token for Guardian registration...");
      const web3Token = await generateWeb3Token(
        walletClient,
        address.toLowerCase()
      );

      // Register guardian using API (2-step process)
      console.log("📝 Step 1: Getting transaction data from backend...");
      const guardianData = {
        email,
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        gender: gender, // Send enum value (0=MALE, 1=FEMALE)
        old,
        address: userAddress.trim(),
        role,
        profileUrl,
        walletAddress: address.toLowerCase(),
        // NO signedTx in first call
      };

      console.log("Guardian data:", guardianData);

      // STEP 1: Call API without signedTx to get transaction data
      const prepareResult: any = await registerGuardian(guardianData, web3Token);
      console.log("📦 Prepare result:", prepareResult);

      // Check if backend wants us to sign and broadcast
      if (prepareResult.requiresSignature && prepareResult.transactionData) {
        console.log("✍️ Step 2: Signing and broadcasting transaction...");
        console.log("Transaction data:", prepareResult.transactionData);

        // STEP 2: Sign and broadcast transaction using wallet
        const txParams: any = {
          to: prepareResult.transactionData.to as `0x${string}`,
          data: prepareResult.transactionData.data as `0x${string}`,
        };

        // Add gas only if provided and valid
        if (prepareResult.transactionData.gasLimit && prepareResult.transactionData.gasLimit !== "0") {
          txParams.gas = BigInt(prepareResult.transactionData.gasLimit);
          console.log("🔥 Using provided gas limit:", txParams.gas.toString());
        } else {
          console.log("🔥 Gas limit not provided or 0, wallet will estimate automatically");
        }

        console.log("📤 Sending transaction with params:", txParams);
        const txHash = await walletClient.sendTransaction(txParams);

        console.log("📤 Transaction broadcasted, hash:", txHash);

        // STEP 3: Call API again with transaction hash
        console.log("📝 Step 3: Submitting transaction hash to backend...");
        const finalResult = await registerGuardian(
          {
            ...guardianData,
            signedTx: txHash, // 66-character tx hash
          },
          web3Token
        );

        console.log("✅ Guardian registration completed:", finalResult);
        alert("Guardian 등록이 완료되었습니다! 로그인 페이지로 이동합니다.");
      } else {
        // If backend doesn't require signature, it's already done
        console.log("✅ Guardian registration completed (backend handled):", prepareResult);
        alert("Guardian 등록이 완료되었습니다! 로그인 페이지로 이동합니다.");
      }

      // Redirect to login page
      router.push("/login");
    } catch (error: any) {
      console.error("❌ Guardian registration error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error?.response?.data,
        stack: error.stack,
      });

      // Show detailed error message
      const errorMsg = error?.response?.data?.error || error?.message || "등록에 실패했습니다.";
      alert(`Guardian 등록 실패:\n\n${errorMsg}\n\n콘솔을 확인해주세요.`);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Guardian 회원가입</h1>
        <p className={styles.subtitle}>
          유기동물 보호자로 등록하여 입양, 후원, 스토리 작성 등 다양한 활동에
          참여하세요.
        </p>

        {/* Step 0: Wallet Connection (if not connected) */}
        {!isConnected && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Step 0: 지갑 연결</h2>
            <p className={styles.hint}>
              회원가입을 위해 먼저 지갑을 연결해주세요. 지갑 주소가 귀하의
              계정이 됩니다.
            </p>
            <div className={styles.formGroup}>
              <div className={styles.connectButtonWrapper}>
                <ConnectButton />
              </div>
            </div>
          </div>
        )}

        {/* Show form only if wallet connected */}
        {isConnected && (
          <>
            <div className={styles.successBox} style={{ marginBottom: "24px" }}>
              <p className={styles.successMessage}>
                ✓ 지갑 연결 완료: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>

        <form onSubmit={handleRegister} className={styles.form}>
          {/* Step 1: Email Verification */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Step 1: 이메일 인증{" "}
              {codeVerified && (
                <span className={styles.completed}>✓ 완료</span>
              )}
            </h2>

            {/* Email Input */}
            <div className={styles.formGroup}>
              <label className={styles.label}>이메일 *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                disabled={codeSent || codeVerified}
                required
                className={styles.input}
              />
            </div>

            {/* Send Code Button */}
            {!codeSent && !codeVerified && (
              <div className={styles.formGroup}>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isLoading || !email.trim()}
                  className={styles.primaryButton}
                >
                  {isLoading ? "발송 중..." : "인증 코드 발송"}
                </button>
              </div>
            )}

            {/* Verification Code Input */}
            {codeSent && !codeVerified && (
              <div className={styles.formGroup}>
                <label className={styles.label}>인증 코드 *</label>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="6자리 인증 코드"
                    maxLength={6}
                    required
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isLoading}
                    className={styles.button}
                  >
                    {isLoading ? "확인 중..." : "확인"}
                  </button>
                </div>

                {/* Timer */}
                {timeLeft > 0 && (
                  <p className={styles.timer}>남은 시간: {formatTime(timeLeft)}</p>
                )}

                {/* Resend Button */}
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isLoading}
                  className={styles.resendButton}
                >
                  인증 코드 재발송
                </button>
              </div>
            )}

            {codeVerified && (
              <div className={styles.successBox}>
                <p className={styles.successMessage}>
                  ✓ 이메일 인증이 완료되었습니다!
                </p>
              </div>
            )}
          </div>

          {/* Step 1.5: Get Test ETH */}
          {codeVerified && !ethReceived && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Step 1.5: 테스트 ETH 받기
              </h2>
              <p className={styles.hint}>
                Guardian 등록 트랜잭션을 위해 테스트 ETH(1 ETH)가 필요합니다.
                <br />
                아래 버튼을 눌러 무료로 받으세요.
              </p>
              <div className={styles.formGroup}>
                <button
                  type="button"
                  onClick={handleRequestETH}
                  disabled={faucetLoading}
                  className={styles.primaryButton}
                >
                  {faucetLoading ? "요청 중..." : "테스트 ETH 받기 (1 ETH)"}
                </button>
              </div>
              {faucetMessage && (
                <div className={styles.infoBox}>
                  <p>{faucetMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Success message after ETH received */}
          {codeVerified && ethReceived && (
            <div className={styles.successBox} style={{ marginBottom: "24px" }}>
              <p className={styles.successMessage}>
                ✓ 테스트 ETH를 받았습니다! 이제 Guardian 정보를 입력하세요.
              </p>
            </div>
          )}

          {/* Step 2: Guardian Information */}
          {codeVerified && ethReceived && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Step 2: 보호자 정보 입력</h2>

              {/* Profile Image */}
              <div className={styles.formGroup}>
                <label className={styles.label}>프로필 이미지 *</label>
                {profilePreview && (
                  <div style={{ marginBottom: "10px" }}>
                    <img
                      src={profilePreview}
                      alt="Profile preview"
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "50%",
                        border: "2px solid #ddd",
                      }}
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                  className={styles.input}
                />
                <p className={styles.hint}>프로필 사진을 선택해주세요.</p>
              </div>

              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                  className={styles.input}
                />
              </div>

              {/* Nickname */}
              <div className={styles.formGroup}>
                <label className={styles.label}>닉네임 *</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="멍냥러버"
                  required
                  className={styles.input}
                />
                <p className={styles.hint}>
                  커뮤니티에서 표시될 닉네임입니다.
                </p>
              </div>

              {/* Phone */}
              <div className={styles.formGroup}>
                <label className={styles.label}>전화번호 *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  required
                  className={styles.input}
                />
              </div>

              {/* Gender */}
              <div className={styles.formGroup}>
                <label className={styles.label}>성별 *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(Number(e.target.value) as Gender)}
                  required
                  className={styles.select}
                >
                  <option value={Gender.MALE}>{GENDER_LABEL[Gender.MALE]}</option>
                  <option value={Gender.FEMALE}>{GENDER_LABEL[Gender.FEMALE]}</option>
                </select>
              </div>

              {/* Age */}
              <div className={styles.formGroup}>
                <label className={styles.label}>나이 *</label>
                <input
                  type="number"
                  value={old}
                  onChange={(e) => setOld(Number(e.target.value))}
                  placeholder="20"
                  min="1"
                  max="150"
                  required
                  className={styles.input}
                />
              </div>

              {/* Address */}
              <div className={styles.formGroup}>
                <label className={styles.label}>주소 *</label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="서울시 강남구"
                  required
                  className={styles.input}
                />
                <p className={styles.hint}>
                  지역 기반 입양 매칭에 사용됩니다.
                </p>
              </div>

              {/* Role */}
              <div className={styles.formGroup}>
                <label className={styles.label}>역할 *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(Number(e.target.value) as Role)}
                  required
                  className={styles.select}
                >
                  <option value={Role.USER}>{ROLE_LABEL[Role.USER]}</option>
                  <option value={Role.ADMIN}>{ROLE_LABEL[Role.ADMIN]}</option>
                </select>
                <p className={styles.hint}>
                  {role === Role.USER
                    ? "개인 반려동물 보호자로 등록됩니다."
                    : "보호소 또는 구조 단체 관리자로 등록됩니다."}
                </p>
              </div>

              {/* Submit Button */}
              <div className={styles.formGroup}>
                <button
                  type="submit"
                  disabled={isLoading || uploadingImage}
                  className={styles.submitButton}
                >
                  {isLoading || uploadingImage ? (
                    <>
                      <span className={styles.spinner}></span>
                      {uploadingImage ? "이미지 업로드 중..." : "등록 중..."}
                    </>
                  ) : (
                    "Guardian 등록하기"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {guardianError && (
            <div className={styles.errorBox}>
              <p className={styles.errorMessage}>{guardianError}</p>
            </div>
          )}
        </form>
          </>
        )}

        {/* Info Box */}
        <div className={styles.infoBox}>
          <h3 className={styles.infoTitle}>Guardian란?</h3>
          <ul className={styles.infoList}>
            <li>유기동물 보호자로 블록체인에 등록됩니다</li>
            <li>반려동물 등록, 입양 신청, 후원 등이 가능합니다</li>
            <li>스토리와 입양 후기를 작성할 수 있습니다</li>
            <li>투명하고 안전한 입양 과정에 참여할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
