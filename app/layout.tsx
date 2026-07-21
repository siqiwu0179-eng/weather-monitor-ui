import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "气象数据监测平台",
  description: "实时查看温度、湿度、降水、风速和气压变化，支持时间筛选以及 CSV 和 Excel 下载。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
