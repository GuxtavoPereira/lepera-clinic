import { BadRequestException } from '@nestjs/common';

/** Kept separate from the database enum so historical records remain readable. */
export function requireInPerson(modality?: string | null) {
  if (modality != null && modality !== 'IN_PERSON') {
    throw new BadRequestException(
      'A clínica realiza somente consultas presenciais. Para um registro online antigo, cancele ou recuse o registro e faça um novo agendamento presencial após combinar com o paciente.',
    );
  }
}
