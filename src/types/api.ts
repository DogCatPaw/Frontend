// ==================== Common Types ====================
export interface ServerActionResponse {
  status: number;
  message: string;
  data?: any;
}

export interface ApiResponse<T = any> {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: T;
}

// ==================== JWT Types ====================
export interface JwtPayload {
  sub: string; // userId or email
  userName: string;
  role: number;
  exp: number;
  iat: number;
}

// ==================== User Types ====================
export interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "SHELTER" | "ADMIN";
  walletAddress?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role: "USER" | "SHELTER";
}

// ==================== Payment Types ====================
export interface PreparePaymentDto {
  itemId: number; // Bone package ID (1, 2, 3, 4)
}

export interface PreparePaymentResponse {
  orderId: string;
  orderName: string;
  totalAmount: number;
  status: string;
}

export interface ApprovePaymentDto {
  orderId: string;
  paymentKey: string;
  finalAmount: number;
}

export interface ApprovePaymentResponse {
  success: boolean;
  orderId: string;
  bones: number; // Bones added
  newBalance: number; // Total bone balance
  amount: number; // KRW charged
  paymentMethod?: string;
  approvedAt?: string;
  message: string;
}

// ==================== Donation Types ====================
export interface CreateDonationPostDto {
  memberId: number;
  petId: number;
  title: string;
  targetAmount: number; // In KRW
  deadline: string; // YYYY-MM-DD
  category: "MEDICAL" | "FOOD" | "SHELTER" | "OTHER";
  content: string;
  images?: string; // Comma-separated file keys
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface DonationListParams {
  cursor?: number;
  size?: number;
  breed?: string;
  status?: "ACTIVE" | "ACHIEVED" | "CLOSED";
}

export interface DonationPost {
  donationId: number;
  title: string;
  category: "MEDICAL" | "FOOD" | "SHELTER" | "OTHER";
  targetAmount: number;
  currentAmount: number;
  progress: number; // Percentage (0-100)
  status: "ACTIVE" | "ACHIEVED" | "CLOSED";
  deadline: string;
  createdAt?: string;
  petInfo?: {
    petId?: number;
    name?: string;
    breed?: string;
    age?: number;
    imageUrl?: string;
  };
  guardianInfo?: {
    memberId?: number | string;
    name?: string;
    nickname?: string;
    walletAddress?: string;
    shelterName?: string;
    shelterLocation?: string;
  };
  content: string;
  images?: string[];
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  donorCount?: number;
  patronCount?: number;
}

export interface DonationListResponse {
  donations: DonationPost[];
  nextCursor: number | null;
}

export interface DonationHistory {
  donorNickname: string;
  amount: number; // In bones or KRW
  donatedAt: string;
}

export interface DonationDetailResponse {
  donationPost: DonationPost;
  donationHistory: DonationHistory[];
  nextCursor: number | null;
}

export interface MakeDonationDto {
  memberId: string; // walletAddress
  itemId: number; // Bone package ID
  donationId: number;
}

export interface MakeDonationResponse {
  donationId: number;
  amount: number; // Bones donated
  remainingBones: number;
  totalDonated: number; // Campaign total
  message: string;
}

export interface MyDonation {
  donationId: number;
  campaignTitle: string;
  petName: string;
  amount: number; // Bones
  donatedAt: string;
  campaignStatus: "ACTIVE" | "ACHIEVED" | "CLOSED";
}

export interface MyDonationHistoryResponse {
  donations: MyDonation[];
  totalDonated: number; // Total bones ever donated
  campaignCount: number; // Number of campaigns supported
  nextCursor: number | null;
}

export interface BoneTransaction {
  type: "PURCHASE" | "DONATION";
  amount: number;
  date: string;
  campaignTitle?: string;
}

export interface BoneBalanceResponse {
  currentBalance?: number; // Legacy field name
  currentBoneBalance?: number; // Actual field name from backend
  totalPurchased?: number;
  totalDonated?: number;
  recentTransactions?: BoneTransaction[];
}

// ==================== Shelter Types ====================
export interface Shelter {
  shelterId: number;
  shelterName: string;
  region: string; // RegionCode from enums
  district: string;
  address: string;
  contact: string;
  website?: string;
  operatingHours?: string;
  availableAnimals?: number;
}

export interface ShelterListParams {
  cursor?: number;
  size?: number;
  region?: string; // RegionCode
  district?: string;
  keyword?: string;
}

export interface ShelterListResponse {
  shelters: Shelter[];
  nextCursor: number | null;
  hasMore: boolean;
}
