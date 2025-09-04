'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart } from 'recharts'
import { LabelList } from 'recharts'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart'
import Image from 'next/image'
import React from 'react'

interface Component {
  name: string
  data: any[]
  content: any
  children?: Component[]
}

const chartColors = [
  '#1A535C',
  '#FF6B6B',
  '#FFE66D',
  '#4ECDC4',
  '#D68C45',
  '#8675A9',
  '#00a2ff',
  '#98DBC6',
  '#C492B1',
  '#A59E8C',
  '#375E42'
]

const formatKey = (key: string) =>
  key.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')

const getChartConfig = (data: any) => {
  const config: ChartConfig = {}
  if (data?.length > 0) {
    data.forEach((item: any, index: number) => {
      config[formatKey(item.label)] = {
        label: item.label,
        color: '#ffffff'
      }
    })
  }

  return config
}

const getChartData = (data: any) => {
  return data?.map((item: any, index: number) => ({
    id: formatKey(item.label),
    label: item.label,
    value: parseFloat(item.value),
    fill: chartColors[index % chartColors.length]
  }))
}

export const getComponent = (component: Component) => {
  const content = component?.content
  const chartData = getChartData(component?.data)
  const chartConfig = getChartConfig(chartData)

  switch (component.name) {
    case 'header':
      return (
        <div>
          <h1 className="text-xl text-stone-900 font-bold pt-2 pb-1">
            {content}
          </h1>
        </div>
      )
    case 'card':
      return (
        <Card>
          <CardContent>
            {content !== '' ? (
              <p className="text-stone-700">{content}</p>
            ) : null}
            {component.children ? (
              <div className="grid grid-cols-3 gap-4 p-4 mt-2">
                {component.children.map((child: any, index: number) => {
                  return (
                    <React.Fragment key={index}>
                      {getComponent(child.component)}
                    </React.Fragment>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )
    case 'item':
      return (
        <Card>
          <CardHeader>
            <p className="text-stone-700">{component.content.title}</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Image
                src={component.content.primary_image}
                alt={component.content.title}
                width={128}
                height={128}
                className="w-32 h-32 object-cover mb-4"
              />
              <p className="text-stone-700">Price: {component.content.price}</p>
              <p className="text-stone-700">
                Categories: {component.content.categories.join(', ')}
              </p>
              <p className="text-stone-700">Color: {component.content.color}</p>
              <p className="text-stone-700">Style: {component.content.style}</p>
            </div>
          </CardContent>
        </Card>
      )
    case 'pie_chart':
      return (
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square pb-0 [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="label" />
            <ChartLegend
              content={<ChartLegendContent nameKey="id" />}
              className="-translate-y-2 mb-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      )
    case 'bar_chart':
      return (
        <Card className="flex flex-col">
          {content.title && (
            <CardHeader className="items-center">
              <CardTitle>{content.title}</CardTitle>
            </CardHeader>
          )}
          <CardContent className="flex-1">
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={value => value.slice(0, 7)}
                />
                <Bar dataKey="value" fill={chartColors[0]} radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )

    default:
      return null
  }
}
