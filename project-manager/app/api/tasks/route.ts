import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserTasks, canAccessProject } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(3),
  status: z.enum(['TODO', 'DOING', 'REVIEW', 'DONE', 'BLOCKED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  assigneeId: z.string().optional(),
  due: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (projectId) {
      const hasAccess = await canAccessProject(session.user.id, projectId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Vous n\'avez pas accès à ce projet' },
          { status: 403 }
        )
      }

      const tasks = await prisma.task.findMany({
        where: { projectId },
        include: {
          assignee: true,
          project: true,
          comments: {
            include: {
              author: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return NextResponse.json(tasks)
    }

    const tasks = await getUserTasks(session.user.id)
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const data = createTaskSchema.parse(body)

    const hasAccess = await canAccessProject(session.user.id, data.projectId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas accès à ce projet' },
        { status: 403 }
      )
    }

    // Only ADMIN and BUREAU can create tasks
    if (session.user.role === 'TERRAIN') {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de créer des tâches' },
        { status: 403 }
      )
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        due: data.due ? new Date(data.due) : undefined,
      },
      include: {
        assignee: true,
        project: true,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      entity: 'Task',
      entityId: task.id,
      action: 'CREATE',
      details: { title: task.title },
      projectId: task.projectId,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la tâche' },
      { status: 500 }
    )
  }
}
