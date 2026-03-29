-- ============================================
-- ALIGN SCHEMA TO APPLICATION CODE
-- Renames columns to match what the Next.js code expects
-- ============================================

-- map_elements: rename columns
ALTER TABLE map_elements RENAME COLUMN x TO position_x;
ALTER TABLE map_elements RENAME COLUMN y TO position_y;
ALTER TABLE map_elements RENAME COLUMN row_id TO map_row_id;
ALTER TABLE map_elements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- additional_services: price decimal -> price_cents integer
ALTER TABLE additional_services ADD COLUMN price_cents INT DEFAULT 0;
UPDATE additional_services SET price_cents = (price * 100)::INT;
ALTER TABLE additional_services DROP COLUMN price;

-- bookings: rename total/subtotal to _cents, make duration optional
ALTER TABLE bookings ADD COLUMN total_cents INT DEFAULT 0;
UPDATE bookings SET total_cents = (total * 100)::INT;
ALTER TABLE bookings DROP COLUMN total;
ALTER TABLE bookings DROP COLUMN subtotal;
ALTER TABLE bookings DROP COLUMN services_total;
ALTER TABLE bookings DROP COLUMN discount_amount;
ALTER TABLE bookings ALTER COLUMN duration DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN duration SET DEFAULT 'full_day';

-- booking_items: rename columns
ALTER TABLE booking_items RENAME COLUMN num_sunbeds TO sunbeds_count;
ALTER TABLE booking_items ADD COLUMN price_cents INT DEFAULT 0;
UPDATE booking_items SET price_cents = (daily_price * 100)::INT;
ALTER TABLE booking_items DROP COLUMN daily_price;

-- booking_services: align columns
ALTER TABLE booking_services RENAME COLUMN service_id TO additional_service_id;
ALTER TABLE booking_services ADD COLUMN price_cents INT DEFAULT 0;
UPDATE booking_services SET price_cents = (unit_price * 100)::INT;
ALTER TABLE booking_services DROP COLUMN unit_price;
ALTER TABLE booking_services DROP COLUMN total_price;

-- pricing_rules: align to code expectations
ALTER TABLE pricing_rules ADD COLUMN row_number INT;
ALTER TABLE pricing_rules ADD COLUMN duration_type TEXT;
ALTER TABLE pricing_rules ADD COLUMN price_cents INT DEFAULT 0;
UPDATE pricing_rules SET price_cents = (base_price * 100)::INT;
UPDATE pricing_rules SET duration_type = duration::TEXT;

-- bar_orders: rename total, add umbrella_label/guest_name
ALTER TABLE bar_orders ADD COLUMN total_cents INT DEFAULT 0;
UPDATE bar_orders SET total_cents = (total * 100)::INT;
ALTER TABLE bar_orders DROP COLUMN total;
ALTER TABLE bar_orders ADD COLUMN IF NOT EXISTS umbrella_label TEXT;
ALTER TABLE bar_orders ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- bar_order_items: rename columns
ALTER TABLE bar_order_items RENAME COLUMN order_id TO bar_order_id;
ALTER TABLE bar_order_items ADD COLUMN price_cents INT DEFAULT 0;
UPDATE bar_order_items SET price_cents = (unit_price * 100)::INT;
ALTER TABLE bar_order_items DROP COLUMN unit_price;

-- menu_items: price decimal -> price_cents int
ALTER TABLE menu_items ADD COLUMN price_cents INT DEFAULT 0;
UPDATE menu_items SET price_cents = (price * 100)::INT;
ALTER TABLE menu_items DROP COLUMN price;

-- map_rows: add distance_from_shore alias (code uses distance_from_sea which exists)

-- Fix map_elements unique constraint and indexes for new column names
DROP INDEX IF EXISTS idx_map_elements_row;
CREATE INDEX idx_map_elements_row ON map_elements(map_row_id);

-- Update RPC function to use new column names
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
  LEFT JOIN map_rows mr ON mr.id = me.map_row_id
  WHERE bm.establishment_id = p_establishment_id
    AND bm.is_active = TRUE
    AND me.is_bookable = TRUE
  ORDER BY mr.row_number, me.position_x;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update calculate_booking_price for new names
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_establishment_id UUID,
  p_element_ids UUID[],
  p_start_date DATE,
  p_end_date DATE,
  p_duration booking_duration
)
RETURNS JSON AS $$
DECLARE
  v_total INT := 0;
  v_element_id UUID;
  v_price INT;
  v_days INT;
BEGIN
  v_days := p_end_date - p_start_date + 1;

  FOREACH v_element_id IN ARRAY p_element_ids
  LOOP
    SELECT COALESCE(pr.price_cents, 0) INTO v_price
    FROM pricing_rules pr
    LEFT JOIN seasons s ON s.id = pr.season_id
    LEFT JOIN map_elements me ON me.map_row_id = pr.row_id
    WHERE pr.establishment_id = p_establishment_id
      AND pr.duration_type = p_duration::TEXT
      AND me.id = v_element_id
      AND (s.id IS NULL OR (p_start_date BETWEEN s.start_date AND s.end_date))
    ORDER BY s.id IS NOT NULL DESC
    LIMIT 1;

    IF v_price IS NULL THEN
      v_price := 0;
    END IF;

    v_total := v_total + (v_price * v_days);
  END LOOP;

  RETURN json_build_object(
    'total_cents', v_total,
    'days', v_days,
    'elements_count', array_length(p_element_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for renamed columns
DROP POLICY IF EXISTS "map_elements_read" ON map_elements;
CREATE POLICY "map_elements_read" ON map_elements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM beach_maps bm WHERE bm.id = beach_map_id AND (is_member_of(bm.establishment_id) OR bm.is_active = TRUE))
  );

DROP POLICY IF EXISTS "map_elements_manage" ON map_elements;
CREATE POLICY "map_elements_manage" ON map_elements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM beach_maps bm
      JOIN establishments e ON e.id = bm.establishment_id
      WHERE bm.id = beach_map_id AND e.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bar_order_items_access" ON bar_order_items;
CREATE POLICY "bar_order_items_access" ON bar_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM bar_orders bo WHERE bo.id = bar_order_id AND (is_member_of(bo.establishment_id) OR bo.client_id = auth.uid()))
  );
