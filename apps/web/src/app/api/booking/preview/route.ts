import { loadWizard } from "@/features/booking/load-wizard";
import { loadBookingParams } from "@/features/booking/search-params";

// Read-only: the existing wizard resolves the offer, location and live slots.
// A time is held only later, by the protected booking action.
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const search = new URL(request.url).searchParams;
  const nearest = search.get("najblizszy") === "1";
  const params = await loadBookingParams(search);
  if (!params.usluga || !params.specjalista || !params.forma)
    return Response.json(
      { error: "Wybierz usługę i formę spotkania." },
      { status: 400, headers },
    );
  try {
    let wizard = await loadWizard({
      ...params,
      tydzien: nearest ? null : params.tydzien,
      termin: null,
      uwaga: null,
    });
    if (nearest && wizard?.view.panel.kind === "slots") {
      const picker = wizard.view.panel.picker;
      if (
        !picker.days.some((day) => day.slots.length) &&
        picker.nothingFree?.kind === "later"
      ) {
        const nextWeek = new URL(
          picker.nothingFree.href,
          request.url,
        ).searchParams.get("tydzien");
        if (nextWeek)
          wizard = await loadWizard({
            ...params,
            tydzien: nextWeek,
            termin: null,
            uwaga: null,
          });
      }
    }
    if (!wizard)
      return Response.json(
        { error: "Rezerwacja online jest teraz niedostępna." },
        { status: 503, headers },
      );
    if (wizard.view.panel.kind !== "slots")
      return Response.json(
        { error: "Te ustawienia wizyty są niedostępne." },
        { status: 400, headers },
      );
    const picker = wizard.view.panel.picker;
    if (!picker.days.some((day) => day.slots.length) && !picker.nothingFree)
      return Response.json(
        { error: "Nie udało się potwierdzić dostępności. Spróbuj ponownie." },
        { status: 503, headers },
      );
    return Response.json({ picker }, { headers });
  } catch (error) {
    console.error("[booking-preview] Could not read available times", error);
    return Response.json(
      { error: "Nie udało się pobrać terminów. Spróbuj ponownie." },
      { status: 503, headers },
    );
  }
}
