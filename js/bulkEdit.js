// ======================================================
// bulkEdit.js
// Bulk edit satu kolom untuk beberapa reservasi terpilih
// sekaligus, dipicu dari tombol "Edit Field" di
// #selectionToolbar (muncul saat ada checkbox tercentang).
//
// Hanya kolom dengan editable !== false (lihat
// tableConfig.js) yang muncul di dropdown, jadi kolom
// seperti confirmation_no, id, status, timestamp, dsb
// otomatis tidak bisa dibulk-edit lewat sini.
// ======================================================


// ------------------------------------------------------
// Helper: daftar kolom yang boleh di-bulk-edit, urutannya
// mengikuti RESERVATION_COLUMNS (sama seperti urutan
// header tabel), bukan daftar terpisah.
// ------------------------------------------------------

function getBulkEditableColumns(){

    return RESERVATION_COLUMNS.filter(
        col => col.editable !== false
    );

}


// ------------------------------------------------------
// Buka / tutup popover
// ------------------------------------------------------

function openBulkEditPopover(){

    const selected = document.querySelectorAll(".reservation-checkbox:checked");

    if(selected.length === 0){

        showMessage("No reservation selected", "error");
        return;

    }

    const select = document.getElementById("bulkEditColumn");
    const applyBtn = document.getElementById("bulkEditApplyBtn");

    if(!select) return;

    select.innerHTML = "";

    getBulkEditableColumns().forEach(col => {

        const opt = document.createElement("option");
        opt.value = col.key;
        opt.innerText = col.label;

        select.appendChild(opt);

    });

    if(applyBtn){

        applyBtn.innerText = `Apply to ${selected.length} reservation${selected.length > 1 ? "s" : ""}`;

    }

    renderBulkEditValueInput();

    const popover = document.getElementById("bulkEditPopover");

    if(popover){

        popover.style.display = "block";

    }

}

function closeBulkEditPopover(){

    const popover = document.getElementById("bulkEditPopover");

    if(popover){

        popover.style.display = "none";

    }

}


// ------------------------------------------------------
// Render input value sesuai tipe kolom yang dipilih
// ------------------------------------------------------

function renderBulkEditValueInput(){

    const select = document.getElementById("bulkEditColumn");
    const container = document.getElementById("bulkEditValueContainer");

    if(!select || !container) return;

    const colDef = COLUMN_MAP[select.value];

    if(!colDef) return;

    if(colDef.type === "boolean"){

        container.innerHTML = `
            <select id="bulkEditValueInput">
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
        `;

    }
    else if(colDef.type === "date"){

        container.innerHTML = `<input type="date" id="bulkEditValueInput">`;

    }
    else if(colDef.type === "money"){

        container.innerHTML = `<input type="number" step="0.01" id="bulkEditValueInput" placeholder="0.00">`;

    }
    else {

        container.innerHTML = `<input type="text" id="bulkEditValueInput" placeholder="Value to apply">`;

    }

}


// ------------------------------------------------------
// Apply: update kolom terpilih untuk semua baris tercentang
// (pola sama seperti performStatusUpdate di reservation.js,
// bedanya kolom & value-nya dinamis)
// ------------------------------------------------------

async function applyBulkEdit(){

    const columnSelect = document.getElementById("bulkEditColumn");
    const valueInput = document.getElementById("bulkEditValueInput");

    if(!columnSelect || !valueInput) return;

    const column = columnSelect.value;
    const colDef = COLUMN_MAP[column];

    if(!colDef || colDef.editable === false){

        showMessage("Column is not editable", "error");
        return;

    }

    let value = valueInput.value;

    if(colDef.type === "money"){

        value = value === "" ? null : Number(value);

    }
    else if(colDef.type === "boolean"){

        value = value === "true";

    }
    else {

        value = value === "" ? null : value;

    }

    const ids = [
        ...document.querySelectorAll(".reservation-checkbox:checked")
    ].map(el => Number(el.dataset.id));

    if(ids.length === 0){

        showMessage("No reservation selected", "error");
        closeBulkEditPopover();
        return;

    }

    const { error } = await supabaseClient
        .from("reservation")
        .update({ [column]: value })
        .in("id", ids);

    if(error){

        console.error(error);
        showMessage("Failed to update field", "error");
        return;

    }

    showMessage(
        `${colDef.label} updated for ${ids.length} reservation${ids.length > 1 ? "s" : ""}`,
        "success"
    );

    closeBulkEditPopover();

    await refreshTable();
    hideActionBar();

}