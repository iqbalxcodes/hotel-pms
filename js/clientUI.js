// ======================================================
// clientUI.js
// Semua fungsi render (DOM) untuk Client page.
// State & wiring ada di client.js.
// ======================================================

const CL_TYPE_LABELS = {
    GUEST: "Guest",
    COMPANY: "Company",
    TRAVEL_AGENCY: "Travel Agency",
    OTHER: "Other"
};

function clEscapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function clShowMessage(text, type = "info"){

    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;

    contextArea.innerHTML = `<span class="status-msg-${type}">${clEscapeHtml(text)}</span>`;

    clearTimeout(clShowMessage._timer);
    clShowMessage._timer = setTimeout(() => { contextArea.innerHTML = ""; }, 4000);

}

function clShowConfirm(message, onConfirm, onCancel){

    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;

    contextArea.innerHTML = `
        <span class="status-confirm">
            ${clEscapeHtml(message)}
            <button id="confirmYesBtn">Yes</button>
            <button id="confirmNoBtn">No</button>
        </span>
    `;

    document.getElementById("confirmYesBtn").onclick = () => { contextArea.innerHTML = ""; onConfirm(); };
    document.getElementById("confirmNoBtn").onclick = () => { contextArea.innerHTML = ""; if(onCancel) onCancel(); };

}


// ======================================================
// Column 1 — Allgemeine Info
// ======================================================

function clRenderOverviewStats(clients){

    const total = clients.length;
    const guest = clients.filter(c => c.client_type === "GUEST").length;
    const company = clients.filter(c => c.client_type === "COMPANY").length;
    const agency = clients.filter(c => c.client_type === "TRAVEL_AGENCY").length;
    const other = clients.filter(c => c.client_type === "OTHER").length;

    const el = document.getElementById("clOverviewStats");
    if(!el) return;

    el.innerHTML = `
        <div class="cl-stat"><span class="cl-stat-value">${total}</span><span class="cl-stat-label">Total Clients</span></div>
        <div class="cl-stat"><span class="cl-stat-value">${guest}</span><span class="cl-stat-label">Guests</span></div>
        <div class="cl-stat"><span class="cl-stat-value">${company}</span><span class="cl-stat-label">Companies</span></div>
        <div class="cl-stat"><span class="cl-stat-value">${agency}</span><span class="cl-stat-label">Travel Agencies</span></div>
        <div class="cl-stat"><span class="cl-stat-value">${other}</span><span class="cl-stat-label">Other</span></div>
    `;

}

function clRenderLoyaltyBreakdown(clients){

    const el = document.getElementById("clLoyaltyBreakdown");
    if(!el) return;

    const levels = ["VIP", "Gold", "Silver", "Standard"];
    const guests = clients.filter(c => c.client_type === "GUEST");

    if(guests.length === 0){
        el.innerHTML = `<div class="cl-empty-note">No guest clients</div>`;
        return;
    }

    el.innerHTML = levels.map(lvl => {
        const count = guests.filter(g => (g.loyalty_level || "Standard") === lvl).length;
        return `
            <div class="cl-mini-item">
                <div class="cl-mini-title">${lvl}</div>
                <div class="cl-mini-sub">${count} guest${count === 1 ? "" : "s"}</div>
            </div>
        `;
    }).join("");

}


// ======================================================
// Column 2 — Client List (ct engine)
// ======================================================

function clRenderClientTableHeader(){

    const thead = document.querySelector("#clClientTable thead tr");
    if(!thead) return;

    const state = clientTable.getState();

    thead.innerHTML = `
        <th style="width:30px;"></th>
        ${state.visibleOrder.map(k => ctRenderColHeader("hotel_pms_client_table_v1", k)).join("")}
        <th style="width:28px;"><button class="ct-icon-btn" onclick="ctOpenModifyPopup('hotel_pms_client_table_v1')" title="Modify Table">⚙</button></th>
    `;

    const tableEl = document.getElementById("clClientTable");
    let colgroup = tableEl.querySelector("colgroup");
    if(!colgroup){
        colgroup = document.createElement("colgroup");
        tableEl.prepend(colgroup);
    }
    colgroup.innerHTML = `<col style="width:30px;">` + ctRenderColgroup("hotel_pms_client_table_v1") + `<col style="width:28px;">`;

}

function clBuildClientCellHtml(key, c){

    switch(key){
        case "client_type": return renderStatusBadge(c.client_type, { size: 18, title: CL_TYPE_LABELS[c.client_type] || c.client_type });
        case "name": return clEscapeHtml(c.name || "");
        case "city": return clEscapeHtml(c.city || "");
        case "country": return clEscapeHtml(c.country || "");
        default: return "";
    }

}

function clRenderClientList(clients, selectedId, onClickRow){

    const tbody = document.getElementById("clClientListBody");
    if(!tbody) return;

    const visibleOrder = clientTable.getState().visibleOrder;

    if(clients.length === 0){
        tbody.innerHTML = `<tr><td colspan="${visibleOrder.length + 2}" class="cl-empty-note" style="padding:12px;">No clients found</td></tr>`;
        return;
    }

    tbody.innerHTML = clients.map(c => {

        const activeClass = c.id === selectedId ? "active" : "";

        const cells = visibleOrder.map(key =>
            `<td>${clBuildClientCellHtml(key, c)}</td>`
        ).join("");

        return `
            <tr class="cl-row ${activeClass}" data-id="${c.id}">
                <td><input type="checkbox" class="cl-client-checkbox" data-id="${c.id}" onclick="event.stopPropagation()"></td>
                ${cells}
                <td></td>
            </tr>
        `;

    }).join("");

    tbody.querySelectorAll(".cl-row").forEach(node => {
        node.addEventListener("click", () => onClickRow(Number(node.dataset.id)));
    });

    refreshStatusBadgeIcons();

}


// ======================================================
// Column 3 — Client Detail
// ======================================================

function clRenderEmptyDetail(){
    const el = document.getElementById("clDetailPane");
    if(!el) return;
    el.innerHTML = `<div class="cl-empty-note">Select a client from the list to view details</div>`;
}

function clRenderDetail(c){

    const el = document.getElementById("clDetailPane");
    if(!el) return;

    const isOrg = c.client_type === "COMPANY" || c.client_type === "TRAVEL_AGENCY";

    el.innerHTML = `
        <div class="cl-detail-header">
            <div>
                ${renderStatusBadge(c.client_type, { size: 26, title: CL_TYPE_LABELS[c.client_type] })}
                <span class="cl-detail-name">${clEscapeHtml(c.name || "")}</span>
                <span class="cl-detail-type">${clEscapeHtml(CL_TYPE_LABELS[c.client_type] || c.client_type)}</span>
            </div>
        </div>

        <div class="cl-detail-section">
            <h5>Contact Information</h5>
            <div class="cl-field-grid">
                <div class="cl-field"><label>${isOrg ? "Company Name" : "Name"}</label><div class="cl-field-value">${clEscapeHtml(c.name || "-")}</div></div>
                ${isOrg ? `<div class="cl-field"><label>Contact Person</label><div class="cl-field-value">${clEscapeHtml(c.contact_person || "-")}</div></div>` : ""}
                <div class="cl-field"><label>Email</label><div class="cl-field-value">${clEscapeHtml(c.email || "-")}</div></div>
                <div class="cl-field"><label>Phone</label><div class="cl-field-value">${clEscapeHtml(c.phone || "-")}</div></div>
                <div class="cl-field"><label>City</label><div class="cl-field-value">${clEscapeHtml(c.city || "-")}</div></div>
                <div class="cl-field"><label>Country</label><div class="cl-field-value">${clEscapeHtml(c.country || "-")}</div></div>
            </div>
        </div>

        ${c.client_type === "GUEST" ? `
        <div class="cl-detail-section">
            <h5>Loyalty</h5>
            <div class="cl-field-grid">
                <div class="cl-field"><label>Tier</label><div class="cl-field-value">${clEscapeHtml(c.loyalty_level || "Standard")}</div></div>
                <div class="cl-field"><label>Points</label><div class="cl-field-value">${c.loyalty_points ?? 0}</div></div>
            </div>
        </div>
        ` : ""}

        <div class="cl-detail-section">
            <h5>Reservation History</h5>
            <div class="cl-empty-note">Not connected to database yet</div>
        </div>
    `;

    refreshStatusBadgeIcons();

}