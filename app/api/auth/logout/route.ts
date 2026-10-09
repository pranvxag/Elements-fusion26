import { destroySession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  await destroySession(request)
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': 'agririsk_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0' } })
}
