import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canAccessTask } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const updateTaskSchema = z.object({
  title: z.string().min(3).optional(),
  status: z.enum(['TODO', 'DOING', 'REVIEW', 'DONE', 'BLOCKED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  assigneeId: z.string().optional(),
  due: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const hasAccess = await canAccessTask(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas accès à cette tâche' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateTaskSchema.parse(body)

    const oldTask = await prisma.task.findUnique({ where: { id } })

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        due: data.due ? new Date(data.due) : undefined,
      },
      include: {
        assignee: true,
        project: true,
      },
    })

    // Create audit log
    const changes: any = {}
    if (oldTask) {
      if (data.status && oldTask.status !== data.status) {
        changes.status = { from: oldTask.status, to: data.status }
      }
      if (data.progress !== undefined && oldTask.progress !== data.progress) {
        changes.progress = { from: oldTask.progress, to: data.progress }
      }
    }

    await createAuditLog({
      userId: session.user.id,
      entity: 'Task',
      entityId: task.id,
      action: 'UPDATE',
      details: changes,
      projectId: task.projectId,
    })

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la tâche' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const hasAccess = await canAccessTask(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas accès à cette tâche' },
        { status: 403 }
      )
    }

    // Only ADMIN and BUREAU can delete tasks
    if (session.user.role === 'TERRAIN') {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer des tâches' },
        { status: 403 }
      )
    }

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      entity: 'Task',
      entityId: id,
      action: 'DELETE',
      details: { title: task.title },
      projectId: task.projectId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la tâche' },
      { status: 500 }
    )
  }
}
