// ======================================================
// reservationFilter.js
// ======================================================

let currentPage = 1;
let rowsPerPage = 25;
let totalCount = 0;
let userSetRowsPerPage = false;

let activeSearchKeyword = "";
let activeSearchFields = {};
let activeSortColumn = null;
let sortDirection = {};

function buildBaseQuery(forCount = false){

    let query;

    if(forCount){
        query = supabaseClient.from("reservation_list_view").select("*", { count: "exact", head: true });
    } else {
        query = supabaseClient.from("reservation_list_view").select("*");
    }

    if(activeSearchKeyword){
        const kw = activeSearchKeyword;
        query = query.or(`confirmation_no.ilike.%${kw}%,guest_name.ilike.%${kw}%,room_number.ilike.%${kw}%`);
    }

    if(activeSearchFields && Object.keys(activeSearchFields).length > 0){

        Object.entries(activeSearchFields).forEach(([key, value]) => {

            if(key === "status" || key === "booking_channel"){
                query = query.eq(key, value);
            } else if(key === "arrival_date" || key === "departure_date"){
                query = query.eq(key, value);
            } else {
                query = query.ilike(key, `%${value}%`);
            }

        });

    }

    return query;

}

function buildDataQuery(){

    let query = buildBaseQuery(false);

    if(activeSortColumn){
        query = query.order(activeSortColumn, { ascending: sortDirection[activeSortColumn] === "asc" });
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

    if(activeSortColumn){
        query = query.order(activeSortColumn, { ascending: sortDirection[activeSortColumn] === "asc" });
    }

    return query;

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

function estimateRowHeight(){
    const sampleRow = document.querySelector("#reservationTable tr");
    return sampleRow ? sampleRow.getBoundingClientRect().height : 41;
}

function calculateRowsPerPage(){

    const scrollContainer = document.querySelector(".table-scroll");
    if(!scrollContainer) return rowsPerPage;

    const thead = document.querySelector("thead");
    const containerHeight = scrollContainer.clientHeight;
    const theadHeight = thead ? thead.getBoundingClientRect().height : 41;
    const rowHeight = estimateRowHeight();
    const available = containerHeight - theadHeight;
    const computed = Math.floor(available / rowHeight);

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