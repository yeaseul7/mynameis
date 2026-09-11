export type DogGender = "MALE" | "FEMALE";
export type DogNeuteringStatus = "NEUTERED" | "NOT_NEUTERED" | "UNKNOWN";
export type DogPublicLinkType = "PROFILE" | "CARE" | "LOST";

export type DogPhoto = {
  id?: string;
  storageKey?: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type DogProfile = {
  id: string;
  ownerId?: string;
  name: string;
  breed: string;
  birthDate: string | null;
  weightKg: number | null;
  gender: DogGender;
  neuteringStatus: DogNeuteringStatus;
  animalRegistrationNo?: string | null;
  instagramUsername?: string | null;
  inviteCode?: string | null;
  careProfile?: DogCareProfile | null;
  photos: DogPhoto[];
};

export type DogCareProfile = {
  takesMedication: boolean | null;
  primaryHospital: string | null;
  primaryHospitalAddress: string | null;
  primaryHospitalPhone: string | null;
  emergencyNote: string | null;
  emergencyContact1: string;
  emergencyContact2: string | null;
  lostLocationAddress: string | null;
  lostLocationDistrict: string | null;
  lostLocationNeighborhood: string | null;
  lostLocationDetail: string | null;
  lostLocationLat: number | null;
  lostLocationLng: number | null;
  lostAt: string | null;
  mealsPerDay: number | null;
  marksIndoors: boolean | null;
  fifthVaccineDone: boolean | null;
  daycareExperience: boolean | null;
  hasAllergy: boolean | null;
  handoffMemo: string | null;
};

export type DogProfileInput = {
  name: string;
  breed: string;
  birthDate: string;
  weightKg: number | null;
  gender: DogGender;
  neuteringStatus: DogNeuteringStatus;
  animalRegistrationNo: string | null;
  instagramUsername: string | null;
};

export type DogCareProfileInput = DogCareProfile;

export type DogPublicLink = {
  dogId: string;
  ownerId: string;
  type: DogPublicLinkType;
  token: string;
};
