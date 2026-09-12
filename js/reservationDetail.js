// ======================================================
// reservationDetail.js
// POLISH ROUND 2:
// - Field yang kemarin ke-skip sekarang lengkap: Guest ID,
//   External/OTA (digabung 1 baris), Meal Plan, Rate Plan,
//   Discount Reason, Commission %, Total Accommodation,
//   Total Taxes, Total Stay Value.
// - Bed Type DIBUANG (ketauan dari kode Room Type).
// - Room attributes sekarang nempel kecil di sebelah Room Type
//   (cuma muncul kalau ADA datanya -- sekarang belum ada
//   sumber data jadi kosong terus, itu benar, bukan bug).
// - Secondary Guest render sekarang include baris Relationship.
// - Remarks sekarang render sebagai baris horizontal mini-card
//   (Note/Trace/Wake-up), bukan stack vertikal.
// - Breadcrumb: pmsSetSubPath() dipanggil pas reservasi kemuat,
//   path jadi "/Reservation/Reservation {nomor}".
// - Folio SENGAJA belum dikerjakan (placeholder ukuran doang).
// ======================================================

let currentReservation = null;
let isEditMode = false;
let isNewReservation = false;


// ------------------------------------------------------
// Field configuration
// ------------------------------------------------------

const FIELD_CONFIG = [

    { id: "det_guest_id",       column: "guest_id",      editable: false, type: "text" },
    { id: "det_first_name",     column: null,   group: "guest_name",          part: "first", type: "text" },
    { id: "det_last_name",      column: null,   group: "guest_name",          part: "last",  type: "text" },
    { id: "det_loyalty",        column: "loyalty",       type: "text" },
    { id: "det_salutation",     column: "salutation",    type: "text" },
    { id: "det_language",       column: "language",      type: "text" },
    { id: "det_country",        column: "country",       type: "text" },
    { id: "det_contact",        column: "contact",       type: "text" },
    { id: "det_company",        column: "company",       type: "text" },
    { id: "det_booker_name",    column: "booker_name",   type: "text" },
    { id: "det_travel_agent",   column: "travel_agent",  type: "text" },

    { id: "det_arrival",        column: "arrival_date",  type: "date" },
    { id: "det_confirmation_no",column: "confirmation_no", type: "text", editable: false },
    { id: "det_departure",      column: "departure_date", type: "date" },
    { id: "det_external_no",    column: "external_reservation_no", type: "text" },
    { id: "det_ota_no",         column: null, editable: false, type: "text" },
    { id: "det_nights",         column: null,   type: "text", editable: false },
    { id: "det_room_number",    column: "room_number",   type: "text" },

    { id: "det_rate",           column: "rate_name",     type: "text" },
    { id: "det_price",          column: "price",         type: "number", step: "0.01" },
    { id: "det_cancel_policy",  column: "cancel_policy", type: "text" },
    { id: "det_source",         column: "source",        type: "text" },
    { id: "det_market_segment", column: "market_segment",type: "text" },
    { id: "det_travel_reason",  column: "travel_reason", type: "text" },

    { id: "det_room_type",      column: "room_type",     type: "text" },
    { id: "det_meal_plan",      column: "meal_plan",     type: "text" },

    { id: "det_sg_first_name",  column: null,   group: "secondary_guest_name", part: "first", type: "text" },
    { id: "det_sg_last_name",   column: null,   group: "secondary_guest_name", part: "last",  type: "text" },

    { id: "det_remarks",        column: "remarks",       type: "textarea" },

    // field baru, belum ada sumber data -> editable:false biar
    // enterEditMode/saveEditMode skip aman
    { id: "det_id_type", column: null, editable: false, type: "text" },
    { id: "det_id_number", column: null, editable: false, type: "text" },
    { id: "det_id_exp", column: null, editable: false, type: "text" },
    { id: "det_id_issue_city", column: null, editable: false, type: "text" },
    { id: "det_id_issue_country", column: null, editable: false, type: "text" },
    { id: "det_addr_street", column: null, editable: false, type: "text" },
    { id: "det_addr_city", column: null, editable: false, type: "text" },
    { id: "det_addr_postcode", column: null, editable: false, type: "text" },
    { id: "det_addr_region", column: null, editable: false, type: "text" },
    { id: "det_addr_country", column: null, editable: false, type: "text" },
    { id: "det_rate_code", column: null, editable: false, type: "text" },
    { id: "det_rate_plan", column: null, editable: false, type: "text" },
    { id: "det_currency", column: null, editable: false, type: "text" },
    { id: "det_tax", column: null, editable: false, type: "text" },
    { id: "det_discount", column: null, editable: false, type: "text" },
    { id: "det_discount_reason", column: null, editable: false, type: "text" },
    { id: "det_commission", column: null, editable: false, type: "text" },
    { id: "det_commission_pct", column: null, editable: false, type: "text" },
    { id: "det_adr", column: null, editable: false, type: "text" },
    { id: "det_los", column: null, editable: false, type: "text" },
    { id: "det_lead_time", column: null, editable: false, type: "text" },
    { id: "det_total_accommodation", column: null, editable: false, type: "text" },
    { id: "det_total_taxes", column: null, editable: false, type: "text" },
    { id: "det_total_stay_value", column: null, editable: false, type: "text" }

];

const STATUS_LABELS = {
    PENDING: "Pending",
    TENTATIVE: "Pending",
    CONFIRMED: "Confirmed",
    CHECKED_IN: "Checked In",
    CHECKED_OUT: "Checked Out",
    CANCELLED: "Cancelled",
    NO_SHOW: "No Show"
};


// ======================================================
// Status Bar helpers (message / confirm / clock)
// ======================================================

function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function showMessage(text, type = "info"){
    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;
    contextArea.innerHTML = `<span class="status-msg-${type}">${escapeHtml(text)}</span>`;
    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => { contextArea.innerHTML = ""; }, 4000);
}

function showConfirm(message, onConfirm, onCancel){
    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;
    contextArea.innerHTML = `
        <span class="status-confirm">
            ${escapeHtml(message)}
            <button id="confirmYesBtn">Yes</button>
            <button id="confirmNoBtn">No</button>
        </span>
    `;
    document.getElementById("confirmYesBtn").onclick = () => { contextArea.innerHTML = ""; onConfirm(); };
    document.getElementById("confirmNoBtn").onclick = () => { contextArea.innerHTML = ""; if(onCancel) onCancel(); };
}

function showDevMessage(feature){
    showMessage(`${feature} is still in development`, "info");
}


// ======================================================
// Flip card toggle (Guest<->Identification, Rate<->Extended)
// ======================================================

function resdFlip(cardId){
    const card = document.getElementById(cardId);
    if(card) card.classList.toggle("resd-flipped");
}


// ======================================================
// Full action bar popover (⋮ More)
// ======================================================

function resdToggleActions(){
    const pop = document.getElementById("resdActionsPopover");
    if(!pop) return;
    const opening = pop.style.display === "none";
    pop.style.display = opening ? "block" : "none";
    if(opening){
        setTimeout(() => document.addEventListener("click", resdOutsideActionsClick), 0);
    }
}

function resdCloseActions(){
    const pop = document.getElementById("resdActionsPopover");
    if(pop) pop.style.display = "none";
    document.removeEventListener("click", resdOutsideActionsClick);
}

function resdOutsideActionsClick(e){
    const pop = document.getElementById("resdActionsPopover");
    const btn = document.getElementById("resdMoreBtn");
    if(pop && !pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
        resdCloseActions();
    }
}


// ======================================================
// Misc Helpers
// ======================================================

function formatDisplayDate(dateStr){
    if(!dateStr) return "-";
    const d = new Date(dateStr);
    if(isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2,"0");
    const month = String(d.getMonth()+1).padStart(2,"0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatCurrency(value){
    if(value === null || value === undefined || value === "") return "-";
    return Number(value).toLocaleString("id-ID", { style: "currency", currency: "EUR" });
}

function splitName(fullName){
    if(!fullName) return { first: "", last: "" };
    const parts = fullName.trim().split(" ");
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ") || "";
    return { first, last };
}

function setDisplay(id, value){
    const el = document.getElementById(id);
    if(el) el.innerText = (value === null || value === undefined || value === "") ? "-" : value;
}


// ======================================================
// Status Badge + Status Flow Select
// ======================================================

function updateStatusBadge(status){
    const select = document.getElementById("statusFlowSelect");
    if(select) select.value = status || "RESERVED";
}

async function changeReservationStatus(newStatus){

    const select = document.getElementById("statusFlowSelect");

    if(!currentReservation || !currentReservation.id){
        showMessage("Simpan reservasi terlebih dahulu sebelum mengubah status", "error");
        if(select) select.value = currentReservation ? (currentReservation.status || "RESERVED") : "RESERVED";
        return;
    }

    if(newStatus === currentReservation.status) return;

    if(newStatus === "CHECKED_OUT"){
        const hasOutstanding = typeof folioHasOutstandingBalance === "function" && folioHasOutstandingBalance();
        const confirmMessage = hasOutstanding
            ? "Folio masih outstanding balance, tetap checkout?"
            : "There is pending to bill, are you sure want to check out?";
        showConfirm(
            confirmMessage,
            () => performStatusChange(newStatus),
            () => { if(select) select.value = currentReservation.status; }
        );
        return;
    }

    await performStatusChange(newStatus);
}

async function performStatusChange(newStatus){
    const { error } = await supabaseClient.from("reservations").update({ status: newStatus }).eq("id", currentReservation.id);
    if(error){
        console.error(error);
        showMessage("Failed to update status", "error");
        return;
    }
    currentReservation.status = newStatus;
    updateStatusBadge(newStatus);
    updateHeaderSub(currentReservation);
    showMessage(newStatus === "CHECKED_OUT" ? "Checkout completed" : "Status updated", "success");
}


// ======================================================
// Folio -- SENGAJA BELUM DIKERJAKAN.
// ======================================================

function mountPrimaryFolio(reservationId){
    // TODO: aktifkan lagi kalau folio workspace sudah digarap
}

async function mountSecondaryFolios(reservationId){
    // TODO: aktifkan lagi kalau folio workspace sudah digarap
}


// ======================================================
// Render (view mode)
// ======================================================

function calcNights(res){
    if(res.arrival_date && res.departure_date){
        const arrival = new Date(res.arrival_date);
        const departure = new Date(res.departure_date);
        const nights = Math.round((departure - arrival) / (1000*60*60*24));
        return nights > 0 ? nights : 0;
    }
    return 0;
}

function updateHeaderSub(res){
    const el = document.getElementById("resdHeaderSub");
    if(!el) return;
    const parts = [];
    if(res.guest_name) parts.push(`Guest: ${res.guest_name}`);
    if(res.room_number) parts.push(`Room ${res.room_number}`);
    if(res.arrival_date && res.departure_date){
        parts.push(`${formatDisplayDate(res.arrival_date)} – ${formatDisplayDate(res.departure_date)}`);
    }
    const nights = calcNights(res);
    if(nights > 0) parts.push(`${nights} Night${nights > 1 ? "s" : ""}`);
    el.textContent = parts.length ? parts.join(" · ") : "-";
}

// ------------------------------------------------------
// Secondary guest -- sekarang termasuk baris Relationship
// (placeholder "-", belum ada kolom DB buat ini)
// ------------------------------------------------------

function renderSecondaryGuestList(res){
    const container = document.getElementById("resdSecondaryGuestList");
    const countEl = document.getElementById("det_sg_count");
    if(!container) return;

    const sg = splitName(res.secondary_guest_name);
    const hasGuest = !!(sg.first || sg.last);

    if(countEl) countEl.textContent = hasGuest ? "1" : "0";

    container.innerHTML = hasGuest
        ? `
            <div class="resd-guest-item">
                <i data-lucide="user"></i>
                <div class="resd-guest-item-body">
                    <span class="resd-guest-item-name">${escapeHtml(sg.first)} ${escapeHtml(sg.last)}</span>
                    <span class="resd-guest-item-relation">Relationship: -</span>
                </div>
            </div>
        `
        : `<div class="resd-empty-note">No secondary guest</div>`;

    if(window.lucide) lucide.createIcons();
}

// ------------------------------------------------------
// Room type + attributes (nempel kecil, cuma muncul kalau ADA
// datanya -- belum ada sumber data attribute sekarang, jadi
// span-nya sengaja kosong, itu benar bukan bug)
// ------------------------------------------------------

function renderRoomTypeWithAttrs(res){

    setDisplay("det_room_type", res.room_type);

    const attrsEl = document.getElementById("det_room_attrs");
    if(!attrsEl) return;

    // TODO: kalau nanti ada kolom/relasi room attributes, isi array
    // di sini, mis. res.room_attributes = ["CNN","ACC","NS"]
    const attrs = Array.isArray(res.room_attributes) ? res.room_attributes : [];

    attrsEl.textContent = attrs.length ? ` (${attrs.join(" · ")})` : "";

}

// ------------------------------------------------------
// Package list (Stay Package bullet)
// ------------------------------------------------------

function renderPackageList(res){
    const ul = document.getElementById("resdPackageList");
    if(!ul) return;

    const items = [];
    if(res.breakfast_qty) items.push(`Breakfast (${res.breakfast_qty} pax)`);
    if(res.dinner) items.push("Dinner");
    if(res.parking) items.push("Parking");
    if(res.shuttle) items.push("Shuttle");

    ul.innerHTML = items.length
        ? items.map(i => `<li>${escapeHtml(i)}</li>`).join("")
        : `<li class="resd-empty-note">No package components</li>`;
}

// ------------------------------------------------------
// Remarks -- sekarang satu baris horizontal mini-card
// (Note / Trace / Wake-up Call), scroll-x kalau kepanjangan,
// bukan stack vertikal yang bikin card membengkak.
// ------------------------------------------------------

function renderRemarksRow(res){

    const row = document.getElementById("resdRemarksRow");
    if(!row) return;

    const hasNote = !!(res.remarks && res.remarks.trim());

    row.innerHTML = `
        <div class="resd-mini-remark-card">
            <div class="resd-mini-remark-type">Note</div>
            <div class="value" id="det_remarks" style="white-space:pre-wrap;">${hasNote ? escapeHtml(res.remarks) : "-"}</div>
        </div>
        <div class="resd-mini-remark-card">
            <div class="resd-mini-remark-type">Trace</div>
            <div class="resd-empty-note">No trace</div>
        </div>
        <div class="resd-mini-remark-card">
            <div class="resd-mini-remark-type">Wake-up Call</div>
            <div class="resd-empty-note">Not scheduled</div>
        </div>
    `;

}

// ------------------------------------------------------
// Breadcrumb -- "/Reservation/Reservation {nomor}" lewat
// pmsSetSubPath() (lihat pmsTopbar.js)
// ------------------------------------------------------

function updateBreadcrumb(res){
    if(typeof window.pmsSetSubPath === "function" && res.confirmation_no){
        window.pmsSetSubPath("Reservation " + res.confirmation_no);
    }
}

function renderDetail(res){

    const guestName = splitName(res.guest_name);

    setDisplay("det_guest_id", res.guest_id);
    setDisplay("det_first_name", guestName.first);
    setDisplay("det_last_name", guestName.last);
    setDisplay("det_loyalty", res.loyalty);
    setDisplay("det_salutation", res.salutation);
    setDisplay("det_language", res.language);
    setDisplay("det_country", res.country);
    setDisplay("det_contact", res.contact);
    setDisplay("det_company", res.company);
    setDisplay("det_booker_name", res.booker_name);
    setDisplay("det_travel_agent", res.travel_agent);

    setDisplay("det_arrival", formatDisplayDate(res.arrival_date));
    setDisplay("det_confirmation_no", res.confirmation_no);
    setDisplay("det_departure", formatDisplayDate(res.departure_date));
    setDisplay("det_external_no", res.external_reservation_no);
    setDisplay("det_ota_no", null); // belum ada kolom OTA no

    const nights = calcNights(res);
    setDisplay("det_nights", nights > 0 ? nights : "-");
    setDisplay("det_room_number", res.room_number);

    setDisplay("det_rate", res.rate_name);
    setDisplay("det_price", res.price !== undefined && res.price !== null ? formatCurrency(res.price) : "-");
    setDisplay("det_cancel_policy", res.cancel_policy);
    setDisplay("det_source", res.source);
    setDisplay("det_market_segment", res.market_segment);
    setDisplay("det_travel_reason", res.travel_reason);

    renderRoomTypeWithAttrs(res);
    setDisplay("det_meal_plan", res.meal_plan);

    renderSecondaryGuestList(res);
    renderPackageList(res);
    renderRemarksRow(res);

    // Header
    const confEl = document.getElementById("resdConfirmationNo");
    if(confEl) confEl.textContent = res.confirmation_no || "-";
    updateHeaderSub(res);
    updateBreadcrumb(res);

    // Folio SENGAJA belum di-mount
    if(res.id){
        mountPrimaryFolio(res.id);
    }

    updateStatusBadge(res.status);

    const statusSelect = document.getElementById("statusFlowSelect");
    if(statusSelect) statusSelect.disabled = !res.id;

}


// ======================================================
// Raw value getter per field (used to prefill inputs)
// ======================================================

function getRawValue(field, res){
    if(field.group === "guest_name"){
        const { first, last } = splitName(res.guest_name);
        return field.part === "first" ? first : last;
    }
    if(field.group === "secondary_guest_name"){
        const { first, last } = splitName(res.secondary_guest_name);
        return field.part === "first" ? first : last;
    }
    if(!field.column) return "";
    const value = res[field.column];
    return (value === null || value === undefined) ? "" : value;
}


// ======================================================
// Enter Edit Mode
// ======================================================

function enterEditMode(){

    if(isEditMode || !currentReservation) return;

    isEditMode = true;
    document.getElementById("editBtn").style.display = "none";
    document.getElementById("editActions").style.display = "inline-flex";

    FIELD_CONFIG.forEach(field => {
        if(field.editable === false) return;

        const container = document.getElementById(field.id);
        if(!container) return;

        const rawValue = getRawValue(field, currentReservation);
        let inputHtml;

        if(field.type === "textarea"){
            inputHtml = `<textarea class="inline-edit-input">${rawValue}</textarea>`;
        } else if(field.type === "date"){
            inputHtml = `<input type="date" class="inline-edit-input" value="${rawValue}">`;
        } else if(field.type === "number"){
            inputHtml = `<input type="number" step="${field.step || "1"}" class="inline-edit-input" value="${rawValue}">`;
        } else if(field.type === "boolean"){
            inputHtml = `<input type="checkbox" class="inline-edit-input" ${rawValue ? "checked" : ""}>`;
        } else {
            inputHtml = `<input type="text" class="inline-edit-input" value="${String(rawValue).replace(/"/g, "&quot;")}">`;
        }

        container.innerHTML = inputHtml;
    });

}


// ======================================================
// Exit Edit Mode (cancel, no save)
// ======================================================

function exitEditMode(){
    isEditMode = false;
    document.getElementById("editBtn").style.display = "inline-flex";
    document.getElementById("editActions").style.display = "none";
    renderDetail(currentReservation);
    if(window.lucide) lucide.createIcons();
}


// ======================================================
// Save Edit Mode
// ======================================================

async function saveEditMode(){

    if(!isEditMode || !currentReservation) return;

    const rawValues = {};

    FIELD_CONFIG.forEach(field => {
        if(field.editable === false) return;
        const container = document.getElementById(field.id);
        if(!container) return;
        const input = container.querySelector("input, textarea");
        if(!input) return;
        rawValues[field.id] = field.type === "boolean" ? input.checked : input.value;
    });

    const newArrival = rawValues["det_arrival"];
    const newDeparture = rawValues["det_departure"];

    if(newArrival && newDeparture && new Date(newDeparture) < new Date(newArrival)){
        showMessage("Departure date tidak boleh sebelum arrival date", "error");
        return;
    }

    const payload = {};

    FIELD_CONFIG.forEach(field => {
        if(field.group || !field.column) return;
        let value = rawValues[field.id];
        if(value === undefined) return;

        if(field.type === "number") value = value === "" ? null : Number(value);
        else if(field.type === "date") value = value === "" ? null : value;
        else if(field.type === "boolean") value = Boolean(value);
        else if(field.type === "text" || field.type === "textarea") value = value === "" ? null : value;

        payload[field.column] = value;
    });

    if(isNewReservation){
        payload.confirmation_no = currentReservation.confirmation_no;
        payload.status = currentReservation.status || "RESERVED";
    }

    const guestFirst = rawValues["det_first_name"] ?? "";
    const guestLast = rawValues["det_last_name"] ?? "";
    payload.guest_name = [guestFirst, guestLast].filter(p => p && p.trim() !== "").join(" ");

    const sgFirst = rawValues["det_sg_first_name"] ?? "";
    const sgLast = rawValues["det_sg_last_name"] ?? "";
    payload.secondary_guest_name = [sgFirst, sgLast].filter(p => p && p.trim() !== "").join(" ");

    let error;

    if(isNewReservation){
        const { data: insertedData, error: insertError } = await supabaseClient
            .from("reservations").insert(payload).select().single();
        error = insertError;
        if(!error && insertedData){
            currentReservation = insertedData;
            isNewReservation = false;
            window.history.replaceState(null, "", `reservation-detail.html?id=${insertedData.id}`);
        }
    } else {
        const { error: updateError } = await supabaseClient
            .from("reservations").update(payload).eq("id", currentReservation.id);
        error = updateError;
    }

    if(error){
        console.error(error);
        showMessage("Gagal menyimpan perubahan: " + error.message, "error");
        return;
    }

    showMessage("Reservation saved", "success");

    await loadReservationDetail(false);

    isEditMode = false;
    document.getElementById("editBtn").style.display = "inline-flex";
    document.getElementById("editActions").style.display = "none";

}


// ======================================================
// Duplicate Reservation
// ======================================================

async function duplicateReservation(){

    if(!currentReservation || !currentReservation.id){
        showMessage("Tidak ada reservasi untuk diduplikasi", "error");
        return;
    }

    showConfirm(
        "Duplicate this reservation?",
        async () => {
            const clone = { ...currentReservation };
            delete clone.id;
            clone.confirmation_no = generateReservationNumber();
            clone.status = "RESERVED";

            const { data, error } = await supabaseClient.from("reservation").insert(clone).select().single();

            if(error){
                console.error(error);
                showMessage("Failed to duplicate reservation", "error");
                return;
            }

            showMessage("Reservation duplicated", "success");
            window.location.href = `reservation-detail.html?id=${data.id}`;
        },
        () => showMessage("Duplicate cancelled", "info")
    );

}


// ======================================================
// Enter key shortcut
// ======================================================

document.addEventListener("keydown", (e) => {
    if(e.key !== "Enter") return;
    if(e.target.tagName === "TEXTAREA" && e.shiftKey) return;
    if(e.target.closest(".folio-card")) return;

    e.preventDefault();
    if(isEditMode) saveEditMode();
    else enterEditMode();
});


// ======================================================
// Load reservation from DB
// ======================================================

async function loadReservationDetail(redirectOnMissingId = true){

    const params = new URLSearchParams(window.location.search);
    const isNew = params.get("new");
    const id = params.get("id");

    if(isNew === "true"){
        isNewReservation = true;
        currentReservation = createEmptyReservation();
        renderDetail(currentReservation);
        enterEditMode();
        return;
    }

    if(!id){
        console.warn("No reservation id");
        return;
    }

    // FIXED: baca dari reservation_list_view (bukan tabel "reservations"
    // mentah) -- skema baru gak nyimpen guest_name/room_number/rate_name
    // dsb langsung di "reservations" (itu FK guest_id/room_id sekarang),
    // field-field itu cuma ada hasil JOIN di view. reservationFilter.js
    // (list page) udah bener pakai view ini, detail page kelewat.
    const { data: res, error } = await supabaseClient.from("reservation_list_view").select("*").eq("id", id).single();

    if(error || !res){
        console.error(error);
        showMessage("Gagal memuat detail reservasi", "error");
        return;
    }

    currentReservation = res;
    renderDetail(res);
    if(window.lucide) lucide.createIcons();

}

// ======================================================
// Reservation Number Generator
// ======================================================

function generateReservationNumber(){
    return "HT" + Math.floor(1000000000 + Math.random() * 9000000000);
}

function createEmptyReservation(){
    return {
        id: null,
        confirmation_no: generateReservationNumber(),
        guest_name: "",
        secondary_guest_name: "",
        arrival_date: null,
        departure_date: null,
        room_number: "",
        status: "CONFIRMED"
    };
}

document.addEventListener("DOMContentLoaded", () => {
    loadReservationDetail(true);
    if(window.lucide) lucide.createIcons();
});