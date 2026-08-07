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

startClock();

function showAddReservation(){

    document
    .getElementById("addReservationPanel")
    .style.display = "block";


    document
    .getElementById("cancelAddBtn")
    .style.display = "inline-block";


    document
    .getElementById("addReservationBtn")
    .style.display = "none";

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
        document.getElementById(
            "modeSelect"
        );


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
        ? `${totalCount} reservations · Page ${currentPage}/${totalPages}`
        : "No reservations";

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