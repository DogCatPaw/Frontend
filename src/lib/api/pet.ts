/**
 * Pet Registration API
 *
 * Based on 01-pet-registration-guide.md
 */

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ==================== Types ====================

export enum PetSpecies {
  DOG = "dog",
  CAT = "cat",
  BIRD = "bird",
  RABBIT = "rabbit",
  HAMSTER = "hamster",
  OTHER = "other",
}

export enum PetGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  UNKNOWN = "UNKNOWN",
}

export enum PetBreed {
  // Dogs
  GOLDEN_RETRIEVER = "GOLDEN_RETRIEVER",
  LABRADOR_RETRIEVER = "LABRADOR_RETRIEVER",
  POODLE = "POODLE",
  CHIHUAHUA = "CHIHUAHUA",
  MALTESE = "MALTESE",
  POMERANIAN = "POMERANIAN",
  SHIH_TZU = "SHIH_TZU",
  YORKSHIRE_TERRIER = "YORKSHIRE_TERRIER",
  PUG = "PUG",
  MINIATURE_SCHNAUZER = "MINIATURE_SCHNAUZER",
  CAVALIER_KING_CHARLES_SPANIEL = "CAVALIER_KING_CHARLES_SPANIEL",
  BICHON_FRISE = "BICHON_FRISE",
  FRENCH_BULLDOG = "FRENCH_BULLDOG",
  DACHSHUND = "DACHSHUND",
  BEAGLE = "BEAGLE",
  CORGI = "CORGI",
  GERMAN_SHEPHERD = "GERMAN_SHEPHERD",
  SIBERIAN_HUSKY = "SIBERIAN_HUSKY",
  SHIBA_INU = "SHIBA_INU",
  // Cats
  PERSIAN = "PERSIAN",
  SIAMESE = "SIAMESE",
  MAINE_COON = "MAINE_COON",
  RAGDOLL = "RAGDOLL",
  BRITISH_SHORTHAIR = "BRITISH_SHORTHAIR",
  SCOTTISH_FOLD = "SCOTTISH_FOLD",
  BENGAL = "BENGAL",
  // Mixed/Others
  MIXED = "MIXED",
  OTHERS = "OTHERS",
}

export interface PetData {
  petName?: string;
  specifics: PetSpecies;
  breed?: PetBreed;
  old?: number;
  gender?: PetGender;
  weight?: number;
  color?: string;
  feature?: string;
  neutral?: boolean;
}

export interface PrepareRegistrationRequest extends PetData {
  noseImage: string; // S3 filename
  images: string; // Comma-separated S3 filenames
}

export interface TransactionData {
  to: string;
  data: string;
  from: string;
  gasLimit: string;
  gasPrice: string;
  value: string;
}

export interface VCSigningData {
  message: {
    vcType: string;
    sub: string;
    guardian: string;
    biometricHash: string;
    petData: any;
    issuedAt: string;
    nonce: string;
  };
  messageHash: string;
  signingData: string; // ⭐ 원본 서명 데이터 (해시되지 않은 문자열)
}

export interface PrepareRegistrationResponse {
  success: boolean;
  petDID: string;
  message: string;
  petRegistrationTxData: TransactionData;
  guardianLinkTxData: TransactionData;
  vcSigningData: VCSigningData;
  nextStep: string;
}

export interface RegisterPetRequest extends PetData {
  noseImage: string;
  images: string;
  signedTx: string; // Pet registration signed transaction
  guardianLinkSignedTx: string; // Guardian link signed transaction
  vcSignature: string; // VC message signature
  vcMessage: string; // Stringified VC message
  vcSignedData?: string; // ⭐ 원본 서명 데이터 (백엔드 검증용)
}

export interface RegisterPetResponse {
  success: boolean;
  petDID: string;
  txHash: string;
  blockNumber: number;
  message: string;
  jobs: {
    guardianLink: string;
    vc: string;
    imageMove: string;
  };
  note: string;
}

// ==================== API Functions ====================

/**
 * Step 4: Prepare registration - Get signing data for 3 transactions
 */
export async function prepareRegistration(
  petData: PrepareRegistrationRequest,
  accessToken: string
): Promise<PrepareRegistrationResponse> {
  const response = await axios.post<PrepareRegistrationResponse>(
    `${API_BASE_URL}/pet/prepare-registration`,
    petData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

/**
 * Step 6: Submit all signatures to complete registration
 */
export async function registerPet(
  petData: RegisterPetRequest,
  accessToken: string
): Promise<RegisterPetResponse> {
  const response = await axios.post<RegisterPetResponse>(
    `${API_BASE_URL}/pet/register`,
    petData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

/**
 * Get my pet list from Spring Backend
 */
export async function getMyPets(accessToken: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/pet`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch my pets:", error);
    throw error;
  }
}

/**
 * Get single pet by petId from Spring Backend
 */
export async function getPetById(petId: number, accessToken: string) {
  try {
    const response = await getMyPets(accessToken);
    const pets = response.result || [];
    const pet = pets.find((p: any) => p.petId === petId);

    if (!pet) {
      throw new Error(`Pet with ID ${petId} not found`);
    }

    return pet;
  } catch (error: any) {
    console.error(`Failed to fetch pet ${petId}:`, error);
    throw error;
  }
}

/**
 * Get pet ownership transfer history
 */
export async function getPetHistory(petDID: string, accessToken: string) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/pet/history/${encodeURIComponent(petDID)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch pet history:", error);
    throw error;
  }
}
