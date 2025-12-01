import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fixing Focus Media transactions...');

        // Re-open ID 38
        await prisma.transaction.update({
            where: { id: 38 },
            data: { status: 'OPEN' }
        });
        console.log('✅ Re-opened transaction 38');

        // Re-open ID 34
        await prisma.transaction.update({
            where: { id: 34 },
            data: { status: 'OPEN' }
        });
        console.log('✅ Re-opened transaction 34');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
