// ======================================================
// reservationFilter.js
// ======================================================

// ======================================================
// Reservation Filter State
// ======================================================

let currentDate = new Date();

let currentScope = "today";
// today
// entire


let currentMode = "arrival";
// arrival
// departure
// inhouse
// pending
// cancelled



// ======================================================
// Date Helper
// ======================================================

function formatDate(date){

    const year = date.getFullYear();

    const month =
        String(date.getMonth()+1)
        .padStart(2,"0");

    const day =
        String(date.getDate())
        .padStart(2,"0");


    return `${year}-${month}-${day}`;

}



// ======================================================
// Toolbar Label
// ======================================================

const DAYS = [

    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"

];


function getDynamicDateLabel(){

    const today = new Date();

    today.setHours(0,0,0,0);


    const compare = new Date(currentDate);

    compare.setHours(0,0,0,0);


    const diff =
        Math.round(
            (compare - today)
            /
            (1000*60*60*24)
        );


    if(diff === 0){

        return "Today's";

    }


    if(diff === -1){

        return "Yesterday's";

    }


    if(diff === 1){

        return "Tomorrow's";

    }


    return DAYS[currentDate.getDay()] + "'s";

}




function updateToolbar(count=null){


    const dateLabel =
        getDynamicDateLabel();



    const scope =
        document.getElementById(
            "dateScope"
        );


    if(scope){

        scope.options[0].text =
            dateLabel;

    }


    const dateInput =
        document.getElementById(
            "currentDate"
        );


    if(dateInput){

        dateInput.value =
            formatDate(currentDate);

    }
}






// ======================================================
// Query Builder
// ======================================================

function buildReservationQuery(){


    let query =
        supabaseClient
        .from("reservation")
        .select("*");



    const date =
        formatDate(currentDate);



    if(currentScope === "today"){


        switch(currentMode){


            case "arrival":

                query =
                    query.eq(
                        "arrival_date",
                        date
                    );

                break;



            case "departure":

                query =
                    query.eq(
                        "departure_date",
                        date
                    );

                break;



            case "inhouse":

                query =
                    query
                    .lte(
                        "arrival_date",
                        date
                    )
                    .gte(
                        "departure_date",
                        date
                    )
                    .eq(
                        "status",
                        "CHECKED_IN"
                    );

                break;



            case "pending":

                query =
                    query.eq(
                        "status",
                        "RESERVED"
                    );

                break;



            case "cancelled":

                query =
                    query.eq(
                        "status",
                        "CANCELLED"
                    );

                break;


        }


    }


    else{


        switch(currentMode){


            case "arrival":

                query =
                    query.order(
                        "arrival_date"
                    );

                break;



            case "departure":

                query =
                    query.order(
                        "departure_date"
                    );

                break;



            case "inhouse":

                query =
                    query.eq(
                        "status",
                        "CHECKED_IN"
                    );

                break;



            case "pending":

                query =
                    query.eq(
                        "status",
                        "RESERVED"
                    );

                break;



            case "cancelled":

                query =
                    query.eq(
                        "status",
                        "CANCELLED"
                    );

                break;


        }


    }



    return query;

}



// ======================================================
// Filter Controller
// ======================================================


function changeMode(value){

    currentMode = value;

    updateToolbar();

    loadReservations();

}



function changeDateScope(value){

    currentScope = value;

    updateToolbar();

    loadReservations();

}



function changeDate(step){


    currentDate.setDate(

        currentDate.getDate()
        +
        step

    );


    updateToolbar();

    loadReservations();


}



function changeSelectedDate(value){


    currentDate =
        new Date(value);



    updateToolbar();

    loadReservations();


}

async function updateFilterCount(){

    const date = formatDate(currentDate);

    const counts = {};

    const modes = [
        "arrival",
        "departure",
        "inhouse",
        "pending",
        "cancelled"
    ];

    for(const key of modes){

        let query =
            supabaseClient
            .from("reservation")
            .select("*", {
                count: "exact",
                head: true
            });

        switch(key){

            case "arrival":

                query =
                    query.eq(
                        "arrival_date",
                        date
                    );

                break;


            case "departure":

                query =
                    query.eq(
                        "departure_date",
                        date
                    );

                break;


            case "inhouse":

                query =
                    query
                    .lte(
                        "arrival_date",
                        date
                    )
                    .gte(
                        "departure_date",
                        date
                    )
                    .eq(
                        "status",
                        "CHECKED_IN"
                    );

                break;


            case "pending":

                query =
                    query.eq(
                        "status",
                        "RESERVED"
                    );

                if(currentScope === "today"){

                    query =
                        query.eq(
                            "arrival_date",
                            date
                        );

                }

                break;


            case "cancelled":

                query =
                    query.eq(
                        "status",
                        "CANCELLED"
                    );

                if(currentScope === "today"){

                    query =
                        query.eq(
                            "arrival_date",
                            date
                        );

                }

                break;

        }

        const { count, error } =
            await query;

        counts[key] =
            error
            ? 0
            : (count ?? 0);

    }

    updateDropdownText(counts);

}