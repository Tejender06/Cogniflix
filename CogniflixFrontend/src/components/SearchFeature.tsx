import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Popper,
  Typography,
  alpha,
} from "@mui/material";
import { Clock, Search, Sparkles, X } from "lucide-react";
import { searchMovies } from "../services/movieService";
import type { Movie } from "../services/movieService";

const RECENT_SEARCH_KEY = "cogniflix_recent_searches";
const TRENDING_SEARCHES = ["mind bending sci-fi", "feel good comedy", "Kannada thrillers", "weekend action", "romantic drama"];

function getRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const normalized = query.trim();
  if (!normalized) return;
  const next = [normalized, ...getRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
}

export default function SearchFeature() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const navigate = useNavigate();
  const location = useLocation();

  const open = Boolean(anchorEl) && (searchQuery.length > 0 || recentSearches.length > 0);
  const suggestions = useMemo(() => {
    const current = searchQuery.trim().toLowerCase();
    return TRENDING_SEARCHES.filter((item) => !current || item.includes(current)).slice(0, 4);
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery("");
    setSearchResults([]);
    setAnchorEl(null);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    const delayDebounceFn = window.setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length < 2) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await searchMovies(query);
        if (!cancelled) {
          setSearchResults((res.results || []).slice(0, 6));
        }
      } catch (error) {
        console.error("Search error:", error);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(delayDebounceFn);
    };
  }, [searchQuery]);

  const runSearch = (query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    saveRecentSearch(normalized);
    setRecentSearches(getRecentSearches());
    setSearchQuery("");
    setSearchResults([]);
    setAnchorEl(null);
    navigate(`/movies?search=${encodeURIComponent(normalized)}`);
  };

  const handleResultClick = (movie: Movie) => {
    saveRecentSearch(movie.title);
    setRecentSearches(getRecentSearches());
    setSearchQuery("");
    setSearchResults([]);
    setAnchorEl(null);
    navigate(`/movie/${movie.id}`, { state: { movie } });
  };

  return (
    <Box sx={{ position: "relative", width: { xs: 172, sm: 260, md: 320 } }}>
      <Paper
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(searchQuery);
        }}
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          height: 42,
          px: 1,
          bgcolor: alpha("#000", 0.36),
          border: `1px solid ${alpha("#fff", 0.16)}`,
          backdropFilter: "blur(16px)",
          transition: "border-color 180ms ease, background-color 180ms ease",
          "&:focus-within": {
            borderColor: alpha("#fff", 0.48),
            bgcolor: alpha("#000", 0.68),
          },
        }}
      >
        <Search size={18} aria-hidden />
        <InputBase
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={(event) => setAnchorEl(event.currentTarget)}
          placeholder="Search titles, genres, moods"
          inputProps={{ "aria-label": "Search Cogniflix" }}
          sx={{ flex: 1, color: "text.primary", fontSize: 14 }}
        />
        {loading && <CircularProgress size={16} color="inherit" />}
        {searchQuery && (
          <IconButton size="small" aria-label="Clear search" onClick={() => setSearchQuery("")}>
            <X size={16} />
          </IconButton>
        )}
      </Paper>

      <Popper open={open} anchorEl={anchorEl} placement="bottom-end" sx={{ zIndex: 1500 }}>
        <Paper
          elevation={12}
          sx={{
            mt: 1,
            width: { xs: 320, sm: 420 },
            maxWidth: "calc(100vw - 24px)",
            overflow: "hidden",
            bgcolor: alpha("#08080c", 0.98),
            border: `1px solid ${alpha("#fff", 0.12)}`,
            backdropFilter: "blur(20px)",
          }}
        >
          {searchResults.length > 0 && (
            <List dense disablePadding>
              {searchResults.map((movie) => (
                <ListItemButton key={movie.id} onMouseDown={() => handleResultClick(movie)}>
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      src={movie.poster_url}
                      alt={movie.title}
                      sx={{ width: 44, height: 64, mr: 1 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 800 }}>{movie.title}</Typography>}
                    secondary={<Typography variant="body2" color="text.secondary" noWrap>{[movie.genre?.split(",")[0], movie.language, movie.recommendation_reason].filter(Boolean).join(" | ")}</Typography>}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          <Box sx={{ p: 1.5 }}>
            {recentSearches.length > 0 && (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Clock size={15} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    Recent searches
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {recentSearches.map((item) => (
                    <Chip key={item} size="small" label={item} onClick={() => runSearch(item)} />
                  ))}
                </Box>
              </>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sparkles size={15} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                AI search prompts
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
              {suggestions.map((item) => (
                <Chip key={item} size="small" color="primary" variant="outlined" label={item} onClick={() => runSearch(item)} />
              ))}
            </Box>
          </Box>
        </Paper>
      </Popper>
    </Box>
  );
}

