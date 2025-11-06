import axios, { AxiosError } from "axios";
import { getCached, setCached, getCacheKey, CACHE_TTL } from "./cache";

const API_BASE = "https://api.coingecko.com/api/v3";

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
  total_volume: number;
  last_updated: string;
}

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 10000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status !== 429 || i === retries - 1) {
        throw error;
      }
      const waitTime = delay * Math.pow(2, i);
      console.log(`Rate limited, retrying in ${waitTime / 1000}s...`);
      await sleep(waitTime);
    }
  }
  throw new Error("Max retries exceeded");
}

export async function fetchTopCoins(limit = 10): Promise<CoinMarketData[]> {
  const response = await axios.get(`${API_BASE}/coins/markets`, {
    params: {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: Math.min(limit, 250),
      page: 1,
      sparkline: false,
    },
  });
  return response.data;
}

export async function fetchCoinHistory(
  coinId: string,
  days = 30
): Promise<HistoricalPricePoint[]> {
  return retry(async () => {
    const response = await axios.get(
      `${API_BASE}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days,
          interval: "daily",
        },
      }
    );

    const prices = response.data.prices || [];
    return prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  });
}

export async function searchCoin(
  query: string
): Promise<CoinMarketData | null> {
  try {
    const cacheKey = getCacheKey("search", query.toLowerCase().trim());
    const cached = await getCached<CoinMarketData | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const response = await axios.get(`${API_BASE}/coins/list`, {
      params: { include_platform: false },
    });

    const coins = response.data;
    const lowerQuery = query.toLowerCase().trim();

    const matchedCoin =
      coins.find(
        (coin: { id: string; symbol: string; name: string }) =>
          coin.id.toLowerCase() === lowerQuery ||
          coin.symbol.toLowerCase() === lowerQuery ||
          coin.name.toLowerCase() === lowerQuery
      ) ||
      coins.find(
        (coin: { id: string; symbol: string; name: string }) =>
          coin.name.toLowerCase().includes(lowerQuery) ||
          coin.symbol.toLowerCase().includes(lowerQuery)
      );

    if (!matchedCoin) {
      await setCached(cacheKey, null, CACHE_TTL.SEARCH);
      return null;
    }

    const marketResponse = await axios.get(`${API_BASE}/coins/markets`, {
      params: {
        vs_currency: "usd",
        ids: matchedCoin.id,
        sparkline: false,
      },
    });

    const result = marketResponse.data[0] || null;
    await setCached(cacheKey, result, CACHE_TTL.SEARCH);
    return result;
  } catch (error) {
    console.error(`Error searching coin ${query}:`, error);
    return null;
  }
}
