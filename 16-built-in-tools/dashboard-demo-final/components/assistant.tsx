"use client";
import React from "react";
import Chat from "./chat";
import useConversationStore from "@/stores/useConversationStore";
import { Item, processMessages } from "@/lib/assistant";

export default function Assistant() {
  const { chatMessages, addChatMessage, setAssistantLoading } =
    useConversationStore();

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };
    const userMessage: any = {
      role: "user",
      content: message.trim(),
    };

    try {
      setAssistantLoading(true);
      addChatMessage(userItem);
      await processMessages([userMessage]);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  const handleApprovalResponse = async (approve: boolean, id: string) => {
    const approvalItem = {
      type: "mcp_approval_response",
      approve,
      approval_request_id: id,
    } as any;
    try {
      await processMessages([approvalItem]);
    } catch (error) {
      console.error("Error sending approval response:", error);
    }
  };

  return (
    <Chat
      items={chatMessages}
      onSendMessage={handleSendMessage}
      onApprovalResponse={handleApprovalResponse}
    />
  );
}
