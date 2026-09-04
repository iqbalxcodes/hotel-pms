// ======================================================
// roomFilter.js
// ======================================================

// ======================================================
// Pagination & Search State
// ======================================================

let currentPage = 1;
let rowsPerPage = 25; // number or "all"
let totalCount = 0;

let activeSearchKeyword = "";
let activeSortColumn = null;
let sortDirection = {};

const sortMap = {

    room_number: "room_number",
    room_type: "room_type",
    status: "status",
    notes: "notes",
    updated_at: "updated_at"

};


// ======================================================
// Base Query (search filter, shared by data/count/export)
// ======================================================

function buildBaseQuery(forCount = false){

    let query;

    if(forCount){

        query =
            supabaseClient
            .from("rooms")
            .select("*", { count: "exact", head: true });

    }
    else{

        query =
            supabaseClient
            .from("rooms")
            .select("*");

    }

    if(activeSearchKeyword){

        const kw = activeSearchKeyword;

        const filter =
            `room_number.ilike.%${kw}%,room_type.ilike.%${kw}%,notes.ilike.%${kw}%,status.ilike.%${kw}%`;

        query = query.or(filter);

    }

    return query;

}


// ======================================================
// Data Query (base + sort + pagination range)
// ======================================================

function buildDataQuery(){

    let query = buildBaseQuery(false);

    if(activeSortColumn){

        const dbColumn = sortMap[activeSortColumn];

        if(dbColumn){

            query =
                query.order(dbColumn, {
                    ascending: sortDirection[activeSortColumn] === "asc"
                });

        }

    }
    else{

        query = query.order("room_number", { ascending: true });

    }

    if(rowsPerPage !== "all"){

        const from = (currentPage - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;

        query = query.range(from, to);

    }

    return query;

}


// ======================================================
// Export Query (base + sort, NO pagination)
// ======================================================

function buildExportQuery(){

    let query = buildBaseQuery(false);

    if(activeSortColumn){

        const dbColumn = sortMap[activeSortColumn];

        if(dbColumn){

            query =
                query.order(dbColumn, {
                    ascending: sortDirection[activeSortColumn] === "asc"
                });

        }

    }

    return query;

}


// ======================================================
// Pagination Helpers
// ======================================================

function getTotalPages(){

    if(rowsPerPage === "all"){

        return 1;

    }

    return Math.max(1, Math.ceil(totalCount / rowsPerPage));

}

function clampCurrentPage(){

    const totalPages = getTotalPages();

    if(currentPage > totalPages){

        currentPage = totalPages;

    }

    if(currentPage < 1){

        currentPage = 1;

    }

}


// ======================================================
// Dynamic Rows Per Page (mengikuti tinggi layar device)
// ======================================================

function estimateRowHeight(){

    const sampleRow =
        document.querySelector("#roomTable tr");

    if(sampleRow){

        return sampleRow.getBoundingClientRect().height;

    }

    return 41;

}

function calculateRowsPerPage(){

    const scrollContainer =
        document.querySelector(".table-scroll");

    if(!scrollContainer){

        return rowsPerPage;

    }

    const thead =
        document.querySelector(".table-container thead");

    const containerHeight =
        scrollContainer.clientHeight;

    const theadHeight =
        thead
        ? thead.getBoundingClientRect().height
        : 41;

    const rowHeight =
        estimateRowHeight();

    const available =
        containerHeight - theadHeight;

    const computed =
        Math.floor(available / rowHeight);

    return Math.max(5, computed);

}

function debounce(fn, delay){

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(
            () => fn(...args),
            delay
        );

    };

}

async function adjustRowsPerPageAndRefresh(){

    const newRowsPerPage =
        calculateRowsPerPage();

    if(newRowsPerPage !== rowsPerPage && newRowsPerPage > 0){

        rowsPerPage = newRowsPerPage;
        currentPage = 1;

        await refreshTable();

    }

}