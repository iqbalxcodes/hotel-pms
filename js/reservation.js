// ======================================================
// reservation.js
// ======================================================

// ======================================================
// Load & Render Reservations
// ======================================================

async function loadReservations(){

    const query = buildReservationQuery();

    const { data, error } = await query;

    if(error){
        console.error(error);
        alert("Gagal memuat data reservasi");
        return;
    }

    renderReservations(data);
    resetHeader("guest");
    resetHeader("room");
    resetHeader("arrival");
    resetHeader("departure");
    updateToolbar(data.length);
    updateFilterCount();


}

function renderReservations(reservations){

    const tbody = document.getElementById("reservationTable");
    tbody.innerHTML = "";

    reservations.forEach(res => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="reservation-checkbox" data-id="${res.id}">
            </td>
            <td>${res.confirmation_no}</td>
            <td class="guest-cell" data-id="${res.id}">${res.guest_name ?? ""}</td>
            <td class="room-cell" data-id="${res.id}">${res.room_number ?? ""}</td>
            <td class="arrival-cell" data-id="${res.id}">${res.arrival_date ?? ""}</td>
            <td class="departure-cell" data-id="${res.id}">${res.departure_date ?? ""}</td>
            <td>${res.status ?? ""}</td>
        `;

        tbody.appendChild(tr);

    });

    setupCheckbox();

}

// ======================================================
// Initial Load
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    if (typeof simulateReservationStatus === "function") {
        await simulateReservationStatus();
    }

    updateToolbar();
    await loadReservations();

});

const form = document.getElementById("reservationForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const confirmation =
    "HT" +
    Math.floor(
        1000000000 +
        Math.random() * 9000000000
    );

    const reservation = {
        confirmation_no: confirmation,

        guest_name: document.getElementById("guest_name").value,
        room_number: document.getElementById("room_number").value,
        arrival_date: document.getElementById("arrival_date").value,
        departure_date: document.getElementById("departure_date").value,
        status: document.getElementById("status").value
    };

    const { error } = await supabaseClient
        .from("reservation")
        .insert(reservation);

    if (error) {
        console.error(error);
        alert("Failed to save reservation");
        return;
    }

    alert("Reservation saved");
    await loadReservations();
    form.reset();
    hideAddReservation();
});

async function updateStatus(status){

    const selected = [
        ...document.querySelectorAll(
            ".reservation-checkbox:checked"
        )
    ];

    if(selected.length===0){

        alert("No reservation selected");
        return;

    }

    const ids = selected.map(
        item => Number(item.dataset.id)
    );

    const {error} = await supabaseClient
        .from("reservation")
        .update({
            status:status
        })
        .in("id",ids);

    if(error){

        console.error(error);
        alert("Failed");
        return;

    }

    await loadReservations();
    hideActionBar();
}

const sortMap = {

    reservation: "confirmation_no",
    guest: "guest_name",
    room: "room_number",
    arrival: "arrival_date",
    departure: "departure_date",
    status: "status"

};

let sortDirection = {};

async function sortTable(column){

    const dbColumn = sortMap[column];

    if(!dbColumn){
        return;
    }


    sortDirection[column] =
        sortDirection[column] === "asc"
        ? "desc"
        : "asc";



    let query =
        buildReservationQuery();



    const { data, error } =
        await query.order(
            dbColumn,
            {
                ascending:
                    sortDirection[column] === "asc"
            }
        );



    if(error){

        console.error(error);
        return;

    }

    renderReservations(data);

    document.getElementById("selectAll").checked = false;

    resetHeader("guest");
    resetHeader("room");
    resetHeader("arrival");
    resetHeader("departure");


    hideActionBar();

}

async function searchReservation(){


    const keyword =
        document.getElementById(
            "searchInput"
        )
        .value
        .trim();



    if(keyword === ""){

        loadReservations();

        return;

    }



    let filter =
    `confirmation_no.ilike.%${keyword}%,guest_name.ilike.%${keyword}%,room_number.ilike.%${keyword}%,status.ilike.%${keyword}%`;



    const { data, error } =
        await buildReservationQuery()
        .or(filter);



    if(error){

        console.error(error);
        alert("Search failed");
        return;

    }



    renderReservations(data);

    document.getElementById("selectAll").checked = false;

    resetHeader("guest");
    resetHeader("room");
    resetHeader("arrival");
    resetHeader("departure");

    hideActionBar();

}



async function exportReservations(){

    const query =
        buildReservationQuery();


    const { data, error } =
        await query;


    if(error){

        console.error(error);
        alert("Export failed");
        return;

    }


    exportList(
        data,
        "reservations.csv"
    );

}

function renderReservations(reservations){

    const tbody = document.getElementById("reservationTable");
    tbody.innerHTML = "";

    reservations.forEach(res => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="reservation-checkbox" data-id="${res.id}">
            </td>
            <td>${res.confirmation_no}</td>
            <td class="guest-cell" data-id="${res.id}">${res.guest_name ?? ""}</td>
            <td class="room-cell" data-id="${res.id}">${res.room_number ?? ""}</td>
            <td class="arrival-cell" data-id="${res.id}">${res.arrival_date ?? ""}</td>
            <td class="departure-cell" data-id="${res.id}">${res.departure_date ?? ""}</td>
            <td>${res.status ?? ""}</td>
        `;

        tr.addEventListener("click", (e) => {

            if(e.target.closest("input, .edit-input")){

                return;

            }

            window.location.href = `reservation-detail.html?id=${res.id}`;

        });

        tbody.appendChild(tr);

    });

    setupCheckbox();

}