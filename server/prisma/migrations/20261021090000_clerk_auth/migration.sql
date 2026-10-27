-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN "clerkId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");