// The morning e-mail to a specialist with visits to close: how many, which
// (the number, the service, when), and the link to their list. Nothing
// about the clients.

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export interface ClosingReminder {
  specialistName: string;
  visits: { reference: string; serviceName: string; startsAt: string }[];
}

export function closingEmail(
  reminder: ClosingReminder,
  { portalUrl, timeZone }: { portalUrl: string; timeZone: string },
) {
  const when = new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const line = (visit: ClosingReminder["visits"][number]) =>
    `${visit.reference} · ${visit.serviceName} · ${when
      .format(new Date(visit.startsAt))
      .replace(/,? /, " ")
      .replace(/(\d{2}\.\d{2}) /, "$1, ")}`;
  const link = `${portalUrl.replace(/\/$/, "")}/rezerwacje?zakres=do-zamkniecia`;
  const count = reminder.visits.length;
  const subject = `Wizyty do zamknięcia: ${count}`;
  const text = [
    `Dzień dobry, ${reminder.specialistName}!`,
    "",
    "Te wizyty już się odbyły, a nie są jeszcze zamknięte. Zaznacz, czy się odbyły (albo klient nie przyszedł), i dodaj tagi:",
    "",
    ...reminder.visits.map(line),
    "",
    link,
    "",
    "Kolor Sensu",
  ].join("\n");
  const html = `<!doctype html>
<html lang="pl"><body style="margin:0;background:#f6f7f5;font-family:Arial,sans-serif;color:#1f2a24">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:16px">Dzień dobry, ${escape(reminder.specialistName)}!</p>
<p style="font-size:15px;line-height:22px">Te wizyty już się odbyły, a nie są jeszcze zamknięte. Zaznacz, czy się odbyły (albo klient nie przyszedł), i dodaj tagi:</p>
<ul style="font-size:14px;line-height:22px;padding-left:18px">${reminder.visits
    .map((visit) => `<li>${escape(line(visit))}</li>`)
    .join("")}</ul>
<p style="margin:28px 0"><a href="${escape(link)}" style="background:#45684a;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Zamknij wizyty</a></p>
<p style="font-size:13px;color:#5b6660">Kolor Sensu</p>
</div></body></html>`;
  return { subject, text, html };
}
