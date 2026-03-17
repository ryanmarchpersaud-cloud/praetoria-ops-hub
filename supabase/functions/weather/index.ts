import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment Canada citypage XML weather data
// Source: https://dd.weather.gc.ca/citypage_weather/xml/
// Format: {province}/{site_code}_e.xml
const ECCC_BASE = 'https://dd.weather.gc.ca/citypage_weather/xml';

// Common Ontario city codes for Praetoria's service area
const CITY_CODES: Record<string, { province: string; code: string; name: string }> = {
  'toronto': { province: 'ON', code: 's0000458', name: 'Toronto' },
  'mississauga': { province: 'ON', code: 's0000786', name: 'Mississauga' },
  'vaughan': { province: 'ON', code: 's0000585', name: 'Vaughan' },
  'oakville': { province: 'ON', code: 's0000613', name: 'Oakville' },
  'brampton': { province: 'ON', code: 's0000785', name: 'Brampton' },
  'markham': { province: 'ON', code: 's0000585', name: 'Markham' },
  'ottawa': { province: 'ON', code: 's0000430', name: 'Ottawa' },
  'hamilton': { province: 'ON', code: 's0000318', name: 'Hamilton' },
  'london': { province: 'ON', code: 's0000326', name: 'London' },
  'lethbridge': { province: 'AB', code: 's0000652', name: 'Lethbridge' },
  'calgary': { province: 'AB', code: 's0000047', name: 'Calgary' },
  'edmonton': { province: 'AB', code: 's0000045', name: 'Edmonton' },
  'vancouver': { province: 'BC', code: 's0000141', name: 'Vancouver' },
  'montreal': { province: 'QC', code: 's0000635', name: 'Montréal' },
  'winnipeg': { province: 'MB', code: 's0000193', name: 'Winnipeg' },
};

function parseXMLValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function parseAttribute(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function parseCurrentConditions(xml: string) {
  // Extract the <currentConditions> block
  const ccMatch = xml.match(/<currentConditions>[\s\S]*?<\/currentConditions>/);
  if (!ccMatch) return null;
  const cc = ccMatch[0];

  const condition = parseXMLValue(cc, 'condition') || 'Unknown';
  
  // Temperature
  const tempMatch = cc.match(/<temperature[^>]*unitType="metric"[^>]*>([^<]*)<\/temperature>/);
  const temperature = tempMatch ? parseFloat(tempMatch[1]) : null;

  // Wind speed
  const windSpeedMatch = cc.match(/<speed[^>]*unitType="metric"[^>]*>([^<]*)<\/speed>/);
  const windSpeed = windSpeedMatch ? parseFloat(windSpeedMatch[1]) : null;
  const windGust = parseXMLValue(cc, 'gust');
  const windDir = parseXMLValue(cc, 'direction');

  // Humidity
  const humidityMatch = cc.match(/<relativeHumidity[^>]*>([^<]*)<\/relativeHumidity>/);
  const humidity = humidityMatch ? parseInt(humidityMatch[1]) : null;

  // Pressure
  const pressureMatch = cc.match(/<pressure[^>]*unitType="metric"[^>]*>([^<]*)<\/pressure>/);
  const pressure = pressureMatch ? parseFloat(pressureMatch[1]) : null;

  // Visibility
  const visibilityMatch = cc.match(/<visibility[^>]*unitType="metric"[^>]*>([^<]*)<\/visibility>/);
  const visibility = visibilityMatch ? parseFloat(visibilityMatch[1]) : null;

  // Wind chill or humidex
  const windChillMatch = cc.match(/<windChill[^>]*>([^<]*)<\/windChill>/);
  const windChill = windChillMatch ? parseFloat(windChillMatch[1]) : null;

  // Icon code for weather icon mapping
  const iconCode = parseXMLValue(cc, 'iconCode');

  // Observation datetime
  const dateTimeBlock = cc.match(/<dateTime[^>]*name="observation"[^>]*zone="UTC"[^>]*>[\s\S]*?<\/dateTime>/);
  const observedAt = dateTimeBlock ? parseXMLValue(dateTimeBlock[0], 'textSummary') : null;

  return {
    condition,
    temperature,
    windSpeed,
    windGust: windGust ? parseFloat(windGust) : null,
    windDirection: windDir,
    humidity,
    pressure,
    visibility,
    windChill,
    iconCode,
    observedAt,
  };
}

function parseWarnings(xml: string) {
  const warnings: Array<{ type: string; priority: string; description: string; url?: string }> = [];
  
  const warningsBlock = xml.match(/<warnings[^>]*>[\s\S]*?<\/warnings>/);
  if (!warningsBlock) return warnings;

  const eventMatches = warningsBlock[0].matchAll(/<event\s+([^>]*)\/>/g);
  for (const m of eventMatches) {
    const attrs = m[1];
    const type = attrs.match(/type="([^"]*)"/)?.[1] || '';
    const priority = attrs.match(/priority="([^"]*)"/)?.[1] || '';
    const desc = attrs.match(/description="([^"]*)"/)?.[1] || '';
    if (type || desc) {
      warnings.push({ type, priority, description: desc });
    }
  }

  return warnings;
}

function parseForecast(xml: string) {
  const forecasts: Array<{
    period: string;
    summary: string;
    temperature: number | null;
    iconCode: string | null;
    pop: string | null;
    snowLevel: string | null;
  }> = [];

  const forecastGroup = xml.match(/<forecastGroup>[\s\S]*?<\/forecastGroup>/);
  if (!forecastGroup) return forecasts;

  const forecastBlocks = forecastGroup[0].matchAll(/<forecast>[\s\S]*?<\/forecast>/g);
  let count = 0;
  for (const fb of forecastBlocks) {
    if (count >= 6) break; // Limit to 6 periods
    const block = fb[0];
    const period = parseXMLValue(block, 'period') || '';
    const summary = parseXMLValue(block, 'textSummary') || '';
    const tempMatch = block.match(/<temperature[^>]*>([^<]*)<\/temperature>/);
    const temperature = tempMatch ? parseFloat(tempMatch[1]) : null;
    const iconCode = parseXMLValue(block, 'iconCode');
    
    // Precipitation probability
    const popBlock = block.match(/<abbreviatedForecast>[\s\S]*?<\/abbreviatedForecast>/);
    const pop = popBlock ? parseXMLValue(popBlock[0], 'pop') : null;

    // Snow accumulation
    const snowMatch = block.match(/snow[^.]*?(\d+)\s*(?:to\s*(\d+)\s*)?cm/i);
    const snowLevel = snowMatch ? (snowMatch[2] ? `${snowMatch[1]}-${snowMatch[2]} cm` : `${snowMatch[1]} cm`) : null;

    forecasts.push({ period, summary, temperature, iconCode, pop, snowLevel });
    count++;
  }

  return forecasts;
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

    const ecccUrl = `${ECCC_BASE}/${cityInfo.province}/${cityInfo.code}_e.xml`;
    const response = await fetch(ecccUrl, {
      headers: { 'Accept': 'application/xml' },
    });

    if (!response.ok) {
      throw new Error(`ECCC API returned ${response.status}`);
    }

    const xml = await response.text();

    const current = parseCurrentConditions(xml);
    const warnings = parseWarnings(xml);
    const forecast = parseForecast(xml);

    // Snow-related analysis for service planning
    const hasSnowWarning = warnings.some(w =>
      w.description.toLowerCase().includes('snow') ||
      w.type.toLowerCase().includes('snow') ||
      w.type.toLowerCase().includes('winter storm') ||
      w.type.toLowerCase().includes('blizzard')
    );

    const forecastSnow = forecast.some(f =>
      f.snowLevel !== null ||
      f.summary.toLowerCase().includes('snow') ||
      f.summary.toLowerCase().includes('flurries')
    );

    const snowAlertLevel = hasSnowWarning ? 'warning' : forecastSnow ? 'watch' : 'none';

    const weatherData = {
      city: cityInfo.name,
      province: cityInfo.province,
      source: 'Environment and Climate Change Canada',
      sourceUrl: ecccUrl,
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
