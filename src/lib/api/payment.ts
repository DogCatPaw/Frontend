import axios from "axios";
import type {
  ApiResponse,
  PreparePaymentDto,
  PreparePaymentResponse,
  ApprovePaymentDto,
  ApprovePaymentResponse,
} from "@/types/api";
import { getAccessToken } from "./auth";
import { getApiUrl } from "./config";

// ==================== Payment API ====================

/**
 * Prepare payment for bone purchase
 * Step 1 of payment flow: Register orderId and amount
 *
 * @param itemId - Bone package ID (1: 1뼈, 2: 5뼈, 3: 10뼈, 4: 20뼈)
 * @returns Payment preparation info (orderId, amount, itemName, etc.)
 *
 * @example
 * ```typescript
 * const prepareData = await preparePayment(2); // 5 bones package
 * // Returns: { orderId, amount: 5000, itemName: "🍖 5 뼈다귀", ... }
 * ```
 */
export async function preparePayment(
  itemId: number
): Promise<ApiResponse<PreparePaymentResponse>> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await axios.post<ApiResponse<PreparePaymentResponse>>(
    getApiUrl('/api/payment/prepare'),
    { itemId } as PreparePaymentDto,
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
 * Approve payment and add bones to account
 * Step 2 of payment flow: Finalize payment after Toss Payments gateway
 *
 * @param dto - Payment approval data (orderId, paymentKey, finalAmount)
 * @param walletAddress - User's wallet address (required query param)
 * @returns Approval result with bones added and new balance
 *
 * @example
 * ```typescript
 * // After Toss Payments redirect to success URL
 * const params = new URLSearchParams(window.location.search);
 * const approvalData = {
 *   orderId: params.get('orderId')!,
 *   paymentKey: params.get('paymentKey')!,
 *   finalAmount: parseInt(params.get('amount')!)
 * };
 *
 * const result = await approvePayment(approvalData, walletAddress);
 * // Returns: { success: true, bones: 5, newBalance: 50, ... }
 * ```
 */
export async function approvePayment(
  dto: ApprovePaymentDto,
  walletAddress: string
): Promise<ApiResponse<ApprovePaymentResponse>> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  if (!walletAddress) {
    throw new Error("지갑 주소가 필요합니다.");
  }

  const response = await axios.post<ApiResponse<ApprovePaymentResponse>>(
    getApiUrl(`/api/payment/approve?walletAddress=${encodeURIComponent(walletAddress.toLowerCase())}`),
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
 * Complete payment flow helper
 * Combines prepare → Toss Payments → approve into one streamlined process
 *
 * @param itemId - Bone package ID
 * @param onRedirect - Callback for Toss Payments redirect (receives orderId, amount, itemName)
 * @returns Prepared payment info for Toss Payments widget
 *
 * @example
 * ```typescript
 * // Start payment flow
 * const preparedPayment = await initiatePayment(2, (orderId, amount, itemName) => {
 *   // Launch Toss Payments widget here
 *   tossPayments.requestPayment({
 *     amount,
 *     orderId,
 *     orderName: itemName,
 *     successUrl: `${window.location.origin}/payment/success`,
 *     failUrl: `${window.location.origin}/payment/fail`
 *   });
 * });
 * ```
 */
export async function initiatePayment(
  itemId: number,
  onRedirect?: (orderId: string, amount: number, itemName: string) => void
): Promise<PreparePaymentResponse> {
  const response = await preparePayment(itemId);

  if (!response.isSuccess) {
    throw new Error(response.message || "결제 준비에 실패했습니다.");
  }

  const { orderId, totalAmount, orderName } = response.result;

  // Call redirect callback if provided
  if (onRedirect) {
    onRedirect(orderId, totalAmount, orderName);
  }

  return response.result;
}
