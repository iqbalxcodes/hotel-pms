// ======================================================
// SHARED NAVIGATION
// ======================================================

const PMS_NAVIGATION = [
    {
        label: "Room Rack",
        href: "room-rack.html",
        page: "room-rack"
    },
    {
        label: "Reservation List",
        href: "index.html",
        page: "reservations"
    },
    {
        label: "Room Management",
        href: "room.html",
        page: "room-management"
    },
    {
        label: "Guest List",
        href: "guest.html",
        page: "guests"
    },
    {
        label: "Cashiering",
        href: "#",
        page: "cashiering",
        development: true
    }
];

function renderNavigation() {

    const container = document.getElementById("pageNavigation");

    if (!container) return;

    const currentPage = container.dataset.page;

    const nav = document.createElement("div");
    nav.className = "rack-tabs";

    PMS_NAVIGATION.forEach(item => {

        const isActive = item.page === currentPage;

        if (item.development) {

            const tab = document.createElement("a");

            tab.className = `rack-tab${isActive ? " active" : ""}`;
            tab.href = "#";
            tab.textContent = item.label;

            tab.addEventListener("click", function (event) {
                event.preventDefault();

                if (typeof showDevMessage === "function") {
                    showDevMessage(item.label);
                } else {
                    alert(`${item.label} is currently under development.`);
                }
            });

            nav.appendChild(tab);

        } else {

            const tab = document.createElement("a");

            tab.className = `rack-tab${isActive ? " active" : ""}`;
            tab.href = item.href;
            tab.textContent = item.label;

            nav.appendChild(tab);
        }
    });

    container.replaceWith(nav);
}

document.addEventListener("DOMContentLoaded", renderNavigation);