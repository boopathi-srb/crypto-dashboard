import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { coins, historicalPrices } from "../db/schema";
import {
  desc,
  eq,
  and,
  gte,
  lte,
  like,
  or,
  asc,
  sql,
  count,
  min,
  max,
} from "drizzle-orm";
import {
  getCached,
  setCached,
  getCacheKey,
  CACHE_TTL,
} from "../services/cache";

interface GetCoinsQuery {
  top?: string;
  page?: string;
  pageSize?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  minMarketCap?: string;
  maxMarketCap?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface GetCoinHistoryParams {
  id: string;
}

interface GetCoinHistoryQuery {
  days?: string;
}

export async function coinRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/coins/metadata",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await request.server.db
          .select({
            totalCount: count(),
            minPrice: min(sql`CAST(${coins.currentPrice} AS DECIMAL)`),
            maxPrice: max(sql`CAST(${coins.currentPrice} AS DECIMAL)`),
            minMarketCap: min(coins.marketCap),
            maxMarketCap: max(coins.marketCap),
          })
          .from(coins)
          .where(gte(sql`CAST(${coins.currentPrice} AS DECIMAL)`, 0));

        const response = {
          success: true,
          data: {
            totalCount: stats[0]?.totalCount || 0,
            priceRange: {
              min: stats[0]?.minPrice
                ? parseFloat(stats[0].minPrice as string)
                : 0,
              max: stats[0]?.maxPrice
                ? parseFloat(stats[0].maxPrice as string)
                : 100000,
            },
            marketCapRange: {
              min: stats[0]?.minMarketCap || 0,
              max: stats[0]?.maxMarketCap || 1000000000000,
            },
          },
        };

        return reply.send(response);
      } catch (error) {
        request.server.log.error(error, "Error fetching coins metadata");
        return reply.status(500).send({
          error: "Failed to fetch coins metadata",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  fastify.get<{ Querystring: GetCoinsQuery }>(
    "/api/coins",
    async (
      request: FastifyRequest<{ Querystring: GetCoinsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const top = request.query.top
          ? parseInt(request.query.top, 10)
          : undefined;
        const page = request.query.page
          ? parseInt(request.query.page, 10)
          : undefined;
        const pageSize = request.query.pageSize
          ? parseInt(request.query.pageSize, 10)
          : undefined;
        const search = request.query.search?.trim().toLowerCase();
        const minPrice = request.query.minPrice
          ? parseFloat(request.query.minPrice)
          : undefined;
        const maxPrice = request.query.maxPrice
          ? parseFloat(request.query.maxPrice)
          : undefined;
        const minMarketCap = request.query.minMarketCap
          ? parseFloat(request.query.minMarketCap)
          : undefined;
        const maxMarketCap = request.query.maxMarketCap
          ? parseFloat(request.query.maxMarketCap)
          : undefined;
        const sortBy = request.query.sortBy || "marketCap";
        const sortOrder = request.query.sortOrder || "desc";

        let limit = 50;
        let offset = 0;

        if (top) {
          if (isNaN(top) || top < 1 || top > 100) {
            return reply.status(400).send({
              error:
                "Invalid 'top' parameter. Must be a number between 1 and 100.",
            });
          }
          limit = top;
        } else if (page !== undefined && pageSize !== undefined) {
          if (isNaN(page) || page < 1) {
            return reply.status(400).send({
              error: "Invalid 'page' parameter. Must be a number >= 1.",
            });
          }
          if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return reply.status(400).send({
              error:
                "Invalid 'pageSize' parameter. Must be a number between 1 and 100.",
            });
          }
          limit = pageSize;
          offset = (page - 1) * pageSize;
        }

        const conditions = [];

        if (search) {
          conditions.push(
            or(
              like(coins.name, `%${search}%`),
              like(coins.symbol, `%${search}%`),
              like(coins.coingeckoId, `%${search}%`)
            )!
          );
        }

        if (minPrice !== undefined) {
          conditions.push(
            gte(sql`CAST(${coins.currentPrice} AS DECIMAL)`, minPrice)
          );
        }

        if (maxPrice !== undefined) {
          conditions.push(
            lte(sql`CAST(${coins.currentPrice} AS DECIMAL)`, maxPrice)
          );
        }

        if (minMarketCap !== undefined) {
          conditions.push(gte(coins.marketCap, minMarketCap));
        }

        if (maxMarketCap !== undefined) {
          conditions.push(lte(coins.marketCap, maxMarketCap));
        }

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;

        let orderByClause;
        const sortColumn =
          sortBy === "price"
            ? coins.currentPrice
            : sortBy === "marketCap"
            ? coins.marketCap
            : sortBy === "volume"
            ? coins.volume24h
            : sortBy === "change"
            ? coins.priceChange24h
            : coins.marketCap;

        if (sortBy === "price" || sortBy === "volume" || sortBy === "change") {
          orderByClause =
            sortOrder === "asc"
              ? asc(sql`CAST(${sortColumn} AS DECIMAL)`)
              : desc(sql`CAST(${sortColumn} AS DECIMAL)`);
        } else {
          orderByClause =
            sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
        }

        let query = request.server.db
          .select({
            id: coins.id,
            coingeckoId: coins.coingeckoId,
            symbol: coins.symbol,
            name: coins.name,
            currentPrice: coins.currentPrice,
            marketCap: coins.marketCap,
            priceChange24h: coins.priceChange24h,
            volume24h: coins.volume24h,
            lastUpdated: coins.lastUpdated,
          })
          .from(coins);

        if (whereClause) {
          query = query.where(whereClause) as any;
        }

        const countQuery = request.server.db
          .select({ count: count() })
          .from(coins);
        if (whereClause) {
          (countQuery as any).where(whereClause);
        }
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult[0]?.count || 0;

        query = query.orderBy(orderByClause).limit(limit).offset(offset) as any;

        const result = await query;

        const formattedResult = result.map((coin) => ({
          id: coin.id,
          coingeckoId: coin.coingeckoId,
          symbol: coin.symbol,
          name: coin.name,
          currentPrice: coin.currentPrice ? parseFloat(coin.currentPrice) : 0,
          marketCap: coin.marketCap || 0,
          priceChange24h: coin.priceChange24h
            ? parseFloat(coin.priceChange24h)
            : 0,
          volume24h: coin.volume24h ? parseFloat(coin.volume24h) : 0,
          lastUpdated: coin.lastUpdated,
        }));

        const response = {
          success: true,
          data: formattedResult,
          pagination: {
            total: totalCount,
            page: page || 1,
            pageSize: limit,
            totalPages: Math.ceil(totalCount / limit),
          },
        };

        return reply.send(response);
      } catch (error) {
        request.server.log.error(error, "Error fetching coins");
        return reply.status(500).send({
          error: "Failed to fetch coins",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  fastify.get<{
    Params: GetCoinHistoryParams;
    Querystring: GetCoinHistoryQuery;
  }>(
    "/api/coins/:id/history",
    async (
      request: FastifyRequest<{
        Params: GetCoinHistoryParams;
        Querystring: GetCoinHistoryQuery;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const coinId = request.params.id;
        const days = request.query.days ? parseInt(request.query.days, 10) : 30;

        if (isNaN(days) || days < 1 || days > 365) {
          return reply.status(400).send({
            error:
              "Invalid 'days' parameter. Must be a number between 1 and 365.",
          });
        }

        const cacheKey = getCacheKey("history", coinId, days);
        const cached = await getCached<any>(cacheKey);

        if (cached) {
          return reply.send(cached);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const coin = await request.server.db
          .select()
          .from(coins)
          .where(eq(coins.coingeckoId, coinId))
          .limit(1);

        if (coin.length === 0) {
          return reply.status(404).send({
            error: `Coin with ID '${coinId}' not found`,
          });
        }

        const history = await request.server.db
          .select({
            timestamp: historicalPrices.timestamp,
            price: historicalPrices.price,
          })
          .from(historicalPrices)
          .where(
            and(
              eq(historicalPrices.coinId, coinId),
              gte(historicalPrices.timestamp, startDate)
            )
          )
          .orderBy(desc(historicalPrices.timestamp));

        const formattedHistory = history.map((h) => ({
          timestamp: h.timestamp,
          price: h.price ? parseFloat(h.price) : 0,
        }));

        const response = {
          success: true,
          data: {
            coinId: coin[0].coingeckoId,
            coinName: coin[0].name,
            symbol: coin[0].symbol,
            days,
            history: formattedHistory,
          },
        };

        await setCached(cacheKey, response, CACHE_TTL.HISTORY);

        return reply.send(response);
      } catch (error) {
        request.server.log.error(error, "Error fetching coin history");
        return reply.status(500).send({
          error: "Failed to fetch coin history",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
