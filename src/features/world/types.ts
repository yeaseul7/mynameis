export type PlayerSnapshot = {
  userId: string;
  petId: string;
  petName: string;
  x: number;
  y: number;
  direction: string;
};

export type Profile = Pick<PlayerSnapshot, "petId" | "petName">;
