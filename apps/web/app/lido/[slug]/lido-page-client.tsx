"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Clock, Phone, Mail, Umbrella, ArrowRight,
  Waves, ChevronRight, Calendar, Users, Star,
} from "lucide-react";

interface Establishment {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  primary_color?: string;
  secondary_color?: string;
  check_in_time?: string;
  check_out_time?: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  icon?: string;
  is_daily?: boolean;
}

interface Row {
  id: string;
  label: string;
  count: number;
  row_number: number;
}

interface Props {
  establishment: Establishment;
  services: Service[];
  rows: Row[];
  slug: string;
}

// Mappa icone di default per servizi comuni
const SERVICE_EMOJI: Record<string, string> = {
  doccia: "🚿", bar: "🍹", ristorante: "🍽️", parcheggio: "🅿️",
  wifi: "📶", lettino: "🛋️", asciugamano: "🏖️", canoa: "🛶",
  windsurf: "🏄", pedalò: "🚣", beach: "🏖️", volley: "🏐",
  bimbi: "👶", animazione: "🎭", accessibile: "♿",
};

function getServiceEmoji(name: string, icon?: string): string {
  if (icon) return icon;
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(SERVICE_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return "✓";
}

export default function LidoPageClient({ establishment, services, rows, slug }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const primary = establishment.primary_color || "#00BFFF";
  const secondary = establishment.secondary_color || "#0B1829";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const totalUmbrellas = rows.reduce((sum, r) => sum + r.count, 0);
  const bookingUrl = `/lido/${slug}/prenota`;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Sticky Nav ─────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {establishment.logo_url ? (
              <Image
                src={establishment.logo_url}
                alt={establishment.name}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: secondary }}
              >
                {establishment.name.charAt(0)}
              </div>
            )}
            <span className={`font-semibold text-sm hidden sm:block transition-colors ${scrolled ? "text-gray-900" : "text-white"}`}>
              {establishment.name}
            </span>
          </div>
          <Link
            href={bookingUrl}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: primary }}
          >
            <Calendar className="h-4 w-4" />
            Prenota ora
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
        {establishment.cover_image_url ? (
          <Image
            src={establishment.cover_image_url}
            alt={establishment.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${secondary} 0%, ${secondary}dd 40%, ${primary}66 100%)`,
            }}
          >
            {/* Decorative wave pattern */}
            <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path fill="white" fillOpacity="1" d="M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,186.7C672,181,768,139,864,138.7C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            </svg>
            <svg className="absolute inset-0 h-full w-full opacity-5" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ marginTop: "60px" }}>
              <path fill="white" fillOpacity="1" d="M0,256L60,245.3C120,235,240,213,360,218.7C480,224,600,256,720,261.3C840,267,960,245,1080,229.3C1200,213,1320,203,1380,197.3L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
            </svg>
          </div>
        )}

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="h-[60px] w-full">
            <path fill="white" d="M0,32L80,26.7C160,21,320,11,480,16C640,21,800,43,960,42.7C1120,43,1280,21,1360,10.7L1440,0L1440,60L1360,60C1280,60,1120,60,960,60C800,60,640,60,480,60C320,60,160,60,80,60L0,60Z" />
          </svg>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-16 left-0 right-0 px-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              {establishment.city && (
                <div className="mb-3 flex items-center gap-1.5 text-sm text-white/80">
                  <MapPin className="h-4 w-4" />
                  <span>{establishment.city}{establishment.province && ` (${establishment.province})`}</span>
                </div>
              )}
              <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                {establishment.name}
              </h1>
              {establishment.description && (
                <p className="mt-3 text-lg text-white/80 line-clamp-2">
                  {establishment.description}
                </p>
              )}

              {/* Info pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {establishment.check_in_time && (
                  <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5" />
                    {establishment.check_in_time} – {establishment.check_out_time}
                  </span>
                )}
                {totalUmbrellas > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                    <Umbrella className="h-3.5 w-3.5" />
                    {totalUmbrellas} ombrelloni
                  </span>
                )}
                {establishment.phone && (
                  <a
                    href={`tel:${establishment.phone}`}
                    className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-white/30 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {establishment.phone}
                  </a>
                )}
              </div>

              {/* Hero CTAs */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={bookingUrl}
                  className="flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-xl transition hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: primary }}
                >
                  <Umbrella className="h-5 w-5" />
                  Scegli il tuo ombrellone
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main layout: content + sidebar ─────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:flex lg:gap-10">

        {/* ── Left: main content ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-12">

          {/* Descrizione */}
          {establishment.description && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Chi siamo</h2>
              <p className="mt-4 text-gray-600 leading-relaxed text-lg">
                {establishment.description}
              </p>
            </section>
          )}

          {/* Servizi */}
          {services.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Servizi & strutture</h2>
              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    <span className="text-3xl leading-none">
                      {getServiceEmoji(service.name, service.icon)}
                    </span>
                    <span className="text-xs font-medium text-gray-700 leading-tight">
                      {service.name}
                    </span>
                    {Number(service.price) > 0 && (
                      <span className="text-xs text-gray-400">
                        {Number(service.price).toFixed(2)}€
                        {service.is_daily && "/gg"}
                      </span>
                    )}
                    {Number(service.price) === 0 && (
                      <span className="text-xs font-medium text-green-600">Gratis</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* La spiaggia */}
          {rows.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">La nostra spiaggia</h2>
              <p className="mt-2 text-gray-500 text-sm">Vista dall&apos;alto — il mare è in cima</p>

              {/* Visual beach diagram */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-sky-100">
                {/* Mare */}
                <div className="flex items-center justify-center gap-2 bg-sky-400 py-3 text-sm font-semibold text-white">
                  <Waves className="h-4 w-4" />
                  MARE
                  <Waves className="h-4 w-4" />
                </div>

                {/* Sabbia + file */}
                <div className="bg-amber-50 divide-y divide-amber-100">
                  {rows.map((row, i) => (
                    <div key={row.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: i === 0 ? primary : "#94a3b8" }}
                        >
                          {row.row_number}
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{row.label}</span>
                          {i === 0 && (
                            <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Prima fila
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(row.count, 12) }).map((_, j) => (
                            <Umbrella
                              key={j}
                              className="h-4 w-4"
                              style={{ color: i === 0 ? primary : "#94a3b8" }}
                            />
                          ))}
                          {row.count > 12 && (
                            <span className="text-xs text-gray-400 self-center">+{row.count - 12}</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {row.count} ombrelloni
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ingresso */}
                <div className="flex items-center justify-center bg-gray-100 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  ↑ Ingresso / Strada
                </div>
              </div>

              <div className="mt-4 text-center">
                <Link
                  href={bookingUrl}
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: primary }}
                >
                  Vedi la mappa interattiva e scegli il tuo posto
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          {/* Contatti */}
          {(establishment.address || establishment.phone || establishment.email) && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Informazioni & contatti</h2>
              <div className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                {establishment.address && (
                  <div className="flex items-start gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50">
                      <MapPin className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Dove siamo</p>
                      <p className="mt-0.5 text-gray-800">
                        {establishment.address}
                        {establishment.city && `, ${establishment.city}`}
                        {establishment.province && ` (${establishment.province})`}
                      </p>
                    </div>
                  </div>
                )}
                {establishment.check_in_time && (
                  <div className="flex items-start gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50">
                      <Clock className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Orari</p>
                      <p className="mt-0.5 text-gray-800">
                        {establishment.check_in_time} – {establishment.check_out_time}
                      </p>
                    </div>
                  </div>
                )}
                {establishment.phone && (
                  <a href={`tel:${establishment.phone}`} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50">
                      <Phone className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Telefono</p>
                      <p className="mt-0.5 text-gray-800">{establishment.phone}</p>
                    </div>
                  </a>
                )}
                {establishment.email && (
                  <a href={`mailto:${establishment.email}`} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50">
                      <Mail className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
                      <p className="mt-0.5 text-gray-800">{establishment.email}</p>
                    </div>
                  </a>
                )}
              </div>
            </section>
          )}

        </div>

        {/* ── Right: sticky booking sidebar ─────────────────────────────────── */}
        <div className="mt-10 lg:mt-0 lg:w-80 lg:shrink-0">
          <div className="sticky top-20">
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
              {/* Header card */}
              <div className="p-5 text-white" style={{ backgroundColor: secondary }}>
                <p className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Prenota online
                </p>
                <p className="mt-1 text-xl font-bold">{establishment.name}</p>
                {establishment.city && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
                    <MapPin className="h-3.5 w-3.5" />
                    {establishment.city}
                  </p>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Disponibilità badge */}
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700">
                    Disponibilità online
                  </span>
                </div>

                {/* Info veloci */}
                {establishment.check_in_time && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Clock className="h-4 w-4" />
                      Orari
                    </span>
                    <span className="font-medium text-gray-800">
                      {establishment.check_in_time} – {establishment.check_out_time}
                    </span>
                  </div>
                )}
                {totalUmbrellas > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Umbrella className="h-4 w-4" />
                      Ombrelloni
                    </span>
                    <span className="font-medium text-gray-800">{totalUmbrellas} totali</span>
                  </div>
                )}
                {rows.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Users className="h-4 w-4" />
                      File
                    </span>
                    <span className="font-medium text-gray-800">{rows.length} file</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Link
                    href={bookingUrl}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-md transition hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: primary }}
                  >
                    <Calendar className="h-5 w-5" />
                    Vedi disponibilità
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <p className="text-center text-xs text-gray-400">
                  Nessuna commissione · Conferma immediata
                </p>
              </div>
            </div>

            {/* Second card: contact */}
            {establishment.phone && (
              <div className="mt-4 rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-700">Hai domande?</p>
                <a
                  href={`tel:${establishment.phone}`}
                  className="mt-2 flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: primary }}
                >
                  <Phone className="h-4 w-4" />
                  {establishment.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <section className="mt-8 mx-4 mb-12 sm:mx-6 lg:mx-auto lg:max-w-6xl">
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-center sm:p-12"
          style={{ backgroundColor: secondary }}
        >
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
              <circle cx="350" cy="50" r="120" fill="white" />
              <circle cx="50" cy="180" r="80" fill="white" />
            </svg>
          </div>
          <div className="relative">
            <p className="text-4xl">☀️</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Pronti per il mare?
            </h2>
            <p className="mt-2 text-white/70">
              Scegli il tuo ombrellone dalla mappa interattiva. Paga online, arrivi sereno.
            </p>
            <Link
              href={bookingUrl}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold transition hover:opacity-90 active:scale-95"
              style={{ color: secondary }}
            >
              <Umbrella className="h-5 w-5" />
              Prenota ora — è gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t bg-gray-50 py-8 text-center text-sm text-gray-400">
        <p className="font-medium text-gray-600">{establishment.name}</p>
        {establishment.address && (
          <p className="mt-1">
            {establishment.address}
            {establishment.city && `, ${establishment.city}`}
          </p>
        )}
        <p className="mt-3">
          Gestito con{" "}
          <Link href="/" className="font-medium text-sky-500 hover:underline">
            LidoFacile.it
          </Link>
        </p>
      </footer>

    </div>
  );
}
