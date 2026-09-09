// ======================================================
// reservation.js
// FIXED: query pertama sekarang nunggu Supabase auth session
// selesai di-restore dulu (getSession()) sebelum fetch --
// kalau enggak, RLS bisa nolak semua row di request PERTAMA
// (0 hasil, no error) sampai user ganti filter & request kedua
// jalan setelah session ready. Ditambah 1x retry kalau hasil
// pertama 0 row tanpa error, jaga-jaga cold-start view/schema.
// ROW_HEIGHT_PX sekarang KONSTAN (match css persis) -- dulu
// diukur dari DOM row yang belum ke-render (fallback 41px
// acak), bikin rows-per-page ngadat gak konsisten.
// ======================================================

const ROW_HEIGHT_PX = 37; // harus match .table-container td padding+border di style.css

async function refreshTable(retryOnEmpty = true){

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

    // safety net: 0 row tanpa error di percobaan pertama -> kemungkinan
    // race condition auth/session belum settle, coba sekali lagi
    if(retryOnEmpty && totalCount === 0 && (data?.length ?? 0) === 0){
        await new Promise(r => setTimeout(r, 400));
        await refreshTable(false);
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

// ------------------------------------------------------
// Render rows -- tiap cell (kecuali checkbox & status) dibungkus
// span wrap+inner buat efek blur/running-text.
// ------------------------------------------------------

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
                cellsHtml += `<td data-key="status"><span class="status-badge status-${statusKey}">${res.status ?? ""}</span></td>`;
            } else {
                const val = formatColumnValue(key, res);
                cellsHtml += `<td data-key="${key}"><span class="cell-text-wrap"><span class="cell-text-inner">${val}</span></span></td>`;
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
    initCellMarquees();

}

function bindCellMarquee(wrap){

    const inner = wrap.querySelector(".cell-text-inner");
    if(!inner) return;

    wrap.addEventListener("mouseenter", () => {

        const over = inner.scrollWidth - wrap.clientWidth;
        if(over <= 1) return;

        wrap.classList.remove("cell-fade");
        wrap.classList.add("cell-fade-both");

        inner.style.transitionDuration = Math.max(0.6, over / 45) + "s";
        inner.style.transform = `translateX(-${over}px)`;

    });

    wrap.addEventListener("mouseleave", () => {
        inner.style.transform = "translateX(0)";
        inner.style.transitionDuration = ".3s";
        setTimeout(() => applyCellFade(wrap), 300);
    });

}

function applyCellFade(wrap){

    if(!wrap.isConnected) return;

    const inner = wrap.querySelector(".cell-text-inner");
    if(!inner) return;

    const overflowing = inner.scrollWidth - wrap.clientWidth > 1;

    wrap.classList.toggle("cell-fade", overflowing);
    wrap.classList.remove("cell-fade-both");

}

function initCellMarquees(){
    document.querySelectorAll("#reservationTable .cell-text-wrap").forEach(wrap => {
        bindCellMarquee(wrap);
        applyCellFade(wrap);
    });
}

function refreshCellFadeForColumn(key){
    document.querySelectorAll(`#reservationTable td[data-key="${key}"] .cell-text-wrap`).forEach(applyCellFade);
}

// ======================================================
// Rows-per-page: pakai ROW_HEIGHT_PX konstan (BUKAN diukur dari
// DOM), jadi hasilnya deterministik/konsisten tiap saat. Dipicu
// dari resize window DAN ResizeObserver di .table-scroll -- yang
// kedua ini penting kalau container berubah ukuran TANPA window
// resize (sidebar dibuka/ditutup, tab lain, dll).
// ======================================================

function calculateRowsPerPage(){

    const scrollContainer = document.getElementById("rsvTableScroll");
    if(!scrollContainer) return rowsPerPage;

    const thead = scrollContainer.querySelector("thead");
    const containerHeight = scrollContainer.clientHeight;
    const theadHeight = thead ? thead.getBoundingClientRect().height : 37;

    const available = containerHeight - theadHeight;
    const computed = Math.floor(available / ROW_HEIGHT_PX);

    return Math.max(5, computed);

}

function debounce(fn, delay){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

async function adjustRowsPerPageAndRefresh(){

    if(userSetRowsPerPage) return;

    const newRowsPerPage = calculateRowsPerPage();

    if(newRowsPerPage !== rowsPerPage && newRowsPerPage > 0){
        rowsPerPage = newRowsPerPage;
        currentPage = 1;
        await refreshTable();
    }

}

// ------------------------------------------------------
// Auth-ready guard: pastikan session Supabase udah di-restore
// sebelum fetch pertama. Kalau gagal (network dll), tetap lanjut
// -- jangan block halaman selamanya.
// ------------------------------------------------------

async function waitForAuthReady(){
    try {
        if(window.supabaseClient && supabaseClient.auth && supabaseClient.auth.getSession){
            await supabaseClient.auth.getSession();
        }
    } catch(e){
        console.warn("waitForAuthReady failed, lanjut anyway:", e);
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    await waitForAuthReady();

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

    const scrollContainer = document.getElementById("rsvTableScroll");
    if(scrollContainer && window.ResizeObserver){
        const ro = new ResizeObserver(debounce(() => {
            adjustRowsPerPageAndRefresh();
        }, 300));
        ro.observe(scrollContainer);
    }

});

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