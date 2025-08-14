"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import useDataStore from "@/stores/useDataStore";

export function ChartAreaInteractive() {
  const { chartData } = useDataStore();

  const chartConfig = {
    title: {
      label: chartData.config.title ?? "Chart",
    },
    value1: {
      label: chartData.config.value1.label ?? "Value",
      color: "hsl(var(--chart-1))",
    },
    value2: {
      label: chartData.config.value2?.label ?? "Value 2",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  if (chartData.data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardTitle>{chartData.config.title || "Chart"}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <div className="text-muted-foreground">No data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <CardTitle>{chartData.config.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData.data}>
            <defs>
              <linearGradient id="fillValue1" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value1)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value1)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              {chartData.config.value2 && (
                <linearGradient id="fillValue2" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-value2)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value2)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value1"
              type="natural"
              fill="url(#fillValue1)"
              stroke="var(--color-value1)"
              stackId="a"
            />
            {chartData.config.value2 && (
              <Area
                dataKey="value2"
                type="natural"
                fill="url(#fillValue2)"
                stroke="var(--color-value2)"
                stackId="a"
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
