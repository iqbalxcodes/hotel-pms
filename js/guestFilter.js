// ======================================================
// guestFilter.js
// ======================================================

// ======================================================
// Pagination & Search State
// ======================================================

let currentPage = 1;
let rowsPerPage = 25; // number or "all"
let totalCount = 0;
let userSetRowsPerPage = false; // true kalau user sudah set manual lewat input

let activeSearchKeyword = "";
let activeSortColumn = null;
let sortDirection = {};

const sortMap = {

    salutation: "salutation",
    first_name: "first_name",
    last_name: "last_name",
    email: "email",
    phone: "phone",
    city: "city",
    country: "country",
    loyalty_level: "loyalty_level",
    loyalty_points: "loyalty_points"

};


// ======================================================
// Base Query (search filter, shared by data/count/export)
// ======================================================

function buildBaseQuery(forCount = false){

    let query;

    if(forCount){

        query =
            supabaseClient
            .from("guests")
            .select("*", { count: "exact", head: true });

    }
    else{

        query =
            supabaseClient
            .from("guests")
            .select("*");

    }

    if(activeSearchKeyword){

        const kw = activeSearchKeyword;

        const filter =
            `first_name.ilike.%${kw}%,last_name.ilike.%${kw}%,email.ilike.%${kw}%,phone.ilike.%${kw}%,city.ilike.%${kw}%,country.ilike.%${kw}%`;

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

        query = query.order("id", { ascending: false });

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
        document.querySelector("#guestTable tr");

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

    // Kalau user sudah pilih jumlah baris sendiri, jangan
    // ditimpa lagi sama auto-fit saat resize window.
    if(userSetRowsPerPage){

        return;

    }

    const newRowsPerPage =
        calculateRowsPerPage();

    if(newRowsPerPage !== rowsPerPage && newRowsPerPage > 0){

        rowsPerPage = newRowsPerPage;
        currentPage = 1;

        await refreshTable();

    }

}