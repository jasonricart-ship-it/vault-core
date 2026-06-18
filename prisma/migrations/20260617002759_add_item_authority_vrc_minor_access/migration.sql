-- AlterTable
ALTER TABLE "account_delegates" ADD COLUMN     "granted_by_guardian" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level_notes" TEXT,
ADD COLUMN     "minor_access_level" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "linked_vrc_id" TEXT;

-- AlterTable
ALTER TABLE "gum_items" ADD COLUMN     "authority_account_id" TEXT,
ADD COLUMN     "authority_notes" TEXT,
ADD COLUMN     "authority_since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "authority_type" TEXT NOT NULL DEFAULT 'guardian',
ADD COLUMN     "frozen_at" TIMESTAMP(3),
ADD COLUMN     "frozen_by" TEXT,
ADD COLUMN     "frozen_reason" TEXT,
ADD COLUMN     "is_frozen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "item_authority_log" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "from_account_id" TEXT,
    "to_account_id" TEXT NOT NULL,
    "authority_type" TEXT NOT NULL,
    "transfer_type" TEXT NOT NULL,
    "confirmed_by_from" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by_to" BOOLEAN NOT NULL DEFAULT false,
    "vault_witnessed" BOOLEAN NOT NULL DEFAULT false,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "documentation_key" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_authority_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_registry_collectors" (
    "id" TEXT NOT NULL,
    "vrc_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "collector_focus" TEXT,
    "vault_level" TEXT NOT NULL DEFAULT 'recorded',
    "strength_score" INTEGER NOT NULL DEFAULT 0,
    "bust_color" TEXT NOT NULL DEFAULT 'grayscale',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "exhibit_status" TEXT NOT NULL DEFAULT 'active',
    "bust_image_key" TEXT,
    "account_id" TEXT,
    "is_guardian" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vault_registry_collectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vault_registry_collectors_vrc_number_key" ON "vault_registry_collectors"("vrc_number");

-- CreateIndex
CREATE UNIQUE INDEX "vault_registry_collectors_account_id_key" ON "vault_registry_collectors"("account_id");

-- AddForeignKey
ALTER TABLE "vault_registry_collectors" ADD CONSTRAINT "vault_registry_collectors_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
