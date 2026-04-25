import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// These are the CANONICAL department names used everywhere (seed, frontend, backend)
const CANONICAL_DEPARTMENTS = [
  'Sales Department',
  'Installation & Maintenance Department',
  'Operations Department',
];

// Map of old/incorrect names → correct canonical name
const RENAME_MAP = {
  'sales': 'Sales Department',
  'sales dept': 'Sales Department',
  'sales department': 'Sales Department',
  'installation': 'Installation & Maintenance Department',
  'installation department': 'Installation & Maintenance Department',
  'installation & maintenance': 'Installation & Maintenance Department',
  'installation & maintenance department': 'Installation & Maintenance Department',
  'installation and maintenance department': 'Installation & Maintenance Department',
  'operations': 'Operations Department',
  'operations dept': 'Operations Department',
  'operations department': 'Operations Department',
  'support': 'Operations Department',
  'support department': 'Operations Department',
};

async function main() {
  console.log('🔍 Fetching all departments from the database...\n');

  const allDepts = await prisma.department.findMany({
    include: { users: { select: { id: true, name: true, email: true } } },
  });

  console.log(`Found ${allDepts.length} department(s):`);
  for (const dept of allDepts) {
    console.log(`  • "${dept.name}" (${dept.users.length} user(s))`);
  }
  console.log('');

  // Step 1: Rename any departments that don't match canonical names
  for (const dept of allDepts) {
    const canonicalName = RENAME_MAP[dept.name.toLowerCase()];

    if (canonicalName && dept.name !== canonicalName) {
      // Check if the canonical name already exists as a separate record
      const existing = allDepts.find(d => d.name === canonicalName);

      if (existing && existing.id !== dept.id) {
        // Merge: move all users from the old dept to the canonical one, then delete old dept
        console.log(`🔀 Merging "${dept.name}" → "${canonicalName}" (moving ${dept.users.length} user(s))`);
        for (const user of dept.users) {
          await prisma.user.update({
            where: { id: user.id },
            data: { departmentId: existing.id },
          });
          console.log(`   ✅ Moved user: ${user.name} (${user.email})`);
        }
        await prisma.department.delete({ where: { id: dept.id } });
        console.log(`   🗑️  Deleted old department "${dept.name}"`);
      } else {
        // Simple rename
        console.log(`✏️  Renaming "${dept.name}" → "${canonicalName}"`);
        await prisma.department.update({
          where: { id: dept.id },
          data: { name: canonicalName },
        });
        console.log(`   ✅ Done`);
      }
    } else if (!canonicalName && !CANONICAL_DEPARTMENTS.includes(dept.name)) {
      console.log(`⚠️  Unknown department "${dept.name}" — skipping (you may want to handle this manually)`);
    } else {
      console.log(`✅ "${dept.name}" is already correct`);
    }
  }

  // Step 2: Ensure all canonical departments exist
  console.log('\n📋 Ensuring all canonical departments exist...');
  for (const name of CANONICAL_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✅ "${name}" exists`);
  }

  // Step 3: Final state
  console.log('\n📊 Final department state:');
  const finalDepts = await prisma.department.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: 'asc' },
  });
  for (const dept of finalDepts) {
    console.log(`  • "${dept.name}" — ${dept._count.users} user(s)`);
  }

  console.log('\n🎉 Department sync complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
