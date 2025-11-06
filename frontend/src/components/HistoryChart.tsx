import { useEffect, useState, useRef } from "react";
import { Card, Spin, Alert, Empty, Typography, Space } from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { getCoinHistory, type CoinHistory } from "../services/api";

const { Title, Text } = Typography;

interface HistoryChartProps {
  coinId: string | null;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ coinId }) => {
  const [history, setHistory] = useState<CoinHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (coinId) {
      fetchHistory(coinId);
    } else {
      setHistory(null);
      setError(null);
    }
  }, [coinId]);

  useEffect(() => {
    if (history && history.history.length > 0 && chartRef.current) {
      setTimeout(() => {
        chartRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [history]);

  const fetchHistory = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCoinHistory(id, 30);
      setHistory(data);
    } catch (err) {
      setError("Failed to fetch historical data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!coinId) {
    return (
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ padding: "60px 20px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Empty
          description={
            <Text type="secondary">
              Select a coin from the table above to view its price history
            </Text>
          }
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
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px" }}>
            <Text type="secondary">Loading price history...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Alert message="Error" description={error} type="error" showIcon />
      </Card>
    );
  }

  if (!history || history.history.length === 0) {
    return (
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Empty description="No historical data available for this coin" />
      </Card>
    );
  }

  // Format data for the chart
  const chartData = history.history
    .map((point) => ({
      date: new Date(point.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: point.price,
      fullDate: new Date(point.timestamp),
    }))
    .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

  // Calculate price change
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Format price for tooltip
  const formatPrice = (value: number) =>
    `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div ref={chartRef}>
      <Card
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ padding: "24px", display: "flex", flexDirection: "column", minHeight: "500px" }}
      >
        <Space direction="vertical" size="small" style={{ width: "100%", marginBottom: "20px" }}>
          <Space>
            <LineChartOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
            <Title level={4} style={{ margin: 0 }}>
              {history.coinName} ({history.symbol.toUpperCase()})
            </Title>
          </Space>
          <Space split="|">
            <Text type="secondary">30 Day Price History</Text>
            <Text strong style={{ color: isPositive ? "#52c41a" : "#ff4d4f" }}>
              {isPositive ? "+" : ""}
              {priceChangePercent.toFixed(2)}%
            </Text>
            <Text type="secondary">
              {formatPrice(firstPrice)} → {formatPrice(lastPrice)}
            </Text>
          </Space>
        </Space>
        <div style={{ flex: 1, height: "450px", width: "100%" }}>
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
                tick={{ fill: "#8c8c8c", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fill: "#8c8c8c", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => formatPrice(value)}
                labelStyle={{ color: "#000", fontWeight: 500 }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e8e8e8",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#1890ff"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
                name="Price (USD)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default HistoryChart;
