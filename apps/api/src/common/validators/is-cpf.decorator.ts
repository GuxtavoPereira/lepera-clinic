import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isValidCpf } from '../utils/cpf';

/** Valida o CPF pelos dígitos verificadores. Combine com @Transform(digitsOnly). */
export function IsCpf(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: { message: 'CPF inválido', ...options },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidCpf(value),
      },
    });
  };
}
