import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Film, Ticket, ChevronDown, Menu, X, Clapperboard } from 'lucide-react';
import { moviesApi } from '../../services/apiClient';
import { getPreferredCity, setPreferredCity } from '../../utils';
import type { City } from '../../types';

export default function Navbar() {
  const [city, setCity] = useState(getPreferredCity());
  const [cities, setCities] = useState<City[]>([]);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    moviesApi.getCities().then(r => setCities(r.data.data)).catch(() => {});
  }, []);

  const handleCityChange = (c: City) => {
    setCity(c.name);
    setPreferredCity(c.name);
    setShowCityMenu(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className="bg-navy-900 text-white sticky top-0 z-50 border-b border-navy-700 shadow-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-brand-500 p-1.5 rounded-lg">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              JoJo <span className="text-brand-400">Cinema</span>
            </span>
          </Link>

          {/* City selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowCityMenu(!showCityMenu)}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-navy-700"
            >
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>{city}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCityMenu && (
              <div className="absolute top-full left-0 mt-1 bg-navy-700 rounded-xl shadow-2xl border border-navy-600 z-50 min-w-40 overflow-hidden">
                {cities.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleCityChange(c)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-navy-600 transition-colors ${city === c.name ? 'text-brand-400 font-semibold' : 'text-gray-300'}`}
                  >
                    {c.name}
                    <span className="text-xs text-gray-500 ml-1">{c.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search movies, theatres..."
                className="w-full bg-navy-700 border border-navy-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </form>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-navy-700 transition-colors">
              <Film className="w-4 h-4" />
              Movies
            </Link>
            <Link to="/my-bookings" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-navy-700 transition-colors">
              <Ticket className="w-4 h-4" />
              My Bookings
            </Link>
            <div className="ml-2 flex items-center gap-2 bg-navy-700 px-3 py-1.5 rounded-full border border-navy-600">
              <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-xs font-bold">D</div>
              <span className="text-sm text-gray-300">Demo User</span>
            </div>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden ml-auto p-2 rounded-lg hover:bg-navy-700"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-navy-700 pt-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search movies..."
                  className="w-full bg-navy-700 border border-navy-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </form>
            <div className="flex gap-2 flex-wrap">
              {cities.slice(0, 4).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleCityChange(c)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${city === c.name ? 'border-brand-500 text-brand-400 bg-brand-500/10' : 'border-navy-600 text-gray-400'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <Link to="/" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setMobileOpen(false)}>Movies</Link>
            <Link to="/my-bookings" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setMobileOpen(false)}>My Bookings</Link>
          </div>
        )}
      </div>
    </header>
  );
}
