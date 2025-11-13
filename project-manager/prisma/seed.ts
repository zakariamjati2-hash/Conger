import { PrismaClient, Role, ProjectStatus, TaskStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectAssignment.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const adminPassword = await bcrypt.hash('Nizar069903', 10)
  const defaultPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'mjatizakaria@gmail.com',
      passwordHash: adminPassword,
      name: 'Zakaria Mjati',
      role: Role.ADMIN,
    },
  })

  const bureau1 = await prisma.user.create({
    data: {
      email: 'bureau1@example.com',
      passwordHash: defaultPassword,
      name: 'Ahmed Benali',
      role: Role.BUREAU,
    },
  })

  const terrain1 = await prisma.user.create({
    data: {
      email: 'terrain1@example.com',
      passwordHash: defaultPassword,
      name: 'Fatima Zahra',
      role: Role.TERRAIN,
    },
  })

  const terrain2 = await prisma.user.create({
    data: {
      email: 'terrain2@example.com',
      passwordHash: defaultPassword,
      name: 'Mohammed Alami',
      role: Role.TERRAIN,
    },
  })

  console.log('✅ Users created')

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      title: 'Construction Immeuble Résidentiel - Casablanca',
      client: 'Société Immobilière Atlas',
      location: 'Casablanca, Quartier Maarif',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-06-30'),
      status: ProjectStatus.IN_PROGRESS,
      progress: 45,
      description: 'Construction d\'un immeuble résidentiel de 8 étages avec parking souterrain. Comprend 24 appartements de standing avec finitions haut de gamme.',
      budget: 15000000,
      tags: ['Construction', 'Résidentiel', 'Casablanca'],
      bureauId: bureau1.id,
      createdById: admin.id,
      terrainAgents: {
        create: [
          { userId: terrain1.id },
          { userId: terrain2.id },
        ],
      },
    },
  })

  const project2 = await prisma.project.create({
    data: {
      title: 'Rénovation Centre Commercial - Rabat',
      client: 'Mega Mall Rabat',
      location: 'Rabat, Agdal',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-12-31'),
      status: ProjectStatus.IN_PROGRESS,
      progress: 65,
      description: 'Rénovation complète du centre commercial incluant la modernisation des façades, réaménagement des espaces communs et mise aux normes de sécurité.',
      budget: 8500000,
      tags: ['Rénovation', 'Commercial', 'Rabat'],
      bureauId: bureau1.id,
      createdById: admin.id,
      terrainAgents: {
        create: [
          { userId: terrain1.id },
        ],
      },
    },
  })

  console.log('✅ Projects created')

  // Create tasks for project 1
  const task1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Coulage dalle 5ème étage',
      status: TaskStatus.DOING,
      progress: 70,
      assigneeId: terrain1.id,
      due: new Date('2024-11-20'),
    },
  })

  const task2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Installation ascenseurs',
      status: TaskStatus.TODO,
      progress: 0,
      assigneeId: terrain2.id,
      due: new Date('2024-12-15'),
    },
  })

  const task3 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Vérification plans électriques',
      status: TaskStatus.REVIEW,
      progress: 90,
      assigneeId: bureau1.id,
      due: new Date('2024-11-18'),
    },
  })

  // Create tasks for project 2
  const task4 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Démolition anciennes façades',
      status: TaskStatus.DONE,
      progress: 100,
      assigneeId: terrain1.id,
      due: new Date('2024-10-30'),
    },
  })

  const task5 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Installation nouvelle signalétique',
      status: TaskStatus.DOING,
      progress: 40,
      assigneeId: terrain1.id,
      due: new Date('2024-11-25'),
    },
  })

  console.log('✅ Tasks created')

  // Create comments
  await prisma.comment.create({
    data: {
      taskId: task1.id,
      authorId: terrain1.id,
      body: 'Le coulage est en cours. Conditions météo favorables. Estimation de fin : demain 16h.',
    },
  })

  await prisma.comment.create({
    data: {
      taskId: task1.id,
      authorId: bureau1.id,
      body: 'Parfait. N\'oubliez pas de prendre des photos pour le rapport.',
    },
  })

  await prisma.comment.create({
    data: {
      taskId: task5.id,
      authorId: terrain1.id,
      body: 'Signalétique reçue. Installation prévue pour la semaine prochaine.',
    },
  })

  console.log('✅ Comments created')

  // Create audit logs
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entity: 'Project',
      entityId: project1.id,
      projectId: project1.id,
      action: 'CREATE',
      details: { title: project1.title },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: bureau1.id,
      entity: 'Task',
      entityId: task1.id,
      projectId: project1.id,
      action: 'STATUS_CHANGE',
      details: { from: 'TODO', to: 'DOING' },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: terrain1.id,
      entity: 'Task',
      entityId: task1.id,
      projectId: project1.id,
      action: 'UPDATE',
      details: { field: 'progress', value: 70 },
    },
  })

  console.log('✅ Audit logs created')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📧 Login credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Admin:')
  console.log('  Email: mjatizakaria@gmail.com')
  console.log('  Password: Nizar069903')
  console.log('\nResponsable Bureau:')
  console.log('  Email: bureau1@example.com')
  console.log('  Password: password123')
  console.log('\nAgent Terrain 1:')
  console.log('  Email: terrain1@example.com')
  console.log('  Password: password123')
  console.log('\nAgent Terrain 2:')
  console.log('  Email: terrain2@example.com')
  console.log('  Password: password123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
