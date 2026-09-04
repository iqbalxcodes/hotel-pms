// ======================================================
// tableScrollEdge.js
// Edge-hover scroll card. Nempel otomatis ke semua .table-scroll
// yang overflow horizontal. Native scroll manual tetap jalan.
// position:fixed + koordinat viewport -- card gak ikut kescroll
// pas isi .table-scroll discroll horizontal.
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

        container.appendChild(leftCard);
        container.appendChild(rightCard);

        leftCard.addEventListener("click", () => {
            container.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
        });

        rightCard.addEventListener("click", () => {
            container.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
        });

        function hideBoth(){
            leftCard.style.display = "none";
            rightCard.style.display = "none";
        }

        container.addEventListener("pointermove", (e) => {

            const hasOverflow = container.scrollWidth > container.clientWidth;

            if(!hasOverflow){
                hideBoth();
                return;
            }

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;

            const canLeft = container.scrollLeft > 0;
            const canRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 1;

            const nearLeft = x <= EDGE_ZONE && canLeft;
            const nearRight = x >= rect.width - EDGE_ZONE && canRight;

            leftCard.style.display = nearLeft ? "flex" : "none";
            rightCard.style.display = nearRight ? "flex" : "none";

            const topPx = e.clientY - CARD_H / 2;

            if(nearLeft){
                leftCard.style.top = topPx + "px";
                leftCard.style.left = (rect.left + 4) + "px";
            }

            if(nearRight){
                rightCard.style.top = topPx + "px";
                rightCard.style.left = (rect.right - CARD_W - 4) + "px";
            }

        });

        container.addEventListener("pointerleave", hideBoth);
        container.addEventListener("scroll", hideBoth);

    }

    document.addEventListener("DOMContentLoaded", () => {

        document.querySelectorAll(".table-scroll").forEach(setupEdgeScroll);

    });

})();