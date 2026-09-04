// ======================================================
// reservation.js
// ======================================================

let activeSortColumn = null;
let sortDirection = {};


// ======================================================
// Core Fetch + Render (respects current mode/scope/date/
// search/sort/page/rowsPerPage state)
// ======================================================

async function refreshTable(){

    const { count, error: countError } = await buildBaseQuery(true);

    if(countError){

        console.error(countError);
        showMessage("Gagal memuat data reservasi", "error");
        return;

    }

    totalCount = count ?? 0;

    clampCurrentPage();

    const { data, error } = await buildDataQuery();

    if(error){

        console.error(error);
        showMessage("Gagal memuat data reservasi", "error");
        return;

    }

    renderReservations(data);

    updateToolbar();
    updateFilterCount();

    renderPaginationBar();

}

// Full reset entry point (search + sort + page cleared)
async function loadReservations(){

    activeSearchKeyword = "";
    activeSortColumn = null;
    currentPage = 1;

    const searchInput = document.getElementById("searchInput");

    if(searchInput){

        searchInput.value = "";

    }

    await refreshTable();

}


// ======================================================
// Render Rows (kolom dinamis sesuai tableColumns state)
// ======================================================

function renderReservations(reservations){

    const tbody = document.getElementById("reservationTable");
    tbody.innerHTML = "";

    const state = getTableState();

    reservations.forEach(res => {

        const tr = document.createElement("tr");

        let cellsHtml = `
            <td>
                <input type="checkbox" class="reservation-checkbox" data-id="${res.id}">
            </td>
        `;

        state.visibleOrder.forEach(key => {

            const colDef = COLUMN_MAP[key];
            if(!colDef) return;

            if(key === "status"){

                const statusKey = (res.status || "").toLowerCase();

                cellsHtml += `
                    <td>
                        <span class="status-badge status-${statusKey}">${res.status ?? ""}</span>
                    </td>
                `;

            } else {

                cellsHtml += `<td>${formatColumnValue(key, res)}</td>`;

            }

        });

        tr.innerHTML = cellsHtml;

        tr.addEventListener("click", (e) => {

            if(e.target.closest("input")){

                return;

            }

            window.location.href = `reservation-detail.html?id=${res.id}`;

        });

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

    renderTableHeader();

    updateToolbar();

    if (typeof renderUserArea === "function") {
        renderUserArea();
    }

    rowsPerPage = calculateRowsPerPage();

    try {
        await loadReservations();
    } catch (err) {
        console.error("loadReservations failed:", err);
    }

    try {
        await adjustRowsPerPageAndRefresh();
    } catch (err) {
        console.error("adjustRowsPerPageAndRefresh failed:", err);
    }

    window.addEventListener(
        "resize",
        debounce(async () => {
            await adjustRowsPerPageAndRefresh();
        }, 300)
    );

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
        showMessage("Failed to save reservation", "error");
        return;
    }

    showMessage("Reservation saved", "success");

    await refreshTable();

    form.reset();
    hideAddReservation();
});


// ======================================================
// Status Update (with confirm step for checkout)
// ======================================================

async function updateStatus(status){

    const selected = [
        ...document.querySelectorAll(
            ".reservation-checkbox:checked"
        )
    ];

    if(selected.length === 0){

        showMessage("No reservation selected", "error");
        return;

    }

    if(status === "CHECKED_OUT"){

        showConfirm(
            "There is pending to bill, are you sure want to check out?",
            () => performStatusUpdate(status, selected),
            () => showMessage("Checkout cancelled", "info")
        );

        return;

    }

    await performStatusUpdate(status, selected);

}

async function performStatusUpdate(status, selected){

    const ids = selected.map(
        item => Number(item.dataset.id)
    );

    const { error } = await supabaseClient
        .from("reservation")
        .update({
            status: status
        })
        .in("id", ids);

    if(error){

        console.error(error);
        showMessage("Failed to update status", "error");
        return;

    }

    showMessage(
        status === "CHECKED_OUT" ? "Checkout completed" : "Status updated",
        "success"
    );

    await refreshTable();
    hideActionBar();

}



// ======================================================
// Sort — column key = nama kolom database secara langsung
// ======================================================

async function sortTable(column){

    const colDef = COLUMN_MAP[column];

    if(!colDef || colDef.sortable === false){
        return;
    }

    sortDirection[column] =
        sortDirection[column] === "asc"
        ? "desc"
        : "asc";

    activeSortColumn = column;
    currentPage = 1;

    await refreshTable();

    const selectAll = document.getElementById("selectAll");

    if(selectAll){

        selectAll.checked = false;

    }

    hideActionBar();

}


// ======================================================
// Search
// ======================================================

async function searchReservation(){

    const keyword =
        document.getElementById("searchInput")
        .value
        .trim();

    activeSearchKeyword = keyword;
    currentPage = 1;

    await refreshTable();

    const selectAll = document.getElementById("selectAll");

    if(selectAll){

        selectAll.checked = false;

    }

    hideActionBar();

}


// ======================================================
// Export (exports ALL rows matching filter+search, no
// pagination limit)
// ======================================================

async function exportReservations(){

    const { data, error } = await buildExportQuery();

    if(error){

        console.error(error);
        showMessage("Export failed", "error");
        return;

    }

    exportList(
        data,
        "reservations.csv"
    );

    showMessage("Export completed", "success");

}