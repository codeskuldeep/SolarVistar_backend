import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Core Departments
  const departments = ['Sales', 'Installation', 'Maintenance', 'Support'];
  
  for (const deptName of departments) {
    await prisma.department.upsert({
      where: { name: deptName },
      update: {}, // Do nothing if it already exists
      create: { name: deptName },
    });
  }
  console.log('✅ Departments seeded successfully.');

  // 2. Create Master Admin Account
  const adminEmail = 'admin@zorvyn.com';
  const adminPassword = 'AdminPassword123!'; // You can change this

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await prisma.user.create({
      data: {
        name: 'Master Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        // Admins don't strictly need a department, so we leave it null
      },
    });
    console.log('✅ Master Admin created successfully.');
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}`);
  } else {
    console.log('⚡ Master Admin already exists. Skipping creation.');
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });