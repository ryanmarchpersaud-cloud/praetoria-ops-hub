import { useState, useEffect, useCallback } from 'react';
import { SERVICE_PROMOS } from '@/lib/servicePromos';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import flyerSnow from '@/assets/flyer-snow.png';
import flyerMaintenance from '@/assets/flyer-maintenance.png';
import flyerJunk from '@/assets/flyer-junk.png';
import flyerLawn from '@/assets/flyer-lawn.png';
import flyerFencingDecking from '@/assets/flyer-fencing-decking.png';
import flyerRoofingExterior from '@/assets/flyer-roofing-exterior.png';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

// Pool of flyer background images that crossfade behind the promo card
const FLYER_IMAGES = [
  flyerSnow,
  flyerLawn,
  flyerJunk,
  flyerMaintenance,
  flyerFencingDecking,
  flyerRoofingExterior,
];

export function LoginPromoPanel() {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((newIndex: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIndex(newIndex);
      setIsTransitioning(false);
    }, 400);
  }, []);

  // Auto-rotate every 7s
  useEffect(() => {
    const timer = setInterval(() => {
      goTo((index + 1) % SERVICE_PROMOS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [index, goTo]);

  const prev = () => goTo((index - 1 + SERVICE_PROMOS.length) % SERVICE_PROMOS.length);
  const next = () => goTo((index + 1) % SERVICE_PROMOS.length);

  const promo = SERVICE_PROMOS[index];
  const PromoIcon = promo.icon;
  const bgImage = FLYER_IMAGES[index % FLYER_IMAGES.length];

  return (
    <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative overflow-hidden">
      {/* Flyer background layer with crossfade */}
      {FLYER_IMAGES.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{
            opacity: i === (index % FLYER_IMAGES.length) && !isTransitioning ? 1 : 0,
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
      ))}

      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full w-full p-8 xl:p-12">
        {/* Top — Logo and brand */}
        <div className="flex items-center gap-3 mb-auto">
          <img src={praetoriaLogo} alt="Praetoria" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">Praetoria Group</p>
            <p className="text-white/50 text-[11px] tracking-widest uppercase">Residential & Commercial</p>
          </div>
        </div>

        {/* Center — Service promo card */}
        <div className="flex-1 flex flex-col justify-center py-6">
          <div
            className={`transition-all duration-400 ${isTransitioning ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}
          >
            {/* Service badge */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm ${promo.accentClass} border border-white/10`}>
                <PromoIcon className={`w-6 h-6 ${promo.iconColorClass}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {promo.title}
                </h2>
                <p className="text-white/60 text-sm">{promo.subtitle}</p>
              </div>
            </div>

            {/* Audience tag */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[11px] font-semibold text-white/80 tracking-wide">
                {promo.audience}
              </span>
            </div>

            {/* Highlights */}
            <div className="rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/10 p-5">
              <ul className="space-y-3">
                {promo.highlights.map((h) => (
                  <li key={h} className="text-[13px] text-white/85 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA hint */}
            {promo.cta && (
              <p className="mt-4 text-sm text-white/50 italic">{promo.cta}</p>
            )}
          </div>
        </div>

        {/* Bottom — Navigation + footer */}
        <div>
          {/* Carousel controls */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={prev}
              aria-label="Previous service"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {SERVICE_PROMOS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? 'bg-white w-6'
                      : 'bg-white/20 w-1.5 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next service"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[11px] text-white/30">
            <div className="flex items-center gap-2">
              <img src={praetoriaLogo} alt="" className="w-3.5 h-3.5 object-contain opacity-50" />
              <span>Serving Regina & area</span>
            </div>
            <span>306-737-6269</span>
          </div>
        </div>
      </div>
    </div>
  );
}
