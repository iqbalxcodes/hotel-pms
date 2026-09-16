// ======================================================
// guest.js
// ======================================================

const guestTable = createColumnTable({
    storageKey: "hotel_pms_guest_table_v1",
    columns: GUEST_TABLE_COLUMNS,
    onChange: () => refreshTable()
});

async function refreshTable(){

    const { count, error: countError } = await buildBaseQuery(true);

    if(countError){
        console.error(countError);
        showMessage("Gagal memuat data client", "error");
        return;
    }

    totalCount = count ?? 0;
    clampCurrentPage();

    const { data, error } = await buildDataQuery();

    if(error){
        console.error(error);
        showMessage("Gagal memuat data client", "error");
        return;
    }

    guestRenderHeader();
    renderGuests(data);
    renderPaginationBar();

}

async function loadGuests(){

    activeSearchKeyword = "";
    currentPage = 1;

    const searchInput = document.getElementById("searchInput");
    if(searchInput) searchInput.value = "";

    await refreshTable();

}

function renderGuests(guests){

    const tbody = document.getElementById("guestTable");
    tbody.innerHTML = "";

    const visibleOrder = guestTable.getState().visibleOrder;

    if(guests.length === 0){
        tbody.innerHTML = `<tr><td colspan="${visibleOrder.length + 2}" style="text-align:center;padding:24px;color:#888;">No clients found</td></tr>`;
        return;
    }

    guests.forEach(g => {

        const tr = document.createElement("tr");

        const cells = visibleOrder.map(key =>
            `<td class="${key}-cell" data-id="${g.id}">${buildGuestCellHtml(key, g)}</td>`
        ).join("");

        tr.innerHTML = `<td><input type="checkbox" class="guest-checkbox" data-id="${g.id}"></td>${cells}`;

        tr.addEventListener("click", (e) => {
            if(e.target.closest("input, .edit-input")) return;
            const checkbox = tr.querySelector(".guest-checkbox");
            checkbox.checked = !checkbox.checked;
            updateActionBar();
        });

        tbody.appendChild(tr);

    });

    setupCheckbox();

}

document.addEventListener("DOMContentLoaded", async () => {

    startClock();
    rowsPerPage = calculateRowsPerPage();

    try { await loadGuests(); }
    catch (err) { console.error("loadGuests failed:", err); }

    try { await adjustRowsPerPageAndRefresh(); }
    catch (err) { console.error("adjustRowsPerPageAndRefresh failed:", err); }

    window.addEventListener("resize", debounce(async () => {
        await adjustRowsPerPageAndRefresh();
    }, 300));

});

const guestForm = document.getElementById("guestForm");

if(guestForm){

    guestForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        let organizationId;
        try {
            const prop = await getActiveProperty();
            organizationId = prop.organization_id;
        } catch(err){
            showMessage("Gagal menentukan organization aktif: " + err.message, "error");
            return;
        }

        const guest = {
            organization_id: organizationId,
            profile_type: "INDIVIDUAL",
            first_name: document.getElementById("g_first_name")?.value || null,
            last_name: document.getElementById("g_last_name")?.value || null,
            email: document.getElementById("g_email")?.value || null,
            phone: document.getElementById("g_phone")?.value || null,
            city: document.getElementById("g_city")?.value || null,
            country_code: document.getElementById("g_country")?.value || null,
            loyalty_points_balance: Number(document.getElementById("g_loyalty_points")?.value) || 0
            // loyalty_tier_id sengaja gak diisi — belum ada UI pilih tier
        };

        const { error } = await supabaseClient.from("guests").insert(guest);

        if(error){
            console.error(error);
            showMessage("Failed to save client", "error");
            return;
        }

        showMessage("Client saved", "success");
        await refreshTable();
        guestForm.reset();
        hideAddGuest();

    });

}

function deleteSelectedGuests(){

    const selected = [...document.querySelectorAll(".guest-checkbox:checked")];

    if(selected.length === 0){
        showMessage("No client selected", "error");
        return;
    }

    showConfirm(
        `Delete ${selected.length} client(s)? This cannot be undone.`,
        () => performDeleteGuests(selected),
        () => showMessage("Delete cancelled", "info")
    );

}

async function performDeleteGuests(selected){

    const ids = selected.map(item => item.dataset.id);

    const { error } = await supabaseClient.from("guests").delete().in("id", ids);

    if(error){
        console.error(error);
        showMessage("Failed to delete client(s)", "error");
        return;
    }

    showMessage("Client(s) deleted", "success");
    await refreshTable();
    hideActionBar();

}

async function sortTable(column){

    const dbColumn = sortMap[column];
    if(!dbColumn) return;

    sortDirection[column] = sortDirection[column] === "asc" ? "desc" : "asc";
    activeSortColumn = column;
    currentPage = 1;

    await refreshTable();

    const selectAll = document.getElementById("selectAll");
    if(selectAll) selectAll.checked = false;

    hideActionBar();

}

async function searchGuest(){

    const keyword = document.getElementById("searchInput").value.trim();
    activeSearchKeyword = keyword;
    currentPage = 1;

    await refreshTable();

    const selectAll = document.getElementById("selectAll");
    if(selectAll) selectAll.checked = false;

    hideActionBar();

}

async function exportGuests(){

    const { data, error } = await buildExportQuery();

    if(error){
        console.error(error);
        showMessage("Export failed", "error");
        return;
    }

    exportList(data, "guests.csv");
    showMessage("Export completed", "success");

}