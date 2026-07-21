type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
};

type ResolvedLocation = GeocodingResult & { label: string };

const knownLocations: Array<{ keywords: string[]; location: ResolvedLocation }> = [
  {
    keywords: ["海淀", "beijing haidian"],
    location: { name: "海淀", label: "北京市 · 海淀区", latitude: 39.99064, longitude: 116.28868, timezone: "Asia/Shanghai", country: "中国", admin1: "北京市" },
  },
  {
    keywords: ["浦东", "shanghai pudong"],
    location: { name: "浦东", label: "上海市 · 浦东新区", latitude: 31.22114, longitude: 121.54409, timezone: "Asia/Shanghai", country: "中国", admin1: "上海市" },
  },
  {
    keywords: ["天河", "guangzhou tianhe"],
    location: { name: "天河", label: "广州市 · 天河区", latitude: 23.12463, longitude: 113.36199, timezone: "Asia/Shanghai", country: "中国", admin1: "广东" },
  },
  {
    keywords: ["南山", "shenzhen nanshan"],
    location: { name: "南山", label: "深圳市 · 南山区", latitude: 22.53122, longitude: 113.92943, timezone: "Asia/Shanghai", country: "中国", admin1: "广东" },
  },
  {
    keywords: ["武侯", "chengdu wuhou"],
    location: { name: "武侯", label: "成都市 · 武侯区", latitude: 30.64242, longitude: 104.04311, timezone: "Asia/Shanghai", country: "中国", admin1: "四川" },
  },
];

function locationCandidates(rawLocation: string) {
  const segments = rawLocation
    .split(/[·,，/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .reverse();
  const candidates = [rawLocation.trim(), ...segments];
  for (const item of [...candidates]) {
    candidates.push(item.replace(/(?:特别行政区|自治州|新区|地区|市|区|县)$/u, ""));
  }
  return [...new Set(candidates.filter((item) => item.length >= 2))];
}

async function resolveLocation(rawLocation: string): Promise<ResolvedLocation> {
  const normalized = rawLocation.toLowerCase().replace(/[·,，]/g, " ");
  const known = knownLocations.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
  if (known) return known.location;

  for (const candidate of locationCandidates(rawLocation)) {
    const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodingUrl.searchParams.set("name", candidate);
    geocodingUrl.searchParams.set("count", "5");
    geocodingUrl.searchParams.set("language", "zh");
    geocodingUrl.searchParams.set("format", "json");
    const response = await fetch(geocodingUrl, { cache: "no-store" });
    if (!response.ok) continue;
    const payload = await response.json() as { results?: GeocodingResult[] };
    const result = payload.results?.[0];
    if (!result) continue;
    const region = result.admin1 && result.admin1 !== result.name ? result.admin1 : result.country;
    return { ...result, label: region ? `${region} · ${result.name}` : result.name };
  }

  throw new Error("未找到该地区，请尝试输入城市、区县名称或英文地名");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationQuery = searchParams.get("location")?.trim();
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (!locationQuery || !start || !end) {
      return Response.json({ error: "缺少地区或时间范围" }, { status: 400 });
    }

    const startTime = new Date(`${start}:00.000Z`).getTime();
    const endTime = new Date(`${end}:00.000Z`).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime >= endTime) {
      return Response.json({ error: "时间范围无效" }, { status: 400 });
    }
    if (endTime - startTime > 31 * 24 * 60 * 60 * 1000) {
      return Response.json({ error: "单次最多查询 31 天" }, { status: 400 });
    }

    const location = await resolveLocation(locationQuery);
    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(location.latitude));
    forecastUrl.searchParams.set("longitude", String(location.longitude));
    forecastUrl.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl");
    forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,pressure_msl");
    forecastUrl.searchParams.set("wind_speed_unit", "ms");
    forecastUrl.searchParams.set("timezone", location.timezone || "auto");
    forecastUrl.searchParams.set("start_date", start.slice(0, 10));
    forecastUrl.searchParams.set("end_date", end.slice(0, 10));

    const weatherResponse = await fetch(forecastUrl, { cache: "no-store" });
    const weatherPayload = await weatherResponse.json() as {
      reason?: string;
      current?: Record<string, number | string>;
      hourly?: Record<string, Array<number | string | null>>;
    };
    if (!weatherResponse.ok || !weatherPayload.hourly) {
      throw new Error(weatherPayload.reason || "天气数据服务暂时不可用");
    }

    const hourly = weatherPayload.hourly;
    const time = hourly.time as string[];
    const points = time.map((item, index) => ({
      time: item,
      temperature: hourly.temperature_2m[index],
      humidity: hourly.relative_humidity_2m[index],
      rainfall: hourly.precipitation[index],
      windSpeed: hourly.wind_speed_10m[index],
      pressure: hourly.pressure_msl[index],
    })).filter((item) => item.time >= start && item.time <= end);

    if (points.length === 0) throw new Error("所选时间范围暂无可用天气数据");

    const current = weatherPayload.current;
    return Response.json({
      source: "Open-Meteo",
      location,
      current: current ? {
        time: current.time,
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        rainfall: current.precipitation,
        windSpeed: current.wind_speed_10m,
        pressure: current.pressure_msl,
      } : null,
      hourly: points,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "天气数据请求失败";
    return Response.json({ error: message }, { status: 502 });
  }
}
