// ======================================================
// folio.js
// Modul Folio yang reusable. Halaman lain (Reservation,
// Cashiering, Guest, Invoice) cukup panggil:
//
//   openFolio({ containerId: "folioMount", reservationId: 123 })
//   openFolio({ containerId: "folioMount", folioId: 45 })
//
// Folio tidak peduli siapa yang membukanya. Semua fungsi
// di file ini di-prefix "folio" supaya tidak bentrok dengan
// fungsi edit-mode reservasi/halaman lain yang sudah ada
// (mis. enterEditMode() milik reservationDetail.js).
// ======================================================

const FolioState = {
    containerId: null,
    reservationId: null,
    folioId: null,
    backAction: null,      // string JS, mis. "toggleFolioMode()" — dipanggil saat tombol ← diklik
    onChange: null,        // optional callback(folio) dipanggil tiap kali data folio berubah (buat sinkronisasi UI pemanggil)

    folio: null,
    items: [],
    payments: [],
    address: null,
    activity: [],

    mode: "normal",         // normal | edit | history
    selectedIds: new Set(),
    toolbarAction: null,    // null | move | split | discount

    loading: false
};


// ======================================================
// Entry point
// ======================================================

async function openFolio({ containerId, reservationId = null, folioId = null, backAction = null, onChange = null }) {

    FolioState.containerId = containerId;
    FolioState.reservationId = reservationId;
    FolioState.folioId = folioId;
    FolioState.backAction = backAction;
    FolioState.onChange = onChange;
    FolioState.mode = "normal";
    FolioState.selectedIds = new Set();
    FolioState.toolbarAction = null;

    await folioReload();

}

async function folioReload() {

    try {

        FolioState.loading = true;

        const folio = await FolioService.getOrCreateFolio(FolioState.reservationId, FolioState.folioId);

        FolioState.folio = folio;
        FolioState.folioId = folio.id;
        FolioState.reservationId = folio.reservation_id;

        const [items, payments, address] = await Promise.all([
            FolioService.getItems(folio.id),
            FolioService.getPayments(folio.id),
            FolioService.getAddress(folio.id)
        ]);

        FolioState.items = items;
        FolioState.payments = payments;
        FolioState.address = address;

        if (typeof FolioState.onChange === "function") {
            FolioState.onChange(folio);
        }

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal memuat folio", "error");

    } finally {

        FolioState.loading = false;
        FolioUI.render(FolioState);

    }

}

async function folioLoadActivity() {

    FolioState.activity = await FolioService.getActivity(FolioState.folioId);

}


// ======================================================
// Mode: History / Edit (mutually exclusive)
// ======================================================

async function folioToggleHistory() {

    if (FolioState.mode === "history") {

        FolioState.mode = "normal";
        FolioUI.render(FolioState);
        return;

    }

    FolioState.mode = "history";
    await folioLoadActivity();
    FolioUI.render(FolioState);

}

function folioEnterEdit() {

    FolioState.mode = "edit";
    FolioState.selectedIds = new Set();
    FolioState.toolbarAction = null;
    FolioUI.render(FolioState);

}

function folioCancelEdit() {

    FolioState.mode = "normal";
    FolioUI.render(FolioState);

}

async function folioSaveEdit() {

    const draft = FolioUI.collectEditDraft();

    try {

        await FolioService.saveAddress(FolioState.folioId, draft.address);

        for (const item of draft.items) {

            await FolioService.updateItem(item.id, {
                service_name: item.service_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                discount_percent: item.discount_percent,
                discount_amount: item.discount_amount || 0
            }, { silent: true });

        }

        FolioState.mode = "normal";

        folioShowMessage("Folio saved", "success");

        await folioReload();

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal menyimpan folio", "error");

    }

}


// ======================================================
// Selection (checkbox mode)
// ======================================================

function folioToggleSelect(itemId) {

    if (FolioState.selectedIds.has(itemId)) {

        FolioState.selectedIds.delete(itemId);

    } else {

        FolioState.selectedIds.add(itemId);

    }

    FolioState.toolbarAction = null;

    FolioUI.render(FolioState);

}

function folioClearSelection() {

    FolioState.selectedIds = new Set();
    FolioState.toolbarAction = null;

    FolioUI.render(FolioState);

}

function folioGetSelectedItems() {

    return FolioState.items.filter(i => FolioState.selectedIds.has(i.id));

}


// ======================================================
// Selection toolbar actions
// ======================================================

function folioShowAction(action) {

    FolioState.toolbarAction = action;
    FolioUI.render(FolioState);

}

function folioCancelAction() {

    FolioState.toolbarAction = null;
    FolioUI.render(FolioState);

}

async function folioConfirmDelete() {

    const items = folioGetSelectedItems();

    if (items.length === 0) return;

    showConfirm(
        `Delete ${items.length} selected item(s)?`,
        async () => {

            try {

                for (const item of items) {
                    await FolioService.deleteItem(item);
                }

                folioClearSelection();
                await folioReload();

                folioShowMessage("Item(s) deleted", "success");

            } catch (e) {

                console.error(e);
                folioShowMessage("Gagal menghapus item", "error");

            }

        }
    );

}

async function folioResolveTargetFolio(reservationInputId, folioSelectId) {

    const reservationInput = document.getElementById(reservationInputId);
    const folioSelect = document.getElementById(folioSelectId);

    const confirmationNo = reservationInput ? reservationInput.value.trim() : "";

    let targetReservationId = FolioState.reservationId;

    if (confirmationNo) {

        const found = await FolioService.findReservationByConfirmation(confirmationNo);

        if (!found) {

            folioShowMessage("Reservation not found", "error");
            return null;

        }

        targetReservationId = found.id;

    }

    const folioNumber = Number(folioSelect.value);

    const folios = await FolioService.getFoliosByReservation(targetReservationId);
    let target = folios.find(f => f.folio_number === folioNumber);

    if (!target) {

        // folio tujuan belum ada -> buat otomatis (mis. Folio 2 baru)
        target = await FolioService.createNextFolio(targetReservationId);

    }

    return target;

}

async function folioSubmitMove() {

    const items = folioGetSelectedItems();
    if (items.length === 0) return;

    try {

        const target = await folioResolveTargetFolio("folioMoveReservation", "folioMoveFolioSelect");
        if (!target) return;

        if (target.id === FolioState.folioId) {

            folioShowMessage("Target folio sama dengan folio saat ini", "error");
            return;

        }

        await FolioService.moveItems(items, target.id, target.name || `Folio ${target.folio_number}`);

        folioClearSelection();
        await folioReload();

        folioShowMessage("Item(s) moved", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal memindahkan item", "error");

    }

}

async function folioSubmitSplit() {

    const items = folioGetSelectedItems();
    if (items.length === 0) return;

    const basisType = document.getElementById("folioSplitBasisType").value; // percentage | price
    const basisValue = Number(document.getElementById("folioSplitBasisValue").value);

    if (!basisValue || basisValue <= 0) {

        folioShowMessage("Isi nilai split terlebih dahulu", "error");
        return;

    }

    try {

        const target = await folioResolveTargetFolio("folioSplitReservation", "folioSplitFolioSelect");
        if (!target) return;

        await FolioService.splitItems(items, { type: basisType, value: basisValue }, target.id);

        folioClearSelection();
        await folioReload();

        folioShowMessage("Item(s) split", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal split item", "error");

    }

}

async function folioSubmitDiscount() {

    const items = folioGetSelectedItems();
    if (items.length === 0) return;

    const basisType = document.getElementById("folioDiscountBasisType").value; // percentage | price
    const basisValue = Number(document.getElementById("folioDiscountBasisValue").value);

    if (!basisValue || basisValue <= 0) {

        folioShowMessage("Isi nilai discount terlebih dahulu", "error");
        return;

    }

    try {

        await FolioService.applyDiscount(items, { type: basisType, value: basisValue });

        folioClearSelection();
        await folioReload();

        folioShowMessage("Discount applied", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal apply discount", "error");

    }

}


// ======================================================
// Add service row (di bawah tabel)
// ======================================================

function folioServiceInputKeyup(inputEl) {

    const keyword = inputEl.value;
    const results = FolioService.searchServiceCatalog(keyword);

    FolioUI.renderServiceSuggestions(results);

}

function folioSelectServiceSuggestion(code) {

    const service = FolioService.SERVICE_CATALOG.find(s => s.code === code);
    if (!service) return;

    const input = document.getElementById("folioServiceInput");
    input.value = service.name;
    input.dataset.selectedCode = service.code;

    FolioUI.renderServiceSuggestions([]);

}

async function folioApplyNewService() {

    const input = document.getElementById("folioServiceInput");
    const name = input.value.trim();

    if (!name) return;

    const code = input.dataset.selectedCode || null;
    const catalogEntry = FolioService.SERVICE_CATALOG.find(s => s.code === code)
        || FolioService.SERVICE_CATALOG.find(s => s.name.toLowerCase() === name.toLowerCase());

    try {

        await FolioService.addItem(FolioState.folioId, {
            service_code: catalogEntry ? catalogEntry.code : null,
            service_name: catalogEntry ? catalogEntry.name : name,
            quantity: 1,
            unit_price: catalogEntry ? catalogEntry.unit_price : 0,
            tax_rate: catalogEntry ? catalogEntry.tax_rate : 0
        });

        input.value = "";
        delete input.dataset.selectedCode;

        // sesuai spec: klik Apply -> folio masuk edit mode supaya
        // qty/price/tax item baru bisa langsung disesuaikan
        FolioState.mode = "edit";

        await folioReload();

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal menambah service", "error");

    }

}


// ======================================================
// Payment
// ======================================================

async function folioTakePayment() {

    const balance = FolioService.calcBalance(FolioState.items, FolioState.payments);

    if (balance === 0) {

        folioShowMessage("Folio sudah settled", "info");
        return;

    }

    const amountStr = prompt(
        `Jumlah pembayaran (Balance saat ini: ${folioFormatCurrency(balance)}):`,
        Math.abs(balance).toFixed(2)
    );

    if (!amountStr) return;

    const amount = Number(amountStr);

    if (!amount || amount <= 0) {

        folioShowMessage("Jumlah pembayaran tidak valid", "error");
        return;

    }

    try {

        await FolioService.addPayment(FolioState.folioId, amount, "Cash");
        await folioReload();

        folioShowMessage("Payment recorded", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal mencatat pembayaran", "error");

    }

}


// ======================================================
// Checkout guard — dipanggil dari halaman pemanggil
// (reservationDetail.js) sebelum status diubah ke CHECKED_OUT
// ======================================================

function folioHasOutstandingBalance() {

    const balance = FolioService.calcBalance(FolioState.items, FolioState.payments);
    return balance < 0;

}


// ======================================================
// Misc helpers (fallback kalau halaman pemanggil belum
// punya showMessage/showConfirm sendiri)
// ======================================================

function folioShowMessage(text, type = "info") {

    if (typeof showMessage === "function") {

        showMessage(text, type);
        return;

    }

    console.log(`[Folio:${type}]`, text);

}

function folioFormatCurrency(value) {

    if (value === null || value === undefined || value === "") return "-";

    return Number(value).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " €";

}