"use client";
import React, { useEffect, useMemo, useState } from "react";

const SHEET_ID = "1hl93Th-1xGT3JTsMrGf6cGk-ZNPdxpfyHayGk5oP-ow";
const SHEET_NAME = "Sheet1";

const SAMPLE_CSV = `Year,Month,Narrative,Property,Posted,Reach,Engagement,Amount Spent,Influencers
2026,May,Governance Delivery,Facebook Pages,12,125000,9500,25000,4
2026,May,Governance Delivery,Instagram Handles,8,89000,12000,18000,5
2026,May,Governance Delivery,YouTube Channels,4,175000,15000,30000,2
2026,May,Opposition Counter,X Handles,15,45000,5200,12000,6
2026,April,Women Welfare,Facebook Pages,10,210000,18000,22000,3
2026,April,Infrastructure Push,Instagram Handles,9,340000,22000,42000,4`;

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
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

function normaliseHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const clean = String(value).replace(/[₹,%\s,]/g, "").toLowerCase();
  if (clean.endsWith("cr")) return parseFloat(clean) * 10000000 || 0;
  if (clean.endsWith("m")) return parseFloat(clean) * 1000000 || 0;
  if (clean.endsWith("k")) return parseFloat(clean) * 1000 || 0;
  if (clean.endsWith("l")) return parseFloat(clean) * 100000 || 0;
  return parseFloat(clean) || 0;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  if (number >= 10000000) return `${(number / 10000000).toFixed(2)}Cr`;
  if (number >= 100000) return `${(number / 100000).toFixed(2)}L`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return Math.round(number).toLocaleString("en-IN");
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  if (!number) return "₹0";
  return `₹${Math.round(number).toLocaleString("en-IN")}`;
}

function detectField(headers, candidates) {
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

function csvToObjects(csv) {
  const parsed = parseCSV(csv);
  const headers = parsed[0] || [];
  const data = parsed.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
  return { headers, data };
}

function detectFields(headers) {
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
  };
}

function getCell(row, field, fallback = "") {
  if (!field || !row) return fallback;
  return row[field] || fallback;
}

function uniqueValues(rows, field) {
  if (!field) return [];
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function runTests() {
  const parsed = parseCSV('Name,Value,Caption\n"A, B",1.2K,"Quoted ""text"""');
  console.assert(parsed.length === 2, "CSV rows parsed");
  console.assert(parsed[1][0] === "A, B", "Quoted comma parsed");
  console.assert(parsed[1][2] === 'Quoted "text"', "Escaped quote parsed");
  console.assert(toNumber("1.2K") === 1200, "K parsed");
  console.assert(toNumber("2.5M") === 2500000, "M parsed");
  console.assert(toNumber("4.75L") === 475000, "L parsed");
  console.assert(toNumber("1.1Cr") === 11000000, "Cr parsed");
  console.assert(toNumber("₹8,25,904") === 825904, "Indian number parsed");
  console.assert(formatNumber(125000) === "1.25L", "Lakh formatted");
  console.assert(formatCurrency(825904) === "₹8,25,904", "Currency formatted");
  console.assert(detectField(["Amount Spent", "Post Link"], ["Spend", "Amount Spent"]) === "Amount Spent", "Spend field detected");
}

function Icon({ type }) {
  const paths = {
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

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function MetricCard({ icon, label, value }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </Card>
  );
}

function NativeSelect({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-orange-200 transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function ProgressRow({ label, value, max, formatter }) {
  const width = max ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-700">{label}</span>
        <span className="shrink-0 font-semibold text-slate-950">{formatter(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-base font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </Card>
  );
}

export default function NarrativePerformanceDashboard() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState({});
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedNarrative, setSelectedNarrative] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("Google Sheet");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    runTests();

    async function loadData() {
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
      } catch (error) {
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

  const totals = useMemo(() => selectedRows.reduce((acc, row) => {
    acc.posted += toNumber(getCell(row, fields.posted));
    acc.reach += toNumber(getCell(row, fields.reach));
    acc.engagement += toNumber(getCell(row, fields.engagement));
    acc.amountSpent += toNumber(getCell(row, fields.amountSpent));
    acc.influencers += toNumber(getCell(row, fields.influencers));
    return acc;
  }, { posted: 0, reach: 0, engagement: 0, amountSpent: 0, influencers: 0 }), [selectedRows, fields]);

  const propertyData = useMemo(() => {
    const map = new Map();
    selectedRows.forEach((row) => {
      const name = getCell(row, fields.property, "Uncategorised Property");
      if (!map.has(name)) map.set(name, { name, posted: 0, reach: 0, engagement: 0, amountSpent: 0, influencers: 0 });
      const item = map.get(name);
      item.posted += toNumber(getCell(row, fields.posted));
      item.reach += toNumber(getCell(row, fields.reach));
      item.engagement += toNumber(getCell(row, fields.engagement));
      item.amountSpent += toNumber(getCell(row, fields.amountSpent));
      item.influencers += toNumber(getCell(row, fields.influencers));
    });
    return [...map.values()].sort((a, b) => b.reach - a.reach);
  }, [selectedRows, fields]);

  function resetYear(value) {
    setSelectedYear(value);
    setSelectedMonth("");
    setSelectedNarrative("");
  }

  function resetMonth(value) {
    setSelectedMonth(value);
    setSelectedNarrative("");
  }

  const showData = selectedYear && selectedMonth && selectedNarrative;
  const maxReach = Math.max(...propertyData.map((item) => item.reach), 1);
  const maxEngagement = Math.max(...propertyData.map((item) => item.engagement), 1);
  const maxAmount = Math.max(...propertyData.map((item) => item.amountSpent), 1);

  return (
    <div className="min-h-screen bg-slate-50 p-5 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl md:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Narrative Intelligence</span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Narrative Performance Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Select Year, Month and Narrative to view combined totals and property-wise performance.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">Source: {sourceLabel}</div>
          </div>
        </header>

        {notice && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">{notice}</div>}

        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <NativeSelect label="Year" value={selectedYear} onChange={resetYear} options={yearOptions} placeholder="Select Year" disabled={loading} />
            <NativeSelect label="Month" value={selectedMonth} onChange={resetMonth} options={monthOptions} placeholder={selectedYear ? "Select Month" : "Select Year First"} disabled={loading || !selectedYear} />
            <NativeSelect label="Narrative" value={selectedNarrative} onChange={setSelectedNarrative} options={narrativeOptions} placeholder={selectedMonth ? "Select Narrative" : "Select Month First"} disabled={loading || !selectedYear || !selectedMonth} />
          </div>
        </Card>

        {loading && <Card className="p-8 text-center text-sm font-medium text-slate-500">Loading dashboard...</Card>}

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
              <MetricCard icon={<Icon type="influencers" />} label="Influencers" value={formatNumber(totals.influencers)} />
            </section>

            <Card className="p-5">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedNarrative}</h2>
                  <p className="mt-1 text-sm text-slate-500">Combined total across all properties, followed by individual property breakdown.</p>
                </div>
                <span className="rounded-full bg-orange-100 px-4 py-2 text-xs font-bold text-orange-700">{selectedMonth} {selectedYear}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3">Property</th>
                      <th>Posted</th>
                      <th>Reach</th>
                      <th>Engagement</th>
                      <th>Amount Spent</th>
                      <th>Influencers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-950 text-white">
                      <td className="rounded-l-2xl py-4 pl-4 font-bold">Total</td>
                      <td className="font-bold">{formatNumber(totals.posted)}</td>
                      <td className="font-bold">{formatNumber(totals.reach)}</td>
                      <td className="font-bold">{formatNumber(totals.engagement)}</td>
                      <td className="font-bold">{formatCurrency(totals.amountSpent)}</td>
                      <td className="rounded-r-2xl font-bold">{formatNumber(totals.influencers)}</td>
                    </tr>
                    {propertyData.map((item) => (
                      <tr key={item.name} className="border-b border-slate-100 last:border-0">
                        <td className="max-w-[300px] py-4 font-semibold text-slate-900">{item.name}</td>
                        <td>{formatNumber(item.posted)}</td>
                        <td>{formatNumber(item.reach)}</td>
                        <td>{formatNumber(item.engagement)}</td>
                        <td>{formatCurrency(item.amountSpent)}</td>
                        <td>{formatNumber(item.influencers)}</td>
                      </tr>
                    ))}
                    {!propertyData.length && <tr><td colSpan="6" className="py-10 text-center text-slate-500">No data available for this narrative.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>

            <section className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5">
                <h3 className="mb-5 text-lg font-bold">Reach by Property</h3>
                <div className="space-y-4">
                  {propertyData.map((item) => <ProgressRow key={item.name} label={item.name} value={item.reach} max={maxReach} formatter={formatNumber} />)}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-5 text-lg font-bold">Engagement by Property</h3>
                <div className="space-y-4">
                  {propertyData.map((item) => <ProgressRow key={item.name} label={item.name} value={item.engagement} max={maxEngagement} formatter={formatNumber} />)}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-5 text-lg font-bold">Amount Spent by Property</h3>
                <div className="space-y-4">
                  {propertyData.map((item) => <ProgressRow key={item.name} label={item.name} value={item.amountSpent} max={maxAmount} formatter={formatCurrency} />)}
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
