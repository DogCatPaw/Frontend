import axios from "axios";
import type { ApiResponse, ShelterListParams, ShelterListResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Get list of shelters with optional filtering
 * @param params - Pagination and filter parameters
 * @returns List of shelters with pagination info
 */
export async function getShelterList(
  params: ShelterListParams = {}
): Promise<ApiResponse<ShelterListResponse>> {
  try {
    const queryParams = new URLSearchParams();

    if (params.cursor) queryParams.append("cursor", params.cursor.toString());
    if (params.size) queryParams.append("size", params.size.toString());
    if (params.region) queryParams.append("region", params.region);
    if (params.district) queryParams.append("district", params.district);
    if (params.keyword) queryParams.append("keyword", params.keyword);

    const url = `${API_BASE_URL}/api/shelter${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    console.log("📤 [Shelter API] Fetching shelters:", url);

    const response = await axios.get<ApiResponse<ShelterListResponse>>(url);

    console.log("✅ [Shelter API] Response:", response.data);

    return response.data;
  } catch (error: any) {
    console.error("❌ [Shelter API] Error:", error);
    throw new Error(error.response?.data?.message || "보호소 목록을 불러오는데 실패했습니다.");
  }
}
