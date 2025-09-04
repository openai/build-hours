// src/App.js

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Box,
  Grid,
  Snackbar,
  Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import ScenarioInput from './ScenarioInput';
import PlanDisplay from './PlanDisplay';
import ExecutionStream from './ExecutionStream';
import { styled } from '@mui/material/styles';
import shippingLogo from './assets/logos/shippingLogo.jpg'; // Ensure logo is in src/assets/logos/

// Styled component for the logo image
const Logo = styled('img')({
  height: '40px',
  marginRight: '16px',
});

function App() {
  const [scenario, setScenario] = useState('');
  const [plan, setPlan] = useState('');
  const [executionMessages, setExecutionMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false); // State for loading spinner
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleScenarioSubmit = async (inputScenario) => {
    setScenario(inputScenario);
    setIsProcessing(true);
    setIsGeneratingPlan(true); // Show loading spinner
    setPlan('');
    setExecutionMessages([]);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: inputScenario }),
      });

      const data = await response.json();

      if (data.error) {
        setErrorMessage(data.error);
        setIsProcessing(false);
        setIsGeneratingPlan(false);
        return;
      }

      // Corrected EventSource URL (single slash)
      const eventSource = new EventSource('http://localhost:5000/api/stream');

      eventSource.onmessage = (e) => {
        console.log('Received message:', e.data);
        const message = JSON.parse(e.data);

        if (message.type === 'plan') {
          setPlan((prevPlan) => prevPlan + '\n' + message.content);
          setIsGeneratingPlan(false); // Hide loading spinner
        } else if (
          message.type === 'assistant' ||
          message.type === 'function_call' ||
          message.type === 'tool_call' ||
          message.type === 'tool_response' ||
          message.type === 'error'
        ) {
          setExecutionMessages((prevMessages) => [...prevMessages, message]);
        } else if (message.type === 'status') {
          setExecutionMessages((prevMessages) => [
            ...prevMessages,
            { ...message, isStatus: true },
          ]);
        }

        if (message.message === 'Processing complete.') {
          eventSource.close();
          setIsProcessing(false);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        eventSource.close();
        setIsProcessing(false);
        setIsGeneratingPlan(false);
        setErrorMessage('An error occurred while processing the scenario.');
      };
    } catch (error) {
      console.error('Error:', error);
      setIsProcessing(false);
      setIsGeneratingPlan(false);
      setErrorMessage('An error occurred while submitting the scenario.');
    }
  };

  useEffect(() => {
    // Reset the backend state when the component mounts (page loads)
    fetch('/api/reset', {
      method: 'POST',
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data.status); // Optional: Log the response
      })
      .catch((error) => {
        console.error('Error resetting state:', error);
      });
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* App Bar */}
      <AppBar
        position="fixed"
        color="primary"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          {/* Menu Icon for Side Drawer */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          {/* Logo */}
          <Logo src={shippingLogo} alt="Shipping Logo" />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
            }}
          >
            ShipCo Logistics Planner
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              transition: 'background-color 0.3s ease',
              '&:hover': {
                backgroundColor: 'secondary.dark',
              },
            }}
          >
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
        <List sx={{ width: 250 }}>
          <ListItem button>
            <ListItemIcon>
              <DashboardIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          {/* Add more navigation items as needed */}
          <ListItem button>
            <ListItemIcon>
              <SettingsIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 8, // Offset for the fixed AppBar height
          mb: 4, // Space for the footer
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Scenario Input */}
          <Box sx={{ width: '100%', px: 4, py: 3 }}>
            <ScenarioInput onSubmit={handleScenarioSubmit} isProcessing={isProcessing} />
          </Box>

          {/* Execution Stream and Plan Display */}
          <Box sx={{ width: '100%', px: 4, pb: 3, flexGrow: 1 }}>
            <Grid container spacing={3} sx={{ height: '100%' }}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    height: 'calc(70vh - 100px)', // Increased height by approximately 20%
                  }}
                >
                  <PlanDisplay plan={plan} isGeneratingPlan={isGeneratingPlan} />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    height: 'calc(70vh - 100px)', // Increased height accordingly
                  }}
                >
                  <ExecutionStream messages={executionMessages} />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          backgroundColor: '#f0f0f0',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="textSecondary">
          © {new Date().getFullYear()} High-Tech Shipping Company. All rights reserved.
        </Typography>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorMessage('')}
          severity="error"
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );

}

export default App;