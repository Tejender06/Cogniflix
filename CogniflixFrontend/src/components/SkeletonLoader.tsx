/*
FILE: SkeletonLoader.tsx

PURPOSE:
Displays a loading placeholder state for UI components.

FLOW:
Component -> UI Render

USED BY:
Various Components during loading state

NEXT FLOW:
None

*/
import "./skeleton.css";

interface SkeletonProps {
  type?: "banner" | "card" | "text" | "title";
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}

export default function SkeletonLoader({ type = "text", width, height, style }: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    width: width || (type === "card" ? "200px" : type === "banner" ? "100%" : "100px"),
    height: height || (type === "card" ? "300px" : type === "banner" ? "60vh" : "20px"),
    ...style,
  };

  return <div className={`skeleton ${type}`} style={baseStyle}></div>;
}
