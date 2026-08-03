"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { usePrice } from "@/hooks/use-price";
interface OverviewProps {
  data: { name: string; totalMinor: number }[];
}

export function Overview({ data }: OverviewProps) {
  const { formatPrice } = usePrice();

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${formatPrice(value)}`}
        />
        <Bar dataKey="totalMinor" fill="#adfa1d" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
