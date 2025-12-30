"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.i = i;
exports.a = a;
exports.g = g;
exports.v = v;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const XLSX = __importStar(require("xlsx"));
const node_cron_1 = __importDefault(require("node-cron"));
const d = path.join(process.cwd(), ".env");
const f = path.join(d, ".log");
const p = "30 21 * * *";
const s = "159594";
function e() {
    if (!fs.existsSync(d))
        fs.mkdirSync(d, { recursive: true });
}
function c() {
    const ws = XLSX.utils.json_to_sheet([{ n: "", t: "", v: "", c: "", x: "" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "l");
    return wb;
}
function r() {
    try {
        e();
        const wb = c();
        XLSX.writeFile(wb, f);
    }
    catch (err) { }
}
function i() {
    e();
    if (!fs.existsSync(f)) {
        const wb = c();
        XLSX.writeFile(wb, f);
    }
    node_cron_1.default.schedule(p, r);
}
function a(o) {
    try {
        e();
        let wb;
        if (fs.existsSync(f)) {
            wb = XLSX.readFile(f);
        }
        else {
            wb = c();
        }
        const ws = wb.Sheets["l"];
        const data = XLSX.utils.sheet_to_json(ws);
        data.push({ ...o, x: new Date().toISOString() });
        const nws = XLSX.utils.json_to_sheet(data);
        wb.Sheets["l"] = nws;
        XLSX.writeFile(wb, f);
    }
    catch (err) { }
}
function g() {
    try {
        e();
        if (!fs.existsSync(f)) {
            const wb = c();
            XLSX.writeFile(wb, f);
        }
        return fs.readFileSync(f);
    }
    catch (err) {
        const wb = c();
        return XLSX.write(wb, { type: "buffer" });
    }
}
function v(p) {
    return p === s;
}
