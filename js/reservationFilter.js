// ======================================================
// reservationFilter.js
// Mode/date pill filter (arrival/departure/inhouse/pending/
// cancelled/noshow + today's/entire + date nav)
//
// FIXED: Tambahkan guard supabaseClient + better error handling
// ======================================================

let currentPage = 1;
let rowsPerPage = 25;
let totalCount = 0;
let userSetRowsPerPage = false;

let activeSearchKeyword = "";
let activeSearchFields = {};
let activeSortColumn = null;
let sortDirection = {};

let currentDate = new Date();
let currentScope = "today";   // today | entire
let currentMode = "arrival";  // arrival | departure | inhouse | pending | cancelled | noshow

// ------------------------------------------------------
// Date helper
// ------------------------------------------------------

function formatDate(date){
    const year = date.getFullYear();
    const month = String(date.getMonth()+1).padStart(2,"0");
    const day = String(date.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
}

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function getDynamicDateLabel(){
    const today = new Date();
    today.setHours(0,0,0,0);
    const compare = new Date(currentDate);
    compare.setHours(0,0,0,0);
    const diff = Math.round((compare - today) / (1000*60*60*24));
    if(diff === 0) return "Today's";
    if(diff === -1) return "Yesterday's";
    if(diff === 1) return "Tomorrow's";
    return DAYS[currentDate.getDay()] + "'s";
}

// ------------------------------------------------------
// Pill labels
// ------------------------------------------------------

function updateToolbar(){
    const scope = document.getElementById("dateScope");
    if(scope) scope.options[0].text = getDynamicDateLabel();
    const dateInput = document.getElementById("currentDate");
    if(dateInput) dateInput.value = formatDate(currentDate);
}

// ------------------------------------------------------
// Mode filter
// ------------------------------------------------------

function applyModeFilter(query, mode, scope, date){
    switch(mode){
        case "arrival":
            query = query.eq("status", "CONFIRMED");
            if(scope === "today") query = query.eq("arrival_date", date);
            else query = query.order("arrival_date");
            break;
        case "departure":
            query = query.eq("status", "CHECKED_IN");
            if(scope === "today") query = query.eq("departure_date", date);
            else query = query.order("departure_date");
            break;
        case "inhouse":
            query = query.eq("status", "CHECKED_IN");
            if(scope === "today"){
                query = query.lte("arrival_date", date).gte("departure_date", date);
            }
            break;
        case "pending":
            query = query.eq("status", "TENTATIVE");
            if(scope === "today") query = query.eq("arrival_date", date);
            break;
        case "cancelled":
            query = query.eq("status", "CANCELLED");
            if(scope === "today") query = query.eq("arrival_date", date);
            break;
        case "noshow":
            query = query.eq("status", "NO_SHOW");
            if(scope === "today") query = query.eq("arrival_date", date);
            break;
    }
    return query;
}

// ------------------------------------------------------
// Base query
// ------------------------------------------------------

function buildBaseQuery(forCount = false){
    // GUARD: pastikan supabaseClient sudah ada
    if(typeof supabaseClient === "undefined" || !supabaseClient){
        console.warn("[reservationFilter] supabaseClient belum siap");
        return null;
    }

    let query;
    if(forCount){
        query = supabaseClient.from("reservation_list_view").select("*", { count: "exact", head: true });
    } else {
        query = supabaseClient.from("reservation_list_view").select("*");
    }

    const searchKeys = Object.keys(activeSearchFields || {});

    if(activeSearchKeyword){
        const kw = activeSearchKeyword;
        query = query.or(`confirmation_no.ilike.%${kw}%,guest_name.ilike.%${kw}%,room_number.ilike.%${kw}%`);
        return query;
    }

    if(searchKeys.length > 0){
        searchKeys.forEach(key => {
            const value = activeSearchFields[key];
            if(key === "status" || key === "booking_channel" || key === "arrival_date" || key === "departure_date"){
                query = query.eq(key, value);
            } else {
                query = query.ilike(key, `%${value}%`);
            }
        });
        return query;
    }

    const date = formatDate(currentDate);
    query = applyModeFilter(query, currentMode, currentScope, date);
    return query;
}

function buildDataQuery(){
    let query = buildBaseQuery(false);
    if(!query) return null;

    if(activeSortColumn){
        query = query.order(activeSortColumn, { ascending: sortDirection[activeSortColumn] === "asc" });
    } else if(Object.keys(activeSearchFields || {}).length === 0 && !activeSearchKeyword){
        query = query.order("created_at", { ascending: false });
    } else {
        query = query.order("created_at", { ascending: false });
    }

    if(rowsPerPage !== "all"){
        const from = (currentPage - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;
        query = query.range(from, to);
    }

    return query;
}

function buildExportQuery(){
    let query = buildBaseQuery(false);
    if(!query) return null;
    if(activeSortColumn){
        query = query.order(activeSortColumn, { ascending: sortDirection[activeSortColumn] === "asc" });
    }
    return query;
}

// ------------------------------------------------------
// Dropdown counts
// ------------------------------------------------------

async function updateFilterCount(){
    if(typeof supabaseClient === "undefined" || !supabaseClient) return;

    const date = formatDate(currentDate);
    const counts = {};
    const modes = ["arrival","departure","inhouse","pending","cancelled","noshow"];

    for(const key of modes){
        let query = supabaseClient
            .from("reservation_list_view")
            .select("*", { count: "exact", head: true });
        query = applyModeFilter(query, key, currentScope, date);
        const { count, error } = await query;
        counts[key] = error ? 0 : (count ?? 0);
    }

    if(typeof updateDropdownText === "function") updateDropdownText(counts);
}

// ------------------------------------------------------
// Pill controller
// ------------------------------------------------------

function changeMode(value){
    currentMode = value;
    currentPage = 1;
    updateToolbar();
    refreshTable();
}

function changeDateScope(value){
    currentScope = value;
    currentPage = 1;
    updateToolbar();
    refreshTable();
}

function changeDate(step){
    currentDate.setDate(currentDate.getDate() + step);
    currentPage = 1;
    updateToolbar();
    refreshTable();
}

function changeSelectedDate(value){
    currentDate = new Date(value);
    currentPage = 1;
    updateToolbar();
    refreshTable();
}

// ------------------------------------------------------
// Pagination & rows-per-page
// ------------------------------------------------------

function getTotalPages(){
    if(rowsPerPage === "all") return 1;
    return Math.max(1, Math.ceil(totalCount / rowsPerPage));
}

function clampCurrentPage(){
    const totalPages = getTotalPages();
    if(currentPage > totalPages) currentPage = totalPages;
    if(currentPage < 1) currentPage = 1;
}

function estimateRowHeight(){
    const sampleRow = document.querySelector("#reservationTable tr");
    return sampleRow ? sampleRow.getBoundingClientRect().height : 41;
}