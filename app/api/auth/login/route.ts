import { createSession, ensureDemoAccounts, normalizeEmail, publicUser, verifyPassword } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { readLoanStore } from '@/lib/loan-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string; password?: string }
    const email = normalizeEmail(payload.email || '')
    const password = payload.password || ''
    await ensureDemoAccounts()
    const store = await readLoanStore()
    const user = (store.users || []).find(item => item.email === email)
    if (!user || !verifyPassword(password, user.passwordHash)) throw new Error('Email or password is incorrect.')
    const session = await createSession(user.id)
    return Response.json({ user: publicUser(user) }, { headers: { 'Set-Cookie': `agririsk_session=${session.id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800` } })
  } catch (error) {
    return errorResponse(error, 401)
  }
}
