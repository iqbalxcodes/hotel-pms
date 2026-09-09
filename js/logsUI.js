// ======================================================
// logsUI.js
// ======================================================

const LOGS_CATEGORY_LABELS = {
    RESERVATION: "Reservation",
    GUEST: "Guest",
    ROOM: "Room",
    HOUSEKEEPING: "Housekeeping",
    MAINTENANCE: "Maintenance",
    FOLIO: "Folio",
    FINANCE: "Finance",
    SECURITY: "Security",
    AUTH: "Auth",
    SYSTEM: "System"
};

function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function formatDateTimeDisplay(value){

    if(!value) return "-";

    const d = new Date(value);
    if(isNaN(d)) return value;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hour}:${minute}`;

}

// Compact "field: old → new" summary built from the two jsonb diff
// columns. If both are null (redacted, or a DELETE/CREATE row with
// nothing to diff), show a neutral placeholder instead.
function buildDiffSummary(row){

    if(row.category === "SECURITY" && row.old_values === null && row.new_values === null && row.action !== "CREATE" && row.action !== "DELETE"){
        return `<span class="logs-redacted">redacted</span>`;
    }

    const oldV = row.old_values || {};
    const newV = row.new_values || {};

    const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);

    if(keys.size === 0) return "-";

    const parts = [...keys].slice(0, 6).map(k => {

        const ov = oldV[k];
        const nv = newV[k];

        if(ov === undefined) return `<b>${escapeHtml(k)}</b>: ${escapeHtml(String(nv))}`;
        if(nv === undefined) return `<b>${escapeHtml(k)}</b>: removed`;

        return `<b>${escapeHtml(k)}</b>: ${escapeHtml(String(ov))} → ${escapeHtml(String(nv))}`;

    });

    const extra = keys.size > 6 ? ` (+${keys.size - 6} more)` : "";

    return parts.join(", ") + extra;

}

function renderLogRows(rows){

    const tbody = document.getElementById("logsTable");
    tbody.innerHTML = "";

    if(rows.length === 0){
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#888;">No activity found</td></tr>`;
        return;
    }

    rows.forEach(row => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatDateTimeDisplay(row.created_at)}</td>
            <td><span class="logs-category-badge logs-cat-${row.category.toLowerCase()}">${LOGS_CATEGORY_LABELS[row.category] || row.category}</span></td>
            <td>${escapeHtml(row.action)}</td>
            <td>${escapeHtml(row.entity_type)}${row.entity_label ? " · " + escapeHtml(row.entity_label) : ""}</td>
            <td>${escapeHtml(row.actor_name || "system")}${row.actor_role ? ` <span class="logs-role-tag">${escapeHtml(row.actor_role)}</span>` : ""}</td>
            <td>${escapeHtml(row.description || "")}</td>
            <td class="logs-diff-cell">${buildDiffSummary(row)}</td>
            <td><input type="checkbox" class="log-checkbox" data-id="${row.id}"></td>
        `;

        tbody.appendChild(tr);

    });

    setupCheckbox();

}

function setupCheckbox(){
    document.querySelectorAll(".log-checkbox").forEach(box => {
        box.addEventListener("change", updateActionBar);
    });
}

function updateActionBar(){

    const selected = document.querySelectorAll(".log-checkbox:checked");

    const normalToolbar = document.getElementById("normalToolbar");
    const selectionToolbar = document.getElementById("selectionToolbar");
    const selectedCount = document.getElementById("selectedCount");

    if(selected.length > 0){
        normalToolbar.style.display = "none";
        selectionToolbar.style.display = "flex";
        selectedCount.innerText = `${selected.length} selected`;
    } else {
        normalToolbar.style.display = "block";
        selectionToolbar.style.display = "none";
    }

}

function hideActionBar(){
    document.getElementById("normalToolbar").style.display = "block";
    document.getElementById("selectionToolbar").style.display = "none";
    document.getElementById("selectedCount").innerText = "0 selected";
}

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

function showMessage(text, type = "info"){

    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;

    contextArea.innerHTML = `<span class="status-msg-${type}">${escapeHtml(text)}</span>`;

    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => { contextArea.innerHTML = ""; }, 4000);

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

    document.getElementById("confirmYesBtn").onclick = () => { contextArea.innerHTML = ""; onConfirm(); };
    document.getElementById("confirmNoBtn").onclick = () => { contextArea.innerHTML = ""; if(onCancel) onCancel(); };

}

function renderPaginationBar(){

    const totalPages = getTotalPages();

    const info = document.getElementById("logsPageInfo");
    const nav = document.getElementById("logsPageNav");

    if(info){
        info.innerText = totalCount > 0
            ? `${totalCount} entries · Page ${currentPage}/${totalPages}`
            : "No activity";
    }

    if(nav){

        nav.innerHTML = "";

        if(totalPages > 1){

            const prevBtn = document.createElement("button");
            prevBtn.innerText = "‹ Prev";
            prevBtn.disabled = currentPage <= 1;
            prevBtn.onclick = async () => { currentPage--; await refreshTable(); };
            nav.appendChild(prevBtn);

            const nextBtn = document.createElement("button");
            nextBtn.innerText = "Next ›";
            nextBtn.disabled = currentPage >= totalPages;
            nextBtn.onclick = async () => { currentPage++; await refreshTable(); };
            nav.appendChild(nextBtn);

        }

    }

}