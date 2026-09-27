import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalPages } from "@/content/site";

const page = legalPages.cookies;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title={page.title}>
      <p>
        Strona zapamiętuje w Twojej przeglądarce wybór dotyczący plików cookies
        (w pamięci lokalnej przeglądarki), żeby nie pytać o niego przy każdej
        wizycie, oraz to, czy widziałeś już animację powitalną.
      </p>
      <p>
        W banerze możesz już teraz zgodzić się na pliki analityczne albo wybrać
        „Tylko niezbędne”. Obecnie nie uruchamiamy żadnych plików cookies
        analitycznych ani marketingowych; gdy je wprowadzimy, zadziałają tylko
        za Twoją zgodą.
      </p>
      <p>
        Zapisane ustawienia możesz w każdej chwili usunąć, czyszcząc dane
        witryny w ustawieniach przeglądarki.
      </p>
    </LegalPage>
  );
}
