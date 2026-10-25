// The pages behind each channel. Facts come from the verified master profile,
// the public repos and the measured results; keep wording plain and never
// claim upstream work. Each page is a list of blocks the TV lays out in order.

export type Link = { label: string; href: string; id?: string };
export type Row = { title: string; sub: string; meta?: string; href: string; id?: string };
export type Entry = { when: string; title: string; where: string; body?: string };

export type Block =
  | { t: "text"; heading: string; body: string | string[] }
  | { t: "numbers"; items: { value: string; label: string }[] }
  | { t: "bullets"; heading: string; items: string[] }
  | { t: "steps"; heading: string; items: { title: string; body: string }[] }
  | { t: "timeline"; heading: string; items: Entry[] }
  | { t: "list"; heading: string; items: Row[] }
  | { t: "chips"; heading: string; items: string[] }
  | { t: "note"; body: string }
  | { t: "links"; items: Link[] }
  | { t: "tree"; heading: string; root: string; groups: TreeGroup[] };

export type TreeGroup = { path: string; note: string; items: { name: string; note?: string }[] };

export type Page = { ch: number; blocks: Block[] };

const GH = "https://github.com/HarshaVardhan3002";
const HF = "https://huggingface.co/Harsha001";

const raw: Page[] = [
  {
    ch: 1,
    blocks: [
      {
        t: "text",
        heading: "WHAT IT IS",
        body: "Nimbus is a utility island at the top of the screen: media, volume, brightness, Wi-Fi, Bluetooth, wallpapers, system stats, an app launcher, file search, clipboard history, to-dos and a timer. Its assistant runs on a local llama.cpp model, or on any OpenAI-compatible API if you prefer.",
      },
      {
        t: "numbers",
        items: [
          { value: "3", label: "desktop platforms" },
          { value: "30 min", label: "idle, then the model unloads" },
          { value: "MIT", label: "open source licence" },
        ],
      },
      {
        t: "bullets",
        heading: "WHAT I BUILT",
        items: [
          "An assistant with tools: web search, reading pages, Spotify and YouTube, reading and writing mail, and, with permission, seeing the screen and clicking or typing. Risky actions ask first.",
          "\"Hey Nimbus\" wake word and push to talk, with local Whisper speech to text.",
          "The local model loads on request and unloads after 30 minutes idle, so it costs nothing when you are not using it.",
          "Plugins through the Model Context Protocol (MCP) over stdio, plus a local API.",
          "Installers for Windows, macOS and Linux. Released 15 October 2026 under the MIT licence.",
        ],
      },
      { t: "chips", heading: "STACK", items: ["Rust", "Tauri", "Svelte", "TypeScript", "llama.cpp", "Whisper", "MCP"] },
      { t: "links", items: [{ label: "Open on GitHub", href: `${GH}/Nimbus_revanced` }] },
    ],
  },
  {
    ch: 2,
    blocks: [
      {
        t: "text",
        heading: "WHAT IT IS",
        body: "The first Nimbus: a desktop AI overlay for Windows that answers questions about what is on your screen and listens to your meetings with you. It stays out of the way as a small pill until you call it.",
      },
      {
        t: "numbers",
        items: [
          { value: "Local", label: "speech to text on your PC" },
          { value: "3", label: "cloud providers, or a local model" },
          { value: "GPL-3.0", label: "open source licence" },
        ],
      },
      {
        t: "bullets",
        heading: "WHAT I BUILT",
        items: [
          "Ask about anything on screen: the overlay sends the screen context with your question.",
          "Meeting mode: live captions, a recap, follow-ups, a translation of the whole call and a suggested next line.",
          "Local speech to text with Sherpa-ONNX, so the audio stays on your PC.",
          "Claude, Gemini and OpenAI as providers, or a local model.",
          "A Windows installer, with settings for voice, privacy and the look.",
        ],
      },
      { t: "chips", heading: "STACK", items: ["JavaScript", "Electron", "Sherpa-ONNX", "Node.js"] },
      { t: "links", items: [{ label: "Open on GitHub", href: `${GH}/nimbus` }] },
    ],
  },
  {
    ch: 3,
    blocks: [
      {
        t: "text",
        heading: "WHAT IT IS",
        body: "colibri, by JustVugg, is a pure-C engine that runs GLM-5.2, a 744-billion-parameter mixture-of-experts model, on consumer hardware by streaming experts from an NVMe drive. zunzun is my extension of it for AMD machines on Windows.",
      },
      {
        t: "numbers",
        items: [
          { value: "744B", label: "parameters, one home PC" },
          { value: "~3,800", label: "lines of C/C++ for the HIP backend" },
          { value: "AMD", label: "integrated GPU, Windows" },
        ],
      },
      {
        t: "bullets",
        heading: "WHAT I BUILT",
        items: [
          "A HIP GPU backend for AMD integrated GPUs on Windows: about 3,800 lines of C and C++.",
          "Unbuffered direct reads of expert weights from disk on Windows, so the drive feeds the GPU without the file cache in the way.",
        ],
      },
      { t: "chips", heading: "STACK", items: ["C", "C++", "HIP", "ROCm", "Windows"] },
      {
        t: "note",
        body: "Upstream: the engine, token-exact inference, KV cache compression, multi-token prediction, MLA and NVMe streaming are colibri's work by JustVugg.",
      },
      { t: "links", items: [{ label: "Open on GitHub", href: `${GH}/zunzun` }] },
    ],
  },
  {
    ch: 4,
    blocks: [
      {
        t: "text",
        heading: "WHAT IT IS",
        body: "I publish open models re-packed for AMD hardware on Hugging Face, in the ROCmFPX low-bit formats, and I port speech recognition models to the Ryzen AI NPU. Every model card says how it was measured.",
      },
      {
        t: "numbers",
        items: [
          { value: "6.25", label: "perplexity at 4-bit (BF16: 6.17)" },
          { value: "92.5%", label: "same top token as BF16" },
          { value: "2.16%", label: "word errors on the NPU (CPU: 2.14%)" },
        ],
      },
      {
        t: "bullets",
        heading: "WHAT I BUILT",
        items: [
          "GGUF quantizations of 15 open models: text models from 4B up to Ornith 1.5 122B, MiniCPM-V 4.7 for vision, FLUX.3 and MOSS-Image for pictures, and Drama-3 for speech.",
          "Method: BF16 conversion, an importance matrix, one quantization per type, then perplexity and KL divergence against BF16. Files that another file beats on both size and quality are not published.",
          "In my public fork: an opt-in scale per tensor for models whose weights are too small for the format's block scales (reported upstream), and a runtime for decision models, checked against PyTorch.",
          "Phonon-2 speech recognition ported to the Ryzen AI NPU through ONNX and Windows ML: all 1,366 encoder operators run on the NPU in BF16. The same port for Underdog Bark 3.0.",
        ],
      },
      { t: "chips", heading: "STACK", items: ["llama.cpp", "GGUF", "C++", "ONNX", "Windows ML", "Ryzen AI NPU", "Python"] },
      {
        t: "note",
        body: "The ROCmFPX formats are Carlo Pasquale's fork (charlie12345). I apply them, measure and publish. Quality numbers for the GGUF files were measured on the CPU backend.",
      },
      {
        t: "links",
        items: [
          { label: "Open on Hugging Face", href: HF },
          { label: "Phonon-2 on the NPU", href: `${HF}/Phonon-2-XDNA2` },
          { label: "My ROCmFPX fork", href: `${GH}/ROCmFPX` },
        ],
      },
    ],
  },
  {
    ch: 5,
    blocks: [
      {
        t: "text",
        heading: "WHAT IT IS",
        body: "SCION is a network architecture where the sender can choose between many paths. Which path should traffic take? This is my current Master's research topic: agents that choose paths themselves, and a tool that tests whether they behave.",
      },
      {
        t: "numbers",
        items: [
          { value: "27", label: "training runs" },
          { value: "9 × 3", label: "reward setups × seeds" },
          { value: "10", label: "behaviour probes in SCIONfit" },
        ],
      },
      {
        t: "bullets",
        heading: "WHAT I BUILT",
        items: [
          "MARL path selector: MAPPO agents replace a central path oracle.",
          "9 reward configurations times 3 seeds: 27 training runs, compared on a Pareto front of throughput, latency and oscillation.",
          "SCIONfit: a conformance tool with 10 behaviour probes that check a path-selection model under changing load, missing data and stale observations, with HTML and JSON reports.",
        ],
      },
      { t: "chips", heading: "STACK", items: ["Python", "PyTorch", "MAPPO", "pytest", "SCION"] },
      {
        t: "links",
        items: [
          { label: "MARL path selector", href: `${GH}/MARL_path_selector` },
          { label: "SCIONfit", href: `${GH}/SCIONfit` },
        ],
      },
    ],
  },
  {
    ch: 6,
    blocks: [
      {
        t: "text",
        heading: "THE PROBLEM",
        body: [
          "At IIKT, Otto-von-Guericke University Magdeburg, researchers in the Chair of Integrated Electronic Systems design analog and radio-frequency chips in Cadence Virtuoso. One electromagnetic simulation of a single design point takes about 8 minutes and more than 100 GB of memory.",
          "Results used to end up as loose files on a compute cluster. Comparing designs, or training a model on them, meant collecting them by hand.",
        ],
      },
      {
        t: "text",
        heading: "MY PART",
        body: "I am not an analog designer, and I do not pretend to be. The engineers judge the physics. I build the software, the data platform and the AI agents around their work, and I check every result against the solver's own output.",
      },
      {
        t: "numbers",
        items: [
          { value: "Bit-exact", label: "S-parameters, compared with the solver's own files" },
          { value: "59/s", label: "runs stored per second in a 20,000-run soak test" },
          { value: "45%", label: "smaller S-parameter tables after tuning, still bit-exact" },
        ],
      },
      {
        t: "bullets",
        heading: "WHAT I BUILT",
        items: [
          "SiliconDB, a research data platform: a campaign file starts simulation runs on the cluster, and every result lands in one store with its full history (which design, which settings, which tool versions).",
          "A Rust core shipped as one static program, so nothing has to be installed on the shared cluster. Cadence runs inside an Apptainer container; Python drives the campaigns and the Virtuoso worker.",
          "Tables in Parquet that pandas, DuckDB, Polars and Hugging Face datasets read bit-exact, served by a hub that works like Hugging Face, with exports to CSV, JSONL, HDF5 and Touchstone.",
          "A dashboard in German first, with full English: search, compare runs, read-only SQL and sign-in, in a soft, calm design. 1,216 unit tests and 246 browser tests check it.",
          "AI agents in the design loop: they write parametric layout cells in SKILL and operate the Virtuoso interface step by step. A release gate holds back every change until all checks pass for that exact version.",
        ],
      },
      {
        t: "chips",
        heading: "STACK",
        items: ["Rust", "Python", "SKILL", "Cadence Virtuoso", "Parquet", "DuckDB", "React", "TypeScript", "Apptainer", "Docker"],
      },
      {
        t: "note",
        body: "The chair's designs, data and systems stay private. This page describes my part only, with no design details or results from unpublished work.",
      },
      { t: "links", items: [{ label: "Ask me about it on LinkedIn", href: "https://www.linkedin.com/in/sai-harshavardhan-ai" }] },
    ],
  },
  {
    ch: 7,
    blocks: [
      {
        t: "text",
        heading: "THE IDEA",
        body: [
          "I do not give a prompt to one AI and hope for the best. I treat every problem as a system to engineer. I break it into separate concerns, give each concern its own team of agents, and design the harness, the rules and the checks those teams work inside.",
          "Writing the code is the smallest part. The engineering is in the orchestration: many agents working on one solution without hallucinating, without contradicting each other, and without doing anything I have not been told about.",
        ],
      },
      {
        t: "numbers",
        items: [
          { value: "$20", label: "a month: one Claude plan covers my university, work, personal and side projects" },
          { value: "1,000s", label: "of tool calls in one long agent session, with no loss of focus" },
          { value: "2×", label: "faster from idea to working product than coding by hand" },
        ],
      },
      {
        t: "steps",
        heading: "THE PIPELINE",
        items: [
          {
            title: "Decompose the problem",
            body: "I split it into separate concerns: the solution, the architecture, the security and the cost. Each concern gets its own agents, with its own brief, skills and limits.",
          },
          {
            title: "Find the best solution",
            body: "The first team looks for the most effective way to solve the problem, with no constraints from security, cost or legacy code. Pure problem solving first.",
          },
          {
            title: "Design the system",
            body: "The second team turns that solution into a system architecture: components, data flow, interfaces, and how smooth the result is to use.",
          },
          {
            title: "Add the human layer",
            body: "I review both phases with what agents miss: judgement, real users and trade-offs. I change the solution and the design before anything moves on.",
          },
          {
            title: "Attack it",
            body: "A security team runs attack scenarios against every critical part of the architecture: reverse engineering, partial and admin exploits, and the weak points of legacy software and certificates that recent attacks have shown. We patch as much as we can, then attack again.",
          },
          {
            title: "Sandbox, gate, ship",
            body: "Code runs in a sandbox and must pass every check before it goes near production. The agents brief me at every step, so nothing happens behind my back.",
          },
        ],
      },
      {
        t: "bullets",
        heading: "SECURITY BY DESIGN",
        items: [
          "No super admin. Every component has its own firewall and its own rights, and no user or admin outranks another.",
          "Breaking into one part never gives an attacker full control of the rest. An attack stays where it lands.",
          "Every attack scenario is written down and run, and the holes it finds are patched before release.",
        ],
      },
      {
        t: "bullets",
        heading: "ENGINEERING AROUND THE AGENTS",
        items: [
          "The right skills and direction: each agent gets only the skills, tools and access its task needs. Everything else is blocked, with clear rules on what to do and what never to do.",
          "Custom harnesses: for each problem I build a harness from open-source parts. One setup never fits every problem.",
          "Hard gates: a change counts as fixed only when every check passes for that exact version, recorded in a gate ledger that no agent can talk its way around.",
          "Fresh context: compaction is tuned per model, and workers are handed over before their context fills, so long sessions stay sharp.",
          "Token budget: every task has an estimate before it starts, and the cheapest model that can do the job does it. No tokens burned on work that fewer tokens can do.",
          "Sessions that keep going: when a usage limit hits, my assistant Nimbus waits for the reset and tells the session to continue.",
        ],
      },
      {
        t: "text",
        heading: "MODELS AND ROLES",
        body: "Claude Opus 5.5 is my lead today: it plans, reasons, reviews and delegates. That will change with the next release, and the system is built so it can. Up to two Claude Sonnet workers write the code and are replaced at 200,000 tokens of context. Codex takes computer-use and browser tasks. Swarms of Claude Haiku run bulk checks in parallel. Hermes and Nimbus, my own desktop assistant, run the scheduled jobs around the sessions.",
      },
      {
        t: "tree",
        heading: "MY CLAUDE CODE SETUP",
        root: "~/.claude",
        groups: [
          {
            path: "mods/",
            note: "Claude Code mods I built",
            items: [
              { name: "smart-delegation", note: "Opus orchestrates; two Sonnet workers code and hand over at 200k context" },
              { name: "codex-delegation", note: "sends computer-use and browser work to Codex, with a Claude fallback" },
              { name: "nimbus-link", note: "connects sessions to Nimbus: status, messages, continue after limits" },
              { name: "analog-design-mod", note: "hard gates for chip layout work: nothing ships until the gate ledger says so" },
              { name: "workbench", note: "panel with session metrics, a live timeline and working rules" },
              { name: "agents-panel", note: "pause, resume and stop running subagents and shell tasks" },
              { name: "mods-hud", note: "one view of every mod, its status and controls" },
              { name: "ast-st100-mode", note: "Simplified Technical English with a strictness dial" },
            ],
          },
          {
            path: "skills/design/",
            note: "taste, interfaces, motion and brand",
            items: [
              { name: "frontend-design" }, { name: "impeccable" }, { name: "apple-design" }, { name: "interface-design" },
              { name: "design-taste-frontend" }, { name: "high-end-visual-design" }, { name: "minimalist-ui" },
              { name: "industrial-brutalist-ui" }, { name: "stitch-design-taste" }, { name: "gpt-taste" },
              { name: "redesign-existing-projects" }, { name: "image-to-code" }, { name: "imagegen-frontend-web" },
              { name: "imagegen-frontend-mobile" }, { name: "brandkit" }, { name: "anatomy" }, { name: "install-anti-slop" },
            ],
          },
          {
            path: "skills/engineering/",
            note: "architecture, tests and discipline",
            items: [
              { name: "software-architecture" }, { name: "tdd" }, { name: "diagnosing-bugs" }, { name: "codebase-design" },
              { name: "domain-modeling" }, { name: "improve-codebase-architecture" }, { name: "prototype" }, { name: "to-spec" },
              { name: "to-tickets" }, { name: "triage" }, { name: "git-guardrails" }, { name: "setup-pre-commit" },
              { name: "grilling" }, { name: "writing-for-agents" }, { name: "handoff" }, { name: "adhd" },
              { name: "full-output-enforcement" }, { name: "unlazy" }, { name: "mcp-builder" }, { name: "skill-creator" },
            ],
          },
          {
            path: "skills/security/",
            note: "review and reverse engineering",
            items: [{ name: "security-review" }, { name: "code-review" }, { name: "reverse-engineer-anything" }, { name: "rea (MCP server)" }],
          },
          {
            path: "skills/research/",
            note: "web, papers and data",
            items: [
              { name: "firecrawl (28 skills)" }, { name: "deep-research" }, { name: "research" }, { name: "defuddle" },
              { name: "obsidian-cli" }, { name: "obsidian-markdown" }, { name: "obsidian-bases" }, { name: "json-canvas" },
            ],
          },
          {
            path: "skills/automation/",
            note: "hands on real software",
            items: [
              { name: "cua-driver" }, { name: "computer-use" }, { name: "chrome-browser" }, { name: "built-in-browser" },
              { name: "loop" }, { name: "schedule" }, { name: "run" },
            ],
          },
          {
            path: "plugins/",
            note: "",
            items: [{ name: "mattpocock-skills" }, { name: "rust-analyzer-lsp" }],
          },
        ],
      },
      {
        t: "numbers",
        items: [
          { value: "8", label: "Claude Code mods I built for my own way of working" },
          { value: "100+", label: "skills installed, each loaded only when its task needs it" },
          { value: "0", label: "super admins in the systems I design" },
        ],
      },
      {
        t: "text",
        heading: "WHY IT MATTERS",
        body: "AI makes a careless engineer faster at being careless. I use it the other way round: the agents do the typing, and I keep the thinking, the architecture and the final word. I have been coding since I was 11, and this is the biggest change I have seen. I do not let it make me lazy or replace me. It is my Excalibur.",
      },
      {
        t: "text",
        heading: "THIS SITE",
        body: "Built the same way. I set the idea, a TV you look through, and made the design calls. Claude Code wrote the WebGL picture tube, the liquid glass and the layout, then checked every screen in a headless browser at desktop and phone sizes before showing me.",
      },
      { t: "links", items: [{ label: "My GitHub", href: GH }] },
    ],
  },
  {
    ch: 8,
    blocks: [
      {
        t: "text",
        heading: "HELLO",
        body: [
          "I am Sai Harshavardhan, an engineer in Magdeburg, Germany. I studied artificial intelligence and data science in Bengaluru and now do a Master's in Digital Engineering at Otto-von-Guericke University Magdeburg.",
          "I like owning a product from the model down to the last pixel. I design the interface as carefully as I build the backend, and I pick up whatever stack the work needs.",
        ],
      },
      {
        t: "timeline",
        heading: "EXPERIENCE",
        items: [
          {
            when: "Aug 2026 – now",
            title: "Student assistant",
            where: "IIKT, Otto-von-Guericke University Magdeburg",
            body: "Research data pipelines and AI agents around Cadence Virtuoso for analog chip design. See channel 6.",
          },
          {
            when: "May 2026 – now",
            title: "Research assistant",
            where: "Chair of Cognitive Systems, Otto-von-Guericke University Magdeburg",
            body: "Memory architectures for AI agents: personalization that works across models and domains, with less redundant context.",
          },
          {
            when: "Aug 2024 – Oct 2025",
            title: "Automation and web development intern",
            where: "Abigya Training and Consulting, Hyderabad",
            body: "The only technical person at an overseas education consultancy. I designed and built the company's website, abigya.com, with my name in the footer, and an n8n workflow where an AI agent chats with new leads on WhatsApp, collects their details and hands each one to staff to screen. Both went live with real customers. See channel 9.",
          },
          {
            when: "Oct – Nov 2024",
            title: "AI research intern",
            where: "Hindustan Aeronautics Limited (HAL), Bengaluru",
            body: "A transcription pipeline for air traffic control speech with Whisper and a language model to clean it up.",
          },
        ],
      },
      {
        t: "timeline",
        heading: "EDUCATION",
        items: [
          { when: "Apr 2026 – 2028", title: "M.Sc. Digital Engineering", where: "Otto-von-Guericke University Magdeburg" },
          {
            when: "2021 – 2025",
            title: "B.E. Artificial Intelligence and Data Science",
            where: "Global Academy of Technology, Bengaluru",
            body: "First Class with Distinction.",
          },
        ],
      },
      {
        t: "bullets",
        heading: "PRIZE AND PAPERS",
        items: [
          "First prize at the DGVS Hackathon 2026 in Hamburg, with my team: a learning app for medical guidelines, built in 24 hours. I led most of the interface and the Flutter app.",
          "Four peer-reviewed publications, two IEEE conference papers and two book chapters: drones for disaster management, malware detection, EEG analysis and city power planning.",
        ],
      },
      {
        t: "text",
        heading: "LANGUAGES",
        body: "English: fluent (C2). German: beginner (A1), and learning.",
      },
      {
        t: "text",
        heading: "LOOKING FOR",
        body: "Working-student and part-time roles in Germany, up to 20 hours a week during the semester, and internships of up to six months. I can start right away.",
      },
      {
        t: "links",
        items: [
          { label: "LinkedIn (ask me for my CV)", href: "https://www.linkedin.com/in/sai-harshavardhan-ai" },
          { label: "GitHub", href: GH },
          { label: "Hugging Face", href: HF },
          { label: "IEEE paper: drones", href: "https://ieeexplore.ieee.org/document/10543607" },
          { label: "IEEE paper: malware", href: "https://ieeexplore.ieee.org/document/10837854" },
        ],
      },
    ],
  },
  {
    ch: 9,
    blocks: [
      {
        t: "list",
        heading: "CLIENT WORK",
        items: [
          {
            title: "Abigya: website and AI lead workflow",
            sub: "For an overseas education consultancy in Hyderabad and Bengaluru. I designed and built the website (my name is in the footer) and an n8n workflow: an AI agent chats with new leads on WhatsApp, collects their details and hands each one to staff, who mark it as genuine, a bot or low intent before following up. Both went live with real customers.",
            meta: "n8n, web",
            href: "https://www.abigya.com/",
          },
        ],
      },
      {
        t: "list",
        heading: "PRODUCTS",
        items: [
          {
            title: "Namma Office",
            sub: "A paid office suite for Windows: sheets, documents and PDF, with Kannada typing, licence keys and signed automatic updates. Built on storytold's open-source apps.",
            meta: "Rust",
            href: "https://harshavardhan3002.github.io/namma-office-downloads/",
          },
          {
            title: "Daimon",
            sub: "An assistant app for Android: chat with text and images, generated images, quizzes and text from PDF, TXT and Markdown files. Chats stay on the phone.",
            meta: "React Native",
            href: `${GH}/Daimon`,
          },
          {
            title: "CircuiTikZ Designer",
            sub: "My fork of FAU's circuit editor: an AI assistant with tool calling, circuit detection from hand drawings, a new interface and translations.",
            meta: "TypeScript",
            href: `${GH}/CircuiTikZ-Designer`,
          },
        ],
      },
      {
        t: "list",
        heading: "RESEARCH AND TOOLS",
        items: [
          {
            title: "Intrinsic model harness",
            sub: "Runs multi-agent setups (blackboard, episodic memory) on mixture-of-experts models served by colibri and measures how the experts get routed. 5 tasks, 4 architectures.",
            meta: "Python, C",
            href: `${GH}/Intrinsic_Model_harness`,
          },
          {
            title: "ROCmFPX fork",
            sub: "My public llama.cpp fork with the ROCmFPX formats, a scale fix for models with tiny weights and a runtime for decision models.",
            meta: "C++",
            href: `${GH}/ROCmFPX`,
          },
          {
            title: "Machine learning safety case",
            sub: "A 17-page safety case for pedestrian detection: calibration, distribution shift, data poisoning, adversarial tests and Grad-CAM.",
            meta: "PyTorch",
            href: `${GH}/Machine_Learning_Saefty_Report`,
          },
          {
            title: "AMS robOTTO classifier",
            sub: "A product classifier for the university's RoboCup team that learns new products without retraining.",
            meta: "Python",
            href: `${GH}/AMS_Lab`,
          },
        ],
      },
      {
        t: "list",
        heading: "EARLIER PROJECTS",
        items: [
          {
            title: "Object tracker",
            sub: "Real-time multi-object tracking from scratch: YOLOv8 detections, a Kalman filter, Hungarian matching and a Streamlit dashboard.",
            meta: "Python",
            href: `${GH}/Object_tracker`,
          },
          {
            title: "Gunshot detection",
            sub: "Finds where a sound came from with an 8-microphone array, GCC-PHAT and weighted least squares.",
            meta: "Python",
            href: `${GH}/GunShot_Detection`,
          },
          {
            title: "Face AI",
            sub: "A neural network for 7 facial emotions, with a live webcam demo.",
            meta: "TensorFlow",
            href: `${GH}/Face_AI`,
          },
        ],
      },
      {
        t: "list",
        heading: "OPEN MODELS ON HUGGING FACE",
        items: [
          { title: "MiniCPM-V 4.7 35B-A3B", sub: "Vision and language, 35B mixture of experts.", meta: "Text + image", href: `${HF}/MiniCPM-V-4.7-35B-A3B-ROCmFPX` },
          { title: "Ornith 1.5 122B", sub: "The largest model in the set.", meta: "Text", href: `${HF}/Ornith-1.5-122B-ROCmFPX` },
          { title: "Drama-3", sub: "Text to speech.", meta: "Speech", href: `${HF}/Drama-3-ROCmFPX-GGUF` },
          { title: "FLUX.3 Image Klein", sub: "Text to image.", meta: "Image", href: `${HF}/flux-3-image-klein-ROCmFPX` },
          { title: "MOSS-Image SFT", sub: "Text to image.", meta: "Image", href: `${HF}/MOSS-Image-SFT-ROCmFPX` },
          { title: "NVIDIA Nemotron 3.5 Bolt E4B", sub: "A small, fast text model.", meta: "Text", href: `${HF}/NVIDIA-Nemotron-3.5-Bolt-E4B-ROCmFPX` },
          { title: "Spark-X2.6 4B", sub: "A small text model.", meta: "Text", href: `${HF}/Spark-X2.6-4B-ROCmFPX` },
          { title: "Sage-A1.5", sub: "Text model.", meta: "Text", href: `${HF}/Sage-A1.5-ROCmFPX` },
          { title: "Kolibri-1", sub: "Text model.", meta: "Text", href: `${HF}/Kolibri-1-ROCmFPX` },
          { title: "Flint", sub: "Text model with tiny weights, made possible by the scale fix.", meta: "Text", href: `${HF}/flint-ROCmFPX` },
          { title: "Carbon-X", sub: "A DNA language model.", meta: "DNA", href: `${HF}/Carbon-X-ROCmFPX` },
          { title: "elephant-1 and mammoth-1", sub: "Decision models that score options in one pass.", meta: "Decisions", href: `${HF}/elephant-1-ROCmFPX` },
          { title: "Phonon-2 on the NPU", sub: "Speech recognition on the Ryzen AI NPU, 2.16% word errors.", meta: "NPU", href: `${HF}/Phonon-2-XDNA2` },
          { title: "Underdog Bark 3.0 on the NPU", sub: "English speech recognition on the Ryzen AI NPU, 2.31% word errors.", meta: "NPU", href: `${HF}/Underdog-Bark-3.0-XDNA2` },
        ],
      },
      { t: "links", items: [{ label: "All repos on GitHub", href: `${GH}?tab=repositories` }, { label: "All models on Hugging Face", href: HF }] },
    ],
  },
];

// Give every clickable row and link a stable id, in reading order, so the
// painted page and the hidden HTML copy agree on what is what.
for (const p of raw) {
  let n = 0;
  for (const b of p.blocks) {
    if (b.t === "list" || b.t === "links") for (const it of b.items) it.id = `link-${n++}`;
  }
}

export const pages: Record<number, Page> = Object.fromEntries(raw.map((p) => [p.ch, p]));
