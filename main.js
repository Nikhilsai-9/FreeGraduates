/**
 * FreeGraduates Landing Page Client Interactivity
 * Brand: FreeGraduates (freegraduates.com)
 * Tagline: Prepare. Practice. Get Hired.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Mobile Menu Drawer Toggle ---
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileNavDrawer');
  
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', !isExpanded);
      mobileDrawer.classList.toggle('active');
    });

    // Close mobile drawer when clicking on any link
    const mobileLinks = mobileDrawer.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- 2. Resume Templates Gallery Filter ---
  const filterPills = document.querySelectorAll('.filter-pill');
  const templateCards = document.querySelectorAll('.template-card');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.getAttribute('data-filter');

      templateCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --- 3. AI Coach Interactive Conversation Simulator ---
  const coachChips = document.querySelectorAll('.chat-suggestion-chips .chip-btn');
  const chatStream = document.getElementById('coachChatStream');

  const coachResponses = {
    "introduce": {
      user: "I don't know how to introduce myself in a campus interview.",
      ai: "<strong>Coach:</strong> Let's build your elevator pitch using the <strong>Present-Past-Future</strong> formula: Start with your current degree and key technical focus, mention 1-2 impactful projects, and conclude with why you're eager for this specific role."
    },
    "star": {
      user: "How do I explain a difficult team conflict in STAR format?",
      ai: "<strong>Coach:</strong> Frame it positively: <strong>Situation:</strong> Team had differing API design approaches. <strong>Task:</strong> Deliver the milestone on time. <strong>Action:</strong> Set up a benchmark matrix. <strong>Result:</strong> Aligned team and shipped 2 days early."
    },
    "salary": {
      user: "How should a fresh graduate answer salary expectations?",
      ai: "<strong>Coach:</strong> Keep focus on skill and opportunity: 'I'm primarily looking for an opportunity to contribute and grow with the team. Based on standard industry benchmarks for entry-level roles, I'm open to discussing a competitive compensation.'"
    }
  };

  coachChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const topic = chip.getAttribute('data-topic');
      if (coachResponses[topic] && chatStream) {
        // Find existing dynamic bubbles and replace or append
        let userBubble = document.getElementById('dynamicUserBubble');
        let aiBubble = document.getElementById('dynamicAiBubble');

        if (!userBubble) {
          userBubble = document.createElement('div');
          userBubble.id = 'dynamicUserBubble';
          userBubble.className = 'chat-bubble chat-bubble-user';
          chatStream.appendChild(userBubble);
        }

        if (!aiBubble) {
          aiBubble = document.createElement('div');
          aiBubble.id = 'dynamicAiBubble';
          aiBubble.className = 'chat-bubble chat-bubble-ai';
          chatStream.appendChild(aiBubble);
        }

        userBubble.textContent = coachResponses[topic].user;
        aiBubble.innerHTML = coachResponses[topic].ai;

        // Smooth scroll chat to bottom
        chatStream.scrollTop = chatStream.scrollHeight;
      }
    });
  });

  // --- 4. Interactive JD Match Simulation Presets ---
  const jdButtons = document.querySelectorAll('.jd-preset-btn');
  const matchPercent = document.getElementById('dynamicMatchPercent');
  const jdTitle = document.getElementById('dynamicJdTitle');
  const kwFound = document.getElementById('dynamicKwFound');
  const kwMissing = document.getElementById('dynamicKwMissing');

  const jdData = {
    sde: {
      title: "Target JD: Software Engineer (Backend)",
      match: "88%",
      found: ["Java", "Spring Boot", "PostgreSQL", "REST APIs", "Git"],
      missing: ["Docker", "Kubernetes", "Redis Caching"]
    },
    ai: {
      title: "Target JD: Junior AI / ML Engineer",
      match: "92%",
      found: ["Python", "PyTorch", "NLP", "Pandas", "Scikit-Learn"],
      missing: ["MLflow", "Vector DBs", "FastAPI"]
    },
    frontend: {
      title: "Target JD: Frontend Developer (React)",
      match: "85%",
      found: ["JavaScript", "React", "HTML/CSS", "TypeScript", "Tailwind"],
      missing: ["Next.js", "Jest Testing", "GraphQL"]
    }
  };

  jdButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      jdButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-preset');
      const data = jdData[preset];

      if (data && matchPercent && jdTitle && kwFound && kwMissing) {
        matchPercent.textContent = data.match;
        jdTitle.textContent = data.title;

        kwFound.innerHTML = data.found.map(k => `<span class="kw-pill kw-found">✓ ${k}</span>`).join('');
        kwMissing.innerHTML = data.missing.map(k => `<span class="kw-pill kw-missing">+ ${k}</span>`).join('');
      }
    });
  });

  // --- 5. ATS Score Interactive Demo Check ---
  const atsSimulateBtn = document.getElementById('atsSimulateBtn');
  const atsScoreDisplay = document.getElementById('atsScoreDisplay');

  if (atsSimulateBtn && atsScoreDisplay) {
    atsSimulateBtn.addEventListener('click', () => {
      atsSimulateBtn.textContent = "Analyzing structure & keywords...";
      atsSimulateBtn.disabled = true;

      setTimeout(() => {
        atsScoreDisplay.textContent = "94";
        atsSimulateBtn.textContent = "✓ Analysis Complete (Score: 94/100)";
        atsSimulateBtn.disabled = false;
      }, 700);
    });
  }
});
