/**
 * Common API
 *
 * ⚠️ DEPRECATED: 이미지 업로드는 @/lib/utils/imageUpload 사용 권장
 * - uploadImageWithWeb3Token() - Web3Token 인증 (회원가입/비로그인 상태)
 * - uploadImageWithJWT() - JWT 인증 (로그인 상태)
 *
 * 이 파일은 레거시 호환성을 위해 유지되며, 향후 제거될 예정입니다.
 */

// 이미지 업로드는 @/lib/utils/imageUpload 사용을 권장합니다.
export { uploadImageWithWeb3Token, uploadImageWithJWT } from "@/lib/utils/imageUpload";
