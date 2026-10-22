"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTrainBookingMessage = handleTrainBookingMessage;
const scheduleWindow_1 = require("../trains/scheduleWindow");
const apiBase = process.env.JOJO_BOOKING_API_BASE_URL ?? 'http://localhost:4000/api';
const DEMO_NOTICE = 'These are sample JoJo demo schedules and fares—not live railway inventory or an IRCTC booking.';
async function api(path, init = {}) {
    const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
    const envelope = await response.json();
    if (!response.ok || !envelope.success || envelope.data === undefined) {
        throw new Error(envelope.error?.message ?? `Train service returned HTTP ${response.status}`);
    }
    return envelope.data;
}
function todayInIndia() {
    return (0, scheduleWindow_1.indiaDateAtOffset)();
}
function dateAtOffset(days) {
    return (0, scheduleWindow_1.indiaDateAtOffset)(days);
}
function dateAtMonthOffset(months) {
    const [year, month, day] = todayInIndia().split('-').map(Number);
    const firstOfTargetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    firstOfTargetMonth.setUTCDate(Math.min(day, lastDay));
    return firstOfTargetMonth.toISOString().slice(0, 10);
}
function parseDate(text) {
    const normalized = text.toLowerCase();
    if (/\bday after tomorrow\b/.test(normalized))
        return dateAtOffset(2);
    if (/\btomorrow\b/.test(normalized))
        return dateAtOffset(1);
    if (/\b(?:today|tonight)\b/.test(normalized))
        return todayInIndia();
    const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso && validDate(iso[0]))
        return iso[0];
    const relative = normalized.match(/\b(?:in\s+)?(\d{1,3})\s*(days?|weeks?|months?)(?:\s+from\s+now)?\b/);
    if (relative) {
        const amount = Number(relative[1]);
        const unit = relative[2].replace(/s$/, '');
        if (unit === 'month')
            return dateAtMonthOffset(amount);
        return dateAtOffset(amount * (unit === 'week' ? 7 : 1));
    }
    const relativeWord = normalized.match(/\bin\s+(one|two|three)\s+months?\b/);
    if (relativeWord)
        return dateAtMonthOffset({ one: 1, two: 2, three: 3 }[relativeWord[1]]);
    const dmy = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
    if (dmy) {
        const value = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        if (validDate(value))
            return value;
    }
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const named = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:,?\s+(20\d{2}))?\b/i)
        ?? text.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i);
    if (named) {
        const day = Number(named[1].match(/^\d/) ? named[1] : named[2]);
        const monthText = named[1].match(/^\d/) ? named[2] : named[1];
        const month = monthNames.findIndex(value => monthText.toLowerCase().startsWith(value));
        let year = Number(named[3] ?? todayInIndia().slice(0, 4));
        if (!named[3] && new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+05:30`) < new Date(`${todayInIndia()}T00:00:00+05:30`))
            year++;
        const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (month >= 0 && validDate(value))
            return value;
    }
    const weekdayMatch = normalized.match(/\b(?:(next|this)\s+)?(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)\b/);
    if (!weekdayMatch)
        return undefined;
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const target = weekdays.findIndex(day => weekdayMatch[2].startsWith(day));
    const today = new Date(`${todayInIndia()}T12:00:00+05:30`).getUTCDay();
    let distance = (target - today + 7) % 7;
    if (distance === 0 || weekdayMatch[1] === 'next')
        distance += 7;
    return dateAtOffset(distance);
}
function validDate(value) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function parsePassengerCount(text) {
    const match = text.match(/\b(\d{1,3}|one|two|three|four|five|six)\s*(?:adult|child|children|passenger|people|person|travell?er|ticket|seat)s?\b/i)
        ?? text.match(/\b(?:another\s+)?(\d{1,3}|one|two|three|four|five|six)\s+more\s+(?:passengers?|people|tickets?|seats?)\b/i)
        ?? text.match(/\b(?:for|we are|there are|party of)\s*(\d{1,3}|one|two|three|four|five|six)\b/i)
        ?? text.match(/^\s*(\d{1,3}|one|two|three|four|five|six)\s*$/i);
    if (!match)
        return undefined;
    const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const count = words[match[1].toLowerCase()] ?? Number(match[1]);
    return count >= 1 && count <= 100 ? count : undefined;
}
async function stationKeyboard(exclude) {
    const fallbackCities = ['Pune', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kolkata', 'Bhopal', 'Nagpur'];
    let cities = fallbackCities;
    let excludedCity = exclude ? (0, scheduleWindow_1.normalizeRailLocation)(exclude) : undefined;
    try {
        const stations = await api('/trains/stations');
        if (stations.length) {
            cities = [...new Set(stations.map(station => station.city))];
            const selected = stations.find(station => [station.city, station.name, station.code].some(value => value.toLowerCase() === excludedCity));
            if (selected)
                excludedCity = (0, scheduleWindow_1.normalizeRailLocation)(selected.city);
        }
    }
    catch { /* Typed station names still work while the station list is temporarily unavailable. */ }
    const choices = cities.filter(city => city.trim().toLowerCase() !== excludedCity);
    const rows = [];
    for (let index = 0; index < choices.length; index += 2)
        rows.push(choices.slice(index, index + 2));
    rows.push(['CANCEL']);
    return rows;
}
function dateKeyboard() {
    return [
        [`Today · ${dateAtOffset(0)}`, `Tomorrow · ${dateAtOffset(1)}`],
        [`+7 days · ${dateAtOffset(7)}`, `+14 days · ${dateAtOffset(14)}`],
        [`+30 days · ${dateAtOffset(30)}`, `+60 days · ${dateAtOffset(60)}`],
        [`+90 days · ${dateAtOffset(90)}`, `+120 days · ${dateAtOffset(120)}`],
    ];
}
function passengerCountKeyboard(includeMore = true) {
    return [
        ['1', '2', '3', '4', '5'], ['6', '7', '8', '9', '10'],
        ...(includeMore ? [['More (11–100)']] : []),
        ['CANCEL'],
    ];
}
function trainChoiceKeyboard(options) {
    return options.map((option, index) => [`${index + 1} · ${option.trainNumber} · ${option.classCode}`]);
}
function passengerKeyboard() {
    return [['CANCEL']];
}
function passengerPrompt(task, option) {
    const count = task.passengerCount ?? 1;
    return `You selected ${option.trainName} (${option.trainNumber}), ${option.classCode}, departing ${formatTime(option.departureAt)}.\n\nPassenger details (${count} total; ${option.availableSeats} demo seats currently available): enter “Name, age” and optionally gender and berth preference, e.g. “Asha, 28, F, Lower”. For a group, paste one passenger per line or separate entries with semicolons. I’ll show a review before reserving anything.`;
}
function parseRoute(text) {
    const date = parseDate(text);
    let source = text;
    if (date) {
        source = source.replace(/\b(?:day after tomorrow|tomorrow|today|tonight|next\s+\w+|this\s+\w+|\w+day|20\d{2}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}[/.\-]20\d{2})\b/ig, ' ');
        source = source.replace(/\b(?:in\s+)?\d{1,3}\s+(?:days?|weeks?|months?)(?:\s+from\s+now)?\b/ig, ' ');
        source = source.replace(/\bin\s+(?:one|two|three)\s+months?\b/ig, ' ');
        source = source.replace(/\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*20\d{2})?|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*20\d{2})?)\b/ig, ' ');
    }
    const pair = source.match(/\bfrom\s+(.+?)\s+(?:to|towards)\s+(.+?)(?=\s+(?:on|for|with|in)\b|[,.!?]|$)/i)
        ?? source.match(/^\s*(?:train\s+)?(.+?)\s+to\s+(.+?)(?=\s+(?:on|for|with|in)\b|[,.!?]|$)/i);
    if (pair) {
        const clean = (value) => value.replace(/\b(?:train|booking|book|ticket|tickets|please|tomorrow|today)\b/ig, ' ').trim();
        return { origin: clean(pair[1]), destination: clean(pair[2]) };
    }
    const from = source.match(/\bfrom\s+([\p{L}][\p{L} .'-]*?)(?=\s+(?:on|for|tomorrow|today|day after tomorrow)\b|[,.!?]|$)/iu);
    if (from)
        return { origin: from[1].trim() };
    return {};
}
function barePlace(text) {
    const value = text.trim().replace(/^[,\s]*(?:from|to)\s+/i, '').replace(/[,.!?]+$/, '').trim();
    if (/\b(?:i|want|need|book|booking|train|ticket|travel|travelling|going|please|tomorrow|today|passenger|people)\b/i.test(value))
        return undefined;
    return /^[\p{L}][\p{L} .'-]{1,59}$/u.test(value) ? value : undefined;
}
function formatDate(date) {
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(`${date}T12:00:00+05:30`));
}
function formatTime(value) {
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
function optionLine(option, index, requestedPassengers) {
    const hours = Math.floor(option.durationMinutes / 60);
    const minutes = option.durationMinutes % 60;
    const availability = option.availableSeats === 0 ? '🔴 SOLD OUT · 0 available'
        : option.availableSeats < requestedPassengers ? `🟠 ${option.availableSeats} available · not enough for ${requestedPassengers}`
            : option.availableSeats <= 10 ? `🟠 LIMITED · ${option.availableSeats} available`
                : `🟢 AVAILABLE · ${option.availableSeats} available`;
    return `${index + 1}. ${option.trainName} (${option.trainNumber}) · ${option.classCode}\n   ${formatTime(option.departureAt)} → ${formatTime(option.arrivalAt)} · ${hours}h ${minutes}m · ₹${option.farePerPassenger.toLocaleString('en-IN')}/passenger · ${availability}`;
}
function optionIndex(options, text) {
    const keyboardIndex = text.match(/^\s*(\d{1,2})\s*[·.]\s*/);
    if (keyboardIndex)
        return Number(keyboardIndex[1]) - 1;
    const numeric = text.match(/^\s*(?:option\s*)?(\d{1,2})\s*[.!]?\s*$/i);
    if (numeric)
        return Number(numeric[1]) - 1;
    const byNumber = text.match(/\b(?:train\s*)?(JJ\d{3,5}|\d{4,6})\b/i)?.[1]?.toLowerCase();
    const normalized = text.normalize('NFKC').toLowerCase();
    return options.findIndex(option => (byNumber && option.trainNumber.toLowerCase() === byNumber)
        || (normalized.includes(option.trainName.toLowerCase())
            && (!/\b(?:\d+a|\d+s|cc|2s|ec|sl)\b/i.test(text) || normalized.includes(option.classCode.toLowerCase()))));
}
function parsePassenger(text) {
    const value = text.trim().replace(/^passenger\s*\d+\s*[:.)-]\s*/i, '');
    const fields = value.split(',').map(field => field.trim());
    const match = fields.length >= 2 ? undefined : value.match(/^(.+?)(?:\s+age\s+|\s+-\s*|\s+)(\d{1,3})\s*$/i);
    const name = fields.length >= 2 ? fields[0] : match?.[1]?.trim();
    const age = Number(fields.length >= 2 ? fields[1] : match?.[2]);
    if (!name)
        return undefined;
    if (name.length < 2 || age < 1 || age > 120)
        return undefined;
    const genderToken = (fields[2] ?? '').toLowerCase();
    const gender = !genderToken ? 'UNSPECIFIED'
        : ['m', 'male'].includes(genderToken) ? 'MALE'
            : ['f', 'female'].includes(genderToken) ? 'FEMALE'
                : ['x', 'other', 'non-binary', 'nonbinary'].includes(genderToken) ? 'OTHER' : undefined;
    const berthToken = (fields[3] ?? '').toLowerCase().replace(/[ _-]+/g, ' ').trim();
    const berthPreference = !berthToken || ['any', 'no preference', 'no preference berth'].includes(berthToken) ? 'NO_PREFERENCE'
        : ['lower', 'lower berth'].includes(berthToken) ? 'LOWER'
            : ['middle', 'middle berth'].includes(berthToken) ? 'MIDDLE'
                : ['upper', 'upper berth'].includes(berthToken) ? 'UPPER'
                    : ['side lower', 'side lower berth'].includes(berthToken) ? 'SIDE_LOWER'
                        : ['side upper', 'side upper berth'].includes(berthToken) ? 'SIDE_UPPER' : undefined;
    if (!gender || !berthPreference || fields.length > 4)
        return undefined;
    return {
        name, age, gender, berthPreference,
        category: age < 12 ? 'CHILD' : age >= 60 ? 'SENIOR' : 'ADULT',
    };
}
function parsePassengerBatch(text) {
    const entries = text.split(/[;\n]+/).map(value => value.trim()).filter(Boolean);
    if (!entries.length)
        return undefined;
    const passengers = entries.map(parsePassenger);
    return passengers.every((passenger) => Boolean(passenger)) ? passengers : undefined;
}
function yes(text) {
    return /^\s*(?:yes|y|confirm|confirmed|book(?:\s+it)?|proceed|go ahead|sounds good)\s*[.!]?\s*$/i.test(text);
}
function cancel(text) {
    return /^\s*(?:cancel|stop|never mind|nevermind|forget it|start over|reset)\s*[.!]?\s*$/i.test(text);
}
function isMovieSwitch(text) {
    return /\b(?:movie|cinema|theatre|theater|showtime|film)\b/i.test(text);
}
function makeTask(origin, destination, date, passengerCount) {
    return {
        stage: 'route', origin: origin ?? null, destination: destination ?? null,
        date: date ?? null, passengerCount: passengerCount ?? null, passengers: [], options: [],
        selectedInventoryId: null, bookingId: null, bookingReference: null,
    };
}
async function handleTrainBookingMessage(chatId, userId, text, state) {
    const task = state.trainTask;
    const stateWithTask = (trainTask) => ({ ...state, trainTask });
    if (task && isMovieSwitch(text)) {
        if (task.stage === 'payment' && task.bookingId) {
            try {
                await api(`/trains/bookings/${task.bookingId}/cancel`, {
                    method: 'POST', body: JSON.stringify({ sessionId: `telegram-${chatId}-${userId}` }),
                });
            }
            catch {
                return { handled: true, reply: 'I couldn’t release the pending sample train seats before switching. Please reply CANCEL first; then I can help with movie tickets.', state };
            }
        }
        return { handled: false, state: stateWithTask(null) };
    }
    if (task && cancel(text)) {
        if (task.stage === 'payment' && task.bookingId) {
            try {
                await api(`/trains/bookings/${task.bookingId}/cancel`, {
                    method: 'POST', body: JSON.stringify({ sessionId: `telegram-${chatId}-${userId}` }),
                });
            }
            catch (error) {
                return { handled: true, reply: `I couldn't cancel that pending train booking just now. ${error instanceof Error ? error.message : ''} Please try again.`, state };
            }
        }
        return { handled: true, reply: 'No problem—I’ve cancelled this train-booking flow. Tell me if you’d like to search for another train or book a movie.', state: stateWithTask(null) };
    }
    if (!task) {
        const last = state.lastTrainBooking;
        const asksToCancelConfirmed = Boolean(last) && /\b(?:cancel|refund)\b/i.test(text)
            && /\b(?:my|last|previous|that|this)\b/i.test(text);
        if (last && asksToCancelConfirmed) {
            return { handled: true, reply: `That sample booking (${last.reference}) is already confirmed. I can only release a pending demo seat hold before payment; live railway cancellations and refunds aren’t supported here. For a real ticket, use the rail operator’s official service.`, state };
        }
        const asksLastBooking = Boolean(last) && /\b(?:my|last|previous|that|this)\b/i.test(text)
            && /\b(?:booking|ticket|reference|pnr|status|train|journey)\b/i.test(text);
        if (last && asksLastBooking) {
            try {
                const params = new URLSearchParams({ sessionId: `telegram-${chatId}-${userId}` });
                const booking = await api(`/trains/bookings/${last.bookingId}?${params.toString()}`);
                return { handled: true, reply: `Your last sample train booking is ${booking.status.toLowerCase().replaceAll('_', ' ')}.\nReference: ${booking.reference}\n${booking.inventory.train.name} (${booking.inventory.train.number}), ${booking.inventory.classCode} · ${booking.inventory.origin.city} → ${booking.inventory.destination.city}\nFare: ₹${Number(booking.inventory.farePerPassenger).toLocaleString('en-IN')}/passenger · total ₹${Number(booking.totalFare).toLocaleString('en-IN')}\n\n${DEMO_NOTICE}`, state };
            }
            catch (error) {
                return { handled: true, reply: `I couldn’t retrieve that sample booking right now: ${error instanceof Error ? error.message : 'temporary service issue'}. Your reference is ${last.reference}.`, state };
            }
        }
        const asksForRepeat = Boolean(last) && !isMovieSwitch(text)
            && /\b(?:another|more|one more|additional|again|same)\b/i.test(text)
            && /\b(?:ticket|booking|train|journey|seat)\b/i.test(text);
        if (last && asksForRepeat) {
            const count = parsePassengerCount(text);
            const nextTask = makeTask(last.origin, last.destination, last.date, count);
            const nextState = stateWithTask(nextTask);
            if (count)
                return searchTrains(nextTask, nextState);
            nextTask.stage = 'passenger_count';
            return { handled: true, reply: `Sure—I’ll reuse the route ${last.origin} to ${last.destination} and date ${formatDate(last.date)}. How many additional passengers? I’ll show the current trains and classes next; you can choose ${last.trainName} (${last.trainNumber}), ${last.classCode} again if it has seats.`, state: nextState, keyboard: passengerCountKeyboard() };
        }
        const explicitTrain = /\b(?:train|trains|railway|rail)\b/i.test(text)
            && /\b(?:book|booking|ticket|tickets|travel|go|from|to|search|find|available|availability|schedule|fare|price|class|status)\b/i.test(text);
        if (!explicitTrain)
            return { handled: false, state };
        const route = parseRoute(text);
        const date = parseDate(text);
        const passengerCount = parsePassengerCount(text);
        const nextTask = makeTask(route.origin, route.destination, date, passengerCount);
        const nextState = stateWithTask(nextTask);
        if (!nextTask.origin) {
            nextTask.stage = 'route';
            return { handled: true, reply: 'Sure—I can guide you through a train booking. First, choose your departure city/station, or type its name. These are JoJo demo schedules, not live IRCTC availability.', state: nextState, keyboard: await stationKeyboard() };
        }
        if (!nextTask.destination) {
            nextTask.stage = 'route';
            return { handled: true, reply: `Choose your destination from ${nextTask.origin}, or type a station/city name.`, state: nextState, keyboard: await stationKeyboard(nextTask.origin) };
        }
        if (!nextTask.date) {
            nextTask.stage = 'date';
            return { handled: true, reply: `🚆 ${nextTask.origin} → ${nextTask.destination}\nChoose a date below, type a date (YYYY-MM-DD), or say “in 2 months”. This sample timetable is available up to ${scheduleWindow_1.TRAIN_SCHEDULE_HORIZON_DAYS} days ahead.`, state: nextState, keyboard: dateKeyboard() };
        }
        return searchTrains(nextTask, nextState);
    }
    if (task.stage === 'route') {
        const route = parseRoute(text);
        if (route.origin)
            task.origin = route.origin;
        if (route.destination)
            task.destination = route.destination;
        if (!route.origin && !route.destination) {
            const place = barePlace(text);
            if (place) {
                if (!task.origin)
                    task.origin = place;
                else if (!task.destination)
                    task.destination = place;
            }
        }
        const date = parseDate(text);
        if (date)
            task.date = date;
        const count = parsePassengerCount(text);
        if (count)
            task.passengerCount = count;
        if (!task.origin)
            return { handled: true, reply: 'Choose your departure city/station, or type its name.', state, keyboard: await stationKeyboard() };
        if (!task.destination)
            return { handled: true, reply: `Choose your destination from ${task.origin}, or type a station/city name.`, state, keyboard: await stationKeyboard(task.origin) };
        if (!task.date) {
            task.stage = 'date';
            return { handled: true, reply: `🚆 ${task.origin} → ${task.destination}\nChoose a date below, type YYYY-MM-DD, or say “in 2 months”. Sample schedules extend ${scheduleWindow_1.TRAIN_SCHEDULE_HORIZON_DAYS} days ahead.`, state, keyboard: dateKeyboard() };
        }
        return searchTrains(task, state);
    }
    if (task.stage === 'date') {
        const date = parseDate(text);
        if (!date)
            return { handled: true, reply: `I didn’t catch the travel date. Choose a date below, type YYYY-MM-DD, or say “in 2 months” (up to ${scheduleWindow_1.TRAIN_SCHEDULE_HORIZON_DAYS} days ahead).`, state, keyboard: dateKeyboard() };
        task.date = date;
        const count = parsePassengerCount(text);
        if (count)
            task.passengerCount = count;
        return searchTrains(task, state);
    }
    if (task.stage === 'passenger_count') {
        if (/\b(?:choose another class|different class|another train|choose a different train)\b/i.test(text)) {
            task.stage = 'option';
            task.selectedInventoryId = null;
            const choices = task.options.map((option, index) => optionLine(option, index, task.passengerCount ?? 1)).join('\n\n');
            return { handled: true, reply: `No problem—choose a different train/class. Availability and fare are tracked separately for each class.\n\n${choices}`, state, keyboard: trainChoiceKeyboard(task.options) };
        }
        if (/^\s*more\b/i.test(text))
            return { handled: true, reply: 'Type the exact number of passengers, from 11 to 100.', state, keyboard: passengerCountKeyboard(false) };
        const count = parsePassengerCount(text);
        if (!count)
            return { handled: true, reply: 'Choose a quick count below, or type any whole number from 1 to 100.', state, keyboard: passengerCountKeyboard() };
        task.passengerCount = count;
        const selected = task.options.find(option => option.inventoryId === task.selectedInventoryId);
        if (!selected)
            return searchTrains(task, state);
        if (count > selected.availableSeats) {
            return { handled: true, reply: `That class currently has only ${selected.availableSeats} demo seats available. Choose a smaller party or search another date/train.`, state, keyboard: passengerCountKeyboard() };
        }
        task.stage = 'passengers';
        return { handled: true, reply: passengerPrompt(task, selected), state, keyboard: passengerKeyboard() };
    }
    if (task.stage === 'option') {
        const index = optionIndex(task.options, text);
        const option = task.options[index];
        if (!option)
            return { handled: true, reply: `Please choose one of the listed options by number (1–${task.options.length}), train number, or train name and class.`, state };
        if (option.availableSeats < 1)
            return { handled: true, reply: `That class is sold out in this sample inventory. Please choose a different train/class.`, state, keyboard: trainChoiceKeyboard(task.options) };
        task.selectedInventoryId = option.inventoryId;
        task.passengers = [];
        if (!task.passengerCount) {
            task.stage = 'passenger_count';
            return { handled: true, reply: `✅ ${option.trainName} · ${option.classCode}\nHow many passengers? Choose 1–10 or type any whole number up to 100. This option currently shows ${option.availableSeats} demo seats.`, state, keyboard: passengerCountKeyboard() };
        }
        if (task.passengerCount > option.availableSeats) {
            task.stage = 'passenger_count';
            return { handled: true, reply: `This ${option.classCode} option currently has ${option.availableSeats} demo seats, fewer than your ${task.passengerCount} passengers. Enter a smaller count or type “choose another class”.`, state, keyboard: passengerCountKeyboard() };
        }
        task.stage = 'passengers';
        return { handled: true, reply: passengerPrompt(task, option), state, keyboard: passengerKeyboard() };
    }
    if (task.stage === 'passengers') {
        const passengers = parsePassengerBatch(text);
        if (!passengers)
            return { handled: true, reply: `I need passenger ${task.passengers.length + 1} of ${task.passengerCount} as “Name, age[, gender][, berth preference]”. You can paste several lines or separate entries with semicolons.`, state, keyboard: passengerKeyboard() };
        const knownNames = new Set(task.passengers.map(item => item.name.toLowerCase()));
        for (const passenger of passengers) {
            const key = passenger.name.toLowerCase();
            if (knownNames.has(key))
                return { handled: true, reply: `I already have passenger “${passenger.name}” in this list. Please remove duplicate names and resend this batch.`, state, keyboard: passengerKeyboard() };
            knownNames.add(key);
        }
        const remaining = (task.passengerCount ?? 1) - task.passengers.length;
        if (passengers.length > remaining)
            return { handled: true, reply: `I still need ${remaining} passenger${remaining === 1 ? '' : 's'}, but this message contains ${passengers.length}. Please send only the remaining entries.`, state, keyboard: passengerKeyboard() };
        task.passengers.push(...passengers);
        if (task.passengers.length < (task.passengerCount ?? 1)) {
            return { handled: true, reply: `✅ Recorded ${task.passengers.length} of ${task.passengerCount}. Send the next passenger${task.passengerCount - task.passengers.length === 1 ? '' : 's'} as “Name, age” (one per line or separated by semicolons).`, state, keyboard: passengerKeyboard() };
        }
        const option = task.options.find(item => item.inventoryId === task.selectedInventoryId);
        const total = option.farePerPassenger * task.passengers.length;
        task.stage = 'review';
        const preview = task.passengers.slice(0, 5).map(item => `${item.name} (${item.age})`).join(', ');
        const extra = task.passengers.length > 5 ? `, and ${task.passengers.length - 5} more` : '';
        return { handled: true, reply: `🧾 Review your journey\n${option.trainName} (${option.trainNumber}) · ${option.classCode}\n${task.origin} → ${task.destination} · ${formatDate(task.date)} · departs ${formatTime(option.departureAt)}\nPassengers (${task.passengers.length}): ${preview}${extra}\nEstimated demo total: ₹${total.toLocaleString('en-IN')}\n\nConfirm to place this sample booking, or cancel. No real ticket/payment is issued.`, state, keyboard: [['CONFIRM', 'CANCEL']] };
    }
    if (task.stage === 'review') {
        if (!yes(text))
            return { handled: true, reply: 'Would you like me to reserve these sample seats?', state, keyboard: [['CONFIRM', 'CANCEL']] };
        if (!task.selectedInventoryId || !task.passengers.length) {
            return { handled: true, reply: 'I lost part of the selected train details. Let’s search again—what route and date do you need?', state: stateWithTask(makeTask(task.origin ?? undefined, task.destination ?? undefined, task.date ?? undefined, task.passengerCount ?? undefined)) };
        }
        try {
            const booking = await api('/trains/bookings', {
                method: 'POST',
                body: JSON.stringify({ inventoryId: task.selectedInventoryId, sessionId: `telegram-${chatId}-${userId}`, idempotencyKey: `tg-${chatId}-${userId}-${task.selectedInventoryId}-${Date.now()}`, passengers: task.passengers }),
            });
            task.bookingId = booking.bookingId;
            task.bookingReference = booking.reference;
            task.stage = 'payment';
            const selected = task.options.find(item => item.inventoryId === task.selectedInventoryId);
            return { handled: true, reply: `✅ Sample ${selected.classCode} seats held · ${booking.reference}\nFare: ₹${selected.farePerPassenger.toLocaleString('en-IN')}/passenger · total ₹${Number(booking.totalFare).toLocaleString('en-IN')}\nStatus: PENDING PAYMENT\n\nChoose PAY DEMO to simulate payment and confirm, or CANCEL to release the seats. No real ticket or charge.`, state, keyboard: [['PAY DEMO'], ['CANCEL']] };
        }
        catch (error) {
            task.stage = 'option';
            task.selectedInventoryId = null;
            return { handled: true, reply: `I couldn’t reserve those seats: ${error instanceof Error ? error.message : 'the inventory changed'}. Please choose another listed option or CANCEL.`, state };
        }
    }
    if (task.stage === 'payment') {
        if (!/^\s*pay\s+demo\s*$/i.test(text))
            return { handled: true, reply: 'Your sample seats are held. Choose PAY DEMO to simulate payment and confirm, or CANCEL to release them. No real payment will be taken.', state, keyboard: [['PAY DEMO'], ['CANCEL']] };
        if (!task.bookingId)
            return { handled: true, reply: 'I can’t find the pending booking reference. Please start a fresh train search.', state: stateWithTask(null) };
        const option = task.options.find(item => item.inventoryId === task.selectedInventoryId);
        if (!option)
            return { handled: true, reply: 'I can’t retrieve the selected train details. Please contact support with the pending reference or cancel the sample hold.', state };
        try {
            const result = await api(`/trains/bookings/${task.bookingId}/pay-demo`, {
                method: 'POST', body: JSON.stringify({ outcome: 'SUCCESS', sessionId: `telegram-${chatId}-${userId}` }),
            });
            task.bookingReference = result.reference ?? task.bookingReference;
            const confirmedState = stateWithTask(null);
            confirmedState.lastTrainBooking = {
                bookingId: task.bookingId, reference: result.reference ?? task.bookingReference,
                inventoryId: option.inventoryId, trainName: option.trainName, trainNumber: option.trainNumber,
                origin: task.origin, destination: task.destination, date: task.date, classCode: option.classCode,
                departureAt: option.departureAt, arrivalAt: option.arrivalAt, farePerPassenger: option.farePerPassenger,
                passengerCount: task.passengers.length,
            };
            return { handled: true, reply: `Demo payment successful—your sample train booking is confirmed.\nReference: ${result.reference ?? task.bookingReference}\n${option.trainName} (${option.trainNumber}), ${option.classCode} · ${task.origin} → ${task.destination}\nStatus: CONFIRMED · class ${option.classCode}\nFare: ₹${option.farePerPassenger.toLocaleString('en-IN')}/passenger · total ₹${Number(result.totalFare).toLocaleString('en-IN')}\n\n${DEMO_NOTICE} If you need more tickets on the same route, just say “book another ticket for the same train.”`, state: confirmedState };
        }
        catch (error) {
            return { handled: true, reply: `I couldn’t complete the demo payment just now: ${error instanceof Error ? error.message : 'temporary service issue'}. Your pending demo booking may still be held; reply PAY DEMO to retry or CANCEL to release it.`, state };
        }
    }
    return { handled: true, reply: 'I’m helping with your train booking. You can answer the question I just asked, or say CANCEL to stop and start over.', state };
}
async function searchTrains(task, state) {
    try {
        const params = new URLSearchParams({ from: task.origin, to: task.destination, date: task.date, passengers: String(task.passengerCount ?? 1) });
        const result = await api(`/trains/search?${params.toString()}`);
        task.options = result.journeys.map(journey => ({
            inventoryId: journey.inventoryId, trainName: journey.train.name, trainNumber: journey.train.number,
            originName: journey.origin.name, destinationName: journey.destination.name,
            departureAt: journey.departureAt, arrivalAt: journey.arrivalAt, durationMinutes: journey.durationMinutes,
            classCode: journey.classCode, availableSeats: journey.availableSeats, farePerPassenger: journey.farePerPassenger,
        }));
        if (!task.options.length) {
            task.stage = 'route';
            return { handled: true, reply: `I couldn’t find a sample train for ${task.origin} to ${task.destination} on ${formatDate(task.date)}${task.passengerCount ? ` with ${task.passengerCount} passengers` : ''}. This route has no seeded service on that date, or the date is outside the ${scheduleWindow_1.TRAIN_SCHEDULE_HORIZON_DAYS}-day demo window. Try another listed date.\n\n${DEMO_NOTICE}`, state, keyboard: dateKeyboard() };
        }
        task.stage = 'option';
        const requestedPassengers = task.passengerCount ?? 1;
        const lines = task.options.slice(0, 10).map((option, index) => optionLine(option, index, requestedPassengers));
        task.options = task.options.slice(0, 10);
        const selectedFor = task.passengerCount ? ` for ${task.passengerCount} passenger${task.passengerCount === 1 ? '' : 's'}` : '';
        return { handled: true, reply: `🚆 Train and class options · ${task.origin} → ${task.destination}\n${formatDate(task.date)}${selectedFor}\n\n${lines.join('\n\n')}\n\nEach class has its own fare, capacity, and remaining-seat count. Tap a train/class below to continue. ${DEMO_NOTICE}`, state, keyboard: trainChoiceKeyboard(task.options) };
    }
    catch (error) {
        task.stage = 'route';
        const reason = error instanceof Error ? error.message : 'temporary service issue';
        const validation = /validation failed|invalid input|date_out_of_range/i.test(reason);
        return { handled: true, reply: validation
                ? `I couldn’t validate that search. Check that the date is today through ${scheduleWindow_1.TRAIN_SCHEDULE_HORIZON_DAYS} days ahead and passenger count is 1–100, then choose again. (${reason})`
                : `I couldn’t search that route: ${reason}. Check the city or station names and try again. You can also say CANCEL to start over.`, state, keyboard: dateKeyboard() };
    }
}
//# sourceMappingURL=trainBookingFlow.js.map