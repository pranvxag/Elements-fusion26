export function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'Request could not be completed.'
  return Response.json({ error: message }, { status })
}
