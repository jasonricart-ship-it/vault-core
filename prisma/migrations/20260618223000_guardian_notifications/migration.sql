-- CreateTable
CREATE TABLE "guardian_notifications" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "guardian_notifications" ADD CONSTRAINT "guardian_notifications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
