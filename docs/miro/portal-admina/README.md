# Tablica „Kolor Sensu: portal admina”

Tablica: <https://miro.com/app/board/uXjVEKFU52A=/>. Zapisana 24–25.11.2026
z plików w tym folderze. Kolory i „Czym sprawdzone” pochodzą ze sprawdzenia
kodu na `develop` a419277; skróty testów są w
[`../portale-skroty-testow.md`](../portale-skroty-testow.md).

Od góry tablicy (po lewej, poza mapami, jest ramka „Jak czytać tę tablicę”
z legendą kolorów i linkami do map):

| Plik                                                                   | Mapa na tablicy                                 | Ramki pod mapą  |
| ---------------------------------------------------------------------- | ----------------------------------------------- | --------------- |
| [`02-admin-ekrany.md`](02-admin-ekrany.md)                             | Admin: prowadzi centrum                         | „Admin · 1–16”  |
| [`01-admin-obsluguje-wizyte.md`](01-admin-obsluguje-wizyte.md)         | Admin: obsługuje wizytę                         | „Wizyta · 1–8”  |
| [`03-nowy-specjalista.md`](03-nowy-specjalista.md)                     | Admin i specjalista: nowy specjalista w centrum | „Zespół · 1–10” |
| [`04-admin-przygotowuje-centrum.md`](04-admin-przygotowuje-centrum.md) | Admin: przygotowuje centrum do startu           | „Start · 1–7”   |

W mapie każda kolumna ma link „szczegóły” do swojej ramki, a ramka ma link
„← wróć do mapy”. Ramka ma historyjkę, a przy każdej kartce: „Co ma się
dziać” (Zakładając / Gdy / Wtedy) i „Czym sprawdzone → kolor”.

[`ids.json`](ids.json) ma identyfikatory Miro (`data-miro-id`) map, ramek
szczegółów i ramki legendy. Zmianę wysyła się jedną zbiorczą operacją
`canvas_update_from_svg`; identyfikatory pojedynczych kartek odczytaj
z tablicy tylko dla ramki, którą zmieniasz.

Ramki „Admin · 8. Kody rabatowe”, „Admin · 10. Warsztaty” i „Admin · 14.
Newsletter” przenoszą treść ramek opisanych w [`../admin.md`](../admin.md)
i [`../strona-publiczna.md`](../strona-publiczna.md).
