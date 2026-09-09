// ======================================================
// reservation.js
// FIXED: Konsolidasi inisialisasi, data muncul langsung,
// header render terjamin, better error handling.
// ======================================================

const ROW_HEIGHT_PX = 37;

let paginationEnabled = localStorage.getItem("rsv_pagination_enabled");
paginationEnabled = paginationEnabled === null ? true : paginationEnabled === "true";

// ------------------------------------------------------
// Core: refresh table data
// ------------------------------------------------------

async function refreshTable(retryOnEmpty = true){
    // Guard: supabaseClient harus ready
    if(typeof supabaseClient === "undefined" || !supabaseClient){
        console.warn("[reservation] supabaseClient belum siap, retry dalam 500ms...");
        if(retryOnEmpty){
            await new Promise(r => setTimeout(r, 500));
            return refreshTable(false);
        }
        showMessage("Koneksi database belum siap", "error");
        return;
    }

    const countQuery = buildBaseQuery(true);
    if(!countQuery){
        console.warn("[reservation] buildBaseQuery() return null");
        return;
    }

    const { count, error: countError } = await countQuery;

    if(countError){
        console.error("[reservation] count error:", countError);
        showMessage("Gagal memuat data reservasi", "error");
        return;
    }

    totalCount = count ?? 0;
    clampCurrentPage();

    const dataQuery = buildDataQuery();
    if(!dataQuery){
        console.warn("[reservation] buildDataQuery() return null");
        return;
    }

    const { data, error } = await dataQuery;

    if(error){
        console.error("[reservation] data error:", error);
        showMessage("Gagal memuat data reservasi", "error");
        return;
    }

    // safety net: 0 row tanpa error di percobaan pertama -> retry sekali
    if(retryOnEmpty && totalCount === 0 && (data?.length ?? 0) === 0){
        console.log("[reservation] 0 row di percobaan pertama, retry...");
        await new Promise(r => setTimeout(r, 600));
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
// Render rows
// ------------------------------------------------------

function renderReservations(reservations){
    const tbody = document.getElementById("reservationTable");
    if(!tbody){
        console.warn("[reservation] reservationTable tidak ditemukan");
        return;
    }
    tbody.innerHTML = "";

    const state = getTableState();

    if(!Array.isArray(reservations) || reservations.length === 0){
        // Tampilkan baris kosong dengan pesan
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="${state.visibleOrder.length + 1}" style="text-align:center;padding:24px;color:#888;">No reservations found</td>`;
        tbody.appendChild(tr);
        return;
    }

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
// Rows-per-page
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
// Toggle pagination
// ------------------------------------------------------

function rsvSetPaginationEnabled(enabled){
    paginationEnabled = enabled;
    localStorage.setItem("rsv_pagination_enabled", String(enabled));
    if(enabled){
        userSetRowsPerPage = false;
        rowsPerPage = calculateRowsPerPage();
    } else {
        userSetRowsPerPage = true;
        rowsPerPage = "all";
    }
    currentPage = 1;
    refreshTable();
}

// ------------------------------------------------------
// Auth-ready guard
// ------------------------------------------------------

async function waitForAuthReady(){
    try {
        if(window.supabaseClient && supabaseClient.auth && supabaseClient.auth.getSession){
            await Promise.race([
                supabaseClient.auth.getSession(),
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);
        }
    } catch(e){
        console.warn("waitForAuthReady failed, lanjut anyway:", e);
    }
}

// ======================================================
// INIT — satu tempat, terurut, tidak ada race condition
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[reservation] DOMContentLoaded — mulai inisialisasi");

    // 1. Render header tabel (tidak butuh auth)
    if(typeof initTableColumns === "function"){
        initTableColumns();
        console.log("[reservation] initTableColumns() OK");
    } else {
        console.warn("[reservation] initTableColumns() tidak ditemukan — pastikan tableColumns.js diload sebelum reservation.js");
    }

    // 2. Tunggu auth (max 1.5s)
    await waitForAuthReady();
    console.log("[reservation] auth ready (atau timeout)");

    // 3. Update UI pills
    updateToolbar();

    // 4. Render user area (kalau ada)
    if(typeof renderUserArea === "function"){
        try { renderUserArea(); }
        catch(err) { console.error("renderUserArea error:", err); }
    }

    // 5. Setup pagination
    if(!paginationEnabled){
        rowsPerPage = "all";
        userSetRowsPerPage = true;
    } else {
        rowsPerPage = calculateRowsPerPage();
    }

    // 6. Load data — dengan retry otomatis kalau supabase belum siap
    try {
        await loadReservations();
        console.log("[reservation] loadReservations() OK");
    } catch(err) {
        console.error("[reservation] loadReservations() failed:", err);
    }

    // 7. Adjust rows per page setelah data render (untuk mengisi tinggi container)
    if(paginationEnabled){
        try { await adjustRowsPerPageAndRefresh(); }
        catch(err) { console.error("adjustRowsPerPageAndRefresh failed:", err); }
    }

    // 8. Resize observer
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

    console.log("[reservation] Inisialisasi selesai");
});

// ------------------------------------------------------
// Form handler
// ------------------------------------------------------

const form = document.getElementById("reservationForm");
if(form){
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        showMessage("Form manual belum kompatibel dengan skema baru — pakai Generate Test Reservation dulu", "error");
    });
}

// ------------------------------------------------------
// Actions
// ------------------------------------------------------

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
    if(typeof supabaseClient === "undefined" || !supabaseClient){
        showMessage("Database belum siap", "error");
        return;
    }
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
    const query = buildExportQuery();
    if(!query){
        showMessage("Export query gagal dibuat", "error");
        return;
    }
    const { data, error } = await query;
    if(error){
        console.error(error);
        showMessage("Export failed", "error");
        return;
    }
    exportList(data, "reservations.csv");
    showMessage("Export completed", "success");
}