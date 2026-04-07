import Link from "next/link";

export const metadata = {
  title: "Termini di Servizio — LidoFacile",
  description: "Termini e condizioni d'uso di LidoFacile.it",
};

export default function TerminiDiServizioPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <Link href="/" className="text-sm text-brand-azure hover:underline">← Torna alla home</Link>
          <h1 className="mt-4 text-4xl font-black text-brand-navy">Termini di Servizio</h1>
          <p className="mt-2 text-sm text-gray-500">Ultimo aggiornamento: 7 aprile 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-brand-navy">1. Il servizio</h2>
            <p>LidoFacile.it è una piattaforma SaaS (Software as a Service) che consente ai gestori di stabilimenti balneari italiani di gestire prenotazioni, mappe, pagamenti e comunicazioni con i propri clienti.</p>
            <p className="mt-2">Utilizzando LidoFacile accetti integralmente i presenti Termini di Servizio. Se non sei d&apos;accordo, ti invitiamo a non utilizzare il servizio.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">2. Registrazione e account</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Per utilizzare LidoFacile è necessario registrarsi con un indirizzo email valido e una password sicura.</li>
              <li>Sei responsabile della riservatezza delle tue credenziali di accesso.</li>
              <li>Ci riserviamo il diritto di sospendere o cancellare account che violino i presenti termini.</li>
              <li>È vietato creare account falsi o impersonare altre persone o aziende.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">3. Abbonamento e pagamento</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>LidoFacile offre un periodo di prova gratuita di <strong>14 giorni</strong> senza carta di credito.</li>
              <li>Al termine del periodo di prova, per continuare ad utilizzare il servizio è necessario sottoscrivere un abbonamento annuale al prezzo di <strong>€497 + IVA/anno</strong>.</li>
              <li>Il pagamento è anticipato e non rimborsabile salvo quanto previsto dalla legge.</li>
              <li>LidoFacile <strong>non applica commissioni</strong> sulle prenotazioni ricevute dai tuoi clienti. I pagamenti online vengono processati direttamente dai provider (PayPal, Satispay, Revolut) sui tuoi conti.</li>
              <li>I prezzi possono variare nel tempo. Gli utenti abbonati saranno avvisati con almeno 30 giorni di anticipo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">4. Uso corretto del servizio</h2>
            <p>Ti impegni a utilizzare LidoFacile esclusivamente per scopi leciti e conformi alla normativa vigente. È vietato:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Inserire dati falsi o fuorvianti sullo stabilimento o sulle prenotazioni.</li>
              <li>Utilizzare il servizio per attività fraudolente o illegali.</li>
              <li>Tentare di accedere a dati di altri stabilimenti o utenti.</li>
              <li>Effettuare attività di scraping, reverse engineering o attacchi al sistema.</li>
              <li>Rivendere o cedere l&apos;accesso al servizio a terzi senza autorizzazione scritta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">5. Dati dei tuoi clienti</h2>
            <p>I dati dei clienti che prenotano attraverso la tua pagina LidoFacile (nome, email, telefono) sono di tua responsabilità. In qualità di gestore sei il titolare autonomo del trattamento di tali dati e devi garantire il rispetto del GDPR nei confronti dei tuoi clienti finali.</p>
            <p className="mt-2">LidoFacile agisce come responsabile del trattamento (art. 28 GDPR) limitatamente all&apos;archiviazione tecnica di tali dati.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">6. Proprietà intellettuale</h2>
            <p>Il software, il design, i loghi e i contenuti di LidoFacile.it sono di esclusiva proprietà di LidoFacile. È vietata qualsiasi riproduzione, distribuzione o utilizzo non autorizzato.</p>
            <p className="mt-2">I contenuti che carichi sulla piattaforma (foto, descrizioni, prezzi) rimangono di tua proprietà. Ci concedi una licenza non esclusiva per visualizzarli all&apos;interno del servizio.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">7. Disponibilità del servizio</h2>
            <p>Ci impegniamo a garantire la massima disponibilità del servizio, con un obiettivo di uptime del 99,5% mensile. Non garantiamo tuttavia un funzionamento ininterrotto e non siamo responsabili per interruzioni causate da:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Manutenzione programmata (comunicata in anticipo).</li>
              <li>Cause di forza maggiore.</li>
              <li>Malfunzionamenti di provider terzi (hosting, database, pagamenti).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">8. Limitazione di responsabilità</h2>
            <p>LidoFacile non è responsabile per:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Perdita di dati causata da uso improprio del servizio.</li>
              <li>Mancati pagamenti da parte dei clienti finali.</li>
              <li>Controversie tra il gestore dello stabilimento e i propri clienti.</li>
              <li>Danni indiretti, consequenziali o perdita di profitto.</li>
            </ul>
            <p className="mt-2">La responsabilità massima di LidoFacile è limitata all&apos;importo pagato nell&apos;ultimo anno di abbonamento.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">9. Cancellazione</h2>
            <p>Puoi cancellare il tuo account in qualsiasi momento scrivendo a <a href="mailto:info@lido-facile.it" className="text-brand-azure hover:underline">info@lido-facile.it</a>. La cancellazione non dà diritto a rimborsi per il periodo già pagato.</p>
            <p className="mt-2">Dopo la cancellazione, i tuoi dati saranno conservati per 12 mesi (come previsto dalla Privacy Policy) e successivamente eliminati.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">10. Legge applicabile e foro competente</h2>
            <p>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente in via esclusiva il Tribunale di Milano, salvo diversa disposizione di legge a tutela del consumatore.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">11. Contatti</h2>
            <p>Per qualsiasi domanda sui presenti Termini scrivi a <a href="mailto:info@lido-facile.it" className="text-brand-azure hover:underline">info@lido-facile.it</a>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
