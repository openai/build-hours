"use client";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import useDataStore, { CardItem } from "@/stores/useDataStore";
import { Skeleton } from "./ui/skeleton";

function CardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader className="relative space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-7 w-2/3" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <Skeleton className="h-4 w-1/2" />
      </CardFooter>
    </Card>
  );
}

function CardComponent({ title, value, description }: CardItem) {
  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="text-muted-foreground">{description}</div>
      </CardFooter>
    </Card>
  );
}

export function SectionCards() {
  const { cardItems } = useDataStore();
  const placeholders = new Array(4).fill(null);
  return (
    <div className="*:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      {placeholders.map((_, idx) => {
        const item = cardItems[idx];
        return item ? (
          <CardComponent key={"card" + idx} {...item} />
        ) : (
          <CardSkeleton key={"skeleton" + idx} />
        );
      })}
    </div>
  );
}
