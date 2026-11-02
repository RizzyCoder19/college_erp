-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL_PRIVATE',
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT NOT NULL,
    "replacedDocumentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentDocument_replacedDocumentId_fkey" FOREIGN KEY ("replacedDocumentId") REFERENCES "StudentDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentDocumentVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentDocumentVerification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StudentDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentDocumentVerification_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocument_storageKey_key" ON "StudentDocument"("storageKey");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_idx" ON "StudentDocument"("studentId");

-- CreateIndex
CREATE INDEX "StudentDocument_status_idx" ON "StudentDocument"("status");

-- CreateIndex
CREATE INDEX "StudentDocument_category_idx" ON "StudentDocument"("category");

-- CreateIndex
CREATE INDEX "StudentDocument_uploadedByUserId_idx" ON "StudentDocument"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "StudentDocument_storageKey_idx" ON "StudentDocument"("storageKey");

-- CreateIndex
CREATE INDEX "StudentDocumentVerification_documentId_idx" ON "StudentDocumentVerification"("documentId");

-- CreateIndex
CREATE INDEX "StudentDocumentVerification_reviewerUserId_idx" ON "StudentDocumentVerification"("reviewerUserId");
