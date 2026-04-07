import Link from "next/link";

export const metadata = {
  title: "Cookie Policy — LidoFacile",
  description: "Informativa sull'uso dei cookie di LidoFacile.it",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <Link href="/" className="text-sm text-brand-azure hover:underline">← Torna alla home</Link>
          <h1 className="mt-4 text-4xl font-black text-brand-navy">Cookie Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Ultimo aggiornamento: 7 aprile 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-brand-navy">1. Cosa sono i cookie</h2>
            <p>I cookie sono piccoli file di testo che i siti web salvano nel browser dell&apos;utente durante la navigazione. Vengono utilizzati per far funzionare correttamente il sito, ricordare le preferenze e migliorare l&apos;esperienza utente.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">2. Cookie utilizzati da LidoFacile</h2>
            <p>LidoFacile utilizza <strong>esclusivamente cookie tecnici</strong>, necessari al corretto funzionamento del servizio. Non utilizziamo cookie di profilazione, pubblicitari o di tracciamento di terze parti.</p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Scopo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">sb-*</td>
                    <td className="px-4 py-3">Tecnico</td>
                    <td className="px-4 py-3">Sessione di autenticazione Supabase</td>
                    <td className="px-4 py-3">Sessione / 7 giorni</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">next-auth.*</td>
                    <td className="px-4 py-3">Tecnico</td>
                    <td className="px-4 py-3">Gestione sessione utente</td>
                    <td className="px-4 py-3">Sessione</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">__vercel_*</td>
                    <td className="px-4 py-3">Tecnico</td>
                    <td className="px-4 py-3">Ottimizzazione CDN Vercel</td>
                    <td className="px-4 py-3">Sessione</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">3. Cookie di terze parti</h2>
            <p>Le pagine di pagamento (PayPal, Satispay, Revolut) sono gestite direttamente dai rispettivi provider e potrebbero impostare propri cookie. Ti invitiamo a consultare le loro privacy policy per maggiori informazioni.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">4. Gestione dei cookie</h2>
            <p>Poiché utilizziamo solo cookie tecnici strettamente necessari, non è richiesto il consenso per la loro installazione ai sensi dell&apos;art. 122 del Codice Privacy e delle Linee Guida del Garante.</p>
            <p className="mt-2">Puoi comunque gestire i cookie tramite le impostazioni del tuo browser:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-brand-azure hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox" target="_blank" rel="noopener noreferrer" className="text-brand-azure hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-brand-azure hover:underline">Apple Safari</a></li>
            </ul>
            <p className="mt-2 text-sm text-gray-500">Attenzione: disabilitare i cookie tecnici potrebbe compromettere il corretto funzionamento del servizio (es. impossibilità di effettuare il login).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-navy">5. Contatti</h2>
            <p>Per qualsiasi domanda sui cookie scrivi a <a href="mailto:info@lido-facile.it" className="text-brand-azure hover:underline">info@lido-facile.it</a>.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
