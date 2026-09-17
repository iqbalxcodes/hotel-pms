// ======================================================
// statusBar.js
// Login/logout DICABUT dari bar ini (auth.js masih render
// #userArea, tapi disembunyikan lewat CSS #userArea{display:none}
// -- fungsi login-nya gak dihapus, cuma gak ditampilin di sini).
//
// Layout baru: [contextArea (kiri)] [flexible gap] [jam] [logo]
// #paginationInfo & #paginationNav DIPENSIUNKAN dari fungsi asli
// (pagination global) -- sekarang dipakai buat jam & logo.
// Halaman yang butuh pagination beneran (reservation, logs, room)
// udah punya footer paginationnya sendiri masing-masing.
// ======================================================

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
// Jam — #paginationInfo dipakai sebagai clock (dd/mm/yyyy hh:mm:ss)
// ======================================================

function renderStatusBarClock(){

    const el = document.getElementById("paginationInfo");
    if(!el) return;

    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    el.innerHTML = `<span class="sb-clock">${day}/${month}/${year} ${h}:${m}:${s}</span>`;

}


// ======================================================
// Logo — #paginationNav dipakai sebagai brand IqbalPMS
// ======================================================

function renderStatusBarLogo(){

    const el = document.getElementById("paginationNav");
    if(!el || el.dataset.sbLogoDone) return;

    el.dataset.sbLogoDone = "1";

    el.innerHTML = `
        <span class="sb-logo">
            <img src="/iqbalpms.png" alt="IqbalPMS">
            <span class="sb-logo-text">IqbalPMS</span>
        </span>
    `;

}

function renderPaginationBar(){
    renderStatusBarLogo();
}


// ======================================================
// Init
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    renderContextArea();
    renderStatusBarClock();
    renderStatusBarLogo();

    setInterval(renderStatusBarClock, 1000);

});