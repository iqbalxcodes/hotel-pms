-- ============================================================
-- HOTEL PMS - ENTERPRISE PMS V2
-- Migration: Harden Reservation Core
-- Date: 2026-09-08
-- ============================================================

-- ------------------------------------------------------------
-- 1. COMPOSITE UNIQUE CONSTRAINTS
--    Required for property-consistency foreign keys.
-- ------------------------------------------------------------

ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_id_property_unique
    UNIQUE (id, property_id);

ALTER TABLE public.rooms
    ADD CONSTRAINT rooms_id_property_unique
    UNIQUE (id, property_id);

ALTER TABLE public.room_types
    ADD CONSTRAINT room_types_id_property_unique
    UNIQUE (id, property_id);

ALTER TABLE public.rate_plans
    ADD CONSTRAINT rate_plans_id_property_unique
    UNIQUE (id, property_id);


-- ------------------------------------------------------------
-- 2. RESERVATION ROOMS
--    reservation + property must match.
-- ------------------------------------------------------------

ALTER TABLE public.reservation_rooms
    ADD CONSTRAINT reservation_rooms_reservation_property_fkey
    FOREIGN KEY (reservation_id, property_id)
    REFERENCES public.reservations(id, property_id)
    ON DELETE CASCADE;


-- ------------------------------------------------------------
-- 3. ROOM ASSIGNMENT
--    room must belong to the same property.
-- ------------------------------------------------------------

ALTER TABLE public.reservation_rooms
    ADD CONSTRAINT reservation_rooms_room_property_fkey
    FOREIGN KEY (room_id, property_id)
    REFERENCES public.rooms(id, property_id);


-- ------------------------------------------------------------
-- 4. ROOM TYPE
--    room type must belong to the same property.
-- ------------------------------------------------------------

ALTER TABLE public.reservation_rooms
    ADD CONSTRAINT reservation_rooms_room_type_property_fkey
    FOREIGN KEY (room_type_id, property_id)
    REFERENCES public.room_types(id, property_id);


-- ------------------------------------------------------------
-- 5. RATE PLAN
--    rate plan must belong to the same property.
-- ------------------------------------------------------------

ALTER TABLE public.reservation_rooms
    ADD CONSTRAINT reservation_rooms_rate_plan_property_fkey
    FOREIGN KEY (rate_plan_id, property_id)
    REFERENCES public.rate_plans(id, property_id);


-- ------------------------------------------------------------
-- 6. RESERVATION GUESTS
--    reservation + property must match.
-- ------------------------------------------------------------

ALTER TABLE public.reservation_guests
    ADD CONSTRAINT reservation_guests_reservation_property_fkey
    FOREIGN KEY (reservation_id, property_id)
    REFERENCES public.reservations(id, property_id)
    ON DELETE CASCADE;


-- ------------------------------------------------------------
-- 7. ONE PRIMARY GUEST PER RESERVATION
-- ------------------------------------------------------------

CREATE UNIQUE INDEX idx_reservation_guests_one_primary
    ON public.reservation_guests(reservation_id)
    WHERE role = 'PRIMARY';


-- ------------------------------------------------------------
-- 8. REMOVE REDUNDANT is_primary SEMANTICS
--
-- Existing column is kept for backward compatibility.
-- It must always agree with role.
-- ------------------------------------------------------------

ALTER TABLE public.reservation_guests
    ADD CONSTRAINT reservation_guests_primary_consistency_check
    CHECK (
        is_primary = (role = 'PRIMARY')
    );


-- ------------------------------------------------------------
-- 9. VALIDATE RESERVATION ROOM DAILY RATE DATES
--
-- stay_date must satisfy:
--
-- arrival_date <= stay_date < departure_date
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_reservation_room_daily_rate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_arrival date;
    v_departure date;
BEGIN
    SELECT
        arrival_date,
        departure_date
    INTO
        v_arrival,
        v_departure
    FROM public.reservation_rooms
    WHERE id = NEW.reservation_room_id;

    IF v_arrival IS NULL THEN
        RAISE EXCEPTION
            'Reservation room % does not exist',
            NEW.reservation_room_id;
    END IF;

    IF NEW.stay_date < v_arrival
       OR NEW.stay_date >= v_departure THEN
        RAISE EXCEPTION
            'Stay date % is outside reservation room stay % to %',
            NEW.stay_date,
            v_arrival,
            v_departure;
    END IF;

    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_validate_reservation_room_daily_rate
ON public.reservation_room_daily_rates;

CREATE TRIGGER trg_validate_reservation_room_daily_rate
BEFORE INSERT OR UPDATE
ON public.reservation_room_daily_rates
FOR EACH ROW
EXECUTE FUNCTION public.validate_reservation_room_daily_rate();


-- ------------------------------------------------------------
-- 10. STATUS HISTORY VALIDATION
-- ------------------------------------------------------------

ALTER TABLE public.reservation_status_history
    ADD CONSTRAINT reservation_status_history_reservation_property_fkey
    FOREIGN KEY (reservation_id, property_id)
    REFERENCES public.reservations(id, property_id)
    ON DELETE CASCADE;


ALTER TABLE public.reservation_status_history
    ADD CONSTRAINT reservation_status_history_new_status_check
    CHECK (
        new_status IN (
            'TENTATIVE',
            'CONFIRMED',
            'CHECKED_IN',
            'CHECKED_OUT',
            'CANCELLED',
            'NO_SHOW'
        )
    );


ALTER TABLE public.reservation_status_history
    ADD CONSTRAINT reservation_status_history_old_status_check
    CHECK (
        old_status IS NULL
        OR old_status IN (
            'TENTATIVE',
            'CONFIRMED',
            'CHECKED_IN',
            'CHECKED_OUT',
            'CANCELLED',
            'NO_SHOW'
        )
    );


-- ------------------------------------------------------------
-- 11. BETTER INDEXES FOR PROPERTY-SCOPED PMS QUERIES
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_property_dates
    ON public.reservation_rooms(
        property_id,
        arrival_date,
        departure_date
    );


CREATE INDEX IF NOT EXISTS idx_reservation_guests_property_guest
    ON public.reservation_guests(
        property_id,
        guest_id
    );


CREATE INDEX IF NOT EXISTS idx_reservation_status_history_reservation_created
    ON public.reservation_status_history(
        reservation_id,
        created_at DESC
    );


-- ============================================================
-- END OF MIGRATION
-- ============================================================
