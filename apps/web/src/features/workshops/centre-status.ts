// The HTTP status of a database refusal the portal's workshop routes pass on.
export function refusalStatus(code: string) {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (
    [
      "full",
      "already_registered",
      "registration_closed",
      "already_cancelled",
      "not_cancellable",
      "nothing_to_send",
    ].includes(code)
  )
    return 409;
  if (code === "recently_sent") return 429;
  if (["invalid_details", "refund_too_high", "invalid_message"].includes(code))
    return 422;
  return 500;
}
