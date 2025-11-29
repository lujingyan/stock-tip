import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Inspecting Midea Group transactions...');

    const stock = await prisma.stock.findFirst({
        where: {
            OR: [
                { name: '美的集团' },
                { symbol: 'sz000333' }
            ]
        },
        include: {
            transactions: {
                orderBy: { date: 'asc' }
            }
        }
    });

    if (!stock) {
        console.log('Stock not found.');
        return;
    }

    console.log(`Stock: ${stock.name} (${stock.symbol})`);
    console.log('--- Transactions ---');

    let totalShares = 0;

    for (const tx of stock.transactions) {
        console.log(`[${tx.id}] ${tx.date.toISOString().split('T')[0]} | ${tx.type} | ${tx.status} | Price: ${tx.price} | Qty: ${tx.quantity} | Virtual: ${tx.isVirtual}`);

        if (tx.type === 'BUY' && tx.status === 'OPEN') {
            totalShares += tx.quantity;
        }
    }

    console.log('--------------------');
    console.log(`Calculated Total Open Shares: ${totalShares}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
