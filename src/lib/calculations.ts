import { differenceInCalendarDays } from 'date-fns';

/**
 * Calculates the daily interest rate from the annual rate.
 * @param annualRate Percentage (e.g., 15 for 15%)
 * @returns Daily rate as a decimal (e.g., 0.00041...)
 */
export function calculateDailyRate(annualRate: number): number {
  return (annualRate / 100) / 365;
}

/**
 * Calculates the target sell price for a given trade.
 * @param buyPrice The price at which the stock was bought.
 * @param buyDate The date of purchase.
 * @param annualRate The annual interest rate (percentage).
 * @param currentDate The date to calculate for (defaults to today).
 * @returns The target sell price.
 */
export function calculateSellPrice(
  buyPrice: number,
  buyDate: Date,
  annualRate: number,
  currentDate: Date = new Date()
): number {
  const daysHeld = Math.max(30, differenceInCalendarDays(currentDate, buyDate));
  const dailyRate = calculateDailyRate(annualRate);
  
  // Formula: BuyPrice * (1 + DailyRate * DaysHeld)
  // Note: The user example says "0.041% * 30", which implies simple interest on the principal?
  // "卖出价格按0.041%✖️30计算" -> This implies the *increase* is 0.041% * 30.
  // So Price = BuyPrice * (1 + (DailyRate * DaysHeld))
  
  const increaseFactor = dailyRate * daysHeld;
  return buyPrice * (1 + increaseFactor);
}

/**
 * Calculates the next buy price based on the target sell price.
 * @param targetSellPrice The calculated target sell price.
 * @param buyStep The buy step percentage (e.g., 3.5 for 3.5%).
 * @returns The next buy price.
 */
export function calculateNextBuyPrice(targetSellPrice: number, buyStep: number): number {
  // "下笔买入价为下笔卖出价下跌3.5%"
  // NextBuy = TargetSell * (1 - BuyStep%)
  return targetSellPrice * (1 - (buyStep / 100));
}

/**
 * Simulates a virtual trade to reset the cost basis.
 * @param currentPrice The price at which the virtual trade happens.
 * @param quantity The number of shares.
 * @returns The new transaction details.
 */
export function simulateVirtualTrade(currentPrice: number, quantity: number) {
  return {
    buyPrice: currentPrice,
    buyDate: new Date(), // Resets the clock
    quantity,
    isVirtual: true,
  };
}
