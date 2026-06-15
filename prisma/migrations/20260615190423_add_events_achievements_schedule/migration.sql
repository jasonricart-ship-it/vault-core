/*
  Warnings:

  - You are about to drop the column `authority_level` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `event_type` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `sanctioning_gov_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `sanctioning_org_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `sport` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `vault_level` on the `events` table. All the data in the column will be lost.
  - Added the required column `org_id` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_sanctioning_gov_id_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_sanctioning_org_id_fkey";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "authority_level",
DROP COLUMN "end_date",
DROP COLUMN "event_type",
DROP COLUMN "is_verified",
DROP COLUMN "sanctioning_gov_id",
DROP COLUMN "sanctioning_org_id",
DROP COLUMN "sport",
DROP COLUMN "start_date",
DROP COLUMN "vault_level",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "event_date" TIMESTAMP(3),
ADD COLUMN     "gov_id" TEXT,
ADD COLUMN     "org_id" TEXT NOT NULL,
ADD COLUMN     "registration_status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "ppc_id" TEXT,
    "evt_id" TEXT,
    "org_id" TEXT,
    "achievement_type" TEXT NOT NULL,
    "achievement_scope" TEXT NOT NULL DEFAULT 'personal',
    "medal_tier" TEXT,
    "notes" TEXT,
    "season_year" INTEGER,
    "awarded_at" TIMESTAMP(3),
    "capture_lat" DOUBLE PRECISION,
    "capture_lng" DOUBLE PRECISION,
    "capture_timestamp" TIMESTAMP(3),
    "capture_device_id" TEXT,
    "native_capture" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_entries" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "evt_id" TEXT,
    "opponent" TEXT,
    "game_date" TIMESTAMP(3),
    "location" TEXT,
    "result" TEXT,
    "season_year" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_ppc_id_fkey" FOREIGN KEY ("ppc_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_evt_id_fkey" FOREIGN KEY ("evt_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_evt_id_fkey" FOREIGN KEY ("evt_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
