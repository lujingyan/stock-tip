import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data export...');

    const users = await prisma.user.findMany();
    const settings = await prisma.settings.findMany();
    const stocks = await prisma.stock.findMany();
    const transactions = await prisma.transaction.findMany();

    const data = {
        users,
        settings,
        stocks,
        transactions
    };

    const outputPath = path.join(process.cwd(), 'backup_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`Data exported successfully to ${outputPath}`);
    console.log(`Stats:`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Settings: ${settings.length}`);
    console.log(`- Stocks: ${stocks.length}`);
    console.log(`- Transactions: ${transactions.length}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
