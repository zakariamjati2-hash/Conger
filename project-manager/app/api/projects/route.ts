import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserProjects } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(3),
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let projects = await getUserProjects(session.user.id)

    // Apply filters
    if (status) {
      projects = projects.filter((p) => p.status === status)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.client?.toLowerCase().includes(searchLower) ||
          p.location?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des projets' },
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

    // Only ADMIN and BUREAU can create projects
    if (session.user.role !== 'ADMIN' && session.user.role !== 'BUREAU') {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de créer des projets' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createProjectSchema.parse(body)

    const { terrainAgentIds, ...projectData } = data

    const project = await prisma.project.create({
      data: {
        ...projectData,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        createdById: session.user.id,
        terrainAgents: terrainAgentIds
          ? {
              create: terrainAgentIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        bureau: true,
        createdBy: true,
        terrainAgents: {
          include: {
            user: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      entity: 'Project',
      entityId: project.id,
      action: 'CREATE',
      details: { title: project.title },
      projectId: project.id,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du projet' },
      { status: 500 }
    )
  }
}
