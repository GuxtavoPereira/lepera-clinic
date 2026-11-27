-- Historical CID-10 and DSM-5 entries keep their original ciphertext and edition.
ALTER TABLE "clinical_records"
  ADD COLUMN "cid11" TEXT,
  ADD COLUMN "dsm5Tr" TEXT;
