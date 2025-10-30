import { uploadImageWithJWT } from "./imageUpload";

/**
 * 이미지 파일 유효성 검사
 * @param file - 검사할 파일
 * @param maxSizeMB - 최대 파일 크기 (MB)
 * @returns 유효성 검사 결과
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // 파일 타입 확인
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.",
    };
  }

  // 파일 크기 확인
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`,
    };
  }

  return { valid: true };
}

/**
 * 다중 이미지 파일 유효성 검사
 * @param files - 검사할 파일 배열
 * @param maxFiles - 최대 파일 개수
 * @param maxSizeMB - 최대 파일 크기 (MB)
 * @returns 유효성 검사 결과
 */
export function validateImageFiles(
  files: File[],
  maxFiles: number = 5,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: "파일을 선택해주세요." };
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `최대 ${maxFiles}개의 이미지만 업로드 가능합니다.`,
    };
  }

  for (const file of files) {
    const result = validateImageFile(file, maxSizeMB);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * 이미지 업로드 (단일)
 * @param file - 업로드할 파일
 * @param accessToken - JWT access token
 * @param onProgress - 업로드 진행 콜백 (옵션)
 * @returns 업로드된 파일 키
 */
export async function handleImageUpload(
  file: File,
  accessToken: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 유효성 검사
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (onProgress) onProgress(0);

  try {
    const fileKey = await uploadImageWithJWT(file, accessToken);
    if (onProgress) onProgress(100);
    return fileKey;
  } catch (error: any) {
    console.error("이미지 업로드 실패:", error);
    throw new Error(
      error?.message || "이미지 업로드에 실패했습니다. 다시 시도해주세요."
    );
  }
}

/**
 * 이미지 업로드 (다중)
 * @param files - 업로드할 파일 배열
 * @param accessToken - JWT access token
 * @param onProgress - 업로드 진행 콜백 (옵션)
 * @returns 업로드된 파일 키 배열
 */
export async function handleImagesUpload(
  files: File[],
  accessToken: string,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  // 유효성 검사
  const validation = validateImageFiles(files);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (onProgress) onProgress(0);

  try {
    // 파일들을 순차적으로 업로드
    const fileKeys: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const fileKey = await uploadImageWithJWT(files[i], accessToken);
      fileKeys.push(fileKey);

      // 진행률 업데이트
      if (onProgress) {
        const progress = Math.round(((i + 1) / files.length) * 100);
        onProgress(progress);
      }
    }

    return fileKeys;
  } catch (error: any) {
    console.error("이미지 업로드 실패:", error);
    throw new Error(
      error?.message || "이미지 업로드에 실패했습니다. 다시 시도해주세요."
    );
  }
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @param bytes - 바이트 크기
 * @returns 읽기 쉬운 형식 (예: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
