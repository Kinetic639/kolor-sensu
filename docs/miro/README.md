# Miro: kopia tablicy w repozytorium

Tablica: <https://miro.com/app/board/uXjVEaKfAoo=/>. Odczyt z Miro ma limit,
więc ramki strony publicznej są tu skopiowane: agent czyta kopię, a do Miro
sięga tylko po to, żeby coś zmienić (albo gdy kopia może być nieaktualna).

## Co jest w kopii

Stan na 23.10.2026, po weryfikacji kartek z kodem i testami.

- [`strona-publiczna.md`](strona-publiczna.md): wszystkie ramki „Strona · …”
  (1–7, z ramkami „elementy”), mapa „Klient: odkrywa stronę” oraz ramki
  warsztatów w portalach i „W tle”; przy każdej kartce kolor, a w ramkach
  „elementy” także „Co ma się dziać” i „Czym sprawdzone”.
- [`svg/`](svg): te same ramki w formacie Miro (canvas-composer SVG), z
  identyfikatorami elementów (`data-miro-id`) i ich położeniem. Z nich
  buduje się zmiany wysyłane do Miro (`canvas_update_from_svg`): element
  z tym samym `data-miro-id`, tylko z nowym kolorem albo tekstem.

Nie ma tu ramek klienta przy rezerwacji, portali admina i specjalisty
(poza warsztatami) ani tabeli „Każda strona”.

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
