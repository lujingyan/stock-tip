import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const backupPath = path.join(process.cwd(), 'backup.json');

    if (!fs.existsSync(backupPath)) {
        console.error(`Backup file not found at ${backupPath}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log('Starting restore...');

    // Use a transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
        // 1. Clean existing data (reverse order of dependencies)
        console.log('Cleaning existing data...');
        await tx.transaction.deleteMany();
        await tx.stock.deleteMany();
        await tx.settings.deleteMany();
        await tx.user.deleteMany();

        // 2. Restore Users
        console.log(`Restoring ${data.users.length} users...`);
        for (const user of data.users) {
            await tx.user.create({
                data: user,
            });
        }

        // 3. Restore Settings
        console.log(`Restoring ${data.settings.length} settings...`);
        for (const setting of data.settings) {
            await tx.settings.create({
                data: setting,
            });
        }

        // 4. Restore Stocks
        console.log(`Restoring ${data.stocks.length} stocks...`);
        for (const stock of data.stocks) {
            await tx.stock.create({
                data: stock,
            });
        }

        // 5. Restore Transactions
        console.log(`Restoring ${data.transactions.length} transactions...`);
        for (const transaction of data.transactions) {
            await tx.transaction.create({
                data: transaction,
            });
        }
    });

    console.log('Restore completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
