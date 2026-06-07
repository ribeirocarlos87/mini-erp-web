-- Add address and logo fields to companies table
ALTER TABLE "companies" ADD COLUMN "address" VARCHAR(255);
ALTER TABLE "companies" ADD COLUMN "logo" TEXT;
