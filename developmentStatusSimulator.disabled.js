// ======================================================
// Development Reservation Status Simulator
// ======================================================

const DEV_MODE = true;

const SIMULATE_ONLY_EMPTY_STATUS = false;

const SIMULATION_KEY =
    "hotel_pms_last_simulation_date";

// ======================================================
// Random Helper
// ======================================================

function randomStatus(probabilities){

    const random = Math.random() * 100;

    let total = 0;


    for(const item of probabilities){

        total += item.percent;

        if(random <= total){
            return item.status;
        }

    }


    return probabilities[probabilities.length - 1].status;

}



// ======================================================
// Main Simulator
// ======================================================

async function simulateReservationStatus(){

    if(!DEV_MODE){
        return;
    }


    const today =
        new Date()
        .toISOString()
        .split("T")[0];


    const lastSimulation =
        localStorage.getItem(
            SIMULATION_KEY
        );


    if(lastSimulation === today){

        console.log(
            "Simulator already executed today"
        );

        return;

    }


    localStorage.setItem(
        SIMULATION_KEY,
        today
    );
