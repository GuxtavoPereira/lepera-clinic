import { PatientDataDto } from '../../patients/dto/patient-data.dto';

/** Cadastro público do paciente. Não aceita `responsibleDoctorId`. */
export class RegisterPatientDto extends PatientDataDto {}
