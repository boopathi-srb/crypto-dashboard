import { useEffect, useState } from "react";
import { Card, Spin, Empty, Table, Typography, Tag, Button, Space } from "antd";
import { StarFilled, ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { getFavorites, removeFavorite, type Coin } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { message } from "antd";

const { Title, Text } = Typography;

interface FavoritesViewProps {
  onCoinSelect: (coinId: string) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ onCoinSelect }) => {
  const [favorites, setFavorites] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await getFavorites();
      setFavorites(data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        message.error("Failed to fetch favorites");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (coinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeFavorite(coinId);
      setFavorites((prev) => prev.filter((coin) => coin.coingeckoId !== coinId));
      message.success("Removed from favorites");
    } catch (error: any) {
      message.error(error.response?.data?.error || "Failed to remove favorite");
    }
  };

  const columns: ColumnsType<Coin> = [
    {
      title: "Name",
      key: "name",
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: "15px" }}>
            {record.name}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.symbol.toUpperCase()}
          </Text>
        </div>
      ),
    },
    {
      title: "Price",
      dataIndex: "currentPrice",
      key: "price",
      align: "right",
      render: (price: number) => (
        <Text strong style={{ fontSize: "14px" }}>
          ${price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
      sorter: (a, b) => a.currentPrice - b.currentPrice,
    },
    {
      title: "24h Change",
      dataIndex: "priceChange24h",
      key: "change",
      align: "right",
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
      sorter: (a, b) => a.priceChange24h - b.priceChange24h,
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<StarFilled />}
          onClick={(e) => handleRemoveFavorite(record.coingeckoId, e)}
        >
          Remove
        </Button>
      ),
    },
  ];

  if (!isAuthenticated) {
    return (
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <Empty
          description="Please login to view your favorite coins"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px" }}>
            <Text type="secondary">Loading favorites...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      style={{
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={4} style={{ margin: 0 }}>
          <StarFilled style={{ color: "#faad14", marginRight: "8px" }} />
          My Favorite Coins
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchFavorites}
          loading={loading}
          size="small"
        >
          Refresh
        </Button>
      </div>
      {favorites.length === 0 ? (
        <Empty
          description="No favorite coins yet. Click the star icon on any coin to add it to favorites."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={favorites}
          rowKey="coingeckoId"
          pagination={false}
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
        />
      )}
    </Card>
  );
};

export default FavoritesView;

