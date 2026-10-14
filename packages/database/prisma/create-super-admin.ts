// Uso (a partir da raiz do repositório):
//   SUPER_ADMIN_CPF=52998224725 SUPER_ADMIN_EMAIL=dev@clinica.com SUPER_ADMIN_PASSWORD='uma-senha-longa-123' pnpm db:super-admin
//
// Variáveis opcionais: SUPER_ADMIN_NAME.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { isValidCpf } from "./cpf";
import { createPrismaClient } from "../client";

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const cpf = process.env.SUPER_ADMIN_CPF?.replace(/\D/g, "") ?? "";
  if (!isValidCpf(cpf)) {
    throw new Error("Defina SUPER_ADMIN_CPF com um CPF válido (11 dígitos).");
  }
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Administrador";

  if (!email || !password) {
    throw new Error(
      "Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD no ambiente.",
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `A senha do super administrador precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida.");
  }

  const prisma = createPrismaClient(process.env.DATABASE_URL);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing && existing.role !== "SUPER_ADMIN") {
      throw new Error(
        `Já existe um usuário ${email} com o perfil ${existing.role}. ` +
          "Use outro e-mail: esta conta não é promovida automaticamente.",
      );
    }

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, cpf, isActive: true },
      });
      console.log(`Senha do super administrador ${email} redefinida.`);
    } else {
      await prisma.user.create({
        data: { name, email, passwordHash, cpf, role: "SUPER_ADMIN" },
      });
      console.log(`Super administrador ${email} criado.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
