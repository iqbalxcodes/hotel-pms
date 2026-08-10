// ======================================================
// folio.js
// Modul Folio yang reusable. Halaman lain (Reservation,
// Cashiering, Guest, Invoice) cukup panggil:
//
//   openFolio({ containerId: "folioMount", reservationId: 123 })
//   openFolio({ containerId: "folioMount", folioId: 45 })
//
// PENTING: state SEKARANG per-container (FolioInstances),
// bukan singleton lagi -> mendukung banyak folio kebuka
// bersamaan (billing1/2/3) tanpa saling timpa.
// ======================================================

const FolioInstances = {};

function folioGetState(containerId) {
    return FolioInstances[containerId] || null;
}


// ======================================================
// Entry point
// ======================================================

async function openFolio({ containerId, reservationId = null, folioId = null, backAction = null, onChange = null }) {

    FolioInstances[containerId] = {
        containerId,
        reservationId,
        folioId,
        backAction,
        onChange,

        folio: null,
        items: [],
        payments: [],
        address: null,
        activity: [],

        mode: "normal",
        selectedIds: new Set(),
        toolbarAction: null,
        paymentDraft: null,

        loading: false
    };

    await folioReload(containerId);

}

async function folioReload(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    try {

        state.loading = true;

        const folio = await FolioService.getOrCreateFolio(state.reservationId, state.folioId);

        state.folio = folio;
        state.folioId = folio.id;
        state.reservationId = folio.reservation_id;

        const [items, payments, address] = await Promise.all([
            FolioService.getItems(folio.id),
            FolioService.getPayments(folio.id),
            FolioService.getAddress(folio.id)
        ]);

        state.items = items;
        state.payments = payments;
        state.address = address;

        if (typeof state.onChange === "function") {
            state.onChange(folio);
        }

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal memuat folio", "error");

    } finally {

        state.loading = false;
        FolioUI.render(state);

    }

}

async function folioLoadActivity(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    state.activity = await FolioService.getActivity(state.folioId);

}


// ======================================================
// Guard: folio yang sudah closed tidak boleh diedit lagi.
// ======================================================

function folioIsClosed(containerId) {

    const state = FolioInstances[containerId];
    return !!(state && state.folio && state.folio.is_closed);

}


// ======================================================
// Mode: History / Edit (mutually exclusive)
// ======================================================

async function folioToggleHistory(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    if (state.mode === "history") {

        state.mode = "normal";
        FolioUI.render(state);
        return;

    }

    state.mode = "history";
    await folioLoadActivity(containerId);
    FolioUI.render(state);

}

function folioEnterEdit(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    if (folioIsClosed(containerId)) {

        folioShowMessage("Folio sudah settled, tidak bisa diedit lagi", "info");
        return;

    }

    state.mode = "edit";
    state.selectedIds = new Set();
    state.toolbarAction = null;
    FolioUI.render(state);

}

function folioCancelEdit(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    state.mode = "normal";
    FolioUI.render(state);

}

async function folioSaveEdit(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    const draft = FolioUI.collectEditDraft(containerId);

    try {

        await FolioService.saveAddress(state.folioId, draft.address);

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

        state.mode = "normal";

        folioShowMessage("Folio saved", "success");

        await folioReload(containerId);

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal menyimpan folio", "error");

    }

}


// ======================================================
// Selection (checkbox mode)
// ======================================================

function folioToggleSelect(containerId, itemId) {

    const state = FolioInstances[containerId];
    if (!state || folioIsClosed(containerId)) return;

    if (state.selectedIds.has(itemId)) {

        state.selectedIds.delete(itemId);

    } else {

        state.selectedIds.add(itemId);

    }

    state.toolbarAction = null;

    FolioUI.render(state);

}

function folioClearSelection(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    state.selectedIds = new Set();
    state.toolbarAction = null;

    FolioUI.render(state);

}

function folioGetSelectedItems(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return [];

    return state.items.filter(i => state.selectedIds.has(i.id));

}


// ======================================================
// Selection toolbar actions
// ======================================================

function folioShowAction(containerId, action) {

    if (folioIsClosed(containerId)) return;

    const state = FolioInstances[containerId];
    if (!state) return;

    state.toolbarAction = action;
    FolioUI.render(state);

}

function folioCancelAction(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    state.toolbarAction = null;
    FolioUI.render(state);

}

async function folioConfirmDelete(containerId) {

    if (folioIsClosed(containerId)) return;

    const items = folioGetSelectedItems(containerId);

    if (items.length === 0) return;

    showConfirm(
        `Delete ${items.length} selected item(s)?`,
        async () => {

            try {

                for (const item of items) {
                    await FolioService.deleteItem(item);
                }

                folioClearSelection(containerId);
                await folioReload(containerId);

                folioShowMessage("Item(s) deleted", "success");

            } catch (e) {

                console.error(e);
                folioShowMessage("Gagal menghapus item", "error");

            }

        }
    );

}

async function folioResolveTargetFolio(containerId, reservationInputId, folioSelectId) {

    const state = FolioInstances[containerId];

    const reservationInput = document.getElementById(reservationInputId);
    const folioSelect = document.getElementById(folioSelectId);

    const confirmationNo = reservationInput ? reservationInput.value.trim() : "";

    let targetReservationId = state.reservationId;

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

        target = await FolioService.createNextFolio(targetReservationId);

    }

    return target;

}

async function folioSubmitMove(containerId) {

    if (folioIsClosed(containerId)) return;

    const state = FolioInstances[containerId];
    const items = folioGetSelectedItems(containerId);
    if (items.length === 0) return;

    try {

        const target = await folioResolveTargetFolio(
            containerId,
            FolioUI.fid(containerId, "folioMoveReservation"),
            FolioUI.fid(containerId, "folioMoveFolioSelect")
        );
        if (!target) return;

        if (target.id === state.folioId) {

            folioShowMessage("Target folio sama dengan folio saat ini", "error");
            return;

        }

        await FolioService.moveItems(items, target.id, target.name || `Folio ${target.folio_number}`);

        folioClearSelection(containerId);
        await folioReload(containerId);

        folioShowMessage("Item(s) moved", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal memindahkan item", "error");

    }

}

async function folioSubmitSplit(containerId) {

    if (folioIsClosed(containerId)) return;

    const items = folioGetSelectedItems(containerId);
    if (items.length === 0) return;

    const basisType = document.getElementById(FolioUI.fid(containerId, "folioSplitBasisType")).value;
    const basisValue = Number(document.getElementById(FolioUI.fid(containerId, "folioSplitBasisValue")).value);

    if (!basisValue || basisValue <= 0) {

        folioShowMessage("Isi nilai split terlebih dahulu", "error");
        return;

    }

    try {

        const target = await folioResolveTargetFolio(
            containerId,
            FolioUI.fid(containerId, "folioSplitReservation"),
            FolioUI.fid(containerId, "folioSplitFolioSelect")
        );
        if (!target) return;

        await FolioService.splitItems(items, { type: basisType, value: basisValue }, target.id);

        folioClearSelection(containerId);
        await folioReload(containerId);

        folioShowMessage("Item(s) split", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal split item", "error");

    }

}

async function folioSubmitDiscount(containerId) {

    if (folioIsClosed(containerId)) return;

    const items = folioGetSelectedItems(containerId);
    if (items.length === 0) return;

    const basisType = document.getElementById(FolioUI.fid(containerId, "folioDiscountBasisType")).value;
    const basisValue = Number(document.getElementById(FolioUI.fid(containerId, "folioDiscountBasisValue")).value);

    if (!basisValue || basisValue <= 0) {

        folioShowMessage("Isi nilai discount terlebih dahulu", "error");
        return;

    }

    try {

        await FolioService.applyDiscount(items, { type: basisType, value: basisValue });

        folioClearSelection(containerId);
        await folioReload(containerId);

        folioShowMessage("Discount applied", "success");

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal apply discount", "error");

    }

}


// ======================================================
// Add service row (di bawah tabel)
// ======================================================

function folioServiceInputKeyup(containerId, inputEl) {

    const keyword = inputEl.value;
    const results = FolioService.searchServiceCatalog(keyword);

    FolioUI.renderServiceSuggestions(containerId, results);

}

function folioSelectServiceSuggestion(containerId, code) {

    const service = FolioService.SERVICE_CATALOG.find(s => s.code === code);
    if (!service) return;

    const input = document.getElementById(FolioUI.fid(containerId, "folioServiceInput"));
    input.value = service.name;
    input.dataset.selectedCode = service.code;

    FolioUI.renderServiceSuggestions(containerId, []);

}

async function folioApplyNewService(containerId) {

    if (folioIsClosed(containerId)) {

        folioShowMessage("Folio sudah settled, tidak bisa menambah service", "info");
        return;

    }

    const state = FolioInstances[containerId];
    const input = document.getElementById(FolioUI.fid(containerId, "folioServiceInput"));
    const name = input.value.trim();

    if (!name) return;

    const code = input.dataset.selectedCode || null;
    const catalogEntry = FolioService.SERVICE_CATALOG.find(s => s.code === code)
        || FolioService.SERVICE_CATALOG.find(s => s.name.toLowerCase() === name.toLowerCase());

    try {

        await FolioService.addItem(state.folioId, {
            service_code: catalogEntry ? catalogEntry.code : null,
            service_name: catalogEntry ? catalogEntry.name : name,
            quantity: 1,
            unit_price: catalogEntry ? catalogEntry.unit_price : 0,
            tax_rate: catalogEntry ? catalogEntry.tax_rate : 0
        });

        input.value = "";
        delete input.dataset.selectedCode;

        state.mode = "edit";

        await folioReload(containerId);

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal menambah service", "error");

    }

}


// ======================================================
// Payment
// ======================================================

async function folioOpenPaymentView(containerId) {

    if (folioIsClosed(containerId)) {

        folioShowMessage("Folio sudah settled", "info");
        return;

    }

    const state = FolioInstances[containerId];
    const balance = FolioService.calcBalance(state.items, state.payments);

    if (balance === 0) {

        folioShowMessage("Folio sudah settled", "info");
        return;

    }

    const cashieredBy = await FolioService.getCurrentUserName();

    state.paymentDraft = {
        invoice_number: FolioUI.generateInvoiceNumber(state.folio),
        date: new Date().toISOString().slice(0, 10),
        cashiered_by: cashieredBy,
        method: "Cash",
        amount: Math.abs(balance).toFixed(2)
    };

    state.mode = "payment";

    FolioUI.render(state);

}

function folioCancelPayment(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    state.mode = "normal";
    state.paymentDraft = null;

    FolioUI.render(state);

}

async function folioSubmitPayment(containerId) {

    const state = FolioInstances[containerId];
    if (!state) return;

    const draft = FolioUI.collectPaymentDraft(containerId);

    const amount = Number(draft.amount);

    if (!amount || amount <= 0) {

        folioShowMessage("Jumlah pembayaran tidak valid", "error");
        return;

    }

    if (!draft.invoice_number) {

        folioShowMessage("Invoice number tidak valid", "error");
        return;

    }

    try {

        const terminalResult = await FolioService.chargePaymentTerminal({
            folioId: state.folioId,
            invoiceNumber: draft.invoice_number,
            amount,
            method: draft.method
        });

        if (!terminalResult || !terminalResult.success) {

            folioShowMessage("Pembayaran ditolak terminal", "error");
            return;

        }

        await FolioService.addPayment(state.folioId, amount, draft.method);

        await FolioService.closeFolioBilling(state.folioId, {
            invoice_number: draft.invoice_number,
            cashiered_by: draft.cashiered_by,
            paid_at_date: draft.date
        });

        state.mode = "normal";
        state.paymentDraft = null;

        folioShowMessage("Payment successful", "success");

        await folioReload(containerId);

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal memproses pembayaran", "error");

    }

}


// ======================================================
// Checkout guard — cek SEMUA folio yang lagi kebuka di
// halaman (folio1/2/3), bukan cuma satu.
// ======================================================

function folioHasOutstandingBalance() {

    return Object.values(FolioInstances).some(state => {

        if (!state || !state.items) return false;

        const balance = FolioService.calcBalance(state.items, state.payments);
        return balance < 0;

    });

}


// ======================================================
// Misc helpers
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