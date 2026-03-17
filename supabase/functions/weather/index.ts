import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// New ECCC GeoMet OGC API (replaces deprecated dd.weather.gc.ca XML)
const ECCC_API = 'https://api.weather.gc.ca/collections/citypageweather-realtime/items';

// City identifiers for the new API
const CITY_CODES: Record<string, { id: string; name: string; province: string }> = {
  'toronto':     { id: 'on-143', name: 'Toronto',     province: 'ON' },
  'mississauga': { id: 'on-84',  name: 'Mississauga', province: 'ON' },
  'vaughan':     { id: 'on-150', name: 'Vaughan',     province: 'ON' },
  'oakville':    { id: 'on-95',  name: 'Oakville',    province: 'ON' },
  'brampton':    { id: 'on-11',  name: 'Brampton',    province: 'ON' },
  'markham':     { id: 'on-150', name: 'Markham',     province: 'ON' },
  'ottawa':      { id: 'on-118', name: 'Ottawa',      province: 'ON' },
  'hamilton':    { id: 'on-42',  name: 'Hamilton',    province: 'ON' },
  'london':      { id: 'on-72',  name: 'London',      province: 'ON' },
  'lethbridge':  { id: 'ab-30',  name: 'Lethbridge',  province: 'AB' },
  'calgary':     { id: 'ab-52',  name: 'Calgary',     province: 'AB' },
  'edmonton':    { id: 'ab-50',  name: 'Edmonton',    province: 'AB' },
  'vancouver':   { id: 'bc-74',  name: 'Vancouver',   province: 'BC' },
  'montreal':    { id: 'qc-147', name: 'Montréal',    province: 'QC' },
  'winnipeg':    { id: 'mb-38',  name: 'Winnipeg',    province: 'MB' },
};

function extractCurrent(cc: any) {
  if (!cc) return null;
  const val = (obj: any) => obj?.value?.en ?? null;
  
  return {
    condition: cc.condition?.en || 'Unknown',
    temperature: val(cc.temperature),
    windSpeed: val(cc.wind?.speed),
    windGust: val(cc.wind?.gust),
    windDirection: val(cc.wind?.direction),
    humidity: val(cc.relativeHumidity),
    pressure: val(cc.pressure),
    visibility: val(cc.visibility),
    windChill: val(cc.windChill),
    iconCode: cc.iconCode?.value?.toString() ?? null,
    observedAt: cc.timestamp?.en || null,
  };
}

function extractWarnings(warnings: any) {
  if (!warnings || !Array.isArray(warnings)) return [];
  return warnings.map((w: any) => ({
    type: w.type?.en || '',
    priority: w.priority?.en || '',
    description: w.description?.en || w.type?.en || '',
  })).filter((w: any) => w.type || w.description);
}

function extractForecasts(forecasts: any) {
  if (!forecasts || !Array.isArray(forecasts)) return [];
  return forecasts.slice(0, 6).map((f: any) => {
    const summary = f.textSummary?.en || '';
    const temperature = f.temperature?.value?.en ?? null;
    const iconCode = f.iconCode?.value?.toString() ?? null;
    const pop = f.precipitation?.value?.en?.toString() ?? null;

    // Snow accumulation from text
    const snowMatch = summary.match(/snow[^.]*?(\d+)\s*(?:to\s*(\d+)\s*)?cm/i);
    const snowLevel = snowMatch
      ? (snowMatch[2] ? `${snowMatch[1]}-${snowMatch[2]} cm` : `${snowMatch[1]} cm`)
      : null;

    return {
      period: f.name?.en || '',
      summary,
      temperature,
      iconCode,
      pop,
      snowLevel,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const cityParam = (url.searchParams.get('city') || 'toronto').toLowerCase().trim();

    const cityInfo = CITY_CODES[cityParam];
    if (!cityInfo) {
      return new Response(JSON.stringify({
        error: 'City not found',
        available: Object.keys(CITY_CODES),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiUrl = `${ECCC_API}?lang=en&f=json&limit=1&identifier=${cityInfo.id}`;
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ECCC API returned ${response.status}`);
    }

    const json = await response.json();
    const feature = json?.features?.[0];
    if (!feature) {
      throw new Error('No weather data returned for this city');
    }

    const props = feature.properties;
    const current = extractCurrent(props.currentConditions);
    const warnings = extractWarnings(props.warnings);
    const forecast = extractForecasts(props.forecasts);

    // Snow analysis
    const hasSnowWarning = warnings.some((w: any) =>
      (w.description + w.type).toLowerCase().match(/snow|winter storm|blizzard/)
    );
    const forecastSnow = forecast.some((f: any) =>
      f.snowLevel !== null ||
      f.summary.toLowerCase().includes('snow') ||
      f.summary.toLowerCase().includes('flurries')
    );
    const snowAlertLevel = hasSnowWarning ? 'warning' : forecastSnow ? 'watch' : 'none';

    const weatherData = {
      city: cityInfo.name,
      province: cityInfo.province,
      source: 'Environment and Climate Change Canada',
      fetchedAt: new Date().toISOString(),
      current,
      warnings,
      forecast,
      snowAlert: {
        level: snowAlertLevel,
        hasSnowWarning,
        forecastSnow,
      },
    };

    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
