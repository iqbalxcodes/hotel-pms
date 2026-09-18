// ======================================================
// roomManagement.js
// State + wiring. Memanggil roomManagementData.js (fetch/mutasi)
// dan roomManagementUI.js (render).
//
// Search: dipindah dari input segaris ke search CARD (searchCardEngine,
// columnSize:1 -> 4 field = 4 kolom, mirip halaman reservation).
// Filter jadi AND multi-field (bukan cuma satu keyword substring).
// Ditambah pagination client-side (dulu render semua rooms sekaligus).
// ======================================================

let rmActiveTraces = [];
let rmAllRooms = [];
let rmOccupiedSet = new Set();
let rmSelectedRoom = null;

let rmActiveSearchFields = {};
let rmCurrentPage = 1;
const RM_PAGE_SIZE = 15;

const RM_FIELDS_KEY = "rm_search_fields_config";

const RM_STATUS_OPTIONS = [
    { value: "", label: "Any" },
    { value: "CLEAN", label: "Clean" },
    { value: "DIRTY", label: "Dirty" },
    { value: "INSPECTED", label: "Inspected" },
    { value: "OUT_OF_SERVICE", label: "Out of Service" },
    { value: "BLOCKED", label: "Blocked" }
];

const RM_SEARCH_FIELDS = [
    { key: "room_number", label: "Room Number", type: "text" },
    { key: "room_type", label: "Room Type", type: "text" },
    { key: "floor", label: "Floor", type: "text" },
    { key: "status", label: "Status", type: "select", options: RM_STATUS_OPTIONS }
];

// columnSize:1 -> tiap field jadi kolomnya sendiri -> 4 field = 4 kolom
const rmSearchCard = createSearchCard({
    storageKey: RM_FIELDS_KEY,
    containerId: "rmSearchFields",
    fields: RM_SEARCH_FIELDS,
    columnSize: 1
});

const roomTable = createColumnTable({
    storageKey: "hotel_pms_room_table_v1",
    columns: ROOM_TABLE_COLUMNS,
    onChange: () => rmRenderFilteredList()
});

function rmSortRooms(rooms, occupiedSet){

    const sort = roomTable.getSort();
    if(!sort) return rooms;

    const dir = sort.direction === "asc" ? 1 : -1;

    return [...rooms].sort((a, b) => {

        let va, vb;

        if(sort.key === "room_number"){
            va = a.room_number; vb = b.room_number;
        } else if(sort.key === "room_type"){
            va = a.room_type || ""; vb = b.room_type || "";
        } else if(sort.key === "floor"){
            va = a.floor ?? ""; vb = b.floor ?? "";
        } else {
            return 0;
        }

        if(va < vb) return -1 * dir;
        if(va > vb) return 1 * dir;
        return 0;

    });

}

function rmMatchesFields(r, fields){

    return Object.entries(fields).every(([key, val]) => {

        if(!val) return true;

        if(key === "status"){
            return r.status === val;
        }

        return String(r[key] ?? "").toLowerCase().includes(String(val).toLowerCase());

    });

}


// ======================================================
// Clock (sama seperti halaman lain)
// ======================================================

function startClock(){

    const clock = document.getElementById("clock");
    if(!clock) return;

    function updateClock(){

        const now = new Date();

        clock.innerText = now.toLocaleString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });

    }

    updateClock();
    setInterval(updateClock, 1000);

}


// ======================================================
// View state (list <-> detail), dipakai CSS di breakpoint
// medium & mobile lewat [data-view]
// ======================================================

function rmSetView(view){

    const grid = document.getElementById("rmGrid");
    if(grid) grid.dataset.view = view;

}


// ======================================================
// Load / refresh Column 1 + Column 2 (dipanggil di init
// dan tiap kali ada perubahan status kamar)
// ======================================================

async function rmRefreshOverviewAndList(){

    const [rooms, occupiedSet, fundsachen, blockedRooms] = await Promise.all([
        rmFetchAllRooms(),
        rmFetchOccupiedRoomNumbers(),
        rmFetchOpenFundsachen(5),
        rmFetchBlockedOrOOORooms()
    ]);

    rmAllRooms = rooms;
    rmOccupiedSet = occupiedSet;

    rmRenderOverviewStats(rooms, occupiedSet);
    rmRenderFundsachenPreview(fundsachen, rmOpenRoomDetail);
    rmRenderBlockedList(blockedRooms, rmOpenRoomDetail);

    rmRenderFilteredList();

}

function rmRenderFilteredList(){

    const hasFilter = Object.keys(rmActiveSearchFields).length > 0;

    const filtered = !hasFilter
        ? rmAllRooms
        : rmAllRooms.filter(r => rmMatchesFields(r, rmActiveSearchFields));

    const sorted = rmSortRooms(filtered, rmOccupiedSet);

    const totalPages = Math.max(1, Math.ceil(sorted.length / RM_PAGE_SIZE));
    if(rmCurrentPage > totalPages) rmCurrentPage = totalPages;
    if(rmCurrentPage < 1) rmCurrentPage = 1;

    const start = (rmCurrentPage - 1) * RM_PAGE_SIZE;
    const pageRows = sorted.slice(start, start + RM_PAGE_SIZE);

    rmRenderRoomTableHeader();
    rmRenderRoomList(pageRows, rmOccupiedSet, rmSelectedRoom, rmOpenRoomDetail);
    rmRenderPagination(sorted.length, totalPages);

}

function rmRenderPagination(total, totalPages){

    const info = document.getElementById("rmPaginationInfo");
    const prevBtn = document.getElementById("rmPrevPage");
    const nextBtn = document.getElementById("rmNextPage");
    if(!info) return;

    const from = total === 0 ? 0 : (rmCurrentPage - 1) * RM_PAGE_SIZE + 1;
    const to = Math.min(rmCurrentPage * RM_PAGE_SIZE, total);

    info.textContent = `${from}-${to} of ${total}`;

    if(prevBtn) prevBtn.disabled = rmCurrentPage <= 1;
    if(nextBtn) nextBtn.disabled = rmCurrentPage >= totalPages;

}


// ------------------------------------------------------
// Search card handlers
// ------------------------------------------------------

function rmApplySearch(fields){
    rmActiveSearchFields = fields;
    rmCurrentPage = 1;
    rmRenderFilteredList();
    rmRenderChip();
}

function rmClearSearch(){
    rmActiveSearchFields = {};
    rmSearchCard.clearValues();
    rmCurrentPage = 1;
    rmRenderFilteredList();
    rmRenderChip();
}

function rmRemoveSearchField(key){

    delete rmActiveSearchFields[key];

    const el = document.querySelector(`#rmSearchFields [data-search-key="${key}"]`);
    if(el) el.value = "";

    rmCurrentPage = 1;
    rmRenderFilteredList();
    rmRenderChip();

}

function rmRenderChip(){

    const wrap = document.getElementById("rmSearchChips");
    if(!wrap) return;

    const keys = Object.keys(rmActiveSearchFields || {});

    if(keys.length === 0){
        wrap.style.display = "none";
        wrap.innerHTML = "";
        return;
    }

    wrap.style.display = "flex";

    wrap.innerHTML = keys.map(k => `
        <span class="rm-search-chip" data-key="${k}">
            <span>${rmEscapeHtml(rmSearchCard.fieldLabel(k))}: ${rmEscapeHtml(rmSearchCard.formatValue(k, rmActiveSearchFields[k]))}</span>
            <button data-remove="${k}" title="Remove">&times;</button>
        </span>
    `).join("");

    wrap.querySelectorAll("[data-remove]").forEach(btn => {
        btn.onclick = () => rmRemoveSearchField(btn.dataset.remove);
    });

}


// ======================================================
// Column 3 default — Activity feed
// ======================================================

function rmBuildRoomLookup(){
    return new Map(rmAllRooms.map(r => [r.id, r]));
}

async function rmLoadTraces(){

    rmActiveTraces = await rmFetchActiveTraces();

    rmRenderTracesList(
        rmActiveTraces,
        rmBuildRoomLookup(),
        rmOpenRoomDetail,
        rmHandleTraceStatusChange
    );

}

async function rmHandleTraceStatusChange(id, status){

    const { error } = await rmUpdateTraceStatus(id, status);

    if(error){
        rmShowMessage("Gagal update status trace", "error");
        return;
    }

    await rmLoadTraces();

}

async function rmHandleAddTrace(){

    const roomInput = document.getElementById("rmTraceRoomInput");
    const deptInput = document.getElementById("rmTraceDeptInput");
    const subtypeInput = document.getElementById("rmTraceSubtypeInput");
    const priorityInput = document.getElementById("rmTracePriorityInput");
    const dueInput = document.getElementById("rmTraceDueInput");
    const commentInput = document.getElementById("rmTraceCommentInput");

    const roomNumber = roomInput.value.trim();

    if(!roomNumber){
        rmShowMessage("Isi nomor kamar dulu", "error");
        return;
    }

    const room = rmAllRooms.find(r => String(r.room_number) === roomNumber);

    if(!room){
        rmShowMessage(`Room ${roomNumber} tidak ditemukan`, "error");
        return;
    }

    const comment = commentInput.value.trim();
    const instruction = comment ? `${subtypeInput.value}: ${comment}` : subtypeInput.value;

    const payload = {
        context_type: "ROOM",
        context_id: room.id,
        assigned_department: deptInput.value,
        priority: priorityInput.value,
        due_at: dueInput.value ? new Date(dueInput.value).toISOString() : null,
        status: "OPEN",
        instruction
    };

    const { error } = await rmCreateTrace(payload);

    if(error){
        console.error(error);
        rmShowMessage("Gagal menambah trace: " + error.message, "error");
        return;
    }

    rmShowMessage("Trace added", "success");

    roomInput.value = "";
    commentInput.value = "";
    dueInput.value = "";

    await rmLoadTraces();

}

async function rmLoadActivityFeed(){

    const [activity, reservationEvents] = await Promise.all([
        rmFetchGlobalActivity(30),
        rmFetchTodayReservationEvents()
    ]);

    rmRenderActivityFeed(activity, reservationEvents);

}


// ======================================================
// Room Detail — open / back
// ======================================================

async function rmOpenRoomDetail(roomNumber){

    if(!roomNumber) return;

    rmSelectedRoom = roomNumber;
    rmSetView("detail");
    rmRenderFilteredList(); // update highlight di list

    const room = await rmFetchRoom(roomNumber);

    if(!room){
        rmShowMessage("Gagal memuat detail kamar", "error");
        rmSetView("list");
        return;
    }

    rmRenderRoomDetailShell(room);

    document.getElementById("rmBackBtn").addEventListener("click", rmBackToList);

    await rmLoadRoomSubData(roomNumber);

}

function rmBackToList(){

    rmSelectedRoom = null;
    rmSetView("list");
    rmRenderFilteredList();
    rmLoadActivityFeed();
    rmLoadTraces();

}

async function rmLoadRoomSubData(roomNumber){

    const [fundsachen, maintenance, history, usage] = await Promise.all([
        rmFetchFundsachenForRoom(roomNumber),
        rmFetchMaintenanceForRoom(roomNumber),
        rmFetchActivityForRoom(roomNumber, 50),
        rmFetchRoomUsage(roomNumber, 5)
    ]);

    rmRenderFundsachenSubcard(fundsachen, roomNumber, rmHandleFundsachenStatusChange, rmHandleAddFundsachen);
    rmRenderMaintenanceSubcard(maintenance, roomNumber, rmHandleMaintenanceStatusChange, rmHandleAddMaintenance);
    rmRenderHistorySubcard(history);
    rmRenderRoomUsage(usage);

}


// ------------------------------------------------------
// Fundsachen handlers
// ------------------------------------------------------

async function rmHandleFundsachenStatusChange(id, roomNumber, itemName, status){

    const { error } = await rmUpdateFundsachenStatus(id, roomNumber, itemName, status);

    if(error){
        rmShowMessage("Gagal update status fundsachen", "error");
        return;
    }

    rmShowMessage("Status updated", "success");

    await rmLoadRoomSubData(roomNumber);
    await rmRefreshOverviewAndList();

}

async function rmHandleAddFundsachen(payload){

    const { error } = await rmCreateFundsachen(payload);

    if(error){
        console.error(error);
        rmShowMessage("Gagal menyimpan laporan", "error");
        return;
    }

    rmShowMessage("Report saved", "success");

    await rmLoadRoomSubData(payload.room_number);
    await rmRefreshOverviewAndList();

}


// ------------------------------------------------------
// Maintenance handlers
// ------------------------------------------------------

async function rmHandleMaintenanceStatusChange(id, roomNumber, title, status){

    const { error } = await rmUpdateMaintenanceStatus(id, roomNumber, title, status);

    if(error){
        rmShowMessage("Gagal update status maintenance", "error");
        return;
    }

    rmShowMessage("Status updated", "success");

    await rmLoadRoomSubData(roomNumber);

}

async function rmHandleAddMaintenance(payload){

    const { error } = await rmCreateMaintenance(payload);

    if(error){
        console.error(error);
        rmShowMessage("Gagal menyimpan maintenance request", "error");
        return;
    }

    rmShowMessage("Request saved", "success");

    await rmLoadRoomSubData(payload.room_number);

}


// ======================================================
// Bulk housekeeping status (checkbox di Room List)
// ======================================================

function rmUpdateSelectionToolbar(){

    const selected = document.querySelectorAll(".rm-room-checkbox:checked");

    const selectionToolbar = document.getElementById("rmSelectionToolbar");
    const selectedCount = document.getElementById("rmSelectedCount");

    if(selected.length > 0){
        selectionToolbar.style.display = "flex";
        selectedCount.innerText = `${selected.length} selected`;
    } else {
        selectionToolbar.style.display = "none";
    }

}

async function rmSetSelectedRoomsStatus(status){

    const selected = [...document.querySelectorAll(".rm-room-checkbox:checked")].map(el => el.dataset.id);

    if(selected.length === 0){
        rmShowMessage("No room selected", "error");
        return;
    }

    const doUpdate = async () => {

        const { error } = await rmUpdateRoomStatus(selected, status);

        if(error){
            rmShowMessage("Failed to update room status", "error");
            return;
        }

        for(const roomNumber of selected){

            await rmLogActivity({
                room_number: roomNumber,
                event_type: "STATUS_CHANGE",
                description: `Room marked as ${status.replace(/_/g," ")}`
            });

        }

        rmShowMessage(`Status updated to ${status.replace(/_/g," ")}`, "success");

        await rmRefreshOverviewAndList();
        await rmLoadActivityFeed();

    };

    if(status === "OUT_OF_SERVICE" || status === "BLOCKED"){

        rmShowConfirm(
            `Set ${selected.length} room(s) to ${status.replace(/_/g," ")}?`,
            doUpdate,
            () => rmShowMessage("Cancelled", "info")
        );

        return;

    }

    await doUpdate();

}

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
// pms:customize-toggle -- dispatch dari pmsTopbar.js, biar
// drag-reorder/hide field di search card kepakai juga di sini.
// ======================================================

document.addEventListener("pms:customize-toggle", (e) => {
    rmSearchCard.setCustomizing(e.detail.active);
});


// ======================================================
// Init
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
    
    await waitForAuthReady();
    startClock();

    rmSearchCard.load();
    rmSearchCard.render();

    document.getElementById("rmSearchForm").addEventListener("submit", (e) => {
        e.preventDefault();
        rmApplySearch(rmSearchCard.gatherValues());
    });

    document.getElementById("rmSearchClearBtn").addEventListener("click", rmClearSearch);

    document.getElementById("rmPrevPage").addEventListener("click", () => {
        if(rmCurrentPage <= 1) return;
        rmCurrentPage--;
        rmRenderFilteredList();
    });

    document.getElementById("rmNextPage").addEventListener("click", () => {
        rmCurrentPage++;
        rmRenderFilteredList();
    });

    document.body.addEventListener("change", (e) => {
        if(e.target.classList.contains("rm-room-checkbox")){
            rmUpdateSelectionToolbar();
        }
    });

    document.getElementById("rmDirtyBtn").addEventListener("click", () => rmSetSelectedRoomsStatus("DIRTY"));
    document.getElementById("rmCleanBtn").addEventListener("click", () => rmSetSelectedRoomsStatus("CLEAN"));
    document.getElementById("rmInspectedBtn").addEventListener("click", () => rmSetSelectedRoomsStatus("INSPECTED"));
    document.getElementById("rmOooBtn").addEventListener("click", () => rmSetSelectedRoomsStatus("OUT_OF_SERVICE"));
    document.getElementById("rmBlockedBtn").addEventListener("click", () => rmSetSelectedRoomsStatus("BLOCKED"));

    rmTracePopulateSubtypes();
    document.getElementById("rmTraceDeptInput").addEventListener("change", rmTracePopulateSubtypes);
    document.getElementById("rmTraceAddBtn").addEventListener("click", rmHandleAddTrace);

    document.querySelectorAll(".rm-trace-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            rmSetTraceFilter(btn.dataset.filter, rmActiveTraces, rmBuildRoomLookup(), rmOpenRoomDetail, rmHandleTraceStatusChange);
        });
    });

    rmSetView("list");

    try {
        await rmRefreshOverviewAndList();
        await rmLoadActivityFeed();
        await rmLoadTraces();
    } catch(err){
        console.error("Room Management init failed:", err);
    }

});