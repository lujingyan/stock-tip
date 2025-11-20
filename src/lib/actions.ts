'use server';

import { PrismaClient } from '@prisma/client';
import { fetchStockPrice, searchStocks } from './stock-api';
import { calculateSellPrice, calculateNextBuyPrice } from './calculations';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

// --- Settings ---

export async function getSettings() {
    const settings = await prisma.settings.findFirst();
    if (!settings) {
        return await prisma.settings.create({
            data: {
                annualRate: 15.0,
                buyStep: 3.5,
            },
        });
    }
    return settings;
}

export async function updateSettings(annualRate: number, buyStep: number) {
    const settings = await getSettings();
    await prisma.settings.update({
        where: { id: settings.id },
        data: { annualRate, buyStep },
    });
    revalidatePath('/');
}

// --- Stocks & Dashboard ---

import { DashboardData, DashboardStock } from '@/types';

export async function getDashboardData(): Promise<DashboardData> {
    const settings = await getSettings();
    const stocks = await prisma.stock.findMany({
        include: {
            transactions: {
                orderBy: { date: 'desc' },
            },
        },
    });

    // Enrich stocks with live data and calculations
    const enrichedStocks: DashboardStock[] = await Promise.all(stocks.map(async (stock: any) => {
        const liveData = await fetchStockPrice(stock.symbol);

        // Find the latest active buy transaction (if any)
        // We cast to any temporarily because Prisma types vs our types might have slight mismatch on Date
        // But actually Prisma returns Date objects, so it should be fine if we match the interface.
        const latestBuy = stock.transactions.find((t: any) => t.type === 'BUY' && t.status === 'OPEN');

        let targetSellPrice = null;
        let nextBuyPrice = null;

        if (latestBuy) {
            const effectiveAnnualRate = stock.annualRate ?? settings.annualRate;
            const effectiveBuyStep = stock.buyStep ?? settings.buyStep;

            targetSellPrice = calculateSellPrice(
                latestBuy.price,
                latestBuy.date,
                effectiveAnnualRate
            );

            // If we have a target sell price, we can calculate the next buy price (after selling)
            // But usually "next buy price" is relevant after we sell.
            // Or maybe the user wants to know "If I sell now at Target, what's my next buy?"
            // The user said: "下笔买入价为下笔卖出价下跌3.5%"
            // So if we sell at TargetSellPrice, the NextBuyPrice is TargetSellPrice * (1 - step)
            nextBuyPrice = calculateNextBuyPrice(targetSellPrice, effectiveBuyStep);
        } else {
            // If no active holding, maybe show next buy based on last sell?
            // For now, leave null.
        }

        return {
            ...stock,
            livePrice: liveData?.currentPrice || 0,
            liveName: liveData?.name || stock.name,
            latestBuy: latestBuy as any, // Cast to avoid strict type issues with Prisma includes for now
            targetSellPrice,
            nextBuyPrice,
        };
    }));

    return {
        settings,
        stocks: enrichedStocks,
    };
}

export async function addStock(symbol: string, name: string) {
    try {
        await prisma.stock.create({
            data: { symbol, name },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error adding stock:", error);
        return { success: false, error: "Failed to add stock" };
    }
}

export async function deleteStock(id: number) {
    await prisma.stock.delete({ where: { id } });
    revalidatePath('/');
}

export async function updateStockSettings(id: number, annualRate: number | null, buyStep: number | null) {
    try {
        await prisma.stock.update({
            where: { id },
            data: {
                annualRate: annualRate,
                buyStep: buyStep,
            },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error updating stock settings:", error);
        return { success: false, error: "Failed to update stock settings" };
    }
}

// --- Transactions ---

export async function addTransaction(data: {
    stockId: number;
    type: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    date: Date;
    isVirtual?: boolean;
}) {
    // If it's a SELL, we should probably close the corresponding BUY?
    // For simplicity, we just log it for now. 
    // In a real app, we'd match FIFO or specific ID.

    if (data.type === 'SELL') {
        // Find open buys to close?
        // This logic can be complex. For now, just record the transaction.
        // User might want to manually link or just track P&L globally.
        // Let's just record it.
    }

    if (data.isVirtual) {
        // Virtual trade: Sell then Buy at the same price
        // 1. Create SELL
        await prisma.transaction.create({
            data: {
                stockId: data.stockId,
                type: 'SELL',
                price: data.price,
                quantity: data.quantity,
                date: data.date,
                isVirtual: true,
                status: 'CLOSED',
            },
        });

        // 2. Create BUY
        await prisma.transaction.create({
            data: {
                stockId: data.stockId,
                type: 'BUY',
                price: data.price,
                quantity: data.quantity,
                date: data.date,
                isVirtual: true,
                status: 'OPEN',
            },
        });
    } else {
        // Normal trade
        await prisma.transaction.create({
            data: {
                stockId: data.stockId,
                type: data.type,
                price: data.price,
                quantity: data.quantity,
                date: data.date,
                isVirtual: false,
                status: data.type === 'BUY' ? 'OPEN' : 'CLOSED', // Buys start open, Sells are closed
            },
        });
    }

    // If it's a SELL, we might want to mark the oldest OPEN BUY as CLOSED?
    // Let's leave that manual or implicit for now to keep it simple.

    revalidatePath('/');
}

// --- Search Proxy ---
export async function deleteTransaction(id: number) {
    try {
        await prisma.transaction.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return { success: false, error: "Failed to delete transaction" };
    }
}

// --- Statistics ---

export async function getStatistics() {
    const allTxs = await prisma.transaction.findMany({
        orderBy: { date: 'asc' }, // Important: FIFO needs chronological order
    });

    const monthlyStats: Record<string, number> = {};
    const yearlyStats: Record<string, number> = {};

    // Group transactions by stock
    const txsByStock: Record<number, typeof allTxs> = {};
    for (const tx of allTxs) {
        if (!txsByStock[tx.stockId]) {
            txsByStock[tx.stockId] = [];
        }
        txsByStock[tx.stockId].push(tx);
    }

    // Calculate realized profit for each stock
    for (const stockId in txsByStock) {
        const txs = txsByStock[stockId];
        // Queue of open buy lots: { price, quantity, date }
        const buyQueue: { price: number; quantity: number; date: Date }[] = [];

        for (const tx of txs) {
            if (tx.type === 'BUY') {
                buyQueue.push({
                    price: tx.price,
                    quantity: tx.quantity,
                    date: tx.date,
                });
            } else if (tx.type === 'SELL') {
                let quantityToSell = tx.quantity;
                let realizedProfit = 0;

                while (quantityToSell > 0 && buyQueue.length > 0) {
                    const matchBuy = buyQueue[0]; // FIFO: Take the first (oldest) buy

                    const quantityMatched = Math.min(quantityToSell, matchBuy.quantity);

                    // Profit = (SellPrice - BuyPrice) * MatchedQuantity
                    realizedProfit += (tx.price - matchBuy.price) * quantityMatched;

                    // Update quantities
                    quantityToSell -= quantityMatched;
                    matchBuy.quantity -= quantityMatched;

                    // If this buy lot is exhausted, remove it
                    if (matchBuy.quantity === 0) {
                        buyQueue.shift();
                    }
                }

                // If we sold more than we had (short selling?), we ignore the excess for profit calc
                // or treat cost basis as 0? For this app, let's assume valid trades.

                // Add to stats based on SELL date
                const date = new Date(tx.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const yearKey = `${date.getFullYear()}`;

                monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + realizedProfit;
                yearlyStats[yearKey] = (yearlyStats[yearKey] || 0) + realizedProfit;
            }
        }
    }

    // Sort keys for display
    const sortedMonthly = Object.fromEntries(
        Object.entries(monthlyStats).sort((a, b) => b[0].localeCompare(a[0]))
    );
    const sortedYearly = Object.fromEntries(
        Object.entries(yearlyStats).sort((a, b) => b[0].localeCompare(a[0]))
    );

    return { monthlyStats: sortedMonthly, yearlyStats: sortedYearly };
}

export async function searchStocksAction(query: string) {
    return await searchStocks(query);
}
