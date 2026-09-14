import { Box, List, ListItemButton, ListItemText, Typography, Stack } from '@mui/material'

export default function CategorySidebar({ selected, onSelect, categories = [] }) {
  return (
    <Box>
      <List disablePadding>
        {categories.map((cat) => {
          const name = cat.name ?? cat
          const count = cat.count ?? 0
          const isSelected = selected === name

          return (
            <ListItemButton
              key={name}
              selected={isSelected}
              onClick={() => onSelect(name)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(0,131,143,0.08)',
                  color: 'info.main',
                  borderLeft: '3px solid',
                  borderColor: 'info.main',
                  '&:hover': { bgcolor: 'rgba(0,131,143,0.12)' },
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemText
                primary={name}
                primaryTypographyProps={{
                  fontSize: '0.88rem',
                  fontWeight: isSelected ? 700 : 500,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: isSelected ? 'info.main' : 'text.secondary',
                  opacity: isSelected ? 1 : 0.65,
                  flexShrink: 0,
                }}
              >
                {count}
              </Typography>
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )
}