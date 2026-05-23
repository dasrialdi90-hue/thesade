import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOZMUqBnpFybLVYHhEgmf8NQYlujf_PtCE7sl97rvY1YOT72ObbO_c_GSPyP1fLg/pub?gid=877709935&single=true&output=csv";

// Fallback Indonesian civil service data in case Sheet fetch fails or rate limit occurs
const FALLBACK_DATA = [
  { "No": "1", "NAMA": "Budi Santoso", "PKT": "III/b", "TMT PKT": "01/10/2023", "JABATAN": "Pranata Komputer", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "24/05/2021", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "2", "NAMA": "Hendra Wijaya", "PKT": "III/c", "TMT PKT": "01/04/2022", "JABATAN": "Analis Kepegawaian", "JJG JABATAN": "Ahli Muda", "TMT JABATAN": "15/08/2020", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "3", "NAMA": "Siti Aminah", "PKT": "IV/a", "TMT PKT": "01/10/2021", "JABATAN": "Arsiparis", "JJG JABATAN": "Ahli Madya", "TMT JABATAN": "10/12/2019", "MONITORING PANGKAT": "TIDAK", "MONITORING JENJANG": "Bersyarat" },
  { "No": "4", "NAMA": "Rizky Alamsyah", "PKT": "III/a", "TMT PKT": "01/10/2024", "JABATAN": "Pranata Komputer", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "24/05/2021", "MONITORING PANGKAT": "NAIK JENJANG JABATAN DULU", "MONITORING JENJANG": "Belum Memenuhi Syarat" },
  { "No": "5", "NAMA": "Dewi Lestari", "PKT": "III/b", "TMT PKT": "01/04/2023", "JABATAN": "Analis Hukum Aparatur", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "01/03/2018", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "6", "NAMA": "Gunawan Prasetyo", "PKT": "IV/b", "TMT PKT": "01/10/2022", "JABATAN": "Pranata Komputer", "JJG JABATAN": "Ahli Madya", "TMT JABATAN": "15/05/2021", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "7", "NAMA": "Adelia Putri", "PKT": "III/a", "TMT PKT": "01/04/2024", "JABATAN": "Pengelola Sistem Informasi", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "01/03/2022", "MONITORING PANGKAT": "BELUM 2 TAHUN", "MONITORING JENJANG": "Belum Memenuhi Syarat" },
  { "No": "8", "NAMA": "Andi Wijaya", "PKT": "III/c", "TMT PKT": "01/10/2023", "JABATAN": "Auditor", "JJG JABATAN": "Ahli Muda", "TMT JABATAN": "12/12/2021", "MONITORING PANGKAT": "YA", "MONITORING JENJANG": "Bersyarat" },
  { "No": "9", "NAMA": "Rina Kartika", "PKT": "III/d", "TMT PKT": "01/10/2020", "JABATAN": "Analis Kepegawaian", "JJG JABATAN": "Ahli Muda", "TMT JABATAN": "14/08/2018", "MONITORING PANGKAT": "BELUM MEMENUHI SYARAT", "MONITORING JENJANG": "Belum Memenuhi Syarat" },
  { "No": "10", "NAMA": "Fajar Ramadhan", "PKT": "III/a", "TMT PKT": "01/10/2024", "JABATAN": "Pranata Hubungan Masyarakat", "JJG JABATAN": "Ahli Pertama", "TMT JABATAN": "24/05/2021", "MONITORING PANGKAT": "NAIK JENJANG JABATAN DULU", "MONITORING JENJANG": "Belum Memenuhi Syarat" }
];

// Robust state-machine to parse CSV safely handling quoted commas and newlines inside cells
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
        // Escaped double quotes
        cell += '"';
        i++; // skip next quote
      } else {
        // Toggle quote flag
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip the LF character
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

  // Convert raw column names - normalize internal newlines inside quoted headers
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

// REST route to serve Employee data from Google Sheets or standard fallback
app.get("/api/data", async (req, res) => {
  try {
    const response = await fetch(SHEET_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      throw new Error(`Sheets responded with status: ${response.status}`);
    }
    const text = await response.text();
    const data = parseCSV(text);

    if (data.length === 0) {
      throw new Error("Empty CSV received from Google Sheets");
    }

    // Capture column keys dynamically
    const columns = Object.keys(data[0]);

    res.json({
      success: true,
      data,
      columns,
      source: "google-sheets"
    });
  } catch (error: any) {
    console.warn("Failed to fetch Google Sheets. Using fallback data. Error:", error.message);
    const columns = Object.keys(FALLBACK_DATA[0]);
    res.json({
      success: true,
      data: FALLBACK_DATA,
      columns,
      source: "fallback-state"
    });
  }
});

// Local rule-based fallback generator for Indonesian civil service metrics
function generateCardOffline(prompt: string, columns: string[], sampleValues: Record<string, string[]>): any {
  const normPrompt = prompt.toLowerCase();

  let selectedColumn = "";
  let selectedValue = "";
  let operator = "contains";
  
  // 1. First, search for direct sample value matches in active columns
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

  // 2. If no direct value matched, look for column name mentions in the prompt
  if (!selectedColumn) {
    for (const col of columns) {
      const lowerCol = col.toLowerCase();
      // Match column keywords such as "pangkat", "jenjang", "jabatan"
      if (normPrompt.includes(lowerCol) || 
          (lowerCol.includes("jabatan") && normPrompt.includes("jabatan")) ||
          (lowerCol.includes("jenjang") && normPrompt.includes("jenjang")) ||
          (lowerCol.includes("pangkat") && normPrompt.includes("pangkat")) ||
          (lowerCol.includes("golongan") && normPrompt.includes("golongan"))) {
        selectedColumn = col;
        
        // Find possible value matches from the prompt, discarding stop words
        const promptWords = normPrompt.split(/\s+/).filter(w => 
          w.length > 2 && 
          !lowerCol.includes(w) && 
          !["filter", "cari", "tampilkan", "pegawai", "dengan", "yang", "dan", "atau"].includes(w)
        );
        
        if (promptWords.length > 0) {
          selectedValue = promptWords[promptWords.length - 1]; // Use last descriptive word
          operator = "contains";
        } else {
          selectedValue = (sampleValues[col] && sampleValues[col][0]) || "";
          operator = "contains";
        }
        break;
      }
    }
  }

  // 3. Fallback to priority filterable columns if we couldn't resolve a mapping
  if (!selectedColumn && columns.length > 0) {
    // Priority order of standard filter columns
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
        // Match specific keywords if mentioned
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

  // Absolutely last fallback
  if (!selectedColumn) {
    selectedColumn = columns[0] || "NAMA";
    selectedValue = "YA";
  }

  // Unify and clean selected values
  const finalCol = selectedColumn;
  const finalVal = selectedValue || "YA";

  // Infer styling colors & icons based on resolved value context
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

  // Capitalize first letter of prompt to act as Title
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

// AI custom card generator endpoint
app.post("/api/ai/generate-card", async (req, res) => {
  const { prompt, columns, sampleValues } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, message: "Prompt is required" });
  }

  try {
    const systemPrompt = `You are an Indonesian civil service HR Analyst. Your job is to analyze the user's natural language request to create a custom filtering card for an employee grade monitoring dashboard.
These are the available columns in the application: ${JSON.stringify(columns)}.
These are some typical samples of values found under these columns: ${JSON.stringify(sampleValues)}.

Your output MUST be a strict JSON object that maps perfectly to the filtering criteria requested.
The fields required are:
- title: A short Indonesian label of the card metrics (e.g. "Analis Kepegawaian III/b", "Sedang Proses Kenaikan").
- description: A short Indonesian caption explaining what this counts (e.g. "Pegawai dengan jabatan Analis Kepegawaian dan Golongan III/b").
- iconName: One of these simple lucide icon names: "UserCheck", "Users", "Briefcase", "AlertCircle", "Clock", "Award", "CheckCircle2", "Shield", "ChevronUp".
- color: One of standard Tailwind color categories to represent status: "blue", "emerald", "amber", "rose", "indigo" or "slate".
- filterColumn: Which column from the available columns must be checked. Crucial: It must exactly match one of the available columns: ${JSON.stringify(columns)}.
- filterValue: The value to match. It should match or partially match the category values in samples.
- operator: One of these values: "equals", "contains", "starts_with" depending on how we should evaluate the match.

Analyze user query: "${prompt}". Suggest the exact criteria. Use 'equals' if matching a specific exact value, or 'contains' for keywords.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the card" },
            description: { type: Type.STRING, description: "Brief description of the card filter" },
            iconName: { type: Type.STRING, description: "Name of the Lucide icon" },
            color: { type: Type.STRING, description: "Tailwind color name: blue, emerald, amber, rose, indigo, or slate" },
            filterColumn: { type: Type.STRING, description: "The column name to filter" },
            filterValue: { type: Type.STRING, description: "The exact or partial value to match" },
            operator: { type: Type.STRING, description: "The operator: equals, contains, starts_with" }
          },
          required: ["title", "description", "iconName", "color", "filterColumn", "filterValue", "operator"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response content from Gemini.");
    }

    const genCard = JSON.parse(text.trim());
    res.json({
      success: true,
      card: genCard
    });

  } catch (error: any) {
    console.warn("Gemini AI API call failed or has limited project access. Falling back to semantic local generator. Details:", error.message || error);
    
    // Invoke our super intelligent localized heuristic generator
    const fallbackCard = generateCardOffline(prompt, columns, sampleValues);
    
    res.json({
      success: true,
      card: fallbackCard,
      fallbackUsed: true
    });
  }
});

// Configure Vite middleware or production physical static serves
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Dashboard Monitoring Pangkat running on http://localhost:${PORT}`);
  });
}

startServer();
