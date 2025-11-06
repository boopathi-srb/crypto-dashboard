import {
  pgTable,
  serial,
  varchar,
  decimal,
  timestamp,
  bigint,
  integer,
} from "drizzle-orm/pg-core";

// Table: coins
// Used to store the core data for the top N coins.
export const coins = pgTable("coins", {
  id: serial("id").primaryKey(),
  coingeckoId: varchar("coingecko_id", { length: 100 }).unique().notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  currentPrice: decimal("current_price", { precision: 20, scale: 10 }),
  marketCap: bigint("market_cap", { mode: "number" }),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 4 }),
  volume24h: decimal("volume_24h", { precision: 20, scale: 4 }),
  lastUpdated: timestamp("last_updated", { withTimezone: true }),
});

// Table: historicalPrices
// Used to store 30-day price history for the top coins.
export const historicalPrices = pgTable("historical_prices", {
  id: serial("id").primaryKey(),
  // This references the 'coingeckoId' from the 'coins' table.
  // We don't use a strict foreign key here to allow for more flexible data ingestion,
  // but we will treat it as one in our application logic.
  coinId: varchar("coingecko_id", { length: 100 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  price: decimal("price", { precision: 20, scale: 10 }).notNull(),
});

// Table: users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Table: favorites
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  coinId: varchar("coin_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
