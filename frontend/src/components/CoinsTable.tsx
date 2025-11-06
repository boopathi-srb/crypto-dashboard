import { useEffect, useState, useCallback } from "react";
import { Table, Spin, Alert, Tag, Button, Space, Typography, Tooltip, Form, Input, Slider, Row, Col } from "antd";
import { ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined, StarOutlined, StarFilled, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType, TableProps } from "antd/es/table";
import { getCoins, getCoinsMetadata, type Coin, addFavorite, removeFavorite, getFavorites, type CoinFilters } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { message } from "antd";
import { AxiosError } from "axios";
import { useDebounceCallback } from "../hooks/useDebounceCallback";

const { Text } = Typography;

interface CoinsTableProps {
  onCoinSelect: (coinId: string) => void;
}

interface FilterValues {
  search?: string;
  priceRange?: [number, number];
  marketCapRange?: [number, number];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const CoinsTable: React.FC<CoinsTableProps> = ({ onCoinSelect }) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ field?: string; order?: "asc" | "desc" }>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5, total: 0 });
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 100000]);
  const [marketCapBounds, setMarketCapBounds] = useState<[number, number]>([0, 1000000000000]);
  const { isAuthenticated } = useAuth();
  const [form] = Form.useForm<FilterValues>();

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const metadata = await getCoinsMetadata();
        setPriceBounds([metadata.priceRange.min, metadata.priceRange.max]);
        setMarketCapBounds([metadata.marketCapRange.min, metadata.marketCapRange.max]);
        form.setFieldsValue({
          priceRange: [metadata.priceRange.min, metadata.priceRange.max],
          marketCapRange: [metadata.marketCapRange.min, metadata.marketCapRange.max],
        });
        setPagination((prev) => ({ ...prev, total: metadata.totalCount }));
      } catch (err) {
        console.error("Error loading metadata:", err);
      }
    };
    loadMetadata();
  }, [form]);

  const fetchCoins = useCallback(async (filters?: CoinFilters, resetPage: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      let currentPage = 1;
      let currentPageSize = 5;
      setPagination((prev) => {
        currentPage = resetPage ? 1 : prev.current;
        currentPageSize = prev.pageSize;
        return { ...prev, current: currentPage };
      });
      const result = await getCoins({
        ...filters,
        page: currentPage,
        pageSize: currentPageSize,
      });
      setCoins(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.pagination.total,
        current: result.pagination.page,
        pageSize: result.pagination.pageSize,
      }));
      setInitialLoad(false);
    } catch (err) {
      setError("Failed to fetch coins. Please make sure the backend is running.");
      console.error(err);
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated || coins.length === 0) return;
    try {
      const favoriteCoins = await getFavorites();
      const favoriteSet = new Set(favoriteCoins.map((coin) => coin.coingeckoId));
      setFavorites(favoriteSet);
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  }, [isAuthenticated, coins.length]);

  useEffect(() => {
    if (isAuthenticated && coins.length > 0) {
      loadFavorites();
    } else {
      setFavorites(new Set());
    }
  }, [isAuthenticated, coins.length, loadFavorites]);

  const handleFavoriteToggle = async (coinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      message.warning("Please login to add favorites");
      return;
    }

    setFavoriteLoading((prev) => new Set(prev).add(coinId));
    try {
      const isFavorite = favorites.has(coinId);
      if (isFavorite) {
        await removeFavorite(coinId);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(coinId);
          return newSet;
        });
        message.success("Removed from favorites");
      } else {
        await addFavorite(coinId);
        setFavorites((prev) => new Set(prev).add(coinId));
        message.success("Added to favorites");
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        message.error(error.response?.data.error || "Failed to update favorite");
      } else if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("Failed to update favorite");
      }
    } finally {
      setFavoriteLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(coinId);
        return newSet;
      });
    }
  };

  const handleFilterChange = useCallback(() => {
    const values = form.getFieldsValue();
    const filters: CoinFilters = {
      search: values.search,
      minPrice: values.priceRange?.[0],
      maxPrice: values.priceRange?.[1],
      minMarketCap: values.marketCapRange?.[0],
      maxMarketCap: values.marketCapRange?.[1],
      sortBy: values.sortBy as "price" | "marketCap" | "volume" | "change" | undefined,
      sortOrder: values.sortOrder,
    };
    fetchCoins(filters, true);
  }, [form, fetchCoins]);

  const debouncedFilterChange = useDebounceCallback(handleFilterChange, 500);

  const handleSort: TableProps<Coin>["onChange"] = (_pagination, _filters, sorter) => {
    if (Array.isArray(sorter)) return;

    const field = sorter.field as string;
    const order = sorter.order === "ascend" ? "asc" : sorter.order === "descend" ? "desc" : undefined;

    setSortConfig({ field, order });

    const sortByMap: Record<string, "price" | "marketCap" | "volume" | "change"> = {
      price: "price",
      marketCap: "marketCap",
      volume: "volume",
      change: "change",
    };

    form.setFieldsValue({
      sortBy: field ? sortByMap[field] || "marketCap" : undefined,
      sortOrder: order,
    });

    debouncedFilterChange();
  };

  const handleResetFilters = () => {
    form.resetFields();
    form.setFieldsValue({
      priceRange: priceBounds,
      marketCapRange: marketCapBounds,
    });
    setSortConfig({});
    setPagination((prev) => ({ ...prev, current: 1 }));
    debouncedFilterChange();
  };

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
    const values = form.getFieldsValue();
    const filters: CoinFilters = {
      search: values.search,
      minPrice: values.priceRange?.[0],
      maxPrice: values.priceRange?.[1],
      minMarketCap: values.marketCapRange?.[0],
      maxMarketCap: values.marketCapRange?.[1],
      sortBy: values.sortBy as "price" | "marketCap" | "volume" | "change" | undefined,
      sortOrder: values.sortOrder,
      page,
      pageSize,
    };
    fetchCoins(filters, false);
  };

  const columns: ColumnsType<Coin> = [
    {
      title: "#",
      key: "rank",
      width: 60,
      align: "center",
      render: (_, __, index) => (
        <Text strong style={{ color: "#8c8c8c" }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: "Name",
      key: "name",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: "15px" }}>
              {record.name}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.symbol.toUpperCase()}
            </Text>
          </div>
          {isAuthenticated && (
            <Tooltip title={favorites.has(record.coingeckoId) ? "Remove from favorites" : "Add to favorites"}>
              <Button
                type="text"
                icon={favorites.has(record.coingeckoId) ? <StarFilled /> : <StarOutlined />}
                onClick={(e) => handleFavoriteToggle(record.coingeckoId, e)}
                loading={favoriteLoading.has(record.coingeckoId)}
                style={{
                  color: favorites.has(record.coingeckoId) ? "#faad14" : "#d9d9d9",
                }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Price",
      dataIndex: "currentPrice",
      key: "price",
      align: "right",
      sorter: true,
      sortOrder: sortConfig.field === "price" ? (sortConfig.order === "asc" ? "ascend" : "descend") : null,
      render: (price: number) => (
        <Text strong style={{ fontSize: "14px" }}>
          ${price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: "24h Change",
      dataIndex: "priceChange24h",
      key: "change",
      align: "right",
      sorter: true,
      sortOrder: sortConfig.field === "change" ? (sortConfig.order === "asc" ? "ascend" : "descend") : null,
      render: (change: number) => {
        const isPositive = change >= 0;
        return (
          <Tag
            color={isPositive ? "success" : "error"}
            icon={isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            style={{
              fontSize: "13px",
              padding: "4px 12px",
              borderRadius: "6px",
              fontWeight: 500,
            }}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </Tag>
        );
      },
    },
    {
      title: "24h Volume",
      dataIndex: "volume24h",
      key: "volume",
      align: "right",
      sorter: true,
      sortOrder: sortConfig.field === "volume" ? (sortConfig.order === "asc" ? "ascend" : "descend") : null,
      render: (volume: number) => (
        <Text type="secondary">
          ${(volume / 1e9).toFixed(2)}B
        </Text>
      ),
    },
    {
      title: "Market Cap",
      dataIndex: "marketCap",
      key: "marketCap",
      align: "right",
      sorter: true,
      sortOrder: sortConfig.field === "marketCap" ? (sortConfig.order === "asc" ? "ascend" : "descend") : null,
      render: (cap: number) => (
        <Text type="secondary">
          ${(cap / 1e12).toFixed(2)}T
        </Text>
      ),
    },
  ];

  if (initialLoad && loading && coins.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <Spin size="large" />
        <div style={{ marginTop: "16px" }}>
          <Text type="secondary">Loading cryptocurrency data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {error && (
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchCoins()}
              size="small"
              type="primary"
            >
              Retry
            </Button>
          }
          style={{ marginBottom: "16px" }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onValuesChange={debouncedFilterChange}
        style={{ marginBottom: "16px", background: "#fafafa", padding: "16px", borderRadius: "8px" }}
      >
        <Row gutter={[64, 0]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="search" label="Search">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Name, symbol..."
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="priceRange" label={`Price Range ($${priceBounds[0].toLocaleString()} - $${priceBounds[1].toLocaleString()})`}>
              <Slider
                range
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={priceBounds[1] > 1000 ? 100 : 1}
                tooltip={{
                  formatter: (value) => `$${value?.toLocaleString()}`,
                }}
                marks={{
                  [priceBounds[0]]: `$${(priceBounds[0] / 1000).toFixed(0)}K`,
                  [priceBounds[1]]: `$${(priceBounds[1] / 1000).toFixed(0)}K`,
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item name="marketCapRange" label={`Market Cap Range ($${(marketCapBounds[0] / 1e12).toFixed(2)}T - $${(marketCapBounds[1] / 1e12).toFixed(2)}T)`}>
              <Slider
                range
                min={marketCapBounds[0]}
                max={marketCapBounds[1]}
                step={marketCapBounds[1] > 1e9 ? 1e9 : 1e6}
                tooltip={{
                  formatter: (value) => {
                    if (value && value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
                    if (value && value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
                    if (value && value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
                    return `$${value?.toLocaleString()}`;
                  },
                }}
                marks={{
                  [marketCapBounds[0]]: `$${(marketCapBounds[0] / 1e12).toFixed(2)}T`,
                  [marketCapBounds[1]]: `$${(marketCapBounds[1] / 1e12).toFixed(2)}T`,
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={24}>
            <Form.Item label=" " style={{ marginBottom: 0 }}>
              <Space>
                <Button onClick={handleResetFilters} size="small">
                  Reset
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleFilterChange}
                  loading={loading}
                  size="small"
                  type="primary"
                >
                  Refresh
                </Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <Table
          columns={columns}
          dataSource={coins}
          rowKey="coingeckoId"
          loading={loading}
          onChange={handleSort}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} coins`,
            pageSizeOptions: ["5", "10", "20", "50"],
            onChange: handleTableChange,
            onShowSizeChange: handleTableChange,
          }}
          onRow={(record) => ({
            onClick: () => onCoinSelect(record.coingeckoId),
            style: {
              cursor: "pointer",
              transition: "all 0.2s",
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.backgroundColor = "#f5f7fa";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.backgroundColor = "#fff";
            },
          })}
          style={{
            borderRadius: "8px",
          }}
        />
      </div>
    </div>
  );
};

export default CoinsTable;
