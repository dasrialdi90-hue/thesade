/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Layers, 
  RefreshCw, 
  Sparkles, 
  Database,
  Grid,
  Info,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  BookOpen,
  Lock,
  Unlock,
  BarChart3
} from "lucide-react";
import { Pegawai, CustomCard } from "./types";

import AdminPanel from "./components/AdminPanel";
import MetricCards from "./components/MetricCards";
import StatsCharts from "./components/StatsCharts";
import EmployeeTable from "./components/EmployeeTable";
import EmployeeDetailDrawer from "./components/EmployeeDetailDrawer";
import GoogleSheetsConnector from "./components/GoogleSheetsConnector";
import MonitoringPengajuan from "./components/MonitoringPengajuan";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOZMUqBnpFybLVYHhEgmf8NQYlujf_PtCE7sl97rvY1YOT72ObbO_c_GSPyP1fLg/pub?gid=877709935&single=true&output=csv";

// Fallback Indonesian civil service data in case Sheet fetch fails
const FALLBACK_DATA = [
  { "No": "1", "NAMA": "Budi Santoso", "PKT": "III/b", "TMT PKT": "01/10/2023", "JABATAN": "Pranata Komputer", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "24/05/2021", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "2", "NAMA": "Hendra Wijaya", "PKT": "III/c", "TMT PKT": "01/04/2022", "JABATAN": "Analis Kepegawaian", "JJG JABATAN": "Ahli Muda", "TMT JABATAN": "15/08/2020", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "3", "NAMA": "Siti Aminah", "PKT": "IV/a", "TMT PKT": "01/10/2021", "JABATAN": "Arsiparis", "JJG JABATAN": "Ahli Madya", "TMT JABATAN": "10/12/2019", "MONITORING PANGKAT": "TIDAK", "MONITORING JENJANG": "Bersyarat" },
  { "No": "4", "NAMA": "Rizky Alamsyah", "PKT": "III/a", "TMT PKT": "01/10/2024", "JABATAN": "Pranata Komputer", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "24/05/2021", "MONITORING PANGKAT": "NAIK JENJANG JABATAN DULU", "MONITORING JENJANG": "Belum Memenuhi Syarat" },
  { "No": "5", "NAMA": "Dewi Lestari", "PKT": "III/b", "TMT PKT": "01/04/2023", "JABATAN": "Analis Hukum Aparatur", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "01/03/2018", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "6", "NAMA": "Gunawan Prasetyo", "PKT": "IV/b", "TMT PKT": "01/10/2022", "JABATAN": "Pranata Komputer", "JJG JABATAN": "Ahli Madya", "TMT JABATAN": "15/05/2021", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "7", "NAMA": "Adelia Putri", "PKT": "III/a", "TMT PKT": "01/04/2024", "JABATAN": "Pengelola Sistem Informasi", "JJG JABATAN": "Ahli Pertama", "TMT JMR JABATAN": "01/03/2022", "MONITORING PANGKAT": "BELUM 2 TAHUN", "MONITORING JENJANG": "Belum Memenuhi Syarat" },
  { "No": "8", "NAMA": "Andi Wijaya", "PKT": "III/c", "TMT PKT": "01/10/2023", "JABATAN": "Auditor", "JJG JABATAN": "Ahli Muda", "TMT JABATAN": "12/12/2021", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "9", "NAMA": "Rina Kartika", "PKT": "III/d", "TMT PKT": "01/10/2020", "JABATAN": "Analis Kepegawaian", "JJG JABATAN": "Ahli Muda", "TMT JABATAN": "14/08/2018", "MONITORING PANGKAT": "BELUM MEMENUHI SYARAT", "MONITORING JENJANG": "Belum Memenuhi Syarat" },
  { "No": "10", "NAMA": "Fajar Ramadhan", "PKT": "III/a", "TMT PKT": "01/10/2024", "JABATAN": "Pranata Hubungan Masyarakat", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "24/05/2021", "MONITORING PANGKAT": "NAIK JENJANG JABATAN DULU", "MONITORING JENJANG": "Belum Memenuhi Syarat" }
];

function parseCSV(text: string): Record<string, string>[] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      result.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (row.length > 0 || cell) {
    row.push(cell.trim());
    result.push(row);
  }

  if (result.length === 0) return [];

  const headers = result[0].map(h => 
    h.replace(/^"|"$/g, '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < result.length; i++) {
    const values = result[i];
    if (values.length === 0 || values.every(v => !v)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = (values[idx] || "").replace(/^"|"$/g, '').trim();
    });
    rows.push(rowObj);
  }
  return rows;
}

function generateCardOffline(prompt: string, columns: string[], sampleValues: Record<string, string[]>): any {
  const normPrompt = prompt.toLowerCase();

  let selectedColumn = "";
  let selectedValue = "";
  let operator = "contains";
  
  let bestScore = -1;
  for (const col of columns) {
    const colSamples = sampleValues[col] || [];
    for (const val of colSamples) {
      if (!val || val.length < 2) continue;
      const lowerVal = val.toLowerCase();
      if (normPrompt.includes(lowerVal)) {
        const score = lowerVal.length;
        if (score > bestScore) {
          bestScore = score;
          selectedColumn = col;
          selectedValue = val;
          operator = "equals";
        }
      }
    }
  }

  if (!selectedColumn) {
    for (const col of columns) {
      const lowerCol = col.toLowerCase();
      if (normPrompt.includes(lowerCol) || 
          (lowerCol.includes("jabatan") && normPrompt.includes("jabatan")) ||
          (lowerCol.includes("jenjang") && normPrompt.includes("jenjang")) ||
          (lowerCol.includes("pangkat") && normPrompt.includes("pangkat")) ||
          (lowerCol.includes("golongan") && normPrompt.includes("golongan"))) {
        selectedColumn = col;
        
        const promptWords = normPrompt.split(/\s+/).filter(w => 
          w.length > 2 && 
          !lowerCol.includes(w) && 
          !["filter", "cari", "tampilkan", "pegawai", "dengan", "yang", "dan", "atau"].includes(w)
        );
        
        if (promptWords.length > 0) {
          selectedValue = promptWords[promptWords.length - 1];
          operator = "contains";
        } else {
          selectedValue = (sampleValues[col] && sampleValues[col][0]) || "";
          operator = "contains";
        }
        break;
      }
    }
  }

  if (!selectedColumn && columns.length > 0) {
    const priorities = [
      "MONITORING PANGKAT",
      "MONITORING JENJANG",
      "PKT",
      "JABATAN",
      "JJG JABATAN",
      "PANGKAT"
    ];
    for (const prefix of priorities) {
      const found = columns.find(c => c.toUpperCase().includes(prefix) || prefix.includes(c.toUpperCase()));
      if (found) {
        selectedColumn = found;
        const samples = sampleValues[found] || [];
        if (normPrompt.includes("ya") || normPrompt.includes("layak")) {
          selectedValue = "YA";
          operator = "equals";
        } else if (normPrompt.includes("bersyarat")) {
          selectedValue = "Bersyarat";
          operator = "contains";
        } else if (normPrompt.includes("belum") || normPrompt.includes("tidak")) {
          selectedValue = samples.find(s => s.toLowerCase().includes("belum") || s.toLowerCase().includes("tidak")) || "TIDAK";
          operator = "contains";
        } else {
          selectedValue = samples[0] || "";
          operator = "contains";
        }
        break;
      }
    }
  }

  if (!selectedColumn) {
    selectedColumn = columns[0] || "NAMA";
    selectedValue = "YA";
  }

  const finalCol = selectedColumn;
  const finalVal = selectedValue || "YA";

  let color = "indigo";
  let iconName = "CheckCircle2";
  
  const lowerVal = finalVal.toLowerCase();
  const lowerCol = finalCol.toLowerCase();

  if (lowerVal === "ya" || lowerVal === "yes" || lowerVal.includes("selesai")) {
    color = "emerald";
    iconName = "CheckCircle2";
  } else if (lowerVal === "tidak" || lowerVal === "no" || lowerVal.includes("belum") || lowerVal.includes("gagal") || lowerVal.includes("tidak layak") || lowerVal.includes("maks")) {
    color = "rose";
    iconName = "AlertCircle";
  } else if (lowerVal.includes("bersyarat") || lowerVal.includes("proses") || lowerVal.includes("sedang") || lowerVal.includes("belum 2 tahun") || lowerVal.includes("tahun")) {
    color = "amber";
    iconName = "Clock";
  } else if (lowerCol.includes("jabatan") || lowerCol.includes("posisi")) {
    color = "blue";
    iconName = "Briefcase";
  } else if (lowerCol.includes("pkt") || lowerCol.includes("golongan") || lowerCol.includes("pangkat")) {
    color = "indigo";
    iconName = "Award";
  }

  let title = prompt.length < 32 ? prompt : `Filter ${finalCol}`;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const description = `Menampilkan data pegawai dengan ${finalCol} ${operator === 'equals' ? 'bernilai' : 'mengandung'} "${finalVal}"`;

  return {
    title,
    description,
    iconName,
    color,
    filterColumn: finalCol,
    filterValue: finalVal,
    operator
  };
}

export default function App() {
  const [data, setData] = useState<Pegawai[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("google-sheets");

  // Admin and Custom Cards State with LocalStorage Persistence
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem("hr_dashboard_is_admin") === "true";
  });

  const [customCards, setCustomCards] = useState<CustomCard[]>(() => {
    const saved = localStorage.getItem("hr_dashboard_custom_cards");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Pegawai | null>(null);
  const [showStats, setShowStats] = useState(false);

  // AI Generation States
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Admin login dialog states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Google Sheets Dialog states
  const [showSheetsModal, setShowSheetsModal] = useState(false);

  // Active Tab navigation state
  const [activeTab, setActiveTab] = useState<"dashboard" | "monitoring-pengajuan">("dashboard");

  const handleHeaderLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin2026") {
      setIsAdmin(true);
      setLoginError("");
      setShowLoginModal(false);
      setUsername("");
      setPassword("");
    } else {
      setLoginError("Username atau Password salah! (admin / admin2026)");
    }
  };

  // Helper to discover columns dynamically
  const findColumnKey = (potentialNames: string[]): string => {
    if (data.length === 0) return "";
    const keys = Object.keys(data[0]);
    for (const name of potentialNames) {
      const found = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return potentialNames[0] || "";
  };

  const monitoringPangkatKey = findColumnKey(["monitoring pangkat"]);
  const monitoringJenjangKey = findColumnKey(["monitoring jenjang", "monitoring jabatan"]);
  const namaKey = findColumnKey(["nama pegawai", "nama"]);
  const nipKey = findColumnKey(["nip", "id"]);
  const golKey = findColumnKey(["golongan", "gol", "pkt"]);
  const jabatanKey = findColumnKey(["jabatan", "posisi", "nama jabatan"]);

  const bersyaratPangkatList = data.filter(row => {
    const val = (row[monitoringPangkatKey] || "").toString().toLowerCase();
    return val === "bersyarat";
  });

  const bersyaratJenjangList = data.filter(row => {
    const val = (row[monitoringJenjangKey] || "").toString().toLowerCase();
    return val === "bersyarat";
  });

  // Persist Admin and Custom Cards
  useEffect(() => {
    localStorage.setItem("hr_dashboard_is_admin", isAdmin.toString());
  }, [isAdmin]);

  useEffect(() => {
    localStorage.setItem("hr_dashboard_custom_cards", JSON.stringify(customCards));
  }, [customCards]);

  // Fetch primary data on mount
  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Try backend API first in case it has been initialized or is running
      const res = await fetch("/api/data");
      if (!res.ok) {
        throw new Error(`API responded with status: ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setColumns(result.columns);
        setDataSource(result.source);
        setLoading(false);
        return;
      } else {
        throw new Error(result.message || "Gagal mengambil data.");
      }
    } catch (err: any) {
      console.warn("Backend API not reachable. Connecting directly to Google Sheets CSV from client. Error:", err.message);
      
      // 2. Direct browser fetch of Google Sheet CSV (Vercel-safe fallback)
      try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) {
          throw new Error(`Google Sheets responded with status: ${response.status}`);
        }
        const text = await response.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          throw new Error("No data found in Google Sheets CSV");
        }
        
        setData(parsed);
        setColumns(Object.keys(parsed[0]));
        setDataSource("google-sheets-direct");
      } catch (sheetsErr: any) {
        console.error("Direct Google Sheet fetch failed. Using preloaded fallback data. Error:", sheetsErr.message);
        
        // 3. Absolute fail-safe: local dataset
        setData(FALLBACK_DATA);
        setColumns(Object.keys(FALLBACK_DATA[0]));
        setDataSource("fallback-state");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to extract clean samples for AI Context
  const getSampleValues = () => {
    const samples: Record<string, string[]> = {};
    columns.forEach(col => {
      const vals = Array.from(new Set(data.map(r => r[col]).filter(Boolean)));
      samples[col] = vals.slice(0, 4) as string[]; // limit to 4 samples to save token budget
    });
    return samples;
  };

  // Trigger AI Endpoint to Suggest and Add custom metric card
  const handleAddCustomCard = async (prompt: string) => {
    setIsGeneratingCard(true);
    setAiErrorMessage(null);
    setAiSuccessMessage(null);

    try {
      const samples = getSampleValues();
      let cardResult: any = null;

      try {
        const response = await fetch("/api/ai/generate-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            columns,
            sampleValues: samples
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.card) {
            cardResult = result.card;
          }
        }
      } catch (apiErr) {
        console.warn("Express AI endpoint unreachable. Generating card locally.");
      }

      // If the express server didn't handle it (or was 404), use client-side heuristic parser
      if (!cardResult) {
        cardResult = generateCardOffline(prompt, columns, samples);
      }

      if (cardResult) {
        const newCard: CustomCard = {
          id: `card_${Date.now()}`,
          ...cardResult
        };
        setCustomCards(prev => [...prev, newCard]);
        setAiSuccessMessage(`Berhasil menambahkan Kartu Kustom AI: "${newCard.title}"!`);
        
        // Auto-hide success message
        setTimeout(() => setAiSuccessMessage(null), 5000);
      } else {
        throw new Error("Gagal memproses pembuatan kartu metrics.");
      }
    } catch (err: any) {
      setAiErrorMessage(err.message || "Gagal terhubung dengan server AI.");
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Delete dynamic custom card
  const handleDeleteCustomCard = (id: string) => {
    setCustomCards(prev => prev.filter(c => c.id !== id));
  };

  const handleCustomDataLoaded = (loadedData: Pegawai[], loadedColumns: string[], sourceName: string) => {
    setData(loadedData);
    setColumns(loadedColumns);
    setDataSource(sourceName);
  };

  const handleResetToDefault = () => {
    fetchData();
  };

  // Dynamic filter applicator for metrics & charts clicks
  const handleApplyFilter = (column: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [column]: value
    }));
    
    // Smooth scroll down to interactive table
    const tableEl = document.getElementById("employee-filtered-table");
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col" id="dashboard-application-root">
      
      {/* 1. Brand Banner Header (Dominant Blue header, Professional Polish theme layout) */}
      <header className="h-16 bg-blue-800 flex items-center justify-between px-6 sm:px-8 shadow-md z-10 shrink-0 relative overflow-hidden">
        {/* Vector decoration mesh background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-450 via-blue-500 to-indigo-900 pointer-events-none" />
        
        <div className="flex items-center space-x-3 z-10">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <Award className="w-6 h-6" />
          </div>
          <h1 className="text-white font-bold text-base sm:text-lg tracking-tight flex items-center">
            <span>SIM-PEGAWAI</span>
            <span className="text-blue-200 font-normal ml-3 border-l border-blue-600 pl-3 leading-none hidden sm:inline">
              Monitoring Pangkat
            </span>
          </h1>
        </div>

        <div className="flex items-center space-x-3.5 z-10">
          {/* Compact Administrator mode trigger */}
          {isAdmin ? (
            <button
              onClick={() => setIsAdmin(false)}
              className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md hover:bg-emerald-500/35 transition-colors flex items-center gap-1 cursor-pointer select-none font-sans"
              title="Keluar Mode Administrator"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Admin: Aktif</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setLoginError("");
                setShowLoginModal(true);
              }}
              className="text-[10px] font-bold px-2.5 py-1 bg-white/10 text-blue-100 border border-white/20 rounded-md hover:bg-white/15 transition-colors flex items-center gap-1 cursor-pointer font-sans"
              title="Masuk Mode Administrator"
            >
              <Lock className="w-3.5 h-3.5 text-blue-300" />
              <span>Masuk Admin</span>
            </button>
          )}

          <button
            onClick={() => setShowSheetsModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/35 px-2.5 py-1.5 rounded-md shadow-3xs cursor-pointer select-none font-sans transition-all"
            title="Kelola Koneksi Google Sheets"
          >
            <Database className="w-3.5 h-3.5 text-emerald-200" />
            <span className="max-w-[120px] md:max-w-xs truncate">
              {dataSource.startsWith("google-sheets") ? "Sheet: Aktif" : "Hubungkan Sheet"}
            </span>
          </button>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-1 px-2 hover:bg-white/15 rounded-md transition-colors cursor-pointer border border-transparent hover:border-white/10 text-white flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* 2. Main Workstation Area Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        

        {/* Global Loading screen trigger */}
        {loading && (
          <div className="space-y-6 py-6" id="dashboard-loading-skeleton">
            {/* Pulsating block structures */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white p-5 rounded-xl border border-slate-100 h-24 animate-pulse space-y-3">
                  <div className="h-3 bg-slate-200 w-1/2 rounded" />
                  <div className="h-6 bg-slate-200 w-1/3 rounded" />
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="bg-white p-6 rounded-xl border border-slate-100 h-52 animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 w-1/3 rounded" />
                  <div className="space-y-2 pt-2">
                    <div className="h-3 bg-slate-200 w-full rounded" />
                    <div className="h-3 bg-slate-200 w-5/6 rounded" />
                    <div className="h-3 bg-slate-200 w-4/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fetch Error Display */}
        {fetchError && !loading && (
          <div className="text-center bg-white border border-rose-100 p-8 rounded-xl shadow-xs" id="fetch-error-container">
            <span className="p-3 bg-rose-50 inline-block rounded-full text-rose-500 mb-2">⚠️</span>
            <h3 className="font-bold text-slate-800 text-base">Gagal memuat data pegawai</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">{fetchError}</p>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-3xs"
            >
              Coba Hubungkan Ulang
            </button>
          </div>
        )}

        {/* Actual Dynamic Workstation View Modules */}
        {!loading && !fetchError && (
          <div className="space-y-6 animate-fade-in" id="dashboard-active-modules">

            {/* Dynamic visual tab switcher layout with standard responsive styling */}
            <div className="flex border-b border-slate-200 select-none bg-white p-1 rounded-lg border border-slate-100 shadow-3xs">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 rounded-md flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-blue-600 text-white shadow-3xs"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Grid className="w-4 h-4" /> Monitoring Kepegawaian
              </button>
              <button
                onClick={() => setActiveTab("monitoring-pengajuan")}
                className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 rounded-md flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "monitoring-pengajuan"
                    ? "bg-emerald-600 text-white shadow-3xs"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Award className="w-4 h-4" /> Monitoring Pengajuan
              </button>
            </div>

            {activeTab === "dashboard" ? (
              <div className="space-y-8 animate-fade-in">
            
            {/* A. Summary KPIs Metric Cards grid */}
            <MetricCards
              data={data}
              customCards={customCards}
              onCardClick={handleApplyFilter}
            />

            {/* B. Admin Board and AI Genni Generator Panel - ONLY shown when logged in as Admin */}
            {isAdmin && (
              <AdminPanel
                isAdmin={isAdmin}
                setIsAdmin={setIsAdmin}
                onAddCustomCard={handleAddCustomCard}
                customCards={customCards}
                onDeleteCustomCard={handleDeleteCustomCard}
                availableColumns={columns}
                sampleValues={getSampleValues()}
                isGeneratingCard={isGeneratingCard}
                errorMessage={aiErrorMessage}
              />
            )}

            {/* Floating pop notification for successful AI operations */}
            <AnimatePresence>
              {aiSuccessMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  className="fixed bottom-5 left-5 z-40 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2.5 font-medium text-xs whitespace-normal leading-relaxed"
                >
                  <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0 animate-pulse" />
                  <span>{aiSuccessMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* C. Dynamic visual charts (SVG, HTML lists interactive stats) with show/hide toggle */}
            <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-100 shadow-3xs" id="visualisasi-statistik-container">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500" /> Visualisasi Data Statistik
                </h2>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md transition-all cursor-pointer shadow-3xs select-none"
                >
                  {showStats ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden pt-3"
                  >
                    <StatsCharts
                      data={data}
                      onBarClick={handleApplyFilter}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* B2. Conditional promotion/jenjang lists with Amber context theme */}
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dafar Pegawai Status Bersyarat</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="pegawai-status-bersyarat">
                {/* Card 1: Monitoring Pangkat Bersyarat */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-3xs p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-3.5">
                      <div className="flex items-center gap-2">
                         <span className="p-1.5 bg-amber-50 text-amber-600 rounded">
                           <Award className="w-4 h-4" />
                         </span>
                         <div>
                           <h3 className="text-sm font-semibold text-slate-800">Bersyarat Naik Pangkat</h3>
                           <span className="text-[10px] text-slate-400 font-medium block">Kategori "Bersyarat" pada kolom Monitoring Pangkat</span>
                         </div>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                        {bersyaratPangkatList.length} Orang
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {bersyaratPangkatList.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs font-medium">
                          Tidak ada pegawai dengan status bersyarat naik pangkat.
                        </div>
                      ) : (
                        bersyaratPangkatList.map((emp, index) => {
                          const name = String(emp[namaKey] || "N/A");
                          const nip = String(emp[nipKey] || "-");
                          const gol = String(emp[golKey] || "-");
                          
                          return (
                            <div
                              key={nip + "_" + index}
                              className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 rounded-lg group transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase font-sans">
                                  {name.charAt(0) || "?"}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-700 block truncate group-hover:text-amber-700 transition-colors">
                                    {name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    NIP: {nip} • Gol: {gol}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedEmployee(emp)}
                                className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded shadow-3xs transition cursor-pointer flex items-center"
                              >
                                Detail
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 2: Monitoring Jabatan/Jenjang Bersyarat */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-3xs p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-3.5">
                      <div className="flex items-center gap-2">
                         <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                           <Layers className="w-4 h-4" />
                         </span>
                         <div>
                           <h3 className="text-sm font-semibold text-slate-800">Bersyarat Naik Jenjang</h3>
                           <span className="text-[10px] text-slate-400 font-medium block">Kategori "Bersyarat" pada kolom Monitoring Jenjang</span>
                         </div>
                      </div>
                      <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full font-mono">
                        {bersyaratJenjangList.length} Orang
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {bersyaratJenjangList.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs font-medium">
                          Tidak ada pegawai dengan status bersyarat naik jenjang.
                        </div>
                      ) : (
                        bersyaratJenjangList.map((emp, index) => {
                          const name = String(emp[namaKey] || "N/A");
                          const nip = String(emp[nipKey] || "-");
                          const jbtn = String(emp[jabatanKey] || "-");
                          
                          return (
                            <div
                              key={nip + "_" + index}
                              className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 rounded-lg group transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase font-sans">
                                  {name.charAt(0) || "?"}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-700 block truncate group-hover:text-indigo-700 transition-colors">
                                    {name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate font-medium max-w-[150px] md:max-w-[200px]" title={jbtn}>
                                    NIP: {nip} • {jbtn}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedEmployee(emp)}
                                className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded shadow-3xs transition cursor-pointer flex items-center"
                              >
                                Detail
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* D. Main Employee database filtered list table */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tabel Interaktif Pegawai</h2>
              <EmployeeTable
                data={data}
                columns={columns}
                activeFilters={activeFilters}
                setActiveFilters={setActiveFilters}
                onSelectEmployee={(emp) => setSelectedEmployee(emp)}
                selectedEmployeeNIP={selectedEmployee ? (selectedEmployee["NIP"] || selectedEmployee["nip"] || selectedEmployee["NAMA"] || selectedEmployee["nama"] || null) : null}
              />
            </div>

            {/* E. Profile detailing slide-over drawer block */}
            <AnimatePresence>
              {selectedEmployee && (
                <EmployeeDetailDrawer
                  employee={selectedEmployee}
                  onClose={() => setSelectedEmployee(null)}
                />
              )}
            </AnimatePresence>

              </div>
            ) : (
              <MonitoringPengajuan employees={data} isAdmin={isAdmin} />
            )}

          </div>
        )}

      </main>

      {/* Dynamic Login Dialog / Modal Backdrop driven from Header */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs text-slate-800 z-10"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-105 overflow-hidden z-20"
              id="admin-login-modal"
            >
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="bg-blue-50 inline-flex p-3 rounded-full text-blue-600 mb-2">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Masuk Administrator</h3>
                  <p className="text-xs text-slate-400 mt-1">Masukkan kredensial admin untuk melanjutkan</p>
                </div>

                <form onSubmit={handleHeaderLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Username</label>
                    <input
                      type="text"
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username (admin)"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
                    <input
                      type="password"
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (admin2026)"
                      required
                    />
                  </div>

                  {loginError && (
                    <span className="text-[11px] text-rose-500 block text-center font-medium">
                      {loginError}
                    </span>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(false)}
                      className="w-1/2 py-2 text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
                    >
                      Konfirmasi
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Sheets Live Database Connection Modal overlay */}
      <AnimatePresence>
        {showSheetsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheetsModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-10"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 flex flex-col max-h-[90vh]"
              id="google-sheets-modal"
            >
              <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Pengaturan Google Sheets</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Muat dan integrasikan basis data personalia secara real-time</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSheetsModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <GoogleSheetsConnector
                  onDataLoaded={handleCustomDataLoaded}
                  onResetToDefault={handleResetToDefault}
                  currentSource={dataSource}
                />
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSheetsModal(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 text-white rounded-lg text-xs font-bold cursor-pointer shadow-3xs transition"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Footer Copyright system */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 select-none">
        <div className="space-y-1">
          <p className="font-semibold text-slate-500">Sistem Informasi Monitoring Pangkat dan Jabatan (Si-Pangkat) © 2026</p>
          <p className="font-medium text-slate-400">Politeknik ATI Makassar • Kementerian Perindustrian</p>
        </div>
      </footer>

    </div>
  );
}
