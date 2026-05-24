/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  setDoc,
  deleteDoc, 
  query, 
  orderBy, 
  getFirestore 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ProposalProgress, CustomCategory, Pegawai, CustomProposalType } from "../types";
import { 
  Database, 
  Plus, 
  Edit3, 
  Trash2, 
  User, 
  FileText, 
  Image as ImageIcon, 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  ExternalLink, 
  Download,
  Award,
  BookOpen,
  PieChart,
  BarChart,
  Grid,
  TrendingUp,
  X,
  FileSpreadsheet,
  Printer,
  ChevronDown
} from "lucide-react";

// For strict error tracking matching skill directives
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

interface MonitoringPengajuanProps {
  employees: Pegawai[];
  isAdmin: boolean;
}

export default function MonitoringPengajuan({ employees, isAdmin }: MonitoringPengajuanProps) {
  // DB states
  const [proposals, setProposals] = useState<ProposalProgress[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [customProposalTypes, setCustomProposalTypes] = useState<CustomProposalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [selectedPegawai, setSelectedPegawai] = useState("");
  const [jenisPengusulan, setJenisPengusulan] = useState("Kenaikan Pangkat");
  const [kategoriStatus, setKategoriStatus] = useState("Pelengkapan Dokumen");
  const [deskripsiProgress, setDeskripsiProgress] = useState("");
  const [urlFile, setUrlFile] = useState("");
  const [urlGambar, setUrlGambar] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Parameter forms visibility states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newProposalTypeName, setNewProposalTypeName] = useState("");
  const [showProposalTypeForm, setShowProposalTypeForm] = useState(false);

  // Interactive Report Filters
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterJenis, setFilterJenis] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Search/Filters for User & Reports
  const [searchByName, setSearchByName] = useState("");
  const [viewedEmployeeName, setViewedEmployeeName] = useState("");

  // Default Categories List
  const defaultCategories = useMemo(() => [
    "Pelengkapan Dokumen",
    "Pengajuan",
    "Menunggu SK",
    "Selesai"
  ], []);

  // Combine Default & Custom categories
  const allCategories = useMemo(() => {
    const combined = [...defaultCategories];
    customCategories.forEach(cat => {
      if (!combined.includes(cat.name)) {
        combined.push(cat.name);
      }
    });
    return combined;
  }, [customCategories, defaultCategories]);

  // Default Proposal Types (Kategori Pengusulan)
  const defaultProposalTypes = useMemo(() => [
    "Kenaikan Pangkat",
    "Kenaikan Jenjang Jabatan"
  ], []);

  // Combine Default & Custom proposal types
  const allProposalTypes = useMemo(() => {
    const combined = [...defaultProposalTypes];
    customProposalTypes.forEach(pt => {
      if (!combined.includes(pt.name)) {
        combined.push(pt.name);
      }
    });
    return combined;
  }, [customProposalTypes, defaultProposalTypes]);

  // Firestore Error formulation helper
  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: null // We use local credential username admin instead of firebase auth UID for writing
      },
      operationType,
      path
    };
    console.error('Firestore Error details: ', JSON.stringify(errInfo));
    setErrorMsg(`Gagal memproses operasi database (${operationType}): ${errInfo.error}`);
  };

  // On Mount: Load categories and proposals (with local storage backups)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);
      let localProposals: ProposalProgress[] = [];
      let localCats: CustomCategory[] = [];
      let localPropTypes: CustomProposalType[] = [];

      // 1. Check local storage fallback first
      try {
        const storedProp = localStorage.getItem("hr_local_props_backup");
        if (storedProp) localProposals = JSON.parse(storedProp);

        const storedCats = localStorage.getItem("hr_local_cats_backup");
        if (storedCats) localCats = JSON.parse(storedCats);

        const storedPropTypes = localStorage.getItem("hr_local_prop_types_backup");
        if (storedPropTypes) localPropTypes = JSON.parse(storedPropTypes);
      } catch (e) {
        console.warn("Local storage parse fail", e);
      }

      // 2. Fetch from live Firestore
      try {
        // Categories
        const catSnap = await getDocs(collection(db, "categories"));
        const fbCats: CustomCategory[] = [];
        catSnap.forEach(doc => {
          fbCats.push({ id: doc.id, ...doc.data() } as CustomCategory);
        });

        // Proposal Types
        const propTypesSnap = await getDocs(collection(db, "proposalTypes"));
        const fbPropTypes: CustomProposalType[] = [];
        propTypesSnap.forEach(doc => {
          fbPropTypes.push({ id: doc.id, ...doc.data() } as CustomProposalType);
        });

        // Proposals
        const propSnap = await getDocs(collection(db, "proposals"));
        const fbProps: ProposalProgress[] = [];
        propSnap.forEach(doc => {
          fbProps.push({ id: doc.id, ...doc.data() } as ProposalProgress);
        });

        // Merge and prioritize Firestore, update state and cache local backups
        if (fbCats.length > 0) {
          setCustomCategories(fbCats);
          localStorage.setItem("hr_local_cats_backup", JSON.stringify(fbCats));
        } else {
          setCustomCategories(localCats);
        }

        if (fbPropTypes.length > 0) {
          setCustomProposalTypes(fbPropTypes);
          localStorage.setItem("hr_local_prop_types_backup", JSON.stringify(fbPropTypes));
        } else {
          setCustomProposalTypes(localPropTypes);
        }

        if (fbProps.length > 0) {
          // Sort desc by updatedAt
          fbProps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setProposals(fbProps);
          localStorage.setItem("hr_local_props_backup", JSON.stringify(fbProps));
        } else {
          setProposals(localProposals);
        }

      } catch (err) {
        console.warn("Firestore not bootstrapped or permissions blocked. Using offline state. Error:", err);
        setCustomCategories(localCats);
        setCustomProposalTypes(localPropTypes);
        setProposals(localProposals);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-fill form values on edit
  const handleStartEdit = (item: ProposalProgress) => {
    setEditingId(item.id);
    setSelectedPegawai(item.pegawaiName);
    setJenisPengusulan(item.jenisPengusulan);
    setKategoriStatus(item.kategoriStatus);
    setDeskripsiProgress(item.deskripsiProgress);
    setUrlFile(item.urlFile || "");
    setUrlGambar(item.urlGambar || "");
    setErrorMsg(null);
    setSuccessMsg(null);

    // Scroll up to admin editor
    document.getElementById("editor-panel-header")?.scrollIntoView({ behavior: "smooth" });
  };

  // Reset progress form
  const resetForm = () => {
    setEditingId(null);
    setSelectedPegawai("");
    setJenisPengusulan("Kenaikan Pangkat");
    setKategoriStatus("Pelengkapan Dokumen");
    setDeskripsiProgress("");
    setUrlFile("");
    setUrlGambar("");
  };

  // Submit dynamic progress update
  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPegawai) {
      setErrorMsg("Harap pilih nama pegawai");
      return;
    }
    if (!deskripsiProgress.trim()) {
      setErrorMsg("Deskripsi progress tidak boleh kosong");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const timeString = new Date().toISOString();
    const id = editingId || `prog_${Date.now()}`;

    const newObj: ProposalProgress = {
      id,
      pegawaiName: selectedPegawai,
      jenisPengusulan,
      kategoriStatus,
      deskripsiProgress,
      urlFile: urlFile.trim() || "",
      urlGambar: urlGambar.trim() || "",
      updatedAt: timeString
    };

    try {
      // 1. Try Firebase write
      await setDoc(doc(db, "proposals", id), newObj);
      
      // Update local state and storage backup
      const updatedProps = editingId 
        ? proposals.map(p => p.id === editingId ? newObj : p)
        : [newObj, ...proposals];
      
      // Sort desc
      updatedProps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setProposals(updatedProps);
      localStorage.setItem("hr_local_props_backup", JSON.stringify(updatedProps));
      setSuccessMsg(editingId ? "Berhasil memperbarui progres pengusulan!" : "Berhasil menginput progres pengusulan baru!");
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, `proposals/${id}`);
      
      // Local recovery backup update
      const updatedProps = editingId 
        ? proposals.map(p => p.id === editingId ? newObj : p)
        : [newObj, ...proposals];
      updatedProps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setProposals(updatedProps);
      localStorage.setItem("hr_local_props_backup", JSON.stringify(updatedProps));
      setSuccessMsg(`(Mode Backup) Berhasil menyimpan data progres secara lokal.`);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  // Delete category or progress update
  const handleDeleteProgress = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data progres ini?")) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteDoc(doc(db, "proposals", id));
      const filtered = proposals.filter(p => p.id !== id);
      setProposals(filtered);
      localStorage.setItem("hr_local_props_backup", JSON.stringify(filtered));
      setSuccessMsg("Berhasil menghapus catatan progres.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `proposals/${id}`);
      
      // Local fallback
      const filtered = proposals.filter(p => p.id !== id);
      setProposals(filtered);
      localStorage.setItem("hr_local_props_backup", JSON.stringify(filtered));
      setSuccessMsg("(Mode Backup) Berhasil menghapus catatan progres secara lokal.");
    }
  };

  // Add custom status category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    if (allCategories.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg("Kategori tersebut sudah ada!");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const catId = `cat_${Date.now()}`;
    const newCatObj: CustomCategory = { id: catId, name: cleanName };

    try {
      await setDoc(doc(db, "categories", catId), newCatObj);
      const updatedCats = [...customCategories, newCatObj];
      setCustomCategories(updatedCats);
      localStorage.setItem("hr_local_cats_backup", JSON.stringify(updatedCats));
      setNewCategoryName("");
      setShowCategoryForm(false);
      setSuccessMsg(`Berhasil menambahkan kategori status kustom baru: "${cleanName}"!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${catId}`);
      
      const updatedCats = [...customCategories, newCatObj];
      setCustomCategories(updatedCats);
      localStorage.setItem("hr_local_cats_backup", JSON.stringify(updatedCats));
      setNewCategoryName("");
      setShowCategoryForm(false);
      setSuccessMsg(`(Mode Backup) Kategori status "${cleanName}" tersimpan secara lokal.`);
    } finally {
      setSaving(false);
    }
  };

  // Delete status category kustom
  const handleDeleteCategory = async (cat: CustomCategory) => {
    if (!window.confirm(`Hapus kategori kustom "${cat.name}"?`)) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteDoc(doc(db, "categories", cat.id));
      const filtered = customCategories.filter(c => c.id !== cat.id);
      setCustomCategories(filtered);
      localStorage.setItem("hr_local_cats_backup", JSON.stringify(filtered));
      setSuccessMsg("Kategori berhasil dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${cat.id}`);
      
      const filtered = customCategories.filter(c => c.id !== cat.id);
      setCustomCategories(filtered);
      localStorage.setItem("hr_local_cats_backup", JSON.stringify(filtered));
      setSuccessMsg("(Mode Backup) Kategori berhasil dihapus secara lokal.");
    }
  };

  // Add custom proposal type
  const handleAddProposalType = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProposalTypeName.trim();
    if (!cleanName) return;

    if (allProposalTypes.some(pt => pt.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg("Jenis pengusulan tersebut sudah ada!");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const typeId = `type_${Date.now()}`;
    const newTypeObj: CustomProposalType = { id: typeId, name: cleanName };

    try {
      await setDoc(doc(db, "proposalTypes", typeId), newTypeObj);
      const updatedTypes = [...customProposalTypes, newTypeObj];
      setCustomProposalTypes(updatedTypes);
      localStorage.setItem("hr_local_prop_types_backup", JSON.stringify(updatedTypes));
      setNewProposalTypeName("");
      setShowProposalTypeForm(false);
      setSuccessMsg(`Berhasil menambahkan jenis pengusulan baru: "${cleanName}"!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `proposalTypes/${typeId}`);
      
      const updatedTypes = [...customProposalTypes, newTypeObj];
      setCustomProposalTypes(updatedTypes);
      localStorage.setItem("hr_local_prop_types_backup", JSON.stringify(updatedTypes));
      setNewProposalTypeName("");
      setShowProposalTypeForm(false);
      setSuccessMsg(`(Mode Backup) Jenis pengusulan "${cleanName}" tersimpan secara lokal.`);
    } finally {
      setSaving(false);
    }
  };

  // Delete custom proposal type
  const handleDeleteProposalType = async (pt: CustomProposalType) => {
    if (!window.confirm(`Hapus jenis pengusulan kustom "${pt.name}"?`)) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteDoc(doc(db, "proposalTypes", pt.id));
      const filtered = customProposalTypes.filter(t => t.id !== pt.id);
      setCustomProposalTypes(filtered);
      localStorage.setItem("hr_local_prop_types_backup", JSON.stringify(filtered));
      setSuccessMsg("Jenis pengusulan berhasil dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `proposalTypes/${pt.id}`);
      
      const filtered = customProposalTypes.filter(t => t.id !== pt.id);
      setCustomProposalTypes(filtered);
      localStorage.setItem("hr_local_prop_types_backup", JSON.stringify(filtered));
      setSuccessMsg("(Mode Backup) Jenis pengusulan berhasil dihapus secara lokal.");
    }
  };

  // Helper lists: active sorted employee list for dropdown auto-completions
  const activeEmployeeNames = useMemo(() => {
    const list = employees.map(emp => emp["NAMA"]).filter(Boolean);
    // Sort alphabetically
    list.sort();
    return list;
  }, [employees]);

  // List of Indonesian months
  const monthsList = useMemo(() => [
    { name: "Januari", short: "Jan", val: "0" },
    { name: "Februari", short: "Feb", val: "1" },
    { name: "Maret", short: "Mar", val: "2" },
    { name: "April", short: "Apr", val: "3" },
    { name: "Mei", short: "Mei", val: "4" },
    { name: "Juni", short: "Jun", val: "5" },
    { name: "Juli", short: "Jul", val: "6" },
    { name: "Agustus", short: "Agu", val: "7" },
    { name: "September", short: "Sep", val: "8" },
    { name: "Oktober", short: "Okt", val: "9" },
    { name: "November", short: "Nov", val: "10" },
    { name: "Desember", short: "Des", val: "11" }
  ], []);

  // Compute unique years in proposal data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    proposals.forEach(p => {
      try {
        const yr = new Date(p.updatedAt).getFullYear().toString();
        if (yr && yr !== "NaN" && yr.length === 4) {
          yearsSet.add(yr);
        }
      } catch (e) {}
    });
    const yearsList = Array.from(yearsSet);
    yearsList.sort((a,b) => b.localeCompare(a)); // Sort descending (e.g., 2026, 2025...)
    return yearsList;
  }, [proposals]);

  // Compute monthly data counts for bar visualization (hanya usulan dengan status selesai)
  const monthlyData = useMemo(() => {
    const counts = Array(12).fill(0);
    proposals.forEach(p => {
      try {
        const dt = new Date(p.updatedAt);
        const yStr = dt.getFullYear().toString();
        const m = dt.getMonth();
        
        // Year filter applies to bar graph. If year is "all", we aggregate.
        if (filterYear === "all" || yStr === filterYear) {
          const matchJenis = filterJenis === "all" || p.jenisPengusulan === filterJenis;
          const isSelesai = p.kategoriStatus?.trim().toLowerCase() === "selesai";
          if (matchJenis && isSelesai) {
            counts[m] += 1;
          }
        }
      } catch (e) {}
    });
    return monthsList.map((m, idx) => ({
      ...m,
      count: counts[idx]
    }));
  }, [proposals, filterYear, filterJenis, monthsList]);

  // Dynamic max value for heights scaling
  const maxMonthlyCount = useMemo(() => {
    const counts = monthlyData.map(d => d.count);
    const maxVal = Math.max(...counts);
    return maxVal > 0 ? maxVal : 1;
  }, [monthlyData]);

  // Combined filtered proposals for the report generator
  const filteredReportProposals = useMemo(() => {
    return proposals.filter(p => {
      try {
        const dt = new Date(p.updatedAt);
        const yStr = dt.getFullYear().toString();
        const mStr = dt.getMonth().toString();
        
        const matchYear = filterYear === "all" || yStr === filterYear;
        const matchMonth = filterMonth === "all" || mStr === filterMonth;
        const matchJenis = filterJenis === "all" || p.jenisPengusulan === filterJenis;
        const matchStatus = filterStatus === "all" || p.kategoriStatus === filterStatus;
        
        return matchYear && matchMonth && matchJenis && matchStatus;
      } catch (e) {
        return false;
      }
    });
  }, [proposals, filterYear, filterMonth, filterJenis, filterStatus]);

  // Printable report handler
  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker aktif. Harap izinkan popup untuk menampilkan laporan cetak.");
      return;
    }
    
    const yearLabel = filterYear === "all" ? "Semua Tahun" : filterYear;
    const monthLabel = filterMonth === "all" ? "Semua Bulan" : monthsList.find(m => m.val === filterMonth)?.name || "";
    const jenisLabel = filterJenis === "all" ? "Semua Jenis" : filterJenis;
    const statusLabel = filterStatus === "all" ? "Semua Status" : filterStatus;
    
    const tableRows = filteredReportProposals.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold; color: #334155;">${p.pegawaiName}</td>
        <td style="padding: 10px; color: #475569;">${p.jenisPengusulan}</td>
        <td style="padding: 10px; color: #475569;"><span style="background-color: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #cbd5e1;">${p.kategoriStatus}</span></td>
        <td style="padding: 10px; color: #475569; font-size: 11px;">${p.deskripsiProgress}</td>
        <td style="padding: 10px; color: #64748b; font-size: 11px; font-family: monospace;">${new Date(p.updatedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan_Monitoring_Kementerian_${yearLabel}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: white; }
            .header { text-align: center; border-bottom: 3px double #334155; padding-bottom: 20px; margin-bottom: 25px; }
            .logo { font-size: 20px; font-weight: 800; tracking: -0.5px; color: #0284c7; }
            .title { font-size: 22px; font-weight: 905; color: #0f172a; margin: 10px 0 5px 0; text-transform: uppercase; }
            .subtitle { font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 12px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-item span { font-weight: 700; color: #0f172a; margin-top: 2px; }
            .meta-item label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }
            th { background-color: #f1f5f9; padding: 12px 10px; font-weight: 750; color: #475569; text-transform: uppercase; font-size: 10px; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 50px; text-align: right; font-size: 11px; color: #94a3b8; }
            .sign { margin-top: 60px; display: inline-block; text-align: center; font-size: 12px; font-weight: bold; border-top: 1px solid #475569; width: 220px; padding-top: 8px; }
            @media print {
              body { padding: 0; }
              @page { size: A4 landscape; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">KEMENTERIAN PERINDUSTRIAN RI</div>
            <div class="title">Sistem Informasi Monitoring Kepegawaian</div>
            <div class="subtitle">Laporan Hasil Pengajuan Pangkat & Jenjang Kepegawaian</div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><label>Tahun Laporan</label><span>${yearLabel}</span></div>
            <div class="meta-item"><label>Bulan Laporan</label><span>${monthLabel || "Semua Bulan"}</span></div>
            <div class="meta-item"><label>Filter Jenis Usulan</label><span>${jenisLabel}</span></div>
            <div class="meta-item"><label>Filter Kategori Status</label><span>${statusLabel}</span></div>
          </div>

          <div style="margin-bottom: 15px; font-size: 12px; font-weight: bold; color: #1e293b;">
            TOTAL USULAN YANG TERCATAT: ${filteredReportProposals.length} DATA
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 25%;">Nama Lengkap Pegawai</th>
                <th style="width: 20%;">Jenis Pengusulan</th>
                <th style="width: 15%;">Status Terbaru</th>
                <th style="width: 20%;">Rincian Progres</th>
                <th style="width: 15%;">Waktu Diupdate</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">Tidak ada data usulan yang memenuhi filter pencarian.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            Dokumen ini dihasilkan secara otomatis dari Portal Kepegawaian Kementerian Perindustrian pada ${new Date().toLocaleString("id-ID")}
            <br />
            <div style="margin-top: 30px;">
              <div style="display: inline-block; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #64748b;">Mengetahui,</p>
                <div class="sign">Admin Kepegawaian Satker</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // CSV Report exporter
  const handleExportCSV = () => {
    if (filteredReportProposals.length === 0) {
      alert("Tidak ada data laporan untuk diekspor ke CSV.");
      return;
    }

    const headers = ["Nama Pegawai", "Jenis Pengusulan", "Kategori Status", "Deskripsi Progress", "Tautan PDF Berkas", "Tautan Gambar Bukti", "Waktu Pembaruan (ISO)"];
    
    // Safely structure comma cells
    const rows = filteredReportProposals.map(p => [
      `"${p.pegawaiName.replace(/"/g, '""')}"`,
      `"${p.jenisPengusulan.replace(/"/g, '""')}"`,
      `"${p.kategoriStatus.replace(/"/g, '""')}"`,
      `"${p.deskripsiProgress.replace(/"/g, '""')}"`,
      `"${(p.urlFile || "").replace(/"/g, '""')}"`,
      `"${(p.urlGambar || "").replace(/"/g, '""')}"`,
      `"${p.updatedAt}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add UTF-8 BOM
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const yearLabel = filterYear === "all" ? "SemuaTahun" : filterYear;
    const monthLabel = filterMonth === "all" ? "SemuaBulan" : monthsList.find(m => m.val === filterMonth)?.name || "";
    
    link.setAttribute("download", `Laporan_Pengajuan_${yearLabel}_${monthLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg("Berhasil mengunduh dokumen laporan bentuk CSV!");
  };

  // Statistics calculation for 'Laporan Pengusulan'
  const reportStats = useMemo(() => {
    // Group proposal by employee name to find latest status
    const latestProgressMap: Record<string, ProposalProgress> = {};
    proposals.forEach(prop => {
      const existing = latestProgressMap[prop.pegawaiName];
      if (!existing || new Date(prop.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestProgressMap[prop.pegawaiName] = prop;
      }
    });

    const latestProposals = Object.values(latestProgressMap);
    const totalProposed = latestProposals.length;

    // Counts by category
    const categoryCounts: Record<string, number> = {};
    allCategories.forEach(cat => {
      categoryCounts[cat] = 0;
    });

    latestProposals.forEach(p => {
      const cat = p.kategoriStatus;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Counts by types
    let countPangkat = 0;
    let countJenjang = 0;
    latestProposals.forEach(p => {
      if (p.jenisPengusulan === "Kenaikan Pangkat") countPangkat++;
      else countJenjang++;
    });

    const completed = categoryCounts["Selesai"] || 0;
    const waitingSK = categoryCounts["Menunggu SK"] || 0;
    const ongoing = totalProposed - completed;

    return {
      totalProposed,
      completed,
      waitingSK,
      ongoing,
      countPangkat,
      countJenjang,
      categoryCounts,
      latestProposals
    };
  }, [proposals, allCategories]);

  // Handle auto timeline preview lookup click
  const selectEmployeeToMonitor = (name: string) => {
    setViewedEmployeeName(name);
    // Scroll smoothly to timeline
    document.getElementById("monitoring-timeline-card")?.scrollIntoView({ behavior: "smooth" });
  };

  // Filter proposals for specific selected employee timeline
  const selectedEmployeeTimeline = useMemo(() => {
    if (!viewedEmployeeName) return [];
    return proposals.filter(p => p.pegawaiName === viewedEmployeeName)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()); // timeline order: oldest to newest
  }, [proposals, viewedEmployeeName]);

  // Category Color generator
  const getCategoryColor = (status: string) => {
    const norm = status.toLowerCase();
    if (norm.includes("selesai")) return { bg: "bg-emerald-50 text-emerald-700 border-emerald-150", dot: "bg-emerald-500", text: "text-emerald-700" };
    if (norm.includes("menunggu sk") || norm.includes("sk")) return { bg: "bg-purple-50 text-purple-700 border-purple-150", dot: "bg-purple-500", text: "text-purple-700" };
    if (norm.includes("pengajuan")) return { bg: "bg-amber-55 text-amber-800 border-amber-200 bg-amber-50/70", dot: "bg-amber-500", text: "text-amber-800" };
    if (norm.includes("dokumen") || norm.includes("lengkap")) return { bg: "bg-blue-50 text-blue-700 border-blue-150", dot: "bg-blue-500", text: "text-blue-700" };
    return { bg: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-500", text: "text-slate-700" };
  };

  return (
    <div className="space-y-8 animate-fade-in" id="layanan-monitoring-pengajuan">
      
      {/* Dynamic Report Summary dashboard */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dashboard & Sistem Pelaporan Pengajuan</h2>
        </div>

        {/* Interactive Filter Report Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 select-none animate-pulse-slow">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Filter Parameter Laporan Pengajuan
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Saring data usulan live secara tahunan, bulanan, jenis pengajuan, maupun status progres</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrintReport}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg px-3.5 py-2 cursor-pointer transition select-none shadow-3xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-550" /> Cetak Laporan (PDF)
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-150 rounded-lg px-3.5 py-2 cursor-pointer transition select-none shadow-3xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Laporan (CSV)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Year filter */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tahun Pengajuan</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold transition cursor-pointer"
              >
                <option value="all">Saring Tahunan (Semua)</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>Tahun {yr}</option>
                ))}
              </select>
            </div>

            {/* Month filter */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bulan Pengajuan</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold transition cursor-pointer"
              >
                <option value="all">Saring Bulanan (Semua)</option>
                {monthsList.map(m => (
                  <option key={m.val} value={m.val}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Type/jenis filter */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Kategori Usulan</label>
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold transition cursor-pointer"
              >
                <option value="all">Saring Kategori Usulan (Semua)</option>
                {allProposalTypes.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status Progres</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-semibold transition cursor-pointer"
              >
                <option value="all">Saring Status Progres (Semua)</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 bg-slate-50/50 p-3 rounded-lg border border-slate-100 gap-2">
            <span>Hasil filter laporan aktif: <strong className="font-bold text-slate-700">{filteredReportProposals.length} Data Usulan</strong></span>
            {filteredReportProposals.length > 0 && (
              <span className="text-[10px] text-slate-400 font-medium italic">Mencakup {new Set(filteredReportProposals.map(p => p.pegawaiName)).size} individu pegawai dari database kementerian</span>
            )}
          </div>
        </div>

        {/* Info widgets metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Mengusulkan (Live)</span>
              <span className="text-2xl font-black text-slate-800 tracking-tight">{reportStats.totalProposed}</span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Proses Aktif Berjalan</span>
              <span className="text-2xl font-black text-amber-600 tracking-tight">{reportStats.ongoing}</span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Menunggu Penerbitan SK</span>
              <span className="text-2xl font-black text-purple-600 tracking-tight">{reportStats.waitingSK}</span>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Usulan Selesai Disetujui</span>
              <span className="text-2xl font-black text-emerald-600 tracking-tight">{reportStats.completed}</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart (January to December visualization) */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <BarChart className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Visualisasi Grafis Batang Pengajuan Selesai (Jan s/d Des)
            </h3>
            <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
              Tahun: {filterYear === "all" ? "Semua Tahun" : filterYear}
            </span>
          </div>

          <div className="pt-6">
            <div className="relative h-44 flex items-end justify-between gap-1 sm:gap-2.5 border-b border-slate-200 pb-1">
              
              {/* Grid Background Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none">
                <div className="w-full border-t border-slate-100/70 h-0" />
                <div className="w-full border-t border-slate-100/70 h-0" />
                <div className="w-full border-t border-slate-100/70 h-0" />
                <div className="w-full border-t border-slate-100/70 h-0" />
              </div>

              {/* Tally Monthly Bars */}
              {monthlyData.map((m) => {
                const heightPct = (m.count / maxMonthlyCount) * 100;
                
                return (
                  <div key={m.val} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-black py-1 px-2.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition duration-200 pointer-events-none select-none whitespace-nowrap z-50">
                      {m.count} Usulan Selesai
                    </div>

                    {/* Numeric Count Marker */}
                    {m.count > 0 && (
                      <span className="text-[10px] font-extrabold text-blue-600 select-none pb-1 group-hover:scale-110 transition duration-150">
                        {m.count}
                      </span>
                    )}

                    {/* Dynamic styled Bar with gradient */}
                    <div 
                      className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ease-out cursor-pointer ${
                        m.count > 0 
                          ? "bg-gradient-to-t from-blue-500 to-blue-600 shadow-xs group-hover:from-blue-600 group-hover:to-blue-700" 
                          : "bg-slate-100/50 hover:bg-slate-200 border border-slate-200/40 border-dashed"
                      }`}
                      style={{ height: m.count > 0 ? `${heightPct * 0.8}%` : "6px" }} // scale slightly to fit numbers at top comfortably
                    />
                    
                  </div>
                );
              })}
            </div>

            {/* Labels under the bar line */}
            <div className="flex justify-between gap-1 pt-2">
              {monthlyData.map((m) => (
                <div key={m.val} className="flex-1 text-center">
                  <span className="hidden sm:inline text-[10px] font-bold text-slate-500 block truncate" title={m.name}>
                    {m.name}
                  </span>
                  <span className="sm:hidden text-[9px] font-semibold text-slate-400 block">
                    {m.short}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 italic text-center">
            * Grafik batang di atas memvisualisasikan jumlah perekaman progres usulan dengan status "Selesai" (Disetujui) per bulan yang cocok dengan saringan filter aktif.
          </p>
        </div>

        {/* Breakdown distributions report list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Status Breakdown Bar visualization chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs md:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-55 select-none">
              <BarChart className="w-3.5 h-3.5 text-blue-600" /> Distribusi Progres Aktif
            </h3>

            {reportStats.totalProposed === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada data usulan pengajuan terdaftar.</p>
            ) : (
              <div className="space-y-3.5 pt-1.5">
                {allCategories.map(cat => {
                  const count = reportStats.categoryCounts[cat] || 0;
                  const pct = reportStats.totalProposed > 0 ? (count / reportStats.totalProposed) * 100 : 0;
                  const styleColors = getCategoryColor(cat);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-600 truncate mr-3 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${styleColors.dot}`} /> {cat}
                        </span>
                        <span className="text-slate-500 font-semibold">{count} Usulan</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${styleColors.dot} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* List of active proposals latest summary */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs md:col-span-2 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-55">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Summary Laporan Usulan Pegawai
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Terakhir Di-update Desc</span>
            </div>

            <div className="overflow-x-auto">
              {reportStats.totalProposed === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">Belum ada progres usulan yang diunggah.</p>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <th className="p-2.5">Nama Pegawai</th>
                      <th className="p-2.5">Jenis Usulan</th>
                      <th className="p-2.5">Status Terakhir</th>
                      <th className="p-2.5">Pembaruan</th>
                      <th className="p-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportStats.latestProposals.map((prop, idx) => {
                      const style = getCategoryColor(prop.kategoriStatus);
                      return (
                        <tr key={prop.id} className="border-b border-slate-100/60 hover:bg-slate-55/40 transition">
                          <td className="p-2.5 font-bold text-slate-700">{prop.pegawaiName}</td>
                          <td className="p-2.5">
                            <span className="font-medium text-slate-650 inline-flex items-center gap-1">
                              {prop.jenisPengusulan === "Kenaikan Pangkat" ? "🔼 Pangkat" : "💼 Jenjang"}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${style.bg}`}>
                              {prop.kategoriStatus}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 select-none text-[10px] font-mono whitespace-nowrap">
                            {new Date(prop.updatedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => selectEmployeeToMonitor(prop.pegawaiName)}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 px-2.5 py-1 rounded transition"
                            >
                              Pantau Timeline
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Global Status notifications banners */}
      {(errorMsg || successMsg) && (
        <div className="space-y-2">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs flex items-center gap-2.5 font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs flex items-center gap-2.5 font-medium animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* User Area: Timeline Search-Select block */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-3xs p-6 space-y-6" id="monitoring-timeline-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-blue-500" /> Cek Progres Kenaikan Mandiri
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Temukan nama Anda dari database kementerian untuk melihat riwayat progres usulan</p>
          </div>
          
          {/* Employee search select autocomplete list */}
          <div className="relative w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              <select
                value={viewedEmployeeName}
                onChange={(e) => setViewedEmployeeName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-6 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- Pilih Nama Pegawai Anda --</option>
                {activeEmployeeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* View Timeline Result */}
        <div>
          {!viewedEmployeeName ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <span className="p-4 bg-slate-45/60 inline-block rounded-full text-slate-350 text-xl font-mono">🔍</span>
              <p className="text-xs font-semibold">Silakan pilih nama Anda pada menu dropdown di atas untuk memantau progres.</p>
              <p className="text-[10px] text-slate-350">Timeline riwayat akan disusun kronologis, dari pelengkapan berkas sampai SK terbit.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100/60 shadow-3xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center text-sm select-none">
                    {viewedEmployeeName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">{viewedEmployeeName}</h4>
                    <span className="text-[10px] text-slate-400 block font-medium">Memantau riwayat usulan kenaikan pangkat/jenjang</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-sans block select-none">Total Update</span>
                  <span className="text-sm font-bold text-blue-600 block">{selectedEmployeeTimeline.length} Catatan</span>
                </div>
              </div>

              {selectedEmployeeTimeline.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/40 rounded-xl border border-dashed border-slate-200 text-slate-450 text-xs">
                  <AlertCircle className="w-5 h-5 mx-auto text-amber-500 mb-2" />
                  Belum ada laporan usulan yang dimasukkan oleh Admin untuk nama <strong className="font-bold text-slate-700">"{viewedEmployeeName}"</strong>.
                  <p className="text-[10px] text-slate-400 mt-1">Harap hubungi Admin Kepegawaian untuk mendaftar usulan pangkat.</p>
                </div>
              ) : (
                
                /* High visual standard vertical Timeline stepper stepper */
                <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:inset-0 before:left-[11px] before:sm:left-[15px] before:w-0.5 before:bg-slate-100 pb-3">
                  
                  {selectedEmployeeTimeline.map((item, index) => {
                    const style = getCategoryColor(item.kategoriStatus);
                    return (
                      <div key={item.id} className="relative group">
                        
                        {/* Status Icon/Bullet indicating milestone */}
                        <div className={`absolute -left-[20px] -sm:left-[23px] top-1.5 w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] rounded-full border-2 border-white ring-4 ring-${style.dot}/10 ${style.dot} transition group-hover:scale-125 z-10`} />

                        {/* Interactive timeline update container */}
                        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-3xs space-y-4 hover:border-slate-200 transition-all duration-300">
                          
                          {/* Entry Metadata Header section */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-dashed border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {item.jenisPengusulan === "Kenaikan Pangkat" ? "🔼 Kenaikan Pangkat" : "💼 Kenaikan Jenjang Jabatan"}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${style.bg}`}>
                                {item.kategoriStatus}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-350" />
                                {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric"
                                })}
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-350" />
                                {new Date(item.updatedAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Detail Narrative description */}
                          <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                            {item.deskripsiProgress}
                          </p>

                          {/* Supplementary PDF Attachments or Image visual evidence proofs */}
                          {(item.urlFile || item.urlGambar) && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-sans">
                              {item.urlFile && (
                                <a
                                  href={item.urlFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 hover:border-blue-200 text-blue-700 font-bold rounded-lg transition"
                                >
                                  <Download className="w-3.5 h-3.5 text-blue-550" /> Unduh Lampiran Berkas
                                </a>
                              )}
                              
                              {item.urlGambar && (
                                <a
                                  href={item.urlGambar}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-emerald-800 font-bold rounded-lg transition"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Lihat Dokumen Visual
                                </a>
                              )}

                              {item.urlGambar && (
                                <div className="w-full mt-2 rounded-lg border border-slate-100 overflow-hidden bg-slate-50 relative group max-w-sm">
                                  <img 
                                    src={item.urlGambar} 
                                    alt="Visualisasi Progres SK Pegawai" 
                                    className="max-h-48 object-cover w-full group-hover:scale-[1.02] transition"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      // Handle broken link gracefully without layout collapse
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Admin Operations Console Panel */}
      {isAdmin && (
        <section className="bg-white rounded-xl border border-slate-100 shadow-3xs p-6 space-y-6" id="editor-panel-header">
          
          <div className="pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block font-sans">ADMIN ACCESS ONLY</span>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-emerald-600" /> Pengelola Progres Kenaikan Pangkat & Jenjang
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Input progres kearsipan berkas secara live ke Firestore Database</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryForm(!showCategoryForm);
                  setShowProposalTypeForm(false);
                  setNewCategoryName("");
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3.5 py-2 cursor-pointer transition select-none border border-emerald-150 ${
                  showCategoryForm 
                    ? "text-white bg-emerald-600 shadow-3xs" 
                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Kelola Kategori Status
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowProposalTypeForm(!showProposalTypeForm);
                  setShowCategoryForm(false);
                  setNewProposalTypeName("");
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-3.5 py-2 cursor-pointer transition select-none border border-blue-150 ${
                  showProposalTypeForm 
                    ? "text-white bg-blue-600 shadow-3xs" 
                    : "text-blue-700 bg-blue-50 hover:bg-blue-100"
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Kelola Jenis Usulan
              </button>
            </div>
          </div>

          {/* Manage custom categories dialog/form drawer inline */}
          {showCategoryForm && (
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700">Manajemen Kategori Status Progres</h4>
                <button type="button" onClick={() => setShowCategoryForm(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Tutup</button>
              </div>

              <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Nama status baru (misal: Sidang Tim Penilai)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium"
                  required
                />
                <button
                  type="submit"
                  disabled={saving || !newCategoryName.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition"
                >
                  Tambah Kategori
                </button>
              </form>

              {/* List of custom categories with delete action */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Kategori Kustom Aktif:</span>
                {customCategories.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-sans italic">Belum ada kategori kustom. Menggunakan default saja.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map(cat => (
                      <span key={cat.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-150 rounded-full text-[11px] text-slate-650">
                        {cat.name}
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="hover:text-rose-500 text-rose-500 font-semibold p-0.5 text-[9px]"
                          title="Hapus Kategori"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage custom proposal types dialog/form drawer inline */}
          {showProposalTypeForm && (
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 font-sans">Manajemen Kategori Jenis Usulan</h4>
                <button type="button" onClick={() => setShowProposalTypeForm(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Tutup</button>
              </div>

              <form onSubmit={handleAddProposalType} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Nama jenis usulan baru (misal: Peninjauan Masa Kerja)..."
                  value={newProposalTypeName}
                  onChange={(e) => setNewProposalTypeName(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
                  required
                />
                <button
                  type="submit"
                  disabled={saving || !newProposalTypeName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer transition"
                >
                  Tambah Jenis
                </button>
              </form>

              {/* List of custom proposal types with delete action */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Jenis Usulan Kustom Aktif:</span>
                {customProposalTypes.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-sans italic">Belum ada jenis usulan kustom tambahan.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customProposalTypes.map(pt => (
                      <span key={pt.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-150 rounded-full text-[11px] text-slate-650">
                        {pt.name}
                        <button
                          type="button"
                          onClick={() => handleDeleteProposalType(pt)}
                          className="hover:text-rose-500 text-rose-500 font-semibold p-0.5 text-[9px]"
                          title="Hapus Jenis Usulan"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress record form */}
          <form onSubmit={handleSubmitProgress} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase block">Pilih Pegawai *</label>
                <select
                  value={selectedPegawai}
                  onChange={(e) => setSelectedPegawai(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 cursor-pointer"
                  required
                >
                  <option value="">-- Cari Nama Pegawai --</option>
                  {activeEmployeeNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {activeEmployeeNames.length === 0 && (
                  <span className="text-[9px] text-rose-500 font-medium block">Silakan koneksikan database Google Sheets / fallback agar pegawai terindeks.</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase block">Jenis Pengusulan *</label>
                <select
                  value={jenisPengusulan}
                  onChange={(e) => setJenisPengusulan(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-semibold cursor-pointer"
                >
                  {allProposalTypes.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase block">Kategori Status Progres *</label>
                <select
                  value={kategoriStatus}
                  onChange={(e) => setKategoriStatus(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-semibold cursor-pointer"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2 md:col-span-3">
                <label className="text-[10px] font-bold text-slate-450 uppercase block">Deskripsi / Riwayat Progress Singkat *</label>
                <textarea
                  placeholder="Tuliskan perkembangan detail usulan, berkas apa saja yang sedang digarap atau disepakati..."
                  value={deskripsiProgress}
                  onChange={(e) => setDeskripsiProgress(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-450 uppercase block">Tautan Unduhan PDF/File Dokumen (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/xxxxxx..."
                  value={urlFile}
                  onChange={(e) => setUrlFile(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase block">Tautan URL Gambar Bukti/Dokumen (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/xxxx..."
                  value={urlGambar}
                  onChange={(e) => setUrlGambar(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                />
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyinpan...
                  </>
                ) : editingId ? (
                  "Update Progres"
                ) : (
                  "Simpan Progres"
                )}
              </button>
            </div>
          </form>

          {/* Database Grid List showing all progress entries for admin CRUD */}
          <div className="space-y-3 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-55">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Grid className="w-3.5 h-3.5 text-blue-600" /> Riwayat Progres Usulan (Admin CRUD Area)
              </h4>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-slate-400 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai..."
                  value={searchByName}
                  onChange={(e) => setSearchByName(e.target.value)}
                  className="bg-slate-50 text-slate-750 pl-7 pr-3 py-1 rounded-md text-[11px] focus:outline-none border border-slate-200 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
              {proposals.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">Belum ada progres yang telah diinput.</p>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-450 border-b border-slate-100">
                    <tr>
                      <th className="p-3">Pegawai</th>
                      <th className="p-3">Jenis Usulan</th>
                      <th className="p-3">Status Milestone</th>
                      <th className="p-3 max-w-xs">Catatan Progress</th>
                      <th className="p-3">Update</th>
                      <th className="p-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals
                      .filter(p => !searchByName || p.pegawaiName.toLowerCase().includes(searchByName.toLowerCase()))
                      .map(prop => {
                        const style = getCategoryColor(prop.kategoriStatus);
                        return (
                          <tr key={prop.id} className="border-b border-slate-100/60 hover:bg-slate-50/40 transition">
                            <td className="p-3 font-bold text-slate-850">{prop.pegawaiName}</td>
                            <td className="p-3 font-medium text-slate-600">{prop.jenisPengusulan}</td>
                            <td className="p-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${style.bg}`}>
                                {prop.kategoriStatus}
                              </span>
                            </td>
                            <td className="p-3 max-w-xs truncate font-medium text-slate-500" title={prop.deskripsiProgress}>
                              {prop.deskripsiProgress}
                            </td>
                            <td className="p-3 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                              {new Date(prop.updatedAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap space-x-2">
                              <button
                                onClick={() => handleStartEdit(prop)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition select-none cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProgress(prop.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition select-none cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
