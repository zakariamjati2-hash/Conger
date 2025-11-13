import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return false

  // Admin can access all projects
  if (user.role === Role.ADMIN) return true

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      terrainAgents: true,
    },
  })

  if (!project) return false

  // Bureau can access projects they're responsible for or created
  if (user.role === Role.BUREAU) {
    return project.bureauId === userId || project.createdById === userId
  }

  // Terrain can access projects they're assigned to
  if (user.role === Role.TERRAIN) {
    return project.terrainAgents.some((assignment) => assignment.userId === userId)
  }

  return false
}

export async function getUserProjects(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return []

  // Admin sees all projects
  if (user.role === Role.ADMIN) {
    return prisma.project.findMany({
      include: {
        bureau: true,
        createdBy: true,
        terrainAgents: {
          include: {
            user: true,
          },
        },
        tasks: true,
        _count: {
          select: {
            tasks: true,
            attachments: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  // Bureau sees projects they're responsible for or created
  if (user.role === Role.BUREAU) {
    return prisma.project.findMany({
      where: {
        OR: [
          { bureauId: userId },
          { createdById: userId },
        ],
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
        _count: {
          select: {
            tasks: true,
            attachments: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  // Terrain sees projects they're assigned to
  if (user.role === Role.TERRAIN) {
    return prisma.project.findMany({
      where: {
        terrainAgents: {
          some: {
            userId: userId,
          },
        },
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
        _count: {
          select: {
            tasks: true,
            attachments: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  return []
}

export async function canAccessTask(userId: string, taskId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return false

  // Admin can access all tasks
  if (user.role === Role.ADMIN) return true

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          terrainAgents: true,
        },
      },
    },
  })

  if (!task) return false

  // Check if user can access the project
  return canAccessProject(userId, task.projectId)
}

export async function getUserTasks(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) return []

  // Admin sees all tasks
  if (user.role === Role.ADMIN) {
    return prisma.task.findMany({
      include: {
        project: true,
        assignee: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        due: 'asc',
      },
    })
  }

  // Bureau sees tasks from their projects
  if (user.role === Role.BUREAU) {
    return prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          {
            project: {
              OR: [
                { bureauId: userId },
                { createdById: userId },
              ],
            },
          },
        ],
      },
      include: {
        project: true,
        assignee: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        due: 'asc',
      },
    })
  }

  // Terrain sees only their assigned tasks
  if (user.role === Role.TERRAIN) {
    return prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          {
            project: {
              terrainAgents: {
                some: {
                  userId: userId,
                },
              },
            },
          },
        ],
      },
      include: {
        project: true,
        assignee: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        due: 'asc',
      },
    })
  }

  return []
}
