"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTelegramReply = formatTelegramReply;
exports.createTelegramPresentation = createTelegramPresentation;
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
}
function showDate(show) {
    const timezone = show.screen?.theatre?.timezone ?? 'Asia/Kolkata';
    return new Intl.DateTimeFormat('en-IN', { timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(show.startTime));
}
function showTime(show) {
    const timezone = show.screen?.theatre?.timezone ?? 'Asia/Kolkata';
    return new Intl.DateTimeFormat('en-IN', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(show.startTime));
}
function priceLabel(show) {
    const min = show.priceRange?.min;
    const max = show.priceRange?.max;
    if (typeof min !== 'number' || typeof max !== 'number')
        return 'Price unavailable';
    return min === max ? `₹${min}` : `₹${min}–₹${max}`;
}
function formatTelegramReply(reply, presentation) {
    if (!presentation) {
        return { text: `<b>JoJo Cinema</b>\n\n${escapeHtml(reply)}` };
    }
    if (presentation.type === 'showtimes') {
        const shows = presentation.items;
        if (!shows.length)
            return { text: `<b>🎬 ${escapeHtml(presentation.title ?? 'Showtimes')}</b>\n\n${escapeHtml(reply)}` };
        const groups = new Map();
        for (const show of shows) {
            const theatre = show.screen?.theatre?.name ?? 'Cinema';
            const key = `${showDate(show)}|${theatre}`;
            groups.set(key, [...(groups.get(key) ?? []), show]);
        }
        const city = shows[0]?.screen?.theatre?.city?.name;
        const header = `<b>🎬 ${escapeHtml(presentation.title ?? shows[0]?.movie?.title ?? 'Showtimes')}</b>\n📍 ${escapeHtml(city ?? '')}`;
        const body = [];
        const keyboard = [];
        for (const [key, group] of groups) {
            const [date, theatre] = key.split('|');
            body.push(`\n<b>${escapeHtml(theatre)}</b> · ${escapeHtml(date)}`);
            for (let i = 0; i < group.length; i += 2) {
                const pair = group.slice(i, i + 2);
                const labels = pair.map(show => `${showTime(show)}  ${priceLabel(show)}${typeof show.availability?.available === 'number' ? ` · ${show.availability.available} left` : ''}`);
                body.push(`  ${escapeHtml(labels.join('   |   '))}`);
                keyboard.push(pair.map(show => ({
                    text: `${showTime(show)} · ${priceLabel(show)}`.slice(0, 60),
                    callback_data: `show|${show.id}`,
                })));
            }
        }
        return { text: `${header}${body.join('\n')}\n\n<i>Choose a showtime to continue to seat selection.</i>`, inlineKeyboard: keyboard };
    }
    if (presentation.type === 'movies') {
        const movies = presentation.items;
        const body = movies.map((movie, index) => {
            const genres = Array.isArray(movie.genres) ? movie.genres.join(' · ') : '';
            const details = [movie.language, genres, movie.durationMinutes ? `${Math.floor(movie.durationMinutes / 60)}h ${movie.durationMinutes % 60}m` : '']
                .filter(Boolean).map(escapeHtml).join('  •  ');
            return `<b>${index + 1}. ${escapeHtml(movie.title)}</b>${details ? `\n   ${details}` : ''}`;
        });
        return { text: `<b>🎞 ${escapeHtml(presentation.title ?? 'Now showing')}</b>${presentation.subtitle ? `\n📍 ${escapeHtml(presentation.subtitle)}` : ''}\n\n${body.join('\n\n')}\n\n<i>Ask for a movie’s showtimes or prices.</i>` };
    }
    if (presentation.type === 'cities') {
        const labels = presentation.items.map(item => String(item.name ?? '')).filter(Boolean);
        return {
            text: `<b>📍 JoJo Cinema cities</b>\n\nChoose a city to see cinemas and movies.`,
            inlineKeyboard: labels.map(name => [{ text: name, callback_data: `city|${encodeURIComponent(name)}` }]),
        };
    }
    const cinemas = presentation.items;
    const body = cinemas.map((cinema, index) => `<b>${index + 1}. ${escapeHtml(cinema.name)}</b>\n   ${escapeHtml(cinema.address)}${cinema.city?.name ? ` · ${escapeHtml(cinema.city.name)}` : ''}`);
    const city = cinemas[0]?.city?.name;
    return { text: `<b>🏛 ${escapeHtml(presentation.title ?? (city ? `Cinemas in ${city}` : 'Cinema locations'))}</b>\n\n${body.join('\n\n')}` };
}
function createTelegramPresentation(intent, selectedTool, evidence) {
    const items = Array.isArray(evidence) ? evidence.filter(value => value && typeof value === 'object') : [];
    if (selectedTool === 'showtime_search') {
        return { type: 'showtimes', title: items[0]?.movie?.title, items };
    }
    if (selectedTool === 'movie_search') {
        return { type: 'movies', items };
    }
    if (intent === 'general_cinema_help' && items.length && items.every(item => typeof item.name === 'string' && typeof item.address !== 'string')) {
        return { type: 'cities', items };
    }
    if (intent === 'general_cinema_help' && items.length && items.some(item => typeof item.address === 'string' && item.city)) {
        return { type: 'cinemas', title: 'JoJo Cinema locations', items };
    }
    return undefined;
}
//# sourceMappingURL=presentation.js.map