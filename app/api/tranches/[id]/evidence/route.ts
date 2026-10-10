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
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose crop-progress evidence to upload.')
    if (file.size > 10 * 1024 * 1024) throw new Error('Evidence must be 10 MB or smaller.')
    if (!allowedTypes.has(file.type)) throw new Error('Only JPG, PNG, and PDF evidence is accepted.')
    const store = await readLoanStore()
    const facility = store.facilities.find(item => item.farmerUserId === user.id && item.tranches.some(tranche => tranche.id === id))
    const tranche = facility?.tranches.find(item => item.id === id)
    if (!facility || !tranche) throw new Error('Tranche was not found for this farmer.')
    if (tranche.status !== 'Planned' && tranche.status !== 'Pending Review') throw new Error('Evidence can be submitted for the next planned milestone or a tranche already under review.')
    const storageName = `${randomUUID()}${path.extname(file.name).toLowerCase() || '.bin'}`
    const uploadDirectory = path.join(process.cwd(), 'data', 'uploads')
    await mkdir(uploadDirectory, { recursive: true })
    await writeFile(path.join(uploadDirectory, storageName), Buffer.from(await file.arrayBuffer()), { flag: 'wx' })
    await updateLoanStore(current => {
      const currentFacility = current.facilities.find(item => item.id === facility.id)
      const currentTranche = currentFacility?.tranches.find(item => item.id === id)
      if (!currentTranche) throw new Error('Tranche was not found.')
      const evidence = currentTranche.evidence.find(item => item.required && !item.received) || currentTranche.evidence[0]
      if (!evidence) throw new Error('No evidence requirement exists for this tranche.')
      evidence.received = true
      evidence.proofFileName = file.name.replace(/[\\/]/g, '_')
      evidence.proofStorageName = storageName
      currentTranche.reviewObservation = 'Crop-progress evidence submitted by farmer.'
      if (currentTranche.status === 'Planned') currentTranche.status = 'Pending Review'
      current.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: 'Farmer', action: 'Crop evidence uploaded', entityType: 'Tranche', entityId: id, reason: evidence.label, occurredAt: new Date().toISOString() })
    })
    return Response.json({ ok: true, fileName: file.name })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
