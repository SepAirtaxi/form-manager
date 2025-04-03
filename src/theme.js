// src/theme.js
import { createMuiTheme, responsiveFontSizes } from '@material-ui/core/styles';

// Create a custom theme with the new primary color #0064B2
const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#0064B2',
      light: '#3d86c6',
      dark: '#004481',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  overrides: {
    MuiButton: {
      root: {
        borderRadius: 4,
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)',
        },
      },
    },
    MuiPaper: {
      rounded: {
        borderRadius: 8,
      },
      elevation1: {
        boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
      },
    },
  },
});

// Make the typography responsive
const responsiveTheme = responsiveFontSizes(theme);

export default responsiveTheme;