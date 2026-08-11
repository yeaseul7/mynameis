export type DogProfile = {
  id: string;
  name: string;
  breed: string;
  birthDate: string | null;
  weightKg: number | null;
  gender: "MALE" | "FEMALE";
  neuteringStatus: "NEUTERED" | "NOT_NEUTERED" | "UNKNOWN";
  animalRegistrationNo?: string | null;
  photos: Array<{ url: string; sortOrder: number; isPrimary: boolean }>;
};
