-- CreateEnum
CREATE TYPE "Role" AS ENUM ('superadmin', 'admin', 'editor', 'user');

-- CreateTable
CREATE TABLE "raw_people_influencers" (
    "record_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "full_name" TEXT,
    "preferred_name" TEXT,
    "gender" TEXT,
    "birth_date" DATE,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "occupation" TEXT,
    "influencer_category" TEXT,
    "primary_platform" TEXT,
    "followers_count" INTEGER,
    "total_followers_count" INTEGER,
    "engagement_rate" DECIMAL(6,3),
    "engagement_rate_tier" TEXT,
    "interests" TEXT,
    "notes" TEXT,
    "secondary_platform" TEXT,
    "secondary_followers_count" INTEGER,
    "average_monthly_reach" INTEGER,
    "collaboration_status" TEXT,
    "languages" TEXT,
    "portfolio_url" TEXT,
    "last_contact_date" DATE,
    "role_permission" TEXT,

    CONSTRAINT "raw_people_influencers_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "role_permission" TEXT NOT NULL,
    "person_record_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_person_record_id_key" ON "accounts"("person_record_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_person_record_id_fkey" FOREIGN KEY ("person_record_id") REFERENCES "raw_people_influencers"("record_id") ON DELETE SET NULL ON UPDATE CASCADE;
