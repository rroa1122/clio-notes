-- Migration: Enable Credentials Encryption using pgcrypto and Base64 encoding in Supabase
-- Target Table: public.provider_integrations (amexzone_password column)

-- 1. Ensure pgcrypto extension is active in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Create the Trigger Function to encrypt plaintext passwords before saving
CREATE OR REPLACE FUNCTION public.trg_encrypt_provider_password()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    enc_key TEXT := 'clio_sync_encryption_secret_key_2026_super_secret';
BEGIN
    -- Only encrypt if a password is provided and it is not already encrypted
    IF NEW.amexzone_password IS NOT NULL AND NEW.amexzone_password <> '' THEN
        IF NOT (NEW.amexzone_password LIKE 'ENCRYPTED:%') THEN
            NEW.amexzone_password := 'ENCRYPTED:' || encode(extensions.pgp_sym_encrypt(NEW.amexzone_password, enc_key), 'base64');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Bind Trigger to provider_integrations table
DROP TRIGGER IF EXISTS before_upsert_encrypt_provider_password ON public.provider_integrations;
CREATE TRIGGER before_upsert_encrypt_provider_password
    BEFORE INSERT OR UPDATE ON public.provider_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_encrypt_provider_password();

-- 4. Create Secure Function to decrypt credentials (accessible ONLY by service_role / admins)
CREATE OR REPLACE FUNCTION public.get_decrypted_integration(target_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    amexzone_email TEXT,
    amexzone_password TEXT,
    amexzone_pin TEXT,
    mfa_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to read password
AS $$
DECLARE
    enc_key TEXT := 'clio_sync_encryption_secret_key_2026_super_secret';
BEGIN
    RETURN QUERY
    SELECT 
        pi.user_id,
        pi.amexzone_email,
        CASE 
            WHEN pi.amexzone_password LIKE 'ENCRYPTED:%' THEN
                extensions.pgp_sym_decrypt(decode(substring(pi.amexzone_password from 11), 'base64'), enc_key)
            ELSE
                pi.amexzone_password
        END AS amexzone_password,
        pi.amexzone_pin,
        pi.mfa_status
    FROM public.provider_integrations pi
    WHERE pi.user_id = target_user_id;
END;
$$;

-- 5. Restrict Execution Rights for public.get_decrypted_integration to keep it extremely secure
REVOKE ALL ON FUNCTION public.get_decrypted_integration(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_decrypted_integration(UUID) TO service_role, postgres;
