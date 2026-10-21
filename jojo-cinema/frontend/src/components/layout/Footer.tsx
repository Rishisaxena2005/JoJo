import { Link } from 'react-router-dom';
import { Clapperboard, Github, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-gray-400 border-t border-navy-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="bg-brand-500 p-1.5 rounded-lg">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">JoJo Cinema</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500">
              India's most loved movie ticket booking platform. Book tickets for movies, events and more.
            </p>
            <div className="flex gap-3 mt-4">
              {[Github, Twitter, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center hover:bg-brand-500 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Movies */}
          <div>
            <h4 className="text-white font-semibold mb-3">Movies</h4>
            <ul className="space-y-2 text-sm">
              {['Now Showing', 'Upcoming', 'Premieres', 'Top Rated'].map(item => (
                <li key={item}><Link to="/" className="hover:text-brand-400 transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold mb-3">Help & Support</h4>
            <ul className="space-y-2 text-sm">
              {['FAQ', 'Cancellation Policy', 'Contact Us', 'Report an Issue'].map(item => (
                <li key={item}><a href="#" className="hover:text-brand-400 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              {['About Us', 'Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
                <li key={item}><a href="#" className="hover:text-brand-400 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-700 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-gray-600">© 2026 JoJo Cinema. All rights reserved.</p>
          <div className="text-xs text-gray-600 bg-amber-900/20 border border-amber-800/30 text-amber-600 px-3 py-1.5 rounded-full">
            🎭 DEMO APPLICATION — No real bookings or payments processed
          </div>
        </div>
      </div>
    </footer>
  );
}
