import { loadBookingParams } from "@/features/booking/search-params";
import { loadSpecialistPreview } from "@/features/booking/load-specialist-preview";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const search = new URL(request.url).searchParams;
  const params = await loadBookingParams(search);
  const nearest = search.get("najblizszy") === "1";
  const monthValue = search.get("miesiac");
  const month = monthValue
    ? (await loadBookingParams(new URLSearchParams({ tydzien: monthValue })))
        .tydzien
    : null;
  if (
    !params.specjalista ||
    (monthValue && (!month || !month.endsWith("-01"))) ||
    (!nearest && !params.tydzien && !month)
  )
    return Response.json(
      { error: "Nieprawidłowy zakres terminów." },
      { status: 400, headers },
    );
  try {
    return Response.json(await loadSpecialistPreview(params, nearest, month), {
      headers,
    });
  } catch (error) {
    console.error("[specialist-preview] Could not read availability", error);
    return Response.json(
      { error: "Nie udało się pobrać terminów. Spróbuj ponownie." },
      { status: 503, headers },
    );
  }
}
