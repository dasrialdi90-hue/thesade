/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  HelpCircle,
  UserCheck,
  Briefcase,
  Award,
  Shield,
  ChevronUp
} from "lucide-react";
import { Pegawai, CustomCard } from "../types";

// Icon lookup helper
function getMetricIcon(name: string) {
  switch (name.toLowerCase()) {
    case "users":
      return <Users className="w-5 h-5" />;
    case "usercheck":
      return <UserCheck className="w-5 h-5" />;
    case "briefcase":
      return <Briefcase className="w-5 h-5" />;
    case "alertcircle":
      return <AlertCircle className="w-5 h-5" />;
    case "clock":
      return <Clock className="w-5 h-5" />;
    case "award":
      return <Award className="w-5 h-5" />;
    case "checkcircle":
    case "checkcircle2":
      return <CheckCircle className="w-5 h-5" />;
    case "shield":
      return <Shield className="w-5 h-5" />;
    case "chevronup":
      return <ChevronUp className="w-5 h-5" />;
    default:
      return <HelpCircle className="w-5 h-5" />;
  }
}

// Color theme mapper
function getColorClasses(color: string) {
  switch (color) {
    case "blue":
      return {
        bg: "bg-blue-50/60 border-blue-100",
        text: "text-blue-700",
        icon: "bg-blue-500 text-white"
      };
    case "emerald":
      return {
        bg: "bg-emerald-50/60 border-emerald-100",
        text: "text-emerald-700",
        icon: "bg-emerald-500 text-white"
      };
    case "amber":
      return {
        bg: "bg-amber-50/60 border-amber-100",
        text: "text-amber-700",
        icon: "bg-amber-500 text-white"
      };
    case "rose":
      return {
        bg: "bg-rose-50/60 border-rose-100",
        text: "text-rose-700",
        icon: "bg-rose-500 text-white"
      };
    case "indigo":
      return {
        bg: "bg-indigo-50/60 border-indigo-100",
        text: "text-indigo-700",
        icon: "bg-indigo-500 text-white"
      };
    case "slate":
    default:
      return {
        bg: "bg-slate-50 border-slate-100",
        text: "text-slate-700",
        icon: "bg-slate-500 text-white"
      };
  }
}

interface MetricCardsProps {
  data: Pegawai[];
  customCards: CustomCard[];
  onCardClick?: (filterCol: string, filterVal: string) => void;
}

export default function MetricCards({ data, customCards, onCardClick }: MetricCardsProps) {
  // Stat calculations
  const totalEmployees = data.length;

  // Let's find the correct key for Status Kenaikan Pangkat (case-insensitive)
  const findStatusKey = () => {
    if (totalEmployees === 0) return "Status Kenaikan Pangkat";
    const keys = Object.keys(data[0]);
    return keys.find(k => k.toLowerCase() === "status kenaikan pangkat" || k.toLowerCase() === "status") || "Status Kenaikan Pangkat";
  };

  const findColumnKey = (potentialNames: string[]): string => {
    if (data.length === 0) return "";
    const keys = Object.keys(data[0]);
    for (const name of potentialNames) {
      const found = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return potentialNames[0] || "";
  };

  const statusKey = findStatusKey();
  const monitoringPangkatKey = findColumnKey(["monitoring pangkat"]);
  const monitoringJenjangKey = findColumnKey(["monitoring jenjang"]);

  const countByStatus = (statusKeyword: string) => {
    return data.filter(row => {
      const val = (row[statusKey] || "").toLowerCase();
      return val.includes(statusKeyword.toLowerCase());
    }).length;
  };

  const countByValue = (key: string, valueKeyword: string) => {
    if (!key) return 0;
    return data.filter(row => {
      const val = (row[key] || "").toString().toLowerCase();
      return val === valueKeyword.toLowerCase();
    }).length;
  };

  // Build metrics
  const donePromotionNum = countByStatus("selesai");
  const inProgressNum = countByStatus("proses");
  const incompleteNum = countByStatus("belum") + countByStatus("kurang");

  const bersyaratPangkatNum = countByValue(monitoringPangkatKey, "Bersyarat");
  const bersyaratJenjangNum = countByValue(monitoringJenjangKey, "Bersyarat");

  const indonesianMonths = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const currentMonthName = indonesianMonths[new Date().getMonth()];

  // Helper to evaluate dynamic custom filters
  const evaluateCustomCardValue = (card: CustomCard) => {
    return data.filter(row => {
      // Find exact column key matching case-insensitively
      const colKey = Object.keys(row).find(k => k.toLowerCase() === card.filterColumn.toLowerCase()) || card.filterColumn;
      const rowVal = (row[colKey] || "").toString().toLowerCase();
      const targetVal = card.filterValue.toLowerCase();

      if (card.operator === "equals") {
        return rowVal === targetVal;
      } else if (card.operator === "starts_with") {
        return rowVal.startsWith(targetVal);
      } else {
        // contains
        return rowVal.includes(targetVal);
      }
    }).length;
  };

  const hasClickAction = typeof onCardClick === "function";

  const staticStats = [
    {
      title: "Total Pegawai",
      value: totalEmployees,
      description: "Jumlah seluruh pegawai terdaftar",
      iconName: "users",
      color: "blue",
      filterCol: "",
      filterVal: ""
    },
    {
      title: `Bersyarat naik pangkat pada bulan ${currentMonthName.toLowerCase()}`,
      value: bersyaratPangkatNum,
      description: `Pegawai dengan monitoring pangkat bersyarat di bulan ${currentMonthName}`,
      iconName: "award",
      color: "amber",
      filterCol: monitoringPangkatKey,
      filterVal: "Bersyarat"
    },
    {
      title: `Bersyarat naik jenjang pada bulan ${currentMonthName.toLowerCase()}`,
      value: bersyaratJenjangNum,
      description: `Pegawai dengan monitoring jenjang bersyarat di bulan ${currentMonthName}`,
      iconName: "layers",
      color: "indigo",
      filterCol: monitoringJenjangKey,
      filterVal: "Bersyarat"
    }
  ];

  return (
    <div className="space-y-6" id="metrics-dashboard-grid">
      {/* Standard Core Cards Header */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Metrik Utama Pegawai</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {staticStats.map((stat, idx) => {
            const cl = getColorClasses(stat.color);
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                onClick={() => {
                  if (hasClickAction && stat.filterCol) {
                    onCardClick!(stat.filterCol, stat.filterVal);
                  }
                }}
                className={`p-5 rounded-xl border bg-white cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group relative overflow-hidden`}
              >
                {/* Accent Background Highlights */}
                <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full opacity-5 group-hover:scale-125 transition-transform ${stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : stat.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`} />

                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-500 group-hover:text-slate-800 transition-colors block">
                      {stat.title}
                    </span>
                    <span className="text-3xl font-bold tracking-tight text-slate-900 block">
                      {stat.value}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg text-white ${cl.icon} shadow-xs`}>
                    {getMetricIcon(stat.iconName)}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 font-medium truncate">
                  {stat.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Custom Metris Section - Animate dynamically inside responsive grid */}
      {customCards.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kartu Kustom AI Pendukung</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {customCards.map((card, idx) => {
              const countVal = evaluateCustomCardValue(card);
              const cl = getColorClasses(card.color);
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300, delay: idx * 0.04 }}
                  onClick={() => {
                    if (hasClickAction && card.filterColumn) {
                      onCardClick!(card.filterColumn, card.filterValue);
                    }
                  }}
                  className={`p-5 rounded-xl border bg-white hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden`}
                >
                  {/* Subtle AI Icon Backdrop decoration */}
                  <div className="absolute right-2 top-2 text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded flex items-center gap-0.5 font-bold uppercase tracking-widest scale-90 opacity-70">
                    <Sparkles className="w-2 h-2" /> AI
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-slate-500 group-hover:text-slate-800 transition-colors block leading-tight">
                        {card.title}
                      </span>
                      <span className="text-3xl font-bold tracking-tight text-slate-900 block">
                        {countVal}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-lg text-white ${cl.icon} shadow-3xs`}>
                      {getMetricIcon(card.iconName)}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 font-medium leading-normal" title={card.description}>
                    {card.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
