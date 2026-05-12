"use client";

import React, { useEffect, useMemo, useState } from "react";

const SHEET_ID = "1hl93Th-1xGT3JTsMrGf6cGk-ZNPdxpfyHayGk5oP-ow";
const SHEET_NAME = "Sheet1";

const SAMPLE_CSV = `Year,Month,Narrative,Property,Posted,Reach,Engagement,Amount Spent,Influencers,Post Title,Post Link,Post Reach,Post Engagement
2026,May,Governance Delivery,Facebook Pages,12,125000,9500,25000,4,Top governance post,https://example.com/1,65000,5100
2026,May,Governance Delivery,Instagram Handles,8,89000,12000,18000,5,Top reel,https://example.com/2,52000,7200
2026,May,Governance Delivery,YouTube Channels,4,175000,15000,30000,2,Top video,https://example.com/3,110000,9000
2026,May,Opposition Counter,X Handles,15,45000,5200,12000,6,Top counter post,https://example.com/4,25000,3200
2026,April,Women Welfare,Facebook Pages,10,210000,18000,22000,3,Women welfare post,https://example.com/5,120000,9200
2026,April,Infrastructure Push,Instagram Handles,9,340000,22000,42000,4,Infra reel,https://example.com/6,160000,14000`;

type RowData = Record<string, string>;

type Fields = {
  year: string;
  month: string;
  narrative: string;
  property: string;
  posted: string;
  reach: string;
  engagement: string;
  amountSpent: string;
  influencers: string;
  postTitle: string;
  postLink: string;
  postReach: string;
  postEngagement: string;
};

type Totals = {
  posted: number;
  reach: number;
  engagement: number;
  amountSpent: number;
  influencers: number;
};

type PropertyData = Totals & {
  name: string;
};

type TopPost = {
  property: string;
  title: string;
  link: string;
  reach: number;
  engagement: number;
};

const emptyFields: Fields = {
  year: "",
  month: "",
  narrative: "",
  property: "",
  posted: "",
  reach: "",
  engagement: "",
  amountSpent: "",
  influencers: "",
  postTitle: "",
  postLink: "",
  postReach: "",
  postEngagement: "",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
        current = "";
        row = [];
      }
      if (char === "\r" && next === "\n") i += 1;
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell !== ""));
}

function normaliseHeader(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normaliseText(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const clean = String(value).replace(/[₹,%\s,]/g, "").toLowerCase();
  if (clean.endsWith("cr")) return parseFloat(clean) * 10000000 || 0;
  if (clean.endsWith("m")) return parseFloat(clean) * 1000000 || 0;
  if (clean.endsWith("k")) return parseFloat(clean) * 1000 || 0;
  if (clean.endsWith("l")) return parseFloat(clean) * 100000 || 0;
  return parseFloat(clean) || 0;
}

function formatNumber(value: number): string {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(2)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return Math.round(number).toLocaleString("en-US");
}

function formatCurrency(value: number): string {
  const number = Number(value) || 0;
  if (!number) return "₹0";
  if (number >= 1000000) return `₹${(number / 1000000).toFixed(2)}M`;
  if (number >= 1000) return `₹${(number / 1000).toFixed(1)}K`;
  return `₹${Math.round(number).toLocaleString("en-US")}`;
}

function detectField(headers: string[], candidates: string[]): string {
  const prepared = headers.map((header) => ({ original: header, key: normaliseHeader(header) }));

  for (const candidate of candidates) {
    const key = normaliseHeader(candidate);
    const exact = prepared.find((item) => item.key === key);
    if (exact) return exact.original;
  }

  for (const candidate of candidates) {
    const key = normaliseHeader(candidate);
    const partial = prepared.find((item) => item.key.includes(key) || key.includes(item.key));
    if (partial) return partial.original;
  }

  return "";
}

function csvToObjects(csv: string): { headers: string[]; data: RowData[] } {
  const parsed = parseCSV(csv);
  const headers = parsed[0] || [];
  const data = parsed.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])) as RowData);
  return { headers, data };
}

function detectFields(headers: string[]): Fields {
  return {
    year: detectField(headers, ["Year"]),
    month: detectField(headers, ["Month"]),
    narrative: detectField(headers, ["Narrative", "Narratives", "Narrative Category", "Top Narrative"]),
    property: detectField(headers, ["Property", "Properties", "Platform", "Channel", "Page Type", "Asset"]),
    posted: detectField(headers, ["Posted", "Posts", "Post Count", "No of Posts", "Count"]),
    reach: detectField(headers, ["Reach", "Views", "Impressions", "Video Views"]),
    engagement: detectField(headers, ["Engagement", "Total Engagement", "Engagements", "Interactions"]),
    amountSpent: detectField(headers, ["Amount Spent", "Spend", "Spent", "Ad Spend", "Boosting Amount"]),
    influencers: detectField(headers, ["Influencers", "Influencer", "Creators", "Creator Count", "KOL"]),
    postTitle: detectField(headers, ["Post Title", "Top Post", "Post Caption", "Caption", "Content"]),
    postLink: detectField(headers, ["Post Link", "Link", "URL", "Post URL"]),
    postReach: detectField(headers, ["Post Reach", "Post Views", "Post Impressions", "Views"]),
    postEngagement: detectField(headers, ["Post Engagement", "Post Engagements", "Post Interactions", "Engagement"]),
  };
}

function getCell(row: RowData, field: string, fallback = ""): string {
  if (!field || !row) return fallback;
  return row[field] || fallback;
}

function uniqueValues(rows: RowData[], field: string): string[] {
  if (!field) return [];
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function isInfluencerOrAmplificationProperty(name: string): boolean {
  const key = normaliseText(name);
  return key.includes("influencer") || key.includes("amplification") || key.includes("amplified");
}

function runTests(): void {
  const parsed = parseCSV('Name,Value,Caption\n"A, B",1.2K,"Quoted ""text"""');
  console.assert(parsed.length === 2, "CSV rows parsed");
  console.assert(parsed[1][0] === "A, B", "Quoted comma parsed");
  console.assert(parsed[1][2] === 'Quoted "text"', "Escaped quote parsed");
  console.assert(toNumber("1.2K") === 1200, "K parsed");
  console.assert(toNumber("2.5M") === 2500000, "M parsed");
  console.assert(toNumber("4.75L") === 475000, "L parsed");
  console.assert(toNumber("1.1Cr") === 11000000, "Cr parsed");
  console.assert(toNumber("₹8,25,904") === 825904, "Indian number parsed");
  console.assert(formatNumber(125000) === "125.0K", "K formatted");
  console.assert(formatCurrency(825904) === "₹825.9K", "Currency formatted");
  console.assert(detectField(["Amount Spent", "Post Link"], ["Spend", "Amount Spent"]) === "Amount Spent", "Spend field detected");
  console.assert(isInfluencerOrAmplificationProperty("Varahe Amplification Network") === true, "Amplification property detected");
}

function Icon({ type }: { type: keyof Totals | "amount" }): React.ReactElement {
  const paths: Record<string, string> = {
    posted: "M5 4h10l4 4v12H5z M15 4v4h4 M8 13h8 M8 17h6",
    reach: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z",
    engagement: "M7 11v8 M12 7v12 M17 13v6 M4 19h16",
    amount: "M12 2v20 M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6",
    influencers: "M16 11a4 4 0 10-8 0 4 4 0 008 0z M3 21a7 7 0 0118 0 M19 8a3 3 0 110 6",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(paths[type] || paths.posted).split(" M").map((path, index) => (
        <path key={index} d={index === 0 ? path : `M${path}`} />
      ))}
    </svg>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={`rounded-3xl border border-orange-100 bg-white shadow-[0_10px_30px_rgba(255,103,31,0.08)] ${className}`}>{children}</div>;
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return (
    <Card className="flex min-h-[150px] flex-col items-center justify-center p-5 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffefe2] text-[#ff671f] ring-1 ring-orange-100">{icon}</div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-[#174a7c]">{label}</p>
      <p className="mt-3 text-2xl font-black text-[#07111f]">{value}</p>
    </Card>
  );
}

function NativeSelect({ label, value, onChange, options, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; disabled: boolean }): React.ReactElement {
  return (
    <div>
      <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-[#174a7c]">{label}</label>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none ring-orange-200 transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-orange-50 disabled:text-slate-400">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function ProgressRow({ label, value, max, formatter }: { label: string; value: number; max: number; formatter: (value: number) => string }): React.ReactElement {
  const width = max ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-slate-700">{label}</span>
        <span className="shrink-0 font-bold text-[#07111f]">{formatter(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-orange-50">
        <div className="h-full rounded-full bg-[#ff671f]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }): React.ReactElement {
  return (
    <Card className="p-8 text-center">
      <p className="text-base font-black text-[#07111f]">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </Card>
  );
}

export default function NarrativePerformanceDashboard(): React.ReactElement {
  const [rows, setRows] = useState<RowData[]>([]);
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedNarrative, setSelectedNarrative] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("Google Sheet");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    runTests();

    async function loadData(): Promise<void> {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Sheet not accessible in preview.");
        const csv = await response.text();
        const { headers, data } = csvToObjects(csv);
        if (!headers.length || !data.length) throw new Error("Sheet has no readable rows.");
        setFields(detectFields(headers));
        setRows(data);
        setSourceLabel("Google Sheet");
        setNotice("");
      } catch {
        const { headers, data } = csvToObjects(SAMPLE_CSV);
        setFields(detectFields(headers));
        setRows(data);
        setSourceLabel("Sample Data");
        setNotice("Preview is using sample data because the live Google Sheet is not accessible from this sandbox. Publish or share the sheet as viewable to load live data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const yearOptions = useMemo(() => uniqueValues(rows, fields.year), [rows, fields]);

  const monthOptions = useMemo(() => {
    if (!selectedYear) return [];
    return uniqueValues(rows.filter((row) => getCell(row, fields.year) === selectedYear), fields.month);
  }, [rows, fields, selectedYear]);

  const narrativeOptions = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    return uniqueValues(rows.filter((row) => getCell(row, fields.year) === selectedYear && getCell(row, fields.month) === selectedMonth), fields.narrative);
  }, [rows, fields, selectedYear, selectedMonth]);

  const selectedRows = useMemo(() => {
    if (!selectedYear || !selectedMonth || !selectedNarrative) return [];
    return rows.filter((row) => getCell(row, fields.year) === selectedYear && getCell(row, fields.month) === selectedMonth && getCell(row, fields.narrative) === selectedNarrative);
  }, [rows, fields, selectedYear, selectedMonth, selectedNarrative]);

  const propertyData = useMemo<PropertyData[]>(() => {
    const map = new Map<string, PropertyData>();
    selectedRows.forEach((row) => {
      const name = getCell(row, fields.property, "Uncategorised Property");
      if (!map.has(name)) map.set(name, { name, posted: 0, reach: 0, engagement: 0, amountSpent: 0, influencers: 0 });
      const item = map.get(name);
      if (!item) return;
      item.posted += toNumber(getCell(row, fields.posted));
      item.reach += toNumber(getCell(row, fields.reach));
      item.engagement += toNumber(getCell(row, fields.engagement));
      item.amountSpent += toNumber(getCell(row, fields.amountSpent));
      item.influencers += toNumber(getCell(row, fields.influencers));
    });
    return [...map.values()].sort((a, b) => b.reach - a.reach);
  }, [selectedRows, fields]);

  const totals = useMemo<Totals>(() => {
    const base = selectedRows.reduce((acc, row) => {
      acc.posted += toNumber(getCell(row, fields.posted));
      acc.reach += toNumber(getCell(row, fields.reach));
      acc.engagement += toNumber(getCell(row, fields.engagement));
      acc.amountSpent += toNumber(getCell(row, fields.amountSpent));
      return acc;
    }, { posted: 0, reach: 0, engagement: 0, amountSpent: 0, influencers: 0 });

    base.influencers = propertyData
      .filter((item) => isInfluencerOrAmplificationProperty(item.name))
      .reduce((sum, item) => sum + item.posted, 0);

    return base;
  }, [selectedRows, fields, propertyData]);

  const topPostsByProperty = useMemo(() => {
    const map = new Map<string, TopPost[]>();

    selectedRows.forEach((row) => {
      const property = getCell(row, fields.property, "Uncategorised Property");
      const title = getCell(row, fields.postTitle);
      const link = getCell(row, fields.postLink);
      const reach = toNumber(getCell(row, fields.postReach)) || toNumber(getCell(row, fields.reach));
      const engagement = toNumber(getCell(row, fields.postEngagement)) || toNumber(getCell(row, fields.engagement));

      if (!title && !link) return;
      if (!map.has(property)) map.set(property, []);
      map.get(property)?.push({ property, title: title || "Top post", link, reach, engagement });
    });

    propertyData.forEach((item) => {
      const posts = map.get(item.name) || [];
      map.set(item.name, posts.sort((a, b) => b.engagement - a.engagement).slice(0, 2));
    });

    return map;
  }, [selectedRows, fields, propertyData]);

  function resetYear(value: string): void {
    setSelectedYear(value);
    setSelectedMonth("");
    setSelectedNarrative("");
  }

  function resetMonth(value: string): void {
    setSelectedMonth(value);
    setSelectedNarrative("");
  }

  const showData = Boolean(selectedYear && selectedMonth && selectedNarrative);
  const maxReach = Math.max(...propertyData.map((item) => item.reach), 1);
  const maxEngagement = Math.max(...propertyData.map((item) => item.engagement), 1);
  const maxAmount = Math.max(...propertyData.map((item) => item.amountSpent), 1);

  return (
    <div className="min-h-screen bg-[#fff8f1] p-5 text-[#07111f] md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#07111f] via-[#10233f] to-[#ff671f] p-7 text-white shadow-xl md:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-[#ff671f]">Narrative Intelligence</span>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Narrative Performance Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-orange-50">Select Year, Month and Narrative to view combined totals, property-wise performance and top post evidence.</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20">Source: {sourceLabel}</div>
          </div>
        </header>

        {notice && <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-800">{notice}</div>}

        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <NativeSelect label="Year" value={selectedYear} onChange={resetYear} options={yearOptions} placeholder="Select Year" disabled={loading} />
            <NativeSelect label="Month" value={selectedMonth} onChange={resetMonth} options={monthOptions} placeholder={selectedYear ? "Select Month" : "Select Year First"} disabled={loading || !selectedYear} />
            <NativeSelect label="Narrative" value={selectedNarrative} onChange={setSelectedNarrative} options={narrativeOptions} placeholder={selectedMonth ? "Select Narrative" : "Select Month First"} disabled={loading || !selectedYear || !selectedMonth} />
          </div>
        </Card>

        {loading && <Card className="p-8 text-center text-sm font-semibold text-slate-500">Loading dashboard...</Card>}

        {!loading && !selectedYear && <EmptyState title="Select Year to begin" text="Dashboard data will remain hidden until a Year is selected." />}
        {!loading && selectedYear && !selectedMonth && <EmptyState title="Select Month" text="Only months available for the selected Year are shown." />}
        {!loading && selectedYear && selectedMonth && !selectedNarrative && <EmptyState title="Select Narrative" text="Only narratives available for the selected Year and Month are shown." />}

        {!loading && showData && (
          <>
            <section className="grid gap-4 md:grid-cols-5">
              <MetricCard icon={<Icon type="posted" />} label="Total Posted" value={formatNumber(totals.posted)} />
              <MetricCard icon={<Icon type="reach" />} label="Total Reach" value={formatNumber(totals.reach)} />
              <MetricCard icon={<Icon type="engagement" />} label="Total Engagement" value={formatNumber(totals.engagement)} />
              <MetricCard icon={<Icon type="amount" />} label="Amount Spent" value={formatCurrency(totals.amountSpent)} />
              <MetricCard icon={<Icon type="influencers" />} label="Influencers & Amplification" value={formatNumber(totals.influencers)} />
            </section>

            <Card className="p-5">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#07111f]">{selectedNarrative}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Combined total across all properties, followed by individual property breakdown.</p>
                </div>
                <span className="rounded-full bg-[#ffefe2] px-4 py-2 text-xs font-black text-[#ff671f]">{selectedMonth} {selectedYear}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-orange-100 text-xs uppercase tracking-wide text-[#174a7c]">
                      <th className="py-3 text-left">Property</th>
                      <th className="text-center">Posted</th>
                      <th className="text-center">Reach</th>
                      <th className="text-center">Engagement</th>
                      <th className="text-center">Amount Spent</th>
                      <th className="text-center">Influencers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#07111f] text-white">
                      <td className="rounded-l-2xl py-4 pl-4 text-left font-black">Total</td>
                      <td className="text-center font-black">{formatNumber(totals.posted)}</td>
                      <td className="text-center font-black">{formatNumber(totals.reach)}</td>
                      <td className="text-center font-black">{formatNumber(totals.engagement)}</td>
                      <td className="text-center font-black">{formatCurrency(totals.amountSpent)}</td>
                      <td className="rounded-r-2xl text-center font-black">{formatNumber(totals.influencers)}</td>
                    </tr>
                    {propertyData.map((item) => (
                      <tr key={item.name} className="border-b border-orange-50 last:border-0">
                        <td className="max-w-[300px] py-4 text-left font-bold text-[#07111f]">{item.name}</td>
                        <td className="text-center">{formatNumber(item.posted)}</td>
                        <td className="text-center">{formatNumber(item.reach)}</td>
                        <td className="text-center">{formatNumber(item.engagement)}</td>
                        <td className="text-center">{formatCurrency(item.amountSpent)}</td>
                        <td className="text-center">{formatNumber(item.influencers)}</td>
                      </tr>
                    ))}
                    {!propertyData.length && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No data available for this narrative.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>

            <section className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5">
                <h3 className="mb-5 text-lg font-black text-[#07111f]">Reach by Property</h3>
                <div className="space-y-4">
                  {propertyData.map((item) => <ProgressRow key={item.name} label={item.name} value={item.reach} max={maxReach} formatter={formatNumber} />)}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-5 text-lg font-black text-[#07111f]">Engagement by Property</h3>
                <div className="space-y-4">
                  {propertyData.map((item) => <ProgressRow key={item.name} label={item.name} value={item.engagement} max={maxEngagement} formatter={formatNumber} />)}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-5 text-lg font-black text-[#07111f]">Amount Spent by Property</h3>
                <div className="space-y-4">
                  {propertyData.map((item) => <ProgressRow key={item.name} label={item.name} value={item.amountSpent} max={maxAmount} formatter={formatCurrency} />)}
                </div>
              </Card>
            </section>

            <Card className="p-5">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#07111f]">Top 2 Posts by Property</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">Add post-level columns in the sheet and this section will auto-populate for each property.</p>
                </div>
                <span className="rounded-full bg-[#ffefe2] px-4 py-2 text-xs font-black text-[#ff671f]">Template Ready</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {propertyData.map((property) => {
                  const posts = topPostsByProperty.get(property.name) || [];
                  const displayPosts = posts.length ? posts : [0, 1].map((index) => ({
                    property: property.name,
                    title: `Top Post ${index + 1}`,
                    link: "",
                    reach: 0,
                    engagement: 0,
                  }));

                  return (
                    <div key={property.name} className="rounded-3xl border border-orange-100 bg-[#fffaf5] p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h4 className="font-black text-[#07111f]">{property.name}</h4>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#174a7c]">Top 2</span>
                      </div>

                      <div className="space-y-3">
                        {displayPosts.map((post, index) => (
                          <div key={`${property.name}-${index}-${post.link}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wide text-[#ff671f]">Post {index + 1}</p>
                                <p className="mt-1 text-sm font-bold text-[#07111f]">{posts.length ? post.title : "Add post title/caption in sheet"}</p>
                              </div>
                              {post.link ? <a href={post.link} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-[#ff671f] px-3 py-1 text-xs font-black text-white">Open</a> : <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-400">Pending</span>}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                              <div className="rounded-2xl bg-orange-50 p-3">
                                <p className="font-bold uppercase text-[#174a7c]">Reach</p>
                                <p className="mt-1 text-base font-black text-[#07111f]">{formatNumber(post.reach)}</p>
                              </div>
                              <div className="rounded-2xl bg-orange-50 p-3">
                                <p className="font-bold uppercase text-[#174a7c]">Engagement</p>
                                <p className="mt-1 text-base font-black text-[#07111f]">{formatNumber(post.engagement)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
