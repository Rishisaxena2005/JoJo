// JoJo Cinema — Database Seed Script
// Run: npm run db:seed
// This script is idempotent — safe to run multiple times

import { PrismaClient, MovieStatus, SeatType, ShowStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function todayAt(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

const MOVIES = [
  {
    title: 'Kalki Chronicles',
    synopsis: 'In a dystopian future India, a warrior chosen by destiny must battle an immortal tyrant to usher in a new age of peace. An epic sci-fi mythological saga.',
    language: 'Hindi',
    genres: ['Action', 'Sci-Fi', 'Mythology'],
    durationMinutes: 181,
    certification: 'U/A',
    posterUrl: 'https://picsum.photos/seed/kalki/300/450',
    backdropUrl: 'https://picsum.photos/seed/kalki-back/1280/720',
    releaseDate: new Date('2026-08-15'),
    status: MovieStatus.NOW_SHOWING,
    director: 'Nag Ashwin',
    cast: ['Prabhas', 'Deepika Padukone', 'Amitabh Bachchan', 'Kamal Haasan'],
  },
  {
    title: 'Mumbai Monsoon',
    synopsis: 'A gripping crime thriller set in the underbelly of Mumbai during the rainy season, where a cop and a gangster must form an unlikely alliance.',
    language: 'Hindi',
    genres: ['Crime', 'Thriller', 'Drama'],
    durationMinutes: 148,
    certification: 'A',
    posterUrl: 'https://picsum.photos/seed/mumbai/300/450',
    backdropUrl: 'https://picsum.photos/seed/mumbai-back/1280/720',
    releaseDate: new Date('2026-09-12'),
    status: MovieStatus.NOW_SHOWING,
    director: 'Vishal Bhardwaj',
    cast: ['Ranveer Singh', 'Nawazuddin Siddiqui', 'Tabu'],
  },
  {
    title: 'Stellar Drift',
    synopsis: 'An Indian astronaut stranded on a dying space station must use her ingenuity to survive 72 hours before the rescue window closes forever.',
    language: 'English',
    genres: ['Sci-Fi', 'Thriller'],
    durationMinutes: 127,
    certification: 'U/A',
    posterUrl: 'https://picsum.photos/seed/stellar/300/450',
    backdropUrl: 'https://picsum.photos/seed/stellar-back/1280/720',
    releaseDate: new Date('2026-10-01'),
    status: MovieStatus.NOW_SHOWING,
    director: 'Zoya Akhtar',
    cast: ['Priyanka Chopra', 'Jim Sarbh', 'Vijay Varma'],
  },
  {
    title: 'Chai & Chutney',
    synopsis: 'A heartwarming comedy about three generations of a Pune family whose roadside chai stall becomes the unlikely battleground for modernity vs tradition.',
    language: 'Marathi',
    genres: ['Comedy', 'Drama', 'Family'],
    durationMinutes: 133,
    certification: 'U',
    posterUrl: 'https://picsum.photos/seed/chai/300/450',
    backdropUrl: 'https://picsum.photos/seed/chai-back/1280/720',
    releaseDate: new Date('2026-09-25'),
    status: MovieStatus.NOW_SHOWING,
    director: 'Sachin Kundalkar',
    cast: ['Subodh Bhave', 'Sai Tamhankar', 'Jitendra Joshi'],
  },
  {
    title: 'Raga of the Night',
    synopsis: 'A classical musician discovers a 200-year-old raga that, when played, reveals glimpses of the past. A mystical music-drama shot in Varanasi and Jaipur.',
    language: 'Hindi',
    genres: ['Drama', 'Mystery', 'Musical'],
    durationMinutes: 155,
    certification: 'U',
    posterUrl: 'https://picsum.photos/seed/raga/300/450',
    backdropUrl: 'https://picsum.photos/seed/raga-back/1280/720',
    releaseDate: new Date('2026-10-10'),
    status: MovieStatus.NOW_SHOWING,
    director: 'Mira Nair',
    cast: ['Irfan Khan Jr.', 'Radhika Apte', 'Naseeruddin Shah'],
  },
  {
    title: 'Project Leela',
    synopsis: 'A high-octane espionage thriller where RAW agent Leela must stop a bioterror attack with only 48 hours and zero official backup.',
    language: 'Hindi',
    genres: ['Action', 'Espionage', 'Thriller'],
    durationMinutes: 142,
    certification: 'A',
    posterUrl: 'https://picsum.photos/seed/leela/300/450',
    backdropUrl: 'https://picsum.photos/seed/leela-back/1280/720',
    releaseDate: new Date('2026-11-01'),
    status: MovieStatus.UPCOMING,
    director: 'Ali Abbas Zafar',
    cast: ['Katrina Kaif', 'Vikrant Massey', 'Anil Kapoor'],
  },
  {
    title: 'Dragon Sands',
    synopsis: 'An animated adventure following a young girl from Rajasthan who discovers a dragon hatching from a sand dune and must protect it from mythical hunters.',
    language: 'Hindi',
    genres: ['Animation', 'Adventure', 'Family'],
    durationMinutes: 98,
    certification: 'U',
    posterUrl: 'https://picsum.photos/seed/dragon/300/450',
    backdropUrl: 'https://picsum.photos/seed/dragon-back/1280/720',
    releaseDate: new Date('2026-11-15'),
    status: MovieStatus.UPCOMING,
    director: 'Gitanjali Rao',
    cast: ['Voice Cast: Radhika Madan', 'Pankaj Tripathi'],
  },
];

const CITIES = [
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Bengaluru', state: 'Karnataka' },
  { name: 'Delhi', state: 'Delhi' },
];

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting JoJo Cinema seed...');

  // ── 1. Upsert Cities ───────────────────────────────────────────────────

  const cityMap: Record<string, string> = {};
  for (const c of CITIES) {
    const city = await prisma.city.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, state: c.state },
    });
    cityMap[c.name] = city.id;
    console.log(`  ✓ City: ${city.name}`);
  }

  // ── 2. Upsert Movies ───────────────────────────────────────────────────

  const movieMap: Record<string, string> = {};
  for (const m of MOVIES) {
    const existing = await prisma.movie.findFirst({ where: { title: m.title } });
    const movie = existing
      ? await prisma.movie.update({ where: { id: existing.id }, data: m })
      : await prisma.movie.create({ data: m });
    movieMap[m.title] = movie.id;
    console.log(`  ✓ Movie: ${movie.title}`);
  }

  // ── 3. Upsert Theatres & Screens ──────────────────────────────────────

  type TheatreConfig = {
    name: string;
    city: string;
    address: string;
    screens: {
      name: string;
      rows: string[];
      seatsPerRow: number;
      premiumRows: string[];
    }[];
  };

  const THEATRES: TheatreConfig[] = [
    {
      name: 'PVR Cinemas — Phoenix MarketCity',
      city: 'Pune',
      address: 'Phoenix MarketCity, Nagar Road, Pune 411014',
      screens: [
        { name: 'Screen 1 — IMAX', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], seatsPerRow: 12, premiumRows: ['A', 'B'] },
        { name: 'Screen 2 — 4DX', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
        { name: 'Screen 3 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'INOX — Bund Garden',
      city: 'Pune',
      address: 'Weikfield IT City Infopark, Bund Garden Road, Pune 411001',
      screens: [
        { name: 'Audi 1', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
        { name: 'Audi 2', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], seatsPerRow: 8, premiumRows: ['A'] },
        { name: 'Audi 3 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'Cinépolis — Westend Mall',
      city: 'Pune',
      address: 'Westend Mall, Aundh, Pune 411007',
      screens: [
        { name: 'Hall A', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
        { name: 'Hall B', rows: ['A', 'B', 'C', 'D', 'E', 'F'], seatsPerRow: 9, premiumRows: ['A'] },
      ],
    },
    {
      name: 'PVR Cinemas — Palladium Mall',
      city: 'Mumbai',
      address: 'Palladium Mall, Lower Parel, Mumbai 400013',
      screens: [
        { name: 'Screen 1', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], seatsPerRow: 12, premiumRows: ['A', 'B', 'C'] },
        { name: 'Screen 2', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
        { name: 'Screen 3 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'INOX Garuda Mall',
      city: 'Bengaluru',
      address: 'Garuda Mall, Magrath Road, Bengaluru 560025',
      screens: [
        { name: 'Audi 1', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
        { name: 'Audi 2', rows: ['A', 'B', 'C', 'D', 'E', 'F'], seatsPerRow: 8, premiumRows: ['A'] },
      ],
    },
    {
      name: 'PVR Cinemas — Orion Mall (Demo)',
      city: 'Bengaluru',
      address: 'Orion Mall, Dr Rajkumar Road, Bengaluru (demo listing)',
      screens: [
        { name: 'Screen 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'Cinépolis — Central Bengaluru (Demo)',
      city: 'Bengaluru',
      address: 'Central Bengaluru (demo listing)',
      screens: [
        { name: 'Hall 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'INOX — R City Mall (Demo)',
      city: 'Mumbai',
      address: 'R City Mall, Ghatkopar, Mumbai (demo listing)',
      screens: [
        { name: 'Screen 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'Cinépolis — Western Mumbai (Demo)',
      city: 'Mumbai',
      address: 'Western Mumbai (demo listing)',
      screens: [
        { name: 'Hall 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'PVR Cinemas — Select Citywalk (Demo)',
      city: 'Delhi',
      address: 'Select Citywalk, Saket, Delhi (demo listing)',
      screens: [
        { name: 'Screen 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'INOX — Connaught Place (Demo)',
      city: 'Delhi',
      address: 'Connaught Place, New Delhi (demo listing)',
      screens: [
        { name: 'Screen 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
    {
      name: 'Cinépolis — Vasant Kunj (Demo)',
      city: 'Delhi',
      address: 'Vasant Kunj, Delhi (demo listing)',
      screens: [
        { name: 'Hall 1 — Demo', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, premiumRows: ['A', 'B'] },
      ],
    },
  ];

  // Map: "Theatre Name|Screen Name" → { screenId, rows, premiumRows, seatsPerRow }
  type ScreenInfo = { screenId: string; rows: string[]; premiumRows: string[]; seatsPerRow: number };
  const screenMap: Record<string, ScreenInfo> = {};

  for (const t of THEATRES) {
    const cityId = cityMap[t.city];

    let theatre = await prisma.theatre.findFirst({
      where: { name: t.name, cityId },
    });
    if (!theatre) {
      theatre = await prisma.theatre.create({
        data: { name: t.name, cityId, address: t.address },
      });
    }
    console.log(`  ✓ Theatre: ${theatre.name}`);

    for (const s of t.screens) {
      let screen = await prisma.screen.findUnique({
        where: { theatreId_name: { theatreId: theatre.id, name: s.name } },
      });
      if (!screen) {
        screen = await prisma.screen.create({
          data: {
            theatreId: theatre.id,
            name: s.name,
            seatLayout: {
              rows: s.rows,
              seatsPerRow: s.seatsPerRow,
              premiumRows: s.premiumRows,
            },
          },
        });
      }

      screenMap[`${t.name}|${s.name}`] = {
        screenId: screen.id,
        rows: s.rows,
        premiumRows: s.premiumRows,
        seatsPerRow: s.seatsPerRow,
      };

      // Batch create seats
      const seatData = [];
      for (const row of s.rows) {
        for (let col = 1; col <= s.seatsPerRow; col++) {
          const label = `${row}${col}`;
          const isPremium = s.premiumRows.includes(row);
          const seatType = isPremium ? SeatType.PREMIUM : SeatType.STANDARD;
          const basePrice = new Decimal(isPremium ? 350 : 220);
          seatData.push({
            screenId: screen.id,
            seatLabel: label,
            rowLabel: row,
            seatType,
            basePrice,
          });
        }
      }
      await prisma.seat.createMany({
        data: seatData,
        skipDuplicates: true,
      });
      console.log(`    ✓ Screen: ${screen.name} (${s.rows.length * s.seatsPerRow} seats)`);
    }
  }

  // ── 4. Create Shows for Today + Next 7 Days ────────────────────────────

  // Movies to show per city: map movie titles to city/theatre/screen/showtimes
  type ShowConfig = {
    movieTitle: string;
    theatreName: string;
    screenName: string;
    showtimes: { hour: number; minute: number }[];
    format: string;
  };

  const now = new Date();
  const showDates = [0, 1, 2, 3, 4, 5, 6].map(d => addDays(now, d));

  const SHOW_CONFIGS: ShowConfig[] = [
    // Pune — PVR
    {
      movieTitle: 'Kalki Chronicles',
      theatreName: 'PVR Cinemas — Phoenix MarketCity',
      screenName: 'Screen 1 — IMAX',
      showtimes: [{ hour: 10, minute: 0 }, { hour: 14, minute: 30 }, { hour: 19, minute: 0 }],
      format: 'IMAX',
    },
    {
      movieTitle: 'Mumbai Monsoon',
      theatreName: 'PVR Cinemas — Phoenix MarketCity',
      screenName: 'Screen 2 — 4DX',
      showtimes: [{ hour: 11, minute: 30 }, { hour: 16, minute: 0 }, { hour: 20, minute: 30 }],
      format: '4DX',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'PVR Cinemas — Phoenix MarketCity',
      screenName: 'Screen 3 — Demo',
      showtimes: [{ hour: 10, minute: 0 }, { hour: 15, minute: 30 }, { hour: 20, minute: 0 }],
      format: '2D',
    },
    // Pune — INOX
    {
      movieTitle: 'Stellar Drift',
      theatreName: 'INOX — Bund Garden',
      screenName: 'Audi 1',
      showtimes: [{ hour: 9, minute: 0 }, { hour: 13, minute: 15 }, { hour: 17, minute: 45 }, { hour: 21, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Chai & Chutney',
      theatreName: 'INOX — Bund Garden',
      screenName: 'Audi 2',
      showtimes: [{ hour: 10, minute: 30 }, { hour: 14, minute: 0 }, { hour: 18, minute: 30 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'INOX — Bund Garden',
      screenName: 'Audi 3 — Demo',
      showtimes: [{ hour: 11, minute: 30 }, { hour: 16, minute: 0 }, { hour: 20, minute: 30 }],
      format: '2D',
    },
    // Pune — Cinépolis
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'Cinépolis — Westend Mall',
      screenName: 'Hall A',
      showtimes: [{ hour: 11, minute: 0 }, { hour: 15, minute: 30 }, { hour: 19, minute: 45 }],
      format: '2D',
    },
    {
      movieTitle: 'Kalki Chronicles',
      theatreName: 'Cinépolis — Westend Mall',
      screenName: 'Hall B',
      showtimes: [{ hour: 12, minute: 0 }, { hour: 17, minute: 0 }, { hour: 21, minute: 30 }],
      format: '2D',
    },
    // Mumbai — PVR
    {
      movieTitle: 'Mumbai Monsoon',
      theatreName: 'PVR Cinemas — Palladium Mall',
      screenName: 'Screen 1',
      showtimes: [{ hour: 10, minute: 0 }, { hour: 14, minute: 0 }, { hour: 18, minute: 30 }, { hour: 22, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Stellar Drift',
      theatreName: 'PVR Cinemas — Palladium Mall',
      screenName: 'Screen 2',
      showtimes: [{ hour: 11, minute: 0 }, { hour: 15, minute: 30 }, { hour: 20, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'PVR Cinemas — Palladium Mall',
      screenName: 'Screen 3 — Demo',
      showtimes: [{ hour: 10, minute: 0 }, { hour: 15, minute: 30 }, { hour: 20, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'INOX — R City Mall (Demo)',
      screenName: 'Screen 1 — Demo',
      showtimes: [{ hour: 11, minute: 0 }, { hour: 16, minute: 0 }, { hour: 21, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'Cinépolis — Western Mumbai (Demo)',
      screenName: 'Hall 1 — Demo',
      showtimes: [{ hour: 9, minute: 30 }, { hour: 14, minute: 30 }, { hour: 19, minute: 30 }],
      format: '2D',
    },
    // Bengaluru — INOX
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'INOX Garuda Mall',
      screenName: 'Audi 1',
      showtimes: [{ hour: 9, minute: 30 }, { hour: 13, minute: 30 }, { hour: 18, minute: 0 }, { hour: 21, minute: 30 }],
      format: '2D',
    },
    {
      movieTitle: 'Kalki Chronicles',
      theatreName: 'INOX Garuda Mall',
      screenName: 'Audi 2',
      showtimes: [{ hour: 10, minute: 0 }, { hour: 14, minute: 30 }, { hour: 19, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'PVR Cinemas — Orion Mall (Demo)',
      screenName: 'Screen 1 — Demo',
      showtimes: [{ hour: 10, minute: 30 }, { hour: 15, minute: 30 }, { hour: 20, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'Cinépolis — Central Bengaluru (Demo)',
      screenName: 'Hall 1 — Demo',
      showtimes: [{ hour: 11, minute: 0 }, { hour: 16, minute: 30 }, { hour: 21, minute: 0 }],
      format: '2D',
    },
    // Delhi — three demo venues
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'PVR Cinemas — Select Citywalk (Demo)',
      screenName: 'Screen 1 — Demo',
      showtimes: [{ hour: 10, minute: 0 }, { hour: 15, minute: 30 }, { hour: 20, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'INOX — Connaught Place (Demo)',
      screenName: 'Screen 1 — Demo',
      showtimes: [{ hour: 11, minute: 0 }, { hour: 16, minute: 0 }, { hour: 21, minute: 0 }],
      format: '2D',
    },
    {
      movieTitle: 'Raga of the Night',
      theatreName: 'Cinépolis — Vasant Kunj (Demo)',
      screenName: 'Hall 1 — Demo',
      showtimes: [{ hour: 9, minute: 30 }, { hour: 14, minute: 30 }, { hour: 19, minute: 30 }],
      format: '2D',
    },
  ];

  let showCount = 0;
  for (const config of SHOW_CONFIGS) {
    const movieId = movieMap[config.movieTitle];
    const screenInfo = screenMap[`${config.theatreName}|${config.screenName}`];
    if (!movieId || !screenInfo) {
      console.warn(`  ⚠ Missing movie/screen for: ${config.movieTitle} @ ${config.theatreName}`);
      continue;
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) continue;

    for (const date of showDates) {
      for (const time of config.showtimes) {
        const startTime = new Date(date);
        startTime.setHours(time.hour, time.minute, 0, 0);
        const endTime = new Date(startTime.getTime() + movie.durationMinutes * 60 * 1000);

        // Skip past shows (earlier today)
        if (startTime < new Date() && date.toDateString() === now.toDateString()) {
          continue;
        }

        const existing = await prisma.show.findFirst({
          where: { movieId, screenId: screenInfo.screenId, startTime },
        });

        let show = existing;
        if (!show) {
          show = await prisma.show.create({
            data: {
              movieId,
              screenId: screenInfo.screenId,
              startTime,
              endTime,
              format: config.format,
              status: ShowStatus.SCHEDULED,
            },
          });
        }

        // Create ShowSeats for every seat on this screen
        const seats = await prisma.seat.findMany({ where: { screenId: screenInfo.screenId } });
        const showSeatData = seats.map(seat => {
          const price = seat.seatType === SeatType.PREMIUM
            ? new Decimal(config.format === 'IMAX' ? 550 : config.format === '4DX' ? 500 : 350)
            : new Decimal(config.format === 'IMAX' ? 350 : config.format === '4DX' ? 320 : 220);
          return {
            showId: show.id,
            seatId: seat.id,
            price,
          };
        });

        await prisma.showSeat.createMany({
          data: showSeatData,
          skipDuplicates: true,
        });
        showCount++;
      }
    }
  }

  console.log(`  ✓ Created/verified ${showCount} shows with seats`);

  // ── 5. Add some pre-booked seats (for demo realism) ──────────────────

  // Find today's first available show in Pune
  const todayStr = now.toISOString().split('T')[0];
  const demoShow = await prisma.show.findFirst({
    where: {
      startTime: { gte: new Date(`${todayStr}T00:00:00Z`) },
      status: ShowStatus.SCHEDULED,
    },
    include: {
      showSeats: { include: { seat: true }, take: 8, skip: 5 },
    },
    orderBy: { startTime: 'asc' },
  });

  if (demoShow && demoShow.showSeats.length > 0) {
    // Mark a few seats as BOOKED for demo realism
    const seatIdsToBook = demoShow.showSeats.slice(0, 4).map(ss => ss.id);
    await prisma.showSeat.updateMany({
      where: { id: { in: seatIdsToBook }, status: 'AVAILABLE' },
      data: { status: 'BOOKED' },
    });
    console.log(`  ✓ Marked ${seatIdsToBook.length} seats as BOOKED in demo show`);
  }

  console.log('');
  console.log('✅ Seed complete! Summary:');
  console.log(`   Movies: ${await prisma.movie.count()}`);
  console.log(`   Cities: ${await prisma.city.count()}`);
  console.log(`   Theatres: ${await prisma.theatre.count()}`);
  console.log(`   Screens: ${await prisma.screen.count()}`);
  console.log(`   Seats: ${await prisma.seat.count()}`);
  console.log(`   Shows: ${await prisma.show.count()}`);
  console.log(`   ShowSeats: ${await prisma.showSeat.count()}`);
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
