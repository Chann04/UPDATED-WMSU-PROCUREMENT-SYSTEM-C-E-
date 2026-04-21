import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CircleHelp } from 'lucide-react';

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('landing-scrollbar-hidden');

    const onScroll = () => {
      setScrollY(window.scrollY);
      if (window.scrollY > 0) {
        html.classList.add('scrollbar-visible');
      } else {
        html.classList.remove('scrollbar-visible');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      html.classList.remove('landing-scrollbar-hidden', 'scrollbar-visible');
    };
  }, []);

  const heroOffset = Math.min(scrollY * 0.6, 120);
  const heroOpacity = Math.max(0, 1 - scrollY / 400);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-red-900 border-b border-red-800 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-red-800" />
          <span className="font-bold text-white text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="flex items-center gap-2">
          <a href="#hero" className="hidden sm:inline px-4 py-2 text-sm text-red-100 hover:bg-red-800 rounded transition-colors">
            Home
          </a>
          <Link
            to="/help"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm text-red-100 hover:bg-red-800 rounded transition-colors"
          >
            <CircleHelp className="w-4 h-4" />
            Help
          </Link>
          <Link
            to="/login?fresh=1"
            className="px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-red-800 rounded transition-colors"
          >
            Log in
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        <section id="hero" className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/wmsuimage.jpg)' }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-red-950/80" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" aria-hidden />

          <div
            className="relative z-10 text-center px-6 max-w-2xl transition-all duration-150 ease-out"
            style={{
              transform: `translateY(-${heroOffset}px)`,
              opacity: heroOpacity,
            }}
          >
            <img
              src="/wmsu1.jpg"
              alt="WMSU"
              className="w-24 h-24 rounded-full object-cover shadow-lg mx-auto mb-8 border-4 border-white/30"
            />
            <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-md tracking-tight">
              Western Mindanao State University
            </h1>
            <p className="mt-4 text-2xl sm:text-3xl font-semibold text-red-100 drop-shadow-md">Procurement Office</p>
            <p className="mt-6 text-red-200/90 text-lg">WMSU-Procurement · A Smart Research University by 2040</p>
          </div>
        </section>
      </main>

      <footer className="mt-auto py-8 px-4 bg-red-900 text-white text-center text-sm border-t border-red-800">
        Western Mindanao State University · Procurement Office · WMSU-Procurement © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
