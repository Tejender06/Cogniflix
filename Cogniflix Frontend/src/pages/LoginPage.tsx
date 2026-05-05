/*
FILE: LoginPage.tsx

PURPOSE:
Handles user authentication input and form submission.
*/
import { useState, useEffect } from "react";
import { Mail, Lock, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./login.css";

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("test@mail.com");
  const [password, setPassword] = useState("Test@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsVerifying(false);
        return;
      }

      try {
        const res = await api.get("/api/auth/me");
        login(res.data.user);
        navigate("/dashboard", { replace: true });
      } catch (error) {
        localStorage.removeItem("token");
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [navigate, login]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    setIsSlow(false);
    
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, 5000);

    try {
      const data = await loginUser(email, password);
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      login(data.user); // Update global auth state
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setIsSlow(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'white' }}>Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="bgOverlay" />

      <motion.div className="left">
        <div className="card">
          <h1 className="logo">COGNIFLIX</h1>
          <p className="subtitle">Context-Aware Streaming Experience</p>

          <div className="inputBox">
            <Mail size={18} />
            <input
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="inputBox">
            <Lock size={18} />
            <input
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Eye className="eye" onClick={() => setShow(!show)} />
          </div>

          <div className="row">
            <label className="remember">
              <input type="checkbox" />
              Remember Me
            </label>

            <span
              className="link"
              onClick={() => alert("Feature not implemented")}
            >
              Forgot Password?
            </span>
          </div>

          <motion.button
            className="loginBtn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>

          {error && (
            <p style={{ color: "red", marginTop: "10px" }}>{error}</p>
          )}

          {isSlow && !error && (
            <p style={{ color: "#f39c12", marginTop: "10px", fontSize: "14px", textAlign: "center" }}>
              Backend is waking up. This may take up to 60 seconds... Please wait.
            </p>
          )}

          <div className="divider">OR</div>

          <button className="oauthBtn">Continue with Google</button>
          <button className="oauthBtn">Continue with GitHub</button>

          <p className="signup">
            New to Cogniflix?{" "}
            <span onClick={() => navigate("/signup")}>Sign Up</span>
          </p>
        </div>
      </motion.div>

      <motion.div className="right">
        <h2>Why Cogniflix?</h2>
        <p className="rightSub">
          Experience streaming like never before
        </p>

        <div className="feature">
          <h4>Emotion-Based Recommendations</h4>
          <p>AI-powered content suggestions based on your mood</p>
        </div>

        <div className="feature">
          <h4>Regional Personalization</h4>
          <p>Content tailored to your culture & language</p>
        </div>

        <div className="feature">
          <h4>Time-Aware Content Ranking</h4>
          <p>Smart suggestions that adapt to time patterns</p>
        </div>
      </motion.div>
    </div>
  );
}