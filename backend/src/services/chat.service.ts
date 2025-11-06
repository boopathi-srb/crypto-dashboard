import { eq, and, gte, desc } from "drizzle-orm";
import { coins, historicalPrices } from "../db/schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema";
import { searchCoin } from "./coingecko.service";
import { getCached, setCached, getCacheKey, CACHE_TTL } from "./cache";

type DbType = NodePgDatabase<typeof schema>;

/**
 * Rule-based chat parser that handles natural language queries
 */
export async function parseQuery(
  query: string,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  const lowerQuery = query.toLowerCase().trim();

  // Rule 1: Price queries - "What is the price of Bitcoin?" or "price of ethereum"
  const priceMatch = lowerQuery.match(
    /(?:what is the )?price of (.+?)(?:\?|$)/i
  );
  if (priceMatch) {
    const coinName = priceMatch[1].trim();
    return await handlePriceQuery(coinName, db);
  }

  // Rule 2: Trend/History queries - "Show me the 7-day trend of Ethereum" or "trend of bitcoin"
  const trendMatch = lowerQuery.match(
    /(?:show me the )?(\d+)?-?day (?:trend|history) of (.+?)(?:\?|$)/i
  );
  if (trendMatch) {
    const days = trendMatch[1] ? parseInt(trendMatch[1], 10) : 30;
    const coinName = trendMatch[2].trim();
    return await handleTrendQuery(coinName, days, db);
  }

  // Rule 3: Volume queries - "What is the volume of Bitcoin?"
  const volumeMatch = lowerQuery.match(
    /(?:what is the )?volume of (.+?)(?:\?|$)/i
  );
  if (volumeMatch) {
    const coinName = volumeMatch[1].trim();
    return await handleVolumeQuery(coinName, db);
  }

  // Rule 4: Percentage change queries - "What is the 24h change of Bitcoin?"
  const changeMatch = lowerQuery.match(
    /(?:what is the )?(?:24h |24 hour )?change of (.+?)(?:\?|$)/i
  );
  if (changeMatch) {
    const coinName = changeMatch[1].trim();
    return await handleChangeQuery(coinName, db);
  }

  // Rule 5: Market cap queries - "What is the market cap of Bitcoin?"
  const marketCapMatch = lowerQuery.match(
    /(?:what is the )?market cap(?:italization)? of (.+?)(?:\?|$)/i
  );
  if (marketCapMatch) {
    const coinName = marketCapMatch[1].trim();
    return await handleMarketCapQuery(coinName, db);
  }

  // Rule 6: Top coins query - "Show me top 5 coins" or "top coins"
  const topCoinsMatch = lowerQuery.match(/show me top (\d+) coins?/i);
  if (topCoinsMatch) {
    const limit = parseInt(topCoinsMatch[1], 10);
    return await handleTopCoinsQuery(limit, db);
  }

  // Default: Can't understand the query
  return {
    answer:
      "Sorry, I can't answer that. Try asking:\n" +
      "- 'What is the price of Bitcoin?'\n" +
      "- 'Show me the 7-day trend of Ethereum'\n" +
      "- 'What is the volume of Bitcoin?'\n" +
      "- 'Show me top 5 coins'",
  };
}

async function handlePriceQuery(
  coinName: string,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  try {
    // Try to find in database first
    const coin = await db
      .select()
      .from(coins)
      .where(eq(coins.coingeckoId, coinName.toLowerCase()))
      .limit(1);

    if (coin.length > 0) {
      const price = parseFloat(coin[0].currentPrice || "0");
      return {
        answer: `The current price of ${
          coin[0].name
        } (${coin[0].symbol.toUpperCase()}) is $${price.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`,
      };
    }

    // If not in DB, try to search CoinGecko
    const marketData = await searchCoin(coinName);
    if (marketData) {
      return {
        answer: `The current price of ${
          marketData.name
        } (${marketData.symbol.toUpperCase()}) is $${marketData.current_price.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`,
      };
    }

    return {
      answer: `Sorry, I couldn't find information about ${coinName}. Please check the spelling and try again.`,
    };
  } catch (error) {
    console.error("Error handling price query:", error);
    return {
      answer:
        "Sorry, I encountered an error while fetching the price. Please try again later.",
    };
  }
}

async function handleTrendQuery(
  coinName: string,
  days: number,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  try {
    // Find coin in database
    const coin = await db
      .select()
      .from(coins)
      .where(eq(coins.coingeckoId, coinName.toLowerCase()))
      .limit(1);

    if (coin.length === 0) {
      // Try searching CoinGecko
      const marketData = await searchCoin(coinName);
      if (!marketData) {
        return {
          answer: `Sorry, I couldn't find information about ${coinName}. Please check the spelling and try again.`,
        };
      }
      // Return a message that we found the coin but don't have historical data
      return {
        answer: `I found ${marketData.name}, but I don't have ${days}-day historical data for it. Please select it from the dashboard to view the chart.`,
      };
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch historical data
    const history = await db
      .select()
      .from(historicalPrices)
      .where(
        and(
          eq(historicalPrices.coinId, coin[0].coingeckoId),
          gte(historicalPrices.timestamp, startDate)
        )
      )
      .orderBy(desc(historicalPrices.timestamp))
      .limit(100);

    if (history.length === 0) {
      return {
        answer: `I found ${coin[0].name}, but I don't have ${days}-day historical data for it yet. The data may still be loading.`,
      };
    }

    const prices = history.map((h) => parseFloat(h.price || "0"));
    const currentPrice = prices[0];
    const pastPrice = prices[prices.length - 1];
    const change = ((currentPrice - pastPrice) / pastPrice) * 100;

    return {
      answer: `Here's the ${days}-day trend for ${
        coin[0].name
      }: The price changed from $${pastPrice.toFixed(
        2
      )} to $${currentPrice.toFixed(2)}, a ${
        change >= 0 ? "+" : ""
      }${change.toFixed(2)}% change.`,
      data: {
        coinId: coin[0].coingeckoId,
        coinName: coin[0].name,
        days,
        history: history.map((h) => ({
          timestamp: h.timestamp,
          price: parseFloat(h.price || "0"),
        })),
      },
    };
  } catch (error) {
    console.error("Error handling trend query:", error);
    return {
      answer:
        "Sorry, I encountered an error while fetching the trend. Please try again later.",
    };
  }
}

async function handleVolumeQuery(
  coinName: string,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  try {
    const coin = await db
      .select()
      .from(coins)
      .where(eq(coins.coingeckoId, coinName.toLowerCase()))
      .limit(1);

    if (coin.length > 0) {
      const volume = parseFloat(coin[0].volume24h || "0");
      return {
        answer: `The 24-hour trading volume of ${
          coin[0].name
        } (${coin[0].symbol.toUpperCase()}) is $${volume.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`,
      };
    }

    const marketData = await searchCoin(coinName);
    if (marketData) {
      return {
        answer: `The 24-hour trading volume of ${
          marketData.name
        } (${marketData.symbol.toUpperCase()}) is $${marketData.total_volume.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`,
      };
    }

    return {
      answer: `Sorry, I couldn't find information about ${coinName}. Please check the spelling and try again.`,
    };
  } catch (error) {
    console.error("Error handling volume query:", error);
    return {
      answer:
        "Sorry, I encountered an error while fetching the volume. Please try again later.",
    };
  }
}

async function handleChangeQuery(
  coinName: string,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  try {
    const coin = await db
      .select()
      .from(coins)
      .where(eq(coins.coingeckoId, coinName.toLowerCase()))
      .limit(1);

    if (coin.length > 0) {
      const change = parseFloat(coin[0].priceChange24h || "0");
      const sign = change >= 0 ? "+" : "";
      return {
        answer: `The 24-hour price change of ${
          coin[0].name
        } (${coin[0].symbol.toUpperCase()}) is ${sign}${change.toFixed(2)}%`,
      };
    }

    const marketData = await searchCoin(coinName);
    if (marketData) {
      const sign = marketData.price_change_percentage_24h >= 0 ? "+" : "";
      return {
        answer: `The 24-hour price change of ${
          marketData.name
        } (${marketData.symbol.toUpperCase()}) is ${sign}${marketData.price_change_percentage_24h.toFixed(
          2
        )}%`,
      };
    }

    return {
      answer: `Sorry, I couldn't find information about ${coinName}. Please check the spelling and try again.`,
    };
  } catch (error) {
    console.error("Error handling change query:", error);
    return {
      answer:
        "Sorry, I encountered an error while fetching the change. Please try again later.",
    };
  }
}

async function handleMarketCapQuery(
  coinName: string,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  try {
    const coin = await db
      .select()
      .from(coins)
      .where(eq(coins.coingeckoId, coinName.toLowerCase()))
      .limit(1);

    if (coin.length > 0) {
      const marketCap = coin[0].marketCap || 0;
      return {
        answer: `The market capitalization of ${
          coin[0].name
        } (${coin[0].symbol.toUpperCase()}) is $${marketCap.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`,
      };
    }

    const marketData = await searchCoin(coinName);
    if (marketData) {
      return {
        answer: `The market capitalization of ${
          marketData.name
        } (${marketData.symbol.toUpperCase()}) is $${marketData.market_cap.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`,
      };
    }

    return {
      answer: `Sorry, I couldn't find information about ${coinName}. Please check the spelling and try again.`,
    };
  } catch (error) {
    console.error("Error handling market cap query:", error);
    return {
      answer:
        "Sorry, I encountered an error while fetching the market cap. Please try again later.",
    };
  }
}

async function handleTopCoinsQuery(
  limit: number,
  db: DbType
): Promise<{ answer: string; data?: any }> {
  try {
    const topCoins = await db
      .select()
      .from(coins)
      .orderBy(desc(coins.marketCap))
      .limit(limit);

    if (topCoins.length === 0) {
      return {
        answer:
          "I don't have any coin data yet. Please run the database seeding script first.",
      };
    }

    const coinList = topCoins
      .map(
        (coin, index) =>
          `${index + 1}. ${
            coin.name
          } (${coin.symbol.toUpperCase()}) - $${parseFloat(
            coin.currentPrice || "0"
          ).toFixed(2)}`
      )
      .join("\n");

    return {
      answer: `Here are the top ${limit} coins by market cap:\n${coinList}`,
      data: topCoins,
    };
  } catch (error) {
    console.error("Error handling top coins query:", error);
    return {
      answer:
        "Sorry, I encountered an error while fetching the top coins. Please try again later.",
    };
  }
}
