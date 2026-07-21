# 气象数据监测平台

基于 React、TypeScript、Tailwind CSS、ECharts 和 Next.js 构建的实时气象数据监测网站。天气与地点数据来自 Open-Meteo 开放 API。

## 功能

- 实时温度、湿度、降水量、风速和气压
- 地点搜索和手动刷新
- 近 6 小时、24 小时、3 天、7 天及自定义时间范围
- 多参数图表切换与悬停提示
- 统计数据和分页明细表格
- CSV 与 Excel (.xlsx) 下载
- 桌面端和移动端响应式布局

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 构建

```bash
npm run build
npm start
```

本项目不需要数据库，也不需要天气 API Key，但运行时需要访问 Open-Meteo 服务。
