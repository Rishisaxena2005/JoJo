"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBookingMessage = handleBookingMessage;
exports.handleBookingCallback = handleBookingCallback;
const apiBase = process.env.JOJO_BOOKING_API_BASE_URL ?? 'http://localhost:4000/api';
const flows = new Map();
async function api(path, init = {}) {
    const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
    const envelope = await response.json();
    if (!response.ok || !envelope.success || envelope.data === undefined) {
        throw new Error(envelope.error?.message ?? `Cinema API returned HTTP ${response.status}`);
    }
    return envelope.data;
}
function todayInIndia(offsetDays = 0) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type) => parts.find(value => value.type === type)?.value ?? '';
    const date = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00+05:30`);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
}
function normalized(value) {
    return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function matchMovie(movies, text) {
    const haystack = normalized(text);
    return movies.filter(movie => haystack.includes(normalized(movie.title)))
        .sort((left, right) => right.title.length - left.title.length)[0];
}
function matchCity(cities, text) {
    const haystack = normalized(text);
    return cities.filter(city => haystack.includes(normalized(city.name)))
        .sort((left, right) => right.name.length - left.name.length)[0]?.name;
}
function explicitCityReference(text, allowBareCity = false) {
    const phrase = text.match(/\bin\s+([A-Za-z][A-Za-z -]*?)(?=\s+(?:at|on|for|today|tonight|tomorrow|after|before)\b|[,.!?]|$)/i)?.[1]?.trim();
    if (phrase)
        return phrase;
    return allowBareCity && /^[A-Za-z][A-Za-z -]*$/.test(text.trim()) ? text.trim() : undefined;
}
function isGeneralQuestion(text) {
    return /\b(?:what|which|where|how|who|when|why|tell me|show me|list|help|hello|hi|hey)\b/i.test(text)
        && !/\b(?:choose|select|number|seat|ticket|book|reserve|pay|cancel)\b/i.test(text);
}
function requestedDate(text) {
    const exact = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    if (exact)
        return exact;
    if (/\btomorrow\b/i.test(text))
        return todayInIndia(1);
    return todayInIndia();
}
function formatShow(show, index) {
    const time = new Intl.DateTimeFormat('en-IN', {
        timeZone: show.screen.theatre.timezone || 'Asia/Kolkata',
        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }).format(new Date(show.startTime));
    const range = show.priceRange;
    const price = range
        ? range.min === range.max ? `₹${range.min}` : `₹${range.min}–₹${range.max}`
        : 'price unavailable';
    const available = show.availability?.available;
    return `${index + 1}. ${time} — ${show.screen.theatre.name}, ${show.screen.theatre.city.name}; ${price} per seat${typeof available === 'number' ? `; ${available} seats available` : ''}`;
}
function parseRequestedTime(text) {
    const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (match) {
        let hour = Number(match[1]) % 12;
        if (match[3].toLowerCase().startsWith('p'))
            hour += 12;
        return { hour, minute: Number(match[2] ?? 0) };
    }
    const twentyFour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    return twentyFour ? { hour: Number(twentyFour[1]), minute: Number(twentyFour[2]) } : undefined;
}
function chooseShow(shows, message) {
    const index = message.match(/^\s*(?:show\s*)?(\d{1,2})\s*[.!]?\s*$/i)?.[1];
    if (index)
        return shows[Number(index) - 1];
    const time = parseRequestedTime(message);
    if (!time)
        return undefined;
    return shows.find(show => {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: show.screen.theatre.timezone || 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date(show.startTime));
        return Number(parts.find(part => part.type === 'hour')?.value) === time.hour
            && Number(parts.find(part => part.type === 'minute')?.value) === time.minute;
    });
}
function extractSeatLabels(message) {
    return [...new Set((message.toUpperCase().match(/\b[A-Z]{1,3}\s*\d{1,3}\b/g) ?? [])
            .map(label => label.replace(/\s+/g, '')))];
}
async function findShows(flow, includeAnyFutureDate = false) {
    if (!flow.movie || !flow.city)
        return [];
    const query = new URLSearchParams({ movieId: flow.movie.id, city: flow.city });
    if (!includeAnyFutureDate)
        query.set('date', flow.date);
    return api(`/shows?${query.toString()}`);
}
async function listCities() {
    return api('/movies/cities');
}
async function listMovies(city) {
    const query = new URLSearchParams({ status: 'NOW_SHOWING', limit: '100', city });
    const result = await api(`/movies?${query.toString()}`);
    return result.items;
}
function cityKeyboard(cities) {
    return cities.slice(0, 20).reduce((rows, city, index) => {
        if (index % 2 === 0)
            rows.push([]);
        rows[rows.length - 1].push({ text: city.name, callback_data: `bookcity|${encodeURIComponent(city.name)}` });
        return rows;
    }, []);
}
function unknownCityReply(city, cities) {
    const available = cities.map(item => item.name).join(', ');
    return `I couldn’t find a JoJo Cinema location in ${city}.${available ? ` Current cities in the listings: ${available}.` : ''}`;
}
async function showMoviesForCity(flow) {
    const movies = await listMovies(flow.city);
    flow.movies = movies;
    flow.stage = movies.length ? 'choose_movie' : 'need_city';
    flows.set(flow.chatId, flow);
    if (!movies.length)
        return { text: `I couldn’t find movies with upcoming shows in ${flow.city}. Choose another city.`, inlineKeyboard: cityKeyboard(await listCities()) };
    return {
        text: `Movies available in ${flow.city}:\n${movies.slice(0, 12).map((movie, index) => `${index + 1}. ${movie.title}`).join('\n')}\n\nChoose a movie to see its cinemas.`,
        inlineKeyboard: movies.slice(0, 12).map(movie => [{ text: movie.title, callback_data: `movie|${movie.id}` }]),
    };
}
function movieChoice(flow, text) {
    const index = text.match(/^\s*(\d{1,2})\s*[.!]?\s*$/)?.[1];
    if (index)
        return flow.movies?.[Number(index) - 1];
    return matchMovie(flow.movies ?? [], text);
}
async function showTheatresForMovie(flow) {
    let shows = await findShows(flow);
    if (!shows.length)
        shows = await findShows(flow, true);
    flow.shows = shows;
    const theatres = [...new Map(shows.map(show => [show.screen.theatre.id, {
                id: show.screen.theatre.id, name: show.screen.theatre.name, address: show.screen.theatre.address,
            }])).values()];
    flow.theatres = theatres;
    flow.stage = 'choose_theatre';
    flows.set(flow.chatId, flow);
    if (!theatres.length) {
        flow.movie = undefined;
        return { ...(await showMoviesForCity(flow)), text: `I couldn’t find upcoming shows for that movie in ${flow.city}. Choose another movie:\n${(flow.movies ?? []).slice(0, 12).map((movie, index) => `${index + 1}. ${movie.title}`).join('\n')}` };
    }
    return {
        text: `Cinemas showing ${flow.movie.title} in ${flow.city}:\n${theatres.map((theatre, index) => {
            const count = shows.filter(show => show.screen.theatre.id === theatre.id).length;
            return `${index + 1}. ${theatre.name}${theatre.address ? ` — ${theatre.address}` : ''} (${count} show${count === 1 ? '' : 's'})`;
        }).join('\n')}\n\nChoose a cinema to see its showtimes, prices, and seat availability.`,
        inlineKeyboard: theatres.slice(0, 20).map(theatre => [{ text: theatre.name, callback_data: `theatre|${theatre.id}` }]),
    };
}
function theatreChoice(flow, text) {
    const theatres = flow.theatres ?? [];
    const index = text.match(/^\s*(\d{1,2})\s*[.!]?\s*$/)?.[1];
    if (index)
        return theatres[Number(index) - 1];
    const value = normalized(text);
    return theatres.filter(theatre => value.includes(normalized(theatre.name)))
        .sort((left, right) => right.name.length - left.name.length)[0];
}
function showtimesForTheatre(flow, theatre) {
    flow.theatre = theatre;
    flow.shows = (flow.shows ?? []).filter(show => show.screen.theatre.id === theatre.id);
    flow.stage = 'choose_show';
    flows.set(flow.chatId, flow);
    return {
        text: `Showtimes at ${theatre.name} for ${flow.movie.title}:\n${flow.shows.map(formatShow).join('\n')}\n\nChoose a showtime to view the seat map and category prices.`,
        inlineKeyboard: flow.shows.slice(0, 20).map((show, index) => [{
                text: `${index + 1}. ${new Intl.DateTimeFormat('en-IN', { timeZone: show.screen.theatre.timezone || 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(show.startTime))} · ₹${show.priceRange?.min ?? '—'}–₹${show.priceRange?.max ?? '—'} · ${show.availability?.available ?? '?'} seats`,
                callback_data: `show|${show.id}`,
            }]),
    };
}
function makeSeatKeyboard(flow) {
    const selected = new Set(flow.selectedSeatLabels ?? []);
    const keyboard = [];
    for (const row of flow.seatRows ?? []) {
        const sorted = [...row.seats].sort((left, right) => left.seatLabel.localeCompare(right.seatLabel, undefined, { numeric: true, sensitivity: 'base' }));
        for (let start = 0; start < sorted.length; start += 5) {
            keyboard.push(sorted.slice(start, start + 5).map(seat => ({
                text: seat.status === 'AVAILABLE'
                    ? `${selected.has(seat.seatLabel) ? '✅' : '◯'} ${seat.seatLabel}`
                    : `× ${seat.seatLabel}`,
                callback_data: seat.status === 'AVAILABLE' ? `seat|${seat.seatLabel}` : 'seat|unavailable',
            })));
        }
    }
    keyboard.push([{
            text: `Confirm seats (${selected.size}/${flow.partySize})`,
            callback_data: selected.size === flow.partySize ? 'seat|confirm' : 'seat|wait',
        }, { text: 'Cancel', callback_data: 'seat|cancel' }]);
    return keyboard;
}
function seatLayoutDetails(flow) {
    const categoryCode = (type) => ({
        STANDARD: 'STD', PREMIUM: 'PRE', RECLINER: 'REC', VIP: 'VIP',
    }[type.toUpperCase()] ?? type.slice(0, 3).toUpperCase());
    const rows = (flow.seatRows ?? []).map(row => {
        const rowSeats = [...row.seats].sort((left, right) => left.seatLabel.localeCompare(right.seatLabel, undefined, { numeric: true, sensitivity: 'base' }));
        const markers = rowSeats.map(seat => `${seat.status === 'AVAILABLE' ? '◯' : '×'}${seat.seatLabel}(${categoryCode(seat.seatType)})`);
        return `${row.rowLabel.padEnd(2)} ${markers.join('  ')}`;
    }).join('\n');
    const categories = new Map();
    for (const row of flow.seatRows ?? []) {
        for (const seat of row.seats) {
            const prices = categories.get(seat.seatType) ?? [];
            prices.push(Number(seat.price));
            categories.set(seat.seatType, prices);
        }
    }
    const categoryPrices = [...categories.entries()].map(([type, prices]) => {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const name = type.toLocaleLowerCase().replace(/(^|_)\w/g, letter => letter.replace('_', ' ').toLocaleUpperCase());
        const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
        return `${categoryCode(type)} ${name}: ${price.format(min)}${max !== min ? `–${price.format(max)}` : ''} per seat`;
    });
    return `Seat layout for ${formatShow(flow.show, 0).replace(/^1\. /, '')}\n\n                 SCREEN / FRONT\n${rows}\n\n◯ Available   × Unavailable\nSeat categories and prices: ${categoryPrices.join(' | ') || 'not available'}`;
}
function escapeSvg(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    })[character]);
}
function seatMapSvg(flow) {
    const width = 1440;
    const seatWidth = 62;
    const seatHeight = 48;
    const seatGap = 14;
    const rowHeight = 64;
    const selected = new Set(flow.selectedSeatLabels ?? []);
    const code = (type) => ({ STANDARD: 'CLASSIC', PREMIUM: 'PRIME', RECLINER: 'RECLINER', VIP: 'VIP' }[type.toUpperCase()] ?? type.toUpperCase());
    const groups = [];
    for (const row of flow.seatRows ?? []) {
        const counts = new Map();
        for (const seat of row.seats)
            counts.set(seat.seatType, (counts.get(seat.seatType) ?? 0) + 1);
        const type = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'STANDARD';
        const prices = row.seats.filter(seat => seat.seatType === type).map(seat => Number(seat.price));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const group = groups[groups.length - 1];
        if (group?.type === type) {
            group.rows.push(row);
            group.minPrice = Math.min(group.minPrice, minPrice);
            group.maxPrice = Math.max(group.maxPrice, maxPrice);
        }
        else
            groups.push({ type, rows: [row], minPrice, maxPrice });
    }
    const money = (amount) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
    const title = escapeSvg(`Seat layout · ${formatShow(flow.show, 0).replace(/^1\. /, '')}`);
    let y = 108;
    const content = [];
    content.push(`<rect width="${width}" height="100%" fill="#ffffff"/>`);
    content.push(`<text x="${width / 2}" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#172033">${title}</text>`);
    content.push(`<line x1="70" y1="78" x2="1370" y2="78" stroke="#e5e7eb" stroke-width="2"/>`);
    for (const group of groups) {
        const price = group.minPrice === group.maxPrice ? money(group.minPrice) : `${money(group.minPrice)}–${money(group.maxPrice)}`;
        content.push(`<text x="${width / 2}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#202633">${escapeSvg(`${price} ${code(group.type)} ROWS`)}</text>`);
        content.push(`<line x1="110" y1="${y + 18}" x2="1370" y2="${y + 18}" stroke="#e5e7eb" stroke-width="2"/>`);
        y += 40;
        for (const row of group.rows) {
            const sorted = [...row.seats].sort((a, b) => Number(a.seatLabel.match(/\d+/)?.[0]) - Number(b.seatLabel.match(/\d+/)?.[0]));
            const totalWidth = sorted.length * seatWidth + Math.max(0, sorted.length - 1) * seatGap + (sorted.length > 8 ? 54 : 0);
            let x = width / 2 - totalWidth / 2 + 55;
            content.push(`<text x="80" y="${y + 32}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#374151">${escapeSvg(row.rowLabel)}</text>`);
            let previousNumber;
            sorted.forEach((seat, index) => {
                const number = Number(seat.seatLabel.match(/\d+/)?.[0]);
                if (index > 0 && (number - (previousNumber ?? number) > 1 || index === Math.floor(sorted.length / 2)))
                    x += 42;
                const isSelected = selected.has(seat.seatLabel);
                const available = seat.status === 'AVAILABLE';
                const fill = isSelected ? '#ffc83d' : available ? '#ffffff' : '#e5e7eb';
                const stroke = isSelected ? '#f0a500' : available ? '#27ae60' : '#d1d5db';
                const textFill = available || isSelected ? '#59616b' : '#ffffff';
                content.push(`<rect x="${x}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`);
                content.push(`<text x="${x + seatWidth / 2}" y="${y + 31}" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="600" fill="${textFill}">${escapeSvg(String(number).padStart(2, '0'))}</text>`);
                x += seatWidth + seatGap;
                previousNumber = number;
            });
            y += rowHeight;
        }
        y += 30;
    }
    const legendY = y + 12;
    content.push(`<rect x="340" y="${legendY}" width="22" height="22" rx="5" fill="#fff" stroke="#27ae60" stroke-width="2.5"/><text x="370" y="${legendY + 18}" font-family="Arial,sans-serif" font-size="18" fill="#374151">Available</text>`);
    content.push(`<rect x="520" y="${legendY}" width="22" height="22" rx="5" fill="#ffc83d" stroke="#f0a500" stroke-width="2.5"/><text x="550" y="${legendY + 18}" font-family="Arial,sans-serif" font-size="18" fill="#374151">Selected</text>`);
    content.push(`<rect x="700" y="${legendY}" width="22" height="22" rx="5" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2.5"/><text x="730" y="${legendY + 18}" font-family="Arial,sans-serif" font-size="18" fill="#374151">Unavailable</text>`);
    y += 65;
    const priceSummary = groups.map(group => `${code(group.type)} ${group.minPrice === group.maxPrice ? money(group.minPrice) : `${money(group.minPrice)}–${money(group.maxPrice)}`}`).join('  ·  ');
    content.push(`<text x="${width / 2}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#4b5563">${escapeSvg(priceSummary)}</text>`);
    y += 46;
    content.push(`<path d="M 410 ${y + 34} L 470 ${y} L 970 ${y} L 1030 ${y + 34} L 1008 ${y + 51} L 432 ${y + 51} Z" fill="#e0f2fe" stroke="#bfdcf5" stroke-width="3"/>`);
    content.push(`<text x="${width / 2}" y="${y + 81}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#6b7280">SCREEN · All eyes this way</text>`);
    y += 115;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}">${content.join('')}</svg>`;
}
function seatSelectionReply(flow) {
    const chosen = flow.selectedSeatLabels ?? [];
    return {
        text: `Seat map for ${flow.movie.title} · ${flow.city}. Tap ${flow.partySize} available seats using the buttons below.\nSelected: ${chosen.length ? chosen.join(', ') : 'none'} (${chosen.length}/${flow.partySize})`,
        photoSvg: seatMapSvg(flow),
        inlineKeyboard: makeSeatKeyboard(flow),
    };
}
function partySizeReply(flow) {
    return {
        text: `🎟 <b>${flow.movie.title}</b>\n📍 ${flow.city}\n\nHow many seats would you like?`,
        inlineKeyboard: [
            [1, 2, 3].map(count => ({ text: `${count} ${count === 1 ? 'seat' : 'seats'}`, callback_data: `party|${count}` })),
            [4, 5, 6].map(count => ({ text: `${count} seats`, callback_data: `party|${count}` })),
            [{ text: 'Cancel', callback_data: 'seat|cancel' }],
        ],
    };
}
async function openSeatMap(flow) {
    const show = flow.show;
    if (!show)
        return 'I lost the selected show. Please choose a showtime again.';
    const seatMap = await api(`/shows/${show.id}/seats`);
    const seats = seatMap.rows.flatMap(row => row.seats).filter(seat => seat.status === 'AVAILABLE');
    flow.seatRows = seatMap.rows;
    flow.seats = seats;
    flow.selectedSeatLabels = [];
    flow.stage = 'choose_seats';
    flows.set(flow.chatId, flow);
    if (!seats.length) {
        flow.stage = 'choose_party';
        return { ...partySizeReply(flow), text: 'That show has no available seats. Choose another showtime.' };
    }
    return {
        text: `Tap ${flow.partySize} available seat${flow.partySize === 1 ? '' : 's'} using the buttons below, then tap Confirm seats. Seat categories and prices are shown in the image.`,
        photoSvg: seatMapSvg(flow),
        inlineKeyboard: makeSeatKeyboard(flow),
    };
}
async function beginShowSelection(chatId, showId) {
    const previous = flows.get(chatId);
    if (previous?.lockId && previous.stage === 'confirm_payment') {
        await api(`/seat-locks/${previous.lockId}/release`, {
            method: 'POST', body: JSON.stringify({ sessionId: previous.sessionId }),
        }).catch(() => undefined);
    }
    const selected = await api(`/shows/${encodeURIComponent(showId)}`);
    const movie = { id: selected.movie.id, title: selected.movie.title };
    const show = {
        id: selected.id,
        startTime: selected.startTime,
        movie: { title: selected.movie.title },
        screen: { name: selected.screen.name, theatre: {
                id: selected.screen.theatre.id,
                name: selected.screen.theatre.name,
                address: selected.screen.theatre.address,
                city: { name: selected.screen.theatre.city.name },
                timezone: selected.screen.theatre.timezone ?? 'Asia/Kolkata',
            } },
        availability: {
            available: (selected.showSeats ?? []).filter((seat) => seat.status === 'AVAILABLE').length,
            total: (selected.showSeats ?? []).length,
        },
        priceRange: (() => {
            const prices = (selected.showSeats ?? []).map((seat) => Number(seat.price));
            return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : undefined;
        })(),
    };
    const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: show.screen.theatre.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(show.startTime));
    const flow = {
        chatId, sessionId: `telegram-${chatId}`, stage: 'choose_party', partySize: previous?.partySize ?? 0,
        movie, city: show.screen.theatre.city.name, date, show, shows: [show],
    };
    flows.set(chatId, flow);
    if (flow.partySize > 0)
        return openSeatMap(flow);
    return partySizeReply(flow);
}
async function selectShow(flow, message) {
    const show = chooseShow(flow.shows ?? [], message);
    if (!show)
        return `Please reply with a show number or exact time:\n${(flow.shows ?? []).map(formatShow).join('\n')}`;
    flow.show = show;
    if (flow.partySize > 0)
        return openSeatMap(flow);
    flow.stage = 'choose_party';
    flows.set(flow.chatId, flow);
    return partySizeReply(flow);
}
async function confirmSeats(flow, message) {
    const labels = extractSeatLabels(message);
    if (labels.length !== flow.partySize) {
        return `Please choose exactly ${flow.partySize} available seat label${flow.partySize === 1 ? '' : 's'}, separated by commas.`;
    }
    const selected = labels.map(label => flow.seats?.find(seat => seat.seatLabel.toUpperCase() === label));
    if (selected.some(seat => !seat))
        return 'I couldn’t match every seat label. Please choose from the available seats I listed.';
    const seats = selected;
    const locked = await api('/seat-locks', {
        method: 'POST', body: JSON.stringify({ showId: flow.show.id, seatIds: seats.map(seat => seat.showSeatId), sessionId: flow.sessionId }),
    });
    flow.lockId = locked.lockId;
    flow.seatIds = locked.seatIds;
    flow.seatLabels = locked.seatLabels;
    flow.amount = seats.reduce((sum, seat) => sum + Number(seat.price), 0);
    flow.stage = 'confirm_payment';
    flows.set(flow.chatId, flow);
    return `Seats ${locked.seatLabels.join(', ')} are held for 5 minutes. Total: ₹${flow.amount}. This is a demo booking with simulated payment only. Reply PAY DEMO to confirm, or CANCEL to release the seats.`;
}
async function finishDemoPayment(flow) {
    const booking = await api('/bookings', {
        method: 'POST', body: JSON.stringify({
            showId: flow.show.id, lockId: flow.lockId, sessionId: flow.sessionId, seatIds: flow.seatIds,
        }),
    });
    flow.bookingId = booking.bookingId;
    const payment = await api('/payments/checkout', {
        method: 'POST', body: JSON.stringify({
            bookingId: booking.bookingId,
            sessionId: flow.sessionId,
            idempotencyKey: `telegram-demo-${flow.sessionId}-${booking.bookingId}`,
        }),
    });
    flow.paymentId = payment.paymentId;
    await api(`/payments/${payment.paymentId}/simulate`, {
        method: 'POST', body: JSON.stringify({ outcome: 'success' }),
    });
    const ticket = await api(`/bookings/${booking.bookingId}/ticket?sessionId=${encodeURIComponent(flow.sessionId)}`);
    flows.delete(flow.chatId);
    return `Demo payment successful (simulated). Your booking is confirmed.\nMovie: ${flow.movie.title}\nShow: ${formatShow(flow.show, 0).replace(/^1\. /, '')}\nSeats: ${flow.seatLabels.join(', ')}\nTotal: ₹${booking.totalAmount}\nBooking reference: ${booking.bookingReference}\nTicket reference: ${ticket.ticketReference}`;
}
async function handleBookingMessage(chatId, text, history) {
    let flow = flows.get(chatId);
    const message = text.trim();
    if (flow && /\bcancel\b/i.test(message)) {
        if (flow.lockId && flow.stage === 'confirm_payment') {
            await api(`/seat-locks/${flow.lockId}/release`, {
                method: 'POST', body: JSON.stringify({ sessionId: flow.sessionId }),
            });
        }
        flows.delete(chatId);
        return 'Booking cancelled. Any active seat hold has been released.';
    }
    // A new booking request should replace an unfinished flow instead of being
    // mistaken for a show number, a seat label, or a payment reply.
    if (flow && /\b(book|booking|reserve)\b/i.test(message)) {
        if (flow.lockId && flow.stage === 'confirm_payment') {
            await api(`/seat-locks/${flow.lockId}/release`, {
                method: 'POST', body: JSON.stringify({ sessionId: flow.sessionId }),
            }).catch(() => undefined);
        }
        flows.delete(chatId);
        flow = undefined;
    }
    // Let users ask about listings or get help without destroying the active
    // booking. Their next short answer can still continue the saved stage.
    if (flow && isGeneralQuestion(message))
        return null;
    if (flow?.stage === 'need_city') {
        const cities = await listCities();
        const city = matchCity(cities, message);
        if (!city) {
            const requested = explicitCityReference(message, true);
            if (requested && /\bin\s+/i.test(message))
                return unknownCityReply(requested, cities);
            return {
                text: `Sure — I can help with that. Which city would you like to book in?${cities.length ? ` I currently have JoJo Cinema listings in ${cities.map(item => item.name).join(', ')}.` : ''}`,
                inlineKeyboard: cityKeyboard(cities),
            };
        }
        flow.city = city;
        return showMoviesForCity(flow);
    }
    if (flow?.stage === 'choose_movie') {
        const movie = movieChoice(flow, message);
        if (!movie)
            return showMoviesForCity(flow);
        flow.movie = movie;
        return showTheatresForMovie(flow);
    }
    if (flow?.stage === 'choose_theatre') {
        const theatre = theatreChoice(flow, message);
        if (!theatre) {
            return `Choose a cinema by number or name:\n${(flow.theatres ?? []).map((item, index) => `${index + 1}. ${item.name}`).join('\n')}`;
        }
        return showtimesForTheatre(flow, theatre);
    }
    if (flow?.stage === 'choose_show')
        return selectShow(flow, message);
    if (flow?.stage === 'choose_party') {
        const partySize = Number(message.match(/\b([1-6])\b/)?.[1]);
        if (!partySize)
            return partySizeReply(flow);
        flow.partySize = partySize;
        return openSeatMap(flow);
    }
    if (flow?.stage === 'choose_seats')
        return confirmSeats(flow, message);
    if (flow?.stage === 'confirm_payment') {
        if (/\b(pay demo|confirm payment|confirm|yes)\b/i.test(message))
            return finishDemoPayment(flow);
        return 'Your seats are still held. Reply PAY DEMO to complete the simulated payment, or CANCEL to release them.';
    }
    if (!/\b(book|booking|reserve)\b/i.test(message))
        return null;
    const count = Number(message.match(/\b([1-6])\s*(?:seats?|tickets?)\b/i)?.[1] ?? 0);
    const cities = await listCities();
    const city = matchCity(cities, message);
    const cityReference = explicitCityReference(message);
    if (cityReference && !city)
        return unknownCityReply(cityReference, cities);
    flow = {
        stage: city ? 'choose_movie' : 'need_city',
        chatId,
        sessionId: `telegram-${chatId}`,
        partySize: count,
        city,
        date: requestedDate(`${history.map(item => item.content).join(' ')} ${message}`),
    };
    flows.set(chatId, flow);
    if (city)
        return showMoviesForCity(flow);
    return {
        text: `First, choose the city where you want to book. Available cities: ${cities.map(item => item.name).join(', ')}.`,
        inlineKeyboard: cityKeyboard(cities),
    };
}
async function handleBookingCallback(chatId, data) {
    if (data.startsWith('bookcity|')) {
        const flow = flows.get(chatId);
        if (!flow || flow.stage !== 'need_city')
            return null;
        const cities = await listCities();
        const city = matchCity(cities, decodeURIComponent(data.slice('bookcity|'.length)));
        if (!city)
            return { text: 'Please choose one of the listed cities.', inlineKeyboard: cityKeyboard(cities) };
        flow.city = city;
        return showMoviesForCity(flow);
    }
    if (data.startsWith('movie|')) {
        const flow = flows.get(chatId);
        if (!flow || flow.stage !== 'choose_movie')
            return null;
        const movie = flow.movies?.find(item => item.id === data.slice('movie|'.length));
        if (!movie)
            return showMoviesForCity(flow);
        flow.movie = movie;
        return showTheatresForMovie(flow);
    }
    if (data.startsWith('theatre|')) {
        const flow = flows.get(chatId);
        if (!flow || flow.stage !== 'choose_theatre')
            return null;
        const theatre = flow.theatres?.find(item => item.id === data.slice('theatre|'.length));
        if (!theatre)
            return { text: 'Please choose one of the listed cinemas.' };
        return showtimesForTheatre(flow, theatre);
    }
    if (data.startsWith('show|'))
        return beginShowSelection(chatId, data.slice('show|'.length));
    const flow = flows.get(chatId);
    if (!flow)
        return null;
    const [, action] = data.split('|', 2);
    if (action === 'cancel') {
        flows.delete(chatId);
        return 'Seat selection cancelled.';
    }
    if (flow.stage === 'choose_party') {
        const partySize = Number(action);
        if (!data.startsWith('party|') || !Number.isInteger(partySize) || partySize < 1 || partySize > 6)
            return partySizeReply(flow);
        flow.partySize = partySize;
        return openSeatMap(flow);
    }
    if (flow.stage !== 'choose_seats')
        return null;
    if (action === 'wait')
        return seatSelectionReply(flow);
    if (action === 'confirm') {
        const labels = flow.selectedSeatLabels ?? [];
        if (labels.length !== flow.partySize)
            return seatSelectionReply(flow);
        return confirmSeats(flow, labels.join(', '));
    }
    if (action === 'unavailable')
        return seatSelectionReply(flow);
    const seat = flow.seats?.find(candidate => candidate.seatLabel === action);
    if (!seat)
        return seatSelectionReply(flow);
    const chosen = flow.selectedSeatLabels ?? [];
    flow.selectedSeatLabels = chosen.includes(action)
        ? chosen.filter(label => label !== action)
        : chosen.length < flow.partySize ? [...chosen, action] : chosen;
    flows.set(chatId, flow);
    return seatSelectionReply(flow);
}
//# sourceMappingURL=bookingFlow.js.map