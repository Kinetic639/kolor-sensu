# Miro: kopia tablicy w repozytorium

Tablica: <https://miro.com/app/board/uXjVEaKfAoo=/>. Odczyt z Miro ma limit,
więc ramki strony publicznej są tu skopiowane: agent czyta kopię, a do Miro
sięga tylko po to, żeby coś zmienić (albo gdy kopia może być nieaktualna).

## Co jest w kopii

Stan na 24.10.2026, po weryfikacji kartek z kodem i testami (także po wydaniu na STAGING, #202, i testach z PR #212). Ramki warsztatów sprawdzone ponownie 26.10.2026, po wydaniu #227.

- [`strona-publiczna.md`](strona-publiczna.md): wszystkie ramki „Strona · …”
  (1–8, z ramkami „elementy”; 8. Newsletter od 24.10), mapa „Klient: odkrywa stronę” oraz ramki
  warsztatów w portalach i „W tle”; przy każdej kartce kolor, a w ramkach
  „elementy” także „Co ma się dziać” i „Czym sprawdzone”.
- [`kazda-strona.md`](kazda-strona.md): tabela „Każda strona: wspólna lista
  przed MVP”, czyli wszystkie strony, na które może trafić klient, od A do Z,
  z adresem i testem end-to-end (pozostałe kolumny tabeli są tylko w Miro).
- [`svg/`](svg): te same ramki w formacie Miro (canvas-composer SVG), z
  identyfikatorami elementów (`data-miro-id`) i ich położeniem. Z nich
  buduje się zmiany wysyłane do Miro (`canvas_update_from_svg`): element
  z tym samym `data-miro-id`, tylko z nowym kolorem albo tekstem.
- [`klient-rezerwacja.md`](klient-rezerwacja.md): mapa „Klient: umawia
  wizytę” i ramki „Klient · 1–8” z „Kupony zniżkowe”, przepisane z tablicy
  24.10 (kolory sprawdzone z kodem i testami); plik
  `svg/klient-rezerwacja.svg`.

- [`admin.md`](admin.md): nowa część portalu admina (od 26.10): mapa
  „Admin: prowadzi centrum” i kolumna „Admin · 1. Newsletter”, z kolorem,
  „Co ma się dziać” i „Czym sprawdzone” przy każdej kartce; plik
  `svg/admin-1-newsletter.svg`. Stare ramki „Portal admina” i „Admin ·
  1–8” (z pierwszej wersji tablicy) zostają pod nią, bez kopii.

Nie ma tu portalu specjalisty (poza warsztatami) ani ramki „Audyt
płatności 22.10”.

## Kolory

| Kartka (`data-color`) | Pole statusu (`fill`) | Znaczy                                                   |
| --------------------- | --------------------- | -------------------------------------------------------- |
| `light_green`         | `#d5f692`             | zrobione i sprawdzone testem (w CI albo end-to-end)      |
| `light_yellow`        | `#fff6b6`             | zrobione, ale bez testu albo z brakiem (opis mówi jakim) |
| `light_pink`          | `#ffcee0`             | nie zrobione                                             |
| `gray`                |                       | po MVP                                                   |
| `light_blue`          |                       | ustalone                                                 |
| `orange`              |                       | do decyzji                                               |

Ramka na górze kolumny (np. „Strona · 4. Edukacja (MVP)”) i mapa „Klient:
odkrywa stronę” mają te same kartki co ramki „elementy”, w tych samych
kolorach: zmiana koloru w „elementy” to także zmiana w obu kopiach.

## Jak używać

1. Przeczytaj `strona-publiczna.md` zamiast tablicy.
2. Zmień w Miro tylko to, co trzeba: jedna zbiorcza zmiana, elementy wzięte
   z `svg/` z poprawionym kolorem albo tekstem.
3. Tę samą zmianę wprowadź w `svg/` i w `strona-publiczna.md` w tym samym
   PR, żeby kopia nie odbiegała od tablicy.

Gdy ktoś zmieniał tablicę ręcznie, kopia może być stara: przed większą
zmianą przeczytaj w Miro tylko te ramki, których dotyczy.
