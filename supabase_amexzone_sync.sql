-- Migration: Create tables for Amexzone Note Posting Bot

-- 1. Create provider_integrations table to store Amexzone credentials per user
CREATE TABLE IF NOT EXISTS public.provider_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    amexzone_email TEXT NOT NULL,
    amexzone_password TEXT NOT NULL,
    amexzone_pin TEXT DEFAULT '1206',
    mfa_status TEXT NOT NULL DEFAULT 'not_connected', -- 'not_connected', 'awaiting_2fa', 'connected', 'expired'
    mfa_code TEXT, -- Temporary buffer for user's MFA code input
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for provider_integrations
ALTER TABLE public.provider_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden gestionar su propia integración" ON public.provider_integrations;
CREATE POLICY "Los usuarios pueden gestionar su propia integración" 
ON public.provider_integrations 
FOR ALL 
USING (auth.uid() = user_id);

-- 2. Create amexzone_note_tasks table to queue notes to be posted
CREATE TABLE IF NOT EXISTS public.amexzone_note_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id TEXT REFERENCES public.notes(id) ON DELETE CASCADE, -- Changed from UUID to TEXT to match public.notes(id)
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_dob TEXT,
    visit_date TEXT,
    note_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    result_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for amexzone_note_tasks
ALTER TABLE public.amexzone_note_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propias tareas de sincronización" ON public.amexzone_note_tasks;
CREATE POLICY "Los usuarios pueden gestionar sus propias tareas de sincronización" 
ON public.amexzone_note_tasks 
FOR ALL 
USING (auth.uid() = user_id);
