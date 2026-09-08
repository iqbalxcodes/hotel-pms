/*
|--------------------------------------------------------------------------
| HOTEL PMS - RESERVATION GENERATOR
|--------------------------------------------------------------------------
|
| Generates realistic reservation test data.
|
| TARGET:
|   200 reservations
|
| DATA MODEL:
|
| reservations
|       |
|       +---- reservation_rooms
|       |          |
|       |          +---- reservation_room_daily_rates
|       |
|       +---- reservation_guests
|       |
|       +---- reservation_status_history
|       |
|       +---- reservation_daily_rates
|                  (legacy compatibility)
|
|--------------------------------------------------------------------------
*/


const RESERVATION_GENERATOR_CONFIG = {

    reservationCount: 200,

    maxAttempts: 5000,

    guestPoolTarget: 250,

    pastDays: 30,

    futureDays: 60,

    minNights: 1,

    maxNights: 7,

    minNightlyRate: 90,

    maxNightlyRate: 240,

    taxPercent: 10,

    maxAdditionalGuests: 2,

    bookingChannels: [
        "DIRECT",
        "BOOKING_COM",
        "EXPEDIA",
        "WALK_IN",
        "PHONE",
        "EMAIL",
        "CORPORATE"
    ],

    marketSegments: [
        "LEISURE",
        "CORPORATE",
        "OTA",
        "WALK_IN"
    ],

    guaranteeTypes: [
        "CREDIT_CARD",
        "PREPAID",
        "NONE"
    ],

    specialRequests: [
        null,
        null,
        null,
        "High floor",
        "Quiet room",
        "Late check-in",
        "Early check-in",
        "Extra bed",
        "Baby cot",
        "Airport transfer",
        "Non-smoking room",
        "Twin beds",
        "King bed",
        "Away from elevator",
        "Connecting room",
        "Accessible room"
    ]
};


/* ==========================================================================
   INTERNATIONAL GUEST NAME DATABASE
   ========================================================================== */


/*
|--------------------------------------------------------------------------
| INDONESIAN NAMES
|--------------------------------------------------------------------------
|
| Majority of generated guests.
|
| Includes names commonly encountered across different Indonesian
| regional/cultural naming traditions.
|
|--------------------------------------------------------------------------
*/


const INDONESIAN_FIRST_NAMES = [

    // General Indonesian / Javanese
    "Agus",
    "Ahmad",
    "Aisyah",
    "Andi",
    "Angga",
    "Anisa",
    "Arif",
    "Arifin",
    "Bagus",
    "Bayu",
    "Bima",
    "Cahyo",
    "Dani",
    "Dewi",
    "Dian",
    "Dimas",
    "Eko",
    "Fajar",
    "Farah",
    "Fauzan",
    "Fitri",
    "Galih",
    "Hadi",
    "Hana",
    "Hendra",
    "Indah",
    "Intan",
    "Irfan",
    "Joko",
    "Laila",
    "Laras",
    "Maya",
    "Miftah",
    "Nadia",
    "Nanda",
    "Naufal",
    "Nia",
    "Nurul",
    "Putri",
    "Rafi",
    "Rahma",
    "Raka",
    "Rani",
    "Rizky",
    "Sari",
    "Satria",
    "Siska",
    "Siti",
    "Teguh",
    "Wahyu",
    "Wawan",
    "Yani",
    "Yanto",
    "Yoga",
    "Yudha",
    "Zahra",

    // Sundanese
    "Asep",
    "Cecep",
    "Dede",
    "Euis",
    "Iis",
    "Imas",
    "Neng",
    "Ujang",
    "Usep",
    "Yayan",

    // Javanese traditional
    "Bambang",
    "Bayu",
    "Dwi",
    "Endang",
    "Gunawan",
    "Hartono",
    "Jatmiko",
    "Kurniawan",
    "Purnomo",
    "Rahayu",
    "Slamet",
    "Suharto",
    "Sutanto",
    "Sutrisno",
    "Tri",
    "Widodo",
    "Wulandari",

    // Batak
    "Benny",
    "Binsar",
    "Bonar",
    "Debora",
    "Duma",
    "Frans",
    "Horas",
    "Hotman",
    "Josua",
    "Marta",
    "Maruli",
    "Natan",
    "Rinto",
    "Ronal",
    "Togar",

    // Minangkabau / West Sumatra
    "Aditya",
    "Afdhal",
    "Fadli",
    "Faisal",
    "Fitria",
    "Hafiz",
    "Nadia",
    "Rahmi",
    "Rizal",
    "Yuliana",

    // Bugis / Makassar
    "Andi",
    "Ammar",
    "Ayu",
    "Daeng",
    "Fahrul",
    "Ilham",
    "Irwan",
    "Mansur",
    "Nur",
    "Riska",
    "Syahrul",

    // Bali
    "Ayu",
    "Bagus",
    "Cokorda",
    "Desak",
    "Gede",
    "I Made",
    "I Gusti",
    "Kadek",
    "Komang",
    "Made",
    "Mangku",
    "Nyoman",
    "Putu",
    "Wayan",

    // Manado / North Sulawesi
    "Adrian",
    "Albert",
    "Billy",
    "Claudia",
    "Daniel",
    "Deisy",
    "Ellen",
    "Felix",
    "Frans",
    "Grace",
    "Melisa",
    "Ricky",
    "Stefan",
    "Steven",

    // Dayak / Kalimantan
    "Agustinus",
    "Benediktus",
    "Darius",
    "Dian",
    "Julius",
    "Markus",
    "Matius",
    "Yohanes",

    // Malay / Sumatra / Kalimantan
    "Azlan",
    "Farhan",
    "Hafiz",
    "Haris",
    "Irwan",
    "Rizwan",
    "Sofian",
    "Zulkifli",

    // Papua
    "Abraham",
    "Agustinus",
    "Andreas",
    "Elia",
    "Elias",
    "Gabriel",
    "Markus",
    "Marthinus",
    "Paulus",
    "Petrus",
    "Yohanis"
];


const INDONESIAN_LAST_NAMES = [

    // General Indonesian
    "Saputra",
    "Pratama",
    "Wijaya",
    "Santoso",
    "Setiawan",
    "Kurniawan",
    "Hidayat",
    "Nugraha",
    "Ramadhan",
    "Firmansyah",
    "Permana",
    "Maulana",
    "Suryadi",
    "Susanto",
    "Gunawan",
    "Wibowo",
    "Utomo",
    "Purnomo",
    "Suharto",
    "Hartono",
    "Sutanto",
    "Sutrisno",
    "Budiman",
    "Hermawan",
    "Pranoto",
    "Cahyono",
    "Raharjo",
    "Wicaksono",
    "Kusuma",
    "Prasetyo",

    // Sundanese
    "Somantri",
    "Herlawan",
    "Permadi",
    "Mulyana",
    "Suherman",
    "Hidayat",
    "Setiawan",
    "Maulana",

    // Batak
    "Siregar",
    "Simanjuntak",
    "Hutapea",
    "Hutabarat",
    "Panjaitan",
    "Nainggolan",
    "Sinaga",
    "Situmorang",
    "Manurung",
    "Napitupulu",
    "Tampubolon",
    "Siahaan",
    "Simatupang",
    "Pardede",

    // Minangkabau
    "Chaniago",
    "Koto",
    "Piliang",
    "Bodi",
    "Guci",
    "Tanjung",
    "Jambak",
    "Sikumbang",

    // Bugis / Makassar
    "Daeng",
    "Basri",
    "Mansyur",
    "Syamsuddin",
    "Mappangara",
    "Amiruddin",

    // Bali
    "Suardana",
    "Suarjaya",
    "Adnyana",
    "Mahendra",
    "Darmawan",
    "Wijaya",
    "Wardana",

    // Manado / Eastern Indonesia
    "Lumentut",
    "Rondonuwu",
    "Waworuntu",
    "Sondakh",
    "Sumual",
    "Tumiwa",
    "Lasut",

    // Dayak / Kalimantan
    "Bahar",
    "Jaya",
    "Langit",
    "Ukur",
    "Bandi",

    // Papua
    "Wonda",
    "Tabuni",
    "Yoman",
    "Wanimbo",
    "Kogoya",
    "Matuan",
    "Waromi"
];


/*
|--------------------------------------------------------------------------
| CHINESE INDONESIAN
|--------------------------------------------------------------------------
*/

const CHINESE_INDONESIAN_NAMES = [

    ["Kevin", "Tan"],
    ["Felicia", "Tjandra"],
    ["William", "Lim"],
    ["Michelle", "Wijaya"],
    ["Steven", "Kurniawan"],
    ["Jessica", "Lie"],
    ["Michael", "Kosasih"],
    ["Clara", "Halim"],
    ["Vincent", "Susanto"],
    ["Cynthia", "Tanuwijaya"],
    ["Daniel", "Hartanto"],
    ["Melinda", "Gunawan"],
    ["Jonathan", "Setiawan"],
    ["Monica", "Liem"],
    ["Jason", "Wong"],
    ["Veronica", "Suryanto"]
];


/*
|--------------------------------------------------------------------------
| CHINESE
|--------------------------------------------------------------------------
*/

const CHINESE_NAMES = [

    ["Wei", "Zhang"],
    ["Jing", "Li"],
    ["Chen", "Wang"],
    ["Yue", "Liu"],
    ["Hao", "Chen"],
    ["Xinyi", "Wang"],
    ["Ming", "Zhao"],
    ["Lin", "Huang"],
    ["Jun", "Wu"],
    ["Mei", "Yang"],
    ["Yifan", "Zhou"],
    ["Xiaoyu", "Xu"]
];


/*
|--------------------------------------------------------------------------
| JAPANESE
|--------------------------------------------------------------------------
*/

const JAPANESE_NAMES = [

    ["Haruto", "Sato"],
    ["Yuki", "Tanaka"],
    ["Hana", "Suzuki"],
    ["Daiki", "Takahashi"],
    ["Aoi", "Watanabe"],
    ["Ren", "Ito"],
    ["Sakura", "Yamamoto"],
    ["Kaito", "Nakamura"],
    ["Mei", "Kobayashi"],
    ["Riku", "Kato"],
    ["Yuna", "Yoshida"],
    ["Sota", "Yamada"]
];


/*
|--------------------------------------------------------------------------
| KOREAN
|--------------------------------------------------------------------------
*/

const KOREAN_NAMES = [

    ["Min-jun", "Kim"],
    ["Seo-yeon", "Lee"],
    ["Ji-hoon", "Park"],
    ["Ji-eun", "Choi"],
    ["Hyun-woo", "Jung"],
    ["Soo-jin", "Kang"],
    ["Joon-ho", "Cho"],
    ["Eun-ji", "Yoon"],
    ["Dong-hyun", "Jang"],
    ["Hye-jin", "Lim"],
    ["Tae-hyun", "Han"],
    ["Na-eun", "Shin"]
];


/*
|--------------------------------------------------------------------------
| TAIWANESE
|--------------------------------------------------------------------------
*/

const TAIWANESE_NAMES = [

    ["Wei-Ting", "Chen"],
    ["Yu-Han", "Lin"],
    ["Chia-Hao", "Wang"],
    ["Pei-Yu", "Huang"],
    ["Wei-Jie", "Liu"],
    ["Ting-Yu", "Tsai"],
    ["Chun-Hao", "Chang"],
    ["Ya-Ting", "Wu"],
    ["Po-Hsuan", "Lin"],
    ["Hsin-Yu", "Chen"]
];


/*
|--------------------------------------------------------------------------
| THAI
|--------------------------------------------------------------------------
*/

const THAI_NAMES = [

    ["Narin", "Sukhum"],
    ["Pimchanok", "Kittisak"],
    ["Thanawat", "Chaiyaporn"],
    ["Nattaya", "Srisuk"],
    ["Krit", "Wongsa"],
    ["Siriporn", "Kanchana"],
    ["Phanupong", "Somsak"],
    ["Araya", "Prasert"]
];


/*
|--------------------------------------------------------------------------
| INDIAN
|--------------------------------------------------------------------------
*/

const INDIAN_NAMES = [

    ["Aarav", "Sharma"],
    ["Ananya", "Patel"],
    ["Arjun", "Mehta"],
    ["Priya", "Kapoor"],
    ["Rahul", "Verma"],
    ["Neha", "Shah"],
    ["Vikram", "Rao"],
    ["Kavya", "Iyer"],
    ["Rohan", "Gupta"],
    ["Sneha", "Nair"],
    ["Aditya", "Joshi"],
    ["Diya", "Malhotra"],
    ["Raj", "Desai"],
    ["Anika", "Reddy"]
];


/*
|--------------------------------------------------------------------------
| ARAB / MIDDLE EASTERN
|--------------------------------------------------------------------------
*/

const ARAB_NAMES = [

    ["Omar", "Al-Hassan"],
    ["Layla", "Al-Mansouri"],
    ["Ahmed", "Al-Rashid"],
    ["Fatima", "Al-Sayed"],
    ["Youssef", "Haddad"],
    ["Mariam", "Khalil"],
    ["Khalid", "Rahman"],
    ["Noura", "Ibrahim"],
    ["Samir", "Hassan"],
    ["Leila", "Mansour"],
    ["Tariq", "Abdullah"],
    ["Sara", "Mahmoud"]
];


/*
|--------------------------------------------------------------------------
| WESTERN
|--------------------------------------------------------------------------
*/

const WESTERN_NAMES = [

    ["James", "Anderson"],
    ["Olivia", "Williams"],
    ["William", "Johnson"],
    ["Emma", "Brown"],
    ["Henry", "Miller"],
    ["Sophia", "Davis"],
    ["Jack", "Wilson"],
    ["Amelia", "Moore"],
    ["Thomas", "Taylor"],
    ["Charlotte", "Martin"],
    ["Daniel", "Thompson"],
    ["Emily", "White"],
    ["Alexander", "Harris"],
    ["Grace", "Clark"],
    ["Benjamin", "Lewis"],
    ["Ella", "Walker"],
    ["Lucas", "Hall"],
    ["Mia", "Allen"],
    ["Noah", "Young"],
    ["Isabella", "King"]
];


/* ==========================================================================
   HELPERS
   ========================================================================== */

function randomItem(array) {

    if (
        !array ||
        array.length === 0
    ) {
        return null;
    }

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];
}


function randomInt(min, max) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;
}


function randomBoolean(
    probability = 0.5
) {

    return Math.random() < probability;
}


function randomMoney(
    min,
    max
) {

    return Number(
        (
            min +
            Math.random() *
            (max - min)
        ).toFixed(2)
    );
}


function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


function startOfToday() {

    const date =
        new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}


function addDays(
    date,
    days
) {

    const result =
        new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
}


function datesOverlap(
    arrivalA,
    departureA,
    arrivalB,
    departureB
) {

    return (
        arrivalA < departureB &&
        departureA > arrivalB
    );
}

/* ==========================================================================
   ROOM TYPES
   ========================================================================== */

async function getGeneratorRoomTypes(
    propertyId
) {

    const {
        data,
        error
    } = await supabaseClient
        .from("room_types")
        .select(`
            id,
            property_id,
            code,
            name,
            max_adults,
            max_children,
            base_occupancy,
            status
        `)
        .eq(
            "property_id",
            propertyId
        )
        .eq(
            "status",
            "ACTIVE"
        )
        .order("code");


    if (error) {
        throw error;
    }


    return data || [];
}


/* ==========================================================================
   ROOMS
   ========================================================================== */

async function getGeneratorRooms(
    propertyId
) {

    const {
        data,
        error
    } = await supabaseClient
        .from("rooms")
        .select(`
            id,
            property_id,
            room_type_id,
            room_number,
            floor,
            bed_type,
            view,
            smoking,
            accessible,
            balcony,
            air_conditioning,
            minibar,
            safe,
            near_elevator,
            quiet_room,
            connecting_room_id,
            housekeeping_status,
            operational_status
        `)
        .eq(
            "property_id",
            propertyId
        )
        .eq(
            "operational_status",
            "OPEN"
        )
        .not(
            "housekeeping_status",
            "in",
            "(OUT_OF_ORDER,OUT_OF_SERVICE)"
        )
        .order("room_number");


    if (error) {
        throw error;
    }


    return data || [];
}


/* ==========================================================================
   RATE PLANS
   ========================================================================== */

async function getGeneratorRatePlans(
    propertyId
) {

    const {
        data,
        error
    } = await supabaseClient
        .from("rate_plans")
        .select(`
            id,
            property_id,
            code,
            name,
            meal_plan,
            refundable,
            cancellation_policy,
            status
        `)
        .eq(
            "property_id",
            propertyId
        )
        .eq(
            "status",
            "ACTIVE"
        )
        .order("code");


    if (error) {
        throw error;
    }


    return data || [];
}


/* ==========================================================================
   GUEST NAME GENERATOR
   ========================================================================== */


/*
|--------------------------------------------------------------------------
| Distribution
|--------------------------------------------------------------------------
|
| 70% Indonesian
| 5% Chinese Indonesian
| 5% Chinese
| 4% Japanese
| 4% Korean
| 3% Taiwanese
| 3% Thai
| 3% Indian
| 2% Arab
| 1% Western
|
|--------------------------------------------------------------------------
*/

function generateInternationalName() {

    const roll =
        Math.random();


    if (roll < 0.70) {

        return {
            first_name:
                randomItem(
                    INDONESIAN_FIRST_NAMES
                ),

            last_name:
                randomItem(
                    INDONESIAN_LAST_NAMES
                ),

            nationality:
                "ID"
        };
    }


    if (roll < 0.75) {

        const name =
            randomItem(
                CHINESE_INDONESIAN_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "ID"
        };
    }


    if (roll < 0.80) {

        const name =
            randomItem(
                CHINESE_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "CN"
        };
    }


    if (roll < 0.84) {

        const name =
            randomItem(
                JAPANESE_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "JP"
        };
    }


    if (roll < 0.88) {

        const name =
            randomItem(
                KOREAN_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "KR"
        };
    }


    if (roll < 0.91) {

        const name =
            randomItem(
                TAIWANESE_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "TW"
        };
    }


    if (roll < 0.94) {

        const name =
            randomItem(
                THAI_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "TH"
        };
    }


    if (roll < 0.97) {

        const name =
            randomItem(
                INDIAN_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "IN"
        };
    }


    if (roll < 0.99) {

        const name =
            randomItem(
                ARAB_NAMES
            );

        return {

            first_name:
                name[0],

            last_name:
                name[1],

            nationality:
                "AE"
        };
    }


    const name =
        randomItem(
            WESTERN_NAMES
        );


    return {

        first_name:
            name[0],

        last_name:
            name[1],

        nationality:
            "US"
    };
}


/* ==========================================================================
   GUEST DATABASE
   ========================================================================== */

async function getGeneratorGuests(
    organizationId
) {

    const {
        data,
        error
    } = await supabaseClient
        .from("guests")
        .select(`
            id,
            organization_id,
            profile_type,
            first_name,
            last_name,
            display_name,
            email,
            phone,
            address_line1,
            city,
            country_code,
            nationality,
            date_of_birth,
            loyalty_tier_id,
            loyalty_points_balance,
            vip_level,
            notes
        `)
        .eq(
            "organization_id",
            organizationId
        )
        .order("created_at");


    if (error) {
        throw error;
    }


    return data || [];
}


/* ==========================================================================
   CREATE INTERNATIONAL GUEST POOL
   ========================================================================== */

async function ensureInternationalGuestPool(
    organizationId,
    existingGuests
) {

    const target =
        RESERVATION_GENERATOR_CONFIG.guestPoolTarget;


    if (
        existingGuests.length >= target
    ) {

        return existingGuests;
    }


    const existingEmails =
        new Set(
            existingGuests
                .map(
                    guest =>
                        guest.email
                )
                .filter(Boolean)
        );


    const guestsToCreate = [];


    let index = 1;


    while (
        existingGuests.length +
        guestsToCreate.length <
        target
    ) {

        const name =
            generateInternationalName();


        const email =
            `reservation.guest.${index}@demo-hotel.local`;


        index++;


        if (
            existingEmails.has(email)
        ) {
            continue;
        }


        existingEmails.add(email);


        const age =
            randomInt(
                18,
                75
            );


        const dob =
            new Date();


        dob.setFullYear(
            dob.getFullYear() -
            age
        );


        dob.setMonth(
            randomInt(0, 11)
        );


        dob.setDate(
            randomInt(1, 28)
        );


        const city =
            name.nationality === "ID"
                ? randomItem([
                    "Jakarta",
                    "Bandung",
                    "Surabaya",
                    "Medan",
                    "Semarang",
                    "Yogyakarta",
                    "Denpasar",
                    "Makassar",
                    "Palembang",
                    "Balikpapan",
                    "Banjarmasin",
                    "Manado",
                    "Pontianak",
                    "Jayapura",
                    "Padang",
                    "Pekanbaru"
                ])
                : randomItem([
                    "Singapore",
                    "Tokyo",
                    "Seoul",
                    "Taipei",
                    "Bangkok",
                    "Shanghai",
                    "Beijing",
                    "Mumbai",
                    "Dubai",
                    "London",
                    "New York",
                    "Sydney"
                ]);


        guestsToCreate.push({

            organization_id:
                organizationId,

            profile_type:
                "INDIVIDUAL",

            first_name:
                name.first_name,

            last_name:
                name.last_name,

            display_name:
                `${name.first_name} ${name.last_name}`,

            email:
                email,

            phone:
                `+49 170 ${String(
                    randomInt(
                        1000000,
                        9999999
                    )
                )}`,

            address_line1:
                `${randomInt(
                    1,
                    250
                )} Example Street`,

            city:
                city,

            country_code:
                name.nationality,

            nationality:
                name.nationality,

            date_of_birth:
                dob.toISOString()
                    .slice(0, 10),

            loyalty_tier_id:
                null,

            loyalty_points_balance:
                randomInt(
                    0,
                    5000
                ),

            vip_level:
                randomBoolean(0.05)
                    ? "VIP"
                    : null,

            notes:
                null
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Insert batches.
    |--------------------------------------------------------------------------
    */

    const batchSize =
        50;


    for (
        let i = 0;
        i < guestsToCreate.length;
        i += batchSize
    ) {

        const batch =
            guestsToCreate.slice(
                i,
                i + batchSize
            );


        const {
            error
        } = await supabaseClient
            .from("guests")
            .insert(batch);


        if (error) {

            throw error;
        }


        console.log(
            `Created international guest batch: ${batch.length}`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Reload guests
    |--------------------------------------------------------------------------
    */

    return await getGeneratorGuests(
        organizationId
    );
}


/* ==========================================================================
   EXISTING ROOM OCCUPANCY
   ========================================================================== */

async function getExistingRoomReservations(
    propertyId
) {

    const {
        data,
        error
    } = await supabaseClient
        .from("reservation_rooms")
        .select(`
            id,
            room_id,
            arrival_date,
            departure_date,
            status
        `)
        .eq(
            "property_id",
            propertyId
        )
        .not(
            "status",
            "in",
            "(CANCELLED,NO_SHOW)"
        );


    if (error) {
        throw error;
    }


    return data || [];
}


/* ==========================================================================
   OCCUPANCY CACHE
   ========================================================================== */

const reservationRoomOccupancy =
    new Map();


function initializeOccupancyCache(
    reservations
) {

    reservationRoomOccupancy.clear();


    for (
        const reservation
        of reservations
    ) {

        if (
            !reservation.room_id
        ) {
            continue;
        }


        if (
            !reservationRoomOccupancy.has(
                reservation.room_id
            )
        ) {

            reservationRoomOccupancy.set(
                reservation.room_id,
                []
            );
        }


        reservationRoomOccupancy
            .get(
                reservation.room_id
            )
            .push({

                arrival:
                    new Date(
                        `${reservation.arrival_date}T00:00:00`
                    ),

                departure:
                    new Date(
                        `${reservation.departure_date}T00:00:00`
                    )
            });
    }
}


function isRoomAvailable(
    roomId,
    arrival,
    departure
) {

    const occupancy =
        reservationRoomOccupancy
            .get(roomId) || [];


    return !occupancy.some(
        stay =>
            datesOverlap(
                arrival,
                departure,
                stay.arrival,
                stay.departure
            )
    );
}


function reserveRoomInCache(
    roomId,
    arrival,
    departure
) {

    if (
        !reservationRoomOccupancy.has(
            roomId
        )
    ) {

        reservationRoomOccupancy.set(
            roomId,
            []
        );
    }


    reservationRoomOccupancy
        .get(roomId)
        .push({

            arrival,
            departure
        });
}


/* ==========================================================================
   STAY DATE GENERATOR
   ========================================================================== */

function generateStay(
    status
) {

    const today =
        startOfToday();


    /*
    |--------------------------------------------------------------------------
    | Future reservations
    |--------------------------------------------------------------------------
    */

    if (
        status === "TENTATIVE" ||
        status === "CONFIRMED"
    ) {

        const arrival =
            addDays(
                today,
                randomInt(
                    1,
                    RESERVATION_GENERATOR_CONFIG.futureDays
                )
            );


        const nights =
            randomInt(
                RESERVATION_GENERATOR_CONFIG.minNights,
                RESERVATION_GENERATOR_CONFIG.maxNights
            );


        return {

            arrival,

            departure:
                addDays(
                    arrival,
                    nights
                )
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Checked in
    |--------------------------------------------------------------------------
    */

    if (
        status === "CHECKED_IN"
    ) {

        const arrival =
            addDays(
                today,
                -randomInt(
                    0,
                    3
                )
            );


        const departure =
            addDays(
                today,
                randomInt(
                    1,
                    5
                )
            );


        return {

            arrival,

            departure
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Checked out / no show
    |--------------------------------------------------------------------------
    */

    if (
        status === "CHECKED_OUT" ||
        status === "NO_SHOW"
    ) {

        const departure =
            addDays(
                today,
                -randomInt(
                    1,
                    RESERVATION_GENERATOR_CONFIG.pastDays
                )
            );


        const nights =
            randomInt(
                RESERVATION_GENERATOR_CONFIG.minNights,
                RESERVATION_GENERATOR_CONFIG.maxNights
            );


        return {

            arrival:
                addDays(
                    departure,
                    -nights
                ),

            departure
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Cancelled
    |--------------------------------------------------------------------------
    */

    const arrival =
        addDays(
            today,
            randomInt(
                1,
                RESERVATION_GENERATOR_CONFIG.futureDays
            )
        );


    const nights =
        randomInt(
            RESERVATION_GENERATOR_CONFIG.minNights,
            RESERVATION_GENERATOR_CONFIG.maxNights
        );


    return {

        arrival,

        departure:
            addDays(
                arrival,
                nights
            )
    };
}


/* ==========================================================================
   STATUS
   ========================================================================== */

function generateReservationStatus() {

    const roll =
        Math.random();


    if (roll < 0.05) {
        return "CANCELLED";
    }


    if (roll < 0.10) {
        return "NO_SHOW";
    }


    if (roll < 0.20) {
        return "CHECKED_OUT";
    }


    if (roll < 0.30) {
        return "CHECKED_IN";
    }


    if (roll < 0.45) {
        return "TENTATIVE";
    }


    return "CONFIRMED";
}


/* ==========================================================================
   ROOM STATUS
   ========================================================================== */

function getReservationRoomStatus(
    reservationStatus
) {

    switch (
        reservationStatus
    ) {

        case "CHECKED_IN":
            return "CHECKED_IN";

        case "CHECKED_OUT":
            return "CHECKED_OUT";

        case "CANCELLED":
            return "CANCELLED";

        case "NO_SHOW":
            return "NO_SHOW";

        default:
            return "RESERVED";
    }
}


/* ==========================================================================
   BOOKING CHANNEL
   ========================================================================== */

function getBookingChannel() {

    return randomItem(
        RESERVATION_GENERATOR_CONFIG
            .bookingChannels
    );
}


/* ==========================================================================
   MARKET SEGMENT
   ========================================================================== */

function getMarketSegment(
    bookingChannel
) {

    if (
        bookingChannel === "BOOKING_COM" ||
        bookingChannel === "EXPEDIA"
    ) {

        return "OTA";
    }


    if (
        bookingChannel === "CORPORATE"
    ) {

        return "CORPORATE";
    }


    if (
        bookingChannel === "WALK_IN"
    ) {

        return "WALK_IN";
    }


    return "LEISURE";
}


/* ==========================================================================
   COMMISSION
   ========================================================================== */

function getCommissionPercent(
    bookingChannel
) {

    if (
        bookingChannel === "BOOKING_COM" ||
        bookingChannel === "EXPEDIA"
    ) {

        return randomInt(
            15,
            18
        );
    }


    if (
        bookingChannel === "CORPORATE"
    ) {

        return randomInt(
            5,
            10
        );
    }


    return 0;
}


/* ==========================================================================
   STATUS TIMESTAMPS
   ========================================================================== */

function getStatusTimestamps(
    status
) {

    const result = {

        checked_in_at:
            null,

        checked_out_at:
            null,

        cancelled_at:
            null,

        cancellation_reason:
            null
    };


    if (
        status === "CHECKED_IN"
    ) {

        result.checked_in_at =
            new Date()
                .toISOString();
    }


    if (
        status === "CHECKED_OUT"
    ) {

        const date =
            new Date();


        date.setHours(
            randomInt(
                8,
                12
            ),

            randomInt(
                0,
                59
            ),

            0,

            0
        );


        result.checked_out_at =
            date.toISOString();
    }


    if (
        status === "CANCELLED"
    ) {

        result.cancelled_at =
            new Date()
                .toISOString();


        result.cancellation_reason =
            randomItem([

                "Guest cancellation",

                "Travel plan changed",

                "Duplicate reservation",

                "Payment issue",

                "OTA cancellation"
            ]);
    }


    return result;
}


/* ==========================================================================
   DAILY RATE GENERATOR
   ========================================================================== */

function generateDailyRates(
    arrival,
    departure,
    currency
) {

    const rates = [];


    let current =
        new Date(arrival);


    while (
        current < departure
    ) {

        const baseAmount =
            randomMoney(
                RESERVATION_GENERATOR_CONFIG
                    .minNightlyRate,

                RESERVATION_GENERATOR_CONFIG
                    .maxNightlyRate
            );


        const taxAmount =
            Number(
                (
                    baseAmount *
                    RESERVATION_GENERATOR_CONFIG
                        .taxPercent /
                    100
                ).toFixed(2)
            );


        const totalAmount =
            Number(
                (
                    baseAmount +
                    taxAmount
                ).toFixed(2)
            );


        rates.push({

            stay_date:
                formatDate(current),

            base_amount:
                baseAmount,

            tax_amount:
                taxAmount,

            total_amount:
                totalAmount,

            currency:
                currency || "EUR"
        });


        current =
            addDays(
                current,
                1
            );
    }


    return rates;
}


/* ==========================================================================
   ADDITIONAL GUESTS
   ========================================================================== */

function selectAdditionalGuests(
    guests,
    primaryGuest
) {

    if (
        guests.length <= 1
    ) {

        return [];
    }


    const candidates =
        guests.filter(
            guest =>
                guest.id !==
                primaryGuest.id
        );


    candidates.sort(
        () =>
            Math.random() - 0.5
    );


    const count =
        randomInt(
            0,
            Math.min(
                RESERVATION_GENERATOR_CONFIG
                    .maxAdditionalGuests,

                candidates.length
            )
        );


    return candidates.slice(
        0,
        count
    );
}


/* ==========================================================================
   GENERATE ONE RESERVATION
   ========================================================================== */

async function createGeneratedReservation({
    property,
    roomTypes,
    rooms,
    ratePlans,
    guests,
    appUserId,
    sequence
}) {

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    const status =
        generateReservationStatus();


    /*
    |--------------------------------------------------------------------------
    | Stay
    |--------------------------------------------------------------------------
    */

    const stay =
        generateStay(status);


    const arrivalDate =
        formatDate(
            stay.arrival
        );


    const departureDate =
        formatDate(
            stay.departure
        );


    /*
    |--------------------------------------------------------------------------
    | Room type
    |--------------------------------------------------------------------------
    */

    const roomType =
        randomItem(
            roomTypes
        );


    if (!roomType) {

        throw new Error(
            "No room type available."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Room
    |--------------------------------------------------------------------------
    */

    const matchingRooms =
        rooms.filter(
            room =>
                room.room_type_id ===
                roomType.id
        );


    const shuffledRooms =
        [...matchingRooms];


    shuffledRooms.sort(
        () =>
            Math.random() - 0.5
    );


    let room = null;


    for (
        const candidate
        of shuffledRooms
    ) {

        if (
            isRoomAvailable(
                candidate.id,
                stay.arrival,
                stay.departure
            )
        ) {

            room =
                candidate;

            break;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | No available room
    |--------------------------------------------------------------------------
    |
    | This is NOT an error.
    | Caller will skip the candidate.
    |--------------------------------------------------------------------------
    */

    if (!room) {

        return {

            success:
                false,

            reason:
                "NO_ROOM_AVAILABLE"
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Rate plan
    |--------------------------------------------------------------------------
    */

    const ratePlan =
        randomItem(
            ratePlans
        );


    if (!ratePlan) {

        throw new Error(
            "No rate plan available."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Guest
    |--------------------------------------------------------------------------
    */

    const primaryGuest =
        randomItem(
            guests
        );


    if (!primaryGuest) {

        throw new Error(
            "No guest available."
        );
    }


    const additionalGuests =
        selectAdditionalGuests(
            guests,
            primaryGuest
        );


    /*
    |--------------------------------------------------------------------------
    | Occupancy
    |--------------------------------------------------------------------------
    */

    const maxAdults =
        Math.max(
            1,
            Number(
                roomType.max_adults || 2
            )
        );


    const maxChildren =
        Math.max(
            0,
            Number(
                roomType.max_children || 0
            )
        );


    const adults =
        randomInt(
            1,
            Math.min(
                maxAdults,
                3
            )
        );


    const children =
        maxChildren > 0
            ? randomInt(
                0,
                Math.min(
                    maxChildren,
                    2
                )
            )
            : 0;


    /*
    |--------------------------------------------------------------------------
    | Booking data
    |--------------------------------------------------------------------------
    */

    const bookingChannel =
        getBookingChannel();


    const marketSegment =
        getMarketSegment(
            bookingChannel
        );


    const commissionPercent =
        getCommissionPercent(
            bookingChannel
        );


    const paymentCollect =
        (
            bookingChannel ===
                "BOOKING_COM" ||

            bookingChannel ===
                "EXPEDIA"
        )
            ? (
                randomBoolean(0.35)
                    ? "AGENCY_COLLECT"
                    : "HOTEL_COLLECT"
            )
            : "HOTEL_COLLECT";


    const guaranteeType =
        randomItem(
            RESERVATION_GENERATOR_CONFIG
                .guaranteeTypes
        );


    /*
    |--------------------------------------------------------------------------
    | Daily rates
    |--------------------------------------------------------------------------
    */

    const dailyRates =
        generateDailyRates(
            stay.arrival,
            stay.departure,
            property.currency
        );


    const roomRate =
        Number(
            dailyRates.reduce(
                (
                    total,
                    rate
                ) =>
                    total +
                    rate.base_amount,

                0
            ).toFixed(2)
        );


    const taxAmount =
        Number(
            dailyRates.reduce(
                (
                    total,
                    rate
                ) =>
                    total +
                    rate.tax_amount,

                0
            ).toFixed(2)
        );


    const totalAmount =
        Number(
            dailyRates.reduce(
                (
                    total,
                    rate
                ) =>
                    total +
                    rate.total_amount,

                0
            ).toFixed(2)
        );


    /*
    |--------------------------------------------------------------------------
    | Paid amount
    |--------------------------------------------------------------------------
    */

    let paidAmount = 0;


    if (
        status ===
        "CHECKED_OUT"
    ) {

        paidAmount =
            totalAmount;

    } else if (
        paymentCollect ===
        "AGENCY_COLLECT"
    ) {

        paidAmount =
            0;

    } else if (
        guaranteeType ===
        "PREPAID"
    ) {

        paidAmount =
            totalAmount;

    } else if (
        status ===
        "CHECKED_IN"
    ) {

        paidAmount =
            randomMoney(
                0,
                totalAmount
            );

    } else if (
        randomBoolean(0.25)
    ) {

        paidAmount =
            randomMoney(
                0,
                totalAmount
            );
    }


    /*
    |--------------------------------------------------------------------------
    | Commission
    |--------------------------------------------------------------------------
    */

    const commissionAmount =
        Number(
            (
                totalAmount *
                commissionPercent /
                100
            ).toFixed(2)
        );


    /*
    |--------------------------------------------------------------------------
    | Special request
    |--------------------------------------------------------------------------
    */

    const specialRequest =
        randomItem(
            RESERVATION_GENERATOR_CONFIG
                .specialRequests
        );


    /*
    |--------------------------------------------------------------------------
    | Confirmation
    |--------------------------------------------------------------------------
    */

    const confirmationNumber =
        `GEN-${Date.now()}-${String(
            sequence
        ).padStart(
            4,
            "0"
        )}-${randomInt(
            100,
            999
        )}`;


    /*
    |--------------------------------------------------------------------------
    | Status timestamps
    |--------------------------------------------------------------------------
    */

    const timestamps =
        getStatusTimestamps(
            status
        );


    /*
    |--------------------------------------------------------------------------
    | Legacy + normalized reservation header
    |--------------------------------------------------------------------------
    */

    const reservationPayload = {

        property_id:
            property.id,

        confirmation_number:
            confirmationNumber,

        guest_id:
            primaryGuest.id,

        group_id:
            null,

        status:
            status,

        /*
        | Legacy compatibility.
        */

        room_type_id:
            roomType.id,

        rate_plan_id:
            ratePlan.id,

        room_id:
            room.id,

        arrival_date:
            arrivalDate,

        departure_date:
            departureDate,

        adults:
            adults,

        children:
            children,

        additional_guest_names:
            additionalGuests
                .map(
                    guest =>
                        guest.display_name ||
                        `${guest.first_name} ${guest.last_name}`
                )
                .filter(Boolean)
                .join(", ") || null,

        booking_channel:
            bookingChannel,

        market_segment:
            marketSegment,

        guarantee_type:
            guaranteeType,

        special_requests:
            specialRequest,

        currency:
            property.currency || "EUR",

        room_rate:
            roomRate,

        tax_amount:
            taxAmount,

        total_amount:
            totalAmount,

        paid_amount:
            Number(
                paidAmount.toFixed(2)
            ),

        payment_collect:
            paymentCollect,

        commission_percent:
            commissionPercent,

        commission_amount:
            commissionAmount,

        checked_in_at:
            timestamps.checked_in_at,

        checked_out_at:
            timestamps.checked_out_at,

        cancelled_at:
            timestamps.cancelled_at,

        cancellation_reason:
            timestamps.cancellation_reason
    };


    /*
    |--------------------------------------------------------------------------
    | INSERT RESERVATION
    |--------------------------------------------------------------------------
    */

    const {
        data: reservation,
        error: reservationError
    } = await supabaseClient
        .from("reservations")
        .insert(
            reservationPayload
        )
        .select("id")
        .single();


    if (reservationError) {

        throw reservationError;
    }


    const reservationId =
        reservation.id;


    try {

        /*
        |--------------------------------------------------------------------------
        | reservation_rooms
        |--------------------------------------------------------------------------
        */

        const {
            data: reservationRoom,
            error: roomError
        } = await supabaseClient
            .from(
                "reservation_rooms"
            )
            .insert({

                reservation_id:
                    reservationId,

                property_id:
                    property.id,

                room_type_id:
                    roomType.id,

                rate_plan_id:
                    ratePlan.id,

                room_id:
                    room.id,

                arrival_date:
                    arrivalDate,

                departure_date:
                    departureDate,

                adults:
                    adults,

                children:
                    children,

                status:
                    getReservationRoomStatus(
                        status
                    )
            })
            .select("id")
            .single();


        if (roomError) {
            throw roomError;
        }


        /*
        |--------------------------------------------------------------------------
        | reservation_guests
        |--------------------------------------------------------------------------
        */

        const reservationGuests = [

            {
                reservation_id:
                    reservationId,

                guest_id:
                    primaryGuest.id,

                property_id:
                    property.id,

                role:
                    "PRIMARY",

                is_primary:
                    true,

                arrival_date:
                    arrivalDate,

                departure_date:
                    departureDate
            }
        ];


        /*
        |--------------------------------------------------------------------------
        | Additional guests
        |--------------------------------------------------------------------------
        */

        for (
            const guest
            of additionalGuests
        ) {

            reservationGuests.push({

                reservation_id:
                    reservationId,

                guest_id:
                    guest.id,

                property_id:
                    property.id,

                role:
                    "ADDITIONAL",

                is_primary:
                    false,

                arrival_date:
                    arrivalDate,

                departure_date:
                    departureDate
            });
        }


        const {
            error: guestsError
        } = await supabaseClient
            .from(
                "reservation_guests"
            )
            .insert(
                reservationGuests
            );


        if (guestsError) {
            throw guestsError;
        }


        /*
        |--------------------------------------------------------------------------
        | reservation_room_daily_rates
        |--------------------------------------------------------------------------
        */

        const normalizedRates =
            dailyRates.map(
                rate => ({

                    reservation_room_id:
                        reservationRoom.id,

                    stay_date:
                        rate.stay_date,

                    base_amount:
                        rate.base_amount,

                    tax_amount:
                        rate.tax_amount,

                    total_amount:
                        rate.total_amount,

                    currency:
                        rate.currency
                })
            );


        const {
            error: normalizedRatesError
        } = await supabaseClient
            .from(
                "reservation_room_daily_rates"
            )
            .insert(
                normalizedRates
            );


        if (
            normalizedRatesError
        ) {

            throw normalizedRatesError;
        }


        /*
        |--------------------------------------------------------------------------
        | Legacy reservation_daily_rates
        |--------------------------------------------------------------------------
        */

        const legacyRates =
            dailyRates.map(
                rate => ({

                    reservation_id:
                        reservationId,

                    stay_date:
                        rate.stay_date,

                    room_rate:
                        rate.base_amount,

                    tax_amount:
                        rate.tax_amount,

                    total_amount:
                        rate.total_amount,

                    currency:
                        rate.currency
                })
            );


        const {
            error: legacyRatesError
        } = await supabaseClient
            .from(
                "reservation_daily_rates"
            )
            .insert(
                legacyRates
            );


        /*
        |--------------------------------------------------------------------------
        | Legacy failure does NOT invalidate the new model.
        |--------------------------------------------------------------------------
        */

        if (
            legacyRatesError
        ) {

            console.warn(
                "Legacy daily rates failed:",
                legacyRatesError
            );
        }


        /*
        |--------------------------------------------------------------------------
        | reservation_status_history
        |--------------------------------------------------------------------------
        */

        const {
            error: historyError
        } = await supabaseClient
            .from(
                "reservation_status_history"
            )
            .insert({

                reservation_id:
                    reservationId,

                property_id:
                    property.id,

                old_status:
                    null,

                new_status:
                    status,

                changed_by:
                    appUserId,

                reason:
                    "Generated by development reservation generator"
            });


        if (historyError) {
            throw historyError;
        }


        /*
        |--------------------------------------------------------------------------
        | Update local occupancy cache
        |--------------------------------------------------------------------------
        */

        if (
            status !== "CANCELLED" &&
            status !== "NO_SHOW"
        ) {

            reserveRoomInCache(
                room.id,
                stay.arrival,
                stay.departure
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return {

            success:
                true,

            reservationId:
                reservationId,

            confirmationNumber:
                confirmationNumber,

            room:
                room,

            roomType:
                roomType,

            ratePlan:
                ratePlan,

            guest:
                primaryGuest,

            arrivalDate:
                arrivalDate,

            departureDate:
                departureDate,

            status:
                status,

            totalAmount:
                totalAmount
        };


    } catch (error) {

        /*
        |--------------------------------------------------------------------------
        | Cleanup legacy daily rates.
        |--------------------------------------------------------------------------
        */

        try {

            await supabaseClient
                .from(
                    "reservation_daily_rates"
                )
                .delete()
                .eq(
                    "reservation_id",
                    reservationId
                );

        } catch (
            cleanupError
        ) {

            console.warn(
                "Legacy cleanup failed:",
                cleanupError
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Delete reservation.
        |
        | Normalized child records should cascade.
        |--------------------------------------------------------------------------
        */

        await supabaseClient
            .from("reservations")
            .delete()
            .eq(
                "id",
                reservationId
            );


        throw error;
    }
}


/* ==========================================================================
   MAIN FUNCTION
   ==========================================================================
   
   This is the function called by:

   <button onclick="generateRandomReservations()">

========================================================================== */

async function generateRandomReservations() {

    const target =
        RESERVATION_GENERATOR_CONFIG
            .reservationCount;


    const confirmed =
        confirm(

            `Generate ${target} test reservations?\n\n` +

            `The generator will automatically:\n` +

            `• use the active property\n` +

            `• use all active room categories\n` +

            `• assign physical rooms\n` +

            `• generate different arrival/departure dates\n` +

            `• check room/date conflicts\n` +

            `• skip unavailable rooms\n` +

            `• generate international guests\n` +

            `• create normalized reservation records\n\n` +

            `Target: ${target} reservations`
        );


    if (!confirmed) {
        return;
    }


    console.clear();


    console.log(
        "=================================================="
    );

    console.log(
        "HOTEL PMS RESERVATION GENERATOR"
    );

    console.log(
        "=================================================="
    );


    try {

        /*
        |--------------------------------------------------------------------------
        | PROPERTY
        |--------------------------------------------------------------------------
        */

        const property =
            await getActiveProperty();


        console.log(
            "Property:",
            property.name,
            `(${property.code})`
        );


        /*
        |--------------------------------------------------------------------------
        | ROOM TYPES
        |--------------------------------------------------------------------------
        */

        const roomTypes =
            await getGeneratorRoomTypes(
                property.id
            );


        if (
            roomTypes.length === 0
        ) {

            throw new Error(
                "No active room types found."
            );
        }


        /*
        |--------------------------------------------------------------------------
        | ROOMS
        |--------------------------------------------------------------------------
        */

        const rooms =
            await getGeneratorRooms(
                property.id
            );


        if (
            rooms.length === 0
        ) {

            throw new Error(
                "No available rooms found."
            );
        }


        /*
        |--------------------------------------------------------------------------
        | RATE PLANS
        |--------------------------------------------------------------------------
        */

        const ratePlans =
            await getGeneratorRatePlans(
                property.id
            );


        if (
            ratePlans.length === 0
        ) {

            throw new Error(
                "No active rate plans found."
            );
        }


        /*
        |--------------------------------------------------------------------------
        | GUESTS
        |--------------------------------------------------------------------------
        */

        let guests =
            await getGeneratorGuests(
                property.organization_id
            );


        /*
        |--------------------------------------------------------------------------
        | Ensure international guest pool
        |--------------------------------------------------------------------------
        */

        guests =
            await ensureInternationalGuestPool(
                property.organization_id,
                guests
            );


        if (
            guests.length === 0
        ) {

            throw new Error(
                "No guests available."
            );
        }


        /*
        |--------------------------------------------------------------------------
        | APP USER
        |--------------------------------------------------------------------------
        */

        let appUserId =
            null;


        try {

            const {
                data: authData
            } = await supabaseClient
                .auth
                .getUser();


            if (
                authData?.user
            ) {

                const {
                    data: appUser
                } = await supabaseClient
                    .from("app_users")
                    .select("id")
                    .eq(
                        "id",
                        authData.user.id
                    )
                    .maybeSingle();


                appUserId =
                    appUser?.id || null;
            }

        } catch (userError) {

            console.warn(
                "Could not determine app user:",
                userError
            );
        }


        /*
        |--------------------------------------------------------------------------
        | EXISTING OCCUPANCY
        |--------------------------------------------------------------------------
        */

        const existingReservations =
            await getExistingRoomReservations(
                property.id
            );


        initializeOccupancyCache(
            existingReservations
        );


        /*
        |--------------------------------------------------------------------------
        | SUMMARY
        |--------------------------------------------------------------------------
        */

        console.log("");
        console.log(
            "ROOM TYPES:",
            roomTypes.length
        );

        console.log(
            "ROOMS:",
            rooms.length
        );

        console.log(
            "RATE PLANS:",
            ratePlans.length
        );

        console.log(
            "GUESTS:",
            guests.length
        );

        console.log(
            "EXISTING ROOM STAYS:",
            existingReservations.length
        );

        console.log("");


        /*
        |--------------------------------------------------------------------------
        | GENERATION
        |--------------------------------------------------------------------------
        */

        let generated =
            0;


        let skipped =
            0;


        let attempts =
            0;


        const generatedResults =
            [];


        while (
            generated < target &&
            attempts <
                RESERVATION_GENERATOR_CONFIG
                    .maxAttempts
        ) {

            attempts++;


            try {

                const result =
                    await createGeneratedReservation({

                        property,

                        roomTypes,

                        rooms,

                        ratePlans,

                        guests,

                        appUserId,

                        sequence:
                            generated + 1
                    });


                /*
                |--------------------------------------------------------------------------
                | No room available
                |--------------------------------------------------------------------------
                */

                if (
                    !result.success
                ) {

                    skipped++;


                    if (
                        skipped % 25 === 0
                    ) {

                        console.log(
                            `Skipped ${skipped} candidates due to room conflicts.`
                        );
                    }


                    continue;
                }


                /*
                |--------------------------------------------------------------------------
                | Success
                |--------------------------------------------------------------------------
                */

                generated++;


                generatedResults.push(
                    result
                );


                console.log(

                    `[${generated}/${target}]`,

                    result.confirmationNumber,

                    "|",

                    result.status,

                    "|",

                    result.roomType.code,

                    "|",

                    result.room.room_number,

                    "|",

                    result.arrivalDate,

                    "→",

                    result.departureDate,

                    "|",

                    result.guest.display_name,

                    "|",

                    `${result.totalAmount} EUR`
                );


                /*
                |--------------------------------------------------------------------------
                | Tiny pause every 25 reservations.
                |--------------------------------------------------------------------------
                */

                if (
                    generated % 25 === 0
                ) {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                150
                            )
                    );
                }

            } catch (error) {

                skipped++;


                console.warn(
                    `Reservation candidate failed on attempt ${attempts}:`,
                    error
                );
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Final result
        |--------------------------------------------------------------------------
        */

        console.log("");
        console.log(
            "=================================================="
        );

        console.log(
            "RESERVATION GENERATION COMPLETE"
        );

        console.log(
            "=================================================="
        );

        console.log(
            "Requested:",
            target
        );

        console.log(
            "Generated:",
            generated
        );

        console.log(
            "Skipped:",
            skipped
        );

        console.log(
            "Attempts:",
            attempts
        );

        console.log(
            "=================================================="
        );


        /*
        |--------------------------------------------------------------------------
        | Statistics
        |--------------------------------------------------------------------------
        */

        const statusStats = {};


        for (
            const result
            of generatedResults
        ) {

            statusStats[
                result.status
            ] =
                (
                    statusStats[
                        result.status
                    ] || 0
                ) + 1;
        }


        console.log(
            "STATUS DISTRIBUTION:"
        );


        console.table(
            statusStats
        );


        /*
        |--------------------------------------------------------------------------
        | Refresh reservation UI
        |--------------------------------------------------------------------------
        */

        if (
            typeof loadReservations ===
            "function"
        ) {

            await loadReservations();
        }


        /*
        |--------------------------------------------------------------------------
        | Refresh icons if needed
        |--------------------------------------------------------------------------
        */

        if (
            typeof lucide !==
            "undefined" &&
            typeof lucide.createIcons ===
            "function"
        ) {

            lucide.createIcons();
        }


        /*
        |--------------------------------------------------------------------------
        | Final alert
        |--------------------------------------------------------------------------
        */

        alert(

            `Reservation generation complete.\n\n` +

            `Property: ${property.name}\n` +

            `Requested: ${target}\n` +

            `Generated: ${generated}\n` +

            `Skipped: ${skipped}\n` +

            `Attempts: ${attempts}\n\n` +

            `Open the browser console for details.`
        );


    } catch (error) {

        console.error(
            "RESERVATION GENERATOR FAILED:",
            error
        );


        alert(

            "Reservation generation failed:\n\n" +

            (
                error?.message ||
                "Unknown error"
            )
        );
    }
}


/* ==========================================================================
   GLOBAL EXPORT
   ========================================================================== */

window.generateRandomReservations =
    generateRandomReservations;