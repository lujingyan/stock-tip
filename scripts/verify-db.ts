import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Verification ---');

    // 1. Check Connection
    try {
        const userCount = await prisma.user.count();
        console.log(`Connected! Found ${userCount} users.`);
    } catch (e) {
        console.error('Failed to connect to DB:', e);
        return;
    }

    // 2. Check Midea Group
    const stocks = await prisma.stock.findMany({
        where: {
            OR: [
                { name: { contains: '美的' } },
                { symbol: { contains: '000333' } }
            ]
        },
        include: { transactions: true }
    });

    console.log(`Found ${stocks.length} stocks matching "美的" or "000333":`);

    for (const stock of stocks) {
        console.log(`Stock ID: ${stock.id}, Name: ${stock.name}, Symbol: ${stock.symbol}`);
        const openBuys = stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN');
        console.log(`- Total Transactions: ${stock.transactions.length}`);
        console.log(`- OPEN BUY Transactions: ${openBuys.length}`);

        for (const tx of openBuys) {
            console.log(`  -> OPEN BUY ID: ${tx.id}, Qty: ${tx.quantity}, Date: ${tx.date}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
