// ======================================================
// client.js
// State + wiring for Client page. Front-end only for now —
// clAllClients is a local mock array, no supabase calls.
// Swap clAllClients / add persistence later without touching
// clientUI.js (render) or the search/table engine wiring below.
// ======================================================

let clAllClients = [
    { id: 1, client_type: "GUEST", name: "Isabella King", email: "isabella.king@mail.com", phone: "+49 151 1234567", city: "Munich", country: "Germany", loyalty_level: "Gold", loyalty_points: 3200 },
    { id: 2, client_type: "GUEST", name: "Cokorda Darmawan", email: "cokorda.d@mail.com", phone: "+62 812 3344556", city: "Denpasar", country: "Indonesia", loyalty_level: "VIP", loyalty_points: 9100 },
    { id: 3, client_type: "GUEST", name: "Veronica Suryanto", email: "veronica.s@mail.com", phone: "+62 813 9988776", city: "Jakarta", country: "Indonesia", loyalty_level: "Standard", loyalty_points: 150 },
    { id: 4, client_type: "GUEST", name: "Wei-Jie Liu", email: "weijie.liu@mail.com", phone: "+886 2 27123456", city: "Taipei", country: "Taiwan", loyalty_level: "Silver", loyalty_points: 1280 },
    { id: 5, client_type: "COMPANY", name: "Nordwind Logistics GmbH", contact_person: "Hannah Fischer", email: "travel@nordwind.de", phone: "+49 89 55511122", city: "Munich", country: "Germany" },
    { id: 6, client_type: "COMPANY", name: "PT Anugerah Sejahtera", contact_person: "Budi Santoso", email: "corp@anugerah.co.id", phone: "+62 21 5551234", city: "Jakarta", country: "Indonesia" },
    { id: 7, client_type: "TRAVEL_AGENCY", name: "Blue Horizon Travel", contact_person: "Maria Alves", email: "bookings@bluehorizon.com", phone: "+351 21 1234567", city: "Lisbon", country: "Portugal" },
    { id: 8, client_type: "TRAVEL_AGENCY", name: "Golden Route Tours", contact_person: "Natan Lumentut", email: "ops@goldenroute.id", phone: "+62 361 778899", city: "Denpasar", country: "Indonesia" },
    { id: 9, client_type: "GUEST", name: "Yu-Han Lin", email: "yuhan.lin@mail.com", phone: "+886 2 27009988", city: "Taipei", country: "Taiwan", loyalty_level: "Standard", loyalty_points: 40 },
    { id: 10, client_type: "GUEST", name: "Asep Hidayat", email: "asep.h@mail.com", phone: "+62 812 1122334", city: "Bandung", country: "Indonesia", loyalty_level: "Gold", loyalty_points: 4400 },
    { id: 11, client_type: "OTHER", name: "City Tourism Board", contact_person: "Elena Roth", email: "partnerships@citytourism.org", phone: "+49 89 99900011", city: "Munich", country: "Germany" },
    { id: 12, client_type: "COMPANY", name: "Skyline Ventures Ltd", contact_person: "James Carter", email: "accounts@skyline.co.uk", phone: "+44 20 71234567", city: "London", country: "United Kingdom" }
];

let clNextId = clAllClients.length + 1;
let clSelectedId = null;
let clActiveSearchFields = {};
let clCurrentPage = 1;
const CL_PAGE_SIZE = 15;

const CL_FIELDS_KEY = "cl_search_fields_config";

const CL_TYPE_OPTIONS = [
    { value: "", label: "Any" },
    { value: "GUEST", label: "Guest" },
    { value: "COMPANY", label: "Company" },
    { value: "TRAVEL_AGENCY", label: "Travel Agency" },
    { value: "OTHER", label: "Other" }
];

const CL_SEARCH_FIELDS = [
    { key: "name", label: "Name / Company", type: "text" },
    { key: "client_type", label: "Type", type: "select", options: CL_TYPE_OPTIONS },
    { key: "email", label: "Email", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "country", label: "Country", type: "text" }
];

// 6 field / columnSize:2 -> 3 kolom
const clSearchCard = createSearchCard({
    storageKey: CL_FIELDS_KEY,
    containerId: "clSearchFields",
    fields: CL_SEARCH_FIELDS,
    columnSize: 2
});

const clientTable = createColumnTable({
    storageKey: "hotel_pms_client_table_v1",
    columns: CLIENT_TABLE_COLUMNS,
    onChange: () => clRenderFilteredList()
});


// ======================================================
// View state (list <-> detail), sama pola kayak room.js
// ======================================================

function clSetView(view){
    const grid = document.getElementById("clGrid");
    if(grid) grid.dataset.view = view;
}


// ======================================================
// Filter + sort + paginate
// ======================================================

function clMatchesFields(c, fields){

    return Object.entries(fields).every(([key, val]) => {

        if(!val) return true;

        if(key === "client_type"){
            return c.client_type === val;
        }

        return String(c[key] ?? "").toLowerCase().includes(String(val).toLowerCase());

    });

}

function clSortClients(clients){

    const sort = clientTable.getSort();
    if(!sort) return clients;

    const dir = sort.direction === "asc" ? 1 : -1;

    return [...clients].sort((a, b) => {

        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";

        if(va < vb) return -1 * dir;
        if(va > vb) return 1 * dir;
        return 0;

    });

}

function clRenderFilteredList(){

    const hasFilter = Object.keys(clActiveSearchFields).length > 0;

    const filtered = !hasFilter
        ? clAllClients
        : clAllClients.filter(c => clMatchesFields(c, clActiveSearchFields));

    const sorted = clSortClients(filtered);

    const totalPages = Math.max(1, Math.ceil(sorted.length / CL_PAGE_SIZE));
    if(clCurrentPage > totalPages) clCurrentPage = totalPages;
    if(clCurrentPage < 1) clCurrentPage = 1;

    const start = (clCurrentPage - 1) * CL_PAGE_SIZE;
    const pageRows = sorted.slice(start, start + CL_PAGE_SIZE);

    clRenderClientTableHeader();
    clRenderClientList(pageRows, clSelectedId, clOpenDetail);
    clRenderPagination(sorted.length, totalPages);
    clRenderOverviewStats(clAllClients);
    clRenderLoyaltyBreakdown(clAllClients);

}

function clRenderPagination(total, totalPages){

    const info = document.getElementById("clPaginationInfo");
    const prevBtn = document.getElementById("clPrevPage");
    const nextBtn = document.getElementById("clNextPage");
    if(!info) return;

    const from = total === 0 ? 0 : (clCurrentPage - 1) * CL_PAGE_SIZE + 1;
    const to = Math.min(clCurrentPage * CL_PAGE_SIZE, total);

    info.textContent = `${from}-${to} of ${total}`;

    if(prevBtn) prevBtn.disabled = clCurrentPage <= 1;
    if(nextBtn) nextBtn.disabled = clCurrentPage >= totalPages;

}


// ======================================================
// Search card handlers
// ======================================================

function clApplySearch(fields){
    clActiveSearchFields = fields;
    clCurrentPage = 1;
    clRenderFilteredList();
    clRenderChip();
}

function clClearSearch(){
    clActiveSearchFields = {};
    clSearchCard.clearValues();
    clCurrentPage = 1;
    clRenderFilteredList();
    clRenderChip();
}

function clRemoveSearchField(key){

    delete clActiveSearchFields[key];

    const el = document.querySelector(`#clSearchFields [data-search-key="${key}"]`);
    if(el) el.value = "";

    clCurrentPage = 1;
    clRenderFilteredList();
    clRenderChip();

}

function clRenderChip(){

    const wrap = document.getElementById("clSearchChips");
    if(!wrap) return;

    const keys = Object.keys(clActiveSearchFields || {});

    if(keys.length === 0){
        wrap.style.display = "none";
        wrap.innerHTML = "";
        return;
    }

    wrap.style.display = "flex";

    wrap.innerHTML = keys.map(k => `
        <span class="cl-search-chip" data-key="${k}">
            <span>${clEscapeHtml(clSearchCard.fieldLabel(k))}: ${clEscapeHtml(clSearchCard.formatValue(k, clActiveSearchFields[k]))}</span>
            <button data-remove="${k}" title="Remove">&times;</button>
        </span>
    `).join("");

    wrap.querySelectorAll("[data-remove]").forEach(btn => {
        btn.onclick = () => clRemoveSearchField(btn.dataset.remove);
    });

}


// ======================================================
// Detail select
// ======================================================

function clOpenDetail(id){

    clSelectedId = id;
    clSetView("detail");
    clRenderFilteredList(); // refresh highlight

    const client = clAllClients.find(c => c.id === id);
    if(!client){
        clRenderEmptyDetail();
        return;
    }

    clRenderDetail(client);

}

function clBackToList(){
    clSelectedId = null;
    clSetView("list");
    clRenderFilteredList();
    clRenderEmptyDetail();
}


// ======================================================
// Add Client panel (in-memory only — no DB yet)
// ======================================================

function clShowAddPanel(){
    document.getElementById("clAddPanel").style.display = "block";
}

function clHideAddPanel(){
    document.getElementById("clAddPanel").style.display = "none";
    document.getElementById("clAddForm").reset();
    document.getElementById("c_contact_person").style.display = "none";
}

function clUpdateAddFormFields(){
    const type = document.getElementById("c_client_type").value;
    const isOrg = type === "COMPANY" || type === "TRAVEL_AGENCY";
    document.getElementById("c_contact_person").style.display = isOrg ? "block" : "none";
}


// ======================================================
// Bulk actions (in-memory)
// ======================================================

function clUpdateSelectionToolbar(){

    const selected = document.querySelectorAll(".cl-client-checkbox:checked");
    const toolbar = document.getElementById("clSelectionToolbar");
    const count = document.getElementById("clSelectedCount");

    if(selected.length > 0){
        toolbar.style.display = "flex";
        count.innerText = `${selected.length} selected`;
    } else {
        toolbar.style.display = "none";
    }

}

function clMarkSelectedVip(){

    const ids = [...document.querySelectorAll(".cl-client-checkbox:checked")].map(el => Number(el.dataset.id));

    if(ids.length === 0){
        clShowMessage("No client selected", "error");
        return;
    }

    clAllClients.forEach(c => {
        if(ids.includes(c.id) && c.client_type === "GUEST") c.loyalty_level = "VIP";
    });

    clShowMessage("Marked as VIP", "success");
    clRenderFilteredList();

}

function clDeleteSelected(){

    const ids = [...document.querySelectorAll(".cl-client-checkbox:checked")].map(el => Number(el.dataset.id));

    if(ids.length === 0){
        clShowMessage("No client selected", "error");
        return;
    }

    clShowConfirm(
        `Delete ${ids.length} client(s)? This cannot be undone.`,
        () => {
            clAllClients = clAllClients.filter(c => !ids.includes(c.id));
            if(ids.includes(clSelectedId)) clBackToList();
            clShowMessage("Client(s) deleted", "success");
            clRenderFilteredList();
        },
        () => clShowMessage("Delete cancelled", "info")
    );

}


// ======================================================
// pms:customize-toggle
// ======================================================

document.addEventListener("pms:customize-toggle", (e) => {
    clSearchCard.setCustomizing(e.detail.active);
});


// ======================================================
// Init
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    clSearchCard.load();
    clSearchCard.render();

    document.getElementById("clSearchForm").addEventListener("submit", (e) => {
        e.preventDefault();
        clApplySearch(clSearchCard.gatherValues());
    });

    document.getElementById("clSearchClearBtn").addEventListener("click", clClearSearch);
    document.getElementById("clAddOpenBtn").addEventListener("click", clShowAddPanel);
    document.getElementById("clAddCancelBtn").addEventListener("click", clHideAddPanel);
    document.getElementById("c_client_type").addEventListener("change", clUpdateAddFormFields);

    document.getElementById("clAddForm").addEventListener("submit", (e) => {

        e.preventDefault();

        const client = {
            id: clNextId++,
            client_type: document.getElementById("c_client_type").value,
            name: document.getElementById("c_name").value.trim(),
            contact_person: document.getElementById("c_contact_person").value.trim() || null,
            email: document.getElementById("c_email").value.trim() || null,
            phone: document.getElementById("c_phone").value.trim() || null,
            city: document.getElementById("c_city").value.trim() || null,
            country: document.getElementById("c_country").value.trim() || null,
            loyalty_level: document.getElementById("c_loyalty_level").value,
            loyalty_points: 0
        };

        if(!client.name){
            clShowMessage("Name tidak boleh kosong", "error");
            return;
        }

        clAllClients.push(client);
        clShowMessage("Client saved (local only — not connected to database yet)", "success");
        clHideAddPanel();
        clRenderFilteredList();

    });

    document.getElementById("clPrevPage").addEventListener("click", () => {
        if(clCurrentPage <= 1) return;
        clCurrentPage--;
        clRenderFilteredList();
    });

    document.getElementById("clNextPage").addEventListener("click", () => {
        clCurrentPage++;
        clRenderFilteredList();
    });

    document.body.addEventListener("change", (e) => {
        if(e.target.classList.contains("cl-client-checkbox")){
            clUpdateSelectionToolbar();
        }
    });

    document.getElementById("clVipBtn").addEventListener("click", clMarkSelectedVip);
    document.getElementById("clDeleteBtn").addEventListener("click", clDeleteSelected);

    clSetView("list");
    clRenderFilteredList();

});