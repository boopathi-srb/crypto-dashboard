import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Coin {
  id: number;
  coingeckoId: string;
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  priceChange24h: number;
  volume24h: number;
  lastUpdated: string | null;
}

export interface CoinHistory {
  coinId: string;
  coinName: string;
  symbol: string;
  days: number;
  history: Array<{
    timestamp: string;
    price: number;
  }>;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  data?: any;
}

export interface CoinsResponse {
  success: boolean;
  data: Coin[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  count?: number;
}

export interface CoinsMetadata {
  success: boolean;
  data: {
    totalCount: number;
    priceRange: {
      min: number;
      max: number;
    };
    marketCapRange: {
      min: number;
      max: number;
    };
  };
}

export interface CoinHistoryResponse {
  success: boolean;
  data: CoinHistory;
}

export interface CoinFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  sortBy?: "price" | "marketCap" | "volume" | "change";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CoinsWithPagination {
  data: Coin[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Get coins metadata (totalCount, priceRange, marketCapRange)
 */
export async function getCoinsMetadata(): Promise<CoinsMetadata["data"]> {
  try {
    const response = await apiClient.get<CoinsMetadata>("/api/coins/metadata");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching coins metadata:", error);
    throw error;
  }
}

/**
 * Get coins with optional filters, sorting, and pagination
 */
export async function getCoins(
  filters?: CoinFilters
): Promise<CoinsWithPagination> {
  try {
    const params: any = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.pageSize) params.pageSize = filters.pageSize;
    if (filters?.search) params.search = filters.search;
    if (filters?.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters?.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters?.minMarketCap !== undefined) params.minMarketCap = filters.minMarketCap;
    if (filters?.maxMarketCap !== undefined) params.maxMarketCap = filters.maxMarketCap;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await apiClient.get<CoinsResponse>("/api/coins", { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination || {
        total: response.data.count || response.data.data.length,
        page: 1,
        pageSize: response.data.data.length,
        totalPages: 1,
      },
    };
  } catch (error) {
    console.error("Error fetching coins:", error);
    throw error;
  }
}

/**
 * Get top N coins with optional filters and sorting (backward compatibility)
 */
export async function getTopCoins(
  limit: number = 10,
  filters?: Omit<CoinFilters, "page" | "pageSize">
): Promise<Coin[]> {
  try {
    const params: any = { top: limit };
    if (filters?.search) params.search = filters.search;
    if (filters?.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters?.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters?.minMarketCap !== undefined) params.minMarketCap = filters.minMarketCap;
    if (filters?.maxMarketCap !== undefined) params.maxMarketCap = filters.maxMarketCap;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await apiClient.get<CoinsResponse>("/api/coins", { params });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching top coins:", error);
    throw error;
  }
}

/**
 * Get historical price data for a coin
 */
export async function getCoinHistory(
  coinId: string,
  days: number = 30
): Promise<CoinHistory> {
  try {
    const response = await apiClient.get<CoinHistoryResponse>(
      `/api/coins/${coinId}/history`,
      {
        params: { days },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error fetching coin history:", error);
    throw error;
  }
}

/**
 * Send a chat message to the assistant
 */
export async function postChatMessage(query: string): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>("/api/chat", {
      query,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
  }
}

/**
 * Authentication APIs
 */
export interface SignupData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

export async function signup(data: SignupData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/signup", data);
  return response.data;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/api/auth/login", data);
  return response.data;
}

/**
 * Favorites APIs
 */
export async function getFavorites(): Promise<Coin[]> {
  const response = await apiClient.get<CoinsResponse>("/api/favorites");
  return response.data.data;
}

export async function addFavorite(coinId: string): Promise<void> {
  await apiClient.post("/api/favorites", { coinId });
}

export async function removeFavorite(coinId: string): Promise<void> {
  await apiClient.delete(`/api/favorites/${coinId}`);
}

export async function checkFavorite(coinId: string): Promise<boolean> {
  const response = await apiClient.get<{ success: boolean; isFavorite: boolean }>(
    `/api/favorites/${coinId}/check`
  );
  return response.data.isFavorite;
}

