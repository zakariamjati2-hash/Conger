import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { canAccessProject } from '@/lib/rbac'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params

  const hasAccess = await canAccessProject(session.user.id, id)
  if (!hasAccess) {
    redirect('/dashboard')
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
        take: 10,
      },
    },
  })

  if (!project) {
    redirect('/projects')
  }

  const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
    PLANNED: 'default',
    IN_PROGRESS: 'warning',
    ON_HOLD: 'destructive',
    DELIVERED: 'success',
    CLOSED: 'secondary',
  }

  const statusLabels: Record<string, string> = {
    PLANNED: 'À lancer',
    IN_PROGRESS: 'En cours',
    ON_HOLD: 'En pause',
    DELIVERED: 'Livré',
    CLOSED: 'Clos',
  }

  const taskStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
    TODO: 'default',
    DOING: 'warning',
    REVIEW: 'default',
    DONE: 'success',
    BLOCKED: 'destructive',
  }

  const taskStatusLabels: Record<string, string> = {
    TODO: 'À faire',
    DOING: 'En cours',
    REVIEW: 'En révision',
    DONE: 'Terminé',
    BLOCKED: 'Bloqué',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          <Badge variant={statusColors[project.status] as any}>
            {statusLabels[project.status]}
          </Badge>
        </div>
        {project.client && (
          <p className="text-gray-600">Client: {project.client}</p>
        )}
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Avancement Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {project.progress}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {project.tasks.length}
            </div>
            <div className="text-sm text-gray-600">
              {project.tasks.filter((t) => t.status === 'DONE').length} terminée(s)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Fichiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {project.attachments.length}
            </div>
            <div className="text-sm text-gray-600">pièces jointes</div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Détails du Projet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.location && (
              <div>
                <span className="text-sm font-medium text-gray-600">Localisation:</span>
                <p className="mt-1">{project.location}</p>
              </div>
            )}
            {project.budget && (
              <div>
                <span className="text-sm font-medium text-gray-600">Budget:</span>
                <p className="mt-1">{project.budget.toLocaleString('fr-FR')} MAD</p>
              </div>
            )}
            {project.startDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Date de début:</span>
                <p className="mt-1">
                  {format(new Date(project.startDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            )}
            {project.endDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Date de fin:</span>
                <p className="mt-1">
                  {format(new Date(project.endDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            )}
            {project.bureau && (
              <div>
                <span className="text-sm font-medium text-gray-600">Responsable Bureau:</span>
                <p className="mt-1">{project.bureau.name}</p>
              </div>
            )}
            {project.terrainAgents.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-600">Agents Terrain:</span>
                <div className="mt-1 space-y-1">
                  {project.terrainAgents.map((assignment) => (
                    <p key={assignment.id}>{assignment.user.name}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          {project.description && (
            <div>
              <span className="text-sm font-medium text-gray-600">Description:</span>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          {project.tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">Tags:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
        </CardHeader>
        <CardContent>
          {project.tasks.length > 0 ? (
            <div className="space-y-3">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <Badge variant={taskStatusColors[task.status] as any}>
                        {taskStatusLabels[task.status]}
                      </Badge>
                    </div>
                    {task.assignee && (
                      <p className="text-sm text-gray-600 mt-1">
                        Assigné à: {task.assignee.name}
                      </p>
                    )}
                    {task.due && (
                      <p className="text-xs text-gray-500 mt-1">
                        Échéance: {format(new Date(task.due), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                    {task._count.comments > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {task._count.comments} commentaire(s)
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {task.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Aucune tâche</p>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Journal d'Activité</CardTitle>
        </CardHeader>
        <CardContent>
          {project.auditLogs.length > 0 ? (
            <div className="space-y-3">
              {project.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-600" />
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span className="font-medium">{log.user.name}</span>{' '}
                      <span className="text-gray-600">{log.action.toLowerCase()}</span>{' '}
                      <span className="text-gray-600">{log.entity.toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(log.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Aucune activité</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
