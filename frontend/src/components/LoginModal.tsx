import { useState } from "react";
import { Modal, Form, Input, Button, message, Tabs } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { signup, login } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuth();
  const [loginForm] = Form.useForm();
  const [signupForm] = Form.useForm();

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      const response = await login(values);
      setAuth(response.token, response.user);
      message.success("Login successful!");
      onClose();
      loginForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: { email: string; password: string; name?: string }) => {
    try {
      setLoading(true);
      const response = await signup(values);
      setAuth(response.token, response.user);
      message.success("Account created successfully!");
      onClose();
      signupForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Authentication"
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "login",
            label: "Login",
            children: (
              <Form
                form={loginForm}
                onFinish={handleLogin}
                layout="vertical"
                style={{ marginTop: "20px" }}
              >
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "Please enter your email" },
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Email"
                    size="large"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: "Please enter your password" }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Password"
                    size="large"
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                  >
                    Login
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: "signup",
            label: "Sign Up",
            children: (
              <Form
                form={signupForm}
                onFinish={handleSignup}
                layout="vertical"
                style={{ marginTop: "20px" }}
              >
                <Form.Item
                  name="name"
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Name (optional)"
                    size="large"
                  />
                </Form.Item>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "Please enter your email" },
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Email"
                    size="large"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "Please enter a password" },
                    { min: 6, message: "Password must be at least 6 characters" },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Password"
                    size="large"
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                  >
                    Sign Up
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default LoginModal;

