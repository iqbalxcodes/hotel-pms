-- ============================================================
-- HOTEL PMS - ENTERPRISE PMS V2
-- Migration: Reservation Core
-- Date: 2026-09-08
--
-- Strategy:
--   - Keep existing reservation columns for backward compatibility.
--   - Introduce normalized reservation rooms/guests.
--   - Do NOT drop existing data.
-- ============================================================


-- ============================================================
-- 1. RESERVATION ROOMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservation_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    reservation_id uuid NOT NULL,
    property_id uuid NOT NULL,

    room_type_id uuid NOT NULL,
    rate_plan_id uuid,

    room_id uuid,

    arrival_date date NOT NULL,
    departure_date date NOT NULL,

    adults integer NOT NULL DEFAULT 1,
    children integer NOT NULL DEFAULT 0,

    status text NOT NULL DEFAULT 'RESERVED',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT reservation_rooms_reservation_fkey
        FOREIGN KEY (reservation_id)
        REFERENCES public.reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_rooms_property_fkey
        FOREIGN KEY (property_id)
        REFERENCES public.properties(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_rooms_room_type_fkey
        FOREIGN KEY (room_type_id)
        REFERENCES public.room_types(id),

    CONSTRAINT reservation_rooms_rate_plan_fkey
        FOREIGN KEY (rate_plan_id)
        REFERENCES public.rate_plans(id),

    CONSTRAINT reservation_rooms_room_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(id),

    CONSTRAINT reservation_rooms_dates_check
        CHECK (departure_date > arrival_date),

    CONSTRAINT reservation_rooms_adults_check
        CHECK (adults >= 0),

    CONSTRAINT reservation_rooms_children_check
        CHECK (children >= 0),

    CONSTRAINT reservation_rooms_status_check
        CHECK (
            status IN (
                'RESERVED',
                'CHECKED_IN',
                'CHECKED_OUT',
                'CANCELLED',
                'NO_SHOW'
            )
        )
);


-- ============================================================
-- 2. RESERVATION GUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservation_guests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    reservation_id uuid NOT NULL,
    guest_id uuid NOT NULL,

    property_id uuid NOT NULL,

    role text NOT NULL DEFAULT 'ADDITIONAL',

    is_primary boolean NOT NULL DEFAULT false,

    arrival_date date,
    departure_date date,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT reservation_guests_reservation_fkey
        FOREIGN KEY (reservation_id)
        REFERENCES public.reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_guests_guest_fkey
        FOREIGN KEY (guest_id)
        REFERENCES public.guests(id),

    CONSTRAINT reservation_guests_property_fkey
        FOREIGN KEY (property_id)
        REFERENCES public.properties(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_guests_role_check
        CHECK (
            role IN (
                'PRIMARY',
                'ADDITIONAL',
                'CHILD'
            )
        ),

    CONSTRAINT reservation_guests_dates_check
        CHECK (
            departure_date IS NULL
            OR arrival_date IS NULL
            OR departure_date > arrival_date
        )
);


-- ============================================================
-- 3. DAILY RATES PER RESERVATION ROOM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservation_room_daily_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    reservation_room_id uuid NOT NULL,

    stay_date date NOT NULL,

    base_amount numeric(12,2) NOT NULL DEFAULT 0,
    tax_amount numeric(12,2) NOT NULL DEFAULT 0,
    total_amount numeric(12,2) NOT NULL DEFAULT 0,

    currency char(3) NOT NULL DEFAULT 'EUR',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT reservation_room_daily_rates_room_fkey
        FOREIGN KEY (reservation_room_id)
        REFERENCES public.reservation_rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_room_daily_rates_amount_check
        CHECK (
            base_amount >= 0
            AND tax_amount >= 0
            AND total_amount >= 0
        ),

    CONSTRAINT reservation_room_daily_rates_unique
        UNIQUE (reservation_room_id, stay_date)
);


-- ============================================================
-- 4. RESERVATION STATUS HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservation_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    reservation_id uuid NOT NULL,
    property_id uuid NOT NULL,

    old_status text,
    new_status text NOT NULL,

    changed_by uuid,

    reason text,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT reservation_status_history_reservation_fkey
        FOREIGN KEY (reservation_id)
        REFERENCES public.reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_status_history_property_fkey
        FOREIGN KEY (property_id)
        REFERENCES public.properties(id)
        ON DELETE CASCADE,

    CONSTRAINT reservation_status_history_user_fkey
        FOREIGN KEY (changed_by)
        REFERENCES public.app_users(id)
);


-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_reservation
    ON public.reservation_rooms(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_property
    ON public.reservation_rooms(property_id);

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_room
    ON public.reservation_rooms(room_id);

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_room_type
    ON public.reservation_rooms(room_type_id);

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_dates
    ON public.reservation_rooms(arrival_date, departure_date);

CREATE INDEX IF NOT EXISTS idx_reservation_guests_reservation
    ON public.reservation_guests(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_guests_guest
    ON public.reservation_guests(guest_id);

CREATE INDEX IF NOT EXISTS idx_reservation_guests_property
    ON public.reservation_guests(property_id);

CREATE INDEX IF NOT EXISTS idx_reservation_room_daily_rates_date
    ON public.reservation_room_daily_rates(stay_date);

CREATE INDEX IF NOT EXISTS idx_reservation_status_history_reservation
    ON public.reservation_status_history(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_status_history_property
    ON public.reservation_status_history(property_id);


-- ============================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_reservation_rooms_updated
BEFORE UPDATE ON public.reservation_rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reservation_room_daily_rates_updated
BEFORE UPDATE ON public.reservation_room_daily_rates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE public.reservation_rooms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservation_room_daily_rates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

CREATE POLICY p_reservation_rooms
ON public.reservation_rooms
AS PERMISSIVE
FOR ALL
TO public
USING (
    public.has_property_access(property_id)
)
WITH CHECK (
    public.has_property_access(property_id)
);


CREATE POLICY p_reservation_guests
ON public.reservation_guests
AS PERMISSIVE
FOR ALL
TO public
USING (
    public.has_property_access(property_id)
)
WITH CHECK (
    public.has_property_access(property_id)
);


CREATE POLICY p_reservation_room_daily_rates
ON public.reservation_room_daily_rates
AS PERMISSIVE
FOR ALL
TO public
USING (
    EXISTS (
        SELECT 1
        FROM public.reservation_rooms rr
        WHERE rr.id = reservation_room_daily_rates.reservation_room_id
          AND public.has_property_access(rr.property_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.reservation_rooms rr
        WHERE rr.id = reservation_room_daily_rates.reservation_room_id
          AND public.has_property_access(rr.property_id)
    )
);


CREATE POLICY p_reservation_status_history
ON public.reservation_status_history
AS PERMISSIVE
FOR ALL
TO public
USING (
    public.has_property_access(property_id)
)
WITH CHECK (
    public.has_property_access(property_id)
);


-- ============================================================
-- END OF MIGRATION
-- ============================================================
