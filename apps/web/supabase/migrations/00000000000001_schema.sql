-- ============================================
-- LIDOFACILE.IT — Schema Database Completo
-- ============================================

-- =====================
-- ENUMS
-- =====================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'employee', 'client');
CREATE TYPE map_element_type AS ENUM (
  'umbrella', 'sunbed', 'gazebo', 'cabana',
  'path', 'shower', 'bar', 'toilet', 'playground',
  'sea', 'entrance', 'lifeguard', 'custom'
);
CREATE TYPE season_type AS ENUM ('low', 'mid', 'high', 'peak');
CREATE TYPE booking_duration AS ENUM (
  'half_day_morning', 'half_day_afternoon', 'full_day',
  'weekly', 'biweekly', 'monthly', 'seasonal'
);
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'checked_in',
  'completed', 'cancelled', 'no_show'
);
CREATE TYPE bar_order_status AS ENUM (
  'pending', 'preparing', 'ready', 'delivered', 'cancelled'
);

-- =====================
-- PROFILI UTENTE
-- =====================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  fiscal_code TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  preferred_language TEXT DEFAULT 'it',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per creare profilo automaticamente alla registrazione
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- STABILIMENTI
-- =====================

CREATE TABLE establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  cap TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#00BFFF',
  secondary_color TEXT DEFAULT '#0B1829',
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  -- Stato
  is_active BOOLEAN DEFAULT TRUE,
  subscription_status TEXT DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  -- Configurazione
  opening_date DATE,
  closing_date DATE,
  check_in_time TIME DEFAULT '08:00',
  check_out_time TIME DEFAULT '19:00',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_establishments_owner ON establishments(owner_id);
CREATE INDEX idx_establishments_slug ON establishments(slug);

-- =====================
-- MEMBRI STABILIMENTO
-- =====================

CREATE TABLE establishment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'employee',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(establishment_id, user_id)
);

CREATE INDEX idx_members_establishment ON establishment_members(establishment_id);
CREATE INDEX idx_members_user ON establishment_members(user_id);

-- =====================
-- MAPPA SPIAGGIA
-- =====================

CREATE TABLE beach_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Spiaggia',
  width INT NOT NULL DEFAULT 100,
  height INT NOT NULL DEFAULT 50,
  background_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beach_maps_establishment ON beach_maps(establishment_id);

CREATE TABLE map_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beach_map_id UUID NOT NULL REFERENCES beach_maps(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  label TEXT,
  distance_from_sea TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(beach_map_id, row_number)
);

CREATE TABLE map_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beach_map_id UUID NOT NULL REFERENCES beach_maps(id) ON DELETE CASCADE,
  row_id UUID REFERENCES map_rows(id) ON DELETE SET NULL,
  element_type map_element_type NOT NULL,
  label TEXT,
  x INT NOT NULL,
  y INT NOT NULL,
  width INT DEFAULT 1,
  height INT DEFAULT 1,
  rotation INT DEFAULT 0,
  max_sunbeds INT DEFAULT 2,
  max_extra_sunbeds INT DEFAULT 2,
  is_bookable BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(beach_map_id, label)
);

CREATE INDEX idx_map_elements_map ON map_elements(beach_map_id);
CREATE INDEX idx_map_elements_row ON map_elements(row_id);

-- =====================
-- PREZZI E STAGIONI
-- =====================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season_type season_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seasons_establishment ON seasons(establishment_id);

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  row_id UUID REFERENCES map_rows(id) ON DELETE CASCADE,
  element_type map_element_type DEFAULT 'umbrella',
  duration booking_duration NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  sunbed_price DECIMAL(10, 2) DEFAULT 0,
  is_weekend_markup BOOLEAN DEFAULT FALSE,
  weekend_markup_percent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_establishment ON pricing_rules(establishment_id);

-- =====================
-- SERVIZI AGGIUNTIVI
-- =====================

CREATE TABLE additional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  is_daily BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_establishment ON additional_services(establishment_id);

-- =====================
-- PRENOTAZIONI
-- =====================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  client_id UUID REFERENCES auth.users(id),
  -- Dati guest
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  -- Dettagli
  booking_code TEXT UNIQUE NOT NULL,
  status booking_status DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration booking_duration NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  services_total DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  -- Pagamento
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  -- Check-in
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_establishment ON bookings(establishment_id);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_dates ON bookings(establishment_id, start_date, end_date);
CREATE INDEX idx_bookings_code ON bookings(booking_code);
CREATE INDEX idx_bookings_status ON bookings(establishment_id, status);

CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  map_element_id UUID NOT NULL REFERENCES map_elements(id),
  num_sunbeds INT DEFAULT 2,
  daily_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_booking_items_element ON booking_items(map_element_id);

CREATE TABLE booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES additional_services(id),
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- MENU BAR E ORDINI
-- =====================

CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  allergens TEXT[],
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bar_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  booking_id UUID REFERENCES bookings(id),
  map_element_id UUID REFERENCES map_elements(id),
  client_id UUID REFERENCES auth.users(id),
  order_number SERIAL,
  status bar_order_status DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bar_orders_establishment ON bar_orders(establishment_id);

CREATE TABLE bar_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES bar_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ABBONAMENTI PIATTAFORMA
-- =====================

CREATE TABLE platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'annual',
  status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  amount DECIMAL(10, 2) DEFAULT 697.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CHAT AI
-- =====================

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- STATISTICHE GIORNALIERE
-- =====================

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  date DATE NOT NULL,
  total_bookings INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  occupancy_rate DECIMAL(5, 2) DEFAULT 0,
  bar_orders_count INT DEFAULT 0,
  bar_orders_revenue DECIMAL(10, 2) DEFAULT 0,
  new_clients INT DEFAULT 0,
  check_ins INT DEFAULT 0,
  no_shows INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(establishment_id, date)
);

-- =====================
-- FUNZIONI RPC
-- =====================

-- Disponibilita' ombrelloni per date
CREATE OR REPLACE FUNCTION get_availability(
  p_establishment_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  element_id UUID,
  element_label TEXT,
  element_type map_element_type,
  row_number INT,
  row_label TEXT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id AS element_id,
    me.label AS element_label,
    me.element_type,
    mr.row_number,
    mr.label AS row_label,
    NOT EXISTS (
      SELECT 1 FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.map_element_id = me.id
        AND b.status IN ('confirmed', 'checked_in')
        AND b.start_date <= p_end_date
        AND b.end_date >= p_start_date
    ) AS is_available
  FROM map_elements me
  JOIN beach_maps bm ON bm.id = me.beach_map_id
  LEFT JOIN map_rows mr ON mr.id = me.row_id
  WHERE bm.establishment_id = p_establishment_id
    AND bm.is_active = TRUE
    AND me.is_bookable = TRUE
  ORDER BY mr.row_number, me.x;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calcolo prezzo prenotazione
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_establishment_id UUID,
  p_element_ids UUID[],
  p_start_date DATE,
  p_end_date DATE,
  p_duration booking_duration
)
RETURNS JSON AS $$
DECLARE
  v_total DECIMAL(10, 2) := 0;
  v_element_id UUID;
  v_price DECIMAL(10, 2);
  v_days INT;
  v_items JSON[];
BEGIN
  v_days := p_end_date - p_start_date + 1;

  FOREACH v_element_id IN ARRAY p_element_ids
  LOOP
    -- Trova il prezzo migliore (per fila + stagione)
    SELECT COALESCE(pr.base_price, 0) INTO v_price
    FROM pricing_rules pr
    LEFT JOIN seasons s ON s.id = pr.season_id
    LEFT JOIN map_elements me ON me.row_id = pr.row_id
    WHERE pr.establishment_id = p_establishment_id
      AND pr.duration = p_duration
      AND me.id = v_element_id
      AND (s.id IS NULL OR (p_start_date BETWEEN s.start_date AND s.end_date))
    ORDER BY s.id IS NOT NULL DESC -- preferisci prezzo stagionale
    LIMIT 1;

    IF v_price IS NULL THEN
      v_price := 0;
    END IF;

    v_total := v_total + (v_price * v_days);
  END LOOP;

  RETURN json_build_object(
    'total', v_total,
    'days', v_days,
    'elements_count', array_length(p_element_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE beach_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Helper: controlla se l'utente e' membro dello stabilimento
CREATE OR REPLACE FUNCTION is_member_of(p_establishment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM establishment_members
    WHERE establishment_id = p_establishment_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  ) OR EXISTS (
    SELECT 1 FROM establishments
    WHERE id = p_establishment_id
      AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: controlla se l'utente e' super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profili utente
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (id = auth.uid() OR is_super_admin());
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Stabilimenti: owner puo' tutto, pubblico puo' leggere (per pagina lido)
CREATE POLICY "establishments_owner_all" ON establishments
  FOR ALL USING (owner_id = auth.uid() OR is_super_admin());
CREATE POLICY "establishments_public_read" ON establishments
  FOR SELECT USING (is_active = TRUE);

-- Membri: owner puo' gestire, membri possono leggere
CREATE POLICY "members_owner_manage" ON establishment_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
    OR is_super_admin()
  );
CREATE POLICY "members_self_read" ON establishment_members
  FOR SELECT USING (user_id = auth.uid());

-- Mappe: membri vedono, owner gestisce, pubblico legge (per booking)
CREATE POLICY "beach_maps_member_read" ON beach_maps
  FOR SELECT USING (is_member_of(establishment_id) OR is_active = TRUE);
CREATE POLICY "beach_maps_owner_manage" ON beach_maps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
  );

-- Elementi mappa: stessa logica
CREATE POLICY "map_elements_read" ON map_elements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM beach_maps bm WHERE bm.id = beach_map_id AND (is_member_of(bm.establishment_id) OR bm.is_active = TRUE))
  );
CREATE POLICY "map_elements_manage" ON map_elements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM beach_maps bm
      JOIN establishments e ON e.id = bm.establishment_id
      WHERE bm.id = beach_map_id AND e.owner_id = auth.uid()
    )
  );

-- Righe mappa
CREATE POLICY "map_rows_read" ON map_rows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM beach_maps bm WHERE bm.id = beach_map_id AND (is_member_of(bm.establishment_id) OR bm.is_active = TRUE))
  );
CREATE POLICY "map_rows_manage" ON map_rows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM beach_maps bm
      JOIN establishments e ON e.id = bm.establishment_id
      WHERE bm.id = beach_map_id AND e.owner_id = auth.uid()
    )
  );

-- Stagioni e prezzi: membri leggono, owner gestisce, pubblico legge
CREATE POLICY "seasons_read" ON seasons
  FOR SELECT USING (TRUE);
CREATE POLICY "seasons_manage" ON seasons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
  );

CREATE POLICY "pricing_read" ON pricing_rules
  FOR SELECT USING (TRUE);
CREATE POLICY "pricing_manage" ON pricing_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
  );

-- Servizi aggiuntivi
CREATE POLICY "services_read" ON additional_services
  FOR SELECT USING (TRUE);
CREATE POLICY "services_manage" ON additional_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
  );

-- Prenotazioni: membri vedono tutte, clienti solo le proprie
CREATE POLICY "bookings_member_access" ON bookings
  FOR ALL USING (is_member_of(establishment_id) OR is_super_admin());
CREATE POLICY "bookings_client_read" ON bookings
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "bookings_client_create" ON bookings
  FOR INSERT WITH CHECK (TRUE);

-- Booking items
CREATE POLICY "booking_items_access" ON booking_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (is_member_of(b.establishment_id) OR b.client_id = auth.uid()))
  );
CREATE POLICY "booking_items_insert" ON booking_items
  FOR INSERT WITH CHECK (TRUE);

-- Booking services
CREATE POLICY "booking_services_access" ON booking_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (is_member_of(b.establishment_id) OR b.client_id = auth.uid()))
  );
CREATE POLICY "booking_services_insert" ON booking_services
  FOR INSERT WITH CHECK (TRUE);

-- Menu
CREATE POLICY "menu_categories_read" ON menu_categories
  FOR SELECT USING (TRUE);
CREATE POLICY "menu_categories_manage" ON menu_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
  );

CREATE POLICY "menu_items_read" ON menu_items
  FOR SELECT USING (TRUE);
CREATE POLICY "menu_items_manage" ON menu_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
  );

-- Ordini bar
CREATE POLICY "bar_orders_member" ON bar_orders
  FOR ALL USING (is_member_of(establishment_id));
CREATE POLICY "bar_orders_client" ON bar_orders
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "bar_orders_create" ON bar_orders
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "bar_order_items_access" ON bar_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM bar_orders bo WHERE bo.id = order_id AND (is_member_of(bo.establishment_id) OR bo.client_id = auth.uid()))
  );
CREATE POLICY "bar_order_items_insert" ON bar_order_items
  FOR INSERT WITH CHECK (TRUE);

-- Abbonamenti piattaforma
CREATE POLICY "subscriptions_owner" ON platform_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM establishments WHERE id = establishment_id AND owner_id = auth.uid())
    OR is_super_admin()
  );

-- Chat AI
CREATE POLICY "ai_conversations_access" ON ai_conversations
  FOR ALL USING (
    user_id = auth.uid() OR is_member_of(establishment_id) OR is_super_admin()
  );

-- Statistiche
CREATE POLICY "daily_stats_access" ON daily_stats
  FOR ALL USING (is_member_of(establishment_id) OR is_super_admin());

-- =====================
-- UPDATED_AT TRIGGER
-- =====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_establishments_updated_at
  BEFORE UPDATE ON establishments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bar_orders_updated_at
  BEFORE UPDATE ON bar_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_beach_maps_updated_at
  BEFORE UPDATE ON beach_maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
