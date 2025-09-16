-- Add missing prep_time_seconds column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS prep_time_seconds INTEGER;