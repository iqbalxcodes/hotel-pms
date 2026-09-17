// ======================================================
// roomTraces.js
// Kategori/subtype trace + render kolom Traces (col 3).
// Instruction disimpan sebagai "Subtype: comment" (schema
// traces gak punya kolom subtype/comment terpisah).
// State & wiring (fetch/render call) ada di roomManagement.js.
// ======================================================

const ROOM_TRACE_CATEGORIES = {
    HOUSEKEEPING: ["Special cleaning request", "Deep cleaning", "Inspection required", "Linen request", "Minibar", "Lost & found"],
    FRONT_OFFICE: ["Guest request", "Early check-in", "Late check-out", "VIP", "Special occasion", "Room move", "Do-not-disturb"],
    MAINTENANCE: ["Broken light", "AC issue", "Plumbing", "TV", "Furniture"],
    MANAGEMENT: ["Internal note", "Follow-up", "Important information"]
};

const ROOM_TRACE_DEPT_LABEL = {
    HOUSEKEEPING: "Housekeeping",
    FRONT_OFFICE: "Reception",
    MAINTENANCE: "Maintenance",
    MANAGEMENT: "Other"
};

let rmTraceFilter = "all";

function rmTracePopulateSubtypes(){

    const deptSel = document.getElementById("rmTraceDeptInput");
    const subSel = document.getElementById("rmTraceSubtypeInput");
    if(!deptSel || !subSel) return;

    const list = ROOM_TRACE_CATEGORIES[deptSel.value] || [];
    subSel.innerHTML = list.map(s => `<option value="${s}">${s}</option>`).join("");

}

function rmTraceFormatDue(value){

    if(!value) return "No due date";

    const d = new Date(value);
    if(isNaN(d)) return "-";

    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();

    const time = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

    if(isToday) return `Today ${time}`;

    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${time}`;

}

// roomLookup: Map room_id -> room object (dari rmAllRooms cache)
function rmRenderTracesList(traces, roomLookup, onRoomClick, onStatusChange){

    const listEl = document.getElementById("rmTracesList");
    const countEl = document.getElementById("rmTracesCount");
    if(!listEl) return;

    let filtered = traces;

    if(rmTraceFilter === "open"){
        filtered = traces.filter(t => t.status === "OPEN");
    } else if(rmTraceFilter === "urgent"){
        filtered = traces.filter(t => t.priority === "URGENT");
    }

    if(countEl) countEl.textContent = `${filtered.length} active`;

    if(filtered.length === 0){
        listEl.innerHTML = `<div class="rm-empty-note">No traces</div>`;
        return;
    }

    listEl.innerHTML = filtered.map(t => {

        const room = roomLookup.get(t.context_id);
        const roomLabel = room ? room.room_number : "-";
        const priorityClass = `priority-${(t.priority || "normal").toLowerCase()}`;
        const deptLabel = ROOM_TRACE_DEPT_LABEL[t.assigned_department] || t.assigned_department || "-";

        return `
            <div class="rm-trace-item ${priorityClass}" data-id="${t.id}">
                <div class="rm-trace-item-top">
                    <span class="rm-trace-room" data-room="${rmEscapeHtml(roomLabel)}">Room ${rmEscapeHtml(roomLabel)}</span>
                    <span class="rm-trace-dept">${rmEscapeHtml(deptLabel)}</span>
                </div>
                <div class="rm-trace-instruction">${rmEscapeHtml(t.instruction || "")}</div>
                <div class="rm-trace-item-bottom">
                    <span class="rm-trace-due">${rmTraceFormatDue(t.due_at)}</span>
                    <select class="rm-trace-status-select" data-id="${t.id}">
                        ${["OPEN","ACKNOWLEDGED","IN_PROGRESS","COMPLETED"].map(s =>
                            `<option value="${s}" ${s === t.status ? "selected" : ""}>${s.replace(/_/g," ")}</option>`
                        ).join("")}
                    </select>
                </div>
            </div>
        `;

    }).join("");

    listEl.querySelectorAll(".rm-trace-room").forEach(el => {
        el.addEventListener("click", () => onRoomClick(el.dataset.room));
    });

    listEl.querySelectorAll(".rm-trace-status-select").forEach(sel => {
        sel.addEventListener("change", () => onStatusChange(sel.dataset.id, sel.value));
    });

}

function rmSetTraceFilter(filter, traces, roomLookup, onRoomClick, onStatusChange){

    rmTraceFilter = filter;

    document.querySelectorAll(".rm-trace-filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    rmRenderTracesList(traces, roomLookup, onRoomClick, onStatusChange);

}