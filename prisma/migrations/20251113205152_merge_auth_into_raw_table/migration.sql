/*
  Warnings:

  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_person_record_id_fkey";

-- AlterTable
ALTER TABLE "raw_people_influencers" ADD COLUMN     "account_role_permission" TEXT,
ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'user';

-- DropTable
DROP TABLE "accounts";
