/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Briefcase
} from "lucide-react";
import { Pegawai } from "../types";

// Determine Row Status style
function getRowStatusStyle(status: string) {
  const clean = (status || "").toLowerCase();
  if (clean.includes("selesai")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
  } else if (clean.includes("proses")) {
    return "bg-amber-50 text-amber-700 border border-amber-200/50";
  } else {
    return "bg-rose-50 text-rose-700 border border-rose-200/50";
  }
}

function getMonitoringPangkatStyle(val: string) {
  const clean = (val || "").toLowerCase();
  if (clean === "ya") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
  } else if (clean.includes("naik") || clean.includes("dulu") || clean.includes("jabatan")) {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200/50";
  } else if (clean.includes("belum") || clean.includes("tidak") || clean.includes("maks") || clean.includes("tahun")) {
    return "bg-rose-50 text-rose-700 border border-rose-200/50";
  } else {
    return "bg-slate-50 text-slate-700 border border-slate-200/50";
  }
}

function getMonitoringJenjangStyle(val: string) {
  const clean = (val || "").toLowerCase();
  if (clean === "ya") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
  } else if (clean.includes("bersyarat")) {
    return "bg-amber-50 text-amber-700 border border-amber-200/50";
  } else if (clean.includes("belum") || clean.includes("tidak") || clean.includes("syarat")) {
    return "bg-rose-50 text-rose-700 border border-rose-200/50";
  } else {
    return "bg-slate-50 text-slate-700 border border-slate-200/50";
  }
}

interface EmployeeTableProps {
  data: Pegawai[];
  columns: string[];
  activeFilters: Record<string, string>;
  setActiveFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSelectEmployee: (employee: Pegawai) => void;
  selectedEmployeeNIP: string | null;
}

export default function EmployeeTable({
  data,
  columns,
  activeFilters,
  setActiveFilters,
  onSelectEmployee,
  selectedEmployeeNIP
}: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Reset page when search or filters change
  const handleFilterChange = (col: string, val: string) => {
    setActiveFilters(prev => {
      const copy = { ...prev };
      if (!val) {
        delete copy[col];
      } else {
        copy[col] = val;
      }
      return copy;
    });
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setActiveFilters({});
    setSortBy(null);
    setCurrentPage(1);
  };

  // Identify common column keys dynamically
  const findColumnKey = (potentialNames: string[]): string => {
    for (const name of potentialNames) {
      const found = columns.find(k => k.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return columns[0] || "";
  };

  const nameKey = findColumnKey(["nama", "nama pegawai", "employee name", "nama"]);
  const nipKey = findColumnKey(["nip", "nomor induk pegawai", "id"]);
  const golonganKey = findColumnKey(["pkt", "golongan", "gol"]);
  const pangkatKey = findColumnKey(["pangkat", "kelas"]);
  const jabatanKey = findColumnKey(["jabatan", "posisi"]);
  const jenjangKey = findColumnKey(["jjg jabatan", "jenjang", "fungsional"]);
  const statusKey = findColumnKey(["status kenaikan pangkat", "status"]);
  const unitKey = findColumnKey(["unit kerja", "unit", "departemen"]);

  const monitoringPangkatKey = findColumnKey(["monitoring pangkat"]);
  const monitoringJenjangKey = findColumnKey(["monitoring jenjang"]);
  const tmtPktKey = findColumnKey(["tmt pkt"]);
  const tmtJabatanKey = findColumnKey(["tmt jabatan"]);
  const mkPktKey = findColumnKey(["massa kerja pkt terakhir"]);
  const mkJabKey = findColumnKey(["massa kerja jjg jabatan terakhir"]);

  // Calculate unique values for key filtering columns
  const getUniqueValues = (colKey: string) => {
    if (!colKey) return [];
    const values = new Set<string>();
    data.forEach(row => {
      const val = row[colKey];
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  };

  const uniqueGolongans = getUniqueValues(golonganKey);
  const uniqueJenjangs = getUniqueValues(jenjangKey);
  const uniqueStatuses = getUniqueValues(monitoringPangkatKey || statusKey);
  const uniqueJenjangStatuses = getUniqueValues(monitoringJenjangKey);
  const uniqueUnits = getUniqueValues(unitKey);

  // Sorting Handler
  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Process and filter the dataset
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Text Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(row => {
        return Object.values(row).some(v => (v || "").toString().toLowerCase().includes(q));
      });
    }

    // 2. Column Select Filters
    Object.entries(activeFilters).forEach(([col, val]) => {
      if (val) {
        result = result.filter(row => {
          const rowVal = row[col] || "";
          // Exact matching or partial matching for flexible datasets
          return rowVal.toLowerCase() === val.toLowerCase() || rowVal.toLowerCase().includes(val.toLowerCase());
        });
      }
    });

    // 3. Sorting
    if (sortBy) {
      result.sort((a, b) => {
        const valA = (a[sortBy] || "").toString().toLowerCase();
        const valB = (b[sortBy] || "").toString().toLowerCase();

        // Check if numerical or alphabetical
        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === "asc" ? numA - numB : numB - numA;
        }

        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
    }

    return result;
  }, [data, searchTerm, activeFilters, sortBy, sortDirection]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

  // Print view handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (data.length === 0) return;
    const csvHeaders = columns.join(",");
    const csvRows = processedData.map(row => 
      columns.map(col => `"${(row[col] || '').replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [csvHeaders, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Pegawai_Filtered_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-3xs overflow-hidden" id="employee-filtered-table">
      
      {/* Table Action Controls Panel (Search, Filters, Print) */}
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Cari nama, NIP, jabatan, unit kerja..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 self-end">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Cetak Halaman"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Ekspor ke CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            
            {(searchTerm || Object.keys(activeFilters).length > 0 || sortBy) && (
              <button
                onClick={resetAllFilters}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          {/* Golongan Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Golongan
            </label>
            <select
              value={activeFilters[golonganKey] || ""}
              onChange={(e) => handleFilterChange(golonganKey, e.target.value)}
              className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Golongan</option>
              {uniqueGolongans.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Jenjang Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Jenjang
            </label>
            <select
              value={activeFilters[jenjangKey] || ""}
              onChange={(e) => handleFilterChange(jenjangKey, e.target.value)}
              className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Jenjang</option>
              {uniqueJenjangs.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Monitoring Pangkat Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Monitoring Pangkat
            </label>
            <select
              value={activeFilters[monitoringPangkatKey || statusKey] || ""}
              onChange={(e) => handleFilterChange(monitoringPangkatKey || statusKey, e.target.value)}
              className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Pangkat</option>
              {uniqueStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Monitoring Jenjang Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Monitoring Jenjang
            </label>
            <select
              value={activeFilters[monitoringJenjangKey] || ""}
              onChange={(e) => handleFilterChange(monitoringJenjangKey, e.target.value)}
              className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
            >
              <option value="">Semua Jenjang</option>
              {uniqueJenjangStatuses.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content with Sticky Header and Custom Vertical Scroll */}
      <div className="overflow-x-auto overflow-y-auto max-h-[550px] min-h-64 relative custom-scrollbar">
        <table className="w-full border-collapse text-left text-sm" id="table-raw-pegawai">
          <thead>
            <tr className="select-none">
              <th className="px-6 py-3.5 text-xs font-bold tracking-wider text-center w-12 bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">No</th>
              <th
                onClick={() => toggleSort(nameKey)}
                className="px-6 py-3.5 text-xs font-bold tracking-wider cursor-pointer hover:bg-slate-100/50 hover:text-slate-800 transition bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]"
              >
                <div className="flex items-center gap-1">
                  <span>Nama Pegawai</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort(golonganKey)}
                className="px-6 py-3.5 text-xs font-bold tracking-wider cursor-pointer hover:bg-slate-100/50 hover:text-slate-800 transition text-center bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Pangkat/Gol.</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-6 py-3.5 text-xs font-bold tracking-wider bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">Jabatan / Jenjang</th>
              <th
                onClick={() => toggleSort(monitoringPangkatKey || statusKey)}
                className="px-6 py-3.5 text-xs font-bold tracking-wider cursor-pointer hover:bg-slate-100/50 hover:text-slate-800 transition text-center bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Monitoring Pangkat</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort(monitoringJenjangKey)}
                className="px-6 py-3.5 text-xs font-bold tracking-wider cursor-pointer hover:bg-slate-100/50 hover:text-slate-800 transition text-center bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Monitoring Jenjang</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                  Belum ada data pegawai yang sesuai dengan kriteria filter.
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedData.map((row, index) => {
                  const numIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const nipVal = row[nipKey] || "";
                  const tmtPktVal = row[tmtPktKey] || "";
                  const nameVal = row[nameKey] || "Pegawai No Name";
                  const golVal = row[golonganKey] || "-";
                  const jabVal = row[jabatanKey] || "-";
                  const jenjangVal = row[jenjangKey] || "-";
                  const monitPktVal = row[monitoringPangkatKey] || row[statusKey] || "-";
                  const monitJenjangVal = row[monitoringJenjangKey] || "-";

                  // Display NIP if present, otherwise display TMT PKT
                  const secondaryDetails = nipVal ? `NIP. ${nipVal}` : (tmtPktVal ? `TMT Pkt: ${tmtPktVal}` : "");
                  const isSelected = selectedEmployeeNIP === (nipVal || nameVal);

                  return (
                    <motion.tr
                      key={nameVal + numIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => onSelectEmployee(row)}
                      className={`hover:bg-blue-50/20 active:bg-blue-50/40 transition cursor-pointer ${
                        isSelected ? "bg-blue-50/40 border-l-4 border-l-blue-600 font-medium scale-[0.995] shadow-xs" : ""
                      }`}
                    >
                      {/* 1. Item Index */}
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">{numIndex}</td>
                      
                      {/* 2. Employee Identity */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className={`text-sm tracking-tight text-slate-800 block ${isSelected ? "font-semibold text-blue-700" : "font-medium"}`}>
                            {nameVal}
                          </span>
                          {secondaryDetails && (
                            <span className="font-mono text-xs text-slate-400 tracking-wider block">
                              {secondaryDetails}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Rank / Group */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-slate-100/85 border border-slate-200/40 text-xs font-mono font-bold text-slate-700">
                          {golVal}
                        </span>
                      </td>

                      {/* 4. Position & Grade level */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="text-xs text-slate-700 block font-medium max-w-xs truncate" title={jabVal}>
                            {jabVal}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium italic">
                            {jenjangVal}
                          </span>
                        </div>
                      </td>

                      {/* 5. Monitoring Pangkat status badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${getMonitoringPangkatStyle(monitPktVal)}`}>
                          {monitPktVal.toLowerCase().includes("ya") ? (
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span>{monitPktVal}</span>
                        </span>
                      </td>

                      {/* 6. Monitoring Jenjang status badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${getMonitoringJenjangStyle(monitJenjangVal)}`}>
                          {monitJenjangVal.toLowerCase() === "ya" ? (
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          ) : monitJenjangVal.toLowerCase().includes("bersyarat") ? (
                            <Clock className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span>{monitJenjangVal}</span>
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer - Pagination and Size Select Components */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md focus:outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={100000}>Tampilkan Semua Data</option>
            </select>
            <span>baris</span>
          </div>
          <span>•</span>
          <span>Saring: {processedData.length} dari {data.length} pegawai</span>
        </div>

        <div className="flex items-center justify-end gap-1.5 self-end">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              currentPage === 1
                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pg = idx + 1;
              // Simple pagination ellipse helper
              if (totalPages > 6 && Math.abs(currentPage - pg) > 1 && pg !== 1 && pg !== totalPages) {
                if (pg === 2 || pg === totalPages - 1) {
                  return <span key={pg} className="text-slate-300 text-xs px-1">...</span>;
                }
                return null;
              }
              return (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    currentPage === pg
                      ? "bg-blue-600 text-white shadow-xs scale-105"
                      : "text-slate-600 bg-white hover:bg-slate-50"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              currentPage === totalPages
                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
