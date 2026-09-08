// ======================================================
// guest.js
// ======================================================

const GUEST_COLUMNS = ["first_name", "last_name", "email", "phone", "city", "country", "loyalty_level", "loyalty_points"];

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

    renderGuests(data);
    GUEST_COLUMNS.forEach(col => resetHeader(col));
    renderPaginationBar();

}

async function loadGuests(){

    activeSearchKeyword = "";
    activeSortColumn = null;
    currentPage = 1;

    const searchInput = document.getElementById("searchInput");
    if(searchInput) searchInput.value = "";

    await refreshTable();

}

function renderGuests(guests){

    const tbody = document.getElementById("guestTable");
    tbody.innerHTML = "";

    guests.forEach(g => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><input type="checkbox" class="guest-checkbox" data-id="${g.id}"></td>
            <td class="first_name-cell" data-id="${g.id}">${g.first_name ?? ""}</td>
            <td class="last_name-cell" data-id="${g.id}">${g.last_name ?? ""}</td>
            <td class="email-cell" data-id="${g.id}">${g.email ?? ""}</td>
            <td class="phone-cell" data-id="${g.id}">${g.phone ?? ""}</td>
            <td class="city-cell" data-id="${g.id}">${g.city ?? ""}</td>
            <td class="country-cell" data-id="${g.id}">${g.country ?? ""}</td>
            <td class="loyalty_level-cell" data-id="${g.id}">${g.loyalty_level ?? "-"}</td>
            <td class="loyalty_points-cell" data-id="${g.id}">${g.loyalty_points ?? 0}</td>
        `;

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