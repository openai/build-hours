// src/theme.js

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  spacing: 8, // Default spacing unit
  palette: {
    primary: {
      main: '#1976d2', // Customize as needed
    },
    secondary: {
      main: '#9c27b0', // Customize as needed
    },
    success: {
      main: '#4caf50', // Customize as needed
    },
    background: {
      default: '#fafafa', // Light background
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif', // Modern font
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none', // Prevent uppercase text
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#f9f9f9',
        },
      },
    },
  },
});

export default theme;