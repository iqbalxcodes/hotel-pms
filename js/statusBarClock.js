// ======================================================
// statusBarClock.js
// Cuma ngisi #paginationInfo (jam) & #paginationNav (logo)
// di statusBar bawah. Gak define showMessage/showConfirm --
// itu tetap punya masing2 halaman, biar gak redeclare.
// ======================================================

function sbRenderClock(){

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

function sbRenderLogo(){

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

document.addEventListener("DOMContentLoaded", () => {
    sbRenderClock();
    sbRenderLogo();
    setInterval(sbRenderClock, 1000);
});