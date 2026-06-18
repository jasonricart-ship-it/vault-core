-- CreateTable
CREATE TABLE "vault_violations" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "violation_class" TEXT NOT NULL,
    "violation_type" TEXT NOT NULL,
    "reported_by" TEXT NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audit_opened_at" TIMESTAMP(3),
    "audit_due_at" TIMESTAMP(3),
    "audit_completed_at" TIMESTAMP(3),
    "auditor_account_id" TEXT,
    "audit_outcome" TEXT,
    "audit_notes" TEXT,
    "audit_fee_amount" DECIMAL(65,30),
    "audit_fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "audit_fee_paid_at" TIMESTAMP(3),
    "fine_amount" DECIMAL(65,30),
    "fine_paid" BOOLEAN NOT NULL DEFAULT false,
    "fine_paid_at" TIMESTAMP(3),
    "records_affected" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "suspended_at" TIMESTAMP(3),
    "restored_at" TIMESTAMP(3),
    "permanently_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vault_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_affected_records" (
    "id" TEXT NOT NULL,
    "violation_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "reverification_covered" BOOLEAN NOT NULL DEFAULT false,
    "reverification_cost" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violation_affected_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reinstatement_applications" (
    "id" TEXT NOT NULL,
    "violation_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fines_paid" BOOLEAN NOT NULL DEFAULT false,
    "players_made_whole" BOOLEAN NOT NULL DEFAULT false,
    "suspension_served" BOOLEAN NOT NULL DEFAULT false,
    "governance_audit_passed" BOOLEAN NOT NULL DEFAULT false,
    "gov_cosign_account_id" TEXT,
    "gov_cosigned_at" TIMESTAMP(3),
    "vault_approval_account_id" TEXT,
    "vault_approved_at" TIMESTAMP(3),
    "rogue_actor_claim" BOOLEAN NOT NULL DEFAULT false,
    "rogue_actor_evidence_key" TEXT,
    "self_reported" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "outcome_notes" TEXT,
    "probation_ends_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reinstatement_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_guardians" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "guardian_role" TEXT NOT NULL,
    "authority_scope" TEXT NOT NULL DEFAULT 'full',
    "legal_documentation_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_authority_approval" BOOLEAN NOT NULL DEFAULT false,
    "added_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transitions" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "from_account_id" TEXT NOT NULL,
    "to_account_id" TEXT NOT NULL,
    "transition_type" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "authorized_by" TEXT NOT NULL,
    "documentation_key" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_delegates" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "delegate_account_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "permission_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "account_delegates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corridor_access_grants" (
    "id" TEXT NOT NULL,
    "grantor_account_id" TEXT NOT NULL,
    "grantee_account_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "item_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "corridor_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_action_log" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_detail" JSONB,
    "permission_used" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representative_contacts" (
    "id" TEXT NOT NULL,
    "rep_id" TEXT,
    "player_id" TEXT,
    "account_id" TEXT,
    "contact_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outcome" TEXT,
    "referred_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "representative_contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "violation_affected_records" ADD CONSTRAINT "violation_affected_records_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "vault_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violation_affected_records" ADD CONSTRAINT "violation_affected_records_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reinstatement_applications" ADD CONSTRAINT "reinstatement_applications_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "vault_violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_guardians" ADD CONSTRAINT "player_guardians_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_guardians" ADD CONSTRAINT "player_guardians_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transitions" ADD CONSTRAINT "account_transitions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_delegates" ADD CONSTRAINT "account_delegates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_delegates" ADD CONSTRAINT "account_delegates_delegate_account_id_fkey" FOREIGN KEY ("delegate_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor_access_grants" ADD CONSTRAINT "corridor_access_grants_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor_access_grants" ADD CONSTRAINT "corridor_access_grants_grantor_account_id_fkey" FOREIGN KEY ("grantor_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor_access_grants" ADD CONSTRAINT "corridor_access_grants_grantee_account_id_fkey" FOREIGN KEY ("grantee_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_action_log" ADD CONSTRAINT "guardian_action_log_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_action_log" ADD CONSTRAINT "guardian_action_log_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
