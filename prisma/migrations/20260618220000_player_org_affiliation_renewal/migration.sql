-- AlterTable
ALTER TABLE "player_org_affiliations" ADD COLUMN "last_renewed_at" TIMESTAMP(3),
ADD COLUMN "annual_renewal_due" TIMESTAMP(3);
