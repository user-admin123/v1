-- ==========================================
-- 0. CLEANUP & EXTENSIONS
-- ==========================================
DO $$ 
BEGIN
    -- Drop existing to ensure no conflicts during migration
    DROP VIEW IF EXISTS public.admin_usage_dashboard CASCADE;
    DROP TABLE IF EXISTS public.menu_items CASCADE;
    DROP TABLE IF EXISTS public.categories CASCADE;
    DROP TABLE IF EXISTS public.usage_ledger CASCADE;
    DROP TABLE IF EXISTS public.restaurant_stats CASCADE;
    DROP TABLE IF EXISTS public.restaurant CASCADE;
    
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
END $$;

-- ==========================================
-- 1. TABLES
-- ==========================================

CREATE TABLE public.restaurant (
    id uuid PRIMARY KEY DEFAULT auth.uid(),
    name text NOT NULL,
    tagline text,
    logo_url text,
    show_veg_filter boolean DEFAULT false,
    show_sold_out boolean DEFAULT true,
    show_search boolean DEFAULT true,
    show_qr_logo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid REFERENCES public.restaurant(id) ON DELETE CASCADE,
    name text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.menu_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id uuid REFERENCES public.restaurant(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    available boolean DEFAULT true,
    image_url text,
    item_type text NOT NULL DEFAULT 'veg', -- Matches your "veg" | "nonveg" type
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.usage_ledger (
    restaurant_id uuid REFERENCES public.restaurant(id) ON DELETE CASCADE,
    log_date date DEFAULT CURRENT_DATE,
    views integer DEFAULT 1,
    PRIMARY KEY (restaurant_id, log_date)
);

CREATE TABLE public.restaurant_stats (
    restaurant_id uuid PRIMARY KEY REFERENCES public.restaurant(id) ON DELETE CASCADE,
    db_mb numeric DEFAULT 0.01,
    media_mb numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 2. FUNCTIONS (The Brains)
-- ==========================================

-- Function: Customer View Logger
CREATE OR REPLACE FUNCTION public.log_customer_view(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN RETURN; END IF;
    INSERT INTO public.usage_ledger (restaurant_id, log_date, views)
    VALUES (target_id, CURRENT_DATE, 1) ON CONFLICT (restaurant_id, log_date)
    DO UPDATE SET views = usage_ledger.views + 1;
END; $$;

-- Function: Admin Undo (The Silent Eraser)
CREATE OR REPLACE FUNCTION public.undo_admin_scan(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.usage_ledger 
    SET views = GREATEST(views - 1, 0)
    WHERE restaurant_id = target_id AND log_date = CURRENT_DATE;
END; $$;

-- Function: Storage & DB Size Auditor
CREATE OR REPLACE FUNCTION public.run_storage_audit()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.restaurant_stats (restaurant_id, db_mb, media_mb, updated_at)
    SELECT id,
        (SELECT ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0)::numeric, 2)),
        (SELECT ROUND(COALESCE(SUM((metadata->>'size')::numeric), 0) / 1024.0 / 1024.0, 2) FROM storage.objects),
        now()
    FROM public.restaurant
    ON CONFLICT (restaurant_id) DO UPDATE SET
        db_mb = EXCLUDED.db_mb, media_mb = EXCLUDED.media_mb, updated_at = EXCLUDED.updated_at;
END; $$;

-- Function: Auto-Timestamp Update
CREATE OR REPLACE FUNCTION refresh_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TRIGGERS & VIEWS
-- ==========================================

CREATE TRIGGER refresh_rest_time BEFORE UPDATE ON public.restaurant FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_column();
CREATE TRIGGER refresh_cat_time BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_column();
CREATE TRIGGER refresh_menu_time BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION refresh_updated_at_column();

CREATE OR REPLACE VIEW public.admin_usage_dashboard AS 
SELECT r.id AS res_id, COALESCE(s.db_mb, 0.01) AS db_mb, COALESCE(s.media_mb, 0) AS media_mb, s.updated_at, 
    (SELECT jsonb_object_agg(d, v) FROM (
        SELECT to_char(g.day, 'Dy') AS d, COALESCE(ul.views, 0) AS v
        FROM (SELECT (CURRENT_DATE - i)::date AS day FROM generate_series(0, 6) AS i) g
        LEFT JOIN public.usage_ledger ul ON ul.log_date = g.day AND ul.restaurant_id = r.id
    ) sub) AS weekly_chart
FROM public.restaurant r LEFT JOIN public.restaurant_stats s ON r.id = s.restaurant_id;

ALTER VIEW public.admin_usage_dashboard SET (security_invoker = on);

-- ==========================================
-- 4. STORAGE & RLS
-- ==========================================

-- Bucket Creation
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-assets', 'restaurant-assets', true) ON CONFLICT DO NOTHING;

-- RLS Enablement
ALTER TABLE public.restaurant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Database Policies
CREATE POLICY "Public Read" ON public.restaurant FOR SELECT USING (true);
CREATE POLICY "Admin All" ON public.restaurant FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Public Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin Categories" ON public.categories FOR ALL TO authenticated USING (auth.uid() = restaurant_id);
CREATE POLICY "Public Items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Admin Items" ON public.menu_items FOR ALL TO authenticated USING (auth.uid() = restaurant_id);

-- Storage Policies
CREATE POLICY "Public Assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'restaurant-assets');
CREATE POLICY "Admin Assets" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'restaurant-assets');

-- ==========================================
-- 5. AUTOMATION (CRON)
-- ==========================================

DO $$ 
BEGIN
    -- Safely unschedule existing jobs
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-job') THEN PERFORM cron.unschedule('audit-job'); END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dynamic-worker') THEN PERFORM cron.unschedule('dynamic-worker'); END IF;

    -- 1. Daily Stats Audit (14:05 UTC)
    PERFORM cron.schedule('audit-job', '5 14 * * *', 'SELECT public.run_storage_audit()');

    -- 2. Daily Image Cleanup (14:00 UTC)
    -- REPLACE PLACEHOLDERS FOR EACH NEW OWNER
    PERFORM cron.schedule('dynamic-worker', '0 14 * * *', 
        $$ SELECT net.http_post(
            url:='https://[PROJECT_ID].supabase.co/functions/v1/dynamic-worker',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_KEY]"}'::jsonb
        ) $$);
END $$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.log_customer_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.undo_admin_scan(uuid) TO authenticated;
GRANT SELECT ON public.admin_usage_dashboard TO authenticated;
