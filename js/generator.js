async function generateRandomReservations(){

    if(!confirm("Generate 10 reservations?")) return;

    const rooms = await getAvailableRooms();

    if(rooms.length < 10){
        alert("Not enough rooms available");
        return;
    }

    const reservations = [];
    const availableRooms = [...rooms];

    const statuses = [
        "PENDING", "CONFIRMED", "CHECKED_IN",
        "CHECKED_OUT", "CANCELLED", "NO_SHOW"
    ];

    const rangeEnd = new Date();
    rangeEnd.setHours(0, 0, 0, 0);
    rangeEnd.setDate(rangeEnd.getDate() + 30);

    for(let i = 0; i < 10; i++){

        const guest = GUESTS[Math.floor(Math.random() * GUESTS.length)];

        const roomIndex = Math.floor(Math.random() * availableRooms.length);
        const room = availableRooms[roomIndex];
        availableRooms.splice(roomIndex, 1);

        const arrival = new Date();
        arrival.setHours(0, 0, 0, 0);
        arrival.setDate(arrival.getDate() + Math.floor(Math.random() * 25));

        const nights = Math.floor(Math.random() * 5) + 1;

        const departure = new Date(arrival);
        departure.setDate(departure.getDate() + nights);

        if(departure > rangeEnd){
            departure.setTime(rangeEnd.getTime());
        }

        const confirmation = "HT" + String(Date.now() + i).slice(-10);

        reservations.push({
            confirmation_no: confirmation,
            guest_name: guest,
            room_number: room.room_number,
            room_type: room.room_type,
            arrival_date: formatDate(arrival),
            departure_date: formatDate(departure),
            nights: nights,
            adults: 1,
            children: 0,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            currency: "EUR",
            room_rate: 100,
            rate: 100,
            price: nights * 100,
            total_amount: nights * 100
        });

    }

    const { error } = await supabaseClient.from("reservation").insert(reservations);

    if(error){
        console.error(error);
        alert("Failed generating reservations");
        return;
    }

    alert("10 reservations generated");
    loadReservations();

}

async function getAvailableRooms(){

    const { data, error } =
        await supabaseClient
        .from("rooms")
        .select(`
            room_number,
            room_type,
            status
        `);

    if(error){
        console.error("Failed loading rooms:", error);
        return [];
    }

    return data;

}