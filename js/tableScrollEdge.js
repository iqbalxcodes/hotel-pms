// ======================================================
// tableScrollEdge.js
// Edge-hover scroll card. Nempel otomatis ke semua .table-scroll
// yang overflow horizontal. Native scroll manual tetap jalan.
// FIXED: dulu di-hide paksa tiap event "scroll", jadi kalau user
// klik card buat scroll (smooth-scroll nembak banyak event scroll),
// card langsung ilang di tengah animasi sendiri -> "macet-macet".
// Sekarang recalc pakai posisi mouse TERAKHIR, gak hide paksa.
// ======================================================

(function(){

    const EDGE_ZONE = 32;
    const SCROLL_STEP = 220;
    const CARD_W = 28;
    const CARD_H = 36;

    function makeCard(side){

        const card = document.createElement("div");
        card.className = `table-scroll-edge-card edge-${side}`;
        card.textContent = side === "left" ? "‹" : "›";
        card.style.cssText = `
            position:fixed; z-index:20; display:none;
            width:${CARD_W}px; height:${CARD_H}px;
            align-items:center; justify-content:center;
            background:#fff; border:1px solid #ccc; border-radius:4px;
            box-shadow:0 2px 6px rgba(0,0,0,0.15);
            cursor:pointer; font-size:14px; color:#444; user-select:none;
        `;

        return card;

    }

    function setupEdgeScroll(container){

        if(container.dataset.edgeScrollReady) return;
        container.dataset.edgeScrollReady = "1";

        const leftCard = makeCard("left");
        const rightCard = makeCard("right");

        document.body.appendChild(leftCard);
        document.body.appendChild(rightCard);

        let lastX = null, lastY = null, isOver = false;

        function recalc(){

            if(!isOver || lastX === null){
                leftCard.style.display = "none";
                rightCard.style.display = "none";
                return;
            }

            const hasOverflow = container.scrollWidth > container.clientWidth;

            if(!hasOverflow){
                leftCard.style.display = "none";
                rightCard.style.display = "none";
                return;
            }

            const rect = container.getBoundingClientRect();
            const x = lastX - rect.left;

            const canLeft = container.scrollLeft > 0;
            const canRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 1;

            const nearLeft = x <= EDGE_ZONE && canLeft;
            const nearRight = x >= rect.width - EDGE_ZONE && canRight;

            leftCard.style.display = nearLeft ? "flex" : "none";
            rightCard.style.display = nearRight ? "flex" : "none";

            const topPx = lastY - CARD_H / 2;

            if(nearLeft){
                leftCard.style.top = topPx + "px";
                leftCard.style.left = (rect.left + 4) + "px";
            }

            if(nearRight){
                rightCard.style.top = topPx + "px";
                rightCard.style.left = (rect.right - CARD_W - 4) + "px";
            }

        }

        leftCard.addEventListener("click", () => {
            container.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
        });

        rightCard.addEventListener("click", () => {
            container.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
        });

        container.addEventListener("pointerenter", () => { isOver = true; });

        container.addEventListener("pointermove", (e) => {
            lastX = e.clientX;
            lastY = e.clientY;
            isOver = true;
            recalc();
        });

        container.addEventListener("pointerleave", () => {
            isOver = false;
            lastX = null; lastY = null;
            leftCard.style.display = "none";
            rightCard.style.display = "none";
        });

        // FIX INTI: recalc pakai posisi mouse terakhir, BUKAN hide paksa
        container.addEventListener("scroll", recalc);

        // kalau container resize (mis. sidebar dibuka/ditutup), recalc juga
        if (window.ResizeObserver) {
            new ResizeObserver(recalc).observe(container);
        }

    }

    function initAll(){
        document.querySelectorAll(".table-scroll").forEach(setupEdgeScroll);
    }

    document.addEventListener("DOMContentLoaded", initAll);

    // safety net: kalau ada .table-scroll yang dibuat dinamis SETELAH
    // DOMContentLoaded (fetch+innerHTML dll), rescan berkala biar tetap
    // ke-attach. Murah, cuma cek dataset flag.
    setInterval(initAll, 1000);

})();