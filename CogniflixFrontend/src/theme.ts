import { alpha, createTheme } from "@mui/material/styles";

const brandRed = "#e50914";
const brandPink = "#ff3d71";
const ink = "#07070b";
const panel = "#111118";

export const cogniflixTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: brandRed,
      light: brandPink,
      dark: "#9f0610",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#2dd4bf",
      light: "#67e8f9",
      dark: "#0f766e",
      contrastText: "#031312",
    },
    background: {
      default: ink,
      paper: panel,
    },
    text: {
      primary: "#f8fafc",
      secondary: "#a9b0bc",
    },
    success: {
      main: "#22c55e",
    },
    warning: {
      main: "#facc15",
    },
    divider: alpha("#ffffff", 0.1),
  },
  typography: {
    fontFamily: "'Outfit', 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontWeight: 800,
      lineHeight: 1.02,
    },
    h2: {
      fontWeight: 800,
      lineHeight: 1.08,
    },
    h3: {
      fontWeight: 800,
      lineHeight: 1.12,
    },
    h4: {
      fontWeight: 750,
      lineHeight: 1.18,
    },
    h5: {
      fontWeight: 700,
      lineHeight: 1.22,
    },
    h6: {
      fontWeight: 700,
      lineHeight: 1.25,
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: "smooth",
          backgroundColor: ink,
        },
        body: {
          minWidth: 0,
          overflowX: "hidden",
          background:
            "linear-gradient(180deg, #060608 0%, #0b0b10 42%, #08080c 100%)",
        },
        "#root": {
          minHeight: "100vh",
        },
        "*": {
          boxSizing: "border-box",
        },
        "button, input, textarea, select": {
          font: "inherit",
        },
        "::-webkit-scrollbar": {
          width: 10,
          height: 10,
          backgroundColor: "#08080c",
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: alpha("#ffffff", 0.2),
          borderRadius: 999,
          border: "2px solid #08080c",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          minHeight: 40,
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            boxShadow: `0 18px 38px ${alpha(brandRed, 0.35)}`,
            "&:hover": {
              boxShadow: `0 22px 50px ${alpha(brandRed, 0.45)}`,
            },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 700,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: alpha("#050507", 0.94),
          border: `1px solid ${alpha("#ffffff", 0.12)}`,
          fontSize: 12,
        },
      },
    },
  },
});

export const glassSurface = {
  background: alpha("#111118", 0.74),
  border: `1px solid ${alpha("#ffffff", 0.1)}`,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

