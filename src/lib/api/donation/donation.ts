import axios from "axios";
import type {
  ApiResponse,
  MakeDonationDto,
  MakeDonationResponse,
  MyDonationHistoryResponse,
  BoneBalanceResponse,
} from "@/types/api";
import { getAccessToken } from "../auth";
import { getApiUrl } from "../config";

// ==================== Donation Actions API ====================

/**
 * Make a donation to a campaign using bones
 *
 * @param dto - Donation data (memberId, itemId, donationId)
 * @returns Donation result with remaining bones and campaign total
 *
 * @example
 * ```typescript
 * const result = await makeDonation({
 *   memberId: 456,
 *   itemId: 2,  // 5 bones package
 *   donationId: 123
 * });
 * // Returns: {
 * //   donationId: 123,
 * //   amount: 5,
 * //   remainingBones: 45,
 * //   totalDonated: 2100000,
 * //   message: "후원해 주셔서 감사합니다!"
 * // }
 * ```
 */
export async function makeDonation(
  dto: MakeDonationDto
): Promise<ApiResponse<MakeDonationResponse>> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await axios.post<ApiResponse<MakeDonationResponse>>(
    getApiUrl('/api/donations'),
    dto,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

/**
 * Get my donation history with pagination
 *
 * @param params - Pagination params (cursor, size)
 * @returns List of my donations with statistics
 *
 * @example
 * ```typescript
 * const history = await getMyDonationHistory({ size: 20 });
 * // Returns: {
 * //   donations: [{ campaignTitle, petName, amount, donatedAt, ... }, ...],
 * //   totalDonated: 500,
 * //   campaignCount: 12,
 * //   nextCursor: 456
 * // }
 * ```
 */
export async function getMyDonationHistory(params?: {
  cursor?: number;
  size?: number;
}): Promise<ApiResponse<MyDonationHistoryResponse>> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const queryParams = new URLSearchParams();

  if (params?.cursor !== undefined && params.cursor !== null) {
    queryParams.set("cursor", String(params.cursor));
  }

  if (params?.size !== undefined) {
    queryParams.set("size", String(params.size));
  }

  const queryString = queryParams.toString();
  const url = getApiUrl(`/api/donations/mine${
    queryString ? `?${queryString}` : ""
  }`);

  const response = await axios.get<ApiResponse<MyDonationHistoryResponse>>(
    url,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

/**
 * Get my bone balance and transaction history
 *
 * @returns Current balance, total purchased, total donated, and recent transactions
 *
 * @example
 * ```typescript
 * const balance = await getBoneBalance();
 * // Returns: {
 * //   currentBalance: 450,
 * //   totalPurchased: 1000,
 * //   totalDonated: 550,
 * //   recentTransactions: [
 * //     { type: "PURCHASE", amount: 500, date: "2025-10-20T10:00:00Z" },
 * //     { type: "DONATION", amount: -50, campaignTitle: "...", date: "..." }
 * //   ]
 * // }
 * ```
 */
export async function getBoneBalance(): Promise<
  ApiResponse<BoneBalanceResponse>
> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await axios.get<ApiResponse<BoneBalanceResponse>>(
    getApiUrl('/api/donations/bone/'),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}
