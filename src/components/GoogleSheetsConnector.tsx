/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  Grid, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Lock,
  Unlock
} from "lucide-react";
import { User } from "firebase/auth";
import { googleSignIn, googleSignOut, initAuth, getAccessToken } from "../lib/firebase";
import { Pegawai } from "../types";

interface GoogleSheetsConnectorProps {
  onDataLoaded: (data: Pegawai[], columns: string[], sourceName: string) => void;
  onResetToDefault: () => void;
  currentSource: string;
}

export default function GoogleSheetsConnector({
  onDataLoaded,
  onResetToDefault,
  currentSource
}: GoogleSheetsConnectorProps) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sheets config state
  const [sheetInput, setSheetInput] = useState(() => {
    return localStorage.getItem("google_sheets_input_val") || "";
  });
  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    return localStorage.getItem("google_sheets_spreadsheet_id") || "";
  });
  const [sheetsMetadata, setSheetsMetadata] = useState<{ title: string; tabs: string[] } | null>(null);
  const [selectedTab, setSelectedTab] = useState(() => {
    return localStorage.getItem("google_sheets_selected_tab") || "";
  });

  // UI state
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [syncingData, setSyncingData] = useState(false);

  // Auto-connect on startup if token or session is active
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        if (currentToken) {
          setToken(currentToken);
        }
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync token from cached ref if state doesn't have it but user is present
  const getOrPromptToken = async (): Promise<string | null> => {
    let activeToken = token || getAccessToken();
    if (!activeToken) {
      setStatusMsg({ type: "info", text: "Sesi otorisasi kedaluwarsa. Silakan Hubungkan Google Akun Anda." });
      try {
        setIsLoggingIn(true);
        const result = await googleSignIn();
        if (result) {
          setUser(result.user);
          setToken(result.accessToken);
          setNeedsAuth(false);
          setStatusMsg({ type: "success", text: "Berhasil menghubungkan Akun Google!" });
          return result.accessToken;
        }
      } catch (err: any) {
        setStatusMsg({ type: "error", text: `Gagal otorisasi Google: ${err.message || err}` });
      } finally {
        setIsLoggingIn(false);
      }
      return null;
    }
    return activeToken;
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setStatusMsg({ type: "success", text: "Berhasil masuk! Silakan masukkan link spreadsheet Anda di bawah." });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: `Gagal masuk Google: ${err.message || "Batal"}` });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    setStatusMsg(null);
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setSheetsMetadata(null);
      onResetToDefault();
      setStatusMsg({ type: "info", text: "Koneksi Google Sheets diputus. Kembali ke data bawaan." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Gagal keluar: ${err.message}` });
    }
  };

  // Extract Spreadsheet ID from Google Sheet URL or return raw ID
  const parseSpreadsheetId = (input: string): string => {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  // Fetch spreadsheet sheets and title
  const loadSpreadsheetMetadata = async (targetId: string, currentToken: string) => {
    if (!targetId) return;
    setLoadingMeta(true);
    setStatusMsg({ type: "info", text: "Menghubungkan ke Google Sheets..." });
    setSheetsMetadata(null);

    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetId}?fields=properties.title,sheets.properties.title`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }
      );

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        throw new Error(errDetail.error?.message || `Error status: ${res.status}`);
      }

      const meta = await res.json();
      const title = meta.properties?.title || "Google Sheet Tanpa Nama";
      const tabs = (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

      if (tabs.length === 0) {
        throw new Error("Tidak menemukan lembar kerja (worksheet tab) dalam Spreadsheet ini.");
      }

      setSheetsMetadata({ title, tabs });
      setStatusMsg({ type: "success", text: `Terhubung ke spreadsheet "${title}"!` });
      
      // Auto-select first tab if not selected yet
      if (!selectedTab || !tabs.includes(selectedTab)) {
        setSelectedTab(tabs[0]);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ 
        type: "error", 
        text: `Gagal membaca spreadsheet: ${err.message || "Periksa kembali izin akses & ID spreadsheet"}` 
      });
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleConnectSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim()) return;

    const currentToken = await getOrPromptToken();
    if (!currentToken) return;

    const id = parseSpreadsheetId(sheetInput);
    setSpreadsheetId(id);
    localStorage.setItem("google_sheets_input_val", sheetInput);
    localStorage.setItem("google_sheets_spreadsheet_id", id);

    await loadSpreadsheetMetadata(id, currentToken);
  };

  // Fetch actual cell values from selected sheet tab
  const fetchSheetValues = async (targetId: string, tabName: string, currentToken: string) => {
    if (!targetId || !tabName) return;
    setSyncingData(true);
    setStatusMsg({ type: "info", text: `Mengambil data dari lembar "${tabName}"...` });

    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent(tabName)}?valueRenderOption=FORMATTED_VALUE`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }
      );

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        throw new Error(errDetail.error?.message || `Error status: ${res.status}`);
      }

      const result = await res.json();
      const values = result.values as string[][];

      if (!values || values.length < 2) {
        throw new Error("Tabel kosong atau baris data di bawah judul kolom tidak ditemukan.");
      }

      // First row: Headers
      const rawHeaders = values[0];
      const headers = rawHeaders.map(h => (h || "").trim()).filter(Boolean);

      // Subsequent rows: Employee data
      const rows: Pegawai[] = [];
      for (let i = 1; i < values.length; i++) {
        const valRow = values[i];
        if (valRow.length === 0 || valRow.every(v => !v)) continue;

        const obj: Pegawai = {};
        rawHeaders.forEach((header, idx) => {
          if (header) {
            obj[header] = (valRow[idx] !== undefined ? String(valRow[idx]) : "").trim();
          }
        });
        rows.push(obj);
      }

      localStorage.setItem("google_sheets_selected_tab", tabName);
      
      // Update app data
      onDataLoaded(rows, headers, `Google Sheet (${tabName})`);
      setStatusMsg({ type: "success", text: `Berhasil mensinkronisasi ${rows.length} data pegawai secara live!` });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: `Gagal sync data: ${err.message}` });
    } finally {
      setSyncingData(false);
    }
  };

  const handleSyncCurrentValues = async () => {
    const currentToken = await getOrPromptToken();
    if (!currentToken) return;

    if (!spreadsheetId || !selectedTab) {
      setStatusMsg({ type: "error", text: "Silakan hubungkan spreadsheet dan pilih lembar tab terlebih dahulu." });
      return;
    }

    await fetchSheetValues(spreadsheetId, selectedTab, currentToken);
  };

  // Re-fetch sheet values whenever the sheet tab is changed manually from dropdown
  const handleTabChange = async (tabName: string) => {
    setSelectedTab(tabName);
    const currentToken = await getOrPromptToken();
    if (!currentToken) return;
    await fetchSheetValues(spreadsheetId, tabName, currentToken);
  };

  // Automatically refresh metadata on mount if sheet is saved
  useEffect(() => {
    if (user && spreadsheetId) {
      const activeToken = token || getAccessToken();
      if (activeToken) {
        loadSpreadsheetMetadata(spreadsheetId, activeToken).then(() => {
          if (selectedTab) {
            fetchSheetValues(spreadsheetId, selectedTab, activeToken);
          }
        });
      }
    }
  }, [user]);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-3xs p-6 space-y-5" id="google-sheets-connector">
      {/* Connector Header Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Koneksi Google Sheets</h3>
            <p className="text-[10px] text-slate-400 font-medium">Baca & sinkronisasi data pegawai langsung dari Spreadsheet Anda</p>
          </div>
        </div>
        
        {user && (
          <button
            onClick={handleGoogleLogout}
            className="text-[10px] font-bold px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors cursor-pointer"
          >
            Putuskan Hubungan
          </button>
        )}
      </div>

      {/* Auth Gate and Form UI */}
      {needsAuth ? (
        <div className="text-center py-6 space-y-4">
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Untuk menggunakan data dari spreadsheets Google Dokumen Anda sendiri, silakan masuk menggunakan akun Google Anda terlebih dahulu dengan otorisasi aman.
          </p>
          
          <div className="flex justify-center">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button transition-transform hover:scale-[1.02] cursor-pointer"
              style={{
                background: "white",
                border: "1px solid #dadce0",
                borderRadius: "8px",
                display: "inline-flex",
                height: "40px",
                padding: "0 16px",
                alignItems: "center"
              }}
            >
              <div className="gsi-material-button-contents flex items-center gap-2.5">
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span className="text-xs font-bold text-slate-700">Hubungkan via Google</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Linked User Profile Display */}
          <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2">
              {user?.photoURL ? (
                <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName || "Avatar"} className="w-8 h-8 rounded-full border border-slate-200" />
              ) : (
                <div className="w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full flex items-center justify-center text-xs">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
              )}
              <div className="leading-tight">
                <span className="text-xs font-bold text-slate-700 block">{user?.displayName || "Pengguna Terhubung"}</span>
                <span className="text-[10px] text-slate-400 font-mono block">{user?.email}</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full select-none">
              Otorisasi Aktif
            </span>
          </div>

          {/* Connect Spreadsheets Form */}
          <form onSubmit={handleConnectSpreadsheet} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-9 relative">
              <input
                type="text"
                placeholder="Tempel tautan Google Sheets atau input Spreadsheet ID..."
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                className="w-full p-2.5 pr-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
                disabled={loadingMeta || syncingData}
              />
              {sheetInput && (
                <button
                  type="button"
                  onClick={() => setSheetInput("")}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loadingMeta || syncingData || !sheetInput.trim()}
              className={`sm:col-span-3 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-white ${
                !sheetInput.trim() || loadingMeta || syncingData
                  ? "bg-slate-250 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-3xs"
              }`}
            >
              {loadingMeta ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Hubungkan"}
            </button>
          </form>

          {/* Sheets Tab Selection dropdown if spreadsheet parsed */}
          {sheetsMetadata && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pilih Lembar Tab (Sheet Tab):</label>
                <select
                  value={selectedTab}
                  onChange={(e) => handleTabChange(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                  disabled={syncingData}
                >
                  {sheetsMetadata.tabs.map(tab => (
                    <option key={tab} value={tab}>{tab}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSyncCurrentValues}
                  disabled={syncingData || !selectedTab}
                  className={`w-full py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition select-none ${
                    syncingData ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingData ? "animate-spin" : ""}`} />
                  {syncingData ? "Mensinkronisasi..." : "Sinkronkan Data Sekarang"}
                </button>
              </div>
            </div>
          )}

          {/* Quick template guide or links info */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-[11px] text-amber-800 leading-relaxed font-sans shadow-3xs">
            <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
              💡 Format Kolom spreadsheet yang didukung:
            </span>
            <span>
              Buat kolom di baris pertama spreadsheet dengan nama: <strong className="font-mono">NAMA</strong>, <strong className="font-mono">PKT</strong> (Golongan), <strong className="font-mono">JABATAN</strong>, <strong className="font-mono">MONITORING PANGKAT</strong>, dan <strong className="font-mono">MONITORING JENJANG</strong> untuk hasil visualisasi yang optimal.
            </span>
          </div>
        </div>
      )}

      {/* Global Status messages banner */}
      <AnimatePresence mode="wait">
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
              statusMsg.type === "success" 
                ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                : statusMsg.type === "error"
                ? "bg-rose-50 border border-rose-100 text-rose-600"
                : "bg-blue-55 text-blue-700 bg-blue-50/60 border border-blue-100"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${statusMsg.type === 'error' ? 'text-rose-500' : 'text-blue-500'}`} />
            )}
            <span className="leading-normal font-medium">{statusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
