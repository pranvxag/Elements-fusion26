import { randomUUID } from 'node:crypto'
import { hashPassword, normalizeEmail, publicUser, createSession } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'
import type { PortalRole } from '@/lib/loan-domain'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { name?: string; email?: string; password?: string; phone?: string; role?: PortalRole }
    const name = payload.name?.trim()
    const email = normalizeEmail(payload.email || '')
    const password = payload.password || ''
    const role = payload.role === 'Bank Officer' ? 'Bank Officer' : 'Farmer'
    if (!name || name.length < 2) throw new Error('Enter your full name.')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.')
    if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
    let userId = ''
    await updateLoanStore(store => {
      store.users = store.users || []
      if (store.users.some(user => user.email === email)) throw new Error('An account with this email already exists.')
      userId = `user-${randomUUID()}`
      store.users.push({ id: userId, name, email, role, passwordHash: hashPassword(password), phone: payload.phone?.trim(), createdAt: new Date().toISOString() })
    })
    const session = await createSession(userId)
    const store = await readLoanStore()
    const created = (store.users || []).find(item => item.id === userId)
    if (!created) throw new Error('The account could not be created.')
    return Response.json({ user: publicUser(created) }, { status: 201, headers: { 'Set-Cookie': `agririsk_session=${session.id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800` } })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
