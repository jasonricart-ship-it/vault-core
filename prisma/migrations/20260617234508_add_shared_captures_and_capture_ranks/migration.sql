-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "capture_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capture_rank" TEXT NOT NULL DEFAULT 'eye_witness';

-- CreateTable
CREATE TABLE "shared_captures" (
    "id" TEXT NOT NULL,
    "evidence_file_id" TEXT NOT NULL,
    "captured_by_account" TEXT NOT NULL,
    "shared_to_player_id" TEXT NOT NULL,
    "capture_mode" TEXT NOT NULL DEFAULT 'live_capture',
    "metadata_verified" BOOLEAN NOT NULL DEFAULT false,
    "evidence_class" TEXT NOT NULL DEFAULT 'E3',
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admitted" BOOLEAN NOT NULL DEFAULT false,
    "admitted_at" TIMESTAMP(3),
    "admitted_by" TEXT,
    "capture_credit" TEXT,
    "secondary_witnesses" JSONB,

    CONSTRAINT "shared_captures_pkey" PRIMARY KEY ("id")
);
