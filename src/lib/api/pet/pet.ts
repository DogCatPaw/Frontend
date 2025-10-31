import { getApiUrl } from "../config";

export type ServerGender = "FEMALE" | "MALE";

export type ServerBreedCode =
  | "MALTESE"
  | "POODLE"
  | "POMERANIAN"
  | "CHIHUAHUA"
  | "SHIH_TZU"
  | "YORKSHIRE_TERRIER"
  | "PUG"
  | "MINIATURE_SCHNAUZER"
  | "CAVALIER_KING_CHARLES_SPANIEL"
  | "BICHON_FRISE"
  | "FRENCH_BULLDOG"
  | "DACHSHUND"
  | "BEAGLE"
  | "CORGI"
  | "GOLDEN_RETRIEVER"
  | "LABRADOR_RETRIEVER"
  | "GERMAN_SHEPHERD"
  | "SIBERIAN_HUSKY"
  | "SHIBA_INU"
  | "MIXED"
  | "OTHERS";

export interface ServerPet {
  petId: number;
  did: string;
  petProfile: string;
  petName: string;
  old: number;
  gender: ServerGender;
  breed: ServerBreedCode;
}

export interface GetPetResponse {
  isSuccess: boolean;
  status: string;
  code: string;
  message: string;
  result: ServerPet[];
}

// ---- 호출 함수 (그대로 리턴) ----
export async function getPet() {
  // Access Token 가져오기
  const accessToken = localStorage.getItem("accessToken") || "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  console.log("📤 [Pet API] Fetching pets with token:", accessToken ? "✓" : "✗");

  const res = await fetch(getApiUrl('/api/pet'), {
    method: "GET",
    headers: headers,
    next: { revalidate: 0 },
  });

  console.log("📦 [Pet API] Response status:", res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ [Pet API] Error:", text);
    throw new Error(`getPet 실패 (${res.status}) ${text}`);
  }

  const data: GetPetResponse = await res.json();
  console.log("✅ [Pet API] Pets loaded:", data.result?.length || 0);
  return data;
}
