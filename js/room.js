// ======================================================
// room.js
// ======================================================

const ROOM_EDITABLE_COLUMNS = [
    "room_type",
    "notes"
];


// ======================================================
// Core Fetch + Render
// ======================================================

async function refreshTable(){

    const { count, error: countError } = await buildBaseQuery(true);

    if(countError){

        console.error(countError);
        showMessage("Gagal memuat data kamar", "error");
        return;

    }

    totalCount = count ?? 0;

    clampCurrentPage();

    const { data, error } = await buildDataQuery();

    if(error){

        console.error(error);
        showMessage("Gagal memuat data kamar", "error");
        return;

    }

    renderRooms(data);

    ROOM_EDITABLE_COLUMNS.forEach(col => resetHeader(col));

    renderPaginationBar();

}

async function loadRooms(){

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
// Render Rows
// ======================================================

function formatUpdatedAt(value){

    if(!value){

        return "-";

    }

    const d = new Date(value);

    if(isNaN(d)){

        return value;

    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hour}:${minute}`;

}

function renderRooms(rooms){

    const tbody = document.getElementById("roomTable");
    tbody.innerHTML = "";

    rooms.forEach(r => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="room-checkbox" data-id="${r.room_number}">
            </td>
            <td>${r.room_number}</td>
            <td class="room_type-cell" data-id="${r.room_number}">${r.room_type ?? ""}</td>
            <td>
                <span class="status-badge status-${(r.status || '').toLowerCase()}">
                    ${(r.status || "-").replace(/_/g, " ")}
                </span>
            </td>
            <td class="notes-cell" data-id="${r.room_number}">${r.notes ?? ""}</td>
            <td>${formatUpdatedAt(r.updated_at)}</td>
        `;

        tr.addEventListener("click", (e) => {

            if(e.target.closest("input, .edit-input")){

                return;

            }

            const checkbox = tr.querySelector(".room-checkbox");

            checkbox.checked = !checkbox.checked;

            updateActionBar();

        });

        tbody.appendChild(tr);

    });

    setupCheckbox();

}


// ======================================================
// Initial Load
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    startClock();

    rowsPerPage = calculateRowsPerPage();

    try {
        await loadRooms();
    } catch (err) {
        console.error("loadRooms failed:", err);
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


// ======================================================
// Add Room
// ======================================================

const roomForm = document.getElementById("roomForm");

roomForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const room = {
        room_number: document.getElementById("r_room_number").value.trim(),
        room_type: document.getElementById("r_room_type").value.trim(),
        status: document.getElementById("r_status").value,
        notes: document.getElementById("r_notes").value || null
    };

    if(!room.room_number){

        showMessage("Room number tidak boleh kosong", "error");
        return;

    }

    const { error } = await supabaseClient
        .from("rooms")
        .insert(room);

    if(error){

        console.error(error);
        showMessage("Failed to save room", "error");
        return;

    }

    showMessage("Room saved", "success");

    await refreshTable();

    roomForm.reset();
    hideAddRoom();

});


// ======================================================
// Bulk Housekeeping Status Update (via checkbox selection)
// ======================================================

function setRoomStatus(status){

    const selected = [
        ...document.querySelectorAll(".room-checkbox:checked")
    ];

    if(selected.length === 0){

        showMessage("No room selected", "error");
        return;

    }

    if(status === "OUT_OF_SERVICE" || status === "BLOCKED"){

        showConfirm(
            `Set ${selected.length} room(s) to ${status.replace(/_/g, " ")}?`,
            () => performRoomStatusUpdate(status, selected),
            () => showMessage("Status change cancelled", "info")
        );

        return;

    }

    performRoomStatusUpdate(status, selected);

}

async function performRoomStatusUpdate(status, selected){

    const roomNumbers = selected.map(item => item.dataset.id);

    const { error } = await supabaseClient
        .from("rooms")
        .update({
            status: status,
            updated_at: new Date().toISOString()
        })
        .in("room_number", roomNumbers);

    if(error){

        console.error(error);
        showMessage("Failed to update room status", "error");
        return;

    }

    showMessage(`Status updated to ${status.replace(/_/g, " ")}`, "success");

    await refreshTable();
    hideActionBar();

}


// ======================================================
// Sort
// ======================================================

async function sortTable(column){

    const dbColumn = sortMap[column];

    if(!dbColumn){
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

async function searchRoom(){

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
// Export
// ======================================================

async function exportRooms(){

    const { data, error } = await buildExportQuery();

    if(error){

        console.error(error);
        showMessage("Export failed", "error");
        return;

    }

    exportList(
        data,
        "rooms.csv"
    );

    showMessage("Export completed", "success");

}