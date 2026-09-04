// ======================================================
// tableConfig.js
// Definisi seluruh kolom tabel reservation + metadata
// (label, tipe data, apakah bisa di-sort, apakah bisa
// di-bulk-edit lewat selection toolbar)
//
// URUTAN kolom di array ini = urutan default tabel,
// dari yang paling penting (kiri) ke paling jarang
// dicek (kanan). Bukan alfabetis.
// ======================================================

const RESERVATION_COLUMNS = [

    // ---- Tier 1: inti operasional, selalu dilihat duluan ----
    { key: "confirmation_no", label: "Confirmation No", type: "text", editable: false },
    { key: "guest_name", label: "Guest Name", type: "text" },
    { key: "status", label: "Status", type: "status", editable: false },
    { key: "arrival_date", label: "Arrival", type: "date" },
    { key: "departure_date", label: "Departure", type: "date" },
    { key: "nights", label: "Nights", type: "text", sortable: false, editable: false },
    { key: "room_number", label: "Room", type: "text" },
    { key: "room_type", label: "Room Type", type: "text" },

    // ---- Tier 2: operasional sekunder ----
    { key: "rate_name", label: "Rate Name", type: "text" },
    { key: "price", label: "Price", type: "money" },
    { key: "room_rate", label: "Room Rate", type: "money" },
    { key: "total_amount", label: "Total Amount", type: "money" },
    { key: "pending_to_charge", label: "Pending To Charge", type: "money" },
    { key: "payment_status", label: "Payment Status", type: "text" },
    { key: "bed_type", label: "Bed Type", type: "text" },
    { key: "adults", label: "Adults", type: "text" },
    { key: "children", label: "Children", type: "text" },
    { key: "breakfast_qty", label: "Breakfast Qty", type: "text" },
    { key: "breakfast", label: "Breakfast", type: "boolean" },
    { key: "dinner", label: "Dinner", type: "boolean" },
    { key: "parking", label: "Parking", type: "boolean" },
    { key: "shuttle", label: "Shuttle", type: "boolean" },
    { key: "meal_plan", label: "Meal Plan", type: "text" },
    { key: "booking_channel", label: "Booking Channel", type: "text" },
    { key: "external_reservation_no", label: "External Reservation No", type: "text" },

    // ---- Tier 3: data tamu / administratif, paling jarang dicek ----
    { key: "contact", label: "Contact", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "booker_name", label: "Booker Name", type: "text" },
    { key: "travel_agent", label: "Travel Agent", type: "text" },
    { key: "secondary_guest_name", label: "Secondary Guest", type: "text" },
    { key: "secondary_guest_first_name", label: "Secondary Guest First Name", type: "text" },
    { key: "secondary_guest_last_name", label: "Secondary Guest Last Name", type: "text" },
    { key: "loyalty", label: "Loyalty", type: "text" },
    { key: "salutation", label: "Salutation", type: "text" },
    { key: "language", label: "Language", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "source", label: "Source", type: "text" },
    { key: "market_segment", label: "Market Segment", type: "text" },
    { key: "travel_reason", label: "Travel Reason", type: "text" },
    { key: "cancel_policy", label: "Cancel Policy", type: "text" },
    { key: "currency", label: "Currency", type: "text" },
    { key: "tax", label: "Tax", type: "money" },
    { key: "discount", label: "Discount", type: "money" },
    { key: "paid_amount", label: "Paid Amount", type: "money" },
    { key: "rate", label: "Rate", type: "money" },
    { key: "guest_id", label: "Guest ID", type: "text", editable: false },
    { key: "room_id", label: "Room ID", type: "text", editable: false },
    { key: "additional_guest", label: "Additional Guest", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "remarks", label: "Remarks", type: "text" },
    { key: "billing_items", label: "Billing Items", type: "text", editable: false },
    { key: "payment_method", label: "Payment Method", type: "text" },
    { key: "check_in_at", label: "Check-in At", type: "datetime", editable: false },
    { key: "check_out_at", label: "Check-out At", type: "datetime", editable: false },
    { key: "created_at", label: "Created At", type: "datetime", editable: false },
    { key: "updated_at", label: "Updated At", type: "datetime", editable: false },
    { key: "id", label: "ID", type: "text", editable: false }

];

const COLUMN_MAP = Object.fromEntries(
    RESERVATION_COLUMNS.map(c => [c.key, c])
);

// Default: SEMUA kolom tampil, urutan sesuai array di atas (prioritized)
const DEFAULT_VISIBLE_COLUMNS = RESERVATION_COLUMNS.map(c => c.key);
const DEFAULT_COLUMN_WIDTH = 140;