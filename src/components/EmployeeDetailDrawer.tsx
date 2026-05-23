/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { X, User, Shield, Briefcase, Award, Building, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { Pegawai } from "../types";

interface EmployeeDetailDrawerProps {
  employee: Pegawai | null;
  onClose: () => void;
}

export default function EmployeeDetailDrawer({ employee, onClose }: EmployeeDetailDrawerProps) {
  if (!employee) return null;

  // Identify dynamic keys in provided employee object
  const findVal = (possibleKeys: string[]) => {
    const keys = Object.keys(employee);
    const key = keys.find(k => possibleKeys.flatMap(pk => [pk.toLowerCase(), pk.toUpperCase(), pk]).includes(k));
    return key ? employee[key] : "";
  };

  const name = findVal(["nama pegawai", "nama"]);
  const nip = findVal(["nip", "id"]);
  const gol = findVal(["golongan", "gol", "pkt"]);
  const pangkat = findVal(["pangkat", "kelas"]);
  const jabatan = findVal(["jabatan", "posisi"]);
  const jenjang = findVal(["jenjang", "fungsional", "jjg jabatan"]);
  const unit = findVal(["unit kerja", "unit", "departemen"]);
  const status = findVal(["monitoring pangkat", "status kenaikan pangkat", "status"]);

  const monitoringPangkat = findVal(["monitoring pangkat"]);
  const monitoringJenjang = findVal(["monitoring jenjang"]);
  const mkPkt = findVal(["massa kerja pkt terakhir"]);
  const mkJab = findVal(["massa kerja jjg jabatan terakhir"]);
  const pakIntegrasi = findVal(["pak integrasi"]);
  const tmtPkt = findVal(["tmt pkt"]);
  const tmtJabatan = findVal(["tmt jabatan"]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" id="employee-detail-drawer">
      {/* Drawer Overlay (Dark Transparent backing) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-3xs"
      />

      {/* Drawer Body Container */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col z-10 overflow-hidden"
      >
        {/* Drawer Header (Blue theme) */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-white rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Detail Profil Pegawai</h3>
              <p className="text-[11px] text-blue-100 font-medium">Sistem Monitoring Pangkat & Jabatan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-white hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Contents Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Avatar & Core Profile Badge Card */}
          <div className="text-center bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-blue-500/5 rounded-full" />
            
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full mx-auto flex items-center justify-center font-bold text-lg border-2 border-white shadow-xs">
              {(name || "U").slice(0, 2).toUpperCase()}
            </div>
            
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-base leading-tight">{name || "Pegawai"}</h4>
              <span className="font-mono text-xs text-slate-400 font-medium block">NIP. {nip || "-"}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200/60 rounded-full text-xs font-bold text-slate-700 font-mono shadow-2xs">
              GOLONGAN {gol || "-"}
            </div>
          </div>

          {/* Profile Metadata List */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" /> Informasi Kepegawaian & Analisis
            </h5>

            <div className="grid grid-cols-1 gap-3">
              {/* Pangkat & Golongan */}
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                <Award className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Pangkat / Golongan</span>
                  <span className="text-xs text-slate-700 font-bold block uppercase">
                    {gol || "-"} {pangkat ? `(${pangkat})` : ""}
                  </span>
                  {tmtPkt && (
                    <span className="text-[10px] text-slate-400 font-medium block">TMT: {tmtPkt}</span>
                  )}
                </div>
              </div>

              {/* Jabatan */}
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                <Briefcase className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Jabatan Utama</span>
                  <span className="text-xs text-slate-700 font-bold block">
                    {jabatan || "-"}
                  </span>
                  {tmtJabatan && (
                    <span className="text-[10px] text-slate-400 font-medium block">TMT Jabatan: {tmtJabatan}</span>
                  )}
                </div>
              </div>

              {/* Jenjang */}
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Jenjang Jabatan</span>
                  <span className="text-xs text-slate-700 font-bold block">
                    {jenjang || "-"}
                  </span>
                </div>
              </div>

              {/* PAK Integrasi */}
              {pakIntegrasi && (
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                  <Award className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Angka Kredit PAK Integrasi</span>
                    <span className="text-xs text-slate-700 font-bold block">
                      {pakIntegrasi}
                    </span>
                  </div>
                </div>
              )}

              {/* Masa Kerja Pangkat */}
              {mkPkt && (
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Masa Kerja Pangkat Terakhir</span>
                    <span className="text-xs text-slate-700 font-medium block">
                      {mkPkt}
                    </span>
                  </div>
                </div>
              )}

              {/* Masa Kerja Jenjang */}
              {mkJab && (
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Masa Kerja Jenjang Jabatan</span>
                    <span className="text-xs text-slate-700 font-medium block">
                      {mkJab}
                    </span>
                  </div>
                </div>
              )}

              {/* Unit Kerja */}
              {unit && (
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-100/80 rounded-lg hover:shadow-2xs transition">
                  <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Unit Kerja</span>
                    <span className="text-xs text-slate-700 font-semibold block">
                      {unit}
                    </span>
                  </div>
                </div>
              )}

              {/* Analysis: Monitoring Pangkat */}
              {monitoringPangkat && (
                <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg transition">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide block">Analisis Kelayakan Pangkat</span>
                    <span className="text-xs text-slate-800 font-bold block uppercase mt-0.5">
                      {monitoringPangkat}
                    </span>
                  </div>
                </div>
              )}

              {/* Analysis: Monitoring Jenjang */}
              {monitoringJenjang && (
                <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg transition">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide block">Analisis Kelayakan Jenjang</span>
                    <span className="text-xs text-slate-800 font-bold block uppercase mt-0.5">
                      {monitoringJenjang}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer text-center"
          >
            Cetak Profil Pegawai
          </button>
        </div>
      </motion.div>
    </div>
  );
}
