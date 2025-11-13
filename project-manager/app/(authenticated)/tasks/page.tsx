import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUserTasks } from '@/lib/rbac'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const tasks = await getUserTasks(session.user.id)

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

  const groupedTasks = {
    todo: tasks.filter((t) => t.status === 'TODO'),
    doing: tasks.filter((t) => t.status === 'DOING'),
    review: tasks.filter((t) => t.status === 'REVIEW'),
    done: tasks.filter((t) => t.status === 'DONE'),
    blocked: tasks.filter((t) => t.status === 'BLOCKED'),
  }

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes Tâches</h1>
        <p className="text-gray-600 mt-1">{tasks.length} tâche(s) au total</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">À faire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{groupedTasks.todo.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{groupedTasks.doing.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">En révision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{groupedTasks.review.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Terminé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{groupedTasks.done.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Bloqué</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{groupedTasks.blocked.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les Tâches</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/projects/${task.projectId}`}
                  className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        <Badge variant={taskStatusColors[task.status] as any}>
                          {taskStatusLabels[task.status]}
                        </Badge>
                        {task.due && isOverdue(task.due) && task.status !== 'DONE' && (
                          <Badge variant="destructive">En retard</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Projet: {task.project.title}
                      </p>
                      {task.assignee && (
                        <p className="text-sm text-gray-600 mb-1">
                          Assigné à: {task.assignee.name}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        {task.due && (
                          <span>
                            Échéance: {format(new Date(task.due), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                        {task._count.comments > 0 && (
                          <span>{task._count.comments} commentaire(s)</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-lg font-semibold text-gray-900 mb-1">
                        {task.progress}%
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">Aucune tâche assignée</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
