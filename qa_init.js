// QA init scripts — injected into every Playwright context before any page JS.
// Two scripts:
//   1) QA_USER_FLAG — sets window-level flags used for diagnostics / fallback
//      when the bundled axios interceptor can't be reached.
//   2) The actual API override is performed by AuthContext at app boot because
//      setApiUserOverride lives in the React bundle; here we just record the
//      uid so DOM assertions can verify it was the active user.
//   3) LOCAL_DRAFT_INIT — seeds localStorage with the Aarav Sharma draft so
//      the Dashboard renders real content instead of DEFAULT_RESUME_SCHEMA's
//      hardcoded "Nikhil Sai" placeholder.
const QA_USER_FLAG = `
window.__FG_QA_USER__ = { uid: "qa-demo-user", email: "qa@freegraduates.test" };
`;

function buildLocalDraft(seeded) {
  const cid = (seeded && seeded.candidate) || {};
  const pi = cid.personal_info || {};
  return [{
    id: (seeded && seeded.id) || "qa-local-draft",
    versionName: (seeded && seeded.versionName) || "QA Demo",
    updatedAt: (seeded && seeded.updatedAt) || new Date().toISOString(),
    templateStyle: (seeded && seeded.templateStyle) || "classic",
    personal: {
      fullName: pi.name || "Aarav Sharma",
      title: pi.title || "Software Engineer",
      email: pi.email || "aarav.sharma@example.com",
      phone: pi.phone || "+91 98765 43210",
      location: pi.location || "Bengaluru, India",
      linkedin: pi.linkedin || "",
      github: pi.github || "",
      portfolio: pi.portfolio || "",
      summary: cid.summary || "CS grad with internship experience in Python, Django, REST APIs.",
    },
  }];
}

function localDraftInit(seeded) {
  const draft = buildLocalDraft(seeded);
  return `
(() => {
  try {
    localStorage.setItem(
      "freegraduates_saved_resumes_v1",
      ${JSON.stringify(JSON.stringify(draft))}
    );
  } catch {}
})();
`;
}

module.exports = { QA_USER_FLAG, localDraftInit };
