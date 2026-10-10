import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertPortalRole, getAuthenticatedUser } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'

export const dynamic = 'force-dynamic'
const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf'])

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    assertPortalRole(user, 'Farmer')
    const { id } = await params
    const form = await request.formData()
    const file = form.get('file')
    const label = typeof form.get('label') === 'string' ? String(form.get('label')).trim() : 'Supporting document'
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose a document to upload.')
    if (file.size > 10 * 1024 * 1024) throw new Error('Documents must be 10 MB or smaller.')
    if (!allowedTypes.has(file.type)) throw new Error('Only JPG, PNG, and PDF documents are accepted.')
    const store = await readLoanStore()
    const application = (store.applications || []).find(item => item.id === id && item.userId === user.id)
    if (!application) throw new Error('Application was not found.')
    const storageName = `${randomUUID()}${path.extname(file.name).toLowerCase() || '.bin'}`
    const uploadDirectory = process.env.VERCEL ? path.join('/tmp', 'agririsk-uploads') : path.join(process.cwd(), 'data', 'uploads')
    await mkdir(uploadDirectory, { recursive: true })
    await writeFile(path.join(uploadDirectory, storageName), Buffer.from(await file.arrayBuffer()), { flag: 'wx' })
    let document
    await updateLoanStore(current => {
      const target = (current.applications || []).find(item => item.id === id && item.userId === user.id)
      if (!target) throw new Error('Application was not found.')
      document = { id: `document-${randomUUID()}`, label, fileName: file.name.replace(/[\\/]/g, '_'), storageName, uploadedAt: new Date().toISOString(), status: 'Submitted' as const }
      target.documents.push(document)
      target.updatedAt = new Date().toISOString()
      current.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: 'Farmer', action: 'Document uploaded', entityType: 'Document', entityId: document.id, reason: label, occurredAt: target.updatedAt })
    })
    return Response.json({ document }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
