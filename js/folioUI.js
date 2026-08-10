// ======================================================
// folioUI.js
// Rendering murni untuk modul Folio. Tidak melakukan query
// Supabase — hanya menggambar berdasarkan FolioState dan
// memanggil balik fungsi aksi dari folio.js lewat onclick.
//
// PENTING: modul ini reusable lintas halaman, jadi TIDAK
// boleh bergantung diam-diam ke helper milik halaman lain
// (mis. escapeHtmlSimple dari tableColumns.js yang cuma
// ada di index.html). Semua helper yang dibutuhkan
// didefinisikan sendiri di file ini.
// ======================================================

function escapeHtmlSimple(str) {

    const div = document.createElement("div");
    div.textContent = str ?? "";

    return div.innerHTML;

}

const FolioUI = {

    render(state) {

        const container = document.getElementById(state.containerId);
        if (!container) return;

        let bodyHtml;

        if (state.mode === "history") {
            bodyHtml = this.renderHistory(state);
        } else if (state.mode === "payment") {
            bodyHtml = this.renderPaymentView(state);
        } else {
            bodyHtml = this.renderBody(state);
        }

        container.innerHTML = `
            <div class="folio-card">
                ${this.renderHeader(state)}
                ${bodyHtml}
            </div>
        `;

    },

    // --------------------------------------------------
    // Header: Folio N [✎][◷]                        [←]
    // --------------------------------------------------

    renderHeader(state) {

        const isPayment = state.mode === "payment";
        const isEdit = state.mode === "edit";
        const isHistory = state.mode === "history";
        const isClosed = !!(state.folio && state.folio.is_closed);

        if (isPayment) {

            return `
                <div class="folio-header">
                    <div class="folio-header-left">
                        <span class="folio-title">Take Payment</span>
                    </div>
                    <button class="folio-icon-btn" title="Cancel" onclick="folioCancelPayment()">✕</button>
                </div>
            `;

        }

        const label = state.folio
            ? (state.folio.name || `Folio ${state.folio.folio_number}`)
            : "Folio";

        let editControls;

        if (isEdit) {

            editControls = `
                <button class="folio-icon-btn folio-icon-confirm require-auth" title="Save" onclick="folioSaveEdit()">✓</button>
                <button class="folio-icon-btn" title="Cancel" onclick="folioCancelEdit()">✕</button>
            `;

        } else {

            editControls = `
                ${!isClosed ? `<button class="folio-icon-btn require-auth" title="Edit Folio" onclick="folioEnterEdit()">✎</button>` : ""}
                <button class="folio-icon-btn ${isHistory ? "folio-icon-active" : ""}" title="Folio Activity" onclick="folioToggleHistory()">◷</button>
            `;

        }

        return `
            <div class="folio-header">
                <div class="folio-header-left">
                    <span class="folio-title">${escapeHtmlSimple(label)}</span>
                    ${isClosed ? `<span class="folio-closed-badge" title="Folio settled">🔒 Closed</span>` : ""}
                    ${editControls}
                </div>
                ${state.backAction ? `<button class="folio-icon-btn" title="Back" onclick="${state.backAction}">←</button>` : ""}
            </div>
        `;

    },

    // --------------------------------------------------
    // Body (normal / edit): address card + items table + footer
    // --------------------------------------------------

    renderBody(state) {

        const editable = state.mode === "edit";
        const isClosed = !!(state.folio && state.folio.is_closed);

        return `
            ${this.renderAddressCard(state.address, editable)}
            ${this.renderItemsTable(state, editable)}
            ${!isClosed ? this.renderAddServiceRow() : ""}
            ${this.renderFooter(state)}
        `;

    },

    // --------------------------------------------------
    // Invoice Address Card
    //
    // Layout edit mode:
    //   [ dropdown Guest/Company/Agency/Mr/Mrs ] [ ID ]   <- setengah-setengah
    //   [ Name (full width) ]
    // --------------------------------------------------

    renderAddressCard(address, editable) {

        const a = address || {};

        if (!editable) {

            return `
                <div class="folio-address-card">
                    <div class="folio-address-title">${escapeHtmlSimple(a.guest_or_company || "Guest")}</div>
                    <div class="folio-address-row">
                        <span>${a.customer_id ? "ID: " + escapeHtmlSimple(String(a.customer_id)) : ""}</span>
                        <span class="folio-address-name">${escapeHtmlSimple(a.name || "-")}</span>
                    </div>
                    ${a.additional_data ? `<div class="folio-address-row">${escapeHtmlSimple(a.additional_data)}</div>` : ""}
                    <div class="folio-address-row">${escapeHtmlSimple(a.street || "-")}</div>
                    <div class="folio-address-row">
                        <span>${escapeHtmlSimple(a.postcode || "")}</span>
                        <span>${escapeHtmlSimple(a.city || "")}</span>
                    </div>
                    <div class="folio-address-row">
                        <span>${escapeHtmlSimple(a.region || "")}</span>
                        <span>${escapeHtmlSimple(a.country || "")}</span>
                    </div>
                </div>
            `;

        }

        const typeOptions = ["Guest", "Company", "Agency", "Mr", "Mrs"]
            .map(opt => `<option value="${opt}" ${a.guest_or_company === opt ? "selected" : ""}>${opt}</option>`)
            .join("");

        return `
            <div class="folio-address-card folio-address-edit" id="folioAddressEdit">
                <div class="folio-field-row">
                    <select id="fa_guest_or_company">${typeOptions}</select>
                    <input id="fa_customer_id" type="number" placeholder="ID" value="${a.customer_id ?? ""}"
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); folioLookupCustomer();}">
                </div>
                <div class="folio-field-row">
                    <input id="fa_name" type="text" placeholder="Name" value="${escapeHtmlSimple(a.name || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="fa_additional_data" type="text" placeholder="Add. Data (optional)" value="${escapeHtmlSimple(a.additional_data || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="fa_street" type="text" placeholder="Street w number" value="${escapeHtmlSimple(a.street || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="fa_postcode" type="text" placeholder="Postcode" value="${escapeHtmlSimple(a.postcode || "")}">
                    <input id="fa_city" type="text" placeholder="City" value="${escapeHtmlSimple(a.city || "")}">
                </div>
                <div class="folio-field-row">
                    <input id="fa_region" type="text" placeholder="Region (optional)" value="${escapeHtmlSimple(a.region || "")}">
                    <input id="fa_country" type="text" placeholder="Country" value="${escapeHtmlSimple(a.country || "")}">
                </div>
            </div>
        `;

    },

    // --------------------------------------------------
    // Items Table
    // --------------------------------------------------

    renderItemsTable(state, editable) {

        const isClosed = !!(state.folio && state.folio.is_closed);

        const rows = state.items
            .map(item => this.renderItemRow(item, editable, state.selectedIds.has(item.id), isClosed))
            .join("");

        return `
            <div class="folio-table-scroll">
                <table class="folio-table">
                    <colgroup>
                        <col style="width:36px">
                        <col style="width:60px">
                        <col style="width:200px">
                        <col style="width:80px">
                        <col style="width:110px">
                        <col style="width:120px">
                    </colgroup>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Qty</th>
                            <th>Name Service</th>
                            <th>Tax</th>
                            <th>Price</th>
                            <th>End Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="6" class="folio-empty">No items</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;

    },

    renderItemRow(item, editable, selected, isClosed) {

        const endPrice = FolioService.calcEndPrice(item);

        if (!editable) {

            return `
                <tr>
                    <td><input type="checkbox" ${selected ? "checked" : ""} ${isClosed ? "disabled" : ""} onchange="folioToggleSelect(${item.id})"></td>
                    <td>${item.quantity}</td>
                    <td>${escapeHtmlSimple(item.service_name)}</td>
                    <td>${item.tax_rate}%</td>
                    <td>${folioFormatCurrency(item.unit_price)}</td>
                    <td>${folioFormatCurrency(endPrice)}</td>
                </tr>
            `;

        }

        return `
            <tr data-item-id="${item.id}" class="folio-edit-row">
                <td><input type="checkbox" ${selected ? "checked" : ""} onchange="folioToggleSelect(${item.id})"></td>
                <td><input type="number" step="0.01" class="folio-inline-input fi-qty" value="${item.quantity}"></td>
                <td><input type="text" class="folio-inline-input fi-name" value="${escapeHtmlSimple(item.service_name)}"></td>
                <td><input type="number" step="0.01" class="folio-inline-input fi-tax" value="${item.tax_rate}"></td>
                <td><input type="number" step="0.01" class="folio-inline-input fi-price" value="${item.unit_price}"></td>
                <td class="folio-end-price-cell">${folioFormatCurrency(endPrice)}</td>
            </tr>
        `;

    },

    collectEditDraft() {

        const address = {
            guest_or_company: document.getElementById("fa_guest_or_company")?.value || "Guest",
            customer_id: document.getElementById("fa_customer_id")?.value || null,
            name: document.getElementById("fa_name")?.value || "",
            additional_data: document.getElementById("fa_additional_data")?.value || null,
            street: document.getElementById("fa_street")?.value || null,
            postcode: document.getElementById("fa_postcode")?.value || null,
            city: document.getElementById("fa_city")?.value || null,
            region: document.getElementById("fa_region")?.value || null,
            country: document.getElementById("fa_country")?.value || null
        };

        const items = [...document.querySelectorAll(".folio-edit-row")].map(row => {

            const id = Number(row.dataset.itemId);

            return {
                id,
                quantity: Number(row.querySelector(".fi-qty").value),
                service_name: row.querySelector(".fi-name").value,
                tax_rate: Number(row.querySelector(".fi-tax").value),
                unit_price: Number(row.querySelector(".fi-price").value)
            };

        });

        return { address, items };

    },

    // --------------------------------------------------
    // Add service row (below table)
    // --------------------------------------------------

    renderAddServiceRow() {

        return `
            <div class="folio-add-service-row">
                <div class="folio-service-autocomplete">
                    <input
                        id="folioServiceInput"
                        type="text"
                        class="require-auth"
                        placeholder="Code / service name (e.g. R for Room)"
                        onkeyup="folioServiceInputKeyup(this)">
                    <div id="folioServiceSuggestions" class="folio-suggestions"></div>
                </div>
                <button class="folio-btn require-auth" onclick="folioApplyNewService()">Apply</button>
            </div>
        `;

    },

    renderServiceSuggestions(results) {

        const box = document.getElementById("folioServiceSuggestions");
        if (!box) return;

        if (!results.length) {

            box.innerHTML = "";
            box.style.display = "none";
            return;

        }

        box.style.display = "block";

        box.innerHTML = results.map(s => `
            <div class="folio-suggestion-item" onclick="folioSelectServiceSuggestion('${s.code}')">
                ${escapeHtmlSimple(s.name)} <span class="folio-suggestion-code">${s.code}</span>
            </div>
        `).join("");

    },

    // --------------------------------------------------
    // Footer: normal | selection | move | split | discount | closed
    // --------------------------------------------------

    renderFooter(state) {

        const isClosed = !!(state.folio && state.folio.is_closed);

        if (state.mode === "edit") {
            return "";
        }

        if (isClosed) {

            return this.renderClosedFooter(state);

        }

        const selectedCount = state.selectedIds.size;

        if (selectedCount === 0) {

            return this.renderNormalFooter(state);

        }

        if (state.toolbarAction === "move") {

            return this.renderMoveToolbar(selectedCount);

        }

        if (state.toolbarAction === "split") {

            return this.renderSplitToolbar(selectedCount);

        }

        if (state.toolbarAction === "discount") {

            return this.renderDiscountToolbar(selectedCount);

        }

        return this.renderSelectionToolbar(selectedCount);

    },

    renderClosedFooter(state) {

        const invoiceNo = state.folio.invoice_number || "-";

        return `
            <div class="folio-footer">
                <div class="folio-balance folio-balance-settled">
                    Invoice ${escapeHtmlSimple(invoiceNo)} <span class="folio-balance-status">Settled</span>
                </div>
            </div>
        `;

    },

    renderNormalFooter(state) {

        const balance = FolioService.calcBalance(state.items, state.payments);

        let statusLabel = "Settled";
        let statusClass = "folio-balance-settled";

        if (balance < 0) {

            statusLabel = "Outstanding";
            statusClass = "folio-balance-outstanding";

        } else if (balance > 0) {

            statusLabel = "Credit";
            statusClass = "folio-balance-credit";

        }

        return `
            <div class="folio-footer">
                <button class="folio-btn require-auth" onclick="folioOpenPaymentView()">Take Payment</button>
                <div class="folio-balance ${statusClass}">
                    Balance: ${folioFormatCurrency(balance)} <span class="folio-balance-status">${statusLabel}</span>
                </div>
            </div>
        `;

    },

    renderSelectionToolbar(count) {

        return `
            <div class="folio-footer folio-footer-selection">
                <span class="folio-selection-count">${count} selected</span>
                <button class="folio-btn require-auth" onclick="folioConfirmDelete()">Delete</button>
                <button class="folio-btn require-auth" onclick="folioShowAction('move')">Move</button>
                <button class="folio-btn require-auth" onclick="folioShowAction('split')">Split</button>
                <button class="folio-btn require-auth" onclick="folioShowAction('discount')">Apply Discount</button>
                <button class="folio-btn folio-btn-plain" onclick="folioClearSelection()">Cancel</button>
            </div>
        `;

    },

    renderMoveToolbar(count) {

        const folioOptions = this.buildFolioNumberOptions();

        return `
            <div class="folio-footer folio-footer-action">
                <span class="folio-selection-count">${count} selected — Move</span>
                <input id="folioMoveReservation" type="text" placeholder="Reservation (blank = current)"
                    class="folio-inline-input">
                <select id="folioMoveFolioSelect" class="folio-inline-input">${folioOptions}</select>
                <button class="folio-btn require-auth" onclick="folioSubmitMove()">Apply</button>
                <button class="folio-btn folio-btn-plain" onclick="folioCancelAction()">Cancel</button>
            </div>
        `;

    },

    renderSplitToolbar(count) {

        const folioOptions = this.buildFolioNumberOptions();

        return `
            <div class="folio-footer folio-footer-action">
                <span class="folio-selection-count">${count} selected — Split</span>
                <select id="folioSplitBasisType" class="folio-inline-input">
                    <option value="percentage">Percentage</option>
                    <option value="price">Price</option>
                </select>
                <input id="folioSplitBasisValue" type="number" step="0.01" placeholder="Value" class="folio-inline-input">
                <span class="folio-footer-label">to</span>
                <input id="folioSplitReservation" type="text" placeholder="Reservation (blank = current)" class="folio-inline-input">
                <select id="folioSplitFolioSelect" class="folio-inline-input">${folioOptions}</select>
                <button class="folio-btn require-auth" onclick="folioSubmitSplit()">Apply</button>
                <button class="folio-btn folio-btn-plain" onclick="folioCancelAction()">Cancel</button>
            </div>
        `;

    },

    renderDiscountToolbar(count) {

        return `
            <div class="folio-footer folio-footer-action">
                <span class="folio-selection-count">${count} selected — Discount</span>
                <select id="folioDiscountBasisType" class="folio-inline-input">
                    <option value="percentage">Percentage</option>
                    <option value="price">Price</option>
                </select>
                <input id="folioDiscountBasisValue" type="number" step="0.01" placeholder="Value" class="folio-inline-input">
                <button class="folio-btn require-auth" onclick="folioSubmitDiscount()">Apply</button>
                <button class="folio-btn folio-btn-plain" onclick="folioCancelAction()">Cancel</button>
            </div>
        `;

    },

    buildFolioNumberOptions() {

        // Default 1-3 (sesuai konsep card-billing1/2/3). Folio yang belum ada
        // otomatis dibuat oleh folioResolveTargetFolio() saat Apply diklik.
        return [1, 2, 3].map(n => `<option value="${n}">Folio ${n}</option>`).join("");

    },

    // --------------------------------------------------
    // Payment View (menggantikan body folio card saat
    // mode === "payment", dipicu tombol "Take Payment")
    // --------------------------------------------------

    renderPaymentView(state) {

        const draft = state.paymentDraft || {};

        return `
            <div class="folio-payment-card">
                <div class="folio-payment-row">
                    <label>Invoice Number</label>
                    <input id="fp_invoice_number" type="text" class="folio-inline-input" value="${escapeHtmlSimple(draft.invoice_number || "")}" readonly>
                </div>
                <div class="folio-payment-row">
                    <label>Date</label>
                    <input id="fp_date" type="date" class="folio-inline-input" value="${draft.date || ""}">
                </div>
                <div class="folio-payment-row">
                    <label>Cashiered By</label>
                    <input id="fp_cashiered_by" type="text" class="folio-inline-input" value="${escapeHtmlSimple(draft.cashiered_by || "")}">
                </div>
                <div class="folio-payment-row">
                    <label>Payment Method</label>
                    <select id="fp_method" class="folio-inline-input">
                        <option value="Cash" ${draft.method === "Cash" ? "selected" : ""}>Cash</option>
                        <option value="Credit Card" ${draft.method === "Credit Card" ? "selected" : ""}>Credit Card</option>
                        <option value="Debit Card" ${draft.method === "Debit Card" ? "selected" : ""}>Debit Card</option>
                        <option value="Bank Transfer" ${draft.method === "Bank Transfer" ? "selected" : ""}>Bank Transfer</option>
                    </select>
                </div>
                <div class="folio-payment-row">
                    <label>Amount</label>
                    <input id="fp_amount" type="number" step="0.01" class="folio-inline-input" value="${draft.amount || ""}">
                </div>
                <div class="folio-payment-note">⚠ Payment terminal API is still under development — this payment will be recorded manually.</div>
                <div class="folio-payment-actions">
                    <button class="folio-btn folio-btn-plain" onclick="folioCancelPayment()">Cancel</button>
                    <button class="folio-btn folio-icon-confirm require-auth" onclick="folioSubmitPayment()">Pay</button>
                </div>
            </div>
        `;

    },

    collectPaymentDraft() {

        return {
            invoice_number: document.getElementById("fp_invoice_number")?.value || "",
            date: document.getElementById("fp_date")?.value || "",
            cashiered_by: document.getElementById("fp_cashiered_by")?.value || "",
            method: document.getElementById("fp_method")?.value || "Cash",
            amount: document.getElementById("fp_amount")?.value || "0"
        };

    },

    generateInvoiceNumber(folio) {

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const base = folio && folio.id ? folio.id : Math.floor(Math.random() * 100000);

        return `INV-${y}${m}-${String(base).padStart(5, "0")}`;

    },

    // --------------------------------------------------
    // Activity Timeline
    // --------------------------------------------------

    renderHistory(state) {

        if (!state.activity || state.activity.length === 0) {

            return `<div class="folio-history"><div class="folio-empty">No activity yet</div></div>`;

        }

        const groups = this.groupActivityByDay(state.activity);

        const groupsHtml = Object.entries(groups).map(([dayLabel, entries]) => `
            <div class="folio-history-day-label">${dayLabel}</div>
            ${entries.map(e => this.renderActivityEntry(e)).join("")}
        `).join("");

        return `<div class="folio-history">${groupsHtml}</div>`;

    },

    groupActivityByDay(activity) {

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {};

        activity.forEach(entry => {

            const d = new Date(entry.created_at);
            const dayOnly = new Date(d);
            dayOnly.setHours(0, 0, 0, 0);

            let label;

            if (dayOnly.getTime() === today.getTime()) {
                label = "Today";
            } else if (dayOnly.getTime() === yesterday.getTime()) {
                label = "Yesterday";
            } else {
                label = dayOnly.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(entry);

        });

        return groups;

    },

    renderActivityEntry(entry) {

        const time = new Date(entry.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

        return `
            <div class="folio-history-entry">
                <div class="folio-history-time">${time}</div>
                <div class="folio-history-content">
                    <div class="folio-history-desc">${escapeHtmlSimple(entry.description || entry.action)}</div>
                    ${entry.actor_name ? `<div class="folio-history-actor">${escapeHtmlSimple(entry.actor_name)}</div>` : ""}
                </div>
            </div>
        `;

    }

};


// ======================================================
// Guest/Company ID lookup (Enter di field ID -> load dari DB)
// ======================================================

async function folioLookupCustomer() {

    const idInput = document.getElementById("fa_customer_id");
    if (!idInput || !idInput.value) return;

    try {

        const guest = await FolioService.lookupGuestById(Number(idInput.value));

        if (!guest) {

            folioShowMessage("Guest ID not found — will be generated as new", "info");
            return;

        }

        document.getElementById("fa_name").value = `${guest.first_name || ""} ${guest.last_name || ""}`.trim();
        document.getElementById("fa_street").value = guest.address || "";
        document.getElementById("fa_postcode").value = guest.postal_code || "";
        document.getElementById("fa_city").value = guest.city || "";
        document.getElementById("fa_country").value = guest.country || "";

    } catch (e) {

        console.error(e);
        folioShowMessage("Gagal mencari guest", "error");

    }

}