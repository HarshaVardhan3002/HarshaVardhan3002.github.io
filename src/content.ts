import { hf } from "./hf";

// Facts for the site. Everything here comes from the verified master profile
// and the public repos. Change wording here, not inside the components.

export const person = {
  name: "Sai Harshavardhan",
  place: "Magdeburg, Germany",
  now: "Student assistant at IIKT, Otto-von-Guericke University Magdeburg",
  study: "M.Sc. Digital Engineering, Otto-von-Guericke University Magdeburg",
  lede: "I design and build software products end to end: the model, the backend, the app and the screen you touch.",
  github: "https://github.com/HarshaVardhan3002",
  huggingface: "https://huggingface.co/Harsha001",
  linkedin: "https://www.linkedin.com/in/sai-harshavardhan-ai",
  /** Public booking page (Google Calendar appointment schedule). Empty = "Hire me" opens LinkedIn. */
  booking: "https://calendar.app.google/PQSi4LBVQ2C1Dohs5",
};

/** The main call to action. Until the booking page exists it says "Hire me" and opens LinkedIn. */
export const cta = person.booking
  ? { label: "Book a call", long: "Book a 30-minute call", href: person.booking }
  : { label: "Hire me", long: "Hire me: message me on LinkedIn", href: person.linkedin };

/** One line of a teletext page. Colour codes in the text: {r}{g}{y}{b}{m}{c}{w}. */
export type TeletextLine = string;

export type Channel = {
  /** Channel number on the TV and the remote. */
  ch: number;
  /** Address of the channel's page: #/<slug>. */
  slug: string;
  /** Short title for the teletext header (14 characters at most). */
  short?: string;
  /** A few words under the title on its menu tile. */
  tile?: string;
  /** Teletext page number, shown in the header. */
  page: number;
  title: string;
  kind: string;
  /** One sentence for the programme guide. */
  guide: string;
  repo?: string;
  video?: string;
  /** One measured figure for the project card. */
  stat?: { value: string; label: string };
  /** Teletext body for channels without a video (40 columns). */
  teletext?: TeletextLine[];
};

export const channels: Channel[] = [
  {
    ch: 0,
    slug: "index",
    page: 100,
    title: "Index",
    kind: "Start page",
    guide: "Who I am and what is on each channel.",
    teletext: [
      "{w}Engineer and designer in Magdeburg.",
      "{w}I build products end to end: model,",
      "{w}backend, app and interface.",
      "",
      "{c}ON AIR TONIGHT",
      "{y}1{w} Nimbus 1.0 ............{c} desktop AI",
      "{y}2{w} Nimbus for Windows ....{c} AI overlay",
      "{y}3{w} zunzun ................{c} 744B on a PC",
      "{y}4{w} ROCmFPX quants + NPU ..{c} AMD models",
      "{y}5{w} MARL path selector ....{c} SCION",
      "{y}6{w} IIKT case study .......{c} chip data",
      "{y}7{w} How I work ............{c} AI agents",
      "{y}8{w} About me ..............{c} CV",
      "{y}9{w} All my work ...........{c} the rest",
    ],
  },
  {
    ch: 1,
    slug: "nimbus",
    page: 101,
    title: "Nimbus 1.0",
    tile: "Desktop AI assistant",
    stat: { value: "3", label: "desktop platforms: Windows, macOS and Linux" },
    kind: "Desktop AI assistant · Rust, Svelte, Tauri",
    guide: "A utility island at the top of the screen with a local AI assistant that can see, listen and act.",
    repo: "https://github.com/HarshaVardhan3002/Nimbus_revanced",
    video: "media/tv-nimbus-1.0.mp4",
  },
  {
    ch: 2,
    slug: "nimbus-windows",
    page: 102,
    title: "Nimbus for Windows",
    tile: "AI meeting overlay",
    stat: { value: "Local", label: "speech to text on your own PC (Sherpa-ONNX)" },
    kind: "AI meeting overlay · Electron",
    guide: "A local-first overlay that sees your screen and hears your meeting.",
    repo: "https://github.com/HarshaVardhan3002/nimbus",
    video: "media/tv-nimbus-electron.mp4",
  },
  {
    ch: 3,
    slug: "zunzun",
    page: 300,
    title: "zunzun",
    tile: "744B model on a home PC",
    stat: { value: "744B", label: "parameters, on one home PC" },
    kind: "MoE inference on a home PC · C, HIP",
    guide: "A 744-billion-parameter model on consumer hardware, with my GPU backend for AMD on Windows.",
    repo: "https://github.com/HarshaVardhan3002/zunzun",
    teletext: [
      "{w}colibri by JustVugg runs GLM-5.2, a",
      "{w}744B mixture-of-experts model, on a",
      "{w}home PC in pure C. zunzun extends it.",
      "",
      "{c}MY PART",
      "{y}>{w} HIP GPU backend for AMD iGPUs on",
      "{w}  Windows, about 3,800 lines C/C++",
      "{y}>{w} Unbuffered direct expert reads",
      "{w}  from NVMe on Windows",
      "",
      "{g}UPSTREAM{w} engine, KV compression, MTP",
      "{w}and MLA are colibri's work.",
    ],
  },
  {
    ch: 4,
    slug: "rocmfpx",
    page: 400,
    title: "ROCmFPX quants + NPU",
    tile: "Open models for AMD",
    stat: { value: "2.16%", label: "word errors on the Ryzen AI NPU (CPU: 2.14%)" },
    kind: "Open models for AMD · Hugging Face",
    guide: "Quantized open models in AMD low-bit formats, and speech models ported to the Ryzen AI NPU.",
    repo: "https://huggingface.co/Harsha001",
    teletext: [
      `{y}${hf.models}{w} open models, {y}${hf.downloads.toLocaleString("en-US")}{w} downloads,`,
      "{w}re-packed for AMD in ROCmFPX formats.",
      "",
      "{c}MiniCPM-V 4.7 35B, 4-bit, 22 GB",
      "{w}perplexity {y}6.25{w}  (BF16 {y}6.17{w})",
      "{w}same top token {y}92.5%",
      "",
      "{c}SPEECH ON THE RYZEN AI NPU",
      "{w}Phonon-2  1,366 ops on NPU",
      "{w}  word errors {y}2.16%{w} (CPU {y}2.14%{w})",
      "{w}Bark 3.0  word errors {y}2.31%",
      "",
      "{g}FORMATS{w} by charlie12345 (ROCmFPX)",
    ],
  },
  {
    ch: 5,
    slug: "marl",
    page: 500,
    title: "MARL path selector",
    tile: "Network research",
    stat: { value: "27", label: "training runs, compared on a Pareto front" },
    kind: "Network research · Python, MAPPO",
    guide: "Agents that pick network paths without a central oracle, plus SCIONfit to test them.",
    repo: "https://github.com/HarshaVardhan3002/MARL_path_selector",
    teletext: [
      "{w}SCION networks offer many paths.",
      "{w}Which one should traffic take?",
      "",
      "{c}MARL PATH SELECTOR",
      "{w}MAPPO agents replace a central",
      "{w}path oracle. 9 reward setups x 3",
      "{w}seeds = {y}27{w} runs, Pareto picks over",
      "{w}throughput, latency, oscillation.",
      "",
      "{c}SCIONFIT",
      "{y}10{w} behaviour probes: load, missing",
      "{w}data and stale observations.",
    ],
  },
  {
    ch: 6,
    slug: "iikt",
    page: 600,
    title: "IIKT case study",
    tile: "Chip design",
    short: "IIKT STUDY",
    stat: { value: "Bit-exact", label: "simulation results, straight from the solver" },
    kind: "Data and AI agents for chip design · Rust, Python",
    guide: "The software, data platform and AI agents around analog chip design research at my university.",
    teletext: [
      "{w}Analog chip design is slow work:",
      "{w}one EM simulation point takes about",
      "{y}8 min{w} and over {y}100 GB{w} of memory.",
      "",
      "{c}SILICONDB",
      "{w}Every run lands in one store with",
      "{w}its full history, in a dashboard",
      "{w}and a Hugging Face style hub.",
      "",
      "{c}RESULT",
      "{w}S-parameters {y}bit-identical{w} to the",
      "{w}solver's own output files.",
    ],
  },
  {
    ch: 7,
    slug: "how-i-work",
    page: 700,
    title: "How I work",
    tile: "Systems with agents",
    stat: { value: "$20", label: "a month runs it all" },
    kind: "Systems engineering with AI agents · Claude Code, Codex, Hermes",
    guide: "How I break a problem apart, put a team of agents on each part, attack the design and gate every change.",
    teletext: [
      "{w}Every problem is a system.",
      "{w}Each part gets its own agent team.",
      "",
      "{c}THE PIPELINE",
      "{y}1{w} Decompose the problem",
      "{y}2{w} Best solution, no limits",
      "{y}3{w} System architecture",
      "{y}4{w} My review: the human layer",
      "{y}5{w} Attack every critical part",
      "{y}6{w} Sandbox, gate, then ship",
      "",
      "{g}RULE{w} No super admin. An attack",
      "{w}stays where it lands.",
    ],
  },
  {
    ch: 8,
    slug: "about",
    page: 800,
    title: "About me",
    tile: "CV and studies",
    kind: "CV, studies and experience",
    guide: "Who I am, where I studied and worked, and what I am looking for.",
    teletext: [
      "{w}Sai Harshavardhan, Magdeburg.",
      "",
      "{c}NOW",
      "{w}M.Sc. Digital Engineering, OVGU",
      "{w}Student assistant, IIKT",
      "{w}Research assistant, Cognitive Syst.",
      "",
      "{c}BEFORE",
      "{w}Automation intern, Abigya {y}2024-25",
      "{w}AI research intern, HAL    {y}2024",
      "{w}B.E. AI and Data Science   {y}2025",
      "",
      "{g}PRIZE{w} DGVS Hackathon 2026, 1st",
    ],
  },
  {
    ch: 9,
    slug: "all-work",
    page: 900,
    title: "All my work",
    tile: "Everything else",
    kind: "Everything else · GitHub, Hugging Face",
    guide: "Every other project and every open model, for digging deeper.",
    teletext: [
      "{w}Everything else I have built.",
      "",
      "{c}CLIENT WORK",
      "{w}Abigya: website and AI lead",
      "{w}workflow on WhatsApp, {y}live",
      "",
      "{c}PRODUCTS",
      "{w}Namma Office, Daimon,",
      "{w}CircuiTikZ Designer",
      "",
      "{c}RESEARCH AND TOOLS",
      "{w}SCIONfit, model harness, ROCmFPX",
      "{w}fork, ML safety case, robOTTO",
      "",
      "{c}OPEN MODELS",
      "{w}AMD and NPU models on Hugging Face",
    ],
  },
];

export const tvChannels = channels.filter((c) => c.ch > 0);
