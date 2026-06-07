-- AlterTable: User ganha flag de onboarding completo (NULL = ainda não fez)
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

-- AlterTable: Company expande com campos coletados no onboarding
ALTER TABLE "companies"
  ADD COLUMN "tax_regime" VARCHAR(50),
  ADD COLUMN "segment" VARCHAR(100),
  ADD COLUMN "business_type" VARCHAR(20),
  ADD COLUMN "multi_store" VARCHAR(50);

-- CreateTable: respostas do onboarding (1:1 com User)
CREATE TABLE "onboarding_responses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sales_channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heard_about" VARCHAR(50),
    "current_control" VARCHAR(20),
    "improvement_goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "learning_prefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tech_level" VARCHAR(20),
    "tutorial_pref" VARCHAR(20),
    "whatsapp" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_responses_user_id_key" ON "onboarding_responses"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding_responses" ADD CONSTRAINT "onboarding_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
