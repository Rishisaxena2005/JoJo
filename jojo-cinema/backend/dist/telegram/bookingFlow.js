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
    return `${index + 1}. ${time} — ${show.screen.theatre.name}, ${show.screen.theatre.city.name}`;
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
async function findShows(flow) {
    if (!flow.movie || !flow.city)
        return [];
    const query = new URLSearchParams({ movieId: flow.movie.id, city: flow.city, date: flow.date });
    return api(`/shows?${query.toString()}`);
}
async function listMoviesAndCities(text) {
    const [movieResult, cities] = await Promise.all([
        api('/movies?status=NOW_SHOWING&limit=100'),
        api('/movies/cities'),
    ]);
    return { movie: matchMovie(movieResult.items, text), city: matchCity(cities, text), cities };
}
function unknownCityReply(city, cities) {
    const available = cities.map(item => item.name).join(', ');
    return `I couldn’t find a JoJo Cinema location in ${city}.${available ? ` Current cities in the listings: ${available}.` : ''}`;
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
async function selectShow(flow, message) {
    const show = chooseShow(flow.shows ?? [], message);
    if (!show)
        return `Please reply with a show number or exact time:\n${(flow.shows ?? []).map(formatShow).join('\n')}`;
    const seatMap = await api(`/shows/${show.id}/seats`);
    const seats = seatMap.rows.flatMap(row => row.seats).filter(seat => seat.status === 'AVAILABLE');
    flow.show = show;
    flow.seatRows = seatMap.rows;
    flow.seats = seats;
    flow.selectedSeatLabels = [];
    flow.stage = 'choose_seats';
    flows.set(flow.chatId, flow);
    if (!seats.length) {
        flow.stage = 'choose_show';
        return 'That show has no available seats. Please choose another show.';
    }
    return {
        text: `Tap ${flow.partySize} available seat${flow.partySize === 1 ? '' : 's'} using the buttons below, then tap Confirm seats. Seat categories and prices are shown in the image.`,
        photoSvg: seatMapSvg(flow),
        inlineKeyboard: makeSeatKeyboard(flow),
    };
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
    if (flow?.stage === 'choose_show')
        return selectShow(flow, message);
    if (flow?.stage === 'choose_seats')
        return confirmSeats(flow, message);
    if (flow?.stage === 'confirm_payment') {
        if (/\b(pay demo|confirm payment|confirm|yes)\b/i.test(message))
            return finishDemoPayment(flow);
        return 'Your seats are still held. Reply PAY DEMO to complete the simulated payment, or CANCEL to release them.';
    }
    if (flow?.stage === 'need_movie' || flow?.stage === 'need_city') {
        const current = await listMoviesAndCities(message);
        const previous = await listMoviesAndCities(history.map(item => item.content).join(' '));
        const cityReference = explicitCityReference(message, flow.stage === 'need_city');
        flow.movie ??= current.movie ?? previous.movie;
        flow.city ??= current.city ?? (!cityReference ? previous.city : undefined);
        if (!flow.movie) {
            flow.stage = 'need_movie';
            flows.set(chatId, flow);
            return 'Which movie would you like to book?';
        }
        if (!flow.city) {
            if (cityReference) {
                flows.set(chatId, flow);
                return unknownCityReply(cityReference, current.cities);
            }
            flow.stage = 'need_city';
            flows.set(chatId, flow);
            return `Which city should I search for ${flow.movie.title}?`;
        }
        flow.date = requestedDate(`${history.map(item => item.content).join(' ')} ${message}`);
        flow.shows = await findShows(flow);
        if (!flow.shows.length) {
            flows.delete(chatId);
            return `I couldn’t find showtimes for ${flow.movie.title} in ${flow.city} on ${flow.date}.`;
        }
        flow.stage = 'choose_show';
        flows.set(chatId, flow);
        return `Available shows for ${flow.movie.title} in ${flow.city}:\n${flow.shows.map(formatShow).join('\n')}\nReply with a show number or exact time.`;
    }
    if (!/\b(book|booking|reserve)\b/i.test(message))
        return null;
    const count = Number(message.match(/\b([1-6])\s*(?:seats?|tickets?)\b/i)?.[1] ?? 1);
    const current = await listMoviesAndCities(message);
    const previous = await listMoviesAndCities(history.map(item => item.content).join(' '));
    const cityReference = explicitCityReference(message);
    const found = {
        movie: current.movie ?? previous.movie,
        city: current.city ?? (!cityReference ? previous.city : undefined),
        cities: current.cities,
    };
    if (cityReference && !found.city)
        return unknownCityReply(cityReference, found.cities);
    flow = {
        stage: 'need_movie',
        chatId,
        sessionId: `telegram-${chatId}`,
        partySize: count,
        movie: found.movie,
        city: found.city,
        date: requestedDate(`${history.map(item => item.content).join(' ')} ${message}`),
    };
    if (!flow.movie) {
        flows.set(chatId, flow);
        return 'Which movie would you like to book?';
    }
    if (!flow.city) {
        flow.stage = 'need_city';
        flows.set(chatId, flow);
        return `Which city should I search for ${flow.movie.title}?`;
    }
    flow.shows = await findShows(flow);
    if (!flow.shows.length) {
        flows.delete(chatId);
        return `I couldn’t find showtimes for ${flow.movie.title} in ${flow.city} on ${flow.date}.`;
    }
    flow.stage = 'choose_show';
    flows.set(chatId, flow);
    const selected = chooseShow(flow.shows, message);
    if (selected)
        return selectShow(flow, String(flow.shows.indexOf(selected) + 1));
    return `Available shows for ${flow.movie.title} in ${flow.city}:\n${flow.shows.map(formatShow).join('\n')}\nReply with a show number or exact time.`;
}
async function handleBookingCallback(chatId, data) {
    const flow = flows.get(chatId);
    if (!flow || flow.stage !== 'choose_seats')
        return null;
    const [, action] = data.split('|', 2);
    if (action === 'cancel') {
        flows.delete(chatId);
        return 'Seat selection cancelled.';
    }
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