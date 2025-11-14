/*
  Warnings:

  - You are about to drop the column `account_role_permission` on the `raw_people_influencers` table. All the data in the column will be lost.
  - You are about to drop the column `role_permission` on the `raw_people_influencers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "raw_people_influencers" DROP COLUMN "account_role_permission",
DROP COLUMN "role_permission";
