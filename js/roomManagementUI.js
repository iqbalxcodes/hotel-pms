// ======================================================
// roomManagementUI.js
// Semua fungsi render (DOM) untuk Room Management.
// State & wiring ada di roomManagement.js.
// ======================================================

function rmEscapeHtml(str){

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

function rmShowMessage(text, type = "info"){

    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;

    contextArea.innerHTML = `<span class="status-msg-${type}">${rmEscapeHtml(text)}</span>`;

    clearTimeout(rmShowMessage._timer);

    rmShowMessage._timer = setTimeout(() => {
        contextArea.innerHTML = "";
    }, 4000);

}

function rmShowConfirm(message, onConfirm, onCancel){

    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;

    contextArea.innerHTML = `
        <span class="status-confirm">
            ${rmEscapeHtml(message)}
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

function rmFormatDateTime(value){

    if(!value) return "-";

    const d = new Date(value);
    if(isNaN(d)) return value;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");

    return `${day}/${month} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

}

function rmFormatDate(value){

    if(!value) return "-";

    const d = new Date(value);
    if(isNaN(d)) return value;

    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

}

function rmTimeAgo(value){

    if(!value) return "-";

    const d = new Date(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");

    return `${day}/${month} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

}


// ======================================================
// Title bar — inline summary stats (replaces old Room
// Overview card). Draggable buat reorder, klik buat quick
// filter (wiring/state ada di roomManagement.js).
// ======================================================

function rmRenderSummaryStrip(items, activeKey, handlers){

    const track = document.getElementById("rmSummaryTrack");
    if(!track) return;

    track.innerHTML = items.map((item, idx) => {

        const sep = idx === 0 ? "" : `<span class="rm-summary-dash">-</span>`;
        const activeClass = item.key === activeKey ? "rm-summary-active" : "";

        return `${sep}<span class="rm-summary-item ${activeClass}" draggable="true" data-key="${item.key}">${rmEscapeHtml(item.label)}: ${item.value}</span>`;

    }).join("");

    let dragKey = null;

    track.querySelectorAll(".rm-summary-item").forEach(el => {

        el.addEventListener("click", () => handlers.onItemClick(el.dataset.key));

        el.addEventListener("dragstart", () => {
            dragKey = el.dataset.key;
            el.classList.add("rm-summary-dragging");
        });

        el.addEventListener("dragend", () => {
            el.classList.remove("rm-summary-dragging");
            track.querySelectorAll(".rm-summary-item").forEach(x => x.classList.remove("rm-drop-before", "rm-drop-after"));
            dragKey = null;
        });

        el.addEventListener("dragover", (e) => {
            if(!dragKey || dragKey === el.dataset.key) return;
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;
            track.querySelectorAll(".rm-summary-item").forEach(x => x.classList.remove("rm-drop-before", "rm-drop-after"));
            el.classList.add(before ? "rm-drop-before" : "rm-drop-after");
        });

        el.addEventListener("drop", (e) => {

            e.preventDefault();
            if(!dragKey || dragKey === el.dataset.key) return;

            const rect = el.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            const order = items.map(i => i.key);
            const from = order.indexOf(dragKey);
            order.splice(from, 1);
            let to = order.indexOf(el.dataset.key);
            if(!before) to += 1;
            order.splice(to, 0, dragKey);

            handlers.onReorder(order);

        });

    });

}


// ======================================================
// Column 1 — Fundsachen preview
// ======================================================

function rmRenderFundsachenPreview(items, onClickRoom){

    const el = document.getElementById("rmFundsachenList");
    if(!el) return;

    const countEl = document.getElementById("rmFundsachenCount");
    if(countEl) countEl.innerText = `${items.length} open`;

    if(items.length === 0){
        el.innerHTML = `<div class="rm-empty-note">No open reports</div>`;
        return;
    }

    el.innerHTML = items.map(item => `
        <div class="rm-mini-item" data-room="${rmEscapeHtml(item.room_number || "")}">
            <div class="rm-mini-title">Room ${rmEscapeHtml(item.room_number || "-")} · ${rmEscapeHtml(item.item_name)}</div>
            <div class="rm-mini-sub">${rmTimeAgo(item.found_at)} · ${rmEscapeHtml(item.status)}</div>
        </div>
    `).join("");

    el.querySelectorAll(".rm-mini-item").forEach(node => {

        node.addEventListener("click", () => {
            const room = node.dataset.room;
            if(room) onClickRoom(room);
        });

    });

}


// ======================================================
// Column 2 — Room List
// ======================================================

function rmRenderRoomList(rooms, occupiedSet, selectedRoom, onClickRoom){

    const tbody = document.getElementById("rmRoomListBody");
    if(!tbody) return;

    const visibleOrder = roomTable.getState().visibleOrder;

    if(rooms.length === 0){
        tbody.innerHTML = `<tr><td colspan="${visibleOrder.length + 2}" class="rm-empty-note" style="padding:12px;">No rooms found</td></tr>`;
        return;
    }

    tbody.innerHTML = rooms.map(r => {

        const isOccupied = occupiedSet.has(r.room_number);
        const activeClass = r.room_number === selectedRoom ? "active" : "";

        const cells = visibleOrder.map(key =>
            `<td>${rmBuildRoomCellHtml(key, r, isOccupied)}</td>`
        ).join("");

        return `
            <tr class="rm-row ${activeClass}" data-room="${rmEscapeHtml(r.room_number)}">
                <td><input type="checkbox" class="rm-room-checkbox" data-id="${rmEscapeHtml(r.room_number)}" onclick="event.stopPropagation()"></td>
                ${cells}
                <td></td>
            </tr>
        `;

    }).join("");

    tbody.querySelectorAll(".rm-row").forEach(node => {

        node.addEventListener("click", () => onClickRoom(node.dataset.room));

    });

    refreshStatusBadgeIcons();

}


// ======================================================
// Column 3 (default) — Global Activity Timeline
// ======================================================

function rmRenderActivityFeed(activityRows, reservationEvents){

    const el = document.getElementById("rmDetailPane");
    if(!el) return;

    const merged = [
        ...activityRows.map(a => ({
            room_number: a.room_number,
            description: a.description,
            created_at: a.created_at,
            actor: a.actor
        })),
        ...reservationEvents
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const rowsHtml = merged.length === 0
        ? `<div class="rm-empty-note">No activity yet</div>`
        : merged.map(a => `
            <div class="rm-activity-row">
                <div class="rm-activity-time">${rmTimeAgo(a.created_at)}</div>
                <div class="rm-activity-body">
                    <div class="rm-activity-room">Room ${rmEscapeHtml(a.room_number || "-")}</div>
                    <div class="rm-activity-desc">${rmEscapeHtml(a.description)}</div>
                    ${a.actor ? `<div class="rm-activity-actor">by ${rmEscapeHtml(a.actor)}</div>` : ""}
                </div>
            </div>
        `).join("");

    el.innerHTML = `
        <div class="rm-detail-header">
            <span class="rm-detail-room-number">Room Activity</span>
        </div>
        ${rowsHtml}
    `;

}


// ======================================================
// Room Detail view (subcards dirender terpisah lalu
// disuntik ke dalam container)
// ======================================================

function rmRenderRoomDetailShell(room){

    const el = document.getElementById("rmDetailPane");
    if(!el) return;

    const area = (room.width_m && room.length_m)
        ? (room.width_m * room.length_m).toFixed(2)
        : null;

    el.innerHTML = `
        <div class="rm-detail-header">
            <div>
                <span class="rm-detail-room-number">${rmEscapeHtml(room.room_number)}</span>
                <span class="rm-detail-room-type">${rmEscapeHtml(room.room_type || "")}</span>
            </div>
            <button class="rm-back-btn" id="rmBackBtn">← Back</button>
        </div>

        <div class="rm-detail-section">
            <h5>Room Information</h5>
            <div class="rm-field-grid">
                <div class="rm-field"><label>Room Number</label><div class="rm-field-value">${rmEscapeHtml(room.room_number)}</div></div>
                <div class="rm-field"><label>Room Type</label><div class="rm-field-value">${rmEscapeHtml(room.room_type || "-")}</div></div>
                <div class="rm-field"><label>Floor</label><div class="rm-field-value">${room.floor ?? "-"}</div></div>
                <div class="rm-field"><label>Wing</label><div class="rm-field-value">${rmEscapeHtml(room.wing || "-")}</div></div>
                <div class="rm-field"><label>Location</label><div class="rm-field-value">${rmEscapeHtml(room.location_note || "-")}</div></div>
            </div>
        </div>

        <div class="rm-detail-section">
            <h5>Dimensions</h5>
            <div class="rm-field-grid">
                <div class="rm-field"><label>Width</label><div class="rm-field-value">${room.width_m ? room.width_m + " m" : "-"}</div></div>
                <div class="rm-field"><label>Length</label><div class="rm-field-value">${room.length_m ? room.length_m + " m" : "-"}</div></div>
                <div class="rm-field"><label>Area</label><div class="rm-field-value">${area ? area + " m²" : "-"}</div></div>
                <div class="rm-field"><label>Ceiling Height</label><div class="rm-field-value">${room.ceiling_height_m ? room.ceiling_height_m + " m" : "-"}</div></div>
            </div>
        </div>

        <div class="rm-detail-section">
            <h5>Configuration</h5>
            <div class="rm-field-grid">
                <div class="rm-field"><label>Bed</label><div class="rm-field-value">${rmEscapeHtml(room.bed_type || "-")}</div></div>
                <div class="rm-field"><label>Max Occupancy</label><div class="rm-field-value">${room.max_occupancy ?? "-"}</div></div>
                <div class="rm-field"><label>Connecting Room</label><div class="rm-field-value">${rmEscapeHtml(room.connecting_room || "-")}</div></div>
                <div class="rm-field"><label>Smoking</label><div class="rm-field-value">${room.smoking ? "Yes" : "No"}</div></div>
                <div class="rm-field"><label>Accessible</label><div class="rm-field-value">${room.accessible ? "Yes" : "No"}</div></div>
            </div>
        </div>

        <div class="rm-detail-section">
            <h5>Characteristics</h5>
            <div class="rm-check-list">
                ${rmCheckSpan("Quiet", room.quiet_room)}
                ${rmCheckSpan(room.view || "View", !!room.view)}
                ${rmCheckSpan("Balcony", room.balcony)}
                ${rmCheckSpan("Air Conditioning", room.air_conditioning)}
                ${rmCheckSpan("Minibar", room.minibar)}
                ${rmCheckSpan("Safe", room.safe)}
                ${rmCheckSpan("Near Elevator", room.near_elevator)}
            </div>
        </div>

        <div class="rm-detail-section">
            <h5>Fundsachen · Maintenance · History</h5>
            <div class="rm-subcards">
                <div class="rm-subcard" id="rmSubcardFundsachen"></div>
                <div class="rm-subcard" id="rmSubcardMaintenance"></div>
                <div class="rm-subcard" id="rmSubcardHistory"></div>
            </div>
        </div>

        <div class="rm-detail-section">
            <h5>Room Usage</h5>
            <div id="rmRoomUsage" class="rm-mini-list"></div>
        </div>
    `;

}

function rmCheckSpan(label, isTrue){

    return `<span class="${isTrue ? "rm-check-yes" : "rm-check-no"}">${rmEscapeHtml(label)}</span>`;

}


// ------------------------------------------------------
// Subcard: Fundsachen
// ------------------------------------------------------

function rmRenderFundsachenSubcard(items, roomNumber, onStatusChange, onAddNew){

    const el = document.getElementById("rmSubcardFundsachen");
    if(!el) return;

    const listHtml = items.length === 0
        ? `<div class="rm-empty-note">No reports</div>`
        : items.map(item => `
            <div class="rm-subcard-item">
                <div class="rm-subcard-item-title">${rmEscapeHtml(item.item_name)}</div>
                <div class="rm-subcard-item-meta">Found ${rmTimeAgo(item.found_at)}${item.found_by ? " by " + rmEscapeHtml(item.found_by) : ""}</div>
                <select class="rm-subcard-status" data-id="${item.id}">
                    ${["UNCLAIMED","STORED","RETURNED","DISPOSED"].map(s =>
                        `<option value="${s}" ${s === item.status ? "selected" : ""}>${s}</option>`
                    ).join("")}
                </select>
            </div>
        `).join("");

    el.innerHTML = `
        <h5>Fundsachen <span class="rm-subcard-count">${items.length} report${items.length === 1 ? "" : "s"}</span></h5>
        <div class="rm-subcard-list">${listHtml}</div>
        <div class="rm-quick-add">
            <input type="text" id="rmNewFundsachenItem" placeholder="Item name">
            <input type="text" id="rmNewFundsachenBy" placeholder="Found by (optional)">
            <button id="rmAddFundsachenBtn">+ Add report</button>
        </div>
    `;

    el.querySelectorAll(".rm-subcard-status").forEach(sel => {

        sel.addEventListener("change", () => {

            const item = items.find(i => String(i.id) === sel.dataset.id);
            onStatusChange(sel.dataset.id, roomNumber, item ? item.item_name : "", sel.value);

        });

    });

    const addBtn = document.getElementById("rmAddFundsachenBtn");

    if(addBtn){

        addBtn.addEventListener("click", () => {

            const itemName = document.getElementById("rmNewFundsachenItem").value.trim();
            const foundBy = document.getElementById("rmNewFundsachenBy").value.trim();

            if(!itemName){
                rmShowMessage("Item name tidak boleh kosong", "error");
                return;
            }

            onAddNew({ room_number: roomNumber, item_name: itemName, found_by: foundBy || null });

        });

    }

}


// ------------------------------------------------------
// Subcard: Maintenance
// ------------------------------------------------------

function rmRenderMaintenanceSubcard(items, roomNumber, onStatusChange, onAddNew){

    const el = document.getElementById("rmSubcardMaintenance");
    if(!el) return;

    const openCount = items.filter(i => MAINTENANCE_OPEN_STATUSES.includes(i.status)).length;

    const listHtml = items.length === 0
        ? `<div class="rm-empty-note">No requests</div>`
        : items.map(item => `
            <div class="rm-subcard-item">
                <div class="rm-subcard-item-title">${rmEscapeHtml(item.title)}</div>
                <div class="rm-subcard-item-meta">${rmEscapeHtml(item.priority)} priority · reported ${rmTimeAgo(item.reported_at)}</div>
                <select class="rm-subcard-status" data-id="${item.id}">
                    ${["OPEN","ASSIGNED","IN_PROGRESS","WAITING_PARTS","RESOLVED","CLOSED"].map(s =>
                        `<option value="${s}" ${s === item.status ? "selected" : ""}>${s.replace(/_/g," ")}</option>`
                    ).join("")}
                </select>
            </div>
        `).join("");

    el.innerHTML = `
        <h5>Maintenance <span class="rm-subcard-count">${openCount} open</span></h5>
        <div class="rm-subcard-list">${listHtml}</div>
        <div class="rm-quick-add">
            <input type="text" id="rmNewMaintenanceTitle" placeholder="Issue title">
            <select id="rmNewMaintenancePriority">
                <option value="LOW">Low priority</option>
                <option value="MEDIUM" selected>Medium priority</option>
                <option value="HIGH">High priority</option>
            </select>
            <button id="rmAddMaintenanceBtn">+ Add request</button>
        </div>
    `;

    el.querySelectorAll(".rm-subcard-status").forEach(sel => {

        sel.addEventListener("change", () => {

            const item = items.find(i => String(i.id) === sel.dataset.id);
            onStatusChange(sel.dataset.id, roomNumber, item ? item.title : "", sel.value);

        });

    });

    const addBtn = document.getElementById("rmAddMaintenanceBtn");

    if(addBtn){

        addBtn.addEventListener("click", () => {

            const title = document.getElementById("rmNewMaintenanceTitle").value.trim();
            const priority = document.getElementById("rmNewMaintenancePriority").value;

            if(!title){
                rmShowMessage("Issue title tidak boleh kosong", "error");
                return;
            }

            onAddNew({ room_number: roomNumber, title, priority });

        });

    }

}


// ------------------------------------------------------
// Subcard: Room History (activity khusus 1 kamar)
// ------------------------------------------------------

function rmRenderHistorySubcard(activityRows){

    const el = document.getElementById("rmSubcardHistory");
    if(!el) return;

    const listHtml = activityRows.length === 0
        ? `<div class="rm-empty-note">No history yet</div>`
        : activityRows.map(a => `
            <div class="rm-subcard-item">
                <div class="rm-subcard-item-title">${rmEscapeHtml(a.description)}</div>
                <div class="rm-subcard-item-meta">${rmTimeAgo(a.created_at)}${a.actor ? " · " + rmEscapeHtml(a.actor) : ""}</div>
            </div>
        `).join("");

    el.innerHTML = `
        <h5>Room History <span class="rm-subcard-count">${activityRows.length} events</span></h5>
        <div class="rm-subcard-list">${listHtml}</div>
    `;

}


// ------------------------------------------------------
// Room Usage (reservation history)
// ------------------------------------------------------

function rmRenderRoomUsage(reservations){

    const el = document.getElementById("rmRoomUsage");
    if(!el) return;

    if(reservations.length === 0){
        el.innerHTML = `<div class="rm-empty-note">No reservation history for this room</div>`;
        return;
    }

    el.innerHTML = reservations.map(res => `
        <div class="rm-mini-item" onclick="window.location.href='reservation-detail.html?id=${res.id}'">
            <div class="rm-mini-title">${rmEscapeHtml(res.guest_name || "Reservation #" + res.id)}</div>
            <div class="rm-mini-sub">
                ${rmFormatDate(res.arrival_date)} → ${rmFormatDate(res.departure_date)}
                · ${rmEscapeHtml(res.status.replace(/_/g," "))}
            </div>
        </div>
    `).join("");

}

function rmRenderRoomTableHeader(){

    const thead = document.querySelector("#rmRoomTable thead tr");
    if(!thead) return;

    const state = roomTable.getState();

    thead.innerHTML = `
        <th style="width:30px;"></th>
        ${state.visibleOrder.map(k => ctRenderColHeader("hotel_pms_room_table_v1", k)).join("")}
        <th style="width:28px;"><button class="ct-icon-btn" onclick="ctOpenModifyPopup('hotel_pms_room_table_v1')" title="Modify Table">⚙</button></th>
    `;

    const tableEl = document.getElementById("rmRoomTable");
    let colgroup = tableEl.querySelector("colgroup");
    if(!colgroup){
        colgroup = document.createElement("colgroup");
        tableEl.prepend(colgroup);
    }
    colgroup.innerHTML = `<col style="width:30px;">` + ctRenderColgroup("hotel_pms_room_table_v1") + `<col style="width:28px;">`;

}

function rmBuildRoomCellHtml(key, r, isOccupied){

    switch(key){
        case "status": return renderStatusBadge(isOccupied ? "OCCUPIED" : r.status, { size: 18 });
        case "room_number": return rmEscapeHtml(r.room_number);
        case "room_type": return rmEscapeHtml(r.room_type || "");
        case "floor": return r.floor ?? "";
        case "status_label": return rmEscapeHtml(isOccupied ? "Occupied" : (r.status || "-").replace(/_/g, " "));
        default: return "";
    }

}