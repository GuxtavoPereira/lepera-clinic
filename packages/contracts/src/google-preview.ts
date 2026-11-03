/** A sessão de visualização não é uma conta de paciente nem um perfil RBAC. */
export type GooglePreviewConfig = {
  enabled: boolean;
  clientId: string | null;
};

export type GooglePreviewChallenge = {
  nonce: string;
  challenge: string;
  expiresIn: number;
};

export type GooglePreviewSession = {
  accessToken: string;
  profile: { name: string; email: string };
  expiresAt: string;
};

export type PreviewDoctor = {
  id: string;
  name: string;
  specialty: string;
  clinicalApproach: string | null;
};

export type PreviewSlot = {
  doctorId: string;
  doctorName: string;
  start: string;
  end: string;
};
