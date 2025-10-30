"use server";

import { revalidatePath } from "next/cache";
import type { ServerActionResponse } from "@/types";

/**
 * 후원 공고 생성 Server Action
 */
export async function createDonation(
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const targetAmount = formData.get("targetAmount") as string;
  const description = formData.get("description") as string;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!title || !targetAmount) {
    return {
      status: 400,
      message: "제목과 목표 금액을 입력해주세요.",
    };
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("title", title);
    uploadFormData.append("targetAmount", targetAmount);
    uploadFormData.append("description", description || "");
    if (thumbnail) {
      uploadFormData.append("thumbnail", thumbnail);
    }

    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/donation`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "후원 공고 등록에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath("/donation");

    return {
      status: 200,
      message: "후원 공고가 등록되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Create donation error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 후원하기 Server Action (블록체인 트랜잭션)
 */
export async function donate(
  donationId: number,
  amount: string,
  txHash: string
): Promise<ServerActionResponse> {
  if (!amount || !txHash) {
    return {
      status: 400,
      message: "후원 금액과 트랜잭션 해시가 필요합니다.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/donation/${donationId}/donate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          txHash,
        }),
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "후원 처리에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath(`/donation/${donationId}`);
    revalidatePath("/donation");

    return {
      status: 200,
      message: "후원이 완료되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Donate error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}
