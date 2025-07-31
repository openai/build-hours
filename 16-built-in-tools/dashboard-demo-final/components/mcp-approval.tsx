"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { McpApprovalRequestItem } from "@/lib/assistant";

interface Props {
  item: McpApprovalRequestItem;
  onRespond: (approve: boolean, id: string) => void;
}

export default function McpApproval({ item, onRespond }: Props) {
  const [disabled, setDisabled] = useState(false);

  const handle = (approve: boolean) => {
    setDisabled(true);
    onRespond(approve, item.id);
  };

  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="mr-4 rounded-[16px] p-4 md:mr-24 text-black font-light">
          <div className="mb-2 text-sm">
            Request to execute tool{" "}
            <span className="font-medium">{item.name}</span> on server{" "}
            <span className="font-medium">{item.server_label}</span>.
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={disabled} onClick={() => handle(true)}>
              Approve
            </Button>
            <Button
              size="sm"
              disabled={disabled}
              onClick={() => handle(false)}
              className="bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800"
            >
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
