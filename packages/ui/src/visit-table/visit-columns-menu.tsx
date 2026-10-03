import { ColumnsMenu } from "../data-table/columns-menu";
import {
  defaultColumnLayout,
  VISIT_COLUMN_LABELS,
  type ColumnLayout,
} from "./columns";

// The bookings table's "Kolumny" menu: the table menu with its columns.

export function VisitColumnsMenu({
  layout,
  cookie,
}: {
  layout: ColumnLayout;
  /** The cookie the layout is kept in. */
  cookie: string;
}) {
  return (
    <ColumnsMenu
      cookie={cookie}
      defaults={defaultColumnLayout(layout.map((column) => column.id))}
      labels={VISIT_COLUMN_LABELS}
      layout={layout}
      pinnedLabel="Numer"
    />
  );
}
