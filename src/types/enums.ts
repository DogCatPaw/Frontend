// ==================== Gender (성별) ====================
export enum Gender {
  MALE = 0,
  FEMALE = 1,
}

export const GENDER_LABEL: Record<Gender, string> = {
  [Gender.MALE]: "남성",
  [Gender.FEMALE]: "여성",
};

// ==================== Role (역할) ====================
export enum Role {
  ADMIN = 0,
  USER = 1,
}

export const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: "관리자 (보호소/단체)",
  [Role.USER]: "일반 사용자 (개인 보호자)",
};

// ==================== Breed (품종) ====================
export type BreedCode =
  | "MALTESE"
  | "POODLE"
  | "POMERANIAN"
  | "CHIHUAHUA"
  | "SHIH_TZU"
  | "YORKSHIRE_TERRIER"
  | "PUG"
  | "MINIATURE_SCHNAUZER"
  | "CAVALIER_KING_CHARLES_SPANIEL"
  | "BICHON_FRISE"
  | "FRENCH_BULLDOG"
  | "DACHSHUND"
  | "BEAGLE"
  | "CORGI"
  | "GOLDEN_RETRIEVER"
  | "LABRADOR_RETRIEVER"
  | "GERMAN_SHEPHERD"
  | "SIBERIAN_HUSKY"
  | "SHIBA_INU"
  | "MIXED"
  | "OTHERS";

export const BREED_LABEL: Record<BreedCode, string> = {
  MALTESE: "말티즈",
  POODLE: "푸들",
  POMERANIAN: "포메라니안",
  CHIHUAHUA: "치와와",
  SHIH_TZU: "시츄",
  YORKSHIRE_TERRIER: "요크셔 테리어",
  PUG: "퍼그",
  MINIATURE_SCHNAUZER: "미니어처 슈나우저",
  CAVALIER_KING_CHARLES_SPANIEL: "카발리에 킹 찰스 스패니얼",
  BICHON_FRISE: "비숑 프리제",
  FRENCH_BULLDOG: "프렌치 불도그",
  DACHSHUND: "닥스훈트",
  BEAGLE: "비글",
  CORGI: "웰시코기",
  GOLDEN_RETRIEVER: "골든 리트리버",
  LABRADOR_RETRIEVER: "래브라도 리트리버",
  GERMAN_SHEPHERD: "저먼 셰퍼드",
  SIBERIAN_HUSKY: "시베리안 허스키",
  SHIBA_INU: "시바견",
  MIXED: "믹스견",
  OTHERS: "기타",
};

// ==================== Adoption Status (입양 상태) ====================
export type AdoptionStatus = "ACTIVE" | "ADOPTING" | "ADOPTED";

export const ADOPTION_STATUS_LABEL: Record<AdoptionStatus, string> = {
  ACTIVE: "입양 가능",
  ADOPTING: "입양중",
  ADOPTED: "입양 완료",
};

// ==================== Donation Status (후원 상태) ====================
export type DonationStatus = "ACTIVE" | "ACHIEVED" | "CLOSED";

export const DONATION_STATUS_LABEL: Record<DonationStatus, string> = {
  ACTIVE: "후원 가능",
  ACHIEVED: "목표 달성",
  CLOSED: "마감",
};

// ==================== Region (지역 코드) ====================
export type RegionCode =
  | "SEOUL"
  | "BUSAN"
  | "DAEGU"
  | "INCHEON"
  | "GWANGJU"
  | "DAEJEON"
  | "ULSAN"
  | "SEJONG"
  | "GYEONGGI"
  | "GANGWON"
  | "CHUNGBUK"
  | "CHUNGNAM"
  | "JEONBUK"
  | "JEONNAM"
  | "GYEONGBUK"
  | "GYEONGNAM"
  | "JEJU";

export const REGION_LABEL: Record<RegionCode, string> = {
  SEOUL: "서울특별시",
  BUSAN: "부산광역시",
  DAEGU: "대구광역시",
  INCHEON: "인천광역시",
  GWANGJU: "광주광역시",
  DAEJEON: "대전광역시",
  ULSAN: "울산광역시",
  SEJONG: "세종특별자치시",
  GYEONGGI: "경기도",
  GANGWON: "강원특별자치도",
  CHUNGBUK: "충청북도",
  CHUNGNAM: "충청남도",
  JEONBUK: "전북특별자치도",
  JEONNAM: "전라남도",
  GYEONGBUK: "경상북도",
  GYEONGNAM: "경상남도",
  JEJU: "제주특별자치도",
};

// ==================== Districts (지역별 시군구) ====================
export const DISTRICTS: Record<RegionCode, string[]> = {
  SEOUL: [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
  ],

  BUSAN: [
    "강서구",
    "금정구",
    "기장군",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
  ],

  DAEGU: [
    "남구",
    "달서구",
    "달성군",
    "동구",
    "북구",
    "서구",
    "수성구",
    "중구",
  ],

  INCHEON: [
    "강화군",
    "계양구",
    "남동구",
    "동구",
    "미추홀구",
    "부평구",
    "서구",
    "연수구",
    "옹진군",
    "중구",
  ],

  GWANGJU: ["광산구", "남구", "동구", "북구", "서구"],

  DAEJEON: ["대덕구", "동구", "서구", "유성구", "중구"],

  ULSAN: ["남구", "동구", "북구", "울주군", "중구"],

  SEJONG: [
    "조치원읍",
    "한솔동",
    "아름동",
    "도담동",
    "고운동",
    "종촌동",
  ],

  GYEONGGI: [
    "수원시",
    "고양시",
    "용인시",
    "성남시",
    "부천시",
    "화성시",
    "남양주시",
    "안산시",
    "안양시",
    "평택시",
    "의정부시",
    "시흥시",
    "파주시",
    "김포시",
    "광명시",
    "광주시",
    "군포시",
    "이천시",
    "오산시",
    "하남시",
    "양주시",
    "구리시",
    "안성시",
    "포천시",
    "의왕시",
    "여주시",
    "양평군",
    "가평군",
    "연천군",
  ],

  GANGWON: [
    "춘천시",
    "원주시",
    "강릉시",
    "동해시",
    "태백시",
    "속초시",
    "삼척시",
    "홍천군",
    "횡성군",
    "영월군",
    "평창군",
    "정선군",
    "철원군",
    "화천군",
    "양구군",
    "인제군",
    "고성군",
    "양양군",
  ],

  CHUNGBUK: [
    "청주시",
    "충주시",
    "제천시",
    "보은군",
    "옥천군",
    "영동군",
    "진천군",
    "괴산군",
    "음성군",
    "단양군",
  ],

  CHUNGNAM: [
    "천안시",
    "공주시",
    "보령시",
    "아산시",
    "서산시",
    "논산시",
    "계룡시",
    "당진시",
    "금산군",
    "부여군",
    "서천군",
    "청양군",
    "홍성군",
    "예산군",
    "태안군",
  ],

  JEONBUK: [
    "전주시",
    "군산시",
    "익산시",
    "정읍시",
    "남원시",
    "김제시",
    "완주군",
    "진안군",
    "무주군",
    "장수군",
    "임실군",
    "순창군",
    "고창군",
    "부안군",
  ],

  JEONNAM: [
    "목포시",
    "여수시",
    "순천시",
    "나주시",
    "광양시",
    "담양군",
    "곡성군",
    "구례군",
    "고흥군",
    "보성군",
    "화순군",
    "장흥군",
    "강진군",
    "해남군",
    "영암군",
    "무안군",
    "함평군",
    "영광군",
    "장성군",
    "완도군",
    "진도군",
    "신안군",
  ],

  GYEONGBUK: [
    "포항시",
    "경주시",
    "김천시",
    "안동시",
    "구미시",
    "영주시",
    "영천시",
    "상주시",
    "문경시",
    "경산시",
    "군위군",
    "의성군",
    "청송군",
    "영양군",
    "영덕군",
    "청도군",
    "고령군",
    "성주군",
    "칠곡군",
    "예천군",
    "봉화군",
    "울진군",
    "울릉군",
  ],

  GYEONGNAM: [
    "창원시",
    "진주시",
    "통영시",
    "사천시",
    "김해시",
    "밀양시",
    "거제시",
    "양산시",
    "의령군",
    "함안군",
    "창녕군",
    "고성군",
    "남해군",
    "하동군",
    "산청군",
    "함양군",
    "거창군",
    "합천군",
  ],

  JEJU: ["제주시", "서귀포시"],
};

// ==================== Bone Packages (뼈다귀 패키지) ====================
export interface BonePackage {
  bones: number;
  price: number;
  label: string;
}

export const BONE_PACKAGES: Record<number, BonePackage> = {
  1: { bones: 1, price: 1000, label: "🍖 1 뼈다귀" },
  2: { bones: 5, price: 5000, label: "🍖 5 뼈다귀" },
  3: { bones: 10, price: 10000, label: "🍖 10 뼈다귀" },
  4: { bones: 20, price: 20000, label: "🍖 20 뼈다귀" },
};

// ==================== Donation Category (후원 카테고리) ====================
export type DonationCategory = "MEDICAL" | "FOOD" | "SHELTER" | "OTHER";

export const DONATION_CATEGORY_LABEL: Record<DonationCategory, string> = {
  MEDICAL: "의료비",
  FOOD: "사료/급식",
  SHELTER: "보호소 운영",
  OTHER: "기타",
};
