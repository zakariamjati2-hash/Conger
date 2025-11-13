'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Navigation,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CreateProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    location: '',
    coordinates: '',
    latitude: '',
    longitude: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'A_LANCER',
    description: '',
    tags: ''
  });

  const [coordinateInputMethod, setCoordinateInputMethod] = useState<'manual' | 'coordinates'>('manual');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const parseCoordinatesString = (coordStr: string) => {
    if (!coordStr) return { lat: null, lng: null };
    
    // Formats supportés :
    // "33.5731°N, 7.5898°W"
    // "33.5731, -7.5898"
    // "lat: 33.5731, lng: -7.5898"
    
    const patterns = [
      /(\d+\.?\d*)°?([NS]),?\s*(\d+\.?\d*)°?([EW])/i,
      /(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)/,
      /lat:\s*(-?\d+\.?\d*),?\s*lng:\s*(-?\d+\.?\d*)/i
    ];

    for (const pattern of patterns) {
      const match = coordStr.match(pattern);
      if (match) {
        if (match[2] && match[4]) { // Format avec N/S/E/W
          let lat = parseFloat(match[1]);
          let lng = parseFloat(match[3]);
          
          if (match[2].toUpperCase() === 'S') lat = -lat;
          if (match[4].toUpperCase() === 'W') lng = -lng;
          
          return { lat, lng };
        } else if (match[1] && match[2]) { // Format décimal
          return {
            lat: parseFloat(match[1]),
            lng: parseFloat(match[2])
          };
        }
      }
    }
    
    return { lat: null, lng: null };
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString()
          }));
          setLoading(false);
          toast.success('Localisation actuelle récupérée !');
        },
        (error) => {
          setLoading(false);
          toast.error('Impossible de récupérer la localisation : ' + error.message);
        }
      );
    } else {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Préparer les coordonnées
      let finalLat = null;
      let finalLng = null;

      if (coordinateInputMethod === 'manual') {
        finalLat = formData.latitude ? parseFloat(formData.latitude) : null;
        finalLng = formData.longitude ? parseFloat(formData.longitude) : null;
      } else {
        const parsed = parseCoordinatesString(formData.coordinates);
        finalLat = parsed.lat;
        finalLng = parsed.lng;
      }

      const projectData = {
        title: formData.title,
        client: formData.client || null,
        location: formData.location || null,
        coordinates: formData.coordinates || null,
        latitude: finalLat,
        longitude: finalLng,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        status: formData.status,
        description: formData.description || null,
        tags: formData.tags || null,
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du projet');
      }

      toast.success('Projet créé avec succès !');
      router.push('/projects');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'A_LANCER', label: 'À lancer', color: 'bg-gray-100 text-gray-800' },
    { value: 'EN_COURS', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'EN_PAUSE', label: 'En pause', color: 'bg-yellow-100 text-yellow-800' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Building2 className="mr-3 h-8 w-8" />
              Nouveau Projet
            </h1>
            <p className="text-gray-600 mt-2">
              Créez un nouveau projet avec géolocalisation
            </p>
          </div>
          <Link href="/projects">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux projets
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Informations Générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Titre du projet *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Ex: Construction Immeuble Résidentiel"
                  required
                />
              </div>

              <div>
                <Label htmlFor="client">Client</Label>
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  placeholder="Ex: Société ABC Immobilier"
                />
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          <Badge className={option.color}>{option.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Description détaillée du projet..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="construction, résidentiel, moderne"
                />
              </div>
            </CardContent>
          </Card>

          {/* Localisation et Coordonnées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Localisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Adresse/Lieu</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ex: Casablanca, Boulevard Zerktouni"
                />
              </div>

              <div>
                <Label>Méthode de géolocalisation</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    type="button"
                    variant={coordinateInputMethod === 'manual' ? 'default' : 'outline'}
                    onClick={() => setCoordinateInputMethod('manual')}
                    size="sm"
                  >
                    Coordonnées manuelles
                  </Button>
                  <Button
                    type="button"
                    variant={coordinateInputMethod === 'coordinates' ? 'default' : 'outline'}
                    onClick={() => setCoordinateInputMethod('coordinates')}
                    size="sm"
                  >
                    Format texte
                  </Button>
                </div>
              </div>

              {coordinateInputMethod === 'manual' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => handleInputChange('latitude', e.target.value)}
                        placeholder="33.5731"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => handleInputChange('longitude', e.target.value)}
                        placeholder="-7.5898"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4" />
                    )}
                    Utiliser ma position
                  </Button>
                </>
              ) : (
                <div>
                  <Label htmlFor="coordinates">Coordonnées (formats multiples supportés)</Label>
                  <Input
                    id="coordinates"
                    value={formData.coordinates}
                    onChange={(e) => handleInputChange('coordinates', e.target.value)}
                    placeholder="33.5731°N, 7.5898°W ou 33.5731, -7.5898"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Formats acceptés: "33.5731°N, 7.5898°W", "33.5731, -7.5898", "lat: 33.5731, lng: -7.5898"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dates et Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Planning et Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Date de fin prévue</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget (MAD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link href="/projects">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Créer le projet
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}