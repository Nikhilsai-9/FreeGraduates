// FreeGraduates — REAL BROWSER QA PASS
// Captures every route at 1440/1280/1024/768/430/390/375, drives save/analyze/
// ats/optimize flows, and records overflow + console errors.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const FRONTEND = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const BACKEND  = process.env.BACKEND_URL  || "http://127.0.0.1:8001";
const OUT_DIR  = path.join(process.cwd(), "qa_out");
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768",  width: 768,  height: 1024 },
  { name: "430",  width: 430,  height: 932 },
  { name: "390",  width: 390,  height: 844 },
  { name: "375",  width: 375,  height: 812 },
];

const ROUTES = [
  { id: "dashboard", path: "/dashboard" },
  { id: "builder",   path: "/builder/new?template=classic&path=form" },
  { id: "analyzer",  path: "/analyzer" },
  { id: "ats",       path: "/ats-scanner" },
  { id: "optimizer", path: "/optimizer" },
  { id: "coach",     path: "/coach" },
  { id: "history",   path: "/history" },
];

const SUMMARY = {
  startedAt: new Date().toISOString(),
  routes: {},
  flows: {},
};

const log = (...args) => console.log("[qa]", ...args);

const DEMO_BODY = {
  versionName: "QA Demo",
  templateStyle: "classic",
  job: { role: "Software Engineer I", company: "Linea Labs",
         description: "Python FastAPI React PostgreSQL AWS Lambda Docker pytest" },
  candidate: {
    personal_info: { name: "Aarav Sharma", email: "aarav.sharma@example.com",
                     phone: "+91 98765 43210", location: "Bengaluru, India" },
    summary: "CS grad with internship experience in Python, Django, REST APIs.",
    work_experience: [
      { id: "e1", title: "Software Engineering Intern", company: "Brightline Tech",
        start_date: "May 2024", end_date: "Aug 2024",
        bullets: ["Built Django dashboards used by 80 staff",
                  "Cut report time 35% via SQL rewrite",
                  "Lifted coverage from 41% to 78% with pytest"] },
      { id: "e2", title: "Junior Backend Developer", company: "Cobalt Labs",
        start_date: "Jan 2025", end_date: "Present",
        bullets: ["Shipped 6 FastAPI endpoints",
                  "Migrated auth sessions to JWT, p99 login 1.4s -> 220ms",
                  "Owned an AWS Lambda nightly job, 500k events"] },
    ],
    education: [{ id: "ed1", degree: "B.Tech", field: "Computer Science",
                  institution: "IIIT Bengaluru", start_date: "2021", end_date: "2025",
                  gpa: "8.7 / 10" }],
    projects: [
      { id: "p1", name: "OpenMark", description: "Static site generator for course notes.",
        technologies: ["Python", "Markdown"], link: "github.com/aaravsharma/openmark" },
      { id: "p2", name: "SplitEasy", description: "Mobile-first bill-splitting PWA.",
        technologies: ["React", "IndexedDB"], link: "split-easy.app" },
    ],
    skills: ["Python", "Django", "FastAPI", "React", "PostgreSQL", "Docker",
             "AWS Lambda", "Git", "Linux", "pytest"],
  },
};

module.exports = { FRONTEND, BACKEND, OUT_DIR, VIEWPORTS, ROUTES, SUMMARY, log, DEMO_BODY };
