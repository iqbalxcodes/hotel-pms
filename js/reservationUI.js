// ======================================================
// reservationUI.js
// ======================================================

function setupCheckbox(){

    const checkboxes = document.querySelectorAll(
        ".reservation-checkbox"
    );


    checkboxes.forEach(box => {

        box.addEventListener(
            "change",
            updateActionBar
        );

    });

}

function updateActionBar(){

    const selected =
        document.querySelectorAll(
            ".reservation-checkbox:checked"
        );

    const all =
    document.querySelectorAll(
        ".reservation-checkbox"
    );


    const selectAll =
        document.getElementById(
            "selectAll"
        );


    if(selectAll){

        selectAll.checked =
            selected.length === all.length
            && all.length > 0;

    }


    const normalToolbar =
        document.getElementById(
            "normalToolbar"
        );

    const selectionToolbar =
    document.getElementById(
        "selectionToolbar"
    );

    const selectedCount =
        document.getElementById(
            "selectedCount"
        );


    if(selected.length > 0){

        normalToolbar.style.display = "none";

        selectionToolbar.style.display = "block";

        selectedCount.innerText =
            `${selected.length} selected`;

    }
    else{

        normalToolbar.style.display = "block";

        selectionToolbar.style.display = "none";

    }

}

function enableEdit(column, inputType = "text") {

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

    const header =
        document.getElementById(`${column}Header`);

    header.innerHTML = `
        ${headerTitle(column)}

        <button onclick="saveEdit('${column}')">
            ✓
        </button>

        <button onclick="cancelEdit('${column}')">
            ✕
        </button>
    `;

}

async function saveEdit(column){

    const inputs =
        document.querySelectorAll(
            `.edit-input[data-column="${column}"]`
        );

    const dbColumn = {

        guest: "guest_name",
        room: "room_number",
        arrival: "arrival_date",
        departure: "departure_date"

    };

    for(const input of inputs){

        const { error } =
            await supabaseClient
            .from("reservation")
            .update({

                [dbColumn[column]]: input.value

            })
            .eq(
                "id",
                Number(input.dataset.id)
            );

        if(error){

            console.error(error);
            alert("Failed");
            return;

        }

    }

    showMessage("Update successful", "success");
    await loadReservations();
    hideActionBar();

}

function resetHeader(column){

    const inputType =
        column === "arrival" || column === "departure"
        ? "date"
        : "text";


    document.getElementById(`${column}Header`).innerHTML = `

        ${headerTitle(column)} ↕

        <button onclick="event.stopPropagation(); enableEdit('${column}','${inputType}')">
            ✏️
        </button>

    `;


    document.getElementById(`${column}Header`)
        .setAttribute(
            "onclick",
            `sortTable('${column}')`
        );

}

function headerTitle(column){

    const titles = {

        guest: "Guest",
        room: "Room",
        arrival: "Arrival",
        departure: "Departure"

    };

    return titles[column];

}

async function cancelEdit(column){

    await refreshTable();

}

function hideActionBar(){

    document.getElementById("normalToolbar").style.display = "block";

    document.getElementById("selectionToolbar").style.display = "none";

    document.getElementById("selectedCount").innerText =
        "0 selected";

}

function enableDateEdit(){

    const button =
        document.getElementById(
            "currentDate"
        );


    const today =
        new Date()
        .toISOString()
        .split("T")[0];


    button.innerHTML = `

        <input
            type="date"
            id="datePicker"
            value="${today}"
        >

    `;


}

function startClock(){

    const clock =
        document.getElementById("clock");

    if(!clock) return;

    function updateClock(){

        const now = new Date();


        clock.innerText =
            now.toLocaleString(
                "de-DE",
                {
                    day:"2-digit",
                    month:"2-digit",
                    year:"numeric",
                    hour:"2-digit",
                    minute:"2-digit",
                    second:"2-digit"
                }
            );
            
        }
        
        
    updateClock();
    
    setInterval(
        updateClock,
        1000
    );
    
}

function hideAddReservation(){

    document
    .getElementById("addReservationPanel")
    .style.display = "none";


    document
    .getElementById("reservationForm")
    .reset();


    document
    .getElementById("cancelAddBtn")
    .style.display = "none";


    document
    .getElementById("addReservationBtn")
    .style.display = "inline-block";

}

function showDevelopmentAlert(feature){

    showDevMessage(feature);

}

function showSearch(){

    document.getElementById(
        "searchContainer"
    ).style.display = "inline-block";


    document.getElementById(
        "searchInput"
    ).focus();

}



function hideSearch(){

    document.getElementById(
        "searchContainer"
    ).style.display = "none";


    document.getElementById(
        "searchInput"
    ).value = "";


    activeSearchKeyword = "";
    currentPage = 1;

    refreshTable();

}


function cancelAddReservation(){

    document
        .getElementById("reservationForm")
        .reset();

    hideAddReservation();

}

function toggleAllCheckbox(master){

    const checkboxes =
        document.querySelectorAll(
            ".reservation-checkbox"
        );


    checkboxes.forEach(box => {

        box.checked = master.checked;

    });


    updateActionBar();

}

function showRoomList(){

    showDevelopmentAlert("Room");

}

function showClientList(){

    showDevelopmentAlert("Client");

}

function showBilling(){

    showDevelopmentAlert("Billing");

}

function updateDropdownText(counts){


    const select =
        document.getElementById("modeSelect");

        if(!select) return;


    select.options[0].text =
        `Arrival (${counts.arrival})`;


    select.options[1].text =
        `Departure (${counts.departure})`;


    select.options[2].text =
        `In House (${counts.inhouse})`;


    select.options[3].text =
        `Pending (${counts.pending})`;


    select.options[4].text =
        `Cancelled (${counts.cancelled})`;

    select.options[5].text =
        `No Show (${counts.noshow})`;

}

function renderPaginationBar(){

    const info = document.getElementById("paginationInfo");
    const nav = document.getElementById("paginationNav");

    if(!info || !nav){
        return;
    }

    const totalPages = getTotalPages();

    renderPaginationInfoDisplay(info);

    info.onmouseenter = () => renderPaginationInfoEditor(info);
    info.onmouseleave = () => renderPaginationInfoDisplay(info);

    nav.innerHTML = "";

    // Kalau cuma 1 halaman, tombol Prev/Next gak perlu ditampilkan
    if(totalPages > 1){

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

}

function renderPaginationInfoDisplay(info){

    const totalPages = getTotalPages();

    info.innerHTML =
        totalCount > 0
        ? `${totalCount} reservations · Page ${currentPage}/${totalPages}`
        : "No reservations";

}

function renderPaginationInfoEditor(info){

    if(totalCount === 0){

        return;

    }

    const currentValue =
        rowsPerPage === "all" ? totalCount : rowsPerPage;

    info.innerHTML = `
        <span class="rows-per-page-popover" onclick="event.stopPropagation()">
            Reservations per Page:
            <input
                type="number"
                id="rowsPerPageInput"
                min="1"
                value="${currentValue}">
            <button id="rowsPerPageApplyBtn">Apply</button>
        </span>
    `;

    const input = document.getElementById("rowsPerPageInput");
    const applyBtn = document.getElementById("rowsPerPageApplyBtn");

    applyBtn.onclick = () => applyCustomRowsPerPage();

    input.addEventListener("keydown", (e) => {

        if(e.key === "Enter"){

            applyCustomRowsPerPage();

        }

    });

    input.focus();
    input.select();

}

async function applyCustomRowsPerPage(){

    const input = document.getElementById("rowsPerPageInput");

    const value = parseInt(input.value, 10);

    if(!value || value < 1){

        showMessage("Jumlah baris harus angka lebih dari 0", "error");
        return;

    }

    rowsPerPage = value;
    userSetRowsPerPage = true;
    currentPage = 1;

    await refreshTable();

}

function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function showMessage(text, type = "info"){

    const contextArea = document.getElementById("contextArea");
    if(!contextArea) return;

    contextArea.innerHTML =
        `<span class="status-msg-${type}">${escapeHtml(text)}</span>`;

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

function createNewReservation(){

    window.location.href =
        "reservation-detail.html?new=true";

}

document.addEventListener(
    "DOMContentLoaded",
    startClock
);
