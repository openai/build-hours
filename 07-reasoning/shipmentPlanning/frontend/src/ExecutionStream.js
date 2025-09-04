// src/components/ExecutionStream.js

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import AssistantIcon from '@mui/icons-material/Person';
import FunctionIcon from '@mui/icons-material/Build';
import ResponseIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import StatusIcon from '@mui/icons-material/Info';

function ExecutionStream({ messages }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame to defer the scroll
    const rafId = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(rafId);
  }, [messages, scrollToBottom]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Fill parent container
        position: 'relative',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Execution Stream
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          padding: '16px',
          flexGrow: 1,
          overflowY: 'auto', // Enable vertical scrolling
          overflowX: 'hidden', // Prevent horizontal scrolling
          wordBreak: 'break-word', // Break long words to prevent overflow
          height: '100%', // Fill parent container
          boxSizing: 'border-box',
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body1" color="textSecondary">
            No execution messages to display.
          </Typography>
        ) : (
          <List>
            {messages.map((msg, index) => {
              // Skip assistant messages with empty content
              if (msg.type === 'assistant' && (!msg.content || msg.content.trim() === '')) {
                return null;
              }

              switch (msg.type) {
                case 'assistant':
                  return (
                    <ListItem key={index} alignItems="flex-start">
                      <ListItemIcon>
                        <AssistantIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={msg.content}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  );
                case 'tool_call':
                  // Parse the arguments string
                  let argumentsObj;
                  try {
                    argumentsObj = JSON.parse(msg.arguments);
                  } catch (error) {
                    console.error('Error parsing function call arguments:', error);
                    argumentsObj = msg.arguments; // Fallback to raw string
                  }

                  return (
                    <ListItem key={index} alignItems="flex-start">
                      <ListItemIcon>
                        <FunctionIcon color="secondary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <>
                            <Typography variant="body2">
                              <strong>Function Call:</strong> {msg.function_name}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Arguments:</strong>
                            </Typography>
                            {typeof argumentsObj === 'object' ? (
                              <Box component="ul" sx={{ pl: 2 }}>
                                {Object.entries(argumentsObj).map(([key, value]) => (
                                  <li key={key}>
                                    <Typography variant="body2">
                                      <strong>{key}:</strong> {JSON.stringify(value)}
                                    </Typography>
                                  </li>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2">{argumentsObj}</Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  );
                case 'tool_response':
                  // Parse the response string
                  let responseObj;
                  try {
                    responseObj = JSON.parse(msg.response);
                  } catch (error) {
                    console.error('Error parsing function response:', error);
                    responseObj = msg.response; // Fallback to raw string
                  }

                  return (
                    <ListItem key={index} alignItems="flex-start">
                      <ListItemIcon>
                        <ResponseIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <>
                            <Typography variant="body2">
                              <strong>Function Response:</strong> {msg.function_name}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Response:</strong>
                            </Typography>
                            {typeof responseObj === 'object' ? (
                              <TableContainer component={Box} sx={{ pl: 2 }}>
                                <Table size="small">
                                  <TableBody>
                                    {Object.entries(responseObj).map(([key, value]) => (
                                      <TableRow key={key}>
                                        <TableCell component="th" scope="row">
                                          <Typography variant="body2">
                                            <strong>{key}:</strong>
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2">
                                            {JSON.stringify(value)}
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Typography variant="body2">{responseObj}</Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  );
                case 'error':
                  return (
                    <ListItem key={index} alignItems="flex-start">
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={msg.message}
                        primaryTypographyProps={{ color: 'error' }}
                      />
                    </ListItem>
                  );
                case 'status':
                  return (
                    <ListItem key={index} alignItems="flex-start">
                      <ListItemIcon>
                        <StatusIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={msg.message}
                        primaryTypographyProps={{ color: 'textSecondary' }}
                      />
                    </ListItem>
                  );
                default:
                  return null;
              }
            })}
            {/* Dummy div to anchor the scroll */}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default ExecutionStream;