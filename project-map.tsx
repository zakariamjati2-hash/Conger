'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Building2, Navigation } from 'lucide-react';

// Fix pour les icônes Leaflet dans Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Project {
  id: string;
  title: string;
  client?: string;
  location?: string;
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  progress: number;
  description?: string;
}

interface ProjectMapProps {
  projects: Project[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showProjectDetails?: boolean;
}

// Composant pour centrer la carte sur les marqueurs
function MapCenterUpdater({ projects }: { projects: Project[] }) {
  const map = useMap();

  useEffect(() => {
    if (projects.length > 0) {
      const validProjects = projects.filter(p => p.latitude && p.longitude);
      
      if (validProjects.length > 0) {
        const bounds = L.latLngBounds(
          validProjects.map(p => [p.latitude!, p.longitude!])
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, projects]);

  return null;
}

// Fonction pour parser les coordonnées depuis différents formats
const parseCoordinates = (coordinatesStr?: string): { lat: number; lng: number } | null => {
  if (!coordinatesStr) return null;
  
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
    const match = coordinatesStr.match(pattern);
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
  
  return null;
};

// Icône personnalisée pour les projets
const createProjectIcon = (status: string) => {
  const colors = {
    'A_LANCER': '#6b7280',    // Gris
    'EN_COURS': '#3b82f6',    // Bleu
    'EN_PAUSE': '#f59e0b',    // Orange
    'LIVRE': '#10b981',       // Vert
    'CLOS': '#6b7280'         // Gris
  };
  
  const color = colors[status as keyof typeof colors] || colors['A_LANCER'];
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const getStatusDisplay = (status: string) => {
  const statusMap = {
    'A_LANCER': { label: 'À lancer', color: 'bg-gray-100 text-gray-800' },
    'EN_COURS': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    'EN_PAUSE': { label: 'En pause', color: 'bg-yellow-100 text-yellow-800' },
    'LIVRE': { label: 'Livré', color: 'bg-green-100 text-green-800' },
    'CLOS': { label: 'Clos', color: 'bg-gray-100 text-gray-800' },
  };
  return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' };
};

export function ProjectMap({ 
  projects, 
  center = [33.9716, -6.8498], // Coordonnées du Maroc (Rabat)
  zoom = 7,
  height = '400px',
  showProjectDetails = true 
}: ProjectMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Éviter l'hydratation côté serveur pour Leaflet
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Carte des Projets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            style={{ height }}
            className="bg-gray-100 flex items-center justify-center rounded-lg"
          >
            <div className="text-gray-500">Chargement de la carte...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Traiter les projets avec coordonnées
  const projectsWithCoords = projects.map(project => {
    let lat = project.latitude;
    let lng = project.longitude;
    
    // Si pas de lat/lng directes, essayer de parser les coordonnées
    if (!lat || !lng) {
      const parsed = parseCoordinates(project.coordinates);
      if (parsed) {
        lat = parsed.lat;
        lng = parsed.lng;
      }
    }
    
    return {
      ...project,
      latitude: lat,
      longitude: lng,
      hasValidCoords: !!(lat && lng)
    };
  }).filter(p => p.hasValidCoords);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Carte des Projets
          </div>
          <Badge variant="outline">
            {projectsWithCoords.length} projet(s) géolocalisé(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full rounded-lg overflow-hidden">
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            {/* Couche satellite avec OpenStreetMap par défaut */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Couche satellite Esri World Imagery */}
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              opacity={0.8}
            />
            
            {/* Marqueurs des projets */}
            {projectsWithCoords.map((project) => (
              <Marker
                key={project.id}
                position={[project.latitude!, project.longitude!]}
                icon={createProjectIcon(project.status)}
              >
                <Popup maxWidth={300}>
                  <div className="space-y-3 p-2">
                    <div>
                      <h3 className="font-semibold text-lg">{project.title}</h3>
                      {project.client && (
                        <p className="text-sm text-gray-600">Client: {project.client}</p>
                      )}
                      {project.location && (
                        <div className="flex items-center mt-1">
                          <Navigation className="mr-1 h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{project.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {showProjectDetails && (
                      <>
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusDisplay(project.status).color}>
                            {getStatusDisplay(project.status).label}
                          </Badge>
                          <span className="text-sm font-medium">{project.progress}%</span>
                        </div>
                        
                        <Progress value={project.progress} className="h-2" />
                        
                        {project.description && (
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {project.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-gray-500 border-t pt-2">
                          Coordonnées: {project.latitude?.toFixed(4)}, {project.longitude?.toFixed(4)}
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Centrer la carte sur les projets */}
            <MapCenterUpdater projects={projectsWithCoords} />
          </MapContainer>
        </div>
        
        {projects.length > projectsWithCoords.length && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {projects.length - projectsWithCoords.length} projet(s) sans coordonnées valides ne sont pas affichés sur la carte.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}