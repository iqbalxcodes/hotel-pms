// ======================================================
// roomManagement.js
// State + wiring. Memanggil roomManagementData.js (fetch/mutasi)
// dan roomManagementUI.js (render).
// ======================================================

let rmAllRooms = [];
let rmOccupiedSet = new Set();
let rmSearchKeyword = "";
let rmSelectedRoom = null;


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

    const kw = rmSearchKeyword.trim().toLowerCase();

    const filtered = !kw ? rmAllRooms : rmAllRooms.filter(r =>
        String(r.room_number).toLowerCase().includes(kw)
        || (r.room_type || "").toLowerCase().includes(kw)
        || (r.notes || "").toLowerCase().includes(kw)
    );

    rmRenderRoomList(filtered, rmOccupiedSet, rmSelectedRoom, rmOpenRoomDetail);

}


// ======================================================
// Column 3 default — Activity feed
// ======================================================

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

    const normalToolbar = document.getElementById("rmNormalToolbar");
    const selectionToolbar = document.getElementById("rmSelectionToolbar");
    const selectedCount = document.getElementById("rmSelectedCount");

    if(selected.length > 0){
        normalToolbar.style.display = "none";
        selectionToolbar.style.display = "flex";
        selectedCount.innerText = `${selected.length} selected`;
    } else {
        normalToolbar.style.display = "flex";
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


// ======================================================
// Init
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    startClock();

    document.getElementById("rmSearchInput").addEventListener("input", (e) => {
        rmSearchKeyword = e.target.value;
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

    rmSetView("list");

    try {
        await rmRefreshOverviewAndList();
        await rmLoadActivityFeed();
    } catch(err){
        console.error("Room Management init failed:", err);
    }

});