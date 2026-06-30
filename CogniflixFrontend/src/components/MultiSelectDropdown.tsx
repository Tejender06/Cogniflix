import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  alpha,
} from "@mui/material";
import { ChevronDown } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: MultiSelectDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }
    onChange([...selected, option]);
  };

  return (
    <Box>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        endIcon={<ChevronDown size={16} />}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        sx={{
          minWidth: 116,
          justifyContent: "space-between",
          borderColor: alpha("#fff", 0.18),
          color: "text.primary",
          bgcolor: alpha("#000", 0.32),
          backdropFilter: "blur(14px)",
          px: 1.25,
          "&:hover": {
            borderColor: alpha("#fff", 0.42),
            bgcolor: alpha("#fff", 0.08),
          },
        }}
      >
        <Typography component="span" variant="caption" sx={{ fontWeight: 800 }} noWrap>
          {selected.length > 0 ? `${label} (${selected.length})` : label}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 230,
              maxHeight: 340,
              bgcolor: alpha("#07070b", 0.96),
              border: `1px solid ${alpha("#fff", 0.12)}`,
              backdropFilter: "blur(18px)",
            }
          }
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            onClick={() => toggleOption(option)}
            dense
            sx={{
              gap: 1,
              minHeight: 42,
              "&.Mui-selected": {
                bgcolor: alpha("#e50914", 0.18),
              },
            }}
          >
            <Checkbox
              edge="start"
              size="small"
              checked={selected.includes(option)}
              tabIndex={-1}
              disableRipple
            />
            <ListItemText
              primary={<Typography variant="body2" sx={{ fontWeight: 650 }}>{option}</Typography>}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

