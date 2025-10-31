import axios from "axios";
import type {
  ApiResponse,
  DonationDetailResponse,
} from "@/types/api";
import { getApiUrl } from "../config";

// ==================== Donation Detail API ====================

/**
 * Get donation campaign details with contribution history
 *
 * @param donationId - Donation campaign ID
 * @param params - Pagination params for donation history (cursor, size)
 * @returns Complete donation campaign details and donor history
 *
 * @example
 * ```typescript
 * const detail = await getDonationDetail(123, { size: 20 });
 * // Returns: {
 * //   donationPost: { title, progress, petInfo, ... },
 * //   donationHistory: [{ donorNickname, amount, donatedAt }, ...],
 * //   nextCursor: 456
 * // }
 * ```
 */
export async function getDonationDetail(
  donationId: number,
  params?: {
    cursor?: number;
    size?: number;
  }
): Promise<ApiResponse<DonationDetailResponse>> {
  const queryParams = new URLSearchParams();

  if (params?.cursor !== undefined && params.cursor !== null) {
    queryParams.set("cursor", String(params.cursor));
  }

  if (params?.size !== undefined) {
    queryParams.set("size", String(params.size));
  }

  const queryString = queryParams.toString();
  const url = getApiUrl(`/api/donation/${donationId}${
    queryString ? `?${queryString}` : ""
  }`);

  const response = await axios.get<ApiResponse<DonationDetailResponse>>(url);

  console.log(response.data)

  return response.data;
}
