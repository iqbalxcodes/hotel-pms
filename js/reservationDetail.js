// ======================================================
// reservationDetail.js
// ======================================================

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

        return { first: "-", last: "-" };

    }

    const parts = fullName.trim().split(" ");

    const first = parts[0];
    const last = parts.slice(1).join(" ") || "-";

    return { first, last };

}

function setText(id, value){

    const el = document.getElementById(id);

    if(el){

        el.innerText =
            (value === null || value === undefined || value === "")
            ? "-"
            : value;

    }

}

function renderBilling(res, nights){

    const container =
        document.getElementById("det_billing_items");

    const totalEl =
        document.getElementById("det_billing_total");

    // If a real billing_items column (JSON array) exists, use it.
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

    // Fallback: estimate from room price x nights, if a price column exists.
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

async function loadReservationDetail(){

    const id = getReservationIdFromUrl();

    if(!id){

        alert("Reservation ID tidak ditemukan di URL");
        window.location.href = "index.html";
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
        alert("Gagal memuat detail reservasi");
        return;

    }

    const { first, last } = splitName(res.guest_name);

    setText("det_first_name", first);
    setText("det_last_name", last);

    setText("det_loyalty", res.loyalty);
    setText("det_salutation", res.salutation);
    setText("det_language", res.language);
    setText("det_country", res.country);
    setText("det_contact", res.contact);
    setText("det_company", res.company);
    setText("det_booker_name", res.booker_name);
    setText("det_travel_agent", res.travel_agent);

    setText("det_arrival", formatDisplayDate(res.arrival_date));
    setText("det_departure", formatDisplayDate(res.departure_date));
    setText("det_confirmation_no", res.confirmation_no);
    setText("det_external_no", res.external_reservation_no);
    setText("det_room_number", res.room_number);

    let nights = 0;

    if(res.arrival_date && res.departure_date){

        const arrival = new Date(res.arrival_date);
        const departure = new Date(res.departure_date);

        nights =
            Math.round(
                (departure - arrival) / (1000*60*60*24)
            );

    }

    setText("det_nights", nights > 0 ? nights : "-");

    setText("det_rate", res.rate_name);
    setText("det_price", res.price !== undefined ? formatCurrency(res.price) : "-");
    setText("det_cancel_policy", res.cancel_policy);
    setText("det_source", res.source);
    setText("det_market_segment", res.market_segment);
    setText("det_travel_reason", res.travel_reason);

    setText("det_room_type", res.room_type);
    setText("det_bed_type", res.bed_type);
    setText("det_breakfast", res.breakfast_qty);
    setText("det_dinner", res.dinner);
    setText("det_parking", res.parking);
    setText("det_shuttle", res.shuttle);

    const secondaryGuest = splitName(res.secondary_guest_name);

    setText("det_sg_first_name", secondaryGuest.first);
    setText("det_sg_last_name", secondaryGuest.last);

    setText("det_remarks", res.remarks);

    renderBilling(res, nights);

}

document.addEventListener("DOMContentLoaded", loadReservationDetail);