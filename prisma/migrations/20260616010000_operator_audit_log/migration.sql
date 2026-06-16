-- CreateEnum
CREATE TYPE "OperatorAction" AS ENUM ('SUSPEND', 'REACTIVATE', 'REVEAL_PII', 'VIEW_TENANT');

-- CreateTable
CREATE TABLE "OperatorAuditLog" (
    "id" TEXT NOT NULL,
    "operatorEmail" TEXT NOT NULL,
    "action" "OperatorAction" NOT NULL,
    "targetSalonId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperatorAuditLog_targetSalonId_createdAt_idx" ON "OperatorAuditLog"("targetSalonId", "createdAt");

-- CreateIndex
CREATE INDEX "OperatorAuditLog_createdAt_idx" ON "OperatorAuditLog"("createdAt");
