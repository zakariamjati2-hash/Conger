import { prisma } from '@/lib/prisma'

export async function createAuditLog({
  userId,
  entity,
  entityId,
  action,
  details,
  projectId,
}: {
  userId: string
  entity: string
  entityId: string
  action: string
  details?: any
  projectId?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        entity,
        entityId,
        action,
        details: details || {},
        projectId,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}
