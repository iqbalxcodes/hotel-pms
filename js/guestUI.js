// ======================================================
// guestUI.js
// ======================================================

const GUEST_COLUMN_LABELS = {

    salutation: "Sal.",
    first_name: "First Name",
    last_name: "Last Name",
    email: "Email",
    phone: "Phone",
    city: "City",
    country: "Country",
    loyalty_level: "Loyalty",
    loyalty_points: "Points"

};


// ======================================================
// Checkbox / Selection
// ======================================================

function setupCheckbox(){

    const checkboxes = document.querySelectorAll(".guest-checkbox");

    checkboxes.forEach(box => {

        box.addEventListener("change", updateActionBar);

    });

}

function updateActionBar(){

    const selected = document.querySelectorAll(".guest-checkbox:checked");
    const all = document.querySelectorAll(".guest-checkbox");

    const selectAll = document.getElementById("selectAll");

    if(selectAll){

        selectAll.checked =
            selected.length === all.length && all.length > 0;

    }

    const normalToolbar = document.getElementById("normalToolbar");
    const selectionToolbar = document.getElementById("selectionToolbar");
    const selectedCount = document.getElementById("selectedCount");

    if(selected.length > 0){

        normalToolbar.style.display = "none";
        selectionToolbar.style.display = "block";

        selectedCount.innerText = `${selected.length} selected`;

    }
    else{

        normalToolbar.style.display = "block";
        selectionToolbar.style.display = "none";

    }

}

function toggleAllCheckbox(master){

    const checkboxes = document.querySelectorAll(".guest-checkbox");

    checkboxes.forEach(box => {

        box.checked = master.checked;

    });

    updateActionBar();

}

function hideActionBar(){

    document.getElementById("normalToolbar").style.display = "block";
    document.getElementById("selectionToolbar").style.display = "none";
    document.getElementById("selectedCount").innerText = "0 selected";

}


// ======================================================
// Inline Column Edit
// ======================================================

function enableEdit(column, inputType = "text"){

    const cells = document.querySelectorAll(`.${column}-cell`);

    cells.forEach(cell => {

        const value = cell.innerText;
        const id = cell.dataset.id;

        cell.innerHTML = `
            <input
                type="${inputType}"
                class="edit-input"
                data-column="${column}"
                data-id="${id}"
                value="${value}"
            >
        `;

    });

    const header = document.getElementById(`${column}Header`);

    header.innerHTML = `
        ${GUEST_COLUMN_LABELS[column]}

        <button onclick="saveEdit('${column}')">✓</button>
        <button onclick="cancelEdit('${column}')">✕</button>
    `;

}

async function saveEdit(column){

    const inputs =
        document.querySelectorAll(`.edit-input[data-column="${column}"]`);

    for(const input of inputs){

        let value = input.value;

        if(column === "loyalty_points"){

            value = value === "" ? 0 : Number(value);

        }

        const { error } =
            await supabaseClient
            .from("guests")
            .update({ [column]: value })
            .eq("id", Number(input.dataset.id));

        if(error){

            console.error(error);
            showMessage("Failed to save changes", "error");
            return;

        }

    }

    showMessage("Update successful", "success");

    await refreshTable();
    hideActionBar();

}

async function cancelEdit(column){

    await refreshTable();

}

function resetHeader(column){

    const inputType =
        column === "loyalty_points" ? "number"
        : column === "email" ? "email"
        : "text";

    document.getElementById(`${column}Header`).innerHTML = `

        ${GUEST_COLUMN_LABELS[column]} ↕

        <button onclick="event.stopPropagation(); enableEdit('${column}','${inputType}')">
            ✏️
        </button>

    `;

    document.getElementById(`${column}Header`)
        .setAttribute("onclick", `sortTable('${column}')`);

}


// ======================================================
// Add Guest Panel
// ======================================================

function showAddGuest(){

    document.getElementById("addGuestPanel").style.display = "block";
    document.getElementById("cancelAddGuestBtn").style.display = "inline-block";
    document.getElementById("addGuestBtn").style.display = "none";

}

function hideAddGuest(){

    document.getElementById("addGuestPanel").style.display = "none";
    document.getElementById("guestForm").reset();
    document.getElementById("cancelAddGuestBtn").style.display = "none";
    document.getElementById("addGuestBtn").style.display = "inline-block";

}


// ======================================================
// Search
// ======================================================

function showSearch(){

    document.getElementById("searchContainer").style.display = "inline-block";
    document.getElementById("searchInput").focus();

}

function hideSearch(){

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("searchInput").value = "";

    activeSearchKeyword = "";
    currentPage = 1;

    refreshTable();

}


// ======================================================
// Clock
// ======================================================

function startClock(){

    const clock = document.getElementById("clock");

    function updateClock(){

        const now = new Date();

        clock.innerText =
            now.toLocaleString("de-DE", {
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


// ======================================================
// Status Bar: Message / Confirm / Pagination
// ======================================================

function escapeHtml(str){

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

function showMessage(text, type = "info"){

    const contextArea = document.getElementById("contextArea");

    if(!contextArea){
        return;
    }

    contextArea.innerHTML =
        `<span class="status-msg-${type}">${escapeHtml(text)}</span>`;

    clearTimeout(showMessage._timer);

    showMessage._timer = setTimeout(() => {
        contextArea.innerHTML = "";
    }, 4000);

}

function showConfirm(message, onConfirm, onCancel){

    const contextArea = document.getElementById("contextArea");

    if(!contextArea){
        return;
    }

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
        if(onCancel){ onCancel(); }
    };

}

function showDevMessage(feature){

    showMessage(`${feature} is still in development`, "info");

}

function renderPaginationBar(){

    const info = document.getElementById("paginationInfo");
    const nav = document.getElementById("paginationNav");

    if(!info || !nav){
        return;
    }

    const totalPages = getTotalPages();

    info.innerText =
        totalCount > 0
        ? `${totalCount} clients · Page ${currentPage}/${totalPages}`
        : "No clients";

    nav.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.innerText = "‹ Prev";
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = async () => {
        currentPage--;
        await refreshTable();
    };
    nav.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ›";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = async () => {
        currentPage++;
        await refreshTable();
    };
    nav.appendChild(nextBtn);

}