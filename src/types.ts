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
