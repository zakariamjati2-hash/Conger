import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canAccessTask } from '@/lib/rbac'
import { z } from 'zod'

const createCommentSchema = z.object({
  body: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: taskId } = await params

    const hasAccess = await canAccessTask(session.user.id, taskId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas accès à cette tâche' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { body: commentBody } = createCommentSchema.parse(body)

    const comment = await prisma.comment.create({
      data: {
        taskId,
        authorId: session.user.id,
        body: commentBody,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du commentaire' },
      { status: 500 }
    )
  }
}
