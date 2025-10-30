"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getMyPets } from "@/lib/api/pet";
import { getAccessToken } from "@/lib/api/auth";
import { getMyDonations, type MyDonation } from "@/lib/api/donations/mine";
import BoneChargeModal from "@/components/donation/BoneChargeModal";
import styles from "./page.module.css";
import { getMystory, type ServerStory, type ServerTypeCode } from "@/lib/api/mystory/mine";
import { getMemberProfile, type MemberProfile } from "@/lib/api/member/profile";

type TabType = "pets" | "donations" | "adoptions" | "storys" | "settings";

interface SpringPet {
  petId: number;
  did: string; // Pet DID
  petProfile?: string; // Profile image URL
  petName: string;
  old?: number; // Age
  gender?: string;
  breed?: string;
}

export default function MyPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    user,
    logout,
    logoutAll,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("pets");
  const [pets, setPets] = useState<SpringPet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);

  // Donation states
  const [boneBalance, setBoneBalance] = useState<number>(0); // in bones (converted from KRW)
  const [myDonations, setMyDonations] = useState<MyDonation[]>([]);
  const [totalDonated, setTotalDonated] = useState<number>(0); // in bones (converted from KRW)
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [myStorysLoading, setStorysLoading] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [donationCursor, setDonationCursor] = useState<number | null>(null);
  const [hasMoreDonations, setHasMoreDonations] = useState(false);

  // Story states
  const [myStories, setMyStories] = useState<ServerStory[]>([]);
  const [storyCursor, setStoryCursor] = useState<number | null>(null);
  const [hasMoreStories, setHasMoreStories] = useState(false);
  const [selectedStoryType, setSelectedStoryType] = useState<ServerTypeCode>("DAILY");

  // Member profile state
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Load member profile
  useEffect(() => {
    const loadMemberProfile = async () => {
      if (!isAuthenticated) return;

      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await getMemberProfile(token);
        if (response.isSuccess) {
          setMemberProfile(response.result);
        }
      } catch (err) {
        console.error("Failed to load member profile:", err);
      }
    };

    loadMemberProfile();
  }, [isAuthenticated]);

  // Load pets from Spring Backend
  useEffect(() => {
    const loadPets = async () => {
      const token = getAccessToken();
      if (!token) return;

      setPetsLoading(true);
      try {
        const response = await getMyPets(token);
        console.log("📋 [MyPage] Spring pets:", response);
        setPets(response.result || []);
      } catch (err) {
        console.error("Failed to load pets from Spring:", err);
      } finally {
        setPetsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadPets();
    }
  }, [isAuthenticated]);

  // Load donation data when donations tab is active
  useEffect(() => {
    const loadDonationData = async () => {
      if (activeTab !== "donations" || !isAuthenticated) return;

      setDonationsLoading(true);
      try {
        // Load donation history (first page)
        const response = await getMyDonations({ size: 10 });
        if (response.isSuccess) {
          // Convert KRW to bones (1000 KRW = 1 bone)
          const boneBalanceValue = Math.floor(response.result.currentBoneBalance / 1000);
          const totalDonatedValue = Math.floor(response.result.totalAmount / 1000);

          setBoneBalance(boneBalanceValue);
          setTotalDonated(totalDonatedValue);
          setMyDonations(response.result.donations);
          setDonationCursor(response.result.cursor);
          setHasMoreDonations(response.result.cursor !== null);
        }
      } catch (err) {
        console.error("Failed to load donation data:", err);
      } finally {
        setDonationsLoading(false);
      }
    };

    loadDonationData();
  }, [activeTab, isAuthenticated]);

  // Load more donations (pagination)
  const loadMoreDonations = async () => {
    if (!donationCursor || donationsLoading) return;

    setDonationsLoading(true);
    try {
      const response = await getMyDonations({ size: 10, cursor: donationCursor });
      if (response.isSuccess) {
        setMyDonations((prev) => [...prev, ...response.result.donations]);
        setDonationCursor(response.result.cursor);
        setHasMoreDonations(response.result.cursor !== null);
      }
    } catch (err) {
      console.error("Failed to load more donations:", err);
    } finally {
      setDonationsLoading(false);
    }
  };

  // Load story data when storys tab is active
  useEffect(() => {
    const loadMyStoryData = async () => {
      if (activeTab !== "storys" || !isAuthenticated) return;

      setStorysLoading(true);
      try {
        // Load story history (first page) - 선택된 타입으로 필터링
        const response = await getMystory({ size: 10, type: selectedStoryType });
        console.log("📋 [MyPage] Story API Response:", response);
        console.log("📋 [MyPage] Stories:", response.result?.stories);
        if (response.isSuccess) {
          setMyStories(response.result.stories || []);
          setStoryCursor(response.result.nextCursor);
          setHasMoreStories(response.result.nextCursor !== null);
        }
      } catch (err) {
        console.error("Failed to load story data:", err);
        setMyStories([]);
      } finally {
        setStorysLoading(false);
      }
    };

    loadMyStoryData();
  }, [activeTab, isAuthenticated, selectedStoryType]);

  // Load more stories (pagination)
  const loadMoreMyStory = async () => {
    if (!storyCursor || myStorysLoading) return;

    setStorysLoading(true);
    try {
      const response = await getMystory({ size: 10, cursor: storyCursor, type: selectedStoryType });
      if (response.isSuccess) {
        setMyStories((prev) => [...prev, ...(response.result.stories || [])]);
        setStoryCursor(response.result.nextCursor);
        setHasMoreStories(response.result.nextCursor !== null);
      }
    } catch (err) {
      console.error("Failed to load more stories:", err);
    } finally {
      setStorysLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleLogoutAll = async () => {
    if (
      confirm(
        "모든 기기에서 로그아웃하시겠습니까?\n다른 기기에서도 로그인이 해제됩니다."
      )
    ) {
      await logoutAll();
      router.push("/");
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 가입일 표시 (임시로 현재 날짜 기반)
  const joinYear = new Date().getFullYear();
  const joinMonth = new Date().getMonth() + 1;

  // 이니셜 추출 (이름의 첫 글자)
  const initial = user?.guardianInfo?.name?.charAt(0) || "U";

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>마이페이지</h1>

      {/* 프로필 카드 */}
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}>{initial}</div>
            <div className={styles.userInfo}>
              <h2 className={styles.userName}>
                {memberProfile?.username || user?.guardianInfo?.name || "사용자"}
              </h2>
              <p className={styles.userEmail}>
                {user?.guardianInfo?.email || "이메일 정보 없음"}
              </p>
              <p className={styles.userPhone}>
                {memberProfile?.phoneNumber || user?.guardianInfo?.phone || "전화번호 정보 없음"}
              </p>
              <p className={styles.userAddress}>
                서울시 강남구 역삼동
              </p>
              <span className={styles.joinBadge}>
                {memberProfile?.createdAt ? new Date(memberProfile.createdAt).getFullYear() + "년 " + (new Date(memberProfile.createdAt).getMonth() + 1) + "월 가입" : `${joinYear}년 ${joinMonth}월 가입`}
              </span>
            </div>
          </div>
          <button className={styles.editProfileBtn}>
            <span className={styles.editIcon}>✏️</span>
            프로필 편집
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabButton} ${
            activeTab === "pets" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("pets")}
        >
          내 반려동물
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "donations" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("donations")}
        >
          후원 내역
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "adoptions" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("adoptions")}
        >
          입양 신청
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "storys" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("storys")}
        >
          내 일지
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "settings" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("settings")}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className={styles.tabContent}>
        {/* 내 반려동물 탭 */}
        {activeTab === "pets" && (
          <div className={styles.petsTab}>
            <div className={styles.tabHeader}>
              <h2 className={styles.tabTitle}>내 반려동물</h2>
              <button
                className={styles.registerPetBtn}
                onClick={() => router.push("/pet/register")}
              >
                반려동물 등록
              </button>
            </div>

            {petsLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>펫 정보를 불러오는 중...</p>
              </div>
            ) : pets && pets.length > 0 ? (
              <div className={styles.petList}>
                {pets.map((pet, index) => (
                  <div key={pet.petId || `pet-${index}`} className={styles.petCard}>
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
                    <div className={styles.petInfo}>
                      <h3 className={styles.petName}>{pet.petName || "이름 없음"}</h3>
                      <p className={styles.petSpecies}>
                        🐾 반려동물
                        {pet.breed && ` · ${pet.breed}`}
                        {pet.old !== undefined && ` · ${pet.old}살`}
                        {pet.gender && ` · ${pet.gender === "MALE" ? "수컷" : pet.gender === "FEMALE" ? "암컷" : "미상"}`}
                      </p>
                      <p className={styles.petDID}>
                        DID: {pet.did.slice(0, 20)}...{pet.did.slice(-10)}
                      </p>
                    </div>
                    <button
                      className={styles.viewBtn}
                      onClick={() => {
                        router.push(`/pet/${pet.petId}`);
                      }}
                    >
                      상세보기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyIcon}>🐾</p>
                <p className={styles.emptyTitle}>아직 등록된 반려동물이 없습니다</p>
                <p className={styles.emptyDescription}>
                  반려동물을 등록하고 DID를 발급받으세요
                </p>
                <button
                  className={styles.goToDonationBtn}
                  onClick={() => router.push("/pet/register")}
                >
                  반려동물 등록하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* 후원 내역 탭 */}
        {activeTab === "donations" && (
          <div className={styles.donationsTab}>
            {/* 뼈다귀 잔액 카드 */}
            <div className={styles.boneBalanceCard}>
              <div className={styles.balanceHeader}>
                <h3 className={styles.balanceTitle}>🍖 내 뼈다귀</h3>
                <button
                  className={styles.chargeBtn}
                  onClick={() => setShowChargeModal(true)}
                >
                  충전하기
                </button>
              </div>
              <div className={styles.balanceAmount}>
                {donationsLoading ? (
                  <span className={styles.loadingText}>조회 중...</span>
                ) : (
                  <>
                    <span className={styles.amount}>{boneBalance}</span>
                    <span className={styles.unit}>개</span>
                  </>
                )}
              </div>
              <div className={styles.balanceInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>총 후원</span>
                  <span className={styles.infoValue}>
                    {totalDonated === 0 ? "아직 없어요" : `🍖 ${totalDonated}개`}
                  </span>
                </div>
              </div>
            </div>

            {/* 후원 내역 */}
            <div className={styles.donationHistorySection}>
              <h3 className={styles.sectionTitle}>후원 내역</h3>

              {donationsLoading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>후원 내역을 불러오는 중...</p>
                </div>
              ) : myDonations && myDonations.length > 0 ? (
                <>
                  <div className={styles.donationList}>
                    {myDonations.map((donation, idx) => {
                      // Convert KRW to bones (1000 KRW = 1 bone)
                      const boneAmount = Math.floor(donation.donationAmount / 1000);

                      return (
                        <div key={idx} className={styles.donationCard}>
                          <div className={styles.donationHeader}>
                            <h4 className={styles.donationTitle}>
                              {donation.donationTitle}
                            </h4>
                          </div>
                          <div className={styles.donationInfo}>
                            <span className={styles.donationAmount}>
                              🍖 {boneAmount}개 후원
                            </span>
                          </div>
                          <div className={styles.donationDate}>
                            {donation.donationTime
                              ? new Date(donation.donationTime).toLocaleDateString()
                              : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More 버튼 */}
                  {hasMoreDonations && (
                    <div className={styles.loadMoreSection}>
                      <button
                        className={styles.loadMoreBtn}
                        onClick={loadMoreDonations}
                        disabled={donationsLoading}
                      >
                        {donationsLoading ? "불러오는 중..." : "더보기"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyIcon}>🍖</p>
                  <p className={styles.emptyTitle}>아직 후원 내역이 없습니다</p>
                  <p className={styles.emptyDescription}>
                    도움이 필요한 반려동물들에게 따뜻한 마음을 전해보세요
                  </p>
                  <button
                    className={styles.goToDonationBtn}
                    onClick={() => router.push("/donation")}
                  >
                    후원하러 가기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 입양 신청 탭 */}
        {activeTab === "adoptions" && (
          <div className={styles.adoptionsTab}>
            <h2 className={styles.tabTitle}>입양 신청 현황</h2>
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>💝</p>
              <p className={styles.emptyTitle}>입양 신청 내역이 없습니다</p>
              <p className={styles.emptyDescription}>
                새로운 가족을 기다리는 반려동물들을 만나보세요
              </p>
              <button
                className={styles.goToDonationBtn}
                onClick={() => router.push("/adopt")}
              >
                입양하러 가기
              </button>
            </div>
          </div>
        )}

        {/* 내 일지 탭 */}
        {activeTab === "storys" && (
          <div className={styles.journalsTab}>
            <div className={styles.tabHeader}>
              <h2 className={styles.tabTitle}>내가 작성한 일지</h2>
              <select
                className={styles.typeFilter}
                value={selectedStoryType}
                onChange={(e) => setSelectedStoryType(e.target.value as ServerTypeCode)}
              >
                <option value="DAILY">일상 일지</option>
                <option value="REVIEW">입양 후기</option>
                <option value="ADOPTION">입양 신청</option>
                <option value="DONATION">후원</option>
              </select>
            </div>

            {myStorysLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>일지를 불러오는 중...</p>
              </div>
            ) : myStories && myStories.length > 0 ? (
              <>
                <div className={styles.storyList}>
                  {myStories.map((story) => {
                    console.log("📋 [MyPage] Rendering story:", story);
                    return (
                    <div
                      key={story.storyId}
                      className={styles.storyItem}
                      onClick={() => {
                        console.log("📋 [MyPage] Clicking story with ID:", story.storyId);
                        if (story.storyId) {
                          router.push(`/story/${story.storyId}`);
                        } else {
                          console.error("❌ [MyPage] storyId is undefined!");
                        }
                      }}
                    >
                      <div className={styles.storyItemHeader}>
                        <h3 className={styles.storyItemTitle}>{story.title}</h3>
                        <span className={styles.storyItemDate}>
                          {story.petName} • {story.breed}
                        </span>
                      </div>
                      <div className={styles.storyItemFooter}>
                        <div className={styles.storyItemStats}>
                          <span className={styles.statItem}>
                            ♡ {story.likeCount}
                          </span>
                          <span className={styles.statItem}>
                            💬 {story.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Load More 버튼 */}
                {hasMoreStories && (
                  <div className={styles.loadMoreSection}>
                    <button
                      className={styles.loadMoreBtn}
                      onClick={loadMoreMyStory}
                      disabled={myStorysLoading}
                    >
                      {myStorysLoading ? "불러오는 중..." : "더보기"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyIcon}>📝</p>
                <p className={styles.emptyTitle}>작성한 일지가 없습니다</p>
                <p className={styles.emptyDescription}>
                  반려동물과의 특별한 순간을 기록해보세요
                </p>
                <button
                  className={styles.goToDonationBtn}
                  onClick={() => router.push("/story")}
                >
                  일지 작성하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === "settings" && (
          <div className={styles.settingsTab}>
            <h2 className={styles.tabTitle}>설정</h2>

            {/* 알림 설정 */}
            <section className={styles.settingSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.icon}>🔔</span>
                알림 설정
              </h3>
              <div className={styles.settingList}>
                <div className={styles.settingItem}>
                  <span>입양 관련 알림</span>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className={styles.settingItem}>
                  <span>후원 알림</span>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className={styles.settingItem}>
                  <span>게임 알림</span>
                  <input type="checkbox" />
                </div>
              </div>
            </section>

            {/* 기타 설정 */}
            <section className={styles.settingSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.icon}>⚙️</span>
                기타 설정
              </h3>
              <div className={styles.settingList}>
                <button className={styles.settingButton}>
                  고객센터
                </button>
                <button className={styles.settingButton}>
                  제품 관리
                </button>
                <button
                  className={`${styles.settingButton} ${styles.danger}`}
                  onClick={() => {
                    if (confirm("정말 회원 탈퇴하시겠습니까?")) {
                      alert("회원 탈퇴 기능은 준비 중입니다.");
                    }
                  }}
                >
                  회원 탈퇴
                </button>
              </div>
            </section>

            {/* 로그아웃 섹션 */}
            <section className={styles.settingSection}>
              <div className={styles.settingList}>
                <button
                  className={styles.settingButton}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
                <button
                  className={styles.settingButton}
                  onClick={handleLogoutAll}
                >
                  모든 기기에서 로그아웃
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Bone Charge Modal */}
      <BoneChargeModal
        isOpen={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        onSuccess={(bones, newBalance) => {
          setBoneBalance(newBalance);
          setShowChargeModal(false);
        }}
      />
    </div>
  );
}
