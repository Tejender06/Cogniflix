/*
FILE: SignupPage.tsx

PURPOSE:
Handles new user registration input and form submission.

FLOW:
Component -> Form Submit -> authService -> Backend -> Navigation

USED BY:
AppRoutes.tsx

NEXT FLOW:
authService.ts

*/
import { useState } from "react";
import { Mail, Lock, Eye, User } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";
import "./login.css";

export default function SignupPage() {
  const [show, setShow] = useState(false);

  const [name, setName] = useState("Test");
  const [email, setEmail] = useState("test@mail.com");
  const [password, setPassword] = useState("Test@123");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    setError("");
    setLoading(true);
    setIsSlow(false);

    const timer = setTimeout(() => {
      setIsSlow(true);
    }, 5000);

    try {
      await registerUser(name, email, password);
      navigate("/login");
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

  return (
    <div className="container">
      <div className="bgOverlay" />

      <motion.div className="left">
        <div className="card">
          <h1 className="logo">COGNIFLIX</h1>
          <p className="subtitle">Create your account</p>

          <div className="inputBox">
            <User size={18} />
            <input
              placeholder="Enter your name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="inputBox">
            <Mail size={18} />
            <input
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="inputBox">
            <Lock size={18} />
            <input
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Eye onClick={() => setShow(!show)} />
          </div>

          <motion.button
            className="loginBtn"
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? "Creating..." : "Sign Up"}
          </motion.button>

          {error && <p style={{ color: "red" }}>{error}</p>}
          
          {isSlow && !error && (
            <p style={{ color: "#f39c12", marginTop: "10px", fontSize: "14px", textAlign: "center" }}>
              Backend is waking up. This may take up to 60 seconds... Please wait.
            </p>
          )}

          <p className="signup">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Login</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}