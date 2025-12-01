import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const stock = await prisma.stock.findFirst({
            where: { name: { contains: "分众" } },
            include: { transactions: true }
        });

        if (!stock) {
            console.log("Stock not found");
            return;
        }

        console.log(`Stock: ${stock.name} (ID: ${stock.id})`);

        const closedBuys = stock.transactions.filter(t => t.type === "BUY" && t.status === "CLOSED");
        console.log(`Found ${closedBuys.length} CLOSED BUY transactions:`);
        closedBuys.forEach(t => {
            console.log(`- ID: ${t.id}, Date: ${t.date.toISOString()}, Price: ${t.price}, Qty: ${t.quantity}, UpdatedAt: ${t.updatedAt.toISOString()}`);
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
