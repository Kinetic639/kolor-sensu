import { BookingCrisisNote } from "@repo/ui/booking";
import type { ReactNode } from "react";
import { getCrisisHelp } from "@/lib/public-data";

// Every step of the booking wizard ends with help in a crisis (#247): 112
// and a free line of support, the CMS's numbers, and the page about help.

export default async function BookingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const crisis = await getCrisisHelp();
  return (
    <>
      {children}
      <div className="max-w-page px-gutter pb-section-sm mx-auto w-full">
        <BookingCrisisNote href="/pomoc-w-kryzysie" lines={crisis.lines} />
      </div>
    </>
  );
}
