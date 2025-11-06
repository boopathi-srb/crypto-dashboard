import { db } from "../src/db";
import { coins, historicalPrices } from "../src/db/schema";
import {
  fetchTopCoins,
  fetchCoinHistory,
} from "../src/services/coingecko.service";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Step 1: Fetch top 50 coins from CoinGecko
    console.log("📊 Fetching top 50 coins from CoinGecko...");
    const topCoins = await fetchTopCoins(50);

    console.log(`✅ Fetched ${topCoins.length} coins`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Step 2: Insert/Update coins in database
    for (let i = 0; i < topCoins.length; i++) {
      const coinData = topCoins[i];
      console.log(
        `\n💾 [${i + 1}/${topCoins.length}] Processing ${coinData.name} (${
          coinData.symbol
        })...`
      );

      try {
        // Insert or update coin data
        await db
          .insert(coins)
          .values({
            coingeckoId: coinData.id,
            symbol: coinData.symbol,
            name: coinData.name,
            currentPrice: coinData.current_price.toString(),
            marketCap: coinData.market_cap,
            priceChange24h:
              coinData.price_change_percentage_24h?.toString() || "0",
            volume24h: coinData.total_volume.toString(),
            lastUpdated: new Date(coinData.last_updated),
          })
          .onConflictDoUpdate({
            target: coins.coingeckoId,
            set: {
              symbol: coinData.symbol,
              name: coinData.name,
              currentPrice: coinData.current_price.toString(),
              marketCap: coinData.market_cap,
              priceChange24h:
                coinData.price_change_percentage_24h?.toString() || "0",
              volume24h: coinData.total_volume.toString(),
              lastUpdated: new Date(coinData.last_updated),
            },
          });

        console.log(`  ✅ Coin data saved`);

        // Step 3: Fetch historical data (last 30 days)
        console.log(`  📈 Fetching 30-day history for ${coinData.name}...`);
        try {
          const history = await fetchCoinHistory(coinData.id, 30);

          if (history.length > 0) {
            // Delete existing historical data for this coin (to avoid duplicates)
            await db
              .delete(historicalPrices)
              .where(eq(historicalPrices.coinId, coinData.id));

            // Insert new historical data
            const historyRecords = history.map((point) => ({
              coinId: coinData.id,
              timestamp: new Date(point.timestamp),
              price: point.price.toString(),
            }));

            // Insert in batches to avoid overwhelming the database
            const batchSize = 100;
            for (let j = 0; j < historyRecords.length; j += batchSize) {
              const batch = historyRecords.slice(j, j + batchSize);
              await db.insert(historicalPrices).values(batch);
            }

            console.log(
              `  ✅ Inserted ${history.length} historical price points`
            );
            successCount++;
          } else {
            console.log(`  ⚠️  No historical data found for ${coinData.name}`);
            successCount++; // Still count as success if coin data was saved
          }
        } catch (error) {
          console.error(
            `  ❌ Error fetching history for ${coinData.name}:`,
            error instanceof Error ? error.message : error
          );
          errors.push(
            `${coinData.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          errorCount++;
          // Continue with next coin even if history fails
        }
      } catch (error) {
        console.error(
          `  ❌ Error processing ${coinData.name}:`,
          error instanceof Error ? error.message : error
        );
        errors.push(
          `${coinData.name}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        errorCount++;
      }

      // Delay between requests to avoid rate limiting
      // Wait at least 10 seconds between requests to respect CoinGecko rate limits
      if (i < topCoins.length - 1) {
        const delay = 10000; // 10 seconds between requests
        console.log(`  ⏳ Waiting ${delay / 1000}s before next request...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Database seeding completed!");
    console.log("=".repeat(60));
    console.log(`✅ Successfully processed: ${successCount} coins`);
    if (errorCount > 0) {
      console.log(`⚠️  Errors encountered: ${errorCount} coins`);
      console.log("\nErrors:");
      errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
    }
    console.log(`📊 Total coins in database: ${topCoins.length}`);
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
    process.exit(1);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the seeding script
seedDatabase();
