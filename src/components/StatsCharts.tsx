/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { BarChart3, PieChart, Layers, HelpCircle, Award } from "lucide-react";
import { Pegawai } from "../types";

interface StatsChartsProps {
  data: Pegawai[];
  onBarClick?: (filterCol: string, filterVal: string) => void;
}

export default function StatsCharts({ data, onBarClick }: StatsChartsProps) {
  const total = data.length;

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400" id="stats-charts-placeholder">
        Tidak ada data pegawai untuk dianalisis.
      </div>
    );
  }

  // Find column keys case-insensitively
  const findColumnKey = (potentialNames: string[]): string => {
    const keys = Object.keys(data[0]);
    for (const name of potentialNames) {
      const found = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return potentialNames[0];
  };

  const golonganKey = findColumnKey(["pkt", "golongan", "gol", "pangkat"]);
  const jenjangKey = findColumnKey(["jenjang", "fungsional", "tingkat"]);
  const statusKey = findColumnKey(["status kenaikan pangkat", "status", "status kenaikan"]);
  const jabatanKey = findColumnKey(["jabatan", "posisi", "nama jabatan"]);

  // Calculate distributions
  const getDistribution = (columnKey: string) => {
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const val = row[columnKey] || "Belum Terisi";
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100)
      }))
      .sort((a, b) => b.value - a.value); // Sort descending
  };

  const golonganData = getDistribution(golonganKey);
  const jenjangData = getDistribution(jenjangKey);
  const statusData = getDistribution(statusKey);
  
  const rawJabatanData = getDistribution(jabatanKey);
  
  // Group into top 5 and "Lainnya" if there are more than 5 distinct jabatan categories
  const getJabatanChartData = () => {
    if (rawJabatanData.length <= 5) return rawJabatanData;
    const top5 = rawJabatanData.slice(0, 5);
    const rest = rawJabatanData.slice(5);
    const restTotal = rest.reduce((sum, item) => sum + item.value, 0);
    const restPercentage = Math.round((restTotal / total) * 100);
    return [
      ...top5,
      {
        name: "Lainnya",
        value: restTotal,
        percentage: restPercentage
      }
    ];
  };

  const jabatanChartData = getJabatanChartData();

  // Group into top 5 and "Lainnya" if there are more than 5 distinct golongan categories
  const getGolonganChartData = () => {
    if (golonganData.length <= 5) return golonganData;
    const top5 = golonganData.slice(0, 5);
    const rest = golonganData.slice(5);
    const restTotal = rest.reduce((sum, item) => sum + item.value, 0);
    const restPercentage = Math.round((restTotal / total) * 100);
    return [
      ...top5,
      {
        name: "Lainnya",
        value: restTotal,
        percentage: restPercentage
      }
    ];
  };

  const golonganChartData = getGolonganChartData();

  const hasClickAction = typeof onBarClick === "function";

  const colorPalettes = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-rose-500",
    "bg-violet-500 font-bold",
    "bg-sky-500",
    "bg-slate-500"
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full animate-fade-in" id="visualisasi-statistik">
      
      {/* 1. Golongan/Pangkat Chart (Donut-style circular segments for PKT) */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-slate-50 mb-4">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Distribusi Golongan (PKT)</h3>
          </div>

          <div className="relative flex justify-center py-2 mb-4">
            {/* Donut SVG */}
            <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
              {/* Base grey track circle */}
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke="#f8fafc"
                strokeWidth="10"
              />
              
              {(() => {
                let cumulativePercent = 0;
                return golonganChartData.map((item, idx) => {
                  const R = 35;
                  const C = 2 * Math.PI * R; // ~219.91
                  const strokeDashoffset = C - (item.percentage / 100) * C;
                  const strokeDasharray = `${C} ${C}`;
                  const rotation = (cumulativePercent / 100) * 360;
                  cumulativePercent += item.percentage;
                  
                  const themeStrokeColors = [
                    "#2563eb", // blue-600
                    "#0d9488", // teal-600
                    "#06b6d4", // cyan-500
                    "#4f46e5", // indigo-600
                    "#6366f1", // indigo-500
                    "#0284c7"  // sky-600
                  ];
                  
                  const strokeColor = themeStrokeColors[idx % themeStrokeColors.length];
                  
                  return (
                    <circle
                      key={item.name}
                      cx="50"
                      cy="50"
                      r="35"
                      fill="transparent"
                      stroke={strokeColor}
                      strokeWidth="10"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: "50px 50px"
                      }}
                      className="transition-all cursor-pointer hover:stroke-[12px] opacity-95 hover:opacity-100"
                      title={`${item.name}: ${item.value} (${item.percentage}%)`}
                      onClick={() => hasClickAction && onBarClick!(golonganKey, item.name)}
                    />
                  );
                });
              })()}
              
              {/* Inner Text hole block */}
              <g transform="translate(50, 50) rotate(90)" textAnchor="middle" className="pointer-events-none">
                <text y="2" className="text-[10px] font-bold text-slate-800 font-sans" fill="currentColor">
                  {total}
                </text>
                <text y="10" className="text-[4px] font-bold uppercase tracking-widest text-slate-400" fill="currentColor">
                  Pegawai
                </text>
              </g>
            </svg>
          </div>

          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {golonganChartData.map((item, index) => {
              const ringColors = [
                "bg-blue-600",
                "bg-teal-600",
                "bg-cyan-500",
                "bg-indigo-600",
                "bg-indigo-500",
                "bg-sky-600"
              ];
              return (
                <div
                  key={item.name}
                  onClick={() => hasClickAction && onBarClick!(golonganKey, item.name)}
                  className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-md cursor-pointer text-[11px] group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ringColors[index % ringColors.length]}`} />
                    <span className="font-semibold text-slate-600 group-hover:text-blue-600 transition-colors truncate block uppercase" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 font-mono flex-shrink-0 ml-1">
                    {item.value} <span className="text-[9px] text-slate-400 font-normal">({item.percentage}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        <p className="text-[10px] text-slate-400 mt-4 leading-normal select-none font-sans">
          ℹ️ Klik pada segmen donat atau nama golongan di atas untuk memfilter tabel.
        </p>
      </div>

      {/* 4. Jabatan Donut Chart (Donut-style circular segments) */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-slate-50 mb-4">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Distribusi Kategori Jabatan</h3>
          </div>

          <div className="relative flex justify-center py-2 mb-4">
            {/* Donut SVG */}
            <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
              {/* Base grey track circle */}
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke="#f8fafc"
                strokeWidth="10"
              />
              
              {(() => {
                let cumulativePercent = 0;
                return jabatanChartData.map((item, idx) => {
                  const R = 35;
                  const C = 2 * Math.PI * R; // ~219.91
                  const strokeDashoffset = C - (item.percentage / 100) * C;
                  const strokeDasharray = `${C} ${C}`;
                  const rotation = (cumulativePercent / 100) * 360;
                  cumulativePercent += item.percentage;
                  
                  const themeStrokeColors = [
                    "#3b82f6", // blue-500
                    "#10b981", // emerald-500
                    "#f59e0b", // amber-500
                    "#6366f1", // indigo-500
                    "#ec4899", // pink-500
                    "#8b5cf6"  // violet-500
                  ];
                  
                  const strokeColor = themeStrokeColors[idx % themeStrokeColors.length];
                  
                  return (
                    <circle
                      key={item.name}
                      cx="50"
                      cy="50"
                      r="35"
                      fill="transparent"
                      stroke={strokeColor}
                      strokeWidth="10"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: "50px 50px"
                      }}
                      className="transition-all cursor-pointer hover:stroke-[12px] opacity-95 hover:opacity-100"
                      title={`${item.name}: ${item.value} (${item.percentage}%)`}
                      onClick={() => hasClickAction && onBarClick!(jabatanKey, item.name)}
                    />
                  );
                });
              })()}
              
              {/* Inner Text hole block */}
              <g transform="translate(50, 50) rotate(90)" textAnchor="middle" className="pointer-events-none">
                <text y="2" className="text-[10px] font-bold text-slate-800 font-sans" fill="currentColor">
                  {total}
                </text>
                <text y="10" className="text-[4px] font-bold uppercase tracking-widest text-slate-400" fill="currentColor">
                  Jabatan
                </text>
              </g>
            </svg>
          </div>

          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {jabatanChartData.map((item, index) => {
              const ringColors = [
                "bg-blue-500",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-indigo-500",
                "bg-pink-500",
                "bg-violet-500"
              ];
              return (
                <div
                  key={item.name}
                  onClick={() => hasClickAction && onBarClick!(jabatanKey, item.name)}
                  className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-md cursor-pointer text-[11px] group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ringColors[index % ringColors.length]}`} />
                    <span className="font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors truncate block" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 font-mono flex-shrink-0 ml-1">
                    {item.value} <span className="text-[9px] text-slate-400 font-normal">({item.percentage}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-4 leading-normal select-none">
          ℹ️ Klik pada segmen donat atau nama jabatan di atas untuk memfilter tabel.
        </p>
      </div>

    </div>
  );
}
