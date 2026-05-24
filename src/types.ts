/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Pegawai {
  [key: string]: string;
}

export interface CustomCard {
  id: string;
  title: string;
  description: string;
  iconName: string; // Lucide icon identifier
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  filterColumn: string;
  filterValue: string;
  operator: 'equals' | 'contains' | 'starts_with';
}

export interface AIResponseCard {
  title: string;
  description: string;
  iconName: string;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  filterColumn: string;
  filterValue: string;
  operator: 'equals' | 'contains' | 'starts_with';
}

export interface Statistics {
  totalPegawai: number;
  columnStats: {
    [columnName: string]: {
      [valueName: string]: number;
    }
  };
}

export interface ProposalProgress {
  id: string;
  pegawaiName: string;
  jenisPengusulan: string; // e.g., "Kenaikan Pangkat" or "Kenaikan Jenjang Jabatan"
  kategoriStatus: string;  // e.g., "Pelengkapan Dokumen", "Pengajuan", "Menunggu SK", "Selesai" (or custom)
  deskripsiProgress: string;
  urlFile?: string;
  urlGambar?: string;
  updatedAt: string;       // ISO string or formatted datetime
}

export interface CustomCategory {
  id: string;
  name: string;
}

