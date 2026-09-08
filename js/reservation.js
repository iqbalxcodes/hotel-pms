// ======================================================
// reservation.js
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

async function loadReservations(){

    activeSearchKeyword = "";
    activeSortColumn = null;
    currentPage = 1;

    const searchInput = document.getElementById("searchInput");
    if(searchInput) searchInput.value = "";

    await refreshTable();

}

function renderReservations(reservations){

    const tbody = document.getElementById("reservationTable");
    tbody.innerHTML = "";

    const state = getTableState();

    reservations.forEach(res => {

        const tr = document.createElement("tr");

        let cellsHtml = `<td><input type="checkbox" class="reservation-checkbox" data-id="${res.id}"></td>`;

        state.visibleOrder.forEach(key => {

            const colDef = COLUMN_MAP[key];
            if(!colDef) return;

            if(key === "status"){
                const statusKey = (res.status || "").toLowerCase();
                cellsHtml += `<td><span class="status-badge status-${statusKey}">${res.status ?? ""}</span></td>`;
            } else {
                cellsHtml += `<td>${formatColumnValue(key, res)}</td>`;
            }

        });

        tr.innerHTML = cellsHtml;

        tr.addEventListener("click", (e) => {
            if(e.target.closest("input")) return;
            window.location.href = `reservation-detail.html?id=${res.id}`;
        });

        tbody.appendChild(tr);

    });

    setupCheckbox();

}

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

    try { await loadReservations(); }
    catch (err) { console.error("loadReservations failed:", err); }

    try { await adjustRowsPerPageAndRefresh(); }
    catch (err) { console.error("adjustRowsPerPageAndRefresh failed:", err); }

    window.addEventListener("resize", debounce(async () => {
        await adjustRowsPerPageAndRefresh();
    }, 300));

});

// Form manual "Add Reservation" DIMATIKAN — field guest_name/room_number
// teks bebas gak kompatibel sama skema baru (butuh UUID FK guest_id/room_id).
// Pakai "Generate Test Reservation" dulu, atau tunggu form baru (dropdown
// pilih guest & room) dibikinin.
const form = document.getElementById("reservationForm");
if(form){
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        showMessage("Form manual belum kompatibel dengan skema baru — pakai Generate Test Reservation dulu", "error");
    });
}

async function updateStatus(status){

    const selected = [...document.querySelectorAll(".reservation-checkbox:checked")];

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

    const ids = selected.map(item => item.dataset.id);

    const patch = { status };
    if(status === "CHECKED_IN") patch.checked_in_at = new Date().toISOString();
    if(status === "CHECKED_OUT") patch.checked_out_at = new Date().toISOString();
    if(status === "CANCELLED") patch.cancelled_at = new Date().toISOString();

    const { error } = await supabaseClient
        .from("reservations")
        .update(patch)
        .in("id", ids);

    if(error){
        console.error(error);
        showMessage("Failed to update status", "error");
        return;
    }

    showMessage(status === "CHECKED_OUT" ? "Checkout completed" : "Status updated", "success");

    await refreshTable();
    hideActionBar();

}

async function sortTable(column){

    const colDef = COLUMN_MAP[column];
    if(!colDef || colDef.sortable === false) return;

    sortDirection[column] = sortDirection[column] === "asc" ? "desc" : "asc";
    activeSortColumn = column;
    currentPage = 1;

    await refreshTable();

    const selectAll = document.getElementById("selectAll");
    if(selectAll) selectAll.checked = false;

    hideActionBar();

}

async function searchReservation(){

    const keyword = document.getElementById("searchInput").value.trim();
    activeSearchKeyword = keyword;
    currentPage = 1;

    await refreshTable();

    const selectAll = document.getElementById("selectAll");
    if(selectAll) selectAll.checked = false;

    hideActionBar();

}

async function exportReservations(){

    const { data, error } = await buildExportQuery();

    if(error){
        console.error(error);
        showMessage("Export failed", "error");
        return;
    }

    exportList(data, "reservations.csv");
    showMessage("Export completed", "success");

}