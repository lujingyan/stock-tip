import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Midea Group data fix...');

    // 1. Find the stock
    const stock = await prisma.stock.findFirst({
        where: {
            OR: [
                { name: '美的集团' },
                { symbol: 'sz000333' }
            ]
        },
        include: {
            transactions: true
        }
    });

    if (!stock) {
        console.log('Stock "美的集团" not found.');
        return;
    }

    console.log(`Found stock: ${stock.name} (${stock.symbol})`);

    // 2. Find OPEN BUY transactions
    const openBuys = await prisma.transaction.findMany({
        where: {
            stockId: stock.id,
            type: 'BUY',
            status: 'OPEN'
        }
    });

    console.log(`Found ${openBuys.length} OPEN BUY transactions.`);

    if (openBuys.length === 0) {
        console.log('No open positions to fix.');
        return;
    }

    // 3. Close them
    for (const tx of openBuys) {
        console.log(`Closing transaction ID ${tx.id}: Bought ${tx.quantity} shares at ${tx.price} on ${tx.date}`);
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { status: 'CLOSED' }
        });
    }

    console.log('All open positions have been closed. Share count should now be 0.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
