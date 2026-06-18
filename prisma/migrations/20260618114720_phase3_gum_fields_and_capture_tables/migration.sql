-- AlterTable
ALTER TABLE "gum_items" ADD COLUMN     "admitted_at" TIMESTAMP(3),
ADD COLUMN     "capturer_credit" TEXT,
ADD COLUMN     "corridor_segment" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "display_position" INTEGER,
ADD COLUMN     "owner_statement" VARCHAR(200),
ADD COLUMN     "primary_evidence_class" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "shared_captures" ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'member';

-- CreateTable
CREATE TABLE "org_capture_designees" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "designated_by" TEXT NOT NULL,
    "designated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "org_capture_designees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evt_capture_requests" (
    "id" TEXT NOT NULL,
    "evt_id" TEXT NOT NULL,
    "requested_by_account" TEXT NOT NULL,
    "target_player_id" TEXT,
    "request_text" VARCHAR(200) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "fulfilled_at" TIMESTAMP(3),
    "fulfilled_by_capture_id" TEXT,

    CONSTRAINT "evt_capture_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_capture_designees_org_id_account_id_key" ON "org_capture_designees"("org_id", "account_id");

-- AddForeignKey
ALTER TABLE "org_capture_designees" ADD CONSTRAINT "org_capture_designees_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_capture_designees" ADD CONSTRAINT "org_capture_designees_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_capture_designees" ADD CONSTRAINT "org_capture_designees_designated_by_fkey" FOREIGN KEY ("designated_by") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_capture_requests" ADD CONSTRAINT "evt_capture_requests_evt_id_fkey" FOREIGN KEY ("evt_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_capture_requests" ADD CONSTRAINT "evt_capture_requests_requested_by_account_fkey" FOREIGN KEY ("requested_by_account") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_capture_requests" ADD CONSTRAINT "evt_capture_requests_target_player_id_fkey" FOREIGN KEY ("target_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
