import { useState } from "react";
import { Layout, Typography, Row, Col, ConfigProvider, Button, Space, Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import { ThunderboltOutlined, UserOutlined, LogoutOutlined, StarOutlined } from "@ant-design/icons";
import CoinsTable from "./components/CoinsTable";
import HistoryChart from "./components/HistoryChart";
import FloatingChatButton from "./components/FloatingChatButton";
import LoginModal from "./components/LoginModal";
import FavoritesView from "./components/FavoritesView";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";

const { Header, Content } = Layout;
const { Title } = Typography;

function AppContent() {
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    message.success("Logged out successfully");
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "favorites",
      label: "My Favorites",
      icon: <StarOutlined />,
      onClick: () => setShowFavorites(!showFavorites),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <Header
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <div onClick={() => setShowFavorites(false)} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <ThunderboltOutlined
              style={{ fontSize: "28px", color: "#fff" }}
            />
            <Title level={3} style={{ color: "#fff", margin: 0, fontWeight: 600 }}>
              Crypto Dashboard
            </Title>
          </div>
          <Space>
            {isAuthenticated ? (
              <>
                <Button
                  type="text"
                  icon={<StarOutlined />}
                  onClick={() => setShowFavorites(!showFavorites)}
                  style={{ color: "#fff" }}
                >
                  Favorites
                </Button>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <Button
                    type="text"
                    icon={<UserOutlined />}
                    style={{ color: "#fff" }}
                  >
                    {user?.name || user?.email}
                  </Button>
                </Dropdown>
              </>
            ) : (
              <Button
                type="primary"
                ghost
                icon={<UserOutlined />}
                onClick={() => setShowLoginModal(true)}
              >
                Login
              </Button>
            )}
          </Space>
        </Header>
        <Content
          style={{
            padding: "32px",
            maxWidth: "1600px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {showFavorites && isAuthenticated ? (
            <FavoritesView onCoinSelect={setSelectedCoinId} />
          ) : (
            <Row gutter={[24, 24]} style={{ display: "flex", alignItems: "stretch" }}>
              <Col xs={24} style={{ display: "flex" }}>
                <div
                  style={{
                    background: "#fff",
                    padding: "24px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Title level={4} style={{ marginBottom: "16px", marginTop: 0 }}>
                    Top 50 Cryptocurrencies
                  </Title>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <CoinsTable onCoinSelect={setSelectedCoinId} />
                  </div>
                </div>
              </Col>
              <Col xs={24} style={{ display: "flex" }}>
                <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                  <HistoryChart coinId={selectedCoinId} />
                </div>
              </Col>
            </Row>
          )}
        </Content>
        <FloatingChatButton />
        <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </Layout>
    </ConfigProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
