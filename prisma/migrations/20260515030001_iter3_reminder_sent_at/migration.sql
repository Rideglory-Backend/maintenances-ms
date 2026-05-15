-- iter-3: add reminderSentAt to Maintenance for deduplication of 30d date-based reminders
ALTER TABLE "Maintenance" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
