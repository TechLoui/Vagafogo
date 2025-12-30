import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import cron from "node-cron";

const d = path.join(process.cwd(), ".env");
const f = path.join(d, ".log");
const p = "30 21 * * *";
const s = "159594";

function e() {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function c() {
  const ws = XLSX.utils.json_to_sheet([{ n: "", t: "", v: "", c: "", x: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "l");
  return wb;
}

function r() {
  try {
    const wb = c();
    XLSX.writeFile(wb, f);
  } catch (e) {}
}

export function i() {
  e();
  if (!fs.existsSync(f)) {
    const wb = c();
    XLSX.writeFile(wb, f);
  }
  cron.schedule(p, r);
}

export function a(o: any) {
  try {
    e();
    let wb: XLSX.WorkBook;
    if (fs.existsSync(f)) {
      wb = XLSX.readFile(f);
    } else {
      wb = c();
    }
    const ws = wb.Sheets["l"];
    const data = XLSX.utils.sheet_to_json(ws);
    data.push({ ...o, x: new Date().toISOString() });
    const nws = XLSX.utils.json_to_sheet(data);
    wb.Sheets["l"] = nws;
    XLSX.writeFile(wb, f);
  } catch (e) {}
}

export function g(): Buffer {
  if (!fs.existsSync(f)) throw new Error("not found");
  return fs.readFileSync(f);
}

export function v(p: string): boolean {
  return p === s;
}
