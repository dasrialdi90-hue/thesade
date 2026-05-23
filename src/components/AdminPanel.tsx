/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Unlock, Sparkles, AlertCircle, RefreshCw, Send, Trash2, HelpCircle } from "lucide-react";
import { CustomCard } from "../types";

interface AdminPanelProps {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  onAddCustomCard: (prompt: string) => Promise<void>;
  customCards: CustomCard[];
  onDeleteCustomCard: (id: string) => void;
  availableColumns: string[];
  sampleValues: Record<string, string[]>;
  isGeneratingCard: boolean;
  errorMessage: string | null;
}

export default function AdminPanel({
  isAdmin,
  setIsAdmin,
  onAddCustomCard,
  customCards,
  onDeleteCustomCard,
  availableColumns,
  sampleValues,
  isGeneratingCard,
  errorMessage
}: AdminPanelProps) {
  const [aiPrompt, setAiPrompt] = useState("");

  const handleLogout = () => {
    setIsAdmin(false);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    await onAddCustomCard(aiPrompt);
    setAiPrompt("");
  };

  const pasteSuggestion = (txt: string) => {
    setAiPrompt(txt);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" id="admin-panel-container">
      {/* Admin Panel Header */}
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Unlock className="w-5 h-5 text-emerald-600 animate-pulse" />
          ) : (
            <Lock className="w-5 h-5 text-slate-400" />
          )}
          <span className="font-semibold text-slate-800 text-sm tracking-tight animate-fade-in">
            Asisten AI Pembuat Metrik {isAdmin ? "(Aktif)" : ""}
          </span>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
            id="btn-admin-logout"
          >
            Keluar Admin
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {!isAdmin ? (
            <motion.div
              key="non-admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-center py-6"
            >
              <div className="bg-slate-50 inline-flex p-3 rounded-full text-slate-400 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan aktifkan <strong>Mode Administrator (Masuk Admin)</strong> pada bagian header atas untuk menggunakan asisten AI generator serta membuat kartu metrics kustom.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="admin-workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Prompt Input Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
                    <h3 className="font-semibold text-sm">Tulis Prompt Metrik Kustom</h3>
                  </div>
                  
                  <form onSubmit={handleAiSubmit} className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Contoh: 'Buatkan kartu untuk menghitung jumlah pegawai dengan Golongan III/b' atau 'kartu pegawai unit Politeknik'"
                        className="w-full h-24 p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none placeholder-slate-400 transition"
                        disabled={isGeneratingCard}
                      />
                      <div className="absolute right-3 bottom-3 flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={isGeneratingCard || !aiPrompt.trim()}
                          className={`p-2 rounded-lg text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                            isGeneratingCard || !aiPrompt.trim()
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {isGeneratingCard ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" /> Kirim AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Recommendations */}
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5 font-medium flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> Rekomendasi Prompt:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => pasteSuggestion("Hitung pegawai Golongan IV/a")}
                        className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        "Hitung Golongan IV/a"
                      </button>
                      <button
                        type="button"
                        onClick={() => pasteSuggestion("Jumlah pegawai Unit Kerja Politeknik ATI Makassar")}
                        className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        "Unit Kerja Politeknik"
                      </button>
                      <button
                        type="button"
                        onClick={() => pasteSuggestion("Pegawai berstatus Selesai Kenaikan Pangkat")}
                        className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        "Kenaikan Selesai"
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-lg flex items-center gap-2 animate-pulse">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Custom Card List Manager */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-col h-56">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-3">
                    Daftar Kartu Kustom AI ({customCards.length})
                  </span>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {customCards.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-300">
                        <Sparkles className="w-8 h-8 opacity-40 mb-1" />
                        <span className="text-xs text-slate-400 font-medium font-sans">Belum ada kartu kustom.<br/>Minta AI di sebelah kiri untuk membuatkannya!</span>
                      </div>
                    ) : (
                      customCards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 shadow-2xs hover:border-slate-300 transition"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-semibold text-slate-800 truncate block">
                              {card.title}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {card.filterColumn} = "{card.filterValue}" ({card.operator})
                            </span>
                          </div>
                          <button
                            onClick={() => onDeleteCustomCard(card.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer animate-fade-in"
                            title="Hapus Kartu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
