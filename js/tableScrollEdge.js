// ======================================================
// tableScrollEdge.js
// Edge-hover scroll card. Nempel otomatis ke semua .table-scroll
// yang overflow horizontal. Native scroll manual tetap jalan.
// FIXED (v2): versi lama pakai pointerenter/pointerleave per
// container -- gampang "macet" (card nyangkut/nempel di posisi
// lama) kalau mouse ninggalin container lewat elemen lain yang
// overlap (mis. card kita sendiri, atau elemen fixed lain kayak
// ghost drag workspace). Sekarang pakai satu rAF loop global +
// posisi mouse terakhir, recalc SEMUA container tiap frame
// berdasarkan bounding rect murni -- gak bergantung event
// enter/leave yang bisa kebajak elemen overlap.
// ======================================================

(function(){

    const EDGE_ZONE = 32;
    const SCROLL_STEP = 220;
    const CARD_W = 28;
    const CARD_H = 36;

    const registry = []; // { container, leftCard, rightCard }

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

        leftCard.addEventListener("click", () => {
            container.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
        });

        rightCard.addEventListener("click", () => {
            container.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
        });

        registry.push({ container, leftCard, rightCard });

    }

    let mouseX = null, mouseY = null;

    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }, { passive: true });

    // kalau mouse beneran keluar viewport (bukan sekadar lewat elemen
    // lain), reset -- biar card gak nyangkut kalau user pindah window
    document.addEventListener("mouseleave", () => {
        mouseX = null;
        mouseY = null;
    });

    function tick(){

        if (mouseX !== null && mouseY !== null) {

            registry.forEach(({ container, leftCard, rightCard }) => {

                // container mungkin udah lepas dari DOM (halaman lama
                // di-unload dsb) -- skip aman
                if (!container.isConnected) return;

                const rect = container.getBoundingClientRect();
                const hasOverflow = container.scrollWidth > container.clientWidth;

                const insideX = mouseX >= rect.left && mouseX <= rect.right;
                const insideY = mouseY >= rect.top && mouseY <= rect.bottom;

                if (!hasOverflow || !insideX || !insideY) {
                    leftCard.style.display = "none";
                    rightCard.style.display = "none";
                    return;
                }

                const x = mouseX - rect.left;

                const canLeft = container.scrollLeft > 0;
                const canRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 1;

                const nearLeft = x <= EDGE_ZONE && canLeft;
                const nearRight = x >= rect.width - EDGE_ZONE && canRight;

                leftCard.style.display = nearLeft ? "flex" : "none";
                rightCard.style.display = nearRight ? "flex" : "none";

                const topPx = mouseY - CARD_H / 2;

                if (nearLeft) {
                    leftCard.style.top = topPx + "px";
                    leftCard.style.left = (rect.left + 4) + "px";
                }

                if (nearRight) {
                    rightCard.style.top = topPx + "px";
                    rightCard.style.left = (rect.right - CARD_W - 4) + "px";
                }

            });

        } else {

            registry.forEach(({ leftCard, rightCard }) => {
                leftCard.style.display = "none";
                rightCard.style.display = "none";
            });

        }

        requestAnimationFrame(tick);

    }

    requestAnimationFrame(tick);

    function initAll(){
        document.querySelectorAll(".table-scroll").forEach(setupEdgeScroll);
    }

    document.addEventListener("DOMContentLoaded", initAll);

    // safety net: kalau ada .table-scroll dibuat dinamis setelah
    // DOMContentLoaded (fetch+innerHTML dll), rescan berkala
    setInterval(initAll, 1000);

})();