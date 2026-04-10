# LidoFacile — Guida Commerciale

> Guida per il team di vendita. Studia questa guida prima di contattare i gestori di stabilimenti balneari.

---

## Cos'è LidoFacile

**LidoFacile** è un software gestionale SaaS pensato per i proprietari e gestori di stabilimenti balneari italiani. Sostituisce fogli Excel, agende cartacee e app separate con un'unica piattaforma accessibile da qualsiasi dispositivo (PC, tablet, smartphone).

**Problema che risolve**: I lidi gestiscono prenotazioni, pagamenti, personale e statistiche in modo frammentato e manuale. LidoFacile centralizza tutto in un'unica dashboard, riduce gli errori, fa risparmiare tempo e aumenta le prenotazioni online.

---

## Prezzo

| Piano | Costo |
|---|---|
| Abbonamento annuale | **€497/anno** (circa €41/mese) |
| Periodo di prova | Incluso (gratuito, gestito in autonomia) |

- Pagamento sicuro online con carta di credito tramite Stripe
- Rinnovo annuale automatico
- Nessun costo per transazione sulle prenotazioni gestite internamente

---

## A chi si vende

**Target primario**: Gestori e proprietari di stabilimenti balneari con ombrelloni, lettini, cabana o gazebo da prenotare.

**Segnali che il cliente ha bisogno di LidoFacile**:
- Gestisce le prenotazioni a voce o su carta
- Ha perso prenotazioni doppie o errori di disponibilità
- Non ha un modo per accettare pagamenti online
- Non sa quanti incassi ha fatto nella settimana
- Vuole un sistema di check-in rapido senza code

---

## Funzionalità principali

### 1. Mappa interattiva dello stabilimento

Il gestore crea una mappa digitale del proprio lido che riproduce fedelmente la disposizione fisica degli spazi. Supporta 4 tipi di elementi:

| Elemento | Capacità default |
|---|---|
| Ombrellone | 2 lettini |
| Cabana | 4 persone |
| Gazebo | 4 persone |
| Lettino | 1 posto |

Ogni elemento può essere:
- Nominato con etichetta personalizzata (es. "A1", "Premium 5", "Fila Mare 3")
- Marcato come **premium** (con prezzo maggiorato)
- Attivato o disattivato stagionalmente

**Colori sulla mappa in tempo reale**:
- Verde = disponibile
- Arancione = occupato
- Azzurro = selezionato

---

### 2. Sistema prenotazioni

#### Prenotazioni da parte del gestore (manuale)

Il gestore (o un dipendente) crea prenotazioni direttamente dalla dashboard:

1. Seleziona le date
2. Clicca sulla mappa per scegliere uno o più posti contemporaneamente
3. Inserisce nome, cognome e telefono del cliente
4. Il sistema calcola automaticamente il totale
5. La prenotazione viene salvata e appare subito sulla mappa come occupata

#### Prenotazioni online dai clienti finali

I clienti possono prenotare autonomamente dalla pagina pubblica del lido (`lido-facile.it/nomestabilimento`):

1. Scelgono data inizio e fine
2. Vedono la mappa con i posti disponibili in tempo reale
3. Selezionano il posto (o più posti)
4. Inseriscono i propri dati
5. Pagano online
6. Ricevono un **QR code** di conferma

#### Durate di prenotazione supportate

| Durata | Descrizione |
|---|---|
| Mezza giornata mattino | Solo mattina (tariffa ridotta) |
| Mezza giornata pomeriggio | Solo pomeriggio (tariffa ridotta) |
| Giornata intera | Tutto il giorno |
| Settimanale | 7 giorni |
| Bisettimanale | 14 giorni |
| Mensile | 1 mese |
| Stagionale | Tutta la stagione |

---

### 3. Gestione prezzi per stagione

Il gestore configura tariffe diverse in base alla stagione:

| Stagione | Esempio utilizzo |
|---|---|
| Low | Giugno inizio, Settembre |
| Mid | Giugno fine, Luglio inizio |
| High | Luglio e Agosto |
| Peak | Ferragosto e festività |

Per ogni stagione si imposta un prezzo diverso per:
- Ogni **fila** della spiaggia (fila 1 vicino al mare = più cara)
- Ogni **tipo di elemento** (ombrellone, cabana, gazebo, lettino)
- Ogni **durata** (giornata intera, settimanale, ecc.)

Il totale viene calcolato automaticamente dal sistema: il gestore non deve fare nessun calcolo manuale.

---

### 4. Pagamenti online

I clienti che prenotano online possono pagare con:

| Metodo | Note |
|---|---|
| **Carta di credito** (Stripe) | Immediato, sicuro |
| **PayPal** | Molto usato in Italia |
| **SatisPay** | App di pagamento italiana molto diffusa |
| **Revolut** | Pagamento internazionale |
| **Contante in loco** | Per prenotazioni gestite dal gestore |

I pagamenti vengono gestiti in modo sicuro dai provider (nessun dato carta passa per LidoFacile).

---

### 5. Check-in con QR Code

Ogni prenotazione confermata genera un **QR code univoco** che viene inviato al cliente.

**Come funziona il check-in:**
1. Il cliente arriva al lido e mostra il QR code (su telefono o stampato)
2. Il dipendente lo scansiona con qualsiasi tablet o smartphone
3. Il sistema verifica la prenotazione e la segna come "checked-in"
4. Zero code, zero telefonate, zero file

---

### 6. Notifiche in tempo reale

La dashboard del gestore e dei dipendenti riceve notifiche **sonore e visive** automatiche per:

- **Nuova prenotazione** (da cliente online): suono doppio beep + messaggio con cliente, date, importo
- **Nuovo ordine al bar**: suono triplo beep + messaggio con ombrellone, cliente, importo

Le notifiche si ripetono finché qualcuno non le conferma ("Ho visto!"). Il suono può essere disattivato con un click.

---

### 7. Gestione dipendenti

Il gestore può aggiungere tutto il suo team e assegnare **permessi granulari** per ogni dipendente:

| Permesso | Cosa permette |
|---|---|
| Prenotazioni | Vedere e gestire le prenotazioni |
| Check-in | Scansionare i QR code dei clienti |
| Ordini bar | Gestire gli ordini del bar |
| Analytics | Vedere incassi e statistiche |
| Prezzi | Modificare le tariffe |
| Impostazioni | Accedere alle impostazioni del lido |

I **nuovi dipendenti** vengono creati direttamente dalla dashboard con nome, email e password. Ricevono un'email di benvenuto automatica. Il gestore può **resettare la password** o **disattivare** un account in qualsiasi momento.

---

### 8. Analytics e statistiche

La dashboard analytics mostra al gestore i dati chiave del suo stabilimento:

**KPI principali (aggiornati in tempo reale):**
- Incasso totale (€)
- Numero prenotazioni
- Posti totali disponibili
- Clienti unici
- Importo medio per prenotazione
- Incasso bar (€)

**Grafici (ultimi 7 giorni):**
- Andamento prenotazioni giornaliero
- Andamento incassi giornaliero

---

### 9. Assistente AI (Chat Intelligente)

Ogni lido ha un assistente virtuale integrato, basato sull'intelligenza artificiale Claude (Anthropic).

**Per i clienti finali** (sulla pagina pubblica del lido):
- Risponde a domande su servizi, prezzi, orari, parcheggio, animali ammessi, sport disponibili, accessibilità
- Verifica in tempo reale la disponibilità per le date richieste
- Se il cliente vuole prenotare, genera direttamente un link alla mappa interattiva

**Per il gestore** (nella dashboard):
- Risponde a domande sulle prenotazioni di oggi
- Fornisce informazioni su incassi e occupazione
- Linguaggio professionale, risposte concise

---

### 10. Servizi aggiuntivi

Oltre agli ombrelloni, il gestore può configurare **servizi extra** che i clienti possono aggiungere alla prenotazione:

Esempi:
- Parasole premium (+€5/giorno)
- Lettino aggiuntivo (+€8/giorno)
- Cassetta di sicurezza (+€3/giorno)
- Noleggio sup (€15 una tantum)

I prezzi possono essere impostati come tariffa giornaliera o tariffa fissa.

---

### 11. Menu e ordini bar

Il lido può attivare un sistema di ordini bar integrato:
- Inserimento articoli con prezzo
- Ricezione ordini con notifica sonora immediata
- Associazione ordine all'ombrellone del cliente

---

### 12. Email automatiche

Il sistema invia email automatiche per:

| Evento | Email inviata a |
|---|---|
| Prenotazione confermata | Cliente (con QR code) |
| Nuovo dipendente aggiunto | Dipendente (credenziali accesso) |
| Nuovo gestore registrato | Gestore (benvenuto) |
| Fine periodo di prova | Gestore (promemoria abbonamento) |

---

### 13. Pagina pubblica del lido

Ogni stabilimento ha una pagina web pubblica personalizzata all'indirizzo:

```
lido-facile.it/nome-stabilimento
```

La pagina contiene:
- Mappa interattiva per prenotare online
- Assistente AI per rispondere ai clienti
- Informazioni sullo stabilimento (orari, servizi, foto)

---

## Cosa NON deve fare il gestore

LidoFacile è pensato per essere **pronto all'uso in pochi minuti**. Il gestore non deve:
- Installare nulla sul computer
- Gestire server o tecnicismi
- Integrare sistemi di pagamento separati (già inclusi)
- Fare aggiornamenti manuali del software

Basta registrarsi, configurare la mappa e i prezzi, e il sistema è operativo.

---

## Domande frequenti dei clienti

**"Devo avere un sito web per usarlo?"**
No. LidoFacile fornisce una pagina pubblica pronta. Il gestore può condividere il link con i clienti o metterlo su Instagram/Facebook.

**"Posso usarlo da telefono?"**
Sì, la dashboard è ottimizzata per tablet e smartphone. Molti gestori usano un tablet alla reception.

**"Posso limitare cosa vede il mio dipendente?"**
Sì, ogni dipendente ha permessi personalizzabili. Un bagnino può fare check-in senza vedere gli incassi.

**"I dati dei miei clienti sono al sicuro?"**
Sì. I dati sono salvati su infrastruttura Supabase (cloud europeo), i pagamenti non passano mai per LidoFacile ma direttamente a Stripe e PayPal.

**"Cosa succede se non rinnovo?"**
L'abbonamento viene sospeso. I dati non vengono cancellati immediatamente.

**"Posso provarlo prima di pagare?"**
Sì, è previsto un periodo di prova gratuito.

---

## Argomenti per chiudere la vendita

- **"Costa meno di 2 ombrelloni a stagione"** — €497 l'anno equivale a 2-3 giorni di incassi per un lido medio.
- **"Recupera il costo con una sola prenotazione online mancata"** — Un cliente che non riesce a prenotare online va dal concorrente.
- **"I tuoi dipendenti non devono più rispondere al telefono per le prenotazioni"** — Risparmio di ore di lavoro ogni settimana.
- **"Sai esattamente quanto hai guadagnato ieri, la settimana scorsa, questo mese"** — Le analytics eliminano la contabilità manuale a fine giornata.
- **"Il tuo cliente riceve il QR code e arriva al lido senza fare code"** — Esperienza cliente moderna, impression positiva.

---

*Guida interna — uso riservato al team commerciale LidoFacile*
