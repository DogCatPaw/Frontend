"use server";

import { revalidatePath } from "next/cache";
import type { ServerActionResponse } from "@/types";

/**
 * 댓글 작성 Server Action
 */
export async function createComment(
  postType: "story" | "review",
  postId: number,
  content: string
): Promise<ServerActionResponse> {
  if (!content) {
    return {
      status: 400,
      message: "댓글 내용을 입력해주세요.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/${postType}/${postId}/comment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "댓글 작성에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath(`/${postType}/${postId}`);

    return {
      status: 200,
      message: "댓글이 작성되었습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Create comment error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 댓글 삭제 Server Action
 */
export async function deleteComment(
  postType: "story" | "review",
  postId: number,
  commentId: number
): Promise<ServerActionResponse> {
  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/${postType}/${postId}/comment/${commentId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "댓글 삭제에 실패했습니다.",
      };
    }

    revalidatePath(`/${postType}/${postId}`);

    return {
      status: 200,
      message: "댓글이 삭제되었습니다.",
    };
  } catch (error) {
    console.error("Delete comment error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 좋아요 토글 Server Action
 */
export async function toggleLike(
  postType: "story" | "review",
  postId: number
): Promise<ServerActionResponse> {
  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/${postType}/${postId}/like`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      return {
        status: response.status,
        message: "좋아요 처리에 실패했습니다.",
      };
    }

    const data = await response.json();
    revalidatePath(`/${postType}/${postId}`);
    revalidatePath(`/${postType}`);

    return {
      status: 200,
      message: data.result.liked ? "좋아요를 눌렀습니다." : "좋아요를 취소했습니다.",
      data: data.result,
    };
  } catch (error) {
    console.error("Toggle like error:", error);
    return {
      status: 500,
      message: "서버 오류가 발생했습니다.",
    };
  }
}
