import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createProjectSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  client: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  coordinates: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  status: z.enum(['A_LANCER', 'EN_COURS', 'EN_PAUSE', 'LIVRE', 'CLOS']).default('A_LANCER'),
  description: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
});

// GET - Liste des projets selon les permissions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const userId = session.user.id!;
    const userRole = session.user.role;

    // Construction de la requête selon le rôle
    let projectsWhere = {};
    
    if (userRole === 'ADMIN') {
      // Admin voit tous les projets
      projectsWhere = {};
    } else if (userRole === 'RESPONSABLE_BUREAU') {
      // Responsable bureau voit ses projets créés
      projectsWhere = {
        createdById: userId
      };
    } else if (userRole === 'BUREAU_TERRAIN') {
      // Bureau_Terrain voit ses projets + toutes ses assignations
      projectsWhere = {
        OR: [
          { createdById: userId },
          { assignments: { some: { userId } } }
        ]
      };
    } else {
      // Agent terrain voit seulement les projets assignés
      projectsWhere = {
        assignments: { some: { userId } }
      };
    }

    const projects = await prisma.project.findMany({
      where: projectsWhere,
      include: {
        createdBy: {
          select: { name: true, email: true, role: true }
        },
        assignments: {
          include: {
            user: {
              select: { name: true, email: true, role: true }
            }
          }
        },
        _count: {
          select: { tasks: true, attachments: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un nouveau projet
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier les permissions de création
    const userRole = session.user.role;
    if (!['ADMIN', 'RESPONSABLE_BUREAU', 'BUREAU_TERRAIN'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Permissions insuffisantes pour créer un projet' 
      }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // Convertir les dates
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;

    const project = await prisma.project.create({
      data: {
        title: validatedData.title,
        client: validatedData.client,
        location: validatedData.location,
        coordinates: validatedData.coordinates,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        startDate,
        endDate,
        budget: validatedData.budget,
        status: validatedData.status,
        description: validatedData.description,
        tags: validatedData.tags,
        createdById: session.user.id!,
      },
      include: {
        createdBy: {
          select: { name: true, email: true, role: true }
        }
      }
    });

    // Log d'audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        entity: 'Project',
        entityId: project.id,
        action: 'CREATE',
        details: {
          projectTitle: project.title,
          client: project.client,
          location: project.location,
          hasCoordinates: !!(project.latitude && project.longitude)
        }
      }
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: error.errors[0].message 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Erreur lors de la création du projet' 
    }, { status: 500 });
  }
}