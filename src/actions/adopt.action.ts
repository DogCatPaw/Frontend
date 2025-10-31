"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ServerActionResponse } from "@/types";
import { getApiUrl } from "@/lib/api/config";

/**
 * 입양 공고 생성 Server Action
 */
export async function createAdoption(
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const breed = formData.get("breed") as string;
  const region = formData.get("region") as string;
  const district = formData.get("district") as string;
  const description = formData.get("description") as string;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!title || !breed || !region) {
    return {
      status: 400,
      message: "필수 정보를 모두 입력해주세요.",
    };
  }

  try {
    // FormData로 파일 업로드
    const uploadFormData = new FormData();
    uploadFormData.append("title", title);
    uploadFormData.append("breed", breed);
    uploadFormData.append("region", region);
    uploadFormData.append("district", district || "");
    uploadFormData.append("description", description || "");
    if (thumbnail) {
      uploadFormData.append("thumbnail", thumbnail);
    }

    const response = await fetch(
      getApiUrl('/adoption'),
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        message: errorData.message || "입양 공고 등록에 실패했습니다.",
      };
    }

    const data = await response.json();

    // 입양 목록 페이지 재검증
    revalidatePath("/adopt");

    return {
      status: 200,
      message: "입양 공고가 등록되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Create adoption error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 입양 공고 수정 Server Action
 */
export async function updateAdoption(
  adoptId: number,
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const breed = formData.get("breed") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;

  try {
    const response = await fetch(
      getApiUrl(`/adoption/${adoptId}`),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          breed,
          description,
          status,
        }),
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "입양 공고 수정에 실패했습니다.",
      };
    }

    const data = await response.json();

    // 해당 입양 공고 상세 페이지와 목록 재검증
    revalidatePath(`/adopt/${adoptId}`);
    revalidatePath("/adopt");

    return {
      status: 200,
      message: "입양 공고가 수정되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Update adoption error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 입양 공고 삭제 Server Action
 */
export async function deleteAdoption(
  adoptId: number
): Promise<ServerActionResponse> {
  try {
    const response = await fetch(
      getApiUrl(`/adoption/${adoptId}`),
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "입양 공고 삭제에 실패했습니다.",
      };
    }

    // 입양 목록 페이지 재검증
    revalidatePath("/adopt");

    return {
      status: 200,
      message: "입양 공고가 삭제되었습니다.",
    };
  } catch (error) {
    console.error("Delete adoption error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 입양 신청 Server Action
 */
export async function applyForAdoption(
  adoptId: number,
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const message = formData.get("message") as string;

  if (!name || !phone || !address) {
    return {
      status: 400,
      message: "필수 정보를 모두 입력해주세요.",
    };
  }

  try {
    const response = await fetch(
      getApiUrl(`/adoption/${adoptId}/apply`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: response.status,
        message: errorData.message || "입양 신청에 실패했습니다.",
      };
    }

    const data = await response.json();

    return {
      status: 200,
      message: "입양 신청이 완료되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Apply for adoption error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}
