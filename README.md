# Crypto Dashboard with Chat Assistant

A full-stack cryptocurrency dashboard application that displays real-time crypto data and includes an intelligent chat assistant for querying cryptocurrency information.

## 🎯 Features

### Backend
- **CoinGecko API Integration**: Fetches live cryptocurrency data from CoinGecko API
- **Database Persistence**: Stores top 50 cryptocurrencies and 30-day historical price data in PostgreSQL (Neon)
- **Redis Caching**: Uses Upstash Redis for caching API responses to reduce rate limiting and improve performance
- **RESTful API Endpoints**:
  - `GET /api/coins` - Get top N coins with price, volume, and % change (cached for 1 minute)
  - `GET /api/coins/:id/history` - Get historical price trends for a selected coin (cached for 5 minutes)
  - `POST /api/chat` - Rule-based Q&A endpoint for natural language queries
- **Rule-Based Chat Assistant**: Parses natural language queries using keyword matching and regex patterns

### Frontend
- **Dashboard Page**: 
  - Interactive table displaying top 10 cryptocurrencies
  - Real-time price, volume, and percentage change data
  - Sortable columns
  - Click on any coin to view its price history
- **Price History Chart**: 
  - Line chart showing 30-day historical price trends
  - Responsive design with tooltips
- **Chat Assistant Panel**: 
  - Natural language interface for querying crypto data
  - Real-time responses from the backend
  - Clean, modern UI

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL (Neon)
- **Cache**: Upstash Redis (Vercel-compatible)
- **ORM**: Drizzle ORM
- **HTTP Client**: Axios
- **API**: CoinGecko API

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design
- **Charts**: Recharts
- **HTTP Client**: Axios

## 📦 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Neon PostgreSQL database (or any PostgreSQL database)
- CoinGecko API access (free tier is sufficient)

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL=your-neon-postgres-connection-string
   PORT=3001
   UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url
   UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token
   JWT_SECRET=your-jwt-secret-key-change-in-production
   ```

   **Setting up Upstash Redis (for Vercel deployment)**:
   - Go to [Upstash Console](https://console.upstash.com/)
   - Create a new Redis database
   - Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Add them to your `.env` file
   - For Vercel deployment, add these as environment variables in your Vercel project settings

4. **Run database migrations**:
   ```bash
   npx drizzle-kit push:pg
   ```

5. **Seed the database**:
   This will fetch data from CoinGecko and populate your database:
   ```bash
   npm run db:seed
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

   The backend will be running on `http://localhost:3001`

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables (optional)**:
   Create a `.env` file in the `frontend` directory if your backend is running on a different URL:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The frontend will be running on `http://localhost:5173` (or another port if 5173 is taken)

## 🧠 Chat Assistant Logic

The chat assistant uses a **rule-based parsing system** that matches natural language queries against predefined patterns. Here's how it works:

### Supported Query Types

1. **Price Queries**
   - Pattern: `"What is the price of [coin]?"` or `"price of [coin]"`
   - Example: "What is the price of Bitcoin?"
   - Response: Returns the current price of the specified cryptocurrency

2. **Trend/History Queries**
   - Pattern: `"Show me the [N]-day trend of [coin]"` or `"trend of [coin]"`
   - Example: "Show me the 7-day trend of Ethereum"
   - Response: Returns price change percentage and historical data for visualization

3. **Volume Queries**
   - Pattern: `"What is the volume of [coin]?"`
   - Example: "What is the volume of Bitcoin?"
   - Response: Returns the 24-hour trading volume

4. **Percentage Change Queries**
   - Pattern: `"What is the 24h change of [coin]?"`
   - Example: "What is the 24h change of Ethereum?"
   - Response: Returns the 24-hour price change percentage

5. **Market Cap Queries**
   - Pattern: `"What is the market cap of [coin]?"`
   - Example: "What is the market cap of Bitcoin?"
   - Response: Returns the market capitalization

6. **Top Coins Queries**
   - Pattern: `"Show me top [N] coins"`
   - Example: "Show me top 5 coins"
   - Response: Returns a list of top N coins by market cap

### Implementation Details

- **Keyword Matching**: Uses regex patterns to identify query types
- **Fuzzy Coin Search**: If a coin is not found in the database, the system searches CoinGecko API for matching coins
- **Database-First Approach**: Queries the local database first for faster responses
- **Fallback to API**: If data is not available locally, falls back to CoinGecko API
- **Error Handling**: Graceful error messages for invalid queries or API failures

### Example Queries

```
"What is the price of Bitcoin?"
"Show me the 7-day trend of Ethereum"
"What is the volume of Cardano?"
"What is the 24h change of Solana?"
"Show me top 5 coins"
```

## 📁 Project Structure

```
jetapult/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts          # Database schema definitions
│   │   │   └── index.ts           # Database connection setup
│   │   ├── plugins/
│   │   │   └── db.ts              # Fastify database plugin
│   │   ├── routes/
│   │   │   ├── coins.routes.ts    # Coin-related API endpoints
│   │   │   └── chat.routes.ts     # Chat API endpoint
│   │   ├── services/
│   │   │   ├── coingecko.service.ts  # CoinGecko API integration
│   │   │   └── chat.service.ts       # Chat parsing logic
│   │   └── server.ts               # Fastify server setup
│   ├── scripts/
│   │   └── seed-database.ts       # Database seeding script
│   ├── drizzle.config.ts          # Drizzle ORM configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CoinsTable.tsx     # Cryptocurrency table component
│   │   │   ├── HistoryChart.tsx   # Price history chart component
│   │   │   └── ChatPanel.tsx      # Chat assistant component
│   │   ├── services/
│   │   │   └── api.ts             # API client for backend calls
│   │   ├── App.tsx                # Main dashboard component
│   │   └── main.tsx               # React entry point
│   └── package.json
└── README.md
```

## 🚀 Usage

1. **Start the backend server** (from `backend/` directory):
   ```bash
   npm run dev
   ```

2. **Start the frontend server** (from `frontend/` directory):
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to the frontend URL (usually `http://localhost:5173`)

4. **Interact with the dashboard**:
   - View the top 10 cryptocurrencies in the table
   - Click on any coin to see its 30-day price history
   - Use the chat assistant to ask questions about cryptocurrencies

## 🔄 Database Seeding

To update the database with fresh data from CoinGecko:

```bash
cd backend
npm run db:seed
```

This script will:
- Fetch the top 10 cryptocurrencies from CoinGecko
- Store/update coin data in the database
- Fetch 30-day historical price data for each coin
- Store historical data points in the database

**Note**: The seeding process includes rate limiting delays to avoid overwhelming the CoinGecko API.

## 🧪 API Endpoints

### GET `/api/coins`
Get top N cryptocurrencies.

**Query Parameters**:
- `top` (optional): Number of coins to return (default: 10, max: 100)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "coingeckoId": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "currentPrice": 45000.50,
      "marketCap": 850000000000,
      "priceChange24h": 2.5,
      "volume24h": 25000000000,
      "lastUpdated": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 10
}
```

### GET `/api/coins/:id/history`
Get historical price data for a specific coin.

**Path Parameters**:
- `id`: CoinGecko coin ID (e.g., "bitcoin", "ethereum")

**Query Parameters**:
- `days` (optional): Number of days of history (default: 30, max: 365)

**Response**:
```json
{
  "success": true,
  "data": {
    "coinId": "bitcoin",
    "coinName": "Bitcoin",
    "symbol": "btc",
    "days": 30,
    "history": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "price": 45000.50
      }
    ]
  }
}
```

### POST `/api/chat`
Send a natural language query to the chat assistant.

**Request Body**:
```json
{
  "query": "What is the price of Bitcoin?"
}
```

**Response**:
```json
{
  "success": true,
  "answer": "The current price of Bitcoin (BTC) is $45,000.50",
  "data": null
}
```

### POST `/api/auth/signup`
Create a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST `/api/auth/login`
Login with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### GET `/api/favorites`
Get user's favorite coins. **Requires Authentication**

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "coingeckoId": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "currentPrice": 45000.50,
      "marketCap": 850000000000,
      "priceChange24h": 2.5,
      "volume24h": 25000000000,
      "lastUpdated": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### POST `/api/favorites`
Add a coin to favorites. **Requires Authentication**

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "coinId": "bitcoin"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Coin added to favorites"
}
```

### DELETE `/api/favorites/:coinId`
Remove a coin from favorites. **Requires Authentication**

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Coin removed from favorites"
}
```

### GET `/api/favorites/:coinId/check`
Check if a coin is in user's favorites. **Requires Authentication**

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "isFavorite": true
}
```

## ⚠️ Assumptions & Limitations

### Assumptions
1. **CoinGecko API Availability**: The application assumes CoinGecko API is accessible and responsive
2. **Database Connection**: Assumes a valid PostgreSQL connection string is provided
3. **Network Access**: Requires internet connection for CoinGecko API calls
4. **Coin Names**: Users should use common coin names (Bitcoin, Ethereum, etc.) for best results

### Limitations
1. **Chat Parser**: The rule-based parser has limited understanding and may not handle complex or ambiguous queries
2. **Coin Name Matching**: Coin name matching is case-insensitive but requires approximate spelling
3. **Rate Limiting**: CoinGecko API has rate limits; the seeding script includes delays to respect these limits
4. **Historical Data**: Historical data is limited to what's stored in the database (30 days by default)
5. **Real-time Updates**: Data is not updated in real-time; users need to refresh or re-seed the database for latest data

## 🔮 Future Enhancements (Bonus Features)

- [x] User authentication and favorite coins
- [ ] Real-time price updates via WebSockets
- [ ] Advanced filtering and sorting on the dashboard
- [ ] Caching layer to reduce API calls
- [ ] Unit and integration tests
- [ ] Deployment configuration (Vercel/Netlify)
- [ ] More sophisticated chat assistant using NLP/ML
- [ ] Price alerts and notifications
- [ ] Portfolio tracking

## 📝 License

ISC

## 👤 Author

Built as a fullstack engineering assignment.

---

**Note**: Make sure to set up your `.env` files with the correct `DATABASE_URL` before running the application!

