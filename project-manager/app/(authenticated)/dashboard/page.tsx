import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getUserProjects, getUserTasks } from '@/lib/rbac'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const projects = await getUserProjects(session.user.id)
  const tasks = await getUserTasks(session.user.id)

  // Calculate KPIs
  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length
  const totalProjects = projects.length
  const completedProjects = projects.filter((p) => p.status === 'DELIVERED' || p.status === 'CLOSED').length
  
  const myTasks = tasks.filter((t) => t.assigneeId === session.user.id)
  const pendingTasks = myTasks.filter((t) => t.status !== 'DONE').length
  const todayTasks = myTasks.filter((t) => {
    if (!t.due) return false
    const today = new Date()
    const dueDate = new Date(t.due)
    return dueDate.toDateString() === today.toDateString()
  })

  const overdueTasks = myTasks.filter((t) => {
    if (!t.due || t.status === 'DONE') return false
    return new Date(t.due) < new Date()
  })

  const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
    PLANNED: 'default',
    IN_PROGRESS: 'warning',
    ON_HOLD: 'destructive',
    DELIVERED: 'success',
    CLOSED: 'secondary',
  }

  const taskStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
    TODO: 'default',
    DOING: 'warning',
    REVIEW: 'default',
    DONE: 'success',
    BLOCKED: 'destructive',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="mt-2 text-gray-600">
            Bienvenue, {session.user.name} ({session.user.role})
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Projets Actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{activeProjects}</div>
              <p className="text-xs text-gray-500 mt-1">sur {totalProjects} projets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Projets Livrés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedProjects}</div>
              <p className="text-xs text-gray-500 mt-1">terminés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Mes Tâches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendingTasks}</div>
              <p className="text-xs text-gray-500 mt-1">en attente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tâches en Retard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{overdueTasks.length}</div>
              <p className="text-xs text-gray-500 mt-1">à traiter</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Projets Récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{project.title}</h3>
                        {project.client && (
                          <p className="text-sm text-gray-600 mt-1">{project.client}</p>
                        )}
                      </div>
                      <Badge variant={statusColors[project.status] as any}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Avancement</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
                {projects.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucun projet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Mes Tâches du Jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayTasks.length > 0 ? (
                  todayTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}`}
                      className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{task.project.title}</p>
                        </div>
                        <Badge variant={taskStatusColors[task.status] as any}>
                          {task.status}
                        </Badge>
                      </div>
                      {task.due && (
                        <p className="text-xs text-gray-500 mt-2">
                          Échéance: {format(new Date(task.due), 'HH:mm', { locale: fr })}
                        </p>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucune tâche pour aujourd'hui</p>
                    {myTasks.length > 0 && (
                      <Link href="/tasks" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                        Voir toutes mes tâches
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
