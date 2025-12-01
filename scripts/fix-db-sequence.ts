import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fixing database sequences...');

        // Fix Transaction sequence
        try {
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Transaction"', 'id'), coalesce(max(id)+1, 1), false) FROM "Transaction";`);
            console.log('✅ Fixed Transaction sequence');
        } catch (e) {
            console.log('⚠️  Could not fix Transaction sequence (might be using different casing):', e);
        }

        // Fix Stock sequence
        try {
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Stock"', 'id'), coalesce(max(id)+1, 1), false) FROM "Stock";`);
            console.log('✅ Fixed Stock sequence');
        } catch (e) {
            console.log('⚠️  Could not fix Stock sequence:', e);
        }

        // Fix Settings sequence
        try {
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Settings"', 'id'), coalesce(max(id)+1, 1), false) FROM "Settings";`);
            console.log('✅ Fixed Settings sequence');
        } catch (e) {
            console.log('⚠️  Could not fix Settings sequence:', e);
        }

        // Fix User sequence
        try {
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`);
            console.log('✅ Fixed User sequence');
        } catch (e) {
            console.log('⚠️  Could not fix User sequence:', e);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
