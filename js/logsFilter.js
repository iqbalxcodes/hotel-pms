// ======================================================
// logsFilter.js
// Query state for logs.html. Reads from audit_log_feed
// (never audit_logs directly — the view handles redaction).
// Optional URL params ?entity_type=reservations&entity_id=<uuid>
// scope the whole page to one entity — this is what a future
// "view logs for this reservation/room/guest" link on other
// pages would point to. Not wired up anywhere else yet.
// ======================================================

let currentPage = 1;
let rowsPerPage = 25;
let totalCount = 0;
let userSetRowsPerPage = false;

let activeSearchKeyword = "";
let activeCategory = "";
let activeAction = "";
let activeEntityType = "";
let activeEntityId = "";
let dateFrom = "";
let dateTo = "";

let currentPropertyId = null;

const ROW_HEIGHT_PX = 37;

function logsReadUrlScope(){

    const params = new URLSearchParams(window.location.search);

    activeEntityType = params.get("entity_type") || "";
    activeEntityId = params.get("entity_id") || "";

}

function buildBaseQuery(forCount = false){

    let query;

    if(forCount){
        query = supabaseClient.from("audit_log_feed").select("*", { count: "exact", head: true });
    } else {
        query = supabaseClient.from("audit_log_feed").select("*");
    }

    if(currentPropertyId){
        query = query.eq("property_id", currentPropertyId);
    }

    if(activeEntityType){
        query = query.eq("entity_type", activeEntityType);
    }

    if(activeEntityId){
        query = query.eq("entity_id", activeEntityId);
    }

    if(activeCategory){
        query = query.eq("category", activeCategory);
    }

    if(activeAction){
        query = query.eq("action", activeAction);
    }

    if(dateFrom){
        query = query.gte("created_at", dateFrom + "T00:00:00");
    }

    if(dateTo){
        query = query.lte("created_at", dateTo + "T23:59:59");
    }

    if(activeSearchKeyword){
        const kw = activeSearchKeyword;
        query = query.or(`entity_label.ilike.%${kw}%,description.ilike.%${kw}%,actor_name.ilike.%${kw}%`);
    }

    return query;

}

function buildDataQuery(){

    let query = buildBaseQuery(false).order("created_at", { ascending: false });

    if(rowsPerPage !== "all"){
        const from = (currentPage - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;
        query = query.range(from, to);
    }

    return query;

}

function buildExportQuery(){
    return buildBaseQuery(false).order("created_at", { ascending: false });
}

function getTotalPages(){
    if(rowsPerPage === "all") return 1;
    return Math.max(1, Math.ceil(totalCount / rowsPerPage));
}

function clampCurrentPage(){
    const totalPages = getTotalPages();
    if(currentPage > totalPages) currentPage = totalPages;
    if(currentPage < 1) currentPage = 1;
}

function calculateRowsPerPage(){

    const scrollContainer = document.getElementById("logsTableScroll");
    if(!scrollContainer) return rowsPerPage;

    const thead = scrollContainer.querySelector("thead");
    const containerHeight = scrollContainer.clientHeight;
    const theadHeight = thead ? thead.getBoundingClientRect().height : 37;

    const available = containerHeight - theadHeight;
    const computed = Math.floor(available / ROW_HEIGHT_PX);

    return Math.max(5, computed);

}

function debounce(fn, delay){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

async function adjustRowsPerPageAndRefresh(){

    if(userSetRowsPerPage) return;

    const newRowsPerPage = calculateRowsPerPage();

    if(newRowsPerPage !== rowsPerPage && newRowsPerPage > 0){
        rowsPerPage = newRowsPerPage;
        currentPage = 1;
        await refreshTable();
    }

}

// ------------------------------------------------------
// Filter controls (called from logs.html form)
// ------------------------------------------------------

function logsApplyFilters(){

    activeCategory = document.getElementById("logsCategory").value;
    activeAction = document.getElementById("logsAction").value;
    dateFrom = document.getElementById("logsDateFrom").value;
    dateTo = document.getElementById("logsDateTo").value;
    activeSearchKeyword = document.getElementById("logsKeyword").value.trim();

    currentPage = 1;
    refreshTable();

}

function logsClearFilters(){

    document.getElementById("logsCategory").value = "";
    document.getElementById("logsAction").value = "";
    document.getElementById("logsDateFrom").value = "";
    document.getElementById("logsDateTo").value = "";
    document.getElementById("logsKeyword").value = "";

    activeCategory = "";
    activeAction = "";
    dateFrom = "";
    dateTo = "";
    activeSearchKeyword = "";

    currentPage = 1;
    refreshTable();

}