import { Skeleton } from "@mui/material";

interface SkeletonProps {
  type?: "banner" | "card" | "text" | "title";
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export default function SkeletonLoader({ type = "text", width, height, style }: SkeletonProps) {
  let variant: "text" | "rectangular" | "rounded" = "text";
  let defaultWidth: string | number = "100%";
  let defaultHeight: string | number = "20px";

  if (type === "card") {
    variant = "rounded";
    defaultWidth = "calc(16.666% - 0.4vw)"; 
    // This matches the flex basis of movie-card-container on desktop
    defaultHeight = "22vw"; // Approximate 2:3 aspect ratio based on width
  } else if (type === "banner") {
    variant = "rectangular";
    defaultWidth = "100%";
    defaultHeight = "75vh";
  } else if (type === "title") {
    variant = "text";
    defaultWidth = "40%";
    defaultHeight = 40;
  }

  return (
    <Skeleton
      variant={variant}
      width={width || defaultWidth}
      height={height || defaultHeight}
      animation="wave"
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: type === "card" ? '4px' : undefined,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
