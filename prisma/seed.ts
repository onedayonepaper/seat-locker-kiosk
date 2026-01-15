import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Create the adapter with the database URL
// Path is relative to project root since that's where npm scripts run from
const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.eventLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.locker.deleteMany();
  await prisma.product.deleteMany();
  await prisma.appConfig.deleteMany();

  console.log('  Cleared existing data');

  // Create Products (time packages)
  const products = await Promise.all([
    prisma.product.create({
      data: {
        id: 'product-1h',
        name: '1시간',
        durationMin: 60,
        price: 2000,
        isDefault: true,
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.product.create({
      data: {
        id: 'product-2h',
        name: '2시간',
        durationMin: 120,
        price: 3500,
        isDefault: false,
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.product.create({
      data: {
        id: 'product-3h',
        name: '3시간',
        durationMin: 180,
        price: 5000,
        isDefault: false,
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.product.create({
      data: {
        id: 'product-daily',
        name: '1일권',
        durationMin: 1440, // 24 hours
        price: 12000,
        isDefault: false,
        isActive: true,
        sortOrder: 4,
      },
    }),
  ]);

  console.log(`  Created ${products.length} products`);

  // Create Seats (4x4 grid: A1-D4)
  const rows = ['A', 'B', 'C', 'D'];
  const cols = [1, 2, 3, 4];
  const seats = [];

  for (const row of rows) {
    for (const col of cols) {
      const id = `${row}${col}`;
      seats.push(
        prisma.seat.create({
          data: {
            id,
            name: `좌석 ${id}`,
            row,
            col,
            status: 'AVAILABLE',
          },
        })
      );
    }
  }

  await Promise.all(seats);
  console.log(`  Created ${seats.length} seats (${rows.length}x${cols.length} grid)`);

  // Create Lockers (001-020)
  const lockers = [];
  for (let i = 1; i <= 20; i++) {
    const id = String(i).padStart(3, '0');
    lockers.push(
      prisma.locker.create({
        data: {
          id,
          name: `락커 ${i}번`,
          status: 'AVAILABLE',
        },
      })
    );
  }

  await Promise.all(lockers);
  console.log(`  Created ${lockers.length} lockers`);

  // App settings defaults
  await prisma.appConfig.createMany({
    data: [
      { key: 'qrFormat', value: 'LEGACY' },
      { key: 'expirationHandling', value: 'MANUAL' },
      { key: 'checkoutConfirmRequired', value: 'true' },
      { key: 'scanMode', value: 'AUTO' },
      { key: 'logRetentionDays', value: '90' },
    ],
  });
  console.log('  Created default app settings');

  console.log('✅ Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
