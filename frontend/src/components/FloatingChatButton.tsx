import { useState } from "react";
import { Button, Drawer } from "antd";
import { RobotOutlined, CloseOutlined } from "@ant-design/icons";
import ChatPanel from "./ChatPanel";

const FloatingChatButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        icon={<RobotOutlined />}
        size="large"
        onClick={showDrawer}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "64px",
          height: "64px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          fontSize: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <RobotOutlined style={{ color: "#1890ff", fontSize: "20px" }} />
            <span style={{ fontSize: "18px", fontWeight: 600 }}>Crypto Assistant</span>
          </div>
        }
        placement="right"
        onClose={onClose}
        open={open}
        width={400}
        closable={true}
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ color: "#8c8c8c" }}
          />
        }
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <ChatPanel />
      </Drawer>
    </>
  );
};

export default FloatingChatButton;

