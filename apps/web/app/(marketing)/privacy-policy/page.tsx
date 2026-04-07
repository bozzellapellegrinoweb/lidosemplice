import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — LidoFacile",
  description: "Informativa sul trattamento dei dati personali di LidoFacile.it",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <Link href="/" className="text-sm text-brand-azure hover:underline">← Torna alla home</Link>
          <h1 className="mt-4 text-4xl font-black text-brand-navy">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Ultimo aggiornamento: 7 aprile 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-brand-navy">1. Titolare del trattamento</h2>
            <p>Il titolare del trattamento dei dati personali è <strong>LidoFacile.it</strong>, raggiungibile all&apos;indirizzo email <a href="mailto:info@lido-facile.it" className="text-brand-azure hover:underline">info@lido-facile.it</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">2. Dati raccolti</h2>
            <p>LidoFacile raccoglie le seguenti categorie di dati personali:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Dati di registrazione:</strong> nome, indirizzo email, password (cifrata).</li>
              <li><strong>Dati dello stabilimento:</strong> nome, indirizzo, città, provincia, CAP, telefono, email, sito web, coordinate geografiche.</li>
              <li><strong>Dati delle prenotazioni:</strong> nome cliente, email cliente, telefono cliente, date di soggiorno, metodo di pagamento, importo.</li>
              <li><strong>Dati di pagamento:</strong> non gestiamo direttamente i dati delle carte di credito; i pagamenti sono processati da provider certificati (PayPal, Satispay, Revolut, Stripe).</li>
              <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di browser, pagine visitate, cookie tecnici.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">3. Finalità del trattamento</h2>
            <p>I dati vengono trattati per le seguenti finalità:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Erogazione del servizio gestionale (dashboard, prenotazioni, mappa).</li>
              <li>Invio di comunicazioni transazionali (conferme prenotazione, notifiche).</li>
              <li>Gestione dell&apos;abbonamento e della fatturazione.</li>
              <li>Assistenza tecnica e supporto clienti.</li>
              <li>Miglioramento del servizio tramite analisi aggregate e anonime.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">4. Base giuridica</h2>
            <p>Il trattamento dei dati avviene sulla base di:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Esecuzione del contratto</strong> (art. 6 par. 1 lett. b GDPR): per fornire il servizio sottoscritto.</li>
              <li><strong>Legittimo interesse</strong> (art. 6 par. 1 lett. f GDPR): per la sicurezza del servizio e la prevenzione delle frodi.</li>
              <li><strong>Consenso</strong> (art. 6 par. 1 lett. a GDPR): per eventuali comunicazioni di marketing (solo se esplicitamente fornito).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">5. Conservazione dei dati</h2>
            <p>I dati vengono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Dati dell&apos;account: per tutta la durata del rapporto contrattuale e fino a 12 mesi dopo la cancellazione.</li>
              <li>Dati delle prenotazioni: 10 anni per obblighi fiscali e contabili.</li>
              <li>Log tecnici: 30 giorni.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">6. Condivisione dei dati</h2>
            <p>I dati non vengono venduti a terzi. Possono essere condivisi con:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Supabase Inc.</strong> — infrastruttura database e autenticazione (server in Europa).</li>
              <li><strong>Vercel Inc.</strong> — hosting e CDN.</li>
              <li><strong>Resend Inc.</strong> — invio email transazionali.</li>
              <li><strong>PayPal, Satispay, Revolut, Stripe</strong> — processori di pagamento, ognuno con propria privacy policy.</li>
              <li><strong>Autorità competenti</strong> — se richiesto dalla legge.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">7. Diritti dell&apos;interessato</h2>
            <p>In qualità di interessato hai il diritto di:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Accedere ai tuoi dati personali (art. 15 GDPR).</li>
              <li>Rettificarli se inesatti (art. 16 GDPR).</li>
              <li>Richiederne la cancellazione (art. 17 GDPR).</li>
              <li>Limitarne il trattamento (art. 18 GDPR).</li>
              <li>Portabilità dei dati (art. 20 GDPR).</li>
              <li>Opporti al trattamento (art. 21 GDPR).</li>
              <li>Proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-brand-azure hover:underline">garanteprivacy.it</a>).</li>
            </ul>
            <p className="mt-3">Per esercitare i tuoi diritti scrivi a <a href="mailto:info@lido-facile.it" className="text-brand-azure hover:underline">info@lido-facile.it</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">8. Cookie</h2>
            <p>Utilizziamo esclusivamente cookie tecnici necessari al funzionamento del servizio (autenticazione, preferenze). Non utilizziamo cookie di profilazione o pubblicitari. Per maggiori dettagli consulta la nostra <Link href="/cookie-policy" className="text-brand-azure hover:underline">Cookie Policy</Link>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">9. Modifiche alla privacy policy</h2>
            <p>Ci riserviamo il diritto di aggiornare questa policy. In caso di modifiche sostanziali, gli utenti registrati saranno notificati via email. La versione aggiornata sarà sempre disponibile su questa pagina.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
