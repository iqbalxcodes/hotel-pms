// ======================================================
// guestFilter.js
// ======================================================

let currentPage = 1;
let rowsPerPage = 25;
let totalCount = 0;
let userSetRowsPerPage = false;

let activeSearchKeyword = "";
let activeSortColumn = null;
let sortDirection = {};

const sortMap = {
    first_name: "first_name",
    last_name: "last_name",
    email: "email",
    phone: "phone",
    city: "city",
    country: "country",
    loyalty_level: "loyalty_level",
    loyalty_points: "loyalty_points"
};

function buildBaseQuery(forCount = false){

    let query;

    if(forCount){
        query = supabaseClient.from("guest_list_view").select("*", { count: "exact", head: true });
    } else {
        query = supabaseClient.from("guest_list_view").select("*");
    }

    if(activeSearchKeyword){
        const kw = activeSearchKeyword;
        query = query.or(`first_name.ilike.%${kw}%,last_name.ilike.%${kw}%,email.ilike.%${kw}%,phone.ilike.%${kw}%,city.ilike.%${kw}%,country.ilike.%${kw}%`);
    }

    return query;

}

function buildDataQuery(){

    let query = buildBaseQuery(false);

    if(activeSortColumn){
        const dbColumn = sortMap[activeSortColumn];
        if(dbColumn) query = query.order(dbColumn, { ascending: sortDirection[activeSortColumn] === "asc" });
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
        const dbColumn = sortMap[activeSortColumn];
        if(dbColumn) query = query.order(dbColumn, { ascending: sortDirection[activeSortColumn] === "asc" });
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
    const sampleRow = document.querySelector("#guestTable tr");
    return sampleRow ? sampleRow.getBoundingClientRect().height : 41;
}

function calculateRowsPerPage(){

    const scrollContainer = document.querySelector(".table-scroll");
    if(!scrollContainer) return rowsPerPage;

    const thead = document.querySelector(".table-container thead");
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