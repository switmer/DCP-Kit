import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5', 
      dark: '#1565c0',
      contrastText: '#fff'
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036'
    },
    background: {
      default: '#fafafa',
      paper: '#fff'
    }
  },
  spacing: 8,
  typography: {
    h1: {
      fontSize: '2.125rem',
      fontWeight: 400,
      lineHeight: 1.235
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.334  
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5
    }
  }
});

export default theme;