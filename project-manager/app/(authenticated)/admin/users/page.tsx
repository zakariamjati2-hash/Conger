'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TERRAIN',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue')
        return
      }

      setSuccess('Utilisateur créé avec succès')
      setFormData({ name: '', email: '', password: '', role: 'TERRAIN' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setError('Une erreur est survenue')
    }
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    BUREAU: 'Responsable Bureau',
    TERRAIN: 'Agent Terrain',
  }

  const roleColors: Record<string, 'default' | 'success' | 'warning'> = {
    ADMIN: 'destructive',
    BUREAU: 'warning',
    TERRAIN: 'default',
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-1">{users.length} utilisateur(s)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : 'Nouvel Utilisateur'}
        </Button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un Utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nom complet</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Mot de passe</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Rôle</label>
                  <Select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="TERRAIN">Agent Terrain</option>
                    <option value="BUREAU">Responsable Bureau</option>
                    <option value="ADMIN">Administrateur</option>
                  </Select>
                </div>
              </div>
              <Button type="submit">Créer l'utilisateur</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                    Nom
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                    Rôle
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                    Projets
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">
                    Tâches
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={roleColors[user.role] as any}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {user._count.projectsAsBureau + user._count.projectsAsTerrain}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {user._count.tasksAssigned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
