/**
 * Lista dei comuni costieri italiani (fonte ISTAT)
 * Utilizzata per generare le query di scraping su Google Maps.
 */
export const COMUNI_COSTIERI: string[] = [
  // Liguria
  "Ventimiglia", "Bordighera", "Sanremo", "Taggia", "Arma di Taggia",
  "Riva Ligure", "Santo Stefano al Mare", "Cipressa", "San Lorenzo al Mare",
  "Imperia", "Diano Marina", "San Bartolomeo al Mare", "Laigueglia",
  "Albenga", "Ceriale", "Borghetto Santo Spirito", "Loano",
  "Pietra Ligure", "Borgio Verezzi", "Finale Ligure", "Spotorno",
  "Noli", "Bergeggi", "Vado Ligure", "Savona", "Albissola Marina",
  "Albisola Superiore", "Celle Ligure", "Varazze", "Cogoleto",
  "Arenzano", "Genova", "Bogliasco", "Pieve Ligure", "Sori",
  "Recco", "Camogli", "Portofino", "Santa Margherita Ligure",
  "Rapallo", "Zoagli", "Chiavari", "Lavagna", "Sestri Levante",
  "Moneglia", "Deiva Marina", "Framura", "Bonassola", "Levanto",
  "Monterosso al Mare", "Vernazza", "Corniglia", "Manarola",
  "Riomaggiore", "La Spezia", "Lerici", "Ameglia",

  // Toscana
  "Massa", "Carrara", "Montignoso", "Forte dei Marmi", "Pietrasanta",
  "Camaiore", "Viareggio", "Torre del Lago Puccini", "Massarosa",
  "Pisa", "Vecchiano", "San Giuliano Terme", "Calci", "Livorno",
  "Rosignano Marittimo", "Cecina", "Bibbona", "Castagneto Carducci",
  "Donoratico", "San Vincenzo", "Piombino", "Follonica",
  "Castiglione della Pescaia", "Grosseto", "Orbetello",
  "Monte Argentario", "Capalbio", "Isola d'Elba Portoferraio",
  "Isola d'Elba Porto Azzurro", "Isola d'Elba Capoliveri",
  "Isola d'Elba Marciana Marina",

  // Lazio
  "Montalto di Castro", "Tarquinia", "Civitavecchia", "Santa Marinella",
  "Cerveteri", "Ladispoli", "Fiumicino", "Roma Ostia", "Pomezia",
  "Anzio", "Nettuno", "Latina", "Sabaudia", "San Felice Circeo",
  "Terracina", "Fondi", "Sperlonga", "Gaeta", "Formia",
  "Minturno",

  // Campania
  "Sessa Aurunca", "Castelvolturno", "Mondragone",
  "Napoli", "Pozzuoli", "Bacoli", "Monte di Procida",
  "Quarto", "Marano di Napoli", "Calvizzano",
  "Ercolano", "Torre del Greco", "Torre Annunziata",
  "Castellammare di Stabia", "Gragnano", "Vico Equense",
  "Meta", "Piano di Sorrento", "Sant'Agnello", "Sorrento",
  "Massa Lubrense", "Positano", "Praiano", "Furore", "Conca dei Marini",
  "Amalfi", "Atrani", "Ravello", "Minori", "Maiori", "Cetara",
  "Vietri sul Mare", "Salerno", "Pontecagnano Faiano",
  "Battipaglia", "Eboli", "Capaccio Paestum", "Agropoli",
  "Castellabate", "Montecorice", "Pollica", "Pisciotta",
  "Centola", "Camerota", "Sapri",

  // Basilicata
  "Maratea",

  // Calabria
  "Tortora", "Praia a Mare", "Santa Maria del Cedro", "Diamante",
  "Belvedere Marittimo", "Cetraro", "Guardia Piemontese",
  "Paola", "San Lucido", "Fiumefreddo Bruzio", "Belmonte Calabro",
  "Amantea", "Nocera Terinese", "Falerna", "Gizzeria",
  "Lamezia Terme", "Curinga", "Pizzo", "Vibo Valentia",
  "Briatico", "Tropea", "Parghelia", "Zambrone", "Nicotera",
  "Palmi", "Bagnara Calabra", "Villa San Giovanni", "Reggio Calabria",
  "Melito di Porto Salvo", "Bova Marina", "Brancaleone",
  "Bruzzano Zeffirio", "Ferruzzano", "Africo", "Bianco",
  "Bovalino", "Locri", "Siderno", "Marina di Gioiosa Ionica",
  "Monasterace", "Riace", "Caulonia", "Soverato", "Davoli",
  "Squillace", "Catanzaro", "Sellia Marina", "Crotone",
  "Cutro", "Isola di Capo Rizzuto", "Crucoli", "Cirò Marina",
  "Rossano", "Corigliano Calabro", "Cassano all'Ionio",
  "Trebisacce", "Roseto Capo Spulico", "Amendolara", "Rocca Imperiale",

  // Puglia
  "Chieuti", "Lesina", "Poggio Imperiale", "Apricena", "San Severo",
  "Manfredonia", "Margherita di Savoia", "Zapponeta", "Trinitapoli",
  "San Ferdinando di Puglia", "Barletta", "Trani", "Bisceglie",
  "Molfetta", "Giovinazzo", "Bari", "Noicattaro", "Triggiano",
  "Mola di Bari", "Polignano a Mare", "Monopoli", "Fasano",
  "Ostuni", "Carovigno", "Brindisi", "Torchiarolo",
  "Lecce", "San Cataldo", "Otranto", "Vernole", "Melendugno",
  "Castro", "Diso", "Santa Cesarea Terme", "Giurdignano",
  "Minervino di Lecce", "Uggiano la Chiesa", "Poggiardo",
  "Ruffano", "Ugento", "Racale", "Alliste", "Taviano",
  "Gallipoli", "Alezio", "Sannicola", "Nardò",
  "Porto Cesareo", "Manduria", "Taranto", "Castellaneta",

  // Molise
  "Petacciato", "Montenero di Bisaccia", "Campomarino",
  "Termoli", "Guglionesi", "Montecilfone",

  // Abruzzo
  "Vasto", "San Salvo", "Casalbordino", "Fossacesia",
  "Rocca San Giovanni", "Lanciano", "San Vito Chietino",
  "Ortona", "Francavilla al Mare", "Chieti", "Pescara",
  "Montesilvano", "Silvi", "Pineto", "Roseto degli Abruzzi",
  "Giulianova", "Tortoreto", "Alba Adriatica", "Martinsicuro",

  // Marche
  "San Benedetto del Tronto", "Cupra Marittima", "Grottammare",
  "Pedaso", "Porto San Giorgio", "Fermo", "Porto Sant'Elpidio",
  "Civitanova Marche", "Porto Recanati", "Recanati", "Loreto",
  "Ancona", "Falconara Marittima", "Senigallia", "Mondolfo",
  "Fano", "Pesaro", "Gabicce Mare",

  // Emilia-Romagna
  "Cattolica", "Misano Adriatico", "Riccione", "Rimini",
  "Bellaria-Igea Marina", "San Mauro Pascoli", "Savignano sul Rubicone",
  "Cesenatico", "Gatteo", "San Mauro Mare", "Cervia",
  "Ravenna", "Comacchio",

  // Veneto
  "Rosolina", "Porto Viro", "Chioggia", "Venezia",
  "Cavallino-Treporti", "Jesolo", "Eraclea", "Caorle",
  "San Michele al Tagliamento",

  // Friuli Venezia Giulia
  "Latisana", "Lignano Sabbiadoro", "Marano Lagunare",
  "Aquileia", "Grado", "Monfalcone", "Trieste", "Muggia",

  // Sicilia
  "Messina", "Taormina", "Giardini Naxos", "Acireale",
  "Catania", "Siracusa", "Noto", "Portopalo di Capo Passero",
  "Ispica", "Modica", "Pozzallo", "Ragusa Marina", "Vittoria",
  "Gela", "Licata", "Agrigento", "Porto Empedocle",
  "Sciacca", "Ribera", "Menfi", "Castelvetrano Selinunte",
  "Marinella di Selinunte", "Mazara del Vallo", "Marsala",
  "Petrosino", "Trapani", "Valderice", "San Vito Lo Capo",
  "Castellammare del Golfo", "Terrasini", "Cinisi",
  "Isola delle Femmine", "Palermo", "Bagheria", "Cefalù",
  "Campofelice di Roccella", "Termini Imerese", "Milazzo",

  // Sardegna
  "Cagliari", "Quartu Sant'Elena", "Villasimius", "Muravera",
  "Tortolì", "Bari Sardo", "Arbatax", "Siniscola", "La Caletta",
  "Budoni", "San Teodoro", "Olbia", "Arzachena", "Santa Teresa Gallura",
  "Trinità d'Agultu e Vignola", "Castelsardo", "Sassari",
  "Alghero", "Bosa", "Oristano", "Cabras", "Arbus",
  "Guspini", "Pula", "Teulada", "Sant'Antioco", "Carbonia",
  "Portoscuso", "Iglesias",
];
