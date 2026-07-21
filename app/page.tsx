"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  CloudSun,
  Database,
  Download,
  Droplets,
  Gauge,
  History,
  House,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  Thermometer,
  Wind,
  X,
} from "lucide-react";

type WeatherPoint = {
  time: Date;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  pressure: number;
};

type CurrentWeather = Omit<WeatherPoint, "time"> & {
  time: string;
  apparentTemperature: number;
};

type WeatherApiResponse = {
  source: string;
  location: { label: string; latitude: number; longitude: number; timezone?: string };
  current: CurrentWeather | null;
  hourly: Array<{
    time: string;
    temperature: number | null;
    humidity: number | null;
    rainfall: number | null;
    windSpeed: number | null;
    pressure: number | null;
  }>;
};

type MetricKey = "temperature" | "humidity" | "rainfall" | "windSpeed" | "pressure";

const HOUR = 60 * 60 * 1000;
const PAGE_SIZE = 8;
const DEFAULT_END = "2026-07-21T12:00";
const DEFAULT_START = "2026-07-20T12:00";
const DEFAULT_UPDATED_AT = "2026-07-21 12:00:00";

const metricConfig: Record<MetricKey, { label: string; unit: string; color: string }> = {
  temperature: { label: "温度", unit: "°C", color: "#ff5b67" },
  humidity: { label: "湿度", unit: "%", color: "#27b56b" },
  rainfall: { label: "降水量", unit: "mm", color: "#3788f4" },
  windSpeed: { label: "风速", unit: "m/s", color: "#7c4dff" },
  pressure: { label: "气压", unit: "hPa", color: "#f59e0b" },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

function formatDateTime(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:00`;
}

function parseInputValue(value: string) {
  return new Date(`${value}:00.000Z`);
}

function formatUpdated(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function WeatherChart({ data, visible }: { data: WeatherPoint[]; visible: Record<MetricKey, boolean> }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const times = data.map((item) => formatDateTime(item.time));
    const series = (Object.keys(metricConfig) as MetricKey[])
      .filter((key) => visible[key])
      .map((key) => ({
        name: `${metricConfig[key].label} (${metricConfig[key].unit})`,
        type: "line" as const,
        smooth: 0.3,
        showSymbol: data.length <= 48,
        symbolSize: 5,
        yAxisIndex: key === "humidity" ? 1 : key === "pressure" ? 2 : 0,
        data: data.map((item) => item[key]),
        lineStyle: { width: 2, color: metricConfig[key].color },
        itemStyle: { color: metricConfig[key].color },
        areaStyle:
          key === "rainfall"
            ? { color: "rgba(55, 136, 244, .10)" }
            : undefined,
      }));

    chart.setOption({
      animationDuration: 450,
      color: Object.values(metricConfig).map((item) => item.color),
      grid: { left: 50, right: 58, top: 26, bottom: data.length > 72 ? 66 : 42 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,.97)",
        borderColor: "#dce6f4",
        textStyle: { color: "#203253", fontSize: 12 },
        extraCssText: "box-shadow:0 12px 30px rgba(35,65,115,.14);border-radius:10px",
        axisPointer: { type: "line", lineStyle: { color: "#8fb6ea", type: "dashed" } },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: times,
        axisLabel: {
          color: "#71819d",
          formatter: (value: string) => value.slice(5),
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: "#dce6f4" } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: "value",
          name: "温度 / 降水 / 风速",
          nameTextStyle: { color: "#8290a9", fontSize: 11 },
          axisLabel: { color: "#71819d" },
          splitLine: { lineStyle: { color: "#edf2f8" } },
        },
        {
          type: "value",
          name: "湿度 (%)",
          min: 0,
          max: 100,
          position: "right",
          nameTextStyle: { color: "#8290a9", fontSize: 11 },
          axisLabel: { color: "#71819d" },
          splitLine: { show: false },
        },
        {
          type: "value",
          min: 995,
          max: 1025,
          show: false,
        },
      ],
      dataZoom:
        data.length > 72
          ? [
              { type: "inside", start: 0, end: Math.min(100, (72 / data.length) * 100) },
              { type: "slider", height: 17, bottom: 12, borderColor: "#dbe7f6", fillerColor: "rgba(32,122,246,.15)", handleStyle: { color: "#207af6" } },
            ]
          : [],
      series,
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data, visible]);

  return <div ref={chartRef} className="h-[330px] w-full sm:h-[390px]" role="img" aria-label="气象参数变化趋势折线图" />;
}

const navItems = [
  { label: "实时监测", icon: House, href: "#monitor" },
  { label: "历史数据", icon: History, href: "#filter" },
  { label: "数据图表", icon: ChartNoAxesCombined, href: "#chart" },
  { label: "数据下载", icon: Download, href: "#download" },
];

const locationOptions = [
  "北京市 · 海淀区",
  "上海市 · 浦东新区",
  "广州市 · 天河区",
  "深圳市 · 南山区",
  "成都市 · 武侯区",
];

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function getPaginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 3) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (totalPages === 4) return currentPage <= 2 ? [1, 2, 3] : [2, 3, 4];
  if (currentPage <= 2) return [1, 2, "ellipsis-end", totalPages];
  if (currentPage >= totalPages - 1) return [1, "ellipsis-start", totalPages - 1, totalPages];
  return [1, "ellipsis-start", currentPage, "ellipsis-end", totalPages];
}

export default function Home() {
  const [draftStart, setDraftStart] = useState(DEFAULT_START);
  const [draftEnd, setDraftEnd] = useState(DEFAULT_END);
  const [appliedRange, setAppliedRange] = useState({ start: DEFAULT_START, end: DEFAULT_END });
  const [data, setData] = useState<WeatherPoint[]>([]);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [activePreset, setActivePreset] = useState("24h");
  const [visible, setVisible] = useState<Record<MetricKey, boolean>>({
    temperature: true,
    humidity: true,
    rainfall: true,
    windSpeed: true,
    pressure: false,
  });
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState(DEFAULT_UPDATED_AT);
  const [location, setLocation] = useState(locationOptions[0]);
  const [locationDraft, setLocationDraft] = useState(locationOptions[0]);
  const [locationEditing, setLocationEditing] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const end = new Date();
    end.setMinutes(0, 0, 0);
    const start = new Date(end.getTime() - 24 * HOUR);
    const nextRange = { start: toInputValue(start), end: toInputValue(end) };
    setDraftStart(nextRange.start);
    setDraftEnd(nextRange.end);
    void loadWeather(nextRange.start, nextRange.end, locationOptions[0], { updateRange: true });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadWeather(appliedRange.start, appliedRange.end, location, { quiet: true });
    }, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [appliedRange.end, appliedRange.start, location]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return { maxTemperature: 0, minTemperature: 0, avgTemperature: 0, avgHumidity: 0, rainfall: 0, maxWind: 0 };
    }
    return {
      maxTemperature: Math.max(...data.map((item) => item.temperature)),
      minTemperature: Math.min(...data.map((item) => item.temperature)),
      avgTemperature: data.reduce((sum, item) => sum + item.temperature, 0) / data.length,
      avgHumidity: data.reduce((sum, item) => sum + item.humidity, 0) / data.length,
      rainfall: data.reduce((sum, item) => sum + item.rainfall, 0),
      maxWind: Math.max(...data.map((item) => item.windSpeed)),
    };
  }, [data]);

  async function loadWeather(
    start: string,
    end: string,
    locationQuery: string,
    options: { updateRange?: boolean; message?: string; quiet?: boolean } = {},
  ) {
    if (!options.quiet) setLoading(true);
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ start, end, location: locationQuery });
      const response = await fetch(`/api/weather?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as WeatherApiResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "天气数据加载失败");

      const points = payload.hourly.flatMap((item) => {
        if (
          typeof item.temperature !== "number" ||
          typeof item.humidity !== "number" ||
          typeof item.rainfall !== "number" ||
          typeof item.windSpeed !== "number" ||
          typeof item.pressure !== "number"
        ) return [];
        return [{
          time: parseInputValue(item.time),
          temperature: item.temperature,
          humidity: item.humidity,
          rainfall: item.rainfall,
          windSpeed: item.windSpeed,
          pressure: item.pressure,
        }];
      });
      if (points.length === 0) throw new Error("所选时间范围暂无可用天气数据");

      setData(points);
      setCurrentWeather(payload.current);
      setLocation(payload.location.label);
      setLocationDraft(payload.location.label);
      setUpdatedAt(formatUpdated(new Date()));
      setPage(1);
      if (options.updateRange) setAppliedRange({ start, end });
      if (options.message) {
        setNotice(options.message);
        window.setTimeout(() => setNotice(""), 2200);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "天气数据加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function applyLocation() {
    const nextLocation = locationDraft.trim();
    if (nextLocation) {
      void loadWeather(appliedRange.start, appliedRange.end, nextLocation, {
        message: nextLocation === location ? "地区天气已刷新" : `已切换至${nextLocation}`,
      });
    } else {
      setLocationDraft(location);
    }
    setLocationEditing(false);
  }

  function refreshData() {
    void loadWeather(appliedRange.start, appliedRange.end, location, { message: "气象数据已刷新" });
  }

  function choosePreset(id: string, hours?: number) {
    setActivePreset(id);
    if (!hours) return;
    const end = new Date();
    end.setMinutes(0, 0, 0);
    const start = new Date(end.getTime() - hours * HOUR);
    setDraftStart(toInputValue(start));
    setDraftEnd(toInputValue(end));
  }

  function queryData() {
    const start = parseInputValue(draftStart);
    const end = parseInputValue(draftEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setNotice("结束时间需晚于开始时间");
      return;
    }
    if (end.getTime() - start.getTime() > 31 * 24 * HOUR) {
      setNotice("单次最多查询 31 天");
      return;
    }
    void loadWeather(draftStart, draftEnd, location, { updateRange: true, message: "天气数据已更新" });
  }

  async function downloadData(format: "csv" | "xlsx") {
    setDownloadMenuOpen(false);
    const filename = `气象数据_${appliedRange.start.slice(0, 10)}_${appliedRange.end.slice(0, 10)}`;
    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(data.map((item) => ({
        "时间": formatDateTime(item.time),
        "温度 (°C)": item.temperature,
        "湿度 (%)": item.humidity,
        "降水量 (mm)": item.rainfall,
        "风速 (m/s)": item.windSpeed,
        "气压 (hPa)": item.pressure,
      })));
      worksheet["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 13 }, { wch: 13 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "气象数据");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      setNotice("Excel 文件已生成");
      window.setTimeout(() => setNotice(""), 2200);
      return;
    }

    const header = "时间,温度(°C),湿度(%),降水量(mm),风速(m/s),气压(hPa)";
    const rows = data.map((item) => [
      formatDateTime(item.time),
      item.temperature,
      item.humidity,
      item.rainfall,
      item.windSpeed,
      item.pressure,
    ].join(","));
    const blob = new Blob([`\ufeff${[header, ...rows].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("CSV 文件已生成");
    window.setTimeout(() => setNotice(""), 2200);
  }

  const cards = [
    { label: "当前温度", value: currentWeather?.temperature ?? "--", unit: "°C", note: currentWeather ? `体感 ${currentWeather.apparentTemperature.toFixed(1)}°C` : "正在获取实时数据", icon: Thermometer, color: "blue" },
    { label: "当前湿度", value: currentWeather?.humidity ?? "--", unit: "%", note: currentWeather ? (currentWeather.humidity < 75 ? "体感舒适" : "湿度偏高") : "正在获取实时数据", icon: Droplets, color: "green" },
    { label: "当前降水量", value: currentWeather?.rainfall ?? "--", unit: "mm", note: "当前 15 分钟", icon: CloudRain, color: "sky" },
    { label: "当前风速", value: currentWeather?.windSpeed ?? "--", unit: "m/s", note: currentWeather ? (currentWeather.windSpeed < 5.5 ? "微风 · 3级" : "和风 · 4级") : "正在获取实时数据", icon: Wind, color: "violet" },
    { label: "当前气压", value: currentWeather?.pressure ?? "--", unit: "hPa", note: "海平面气压", icon: Gauge, color: "orange" },
  ];

  return (
    <div id="monitor" className="min-h-screen bg-[#f5f8fd] text-[#172341]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e5edf7] bg-white/95 px-4 backdrop-blur lg:px-7">
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="打开导航">
            <Menu size={22} />
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#1473ef]"><CloudSun size={25} /></div>
          <h1 className="text-[18px] font-bold tracking-tight sm:text-[22px]">气象数据监测平台</h1>
        </div>
        <div className="hidden items-center gap-5 text-sm text-[#52617d] md:flex">
          {locationEditing ? (
            <div className="flex h-9 w-[220px] items-center gap-2 rounded-lg border border-[#76aaf0] bg-white px-2.5 shadow-[0_0_0_3px_rgba(39,119,233,.10)]">
              <MapPin size={16} className="shrink-0 text-[#1473ef]" />
              <input
                autoFocus
                list="location-suggestions"
                aria-label="搜索监测地区"
                value={locationDraft}
                onChange={(event) => setLocationDraft(event.target.value)}
                onBlur={applyLocation}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                placeholder="搜索或输入地区"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <datalist id="location-suggestions">
                {locationOptions.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
          ) : (
            <button
              onClick={() => {
                setLocationDraft(location);
                setLocationEditing(true);
              }}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-blue-50 hover:text-[#176edf]"
              aria-label={`搜索监测地区，当前为${location}`}
            >
              <MapPin size={16} className="shrink-0 text-[#1473ef]" />
              <span>{location}</span>
              <Search size={14} className="text-[#8a97aa] transition group-hover:text-[#176edf]" />
            </button>
          )}
          <span className="h-4 w-px bg-slate-200" />
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-blue-50 hover:text-[#176edf] disabled:opacity-70"
            aria-label="刷新气象数据"
            title="点击刷新气象数据"
          >
            <RefreshCw size={15} className={`text-[#1473ef] ${refreshing ? "animate-spin" : "transition group-hover:rotate-45"}`} />
            <span>更新于 {updatedAt}</span>
          </button>
          <button className="rounded-full p-2 hover:bg-blue-50" aria-label="通知"><Bell size={18} /></button>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 w-[190px] border-r border-[#dfe9f6] bg-white px-3 pt-4 transition-transform lg:top-16 lg:z-30 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-5 flex items-center justify-between px-2 lg:hidden">
          <span className="font-semibold">功能导航</span>
          <button onClick={() => setMenuOpen(false)} aria-label="关闭导航"><X size={21} /></button>
        </div>
        <nav className="space-y-2">
          {navItems.map(({ label, icon: Icon, href }, index) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${index === 0 ? "bg-gradient-to-r from-[#1578f5] to-[#2563eb] text-white shadow-[0_8px_20px_rgba(37,99,235,.22)]" : "text-[#52617d] hover:bg-blue-50 hover:text-[#176edf]"}`}>
              <Icon size={18} />{label}
            </a>
          ))}
        </nav>
      </aside>
      {menuOpen && <button className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="关闭导航遮罩" />}

      <main className="px-3 py-4 sm:px-5 lg:ml-[190px] lg:px-6 lg:py-5">
        <section id="filter" className="panel scroll-mt-20 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarDays size={21} className="text-[#226fe5]" />时间段筛选</div>
          <div className="flex flex-wrap items-end gap-3 xl:flex-nowrap">
            <label className="min-w-[210px] flex-1 text-sm text-[#586784]">
              <span className="mb-2 block">开始日期 + 小时</span>
              <input type="datetime-local" value={draftStart} onChange={(event) => { setDraftStart(event.target.value); setActivePreset("custom"); }} className="input-field" />
            </label>
            <label className="min-w-[210px] flex-1 text-sm text-[#586784]">
              <span className="mb-2 block">结束日期 + 小时</span>
              <input type="datetime-local" value={draftEnd} onChange={(event) => { setDraftEnd(event.target.value); setActivePreset("custom"); }} className="input-field" />
            </label>
            <div className="min-w-[440px] flex-[2] max-sm:min-w-full">
              <span className="mb-2 block text-sm text-[#586784]">快捷选择</span>
              <div className="flex flex-wrap gap-2">
                {[
                  ["6h", "近6小时", 6],
                  ["24h", "近24小时", 24],
                  ["3d", "近3天", 72],
                  ["7d", "近7天", 168],
                  ["custom", "自定义", 0],
                ].map(([id, label, hours]) => (
                  <button key={id as string} onClick={() => choosePreset(id as string, hours as number)} className={`shortcut ${activePreset === id ? "shortcut-active" : ""}`}>{label}</button>
                ))}
              </div>
            </div>
            <button onClick={queryData} disabled={loading} className="primary-button h-[44px] shrink-0 disabled:opacity-70"><Search size={17} />{loading ? "查询中…" : "查询数据"}</button>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(({ label, value, unit, note, icon: Icon, color }) => (
            <article key={label} className="metric-card">
              <div className={`metric-icon metric-${color}`}><Icon size={26} /></div>
              <div>
                <p className="text-sm text-[#687894]">{label}</p>
                <p className="mt-1 whitespace-nowrap text-[26px] font-bold tracking-tight text-[#101d3d]">{value}<span className="ml-1 text-base font-medium text-[#455575]">{unit}</span></p>
                <p className="mt-1 text-xs text-[#6d7d99]">{note}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_305px]">
          <section id="chart" className="panel min-w-0 scroll-mt-20 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><ChartNoAxesCombined size={21} className="text-[#1473ef]" />气象参数变化趋势</h2>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(metricConfig) as MetricKey[]).map((key) => (
                  <label key={key} className={`metric-toggle ${visible[key] ? "metric-toggle-on" : ""}`}>
                    <input type="checkbox" checked={visible[key]} onChange={() => setVisible((current) => ({ ...current, [key]: !current[key] }))} className="sr-only" />
                    <span className="grid h-4 w-4 place-items-center rounded border" style={{ backgroundColor: visible[key] ? metricConfig[key].color : "white", borderColor: visible[key] ? metricConfig[key].color : "#cbd8e9" }}>
                      {visible[key] && <Check size={12} color="white" strokeWidth={3} />}
                    </span>
                    {metricConfig[key].label} ({metricConfig[key].unit})
                  </label>
                ))}
              </div>
            </div>
            <div className="relative">
              <WeatherChart data={data} visible={visible} />
              {loading && data.length === 0 && (
                <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm text-[#71819d] backdrop-blur-[1px]">正在从 Open-Meteo 获取实时数据…</div>
              )}
            </div>
          </section>

          <aside className="panel p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold"><CalendarDays size={20} className="text-[#226fe5]" />时间段统计</h2>
            <div className="mt-4 rounded-xl border border-[#dfe9f6] bg-[#f8fbff] p-3 text-sm text-[#576985]">
              <p className="mb-1 text-xs text-[#8794a9]">已查询时间范围</p>
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs sm:text-sm">
                <span>{formatDateTime(parseInputValue(appliedRange.start))}</span>
                <span className="text-[#9aa7ba]">至</span>
                <span>{formatDateTime(parseInputValue(appliedRange.end))}</span>
              </div>
            </div>
            <div className="mt-4 divide-y divide-[#e7eef7]">
              {[
                [Thermometer, "最高温度", `${stats.maxTemperature.toFixed(1)} °C`, "#ff5261"],
                [Thermometer, "最低温度", `${stats.minTemperature.toFixed(1)} °C`, "#1473ef"],
                [Thermometer, "平均气温", `${stats.avgTemperature.toFixed(1)} °C`, "#f97316"],
                [CloudRain, "累计降水量", `${stats.rainfall.toFixed(1)} mm`, "#3387f2"],
                [Droplets, "平均湿度", `${stats.avgHumidity.toFixed(1)} %`, "#1ea75f"],
                [Wind, "最大风速", `${stats.maxWind.toFixed(1)} m/s`, "#7c4dff"],
              ].map(([Icon, label, value, color]) => (
                <div key={label as string} className="flex items-center gap-3 py-3 text-sm">
                  <Icon size={18} style={{ color: color as string }} />
                  <span className="flex-1 text-[#56657f]">{label as string}</span>
                  <strong className="font-semibold text-[#293a59]">{value as string}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-4">
          <section id="download" className="panel min-w-0 scroll-mt-20 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Database size={20} className="text-[#226fe5]" />时间段数据明细</h2>
              <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-[#7c899f]">
                <span>共 {data.length} 条数据</span>
                <div className="flex gap-1">
                  <button className="page-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} aria-label="上一页"><ChevronLeft size={16} /></button>
                  {getPaginationItems(totalPages, page).map((item) => typeof item === "number" ? (
                    <button key={item} className={`page-btn ${page === item ? "page-btn-active" : ""}`} onClick={() => setPage(item)}>{item}</button>
                  ) : (
                    <span key={item} className="grid h-[30px] min-w-5 place-items-center text-[#9aa7ba]" aria-hidden="true">…</span>
                  ))}
                  <button className="page-btn" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} aria-label="下一页"><ChevronRight size={16} /></button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDownloadMenuOpen((current) => !current)}
                    className="primary-button h-[36px] min-h-0 px-3"
                    aria-haspopup="menu"
                    aria-expanded={downloadMenuOpen}
                  >
                    <Download size={15} />下载数据<ChevronDown size={14} />
                  </button>
                  {downloadMenuOpen && (
                    <div role="menu" className="absolute right-0 top-[42px] z-30 w-44 overflow-hidden rounded-xl border border-[#dce6f3] bg-white p-1.5 text-sm shadow-[0_14px_35px_rgba(34,61,102,.16)]">
                      <button role="menuitem" onClick={() => downloadData("csv")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[#455575] hover:bg-blue-50 hover:text-[#176edf]">
                        <Download size={15} />下载 CSV
                      </button>
                      <button role="menuitem" onClick={() => downloadData("xlsx")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[#455575] hover:bg-blue-50 hover:text-[#176edf]">
                        <Download size={15} />下载 Excel (.xlsx)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#dce6f3]">
              <table className="w-full min-w-[780px] border-collapse text-center text-sm">
                <thead className="bg-[#f4f8fd] text-[#465570]"><tr>{["时间", "温度 (°C)", "湿度 (%)", "降水量 (mm)", "风速 (m/s)", "气压 (hPa)"].map((item) => <th key={item} className="border-b border-r border-[#dce6f3] px-4 py-3 font-semibold last:border-r-0">{item}</th>)}</tr></thead>
                <tbody className="text-[#52617d]">
                  {pageData.map((item) => (
                    <tr key={item.time.toISOString()} className="transition hover:bg-blue-50/60">
                      {[formatDateTime(item.time), item.temperature, item.humidity, item.rainfall.toFixed(1), item.windSpeed.toFixed(1), item.pressure.toFixed(1)].map((value, index) => <td key={index} className="border-b border-r border-[#e3ebf5] px-4 py-3 last:border-r-0">{value}</td>)}
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-[#8794a9]">{loading ? "正在加载天气数据…" : "暂无可用数据"}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {notice && <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#172341] px-4 py-3 text-sm text-white shadow-xl"><Check size={16} className="text-emerald-400" />{notice}</div>}
    </div>
  );
}
