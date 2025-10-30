"use server";

import { revalidatePath } from "next/cache";
import type { ServerActionResponse } from "@/types";

/**
 * 입양 후기 작성 Server Action
 */
export async function createReview(
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const petName = formData.get("petName") as string;
  const breed = formData.get("breed") as string;
  const adoptId = formData.get("adoptId") as string;
  const images = formData.getAll("images") as File[];

  if (!title || !content || !petName || !adoptId) {
    return {
      status: 400,
      message: "필수 정보를 모두 입력해주세요.",
    };
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("title", title);
    uploadFormData.append("content", content);
    uploadFormData.append("petName", petName);
    uploadFormData.append("breed", breed || "");
    uploadFormData.append("adoptId", adoptId);

    images.forEach((image) => {
      uploadFormData.append("images", image);
    });

    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/review`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "입양 후기 작성에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath("/review");

    return {
      status: 200,
      message: "입양 후기가 작성되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Create review error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 입양 후기 수정 Server Action
 */
export async function updateReview(
  reviewId: number,
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/review/${reviewId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "입양 후기 수정에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath(`/review/${reviewId}`);
    revalidatePath("/review");

    return {
      status: 200,
      message: "입양 후기가 수정되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Update review error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 입양 후기 삭제 Server Action
 */
export async function deleteReview(
  reviewId: number
): Promise<ServerActionResponse> {
  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/review/${reviewId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "입양 후기 삭제에 실패했습니다.",
      };
    }

    revalidatePath("/review");

    return {
      status: 200,
      message: "입양 후기가 삭제되었습니다.",
    };
  } catch (error) {
    console.error("Delete review error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}
