-- Migration: add_send_time_window
-- Add sendFrom and sendUntil fields to ScheduledReminder for time window feature

ALTER TABLE "ScheduledReminder" ADD COLUMN "sendFrom" TEXT;
ALTER TABLE "ScheduledReminder" ADD COLUMN "sendUntil" TEXT;
