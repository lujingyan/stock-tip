'use server';

import { PrismaClient } from '@prisma/client';
import { fetchStockPrice, searchStocks, fetchStockDividends } from './stock-api';
import { calculateSellPrice, calculateNextBuyPrice } from './calculations';
import { revalidatePath } from 'next/cache';
import { hashPassword, verifyPassword, createSession, getSession, logout } from './auth';
import { redirect } from 'next/navigation';
import { DashboardData, DashboardStock } from '@/types';

import { prisma } from './db';

// --- Auth Actions ---

export async function register(username: string, password: string) {
    if (!username || !password) {
        return { error: 'Username and password are required' };
    }

    const existingUser = await prisma.user.findUnique({
        where: { username },
    });

    if (existingUser) {
        return { error: 'Username already exists' };
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
        },
    });

    return { success: true };
}

export async function login(username: string, password: string) {
    const user = await prisma.user.findUnique({
        where: { username },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
        return { error: 'Invalid username or password' };
    }

    await createSession(user.id);
    return { success: true };
}

export async function logoutAction() {
    await logout();
    redirect('/login');
}

// --- Settings ---

export async function getSettings() {
    const userId = await getSession();
    if (!userId) return null;

    const settings = await prisma.settings.findFirst({
        where: { userId },
    });

    if (!settings) {
        return await prisma.settings.create({
            data: {
                userId,
                annualRate: 15.0,
                buyStep: 3.5,
            },
        });
    }
    return settings;
}

export async function updateSettings(annualRate: number, buyStep: number) {
    const userId = await getSession();
    if (!userId) return { error: 'Unauthorized' };

    const settings = await getSettings();
    if (settings) {
        await prisma.settings.update({
            where: { id: settings.id },
            data: { annualRate, buyStep },
        });
        revalidatePath('/');
    }
}

// --- Stocks & Dashboard ---

export async function getDashboardData(): Promise<DashboardData | null> {
    const userId = await getSession();
    if (!userId) return null;

    const settings = await getSettings();
    if (!settings) return null; // Should not happen as getSettings creates default

    const stocks = await prisma.stock.findMany({
        where: { userId },
        include: {
            transactions: {
                orderBy: { date: 'desc' },
            },
        },
    });

    // Enrich stocks with live data and calculations
    const enrichedStocks: DashboardStock[] = await Promise.all(stocks.map(async (stock: any) => {
        const liveData = await fetchStockPrice(stock.symbol);

        const latestBuy = stock.transactions.find((t: any) => t.type === 'BUY' && t.status === 'OPEN');

        if (stock.name.includes('美的')) {
            console.log(`[DEBUG] Midea Group Transactions: ${stock.transactions.length}`);
            console.log(`[DEBUG] Latest Buy:`, latestBuy);
            stock.transactions.forEach((t: any) => console.log(`[DEBUG] Tx ${t.id}: ${t.type} ${t.status}`));
        }

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

            nextBuyPrice = calculateNextBuyPrice(targetSellPrice, effectiveBuyStep);
        }

        return {
            ...stock,
            livePrice: liveData?.currentPrice || 0,
            liveName: liveData?.name || stock.name,
            latestBuy: latestBuy as any,
            targetSellPrice,
            nextBuyPrice,
        };
    }));

    // --- Calculate Today's Activity ---
    const today = new Date();
    const todaysBuys: any[] = [];
    const todaysSells: any[] = [];

    // Helper to check if date is today (in local time, simplified)
    const isToday = (date: Date) => {
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    // 1. Collect all transactions for matching calculation
    // We need to process ALL transactions to correctly match sells to buys
    const allTransactions = stocks.flatMap((s: any) => s.transactions.map((t: any) => ({ ...t, stockName: s.name, livePrice: enrichedStocks.find(es => es.id === s.id)?.livePrice || 0 })));
    allTransactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openBuysMap: Record<number, any[]> = {}; // stockId -> list of open buys

    let buyIndex = 1;
    let sellIndex = 1;

    // Fee Constants (as per user request: Buy 1, Sell 1, Tax 4.5 on ~8200 amount -> ~0.00055 rate)
    const FIXED_COMMISSION = 1;
    const STAMP_DUTY_RATE = 0.00055;

    for (const tx of allTransactions) {
        if (!openBuysMap[tx.stockId]) openBuysMap[tx.stockId] = [];

        if (tx.type === 'BUY') {
            openBuysMap[tx.stockId].push({ ...tx, remainingQuantity: tx.quantity });

            // Check if this BUY happened today (and is effectively "open" in our simulation before any sells)
            // Note: We only display it in "Today's Sowing" if it's still OPEN in the DB? 
            // The user wants "Today's Sowing" to show what was bought today.
            // If it was bought today and sold today, should it be in Sowing? 
            // Usually "Sowing" implies current holding. 
            // But let's stick to the DB status for "Sowing" list as per previous implementation (tx.status === 'OPEN').
            // Wait, previous implementation checked `tx.status === 'OPEN'`. 
            // But here we are iterating. We can check the DB object's status if we want, 
            // OR we can just check if it was bought today. 
            // Let's stick to the previous logic for "Sowing": Show if bought today AND status is OPEN in DB.
            // But `tx` here is from `allTransactions` which comes from `stocks` which comes from DB.
            // So `tx.status` is the current DB status.
            if (isToday(tx.date) && tx.status === 'OPEN') {
                // Calculate returns
                const currentPrice = tx.livePrice;
                const absoluteReturn = tx.price > 0 ? (currentPrice - tx.price) / tx.price : 0;

                const daysHeld = Math.max(1, Math.floor((today.getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24)));
                const annualizedReturn = Math.pow(1 + absoluteReturn, 365 / daysHeld) - 1;

                const stock = stocks.find((s: any) => s.id === tx.stockId);
                const effectiveAnnualRate = stock?.annualRate ?? settings.annualRate;
                const targetSellPrice = calculateSellPrice(tx.price, new Date(tx.date), effectiveAnnualRate);

                todaysBuys.push({
                    index: buyIndex++,
                    stockName: tx.stockName,
                    currentPrice: currentPrice,
                    buyPrice: tx.price,
                    targetSellPrice: targetSellPrice,
                    buyDate: tx.date,
                    absoluteReturn: absoluteReturn,
                    annualizedReturn: annualizedReturn
                });
            }
        } else if (tx.type === 'SELL') {
            let quantityToSell = tx.quantity;
            const stock = stocks.find((s: any) => s.id === tx.stockId);
            const effectiveAnnualRate = stock?.annualRate ?? settings.annualRate;

            // Strategy: Match with BUYs having the LOWEST Target Price
            // 1. Calculate Target Price for all open buys for this stock
            const candidates = openBuysMap[tx.stockId].map(buy => ({
                ...buy,
                calculatedTarget: calculateSellPrice(buy.price, new Date(buy.date), effectiveAnnualRate)
            }));

            // 2. Sort by Target Price Ascending
            candidates.sort((a, b) => a.calculatedTarget - b.calculatedTarget);

            // 3. Match
            for (const matchBuy of candidates) {
                if (quantityToSell <= 0) break;
                if (matchBuy.remainingQuantity <= 0) continue;

                const quantityMatched = Math.min(quantityToSell, matchBuy.remainingQuantity);

                // If this SELL happened today, record it
                if (isToday(tx.date)) {
                    const buyPrice = matchBuy.price;
                    const rawSellPrice = tx.price;

                    // Fee Calculation
                    // Prorate fixed commission based on matched quantity vs original transaction quantity
                    const buyFee = FIXED_COMMISSION * (quantityMatched / matchBuy.quantity);
                    const sellFee = FIXED_COMMISSION * (quantityMatched / tx.quantity);
                    const tax = (rawSellPrice * quantityMatched) * STAMP_DUTY_RATE;

                    const totalFees = buyFee + sellFee + tax;

                    // Adjusted Sell Price = Sell Price - (Total Fees / Quantity)
                    // This ensures: (AdjustedSellPrice - BuyPrice) * Quantity = Net Profit
                    const adjustedSellPrice = rawSellPrice - (totalFees / quantityMatched);

                    const profit = (adjustedSellPrice - buyPrice) * quantityMatched;
                    const absoluteReturn = buyPrice > 0 ? (adjustedSellPrice - buyPrice) / buyPrice : 0;

                    const buyDate = new Date(matchBuy.date);
                    const sellDate = new Date(tx.date);
                    const daysHeld = Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

                    const annualizedReturn = daysHeld > 0 ? Math.pow(1 + absoluteReturn, 365 / daysHeld) - 1 : 0;

                    todaysSells.push({
                        index: sellIndex++,
                        stockName: tx.stockName,
                        buyPrice: buyPrice,
                        sellPrice: adjustedSellPrice, // Display adjusted price
                        currentPrice: tx.livePrice,
                        buyDate: buyDate,
                        sellDate: sellDate,
                        daysHeld: daysHeld,
                        absoluteReturn: absoluteReturn,
                        annualizedReturn: annualizedReturn,
                        quantity: quantityMatched,
                        profit: profit
                    });
                }

                quantityToSell -= quantityMatched;

                // Update the remaining quantity in the original map
                // We need to find the reference in openBuysMap
                const originalBuy = openBuysMap[tx.stockId].find(b => b.id === matchBuy.id);
                if (originalBuy) {
                    originalBuy.remainingQuantity -= quantityMatched;
                }
            }

            // Clean up fully closed buys from the map to keep it small? 
            // Or just filter them out next time? Filtering is safer.
            openBuysMap[tx.stockId] = openBuysMap[tx.stockId].filter(b => b.remainingQuantity > 0);
        }
    }

    return {
        settings,
        stocks: enrichedStocks,
        todaysActivity: {
            buys: todaysBuys,
            sells: todaysSells
        }
    };
}

export async function addStock(symbol: string, name: string) {
    const userId = await getSession();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        // Check if user already has this stock
        const existing = await prisma.stock.findFirst({
            where: { userId, symbol },
        });

        if (existing) {
            return { success: false, error: 'Stock already exists' };
        }

        await prisma.stock.create({
            data: { userId, symbol, name },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error adding stock:", error);
        return { success: false, error: "Failed to add stock" };
    }
}

export async function deleteStock(id: number) {
    const userId = await getSession();
    if (!userId) return;

    // Ensure user owns the stock
    const stock = await prisma.stock.findFirst({
        where: { id, userId },
    });

    if (stock) {
        await prisma.stock.delete({ where: { id } });
        revalidatePath('/');
    }
}

export async function updateStockSettings(id: number, annualRate: number | null, buyStep: number | null, maxInvestment: number | null) {
    const userId = await getSession();
    if (!userId) return { success: false, error: 'Unauthorized' };

    console.log(`[updateStockSettings] Updating stock ${id} for user ${userId}`);
    console.log(`[updateStockSettings] Params: annualRate=${annualRate}, buyStep=${buyStep}, maxInvestment=${maxInvestment}`);

    try {
        await prisma.stock.updateMany({
            where: { id, userId }, // updateMany allows filtering by non-unique fields (userId check)
            data: {
                annualRate: annualRate !== null ? annualRate : undefined,
                buyStep: buyStep !== null ? buyStep : undefined,
                maxInvestment: maxInvestment,
            },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error updating stock settings:", error);
        return { success: false, error: "Failed to update stock settings: " + (error instanceof Error ? error.message : String(error)) };
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
    const userId = await getSession();
    if (!userId) return;

    // Verify stock ownership
    const stock = await prisma.stock.findFirst({
        where: { id: data.stockId, userId },
        include: { transactions: true } // Need existing transactions to calculate targets
    });

    if (!stock) return;

    if (data.isVirtual) {
        // Virtual Trade: Sell existing position and Buy back immediately

        // 1. Perform the "Sell" part: Close existing OPEN buys
        const openBuys = stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN');

        // Calculate targets to sort by priority (same as real sell)
        const settings = await getSettings();
        const effectiveAnnualRate = stock.annualRate ?? settings?.annualRate ?? 15;

        const buysWithTargets = openBuys.map(tx => ({
            ...tx,
            targetPrice: calculateSellPrice(tx.price, new Date(tx.date), effectiveAnnualRate)
        }));

        buysWithTargets.sort((a, b) => a.targetPrice - b.targetPrice);

        let quantityToSell = data.quantity;

        for (const buyTx of buysWithTargets) {
            if (quantityToSell <= 0) break;

            if (buyTx.quantity <= quantityToSell) {
                // Fully close
                await prisma.transaction.update({
                    where: { id: buyTx.id },
                    data: { status: 'CLOSED' }
                });
                quantityToSell -= buyTx.quantity;
            } else {
                // Partially close
                const remainingQty = buyTx.quantity - quantityToSell;
                await prisma.transaction.update({
                    where: { id: buyTx.id },
                    data: { quantity: remainingQty }
                });

                // Create CLOSED split part
                await prisma.transaction.create({
                    data: {
                        stockId: stock.id,
                        type: 'BUY',
                        price: buyTx.price,
                        quantity: quantityToSell,
                        date: buyTx.date,
                        isVirtual: false, // Original buy wasn't virtual usually
                        status: 'CLOSED',
                    }
                });
                quantityToSell = 0;
            }
        }

        // 2. Record the Virtual SELL
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

        // 3. Record the Virtual BUY (New Position)
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
        // Real Transaction
        if (data.type === 'SELL') {
            // Logic to close/reduce OPEN BUYs
            // 1. Find all OPEN BUYs
            const openBuys = stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN');

            // 2. Calculate Target Price for each to sort by "Lowest Target Price" (First Out)
            const settings = await getSettings();
            const effectiveAnnualRate = stock.annualRate ?? settings?.annualRate ?? 15;

            const buysWithTargets = openBuys.map(tx => ({
                ...tx,
                targetPrice: calculateSellPrice(tx.price, new Date(tx.date), effectiveAnnualRate)
            }));

            // Sort by Target Price ASC
            buysWithTargets.sort((a, b) => a.targetPrice - b.targetPrice);

            let quantityToSell = data.quantity;

            for (const buyTx of buysWithTargets) {
                if (quantityToSell <= 0) break;

                if (buyTx.quantity <= quantityToSell) {
                    // Fully close this buy
                    await prisma.transaction.update({
                        where: { id: buyTx.id },
                        data: { status: 'CLOSED' }
                    });
                    quantityToSell -= buyTx.quantity;
                } else {
                    // Partially close: Split into (Open Remainder) and (Closed Sold Part)
                    // 1. Update existing to be the Open Remainder
                    const remainingQty = buyTx.quantity - quantityToSell;
                    await prisma.transaction.update({
                        where: { id: buyTx.id },
                        data: { quantity: remainingQty }
                    });

                    // 2. Create new CLOSED transaction for the sold part
                    // Must preserve original date/price to keep stats correct
                    await prisma.transaction.create({
                        data: {
                            stockId: stock.id,
                            type: 'BUY',
                            price: buyTx.price,
                            quantity: quantityToSell,
                            date: buyTx.date, // Original date
                            isVirtual: false,
                            status: 'CLOSED',
                        }
                    });

                    quantityToSell = 0;
                }
            }
        }

        // Record the SELL transaction itself
        await prisma.transaction.create({
            data: {
                stockId: data.stockId,
                type: data.type,
                price: data.price,
                quantity: data.quantity,
                date: data.date,
                isVirtual: false,
                status: data.type === 'BUY' ? 'OPEN' : 'CLOSED',
            },
        });
    }

    revalidatePath('/');
}

export async function deleteTransaction(id: number) {
    const userId = await getSession();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Verify ownership via Stock
    const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: { stock: true },
    });

    if (transaction && transaction.stock.userId === userId) {
        await prisma.transaction.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    }
    return { success: false, error: "Unauthorized" };
}

// --- Statistics ---

export async function getStatistics() {
    const userId = await getSession();
    if (!userId) return { monthlyStats: {}, yearlyStats: {} };

    const settings = await getSettings();

    const stocks = await prisma.stock.findMany({
        where: { userId },
        include: {
            transactions: {
                orderBy: { date: 'asc' },
            },
        },
    });

    const monthlyStats: Record<string, number> = {};
    const yearlyStats: Record<string, number> = {};

    // Fee Constants
    const FIXED_COMMISSION = 1;
    const STAMP_DUTY_RATE = 0.00055;

    for (const stock of stocks) {
        const txs = stock.transactions;
        const effectiveAnnualRate = stock.annualRate ?? settings?.annualRate ?? 15;

        // Track open buys for this stock
        // We need to track original quantities for fee prorating if needed, 
        // but for "Lowest Target Price" strategy, we match against available open buys at that point in time.
        // We simulate the history.
        let openBuys: { id: number; price: number; quantity: number; originalQuantity: number; date: Date; targetPrice: number }[] = [];

        for (const tx of txs) {
            if (tx.type === 'BUY') {
                openBuys.push({
                    id: tx.id,
                    price: tx.price,
                    quantity: tx.quantity,
                    originalQuantity: tx.quantity,
                    date: tx.date,
                    targetPrice: calculateSellPrice(tx.price, new Date(tx.date), effectiveAnnualRate)
                });
            } else if (tx.type === 'SELL') {
                let quantityToSell = tx.quantity;
                let realizedProfit = 0;

                // Strategy: Match with BUYs having the LOWEST Target Price
                // Sort open buys by Target Price ASC
                openBuys.sort((a, b) => a.targetPrice - b.targetPrice);

                // Match
                // We need to iterate through a copy or handle index carefully because we might remove items
                // Actually, we can just iterate and remove/update as we go.
                // Since we sorted, we just take from the start.

                while (quantityToSell > 0 && openBuys.length > 0) {
                    const matchBuy = openBuys[0]; // Lowest target price
                    const quantityMatched = Math.min(quantityToSell, matchBuy.quantity);

                    const buyCost = matchBuy.price * quantityMatched;
                    const sellProceeds = tx.price * quantityMatched;

                    // Fees
                    const buyFee = FIXED_COMMISSION * (quantityMatched / matchBuy.originalQuantity);
                    const sellFee = FIXED_COMMISSION * (quantityMatched / tx.quantity);
                    const tax = sellProceeds * STAMP_DUTY_RATE;

                    const totalFees = buyFee + sellFee + tax;
                    const netProceeds = sellProceeds - totalFees;

                    realizedProfit += (netProceeds - buyCost);

                    quantityToSell -= quantityMatched;
                    matchBuy.quantity -= quantityMatched;

                    if (matchBuy.quantity === 0) {
                        openBuys.shift(); // Remove fully closed buy
                    }
                }

                const date = new Date(tx.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const yearKey = `${date.getFullYear()}`;

                monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + realizedProfit;
                yearlyStats[yearKey] = (yearlyStats[yearKey] || 0) + realizedProfit;
            }
        }
    }

    const sortedMonthly = Object.fromEntries(
        Object.entries(monthlyStats).sort((a, b) => b[0].localeCompare(a[0]))
    );
    const sortedYearly = Object.fromEntries(
        Object.entries(yearlyStats).sort((a, b) => b[0].localeCompare(a[0]))
    );

    return { monthlyStats: sortedMonthly, yearlyStats: sortedYearly };
}

export async function searchStocksAction(query: string) {
    const userId = await getSession();
    if (!userId) return [];
    return await searchStocks(query);
}

export async function getLatestDividend(symbol: string) {
    const result = await fetchStockDividends(symbol);
    if (result) {
        return { success: true, dividend: result.dividend, date: result.date };
    }
    return { success: false, error: "No dividend found" };
}

export async function checkAllDividends() {
    const userId = await getSession();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        const stocks = await prisma.stock.findMany({
            where: { userId },
            include: {
                transactions: {
                    where: { type: 'BUY', status: 'OPEN' },
                    orderBy: { date: 'asc' }, // Process from oldest to newest
                },
            },
        });

        let updatedCount = 0;

        for (const stock of stocks) {
            if (stock.transactions.length === 0) continue;

            const dividendInfo = await fetchStockDividends(stock.symbol);

            if (dividendInfo && dividendInfo.date) {
                const exDate = new Date(dividendInfo.date);
                const lastApplied = stock.lastDividendDate ? new Date(stock.lastDividendDate) : new Date(0);

                // Check if this is a new dividend we haven't processed yet
                if (exDate > lastApplied) {
                    const updates = [];

                    for (const tx of stock.transactions) {
                        // If the transaction date is BEFORE the ex-dividend date, it qualifies
                        if (tx.date < exDate) {
                            const newPrice = Math.max(0, tx.price - dividendInfo.dividend);
                            updates.push(
                                prisma.transaction.update({
                                    where: { id: tx.id },
                                    data: { price: newPrice },
                                })
                            );
                        }
                    }

                    if (updates.length > 0) {
                        await prisma.$transaction([
                            ...updates,
                            prisma.stock.update({
                                where: { id: stock.id },
                                data: { lastDividendDate: exDate },
                            }),
                        ]);
                        updatedCount += updates.length;
                    } else {
                        // Even if no transactions were updated (e.g. all bought after ex-date),
                        // we should update the stock's lastDividendDate so we don't check this dividend again?
                        // Yes, otherwise we keep checking.
                        await prisma.stock.update({
                            where: { id: stock.id },
                            data: { lastDividendDate: exDate },
                        });
                    }
                }
            }
        }
        if (updatedCount > 0) {
            revalidatePath('/');
        }

        return { success: true, updatedCount };
    } catch (error) {
        console.error("Error checking dividends:", error);
        return { success: false, error: "Failed to check dividends" };
    }
}

// --- Data Persistence ---

export async function exportUserData() {
    const userId = await getSession();
    if (!userId) return null;

    const settings = await prisma.settings.findFirst({ where: { userId } });
    const stocks = await prisma.stock.findMany({
        where: { userId },
        include: {
            transactions: true,
        },
    });

    return {
        settings,
        stocks,
    };
}

export async function importUserData(data: any) {
    const userId = await getSession();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!data || !data.stocks) {
        return { success: false, error: 'Invalid data format' };
    }

    try {
        // 1. Import Settings
        if (data.settings) {
            const existingSettings = await prisma.settings.findFirst({ where: { userId } });
            if (existingSettings) {
                await prisma.settings.update({
                    where: { id: existingSettings.id },
                    data: {
                        annualRate: data.settings.annualRate,
                        buyStep: data.settings.buyStep,
                    },
                });
            } else {
                await prisma.settings.create({
                    data: {
                        userId,
                        annualRate: data.settings.annualRate,
                        buyStep: data.settings.buyStep,
                    },
                });
            }
        }

        // 2. Import Stocks and Transactions
        for (const stockData of data.stocks) {
            // Check if stock exists
            let stock = await prisma.stock.findFirst({
                where: { userId, symbol: stockData.symbol },
            });

            if (!stock) {
                stock = await prisma.stock.create({
                    data: {
                        userId,
                        symbol: stockData.symbol,
                        name: stockData.name,
                        annualRate: stockData.annualRate,
                        buyStep: stockData.buyStep,
                        lastDividendDate: stockData.lastDividendDate ? new Date(stockData.lastDividendDate) : null,
                    },
                });
            }

            // Import Transactions
            if (stockData.transactions) {
                for (const txData of stockData.transactions) {
                    const existingTx = await prisma.transaction.findFirst({
                        where: {
                            stockId: stock.id,
                            type: txData.type,
                            date: new Date(txData.date),
                            price: txData.price,
                            quantity: txData.quantity,
                        },
                    });

                    if (!existingTx) {
                        await prisma.transaction.create({
                            data: {
                                stockId: stock.id,
                                type: txData.type,
                                price: txData.price,
                                quantity: txData.quantity,
                                date: new Date(txData.date),
                                isVirtual: txData.isVirtual,
                                status: txData.status,
                            },
                        });
                    }
                }
            }
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error importing data:", error);
        return { success: false, error: "Failed to import data" };
    }
}
