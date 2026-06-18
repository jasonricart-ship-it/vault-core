-- CreateTable
CREATE TABLE "hall_of_fame_inductees" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "inducted_at" TIMESTAMP(3),
    "induction_year" INTEGER,
    "career_summary" TEXT,
    "plinth_inscription" TEXT,
    "bust_image_key" TEXT,
    "nomination_notes" TEXT,
    "votes_required" INTEGER NOT NULL DEFAULT 3,
    "votes_received" INTEGER NOT NULL DEFAULT 0,
    "founder_approved" BOOLEAN NOT NULL DEFAULT false,
    "founder_approved_at" TIMESTAMP(3),
    "founder_account_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'nominated',
    "is_inducted" BOOLEAN NOT NULL DEFAULT false,
    "inducted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hall_of_fame_inductees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_fame_nominations" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "nominated_by" TEXT NOT NULL,
    "nomination_notes" TEXT,
    "career_highlights" TEXT,
    "seconded_by" TEXT,
    "seconded_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_fame_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hall_of_fame_inductees_player_id_key" ON "hall_of_fame_inductees"("player_id");

-- AddForeignKey
ALTER TABLE "hall_of_fame_inductees" ADD CONSTRAINT "hall_of_fame_inductees_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_fame_nominations" ADD CONSTRAINT "hall_of_fame_nominations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
