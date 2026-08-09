// ======================================================
// roomRack.js
// Room Plan / room rack (Gantt-style timeline).
// Setiap hari punya 2 slot: Vormittag (AM) & Nachmittag (PM).
// - Nginap normal: PM hari datang -> AM hari pulang.
// - Day guest: AM -> PM di hari yang sama (arrival == departure).
// Konflik & konversi rentang tanggal ditangani oleh
// RoomAvailability (js/roomAvailability.js — wajib di-load
// SEBELUM file ini).
// ======================================================

const RACK_COLLAPSED_KEY = "hotel_pms_rack_collapsed_v1";
const RACK_VIEW_MODE_KEY = "hotel_pms_rack_view_mode_v1";
const RACK_OCCUPYING_STATUSES = RoomAvailability.OCCUPYING_STATUSES;

const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// rackViewMode: "auto" (responsif, ngisi lebar layar penuh, tidak
// dibatasi 14 hari) atau "3" / "7" / "14" / "30" (dipaksa manual)
let rackViewMode = loadRackViewMode();

// rackStartDate = tanggal AWAL jendela yang sedang ditampilkan
// (dipakai buat render kolom). rackSelectedDate = tanggal yang
// SEBENARNYA dipilih user lewat date picker / tombol ◀▶ — dua
// hal ini SENGAJA dipisah supaya date input tidak "loncat" ke
// tanggal awal jendela saat window di-recenter.
let rackStartDate = startOfToday();
let rackSelectedDate = startOfToday();
let rackDayCount = getRackDayCount();
let rackCollapsed = loadCollapsedGroups();

// State drag & drop aktif (null kalau tidak sedang drag)
let rackDragState = null;


// ======================================================
// Date helpers (all local-midnight based to avoid TZ drift)
// ======================================================

function startOfToday(){

    const d = new Date();
    d.setHours(0, 0, 0, 0);

    return d;

}

function parseDateOnly(str){

    if(!str) return null;

    const [y, m, d] = str.split("-").map(Number);

    return new Date(y, m - 1, d);

}

function addDays(date, n){

    const d = new Date(date);
    d.setDate(d.getDate() + n);

    return d;

}

function diffDays(a, b){

    return Math.round((a - b) / 86400000);

}

function formatDateISO(date){

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;

}

function isSameDay(a, b){

    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();

}


// ======================================================
// Responsive day count — TIDAK dibatasi ke 14 lagi di mode
// "auto". Dihitung dari lebar #rackScroll yang sebenarnya.
// ======================================================

function getColWidthTierForViewport(viewportWidth){

    if(viewportWidth <= 700) return 130;
    if(viewportWidth <= 1100) return 96;
    if(viewportWidth <= 1700) return 76;

    return 60;

}

function getRackDayCount(){

    if(rackViewMode !== "auto"){

        return Number(rackViewMode);

    }

    const scrollEl = document.getElementById("rackScroll");
    const viewportWidth = scrollEl ? scrollEl.clientWidth : window.innerWidth;

    const labelWidth = viewportWidth <= 700 ? 128 : 172;
    const colWidth = getColWidthTierForViewport(viewportWidth);

    const availableWidth = Math.max(viewportWidth - labelWidth, colWidth);

    return Math.max(3, Math.floor(availableWidth / colWidth));

}

function getRackColWidth(dayCount){

    if(rackViewMode !== "auto"){

        if(dayCount <= 3) return 130;
        if(dayCount <= 7) return 96;
        if(dayCount <= 14) return 76;

        return 60;

    }

    const scrollEl = document.getElementById("rackScroll");
    const viewportWidth = scrollEl ? scrollEl.clientWidth : window.innerWidth;

    return getColWidthTierForViewport(viewportWidth);

}

function loadRackViewMode(){

    return localStorage.getItem(RACK_VIEW_MODE_KEY) || "auto";

}

function rackSetViewMode(mode){

    rackViewMode = mode;

    localStorage.setItem(RACK_VIEW_MODE_KEY, mode);

    updateRackViewModeButtons();
    refreshRack();

}

function updateRackViewModeButtons(){

    document.querySelectorAll(".rack-view-btn").forEach(btn => {

        btn.classList.toggle("active", btn.dataset.mode === rackViewMode);

    });

}


// ======================================================
// Collapsed-group persistence
// ======================================================

function loadCollapsedGroups(){

    try {

        const raw = localStorage.getItem(RACK_COLLAPSED_KEY);
        const arr = raw ? JSON.parse(raw) : [];

        return new Set(Array.isArray(arr) ? arr : []);

    } catch(e){

        return new Set();

    }

}

function saveCollapsedGroups(){

    localStorage.setItem(RACK_COLLAPSED_KEY, JSON.stringify([...rackCollapsed]));

}


// ======================================================
// Auth guard
// ======================================================

function requireLogin(actionLabel = "melakukan aksi ini"){

    if(typeof isLoggedIn === "function" && isLoggedIn()){

        return true;

    }

    showMessage(`🔒 Login diperlukan untuk ${actionLabel}`, "error");

    return false;

}


// ======================================================
// Data fetching
// ======================================================

async function fetchRackRooms(){

    const { data, error } = await supabaseClient
        .from("rooms")
        .select("*");

    if(error){

        console.error(error);
        showMessage("Gagal memuat data kamar", "error");

        return [];

    }

    data.sort((a, b) =>
        String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })
    );

    return data;

}

async function fetchRackReservations(rangeStart, rangeEnd){

    const { data, error } = await supabaseClient
        .from("reservation")
        .select("*")
        .in("status", RACK_OCCUPYING_STATUSES)
        .lte("arrival_date", formatDateISO(rangeEnd))
        .gte("departure_date", formatDateISO(rangeStart));

    if(error){

        console.error(error);
        showMessage("Gagal memuat data reservasi", "error");

        return [];

    }

    return data;

}

function groupRoomsByType(rooms){

    const groups = new Map();

    rooms.forEach(room => {

        const type = room.room_type && room.room_type.trim() ? room.room_type : "Uncategorized";

        if(!groups.has(type)){

            groups.set(type, []);

        }

        groups.get(type).push(room);

    });

    return groups;

}

function groupReservationsByRoom(reservations){

    const map = new Map();

    reservations.forEach(res => {

        if(!map.has(res.room_number)){

            map.set(res.room_number, []);

        }

        map.get(res.room_number).push(res);

    });

    map.forEach(list => {

        list.sort((a, b) => (a.arrival_date < b.arrival_date ? -1 : 1));

    });

    return map;

}

// Satu kamar hanya boleh diisi satu reservasi per slot setengah-hari.
// Dicek pairwise pakai rentang setengah-hari, bukan cuma tanggal.
function roomHasConflict(resList){

    for(let i = 0; i < resList.length; i++){

        for(let j = i + 1; j < resList.length; j++){

            const a = RoomAvailability.getOccupiedRange(resList[i].arrival_date, resList[i].departure_date);
            const b = RoomAvailability.getOccupiedRange(resList[j].arrival_date, resList[j].departure_date);

            if(RoomAvailability.rangesOverlap(a, b)){

                return true;

            }

        }

    }

    return false;

}

// Susun reservasi yang overlap ke "lane" vertikal terpisah (mirip
// Google Calendar) supaya masing-masing punya area klik/drag sendiri
// dan tidak saling menutupi.
function computeLanes(resList){

    const withRange = resList
        .map(res => ({ res, range: RoomAvailability.getOccupiedRange(res.arrival_date, res.departure_date) }))
        .filter(item => item.range)
        .sort((a, b) => a.range.start - b.range.start);

    const laneEnds = [];
    const laneOf = new Map();

    withRange.forEach(({ res, range }) => {

        let lane = laneEnds.findIndex(end => range.start >= end);

        if(lane === -1){

            lane = laneEnds.length;
            laneEnds.push(range.end);

        } else {

            laneEnds[lane] = range.end;

        }

        laneOf.set(res.id, lane);

    });

    return { laneOf, laneCount: Math.max(1, laneEnds.length) };

}


// ======================================================
// Rendering
// ======================================================

function renderRackHeader(days, dayWidth){

    const today = startOfToday();
    const row = document.getElementById("rackHeaderRow");

    let html = `
        <div class="rack-header-label">
            <span>ROOM</span>
            <button class="rack-nav-btn rack-nav-prev" onclick="rackChangeDate(-1)" title="Sebelumnya">\u25c0</button>
        </div>
    `;

    days.forEach(d => {

        const isToday = isSameDay(d, today);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        html += `
            <div class="rack-header-cell ${isToday ? "is-today" : ""} ${isWeekend ? "is-weekend" : ""}"
                 style="width:${dayWidth}px">
                <div class="rack-header-dow">${DOW_LABELS[d.getDay()]}</div>
                <div class="rack-header-date">${String(d.getDate()).padStart(2, "0")} ${MONTH_LABELS[d.getMonth()]}</div>
                <div class="rack-header-halves"><span>AM</span><span>PM</span></div>
            </div>
        `;

    });

    html += `
        <div class="rack-header-end">
            <button class="rack-nav-btn" onclick="rackChangeDate(1)" title="Berikutnya">\u25b6</button>
        </div>
    `;

    row.innerHTML = html;

}

function buildTimelineCellsHTML(days, dayWidth, room){

    const statusClass = `status-${(room.status || "").toLowerCase()}`;
    const halfWidth = dayWidth / 2;

    let html = "";

    days.forEach(d => {

        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        html += `
            <div class="rack-cell ${statusClass} ${isWeekend ? "is-weekend" : ""}" style="width:${dayWidth}px">
                <div class="rack-half-cell am" style="width:${halfWidth}px"></div>
                <div class="rack-half-cell pm" style="width:${halfWidth}px"></div>
            </div>
        `;

    });

    return html;

}

function buildBarsHTML(room, days, dayWidth, dayCount, resList, hasConflict, laneOf, laneCount){

    const halfWidth = dayWidth / 2;
    const laneHeightPct = 100 / laneCount;

    const rangeStartHalf = RoomAvailability.getOccupiedRange(
        formatDateISO(days[0]), formatDateISO(days[0])
    ).start;

    const lastDayIso = formatDateISO(days[dayCount - 1]);
    const rangeEndHalfExclusive = RoomAvailability.getOccupiedRange(lastDayIso, lastDayIso).end;

    let html = "";

    resList.forEach(res => {

        const range = RoomAvailability.getOccupiedRange(res.arrival_date, res.departure_date);

        if(!range) return;

        const clampStart = Math.max(range.start, rangeStartHalf);
        const clampEnd = Math.min(range.end, rangeEndHalfExclusive);

        if(clampEnd <= clampStart) return;

        const offsetHalves = clampStart - rangeStartHalf;
        const spanHalves = clampEnd - clampStart;

        // Margin kiri/kanan kecil biar reservasi bersebelahan tetap
        // kelihatan sebagai 2 blok terpisah.
        const left = offsetHalves * halfWidth + 3;
        const width = spanHalves * halfWidth - 6;

        const cutLeft = range.start < rangeStartHalf;
        const cutRight = range.end > rangeEndHalfExclusive;

        const statusKey = (res.status || "").toLowerCase();
        const arrival = parseDateOnly(res.arrival_date);
        const departure = parseDateOnly(res.departure_date);

        const meta = [
            range.dayUse ? "Day use" : null,
            res.adults ? `${res.adults} AD` : null,
            `${formatShortDate(arrival)}\u2013${formatShortDate(departure)}`
        ].filter(Boolean).join(" \u00b7 ");

        // Reservasi yang sudah CHECKED_OUT dikunci — tidak bisa digeser/dipindah lagi
        const locked = res.status === "CHECKED_OUT";

        // Posisi lane vertikal — reservasi yang overlap ditumpuk
        // ke lane terpisah supaya masing-masing bisa diklik/drag.
        const laneIndex = laneOf.get(res.id) ?? 0;
        const top = laneIndex * laneHeightPct;

        html += `
            <div class="reservation-bar status-${statusKey} ${cutLeft ? "cut-left" : ""} ${cutRight ? "cut-right" : ""} ${hasConflict ? "has-conflict" : ""} ${locked ? "locked" : ""} ${range.dayUse ? "day-use" : ""}"
                 style="left:${left}px; width:${width}px; top:calc(${top}% + 2px); height:calc(${laneHeightPct}% - 4px);"
                 title="${escapeAttr(res.guest_name || "")} \u00b7 ${res.status}"
                 data-res-id="${res.id}"
                 data-room="${escapeAttr(room.room_number)}"
                 data-guest="${escapeAttr(res.guest_name || "(No name)")}"
                 data-status="${escapeAttr(res.status || "")}"
                 data-arrival="${res.arrival_date}"
                 data-departure="${res.departure_date}">
                ${!locked && !cutLeft ? `<div class="bar-resize-handle left"></div>` : ""}
                <span class="bar-guest">${escapeAttr(res.guest_name || "(No name)")}</span>
                <span class="bar-meta">${escapeAttr(meta)}</span>
                ${!locked && !cutRight ? `<div class="bar-resize-handle right"></div>` : ""}
            </div>
        `;

    });

    return html;

}

function formatShortDate(d){

    return `${String(d.getDate()).padStart(2, "0")} ${MONTH_LABELS[d.getMonth()]}`;

}

function escapeAttr(str){

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

function buildTodayLineHTML(days, dayWidth, dayCount){

    const today = startOfToday();
    const rangeStart = days[0];
    const rangeEnd = addDays(days[dayCount - 1], 1);

    if(today < rangeStart || today >= rangeEnd){

        return "";

    }

    const offset = diffDays(today, rangeStart) * dayWidth;

    return `<div class="rack-today-line" style="left:${offset}px;"></div>`;

}

function renderRackBody(groupedRooms, reservationsByRoom, days, dayWidth, dayCount){

    const body = document.getElementById("rackBody");

    let html = "";

    groupedRooms.forEach((rooms, type) => {

        const collapsed = rackCollapsed.has(type);

        html += `<div class="rack-group ${collapsed ? "collapsed" : ""}" data-type="${escapeAttr(type)}">`;

        html += `
            <div class="rack-group-title" onclick="rackToggleGroup('${escapeAttr(type)}')">
                <span class="rack-group-caret">\u25be</span>${escapeAttr(type)} (${rooms.length})
            </div>
        `;

        rooms.forEach(room => {

            const resList = reservationsByRoom.get(room.room_number) || [];
            const hasConflict = roomHasConflict(resList);
            const statusKey = (room.status || "").toLowerCase();

            const { laneOf, laneCount } = computeLanes(resList);
            const rowMinHeight = Math.max(54, laneCount * 40 + 14);

            html += `
                <div class="rack-row" data-room="${escapeAttr(room.room_number)}" style="min-height:${rowMinHeight}px;">

                    <div class="rack-room-label">
                        <input type="checkbox" class="rack-room-checkbox" data-id="${escapeAttr(room.room_number)}">
                        ${hasConflict ? `<span class="rack-conflict-flag" title="Double booking">\u26a0</span>` : ""}
                        <span class="rack-room-number">${escapeAttr(room.room_number)}</span>
                        <span class="rack-status-dot status-${statusKey}" title="${escapeAttr(room.status || "")}">\u25cf</span>
                    </div>

                    <div class="rack-timeline" style="width:${dayWidth * dayCount}px;">
                        ${buildTimelineCellsHTML(days, dayWidth, room)}
                        ${buildTodayLineHTML(days, dayWidth, dayCount)}
                        <div class="rack-bars-layer" style="width:${dayWidth * dayCount}px;">
                            ${buildBarsHTML(room, days, dayWidth, dayCount, resList, hasConflict, laneOf, laneCount)}
                        </div>
                    </div>

                </div>
            `;

        });

        html += `</div>`;

    });

    body.innerHTML = html || `<div style="padding:16px; color:#888;">No rooms found</div>`;

    setupRackCheckboxes();

}


// ======================================================
// Group collapse / expand
// ======================================================

function rackToggleGroup(type){

    if(rackCollapsed.has(type)){

        rackCollapsed.delete(type);

    } else {

        rackCollapsed.add(type);

    }

    saveCollapsedGroups();

    const groupEl = document.querySelector(`.rack-group[data-type="${CSS.escape(type)}"]`);

    if(groupEl){

        groupEl.classList.toggle("collapsed");

    }

}

function rackToggleAllGroups(){

    const anyExpanded = document.querySelector(".rack-group:not(.collapsed)");

    document.querySelectorAll(".rack-group").forEach(groupEl => {

        const type = groupEl.dataset.type;

        if(anyExpanded){

            groupEl.classList.add("collapsed");
            rackCollapsed.add(type);

        } else {

            groupEl.classList.remove("collapsed");
            rackCollapsed.delete(type);

        }

    });

    saveCollapsedGroups();

}


// ======================================================
// Drag & Drop
// - "move": ghost mengikuti kursor, TINGGI ghost di-set eksplisit
//   dari getBoundingClientRect() supaya tidak melebar ke bawah
//   layar (bug lama: height:100% resolve ke tinggi viewport saat
//   posisi fixed di document.body).
// - "resize-left" / "resize-right": snap per SETENGAH hari, hasil
//   akhir dikonversi balik ke arrival/departure lewat
//   RoomAvailability.rangeToDates().
// - Penyimpanan (rackFinishMove / rackFinishResize) selalu dicek
//   requireLogin() dulu — kalau belum login, alert + posisi revert.
// ======================================================

function setupRackDragAndDrop(){

    document.getElementById("rackBody")
        .addEventListener("mousedown", rackHandleMouseDown);

}

function rackHandleMouseDown(e){

    const bar = e.target.closest(".reservation-bar");

    if(!bar || bar.classList.contains("locked")){

        return;

    }

    e.preventDefault();

    const handle = e.target.closest(".bar-resize-handle");

    const type = handle
        ? (handle.classList.contains("left") ? "resize-left" : "resize-right")
        : "move";

    const dayWidth = getRackColWidth(rackDayCount);
    const halfWidth = dayWidth / 2;

    const arrivalStr = bar.dataset.arrival;
    const departureStr = bar.dataset.departure;
    const range = RoomAvailability.getOccupiedRange(arrivalStr, departureStr);

    rackDragState = {

        type,
        resId: bar.dataset.resId,
        originRoom: bar.dataset.room,
        guestName: bar.dataset.guest,
        arrival: arrivalStr,
        departure: departureStr,
        range: { ...range },
        startX: e.clientX,
        startY: e.clientY,
        barEl: bar,
        originLeft: parseFloat(bar.style.left),
        originWidth: parseFloat(bar.style.width),
        dayWidth,
        halfWidth,
        moved: false,
        ghostEl: null

    };

    if(type === "move"){

        const barRect = bar.getBoundingClientRect();

        const ghost = bar.cloneNode(true);

        ghost.classList.add("rack-drag-ghost");
        ghost.style.position = "fixed";
        ghost.style.left = "0px";
        ghost.style.top = "0px";
        ghost.style.width = rackDragState.originWidth + "px";
        // FIX: tinggi eksplisit, jangan andalkan height:100% (bikin
        // ghost melebar sampai ujung bawah layar saat position:fixed)
        ghost.style.height = barRect.height + "px";
        ghost.style.pointerEvents = "none";

        document.body.appendChild(ghost);

        rackDragState.ghostEl = ghost;

        positionRackGhost(e);

    }

    document.addEventListener("mousemove", rackHandleMouseMove);
    document.addEventListener("mouseup", rackHandleMouseUp);

}

function positionRackGhost(e){

    if(!rackDragState || !rackDragState.ghostEl) return;

    rackDragState.ghostEl.style.transform =
        `translate(${e.clientX - rackDragState.originWidth / 2}px, ${e.clientY - 16}px)`;

}

function rackHandleMouseMove(e){

    if(!rackDragState) return;

    const dx = e.clientX - rackDragState.startX;
    const dy = e.clientY - rackDragState.startY;

    if(Math.abs(dx) > 4 || Math.abs(dy) > 4){

        rackDragState.moved = true;

    }

    if(rackDragState.type === "move"){

        positionRackGhost(e);

        document.querySelectorAll(".rack-row.drag-target-row")
            .forEach(el => el.classList.remove("drag-target-row"));

        const rowEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".rack-row");

        if(rowEl){

            rowEl.classList.add("drag-target-row");

        }

        return;

    }

    // Resize: snap ke setengah hari (kolom AM/PM)
    const deltaHalves = Math.round(dx / rackDragState.halfWidth);
    const bar = rackDragState.barEl;

    if(rackDragState.type === "resize-left"){

        const newLeft = rackDragState.originLeft + deltaHalves * rackDragState.halfWidth;
        const newWidth = rackDragState.originWidth - deltaHalves * rackDragState.halfWidth;

        if(newWidth < rackDragState.halfWidth - 4) return;

        bar.style.left = newLeft + "px";
        bar.style.width = newWidth + "px";

    } else {

        const newWidth = rackDragState.originWidth + deltaHalves * rackDragState.halfWidth;

        if(newWidth < rackDragState.halfWidth - 4) return;

        bar.style.width = newWidth + "px";

    }

}

async function rackHandleMouseUp(e){

    document.removeEventListener("mousemove", rackHandleMouseMove);
    document.removeEventListener("mouseup", rackHandleMouseUp);

    if(!rackDragState) return;

    const state = rackDragState;
    rackDragState = null;

    document.querySelectorAll(".rack-row.drag-target-row")
        .forEach(el => el.classList.remove("drag-target-row"));

    if(state.ghostEl){

        state.ghostEl.remove();

    }

    // Tidak ada gerakan berarti -> anggap sebagai klik biasa, buka detail
    if(!state.moved){

        window.location.href = `reservation-detail.html?id=${state.resId}`;
        return;

    }

    if(state.type === "move"){

        await rackFinishMove(state, e);

    } else {

        await rackFinishResize(state, e);

    }

}

async function rackFinishMove(state, e){

    const rowEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".rack-row");
    const targetRoom = rowEl ? rowEl.dataset.room : null;

    if(!targetRoom || targetRoom === state.originRoom){

        await refreshRack();
        return;

    }

    if(!requireLogin("memindahkan reservasi")){

        await refreshRack();
        return;

    }

    const { conflicts, error } = await RoomAvailability.findConflicts(
        supabaseClient, targetRoom, state.arrival, state.departure, state.resId
    );

    if(error){

        showMessage("Gagal memeriksa ketersediaan kamar", "error");
        await refreshRack();
        return;

    }

    if(conflicts.length > 0){

        const names = [...new Set(conflicts.map(c => c.guest_name || "reservasi lain"))].join(", ");

        showMessage(`Kamar ${targetRoom} sudah terisi (${names}) pada rentang tersebut`, "error");
        await refreshRack();
        return;

    }

    showConfirm(
        `Pindahkan reservasi ${state.guestName} dari kamar ${state.originRoom} ke kamar ${targetRoom}?`,
        async () => {

            const { error: updateError } = await supabaseClient
                .from("reservation")
                .update({ room_number: targetRoom })
                .eq("id", Number(state.resId));

            if(updateError){

                console.error(updateError);
                showMessage("Gagal memindahkan reservasi", "error");
                await refreshRack();
                return;

            }

            showMessage(`Reservasi dipindahkan ke kamar ${targetRoom}`, "success");
            await refreshRack();

        },
        () => refreshRack()
    );

}

async function rackFinishResize(state, e){

    const dx = e.clientX - state.startX;
    const deltaHalves = Math.round(dx / state.halfWidth);

    if(deltaHalves === 0){

        await refreshRack();
        return;

    }

    let newStart = state.range.start;
    let newEnd = state.range.end;

    if(state.type === "resize-left"){

        newStart = state.range.start + deltaHalves;

    } else {

        newEnd = state.range.end + deltaHalves;

    }

    if(newEnd - newStart < 2){

        showMessage("Durasi reservasi minimal setengah hari (day use)", "error");
        await refreshRack();
        return;

    }

    const newDates = RoomAvailability.rangeToDates(newStart, newEnd);

    if(!newDates){

        await refreshRack();
        return;

    }

    if(!requireLogin("mengubah tanggal reservasi")){

        await refreshRack();
        return;

    }

    const { conflicts, error } = await RoomAvailability.findConflicts(
        supabaseClient, state.originRoom, newDates.arrival, newDates.departure, state.resId
    );

    if(error){

        showMessage("Gagal memeriksa ketersediaan kamar", "error");
        await refreshRack();
        return;

    }

    if(conflicts.length > 0){

        const names = [...new Set(conflicts.map(c => c.guest_name || "reservasi lain"))].join(", ");

        showMessage(`Kamar ${state.originRoom} sudah terisi (${names}) pada rentang tanggal itu`, "error");
        await refreshRack();
        return;

    }

    const label = newDates.arrival === newDates.departure
        ? `${newDates.arrival} (day use)`
        : `${newDates.arrival} \u2192 ${newDates.departure}`;

    showConfirm(
        `Ubah tanggal reservasi ${state.guestName} menjadi ${label}?`,
        async () => {

            const { error: updateError } = await supabaseClient
                .from("reservation")
                .update({
                    arrival_date: newDates.arrival,
                    departure_date: newDates.departure
                })
                .eq("id", Number(state.resId));

            if(updateError){

                console.error(updateError);
                showMessage("Gagal mengubah tanggal reservasi", "error");
                await refreshRack();
                return;

            }

            showMessage("Tanggal reservasi diperbarui", "success");
            await refreshRack();

        },
        () => refreshRack()
    );

}


// ======================================================
// Selection + quick housekeeping status (mirrors room.js)
// ======================================================

function setupRackCheckboxes(){

    document.querySelectorAll(".rack-room-checkbox").forEach(box => {

        box.addEventListener("change", updateRackActionBar);

    });

}

function updateRackActionBar(){

    const selected = document.querySelectorAll(".rack-room-checkbox:checked");

    const normalToolbar = document.getElementById("normalToolbar");
    const selectionToolbar = document.getElementById("selectionToolbar");
    const selectedCount = document.getElementById("selectedCount");

    if(selected.length > 0){

        normalToolbar.style.display = "none";
        selectionToolbar.style.display = "block";
        selectedCount.innerText = `${selected.length} selected`;

    } else {

        normalToolbar.style.display = "block";
        selectionToolbar.style.display = "none";

    }

}

function hideRackActionBar(){

    document.getElementById("normalToolbar").style.display = "block";
    document.getElementById("selectionToolbar").style.display = "none";
    document.getElementById("selectedCount").innerText = "0 selected";

}

function rackSetRoomStatus(status){

    if(!requireLogin("mengubah status kamar")){

        return;

    }

    const selected = [...document.querySelectorAll(".rack-room-checkbox:checked")];

    if(selected.length === 0){

        showMessage("No room selected", "error");
        return;

    }

    if(status === "OUT_OF_SERVICE" || status === "BLOCKED"){

        showConfirm(
            `Set ${selected.length} room(s) to ${status.replace(/_/g, " ")}?`,
            () => performRackRoomStatusUpdate(status, selected),
            () => showMessage("Status change cancelled", "info")
        );

        return;

    }

    performRackRoomStatusUpdate(status, selected);

}

async function performRackRoomStatusUpdate(status, selected){

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

    hideRackActionBar();

    await refreshRack();

}


// ======================================================
// Date navigation
// - rackChangeDate (◀▶): geser jendela 1 hari, dan tanggal yang
//   "dipilih" ikut disamakan dengan awal jendela baru.
// - centerRackOnDate (date picker): simpan tanggal yang BENAR2
//   dipilih user ke rackSelectedDate, lalu hitung rackStartDate
//   supaya tanggal itu ada di tengah jendela yang ditampilkan.
// - updateRackDateInput selalu menulis rackSelectedDate ke input,
//   BUKAN rackStartDate — supaya date picker tidak "loncat" ke
//   tanggal awal jendela.
// ======================================================

function rackChangeDate(stepDays){

    rackStartDate = addDays(rackStartDate, stepDays);
    rackSelectedDate = rackStartDate;

    updateRackDateInput();
    refreshRack();

}

function centerRackOnDate(date){

    rackSelectedDate = date;

    const dayCount = getRackDayCount();
    const before = Math.floor((dayCount - 1) / 2);

    rackStartDate = addDays(date, -before);

    updateRackDateInput();

}

function rackChangeSelectedDate(value){

    // Native <input type="date"> suka nembak event "change" DI
    // TENGAH-TENGAH user ngetik tahun (bug lama Chrome) — misal
    // baru ketik 2 digit tahun udah fire change dengan value kayak
    // "0002-08-09" atau "0020-08-09" sebelum tahunnya lengkap 4
    // digit. Makanya di-debounce dulu, dan tahun yang gak masuk
    // akal (di luar rentang wajar) ditolak & inputnya di-revert
    // ke tanggal terakhir yang valid.

    clearTimeout(rackChangeSelectedDate._timer);

    rackChangeSelectedDate._timer = setTimeout(() => {

        const parsed = parseDateOnly(value);

        if(!parsed){

            updateRackDateInput();
            return;

        }

        const year = parsed.getFullYear();

        if(year < 1970 || year > 2100){

            updateRackDateInput();
            return;

        }

        centerRackOnDate(parsed);
        refreshRack();

    }, 500);

}

function updateRackDateInput(){

    const input = document.getElementById("rackDateInput");

    if(input){

        input.value = formatDateISO(rackSelectedDate);

    }

}


// ======================================================
// Refresh / Init
// ======================================================

async function refreshRack(){

    rackDayCount = getRackDayCount();

    const dayWidth = getRackColWidth(rackDayCount);

    document.documentElement.style.setProperty("--rack-col-width", `${dayWidth}px`);

    const days = [];

    for(let i = 0; i < rackDayCount; i++){

        days.push(addDays(rackStartDate, i));

    }

    const rangeEnd = days[days.length - 1];

    const [rooms, reservations] = await Promise.all([
        fetchRackRooms(),
        fetchRackReservations(rackStartDate, rangeEnd)
    ]);

    const groupedRooms = groupRoomsByType(rooms);
    const reservationsByRoom = groupReservationsByRoom(reservations);

    renderRackHeader(days, dayWidth);
    renderRackBody(groupedRooms, reservationsByRoom, days, dayWidth, rackDayCount);

    if(typeof applyAuthVisibility === "function"){

        applyAuthVisibility();

    }

}

function startClock(){

    const clock = document.getElementById("clock");

    function updateClock(){

        const now = new Date();

        clock.innerText = now.toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

    }

    updateClock();
    setInterval(updateClock, 1000);

}

function escapeHtml(str){

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

function showMessage(text, type = "info"){

    const contextArea = document.getElementById("contextArea");

    if(!contextArea) return;

    contextArea.innerHTML = `<span class="status-msg-${type}">${escapeHtml(text)}</span>`;

    clearTimeout(showMessage._timer);

    showMessage._timer = setTimeout(() => {
        contextArea.innerHTML = "";
    }, 4000);

}

function showConfirm(message, onConfirm, onCancel){

    const contextArea = document.getElementById("contextArea");

    if(!contextArea) return;

    contextArea.innerHTML = `
        <span class="status-confirm">
            ${escapeHtml(message)}
            <button id="confirmYesBtn">Yes</button>
            <button id="confirmNoBtn">No</button>
        </span>
    `;

    document.getElementById("confirmYesBtn").onclick = () => {
        contextArea.innerHTML = "";
        onConfirm();
    };

    document.getElementById("confirmNoBtn").onclick = () => {
        contextArea.innerHTML = "";
        if(onCancel) onCancel();
    };

}

function showDevMessage(feature){

    showMessage(`${feature} is still in development`, "info");

}

function debounce(fn, delay){

    let timer;

    return (...args) => {

        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);

    };

}

document.addEventListener("DOMContentLoaded", async () => {

    startClock();
    updateRackViewModeButtons();
    setupRackDragAndDrop();

    centerRackOnDate(startOfToday());

    try {
        await refreshRack();
    } catch(err){
        console.error("refreshRack failed:", err);
    }

    window.addEventListener("resize", debounce(async () => {

        const newDayCount = getRackDayCount();

        if(newDayCount !== rackDayCount){

            centerRackOnDate(rackSelectedDate);
            await refreshRack();

        }

    }, 300));

});