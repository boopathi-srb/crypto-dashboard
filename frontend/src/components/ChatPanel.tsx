import { useState, useRef, useEffect } from "react";
import { Input, Button, Spin, Typography, Avatar } from "antd";
import { SendOutlined, RobotOutlined, UserOutlined } from "@ant-design/icons";
import { postChatMessage } from "../services/api";

const { Text } = Typography;

interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I'm your crypto assistant. Ask me about cryptocurrency prices, trends, volumes, and more!",
      timestamp: new Date(),
    },
  ]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentQuery.trim() || loading) return;

    const userMessage: Message = {
      sender: "user",
      text: currentQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentQuery("");
    setLoading(true);

    try {
      const response = await postChatMessage(currentQuery);
      const botMessage: Message = {
        sender: "bot",
        text: response.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        sender: "bot",
        text: "Sorry, I encountered an error. Please make sure the backend is running and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#fff",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          backgroundColor: "#fafafa",
          minHeight: "400px",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: "16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              flexDirection: message.sender === "user" ? "row-reverse" : "row",
            }}
          >
            <Avatar
              icon={message.sender === "user" ? <UserOutlined /> : <RobotOutlined />}
              style={{
                backgroundColor: message.sender === "user" ? "#1890ff" : "#52c41a",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                maxWidth: "75%",
                padding: "12px 16px",
                borderRadius: message.sender === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                backgroundColor: message.sender === "user" ? "#1890ff" : "#fff",
                color: message.sender === "user" ? "#fff" : "#000",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <Text
                style={{
                  color: message.sender === "user" ? "#fff" : "#000",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                {message.text}
              </Text>
            </div>
          </div>
        ))}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <Avatar
              icon={<RobotOutlined />}
              style={{ backgroundColor: "#52c41a", flexShrink: 0 }}
            />
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px 12px 12px 4px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: "8px" }}>
                Thinking...
              </Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #e8e8e8",
          backgroundColor: "#fff",
        }}
      >
        <Input.Group compact style={{ display: "flex", gap: "8px" }}>
          <Input
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            placeholder="Ask me about crypto prices, trends, volumes..."
            onPressEnter={handleSubmit}
            disabled={loading}
            style={{ flex: 1, borderRadius: "8px" }}
            size="large"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!currentQuery.trim()}
            size="large"
            style={{ borderRadius: "8px" }}
          >
            Send
          </Button>
        </Input.Group>
      </div>
    </div>
  );
};

export default ChatPanel;
