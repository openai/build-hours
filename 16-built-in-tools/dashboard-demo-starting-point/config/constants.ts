export const MODEL = "gpt-4.1";

// Developer prompt for the assistant
export const DEVELOPER_PROMPT = `
You are a helpful assistant helping users with their queries about their data.
When looking at Stripe values, keep in mind they are in cents (you need to divide by 100 to get the EUR amount).
Only use web search when asked for external data, when asked about online sales look at Stripe data and when asked about physical sales look at data from the sales details export.
`;

// Initial message that will be displayed in the chat
export const INITIAL_MESSAGE = `
What do you want to visualize?
`;
