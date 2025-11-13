'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [statusFilter])

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await fetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter((project) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      project.title.toLowerCase().includes(searchLower) ||
      project.client?.toLowerCase().includes(searchLower) ||
      project.location?.toLowerCase().includes(searchLower)
    )
  })

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-600 mt-1">{filteredProjects.length} projet(s)</p>
        </div>
        <Button onClick={() => router.push('/projects/new')}>
          Nouveau Projet
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rechercher</label>
              <Input
                placeholder="Titre, client, localisation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="PLANNED">À lancer</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="ON_HOLD">En pause</option>
                <option value="DELIVERED">Livré</option>
                <option value="CLOSED">Clos</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                  <Badge variant={statusColors[project.status] as any} className="ml-2 shrink-0">
                    {statusLabels[project.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.client && (
                    <div className="text-sm">
                      <span className="text-gray-600">Client:</span>{' '}
                      <span className="font-medium">{project.client}</span>
                    </div>
                  )}
                  {project.location && (
                    <div className="text-sm">
                      <span className="text-gray-600">Lieu:</span>{' '}
                      <span className="font-medium">{project.location}</span>
                    </div>
                  )}
                  {project.bureau && (
                    <div className="text-sm">
                      <span className="text-gray-600">Responsable:</span>{' '}
                      <span className="font-medium">{project.bureau.name}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Avancement</span>
                      <span className="font-semibold">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>{project._count?.tasks || 0} tâche(s)</span>
                    <span>{project._count?.attachments || 0} fichier(s)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Aucun projet trouvé</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
