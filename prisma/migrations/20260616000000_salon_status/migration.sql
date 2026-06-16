-- CreateEnum
CREATE TYPE "SalonStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
-- NOT NULL + DEFAULT 'ACTIVE' backfills every existing salon to ACTIVE as part of
-- the ADD COLUMN, so no separate data-migration step is needed.
ALTER TABLE "Salon" ADD COLUMN     "status" "SalonStatus" NOT NULL DEFAULT 'ACTIVE';
