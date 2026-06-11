-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "ppc_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "preferred_name" TEXT,
    "primary_sport" TEXT,
    "jersey_number" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "is_minor" BOOLEAN NOT NULL DEFAULT true,
    "vault_level" TEXT NOT NULL DEFAULT 'recorded',
    "strength_score" INTEGER NOT NULL DEFAULT 0,
    "exhibit_status" TEXT NOT NULL DEFAULT 'pending',
    "bust_color" TEXT NOT NULL DEFAULT 'grayscale',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "signature_on_file" BOOLEAN NOT NULL DEFAULT false,
    "signature_image_key" TEXT,
    "bust_image_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "guardian_account_id" TEXT,
    "created_by" TEXT,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governing_bodies" (
    "id" TEXT NOT NULL,
    "gov_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "gov_tier" TEXT NOT NULL,
    "sport" TEXT,
    "parent_gov_id" TEXT,
    "jurisdiction" TEXT,
    "vault_level" TEXT NOT NULL DEFAULT 'recorded',
    "strength_score" INTEGER NOT NULL DEFAULT 0,
    "registration_status" TEXT NOT NULL DEFAULT 'pending',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "authorization_granted" BOOLEAN NOT NULL DEFAULT false,
    "authorization_scope" TEXT,
    "annual_renewal_due" TIMESTAMP(3),
    "last_renewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governing_bodies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "org_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "sport" TEXT,
    "org_type" TEXT NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "vault_level" TEXT NOT NULL DEFAULT 'recorded',
    "strength_score" INTEGER NOT NULL DEFAULT 0,
    "registration_status" TEXT NOT NULL DEFAULT 'pending',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "authorization_granted" BOOLEAN NOT NULL DEFAULT false,
    "annual_renewal_due" TIMESTAMP(3),
    "last_renewed_at" TIMESTAMP(3),
    "admin_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "evt_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "sport" TEXT,
    "season_year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "location" TEXT,
    "sanctioning_gov_id" TEXT,
    "sanctioning_org_id" TEXT,
    "authority_level" TEXT,
    "vault_level" TEXT NOT NULL DEFAULT 'recorded',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gum_items" (
    "id" TEXT NOT NULL,
    "gum_code" TEXT NOT NULL,
    "player_id" TEXT,
    "org_id" TEXT,
    "event_id" TEXT,
    "item_type" TEXT NOT NULL,
    "item_description" TEXT NOT NULL,
    "sport" TEXT,
    "season_year" INTEGER,
    "jersey_number" TEXT,
    "gum_classification" TEXT NOT NULL DEFAULT 'GUM-5',
    "is_authenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticated_at" TIMESTAMP(3),
    "vault_level" TEXT NOT NULL DEFAULT 'recorded',
    "strength_score" INTEGER NOT NULL DEFAULT 0,
    "plate_tier" TEXT,
    "serial_number" TEXT,
    "edition_size" INTEGER,
    "has_swatch" BOOLEAN NOT NULL DEFAULT false,
    "swatch_image_key" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "revealed_by_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_by" TEXT,

    CONSTRAINT "gum_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "evidence_class" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "original_filename" TEXT,
    "file_size_bytes" INTEGER,
    "is_native_capture" BOOLEAN NOT NULL DEFAULT false,
    "capture_lat" DECIMAL(10,7),
    "capture_lng" DECIMAL(10,7),
    "capture_timestamp" TIMESTAMP(3),
    "capture_device_id" TEXT,
    "metadata_verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata_verified_at" TIMESTAMP(3),
    "visibility" TEXT NOT NULL DEFAULT 'authority',
    "admitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admitted_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_org_affiliations" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "season_year" INTEGER NOT NULL,
    "jersey_number" TEXT,
    "role" TEXT,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_alternate" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verified_by_org" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_org_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_gov_affiliations" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "gov_id" TEXT NOT NULL,
    "affiliation_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_gov_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_event_participation" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "org_id" TEXT,
    "role" TEXT,
    "outcome" TEXT,
    "is_champion" BOOLEAN NOT NULL DEFAULT false,
    "is_mvp" BOOLEAN NOT NULL DEFAULT false,
    "is_all_star" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_event_participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "display_name" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "linked_player_id" TEXT,
    "linked_org_id" TEXT,
    "linked_gov_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_ppc_number_key" ON "players"("ppc_number");

-- CreateIndex
CREATE UNIQUE INDEX "governing_bodies_gov_code_key" ON "governing_bodies"("gov_code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_org_code_key" ON "organizations"("org_code");

-- CreateIndex
CREATE UNIQUE INDEX "events_evt_code_key" ON "events"("evt_code");

-- CreateIndex
CREATE UNIQUE INDEX "gum_items_gum_code_key" ON "gum_items"("gum_code");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_guardian_account_id_fkey" FOREIGN KEY ("guardian_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governing_bodies" ADD CONSTRAINT "governing_bodies_parent_gov_id_fkey" FOREIGN KEY ("parent_gov_id") REFERENCES "governing_bodies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_admin_account_id_fkey" FOREIGN KEY ("admin_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_sanctioning_gov_id_fkey" FOREIGN KEY ("sanctioning_gov_id") REFERENCES "governing_bodies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_sanctioning_org_id_fkey" FOREIGN KEY ("sanctioning_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gum_items" ADD CONSTRAINT "gum_items_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gum_items" ADD CONSTRAINT "gum_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gum_items" ADD CONSTRAINT "gum_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_org_affiliations" ADD CONSTRAINT "player_org_affiliations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_org_affiliations" ADD CONSTRAINT "player_org_affiliations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_gov_affiliations" ADD CONSTRAINT "org_gov_affiliations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_gov_affiliations" ADD CONSTRAINT "org_gov_affiliations_gov_id_fkey" FOREIGN KEY ("gov_id") REFERENCES "governing_bodies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_event_participation" ADD CONSTRAINT "player_event_participation_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_event_participation" ADD CONSTRAINT "player_event_participation_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
