import React from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function PlanDisplay({ plan, isGeneratingPlan }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Keep fixed height
      }}
    >
      <Typography variant="h6" gutterBottom>
        Generated Plan
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          padding: '24px',
          flexGrow: 1,
          overflowY: 'auto', // Enable vertical scrolling
          overflowX: 'hidden', // Prevent horizontal scrolling
          wordBreak: 'break-word', // Break long words
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isGeneratingPlan ? (
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={40} />
          </Box>
        ) : plan ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <Typography
                  variant="h5" // Decreased font size
                  gutterBottom
                  {...props}
                  sx={{ mt: 3, mb: 2 }}
                />
              ),
              h2: ({ node, ...props }) => (
                <Typography
                  variant="h6" // Decreased font size
                  gutterBottom
                  {...props}
                  sx={{ mt: 2.5, mb: 1.5 }}
                />
              ),
              h3: ({ node, ...props }) => (
                <Typography
                  variant="subtitle1" // Decreased font size
                  gutterBottom
                  {...props}
                  sx={{ mt: 2, mb: 1 }}
                />
              ),
              p: ({ node, ...props }) => (
                <Typography
                  variant="body2" // Decreased font size
                  paragraph
                  {...props}
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    mb: 2,
                    lineHeight: 1.6,
                  }}
                />
              ),
              ol: ({ node, ...props }) => (
                <Box
                  component="ol"
                  sx={{
                    listStyleType: 'decimal', // Proper numbering
                    paddingInlineStart: '20px',
                    mb: 2,
                    lineHeight: 1.6,
                  }}
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <Box
                  component="ul"
                  sx={{
                    listStyleType: 'disc', // Bullet list for unordered
                    paddingInlineStart: '20px',
                    mb: 2,
                    lineHeight: 1.6,
                  }}
                  {...props}
                />
              ),
              li: ({ node, ordered, ...props }) => (
                <Typography
                  component="li"
                  variant="body2" // Decreased font size
                  {...props}
                  sx={{
                    listStyleType: ordered ? 'decimal' : 'disc',
                    ml: ordered ? 3 : 2, // Reduce margin-left for nested lists
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'normal', // Let the browser handle line breaks naturally
                    mb: 1,
                    lineHeight: 1.6,
                  }}
                />
              ),
              code: ({ node, inline, className, children, ...props }) => {
                const language = className?.replace('language-', '') || '';
                return inline ? (
                  <Box
                    component="code"
                    sx={{
                      backgroundColor: 'rgba(27,31,35,0.05)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontFamily: 'Roboto Mono, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    {...props}
                  >
                    {children}
                  </Box>
                ) : (
                  <Box
                    component="pre"
                    sx={{
                      backgroundColor: '#f0f0f0',
                      padding: '16px',
                      borderRadius: '4px',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      mb: 3,
                    }}
                    {...props}
                  >
                    <Typography
                      component="code"
                      sx={{
                        fontFamily: 'Roboto Mono, monospace',
                        fontSize: '0.75rem', // Decreased font size
                      }}
                    >
                      {children}
                    </Typography>
                  </Box>
                );
              },
              blockquote: ({ node, ...props }) => (
                <Box
                  component="blockquote"
                  sx={{
                    borderLeft: '4px solid #ccc',
                    paddingLeft: '16px',
                    color: '#666',
                    fontStyle: 'italic',
                    marginY: '20px',
                  }}
                  {...props}
                />
              ),
              table: ({ node, ...props }) => (
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    my: 3,
                  }}
                  {...props}
                />
              ),
              th: ({ node, ...props }) => (
                <Box
                  component="th"
                  sx={{
                    border: '1px solid #ccc',
                    padding: '10px',
                    textAlign: 'left',
                    backgroundColor: '#e0e0e0',
                    fontWeight: 'bold',
                  }}
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <Box
                  component="td"
                  sx={{
                    border: '1px solid #ccc',
                    padding: '10px',
                    textAlign: 'left',
                  }}
                  {...props}
                />
              ),
              a: ({ node, ...props }) => (
                <Typography
                  component="a"
                  variant="body2" // Decreased font size
                  color="primary"
                  {...props}
                  sx={{ textDecoration: 'underline', '&:hover': { textDecoration: 'none' } }}
                />
              ),
              img: ({ node, ...props }) => (
                <Box
                  component="img"
                  {...props}
                  sx={{
                    maxWidth: '100%',
                    height: 'auto',
                    my: 2,
                  }}
                />
              ),
            }}
          >
            {plan}
          </ReactMarkdown>
        ) : (
          <Typography variant="body1" color="textSecondary">
            No plan to display.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default PlanDisplay;