// ======================================================
// reservationDetail.js
// ======================================================

let currentReservation = null;
let isEditMode = false;
let isNewReservation = false;


// ------------------------------------------------------
// Field configuration
// column: null  -> pseudo field, combined into "group" on save
// editable:false -> never becomes an input
// ------------------------------------------------------

const FIELD_CONFIG = [

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
    { id: "det_nights",         column: null,   type: "text", editable: false },
    { id: "det_room_number",    column: "room_number",   type: "text" },

    { id: "det_rate",           column: "rate_name",     type: "text" },
    { id: "det_price",          column: "price",         type: "number", step: "0.01" },
    { id: "det_cancel_policy",  column: "cancel_policy", type: "text" },
    { id: "det_source",         column: "source",        type: "text" },
    { id: "det_market_segment", column: "market_segment",type: "text" },
    { id: "det_travel_reason",  column: "travel_reason", type: "text" },

    { id: "det_room_type",      column: "room_type",     type: "text" },
    { id: "det_bed_type",       column: "bed_type",      type: "text" },
    { id: "det_breakfast",      column: "breakfast_qty", type: "number", step: "1" },
    { id: "det_dinner",         column: "dinner",        type: "text" },
    { id: "det_parking",        column: "parking",       type: "text" },
    { id: "det_shuttle",        column: "shuttle",       type: "text" },

    { id: "det_sg_first_name",  column: null,   group: "secondary_guest_name", part: "first", type: "text" },
    { id: "det_sg_last_name",   column: null,   group: "secondary_guest_name", part: "last",  type: "text" },

    { id: "det_remarks",        column: "remarks",       type: "textarea" }

];


function getReservationIdFromUrl(){

    const params = new URLSearchParams(window.location.search);

    return params.get("id");

}

function formatDisplayDate(dateStr){

    if(!dateStr){

        return "-";

    }

    const d = new Date(dateStr);

    if(isNaN(d)){

        return dateStr;

    }

    const day = String(d.getDate()).padStart(2,"0");
    const month = String(d.getMonth()+1).padStart(2,"0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;

}

function formatCurrency(value){

    if(value === null || value === undefined || value === ""){

        return "-";

    }

    return Number(value).toLocaleString("id-ID", {
        style: "currency",
        currency: "EUR"
    });

}

function splitName(fullName){

    if(!fullName){

        return { first: "", last: "" };

    }

    const parts = fullName.trim().split(" ");

    const first = parts[0] || "";
    const last = parts.slice(1).join(" ") || "";

    return { first, last };

}

function setDisplay(id, value){

    const el = document.getElementById(id);

    if(el){

        el.innerText =
            (value === null || value === undefined || value === "")
            ? "-"
            : value;

    }

}


// ======================================================
// Billing (read-only for now)
// ======================================================

function renderBilling(res, nights){

    const container =
        document.getElementById("det_billing_items");

    const totalEl =
        document.getElementById("det_billing_total");

    if(Array.isArray(res.billing_items) && res.billing_items.length > 0){

        container.innerHTML = res.billing_items
            .map(item => `
                <div class="field-row">
                    <span>${item.label}</span>
                    <span>${formatCurrency(item.amount)}</span>
                </div>
            `)
            .join("");

        const total =
            res.billing_items.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
            );

        totalEl.innerText = formatCurrency(total);

        return;

    }

    if(res.price){

        const roomTotal = Number(res.price) * nights;

        container.innerHTML = `
            <div class="field-row">
                <span>${nights}x Room</span>
                <span>${formatCurrency(res.price)}</span>
            </div>
        `;

        totalEl.innerText = formatCurrency(roomTotal);

        return;

    }

    container.innerHTML = `<div class="value">Belum ada data billing</div>`;
    totalEl.innerText = "-";

}


// ======================================================
// Render (view mode) from a reservation object
// ======================================================

function calcNights(res){

    if(res.arrival_date && res.departure_date){

        const arrival = new Date(res.arrival_date);
        const departure = new Date(res.departure_date);

        const nights =
            Math.round(
                (departure - arrival) / (1000*60*60*24)
            );

        return nights > 0 ? nights : 0;

    }

    return 0;

}

function renderDetail(res){

    const guestName = splitName(res.guest_name);
    const secondaryGuestName = splitName(res.secondary_guest_name);

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

    const nights = calcNights(res);

    setDisplay("det_nights", nights > 0 ? nights : "-");
    setDisplay("det_room_number", res.room_number);

    setDisplay("det_rate", res.rate_name);
    setDisplay("det_price", res.price !== undefined && res.price !== null ? formatCurrency(res.price) : "-");
    setDisplay("det_cancel_policy", res.cancel_policy);
    setDisplay("det_source", res.source);
    setDisplay("det_market_segment", res.market_segment);
    setDisplay("det_travel_reason", res.travel_reason);

    setDisplay("det_room_type", res.room_type);
    setDisplay("det_bed_type", res.bed_type);
    setDisplay("det_breakfast", res.breakfast_qty);
    setDisplay("det_dinner", res.dinner);
    setDisplay("det_parking", res.parking);
    setDisplay("det_shuttle", res.shuttle);

    setDisplay("det_sg_first_name", secondaryGuestName.first);
    setDisplay("det_sg_last_name", secondaryGuestName.last);

    setDisplay("det_remarks", res.remarks);

    renderBilling(res, nights);

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

    const value = res[field.column];

    return (value === null || value === undefined) ? "" : value;

}


// ======================================================
// Enter Edit Mode
// ======================================================

function enterEditMode(){

    if(isEditMode || !currentReservation){

        return;

    }

    isEditMode = true;

    document.getElementById("editBtn").style.display = "none";
    document.getElementById("editActions").style.display = "inline-flex";

    FIELD_CONFIG.forEach(field => {

        if(field.editable === false){

            return;

        }

        const container = document.getElementById(field.id);

        if(!container){

            return;

        }

        const rawValue = getRawValue(field, currentReservation);

        let inputHtml;

        if(field.type === "textarea"){

            inputHtml = `<textarea class="inline-edit-input">${rawValue}</textarea>`;

        }
        else if(field.type === "date"){

            inputHtml = `<input type="date" class="inline-edit-input" value="${rawValue}">`;

        }
        else if(field.type === "number"){

            inputHtml = `<input type="number" step="${field.step || "1"}" class="inline-edit-input" value="${rawValue}">`;

        }
        else{

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

    document.getElementById("editBtn").style.display = "inline-block";
    document.getElementById("editActions").style.display = "none";

    renderDetail(currentReservation);

}


// ======================================================
// Save Edit Mode (apply + push to DB + exit edit mode)
// ======================================================

async function saveEditMode(){

    if(!isEditMode || !currentReservation){

        return;

    }

    const rawValues = {};

    FIELD_CONFIG.forEach(field => {

        if(field.editable === false){

            return;

        }

        const container = document.getElementById(field.id);

        if(!container){

            return;

        }

        const input = container.querySelector("input, textarea");

        rawValues[field.id] = input ? input.value : "";

    });

    // basic sanity check on dates
    const newArrival = rawValues["det_arrival"];
    const newDeparture = rawValues["det_departure"];

    if(newArrival && newDeparture && new Date(newDeparture) < new Date(newArrival)){

        alert("Departure date tidak boleh sebelum arrival date");
        return;

    }

    const payload = {};

    FIELD_CONFIG.forEach(field => {

        if(field.group){
            // combine first/last, ditangani terpisah di bawah
            return;
        }

        if(!field.column){
            // pseudo-field murni tampilan (mis. det_nights), tidak disimpan
            return;
        }

        let value;

        if(field.editable === false){
            // field non-editable (mis. confirmation_no) tetap harus disimpan
            // apa adanya dari data yang sudah ada, bukan dari input
            value = currentReservation[field.column];
        } else {

            value = rawValues[field.id];

            if(field.type === "number"){
                value = value === "" ? null : Number(value);
            }

            if(field.type === "date"){
                value = value === "" ? null : value;
            }
        }

        payload[field.column] = value;

    });

    // pastikan status ikut terkirim khusus saat reservasi baru
    if(isNewReservation){
        payload.status = currentReservation.status || "RESERVED";
    }

    // combine guest_name
    const guestFirst = rawValues["det_first_name"] ?? "";
    const guestLast = rawValues["det_last_name"] ?? "";

    payload.guest_name =
        [guestFirst, guestLast]
        .filter(part => part && part.trim() !== "")
        .join(" ");

    // combine secondary_guest_name
    const sgFirst = rawValues["det_sg_first_name"] ?? "";
    const sgLast = rawValues["det_sg_last_name"] ?? "";

    payload.secondary_guest_name =
        [sgFirst, sgLast]
        .filter(part => part && part.trim() !== "")
        .join(" ");

    let error;

    if(isNewReservation){

        const { error: insertError } =
            await supabaseClient
            .from("reservation")
            .insert(payload);

        error = insertError;

    }
    else{

        const { error: updateError } =
            await supabaseClient
            .from("reservation")
            .update(payload)
            .eq("id", currentReservation.id);

        error = updateError;

    }


    if(error){

        console.error(error);
        alert("Gagal menyimpan perubahan");
        return;

    }

    if(error){

        console.error(error);
        alert("Gagal menyimpan perubahan");
        return;

    }

    await loadReservationDetail(false);

    isEditMode = false;

    document.getElementById("editBtn").style.display = "inline-block";
    document.getElementById("editActions").style.display = "none";

}


// ======================================================
// Enter key: toggles enter/save depending on current mode
// ======================================================

document.addEventListener("keydown", (e) => {

    if(e.key !== "Enter"){

        return;

    }

    // allow newline in textarea with Shift+Enter
    if(e.target.tagName === "TEXTAREA" && e.shiftKey){

        return;

    }

    e.preventDefault();

    if(isEditMode){

        saveEditMode();

    }
    else{

        enterEditMode();

    }

});


// ======================================================
// Load reservation from DB
// ======================================================

async function loadReservationDetail(redirectOnMissingId = true){

    const params =
        new URLSearchParams(
            window.location.search
        );


    const isNew =
        params.get("new");


    const id =
        params.get("id");


    console.log("NEW MODE:", isNew);
    console.log("ID:", id);


    // ================================
    // CREATE NEW RESERVATION
    // ================================

    if(isNew === "true"){

        isNewReservation = true;


        currentReservation =
            createEmptyReservation();


        renderDetail(
            currentReservation
        );


        enterEditMode();


        return;

    }


    // ================================
    // LOAD EXISTING RESERVATION
    // ================================

    if(!id){

        if(isNew === "true"){
            return;
        }

        console.warn("No reservation id");

        return;

    }


    const { data: res, error } =
        await supabaseClient
        .from("reservation")
        .select("*")
        .eq("id", id)
        .single();


    if(error || !res){

        console.error(error);

        alert(
            "Gagal memuat detail reservasi"
        );

        return;

    }


    currentReservation = res;

    renderDetail(res);

}

// ======================================================
// Reservation Number Generator
// ======================================================

function generateReservationNumber(){

    const confirmation =
        "HT" +
        Math.floor(
            1000000000 +
            Math.random() * 9000000000
        );

    return confirmation;

}

function createEmptyReservation(){

    return {

        id: null,

        confirmation_no:
            generateReservationNumber(),

        guest_name: "",
        secondary_guest_name: "",

        arrival_date: null,
        departure_date: null,

        room_number: "",

        status: "RESERVED"

    };

}

document.addEventListener("DOMContentLoaded", () => loadReservationDetail(true));