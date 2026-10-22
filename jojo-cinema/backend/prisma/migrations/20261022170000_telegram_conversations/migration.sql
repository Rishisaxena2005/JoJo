CREATE TABLE "telegram_conversations" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messages" JSONB NOT NULL DEFAULT '[]',
  "state" JSONB NOT NULL DEFAULT '{}',
  "processedUpdateIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "telegram_conversations_chatId_userId_key" ON "telegram_conversations"("chatId", "userId");
CREATE INDEX "telegram_conversations_lastActivityAt_idx" ON "telegram_conversations"("lastActivityAt");

