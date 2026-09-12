// ======================================================
// statusBar.js
// CLEANED: bagian login/logout/isLoggedIn DICABUT -- itu udah
// jadi tanggung jawab auth.js (Supabase Auth beneran). Dulu
// dua-duanya define ulang hal yang sama (isLoggedIn sbg
// `let` di sini vs `function` di auth.js) -> kalau kedua file
// keload di HTML yang sama, SyntaxError redeclaration, seluruh
// script abis itu gak jalan.
//
// renderPaginationInfo() SENGAJA dikosongin (stub) atas
// permintaan -- bar #paginationInfo TETEP ada di DOM, cuma
// gak diisi apa-apa lagi. Dibiarin gitu buat dipake lagi nanti.
// ======================================================

// contextMode: "message" | "confirm"
let contextMode = "message";

let lastMessage = { text: "Ready", type: "info" };
let messageCount = 0;


// ======================================================
// Context Area (message / confirm)
// ======================================================

function renderContextArea(){

    const el = document.getElementById("contextArea");
    if(!el) return;

    if(contextMode === "confirm" && activeConfirm){

        el.innerHTML = `
            <span class="status-confirm">
                ⚠ ${activeConfirm.text}
                <button onclick="resolveConfirm(true)">Yes</button>
                <button onclick="resolveConfirm(false)">No</button>
            </span>
        `;

        return;

    }

    // default: message mode
    const iconMap = {
        success: "✓",
        error: "✕",
        info: "ℹ"
    };

    const icon = iconMap[lastMessage.type] || "ℹ";

    el.innerHTML = `
        <span class="status-msg-${lastMessage.type}">
            🔔 ${messageCount} ${icon} ${lastMessage.text}
        </span>
    `;

}


// ======================================================
// Public API: showMessage / showDevMessage
// ======================================================

function showMessage(text, type = "info"){

    lastMessage = { text, type };
    messageCount += 1;

    contextMode = "message";

    renderContextArea();

}

function showDevMessage(feature){

    showMessage(`${feature} — Function under development`, "info");

}


// ======================================================
// Public API: showConfirm (action requiring Yes/No)
// ======================================================

let activeConfirm = null;

function showConfirm(text, onYes, onNo){

    activeConfirm = { text, onYes, onNo };

    contextMode = "confirm";

    renderContextArea();

}

function resolveConfirm(answer){

    const confirmRef = activeConfirm;

    activeConfirm = null;
    contextMode = "message";

    if(!confirmRef){

        renderContextArea();
        return;

    }

    if(answer && typeof confirmRef.onYes === "function"){

        confirmRef.onYes();

    }
    else if(!answer && typeof confirmRef.onNo === "function"){

        confirmRef.onNo();

    }
    else{

        renderContextArea();

    }

}


// ======================================================
// Pagination Info -- STUB. Bar #paginationInfo dibiarin ada
// di DOM (jangan dihapus dari HTML), tapi gak diisi apa-apa.
// Efek samping: rows-per-page hover popover (yang nempel di
// elemen ini) ikut nonaktif buat sementara -- itu udah
// diketahui & diterima, bukan bug.
// ======================================================

function renderPaginationInfo(){
    // sengaja kosong
}


// ======================================================
// Pagination Nav
// ======================================================

function renderPaginationNav(){

    const el = document.getElementById("paginationNav");
    if(!el) return;

    const totalPages = getTotalPages();

    const windowStart = Math.max(1, currentPage - 2);
    const windowEnd = Math.min(totalPages, windowStart + 4);

    let pageButtons = "";

    for(let p = windowStart; p <= windowEnd; p++){

        pageButtons += `
            <button
                class="${p === currentPage ? 'active-page' : ''}"
                onclick="goToPage(${p})"
            >${p}</button>
        `;

    }

    el.innerHTML = `
        <button onclick="goToPage(1)" ${currentPage <= 1 ? "disabled" : ""}>«</button>
        <button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? "disabled" : ""}>‹</button>
        ${pageButtons}
        <button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? "disabled" : ""}>›</button>
        <button onclick="goToPage(${totalPages})" ${currentPage >= totalPages ? "disabled" : ""}>»</button>
    `;

}

function goToPage(page){

    const totalPages = getTotalPages();

    if(page < 1 || page > totalPages || page === currentPage){

        if(page === currentPage){

            return;

        }

    }

    currentPage = Math.min(Math.max(page, 1), totalPages);

    refreshTable();

}

function renderPaginationBar(){

    renderPaginationInfo();
    renderPaginationNav();

}


// ======================================================
// Init -- renderUserArea() DICABUT dari sini, itu tanggung
// jawab auth.js (dipanggil dari initAuth -> handleAuthChange).
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    renderContextArea();
    renderPaginationInfo();
    renderPaginationNav();

});