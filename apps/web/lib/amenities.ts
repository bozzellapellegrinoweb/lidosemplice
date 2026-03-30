// Definizione completa delle caratteristiche di uno stabilimento balneare

export interface AmenitiesData {
  // ── Strutture ──────────────────────────────
  bar: boolean;
  restaurant: boolean;
  self_service: boolean;
  showers_hot: boolean;
  showers_cold: boolean;
  changing_rooms: boolean;
  cabins: boolean;
  lockers: boolean;
  toilets: boolean;
  infirmary: boolean;

  // ── Connettività ───────────────────────────
  wifi: boolean;
  tv: boolean;

  // ── Accessibilità ──────────────────────────
  disabled_access: boolean;
  disabled_parking: boolean;
  walkways: boolean; // passerelle per disabili

  // ── Animali ────────────────────────────────
  animals_small: boolean; // cani piccola taglia (< 10kg)
  animals_large: boolean; // cani grande taglia
  animals_leash: boolean; // guinzaglio obbligatorio
  animals_area: boolean;  // area animali dedicata

  // ── Parcheggio ─────────────────────────────
  parking_free: boolean;
  parking_paid: boolean;
  parking_spots: number | null; // numero posti
  parking_camper: boolean;

  // ── Sport & Attività ───────────────────────
  beach_volleyball: boolean;
  tennis: boolean;
  football: boolean;
  basketball: boolean;
  canoe: boolean;
  pedalo: boolean;
  windsurf: boolean;
  kitesurfing: boolean;
  water_scooter: boolean;
  snorkeling: boolean;
  diving: boolean;
  stand_up_paddle: boolean;
  wakeboard: boolean;
  fitness: boolean;

  // ── Intrattenimento ────────────────────────
  entertainment_kids: boolean;
  entertainment_adults: boolean;
  playground: boolean;
  board_games: boolean;
  live_music: boolean;
  disco: boolean;

  // ── Servizi ────────────────────────────────
  umbrella_rental: boolean;
  sunbed_rental: boolean;
  equipment_rental: boolean;
  cards_accepted: boolean;
  atm: boolean;
  first_aid: boolean;
  lifeguard: boolean;
  boat_dock: boolean;
}

export const DEFAULT_AMENITIES: AmenitiesData = {
  bar: false, restaurant: false, self_service: false,
  showers_hot: false, showers_cold: false, changing_rooms: false,
  cabins: false, lockers: false, toilets: false, infirmary: false,
  wifi: false, tv: false,
  disabled_access: false, disabled_parking: false, walkways: false,
  animals_small: false, animals_large: false, animals_leash: false, animals_area: false,
  parking_free: false, parking_paid: false, parking_spots: null, parking_camper: false,
  beach_volleyball: false, tennis: false, football: false, basketball: false,
  canoe: false, pedalo: false, windsurf: false, kitesurfing: false,
  water_scooter: false, snorkeling: false, diving: false, stand_up_paddle: false,
  wakeboard: false, fitness: false,
  entertainment_kids: false, entertainment_adults: false, playground: false,
  board_games: false, live_music: false, disco: false,
  umbrella_rental: false, sunbed_rental: false, equipment_rental: false,
  cards_accepted: false, atm: false, first_aid: false, lifeguard: false, boat_dock: false,
};

// Raggruppamento per la dashboard e la pagina pubblica
export const AMENITY_GROUPS = [
  {
    label: "Strutture",
    items: [
      { key: "bar",             emoji: "🍹", label: "Bar" },
      { key: "restaurant",      emoji: "🍽️", label: "Ristorante" },
      { key: "self_service",    emoji: "🥗",  label: "Self service" },
      { key: "showers_hot",     emoji: "🚿",  label: "Docce calde" },
      { key: "showers_cold",    emoji: "💧",  label: "Docce fredde" },
      { key: "changing_rooms",  emoji: "🚪",  label: "Spogliatoi" },
      { key: "cabins",          emoji: "🏠",  label: "Cabine" },
      { key: "lockers",         emoji: "🔒",  label: "Armadietti" },
      { key: "toilets",         emoji: "🚻",  label: "Servizi igienici" },
      { key: "infirmary",       emoji: "🏥",  label: "Primo soccorso" },
    ],
  },
  {
    label: "Connettività",
    items: [
      { key: "wifi",  emoji: "📶", label: "WiFi gratuito" },
      { key: "tv",    emoji: "📺", label: "TV" },
    ],
  },
  {
    label: "Accessibilità",
    items: [
      { key: "disabled_access",  emoji: "♿",  label: "Accesso disabili" },
      { key: "disabled_parking", emoji: "🅿️", label: "Parcheggio disabili" },
      { key: "walkways",         emoji: "🛤️", label: "Passerelle" },
    ],
  },
  {
    label: "Animali",
    items: [
      { key: "animals_small", emoji: "🐶", label: "Cani piccola taglia" },
      { key: "animals_large", emoji: "🐕", label: "Cani grande taglia" },
      { key: "animals_leash", emoji: "🦮", label: "Guinzaglio obbligatorio" },
      { key: "animals_area",  emoji: "🏖️", label: "Area animali dedicata" },
    ],
  },
  {
    label: "Parcheggio",
    items: [
      { key: "parking_free",   emoji: "🆓",  label: "Parcheggio gratuito" },
      { key: "parking_paid",   emoji: "💰",  label: "Parcheggio a pagamento" },
      { key: "parking_camper", emoji: "🚐",  label: "Camper/Camper service" },
    ],
  },
  {
    label: "Sport & Attività",
    items: [
      { key: "beach_volleyball",  emoji: "🏐", label: "Beach volley" },
      { key: "tennis",            emoji: "🎾", label: "Tennis" },
      { key: "football",          emoji: "⚽", label: "Calcetto" },
      { key: "basketball",        emoji: "🏀", label: "Basket" },
      { key: "canoe",             emoji: "🛶", label: "Canoa/Kayak" },
      { key: "pedalo",            emoji: "🚣", label: "Pedalò" },
      { key: "windsurf",          emoji: "🏄", label: "Windsurf" },
      { key: "kitesurfing",       emoji: "🪁", label: "Kitesurf" },
      { key: "water_scooter",     emoji: "💨", label: "Acquascooter" },
      { key: "snorkeling",        emoji: "🤿", label: "Snorkeling" },
      { key: "diving",            emoji: "🐠", label: "Immersioni" },
      { key: "stand_up_paddle",   emoji: "🏄", label: "Stand up paddle" },
      { key: "wakeboard",         emoji: "🌊", label: "Wakeboard" },
      { key: "fitness",           emoji: "💪", label: "Area fitness" },
    ],
  },
  {
    label: "Intrattenimento",
    items: [
      { key: "entertainment_kids",   emoji: "👶", label: "Animazione bambini" },
      { key: "entertainment_adults", emoji: "🎭", label: "Animazione adulti" },
      { key: "playground",           emoji: "🎠", label: "Area giochi" },
      { key: "board_games",          emoji: "🎲", label: "Giochi da tavolo" },
      { key: "live_music",           emoji: "🎵", label: "Musica live" },
      { key: "disco",                emoji: "🪩", label: "Discoteca" },
    ],
  },
  {
    label: "Servizi",
    items: [
      { key: "umbrella_rental",  emoji: "☂️",  label: "Noleggio ombrelloni" },
      { key: "sunbed_rental",    emoji: "🛋️", label: "Noleggio lettini" },
      { key: "equipment_rental", emoji: "🎿",  label: "Noleggio attrezzatura" },
      { key: "cards_accepted",   emoji: "💳",  label: "Carte di credito" },
      { key: "atm",              emoji: "🏧",  label: "Bancomat" },
      { key: "first_aid",        emoji: "🩺",  label: "Assistenza medica" },
      { key: "lifeguard",        emoji: "🏊",  label: "Bagnino di salvataggio" },
      { key: "boat_dock",        emoji: "⚓",  label: "Pontile/Approdo" },
    ],
  },
];
