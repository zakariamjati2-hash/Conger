import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canAccessProject } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const updateProjectSchema = z.object({
  title: z.string().min(3).optional(),
  client: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'DELIVERED', 'CLOSED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  budget: z.number().optional(),
  tags: z.array(z.string()).optional(),
  bureauId: z.string().optional(),
  terrainAgentIds: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const hasAccess = await canAccessProject(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas accès à ce projet' },
        { status: 403 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        bureau: true,
        createdBy: true,
        terrainAgents: {
          include: {
            user: true,
          },
        },
        tasks: {
          include: {
            assignee: true,
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        attachments: {
          include: {
            uploadedBy: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        auditLogs: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du projet' },
      { status: 500 }
    )
  }
}

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

    const hasAccess = await canAccessProject(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas accès à ce projet' },
        { status: 403 }
      )
    }

    // Only ADMIN and BUREAU can update projects
    if (session.user.role === 'TERRAIN') {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier ce projet' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateProjectSchema.parse(body)

    const { terrainAgentIds, ...projectData } = data

    // Get old project for audit
    const oldProject = await prisma.project.findUnique({ where: { id } })

    // Update terrain agents if provided
    if (terrainAgentIds !== undefined) {
      await prisma.projectAssignment.deleteMany({
        where: { projectId: id },
      })

      if (terrainAgentIds.length > 0) {
        await prisma.projectAssignment.createMany({
          data: terrainAgentIds.map((userId) => ({
            projectId: id,
            userId,
          })),
        })
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...projectData,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        bureau: true,
        createdBy: true,
        terrainAgents: {
          include: {
            user: true,
          },
        },
        tasks: true,
      },
    })

    // Create audit log
    const changes: any = {}
    if (oldProject) {
      if (data.status && oldProject.status !== data.status) {
        changes.status = { from: oldProject.status, to: data.status }
      }
      if (data.progress !== undefined && oldProject.progress !== data.progress) {
        changes.progress = { from: oldProject.progress, to: data.progress }
      }
    }

    await createAuditLog({
      userId: session.user.id,
      entity: 'Project',
      entityId: project.id,
      action: 'UPDATE',
      details: changes,
      projectId: project.id,
    })

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du projet' },
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

    // Only ADMIN can delete projects
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seul un administrateur peut supprimer des projets' },
        { status: 403 }
      )
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    await prisma.project.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      entity: 'Project',
      entityId: id,
      action: 'DELETE',
      details: { title: project.title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du projet' },
      { status: 500 }
    )
  }
}
