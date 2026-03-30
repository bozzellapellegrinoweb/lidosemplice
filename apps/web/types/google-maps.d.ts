// Dichiarazioni minime per Google Maps Places API caricata via script tag
// Evita errori TS senza installare @types/google.maps (troppo pesante)

declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          input: HTMLInputElement,
          opts?: {
            types?: string[];
            componentRestrictions?: { country: string | string[] };
            fields?: string[];
          }
        );
        addListener(event: string, handler: () => void): void;
        getPlace(): {
          address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
          formatted_address?: string;
          geometry?: {
            location?: {
              lat(): number;
              lng(): number;
            };
          };
          place_id?: string;
        };
      }
    }
  }
}
