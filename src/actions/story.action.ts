"use server";

import { revalidatePath } from "next/cache";
import type { ServerActionResponse } from "@/types";
import { getApiUrl } from "@/lib/api/config";

/**
 * 스토리 작성 Server Action
 */
export async function createStory(
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const petName = formData.get("petName") as string;
  const breed = formData.get("breed") as string;
  const images = formData.getAll("images") as File[];

  if (!title || !content || !petName) {
    return {
      status: 400,
      message: "제목, 내용, 반려동물 이름을 입력해주세요.",
    };
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("title", title);
    uploadFormData.append("content", content);
    uploadFormData.append("petName", petName);
    uploadFormData.append("breed", breed || "");

    images.forEach((image) => {
      uploadFormData.append("images", image);
    });

    const response = await fetch(
      getApiUrl('/story'),
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "스토리 작성에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath("/story");

    return {
      status: 200,
      message: "스토리가 작성되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Create story error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 스토리 수정 Server Action
 */
export async function updateStory(
  storyId: number,
  _: any,
  formData: FormData
): Promise<ServerActionResponse> {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  try {
    const response = await fetch(
      getApiUrl(`/story/${storyId}`),
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
        message: "스토리 수정에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath(`/story/${storyId}`);
    revalidatePath("/story");

    return {
      status: 200,
      message: "스토리가 수정되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Update story error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 스토리 삭제 Server Action
 */
export async function deleteStory(
  storyId: number
): Promise<ServerActionResponse> {
  try {
    const response = await fetch(
      getApiUrl(`/story/${storyId}`),
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "스토리 삭제에 실패했습니다.",
      };
    }

    revalidatePath("/story");

    return {
      status: 200,
      message: "스토리가 삭제되었습니다.",
    };
  } catch (error) {
    console.error("Delete story error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}
