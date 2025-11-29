import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data import...');

    const backupPath = path.join(process.cwd(), 'backup_data.json');
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found at:', backupPath);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const { users, settings, stocks, transactions } = data;

    console.log('Cleaning existing data...');
    // Delete in reverse order of dependencies
    await prisma.transaction.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.settings.deleteMany();
    await prisma.user.deleteMany();

    console.log('Importing Users...');
    for (const user of users) {
        await prisma.user.create({ data: user });
    }

    console.log('Importing Settings...');
    for (const setting of settings) {
        await prisma.settings.create({ data: setting });
    }

    console.log('Importing Stocks...');
    for (const stock of stocks) {
        await prisma.stock.create({ data: stock });
    }

    console.log('Importing Transactions...');
    for (const tx of transactions) {
        await prisma.transaction.create({ data: tx });
    }

    console.log('Import completed successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
