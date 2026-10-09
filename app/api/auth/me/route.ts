import { getAuthenticatedUser, publicUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  return Response.json({ user: user ? publicUser(user) : null }, { status: user ? 200 : 401 })
}
