// src/ScenarioInput.js

import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

function ScenarioInput({ onSubmit, isProcessing }) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    if (!inputText.trim()) {
      alert('Please enter a scenario.');
      return;
    }
    onSubmit(inputText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents a new line in the textarea
      handleSubmit();
    }
  };

  return (
    <Box mb={4} width="100%" px={2} pt={2}>
      <TextField
        label="Scenario"
        multiline
        fullWidth
        minRows={6}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter your scenario here..."
        disabled={isProcessing}
        variant="outlined"
        InputProps={{ style: { fontSize: 16 } }}
      />
      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isProcessing}
          size="large"
        >
          {isProcessing ? 'Processing...' : 'Submit'}
        </Button>
      </Box>
    </Box>
  );
}

export default ScenarioInput;