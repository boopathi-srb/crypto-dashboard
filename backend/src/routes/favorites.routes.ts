import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { favorites, coins } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/auth.middleware";

interface AddFavoriteBody {
  coinId: string;
}

export async function favoritesRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);

  fastify.get("/api/favorites", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const userId = user.userId;

      const userFavorites = await request.server.db
        .select({
          id: favorites.id,
          coinId: favorites.coinId,
          createdAt: favorites.createdAt,
        })
        .from(favorites)
        .where(eq(favorites.userId, userId));

      const coinIds = userFavorites.map((f) => f.coinId);

      if (coinIds.length === 0) {
        return reply.send({
          success: true,
          data: [],
          count: 0,
        });
      }

      const favoriteCoins = await request.server.db
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
        .from(coins)
        .where(inArray(coins.coingeckoId, coinIds));

      const formattedCoins = favoriteCoins.map((coin) => ({
        id: coin.id,
        coingeckoId: coin.coingeckoId,
        symbol: coin.symbol,
        name: coin.name,
        currentPrice: coin.currentPrice ? parseFloat(coin.currentPrice) : 0,
        marketCap: coin.marketCap || 0,
        priceChange24h: coin.priceChange24h ? parseFloat(coin.priceChange24h) : 0,
        volume24h: coin.volume24h ? parseFloat(coin.volume24h) : 0,
        lastUpdated: coin.lastUpdated,
      }));

      return reply.send({
        success: true,
        data: formattedCoins,
        count: formattedCoins.length,
      });
    } catch (error) {
      request.server.log.error(error, "Error fetching favorites");
      return reply.status(500).send({
        error: "Failed to fetch favorites",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  fastify.post<{ Body: AddFavoriteBody }>(
    "/api/favorites",
    async (request: FastifyRequest<{ Body: AddFavoriteBody }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const userId = user.userId;
        const { coinId } = request.body;

        if (!coinId) {
          return reply.status(400).send({
            error: "coinId is required",
          });
        }

        const coin = await request.server.db
          .select()
          .from(coins)
          .where(eq(coins.coingeckoId, coinId))
          .limit(1);

        if (coin.length === 0) {
          return reply.status(404).send({
            error: "Coin not found",
          });
        }

        const existing = await request.server.db
          .select()
          .from(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.coinId, coinId)))
          .limit(1);

        if (existing.length > 0) {
          return reply.status(409).send({
            error: "Coin is already in favorites",
          });
        }

        await request.server.db.insert(favorites).values({
          userId,
          coinId,
        });

        return reply.send({
          success: true,
          message: "Coin added to favorites",
        });
      } catch (error) {
        request.server.log.error(error, "Error adding favorite");
        return reply.status(500).send({
          error: "Failed to add favorite",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  fastify.delete<{ Params: { coinId: string } }>(
    "/api/favorites/:coinId",
    async (
      request: FastifyRequest<{ Params: { coinId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        const userId = user.userId;
        const { coinId } = request.params;

        const result = await request.server.db
          .delete(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.coinId, coinId)));

        return reply.send({
          success: true,
          message: "Coin removed from favorites",
        });
      } catch (error) {
        request.server.log.error(error, "Error removing favorite");
        return reply.status(500).send({
          error: "Failed to remove favorite",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  fastify.get<{ Params: { coinId: string } }>(
    "/api/favorites/:coinId/check",
    async (
      request: FastifyRequest<{ Params: { coinId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        const userId = user.userId;
        const { coinId } = request.params;

        const existing = await request.server.db
          .select()
          .from(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.coinId, coinId)))
          .limit(1);

        return reply.send({
          success: true,
          isFavorite: existing.length > 0,
        });
      } catch (error) {
        request.server.log.error(error, "Error checking favorite");
        return reply.status(500).send({
          error: "Failed to check favorite",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}

