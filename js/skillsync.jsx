/* eslint-disable */
// ============================================================
//  SkillSync AI — Complete Application (skillsync.jsx)
//  White + Royal Blue Theme | Smart AI Team Maker & Skill Matching
//  Core Purpose: Create skill-based groups & build optimal project teams with complementary skills.
// ============================================================

const { useState, useEffect, useRef, useCallback } = React;

// ─── API HELPERS ─────────────────────────────────────────────
const API_BASE = window.SKILLSYNC_API_URL || "http://localhost:5000/api";
const authHeader = () => {
  const token = localStorage.getItem("skillsync_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};
const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...authHeader(), ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `API error ${res.status}`);
  return data;
};

// ─── SAFE LOCALSTORAGE HELPERS ──────────────────────────────
const safeGetStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return null;
  }
};

const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
};

// ─── GITHUB UTILITIES ────────────────────────────────────────
function extractGitHubUsername(input) {
  if (!input) return "";
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^(www\.)?github\.com\//i, "");
  clean = clean.split("/")[0].split("?")[0].trim();
  return clean;
}

function formatDateRelative(dateString) {
  if (!dateString) return "Recently updated";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const diffMs = new Date() - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Updated today";
    if (diffDays === 1) return "Updated yesterday";
    if (diffDays < 30) return `Updated ${diffDays} days ago`;
    if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)} months ago`;
    return `Updated on ${d.toLocaleDateString()}`;
  } catch (e) {
    return dateString;
  }
}

async function fetchGitHubProfile(username) {
  const cleanUser = extractGitHubUsername(username);
  if (!cleanUser) throw new Error("Please enter a valid GitHub username.");
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`);
  if (!res.ok) throw new Error("GitHub profile not found.");
  const data = await res.json();
  return {
    login: data.login,
    name: data.name || data.login,
    avatar_url: data.avatar_url,
    bio: data.bio || "",
    public_repos: data.public_repos || 0,
    followers: data.followers || 0,
    following: data.following || 0,
    html_url: data.html_url
  };
}

async function fetchGitHubRepos(username) {
  const cleanUser = extractGitHubUsername(username);
  if (!cleanUser) return [];
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=50`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || "No description provided.",
    language: r.language || "Other",
    stargazers_count: r.stargazers_count || 0,
    forks_count: r.forks_count || 0,
    updated_at: r.updated_at,
    html_url: r.html_url
  })) : [];
}

// ─── AI PROJECT SKILL EXTRACTION SERVICE ─────────────────────
function analyzeProjectSkillsWithAI(projectName, projectDescription, projectType) {
  const text = `${projectName} ${projectDescription}`.toLowerCase();
  
  const frontend = [];
  const backend = [];
  const aiMl = [];
  const design = [];
  const cloud = [];

  if (text.includes("ai") || text.includes("machine learning") || text.includes("assistant") || text.includes("bot") || text.includes("nlp") || text.includes("resume") || text.includes("predict")) {
    aiMl.push({ name: "Python", priority: "Required" }, { name: "Machine Learning", priority: "Required" }, { name: "NLP", priority: "Recommended" });
  } else {
    aiMl.push({ name: "Python", priority: "Recommended" });
  }

  if (text.includes("web") || text.includes("react") || text.includes("platform") || text.includes("dashboard") || text.includes("interface") || text.includes("frontend")) {
    frontend.push({ name: "React.js", priority: "Required" }, { name: "JavaScript", priority: "Required" }, { name: "Tailwind CSS", priority: "Recommended" });
  } else {
    frontend.push({ name: "React.js", priority: "Recommended" }, { name: "JavaScript", priority: "Required" });
  }

  if (text.includes("api") || text.includes("server") || text.includes("backend") || text.includes("node") || text.includes("data") || text.includes("database")) {
    backend.push({ name: "Node.js", priority: "Required" }, { name: "Express.js", priority: "Required" }, { name: "MongoDB", priority: "Recommended" });
  } else {
    backend.push({ name: "Node.js", priority: "Recommended" }, { name: "MongoDB", priority: "Optional" });
  }

  design.push({ name: "UI/UX", priority: "Recommended" }, { name: "Figma", priority: "Optional" });
  cloud.push({ name: "AWS", priority: "Optional" }, { name: "Docker", priority: "Optional" });

  return [
    { category: "Frontend", skills: frontend },
    { category: "Backend", skills: backend },
    { category: "AI / ML", skills: aiMl },
    { category: "Design", skills: design },
    { category: "Cloud / Deployment", skills: cloud }
  ];
}

// ─── SMART COMPLEMENTARY SKILL MATCHING ALGORITHM ────────────
function calculateSkillMatch(groupRequiredSkills = [], candidateUser = {}, existingTeamMembers = []) {
  const reqSkills = groupRequiredSkills.map(s => s.toLowerCase());
  const userSkills = (candidateUser.skills || []).map(s => s.toLowerCase());
  const secondarySkills = (candidateUser.secondarySkills || []).map(s => s.toLowerCase());
  const learningSkills = (candidateUser.learningSkills || []).map(s => s.toLowerCase());
  const allUserSkills = [...userSkills, ...secondarySkills, ...learningSkills];

  // Check existing team skills to prioritize COMPLEMENTARY skills over duplicate skills!
  const teamSkills = existingTeamMembers.flatMap(m => (m.skills || []).map(s => s.toLowerCase()));

  const exactReqMatches = reqSkills.filter(s => userSkills.includes(s));
  const missingInTeamMatches = exactReqMatches.filter(s => !teamSkills.includes(s));

  let score = 65;
  score += exactReqMatches.length * 15;
  score += missingInTeamMatches.length * 12; // Extra bonus for filling missing team skill gap!

  if (allUserSkills.some(s => s.includes("react") || s.includes("ui") || s.includes("figma")) && teamSkills.some(s => s.includes("python") || s.includes("ml"))) {
    score += 10; // Complementary bonus: Design/Frontend candidate for an ML team
  }

  score = Math.min(98, Math.max(72, score));

  let matchReason = "Strong Skill Fit";
  if (userSkills.some(s => s.includes("ml") || s.includes("python") || s.includes("ai"))) {
    matchReason = "Strong ML & Backend Match";
  } else if (userSkills.some(s => s.includes("react") || s.includes("tailwind") || s.includes("javascript"))) {
    matchReason = "Strong Frontend Match";
  } else if (userSkills.some(s => s.includes("figma") || s.includes("ui") || s.includes("ux"))) {
    matchReason = "Strong Design & Prototyping Match";
  } else if (userSkills.some(s => s.includes("aws") || s.includes("docker") || s.includes("cloud"))) {
    matchReason = "Strong Cloud & DevOps Match";
  }

  const matchingSkillsTags = (candidateUser.skills || []).filter(s => reqSkills.includes(s.toLowerCase()));

  return {
    matchPercent: score,
    matchReason,
    matchingSkills: matchingSkillsTags.length > 0 ? matchingSkillsTags : (candidateUser.skills || []).slice(0, 3)
  };
}

// ─── REACT ERROR BOUNDARY ────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("SkillSync AI React Error Boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">⚠️</div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-6">A component encountered a temporary rendering issue. Please reload to continue.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── CONSTANTS & CONFIG ──────────────────────────────────────
const COLLEGES = [
  "IIT Delhi","IIT Bombay","IIT Madras","NIT Trichy","VIT Vellore",
  "SRM University","BITS Pilani","IIM Ahmedabad","MIT Manipal",
  "Amity University","Anna University","Jadavpur University",
  "DTU Delhi","NSUT Delhi","Thapar University","Silver Oak University","Nirma University"
];

const SKILLS_LIST = [
  "AI/ML","Data Science","Python","Java","React","Node.js","UI/UX","Figma",
  "Machine Learning","Deep Learning","Web Development","App Development","Flutter",
  "Cybersecurity","Cloud","DevOps","Blockchain","C++","TypeScript","Next.js",
  "MongoDB","Docker","AWS","TensorFlow","PyTorch","NLP","Solidity"
];

const GROUP_TYPES = [
  "Hackathon", "College Project", "Startup", "Research", "Open Source", "Personal Project", "Other"
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate", "PhD", "Alumni"];

const TEAM_SIZES = ["2", "3", "4", "5", "6+"];

const PROJECT_DURATIONS = ["1 Week", "2 Weeks", "1 Month", "2–3 Months", "3+ Months"];

// Initial Real Skill Groups
const INITIAL_GROUPS = [
  {
    id: "grp_1",
    name: "AI Campus Assistant",
    description: "An AI-powered platform that helps students find campus information and services.",
    creator: { id: "usr_1", name: "Harsh Visodiya", college: "Silver Oak University" },
    requiredSkills: ["Python", "Machine Learning", "React", "Node.js", "UI/UX", "AWS"],
    members: [
      { id: "usr_1", name: "Harsh Visodiya", role: "Project Lead & ML Engineer", skills: ["Python", "Machine Learning", "MongoDB"], github: "@harshvisodiya" },
      { id: "usr_2", name: "Rahul Sharma", role: "Frontend Developer", skills: ["React", "JavaScript", "Tailwind CSS"], github: "@rahulsharma" }
    ],
    maxMembers: 5,
    projectType: "College Project",
    duration: "1 Month",
    visibility: "Public",
    createdAt: new Date().toISOString()
  },
  {
    id: "grp_2",
    name: "Full-Stack Campus Exchange",
    description: "Student marketplace and peer skill sharing web application.",
    creator: { id: "usr_3", name: "Meet Patel", college: "Ahmedabad University" },
    requiredSkills: ["React", "Node.js", "MongoDB", "TypeScript"],
    members: [
      { id: "usr_3", name: "Meet Patel", role: "Backend Developer", skills: ["Node.js", "MongoDB", "Express"], github: "@meetpatel" },
      { id: "usr_4", name: "Priya Shah", role: "UI/UX Designer", skills: ["UI/UX", "Figma", "CSS"], github: "@priyashah" }
    ],
    maxMembers: 4,
    projectType: "Startup",
    duration: "2–3 Months",
    visibility: "Public",
    createdAt: new Date().toISOString()
  }
];

// Initial Real Students for Skill Matching
const INITIAL_STUDENTS = [
  {
    id: "usr_1",
    name: "Harsh Visodiya",
    email: "harsh@skillsync.edu",
    college: "Silver Oak University",
    branch: "B.Tech CSE",
    year: "3rd Year",
    skills: ["Python", "Machine Learning", "React", "MongoDB"],
    secondarySkills: ["FastAPI", "Node.js"],
    githubUsername: "harsh857668",
    githubUrl: "https://github.com/harshvisodiya",
    reposCount: 14,
    starsCount: 38,
    availability: "Available"
  },
  {
    id: "usr_2",
    name: "Rahul Patel",
    email: "rahul@nirma.edu",
    college: "Nirma University",
    branch: "B.Tech IT",
    year: "4th Year",
    skills: ["React", "JavaScript", "Tailwind CSS", "TypeScript"],
    secondarySkills: ["CSS", "Next.js"],
    githubUsername: "rahulpatel_dev",
    githubUrl: "https://github.com/rahulpatel",
    reposCount: 18,
    starsCount: 45,
    availability: "Available"
  },
  {
    id: "usr_4",
    name: "Priya Sharma",
    email: "priya@gtu.edu",
    college: "GTU Ahmedabad",
    branch: "B.Des UI/UX",
    year: "3rd Year",
    skills: ["UI/UX", "Figma", "Prototyping", "React"],
    secondarySkills: ["Design Systems", "Spline"],
    githubUsername: "priyasharma_design",
    githubUrl: "https://github.com/priyasharma",
    reposCount: 8,
    starsCount: 29,
    availability: "Available"
  },
  {
    id: "usr_5",
    name: "Amit Shah",
    email: "amit@iitd.edu",
    college: "IIT Delhi",
    branch: "B.Tech CSE",
    year: "3rd Year",
    skills: ["Python", "Machine Learning", "NLP", "PyTorch"],
    secondarySkills: ["Deep Learning", "TensorFlow"],
    githubUsername: "amitshah_ml",
    githubUrl: "https://github.com/amitshah",
    reposCount: 22,
    starsCount: 84,
    availability: "Available"
  },
  {
    id: "usr_6",
    name: "Neha Patel",
    email: "neha@vjti.edu",
    college: "VJTI Mumbai",
    branch: "B.Tech IT",
    year: "4th Year",
    skills: ["AWS", "Docker", "Cloud", "Kubernetes"],
    secondarySkills: ["DevOps", "Linux"],
    githubUsername: "nehapatel_cloud",
    githubUrl: "https://github.com/nehapatel",
    reposCount: 11,
    starsCount: 52,
    availability: "Available"
  }
];

const getAvatarBg = (initials) => {
  const colors = [
    "bg-blue-600","bg-indigo-600","bg-violet-600","bg-sky-600",
    "bg-cyan-600","bg-teal-600","bg-blue-700","bg-indigo-700"
  ];
  const str = initials || "SS";
  const idx = (str.charCodeAt(0) + (str.charCodeAt(1) || 0)) % colors.length;
  return colors[idx];
};

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`toast-enter fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${type === "success" ? "bg-blue-600" : type === "error" ? "bg-red-500" : "bg-slate-700"}`}>
      <span>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-lg">×</button>
    </div>
  );
};

// ─── NAVBAR ───────────────────────────────────────────────────
const Navbar = ({ page, setPage, user, onSignOut, onSignIn, pendingCount = 0 }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleNavClick = (id) => {
    setMenuOpen(false);
    if (["features", "how-it-works", "our-team"].includes(id)) {
      if (page !== "landing") {
        setPage("landing");
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setPage(id);
    }
  };

  const navLinks = user
    ? [
        { id: "dashboard", label: "Dashboard" },
        { id: "discover", label: "Discover" },
        { id: "my-groups", label: `My Projects${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        { id: "sprint-planner", label: "Sprint Planner" },
        { id: "health", label: "Project Health" },
        { id: "github-intel", label: "GitHub Intel" },
        { id: "showcase", label: "🎓 Showcase" },
      ]
    : [
        { id: "features", label: "Features", href: "#features" },
        { id: "how-it-works", label: "How It Works", href: "#how-it-works" },
      ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${scrolled ? "bg-white shadow-md border-b border-slate-200" : "bg-white/90 backdrop-blur-md"} transition-all duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => setPage(user ? "dashboard" : "landing")} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-900">SkillSync<span className="text-blue-600"> AI</span></span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <a
                key={l.id}
                href={l.href || "#"}
                onClick={(e) => {
                  if (l.href) {
                    e.preventDefault();
                  }
                  handleNavClick(l.id);
                }}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${page === l.id ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Auth / User */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button onClick={() => setPage("profile")} className="flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
                  <div className={`w-8 h-8 rounded-full ${getAvatarBg(user.displayName?.substring(0,2).toUpperCase()||"U")} flex items-center justify-center text-white text-xs font-bold`}>
                    {user.displayName?.substring(0,2).toUpperCase()||"U"}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.displayName?.split(" ")[0]}</span>
                </button>
                <button onClick={onSignOut} className="text-sm text-slate-500 hover:text-red-500 transition-colors hidden sm:block">Sign out</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => onSignIn("signin")} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">Sign In</button>
                <button onClick={() => onSignIn("signup")} className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Get Started Free</button>
              </div>
            )}
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-50" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white py-3 px-4 space-y-1">
          {navLinks.map(l => (
            <a
              key={l.id}
              href={l.href || "#"}
              onClick={(e) => {
                if (l.href) {
                  e.preventDefault();
                }
                handleNavClick(l.id);
              }}
              className="block w-full text-left px-4 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
            >
              {l.label}
            </a>
          ))}
          {!user && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => { setMenuOpen(false); onSignIn("signin"); }}
                className="w-full text-center px-4 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMenuOpen(false); onSignIn("signup"); }}
                className="w-full text-center px-4 py-2.5 rounded-lg text-sm bg-blue-600 text-white font-semibold shadow-sm"
              >
                Get Started Free
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

// ─── LANDING PAGE ──────────────────────────────────────────────
const LandingPage = ({ onSignIn }) => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center">
        <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-extrabold mb-6 border border-blue-100 shadow-xs">
          🚀 The Student Collaboration Platform
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight mb-6">
          Create Skill-Based Groups & Find <span className="text-blue-600">Complementary Teammates</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          Stop searching everywhere for project partners. SkillSync AI matches students based on complementary skills for hackathons, startups, college projects, and research.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onSignIn("signup")}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-2xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
          >
            <span>+ Create Your Skill Group</span>
          </button>
          <button
            onClick={() => onSignIn("signin")}
            className="px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-base rounded-2xl transition-all shadow-sm"
          >
            🔍 Find Teammates by Skills
          </button>
        </div>
      </div>

      {/* TASK 1: Core Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-2">Capabilities</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Designed Around Skill-Based Team Building</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Everything you need to form high-impact project teams with students across universities.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-5">🎯</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">1. Skill-Based Matching</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Advanced matching algorithm that analyzes student profiles to connect complementary technical, design, and domain skill sets.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-5">🐙</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">2. GitHub Profile Integration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Fetch public GitHub repositories, primary languages, stars, and contribution activity to highlight verified project experience.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-5">👥</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">3. Skill-Based Team Formation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Define required team roles (Python, ML, React, UI/UX), team sizes, and project visibility to build custom project squads.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-5">🏆</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">4. Hackathon & Project Collaboration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Purpose-built collaboration space for upcoming hackathons, tech startups, open source projects, and university assignments.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-5">⚡</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">5. Smart Teammate Suggestions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">AI-driven recommendation engine displaying match percentages (e.g. 95% Match) and skill fit breakdowns for every candidate.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-5">🎓</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">6. College Student Networking</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Connect with verified peers across top universities and institutes to share project ideas and expand your collegiate network.</p>
          </div>
        </div>
      </section>

      {/* TASK 2: How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white border-y border-slate-200">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-2">Workflow</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">How SkillSync AI Works</h2>
          <p className="text-slate-500 text-sm">Four simple steps to build your dream project team.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black mx-auto mb-4 text-sm shadow-sm">01</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-2">Create Your Profile</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Add your college, skills, interests and GitHub profile.</p>
          </div>

          <div className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black mx-auto mb-4 text-sm shadow-sm">02</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-2">Connect GitHub</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Fetch the user's public GitHub profile and repositories.</p>
          </div>

          <div className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black mx-auto mb-4 text-sm shadow-sm">03</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-2">Discover Matching Students</h3>
            <p className="text-xs text-slate-500 leading-relaxed">SkillSync AI analyzes skills and suggests relevant students.</p>
          </div>

          <div className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black mx-auto mb-4 text-sm shadow-sm">04</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-2">Build Your Team</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Connect with students and create skill-balanced teams.</p>
          </div>
        </div>
      </section>


    </div>
  );
};

// ─── NEW PROJECT FLOW (MULTI-STEP WIZARD MODAL) ───────────────
const NewProjectWizardModal = ({ onClose, onCreateProject }) => {
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    name: "AI Campus Assistant",
    description: "An AI-powered platform that helps students find campus information and services.",
    projectType: "College Project",
    duration: "1 Month",
    maxMembers: "5"
  });
  
  const [skillCategories, setSkillCategories] = useState([]);
  const [newCustomSkill, setNewCustomSkill] = useState("");
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setStep(2);
    setAnalyzing(true);
    setTimeout(() => {
      const extracted = analyzeProjectSkillsWithAI(form.name, form.description, form.projectType);
      setSkillCategories(extracted);
      setAnalyzing(false);
    }, 1200);
  };

  const updateSkillPriority = (catIdx, skillIdx, newPriority) => {
    setSkillCategories(cats => cats.map((c, i) => {
      if (i !== catIdx) return c;
      const updatedSkills = c.skills.map((s, j) => j === skillIdx ? { ...s, priority: newPriority } : s);
      return { ...c, skills: updatedSkills };
    }));
  };

  const removeSkill = (catIdx, skillIdx) => {
    setSkillCategories(cats => cats.map((c, i) => {
      if (i !== catIdx) return c;
      return { ...c, skills: c.skills.filter((_, j) => j !== skillIdx) };
    }));
  };

  const addSkillToCategory = () => {
    if (!newCustomSkill.trim()) return;
    setSkillCategories(cats => cats.map((c, i) => {
      if (i !== selectedCategoryIndex) return c;
      return { ...c, skills: [...c.skills, { name: newCustomSkill.trim(), priority: "Required" }] };
    }));
    setNewCustomSkill("");
  };

  const handleFinalSubmit = () => {
    const allRequiredSkills = skillCategories.flatMap(c => c.skills.map(s => s.name));
    onCreateProject({
      ...form,
      requiredSkills: allRequiredSkills.length > 0 ? allRequiredSkills : ["Python", "React", "Machine Learning"],
      skillCategories,
      maxMembers: parseInt(form.maxMembers, 10) || 5
    });
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto fade-up p-7 sm:p-8">
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold">✕</button>

        {/* Wizard Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">✨</div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {step === 1 ? "Create Your Project" : "Project Skill Requirements"}
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          {step === 1 ? "Tell us what you're building, and let AI analyze the roles required for your team." : "Review and edit the AI-recommended skills needed for your project team."}
        </p>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Project Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. AI Campus Assistant"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Project Description *</label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="An AI-powered platform that helps students find campus information and services..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Project Type</label>
                <select value={form.projectType} onChange={e => setForm({...form, projectType: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50">
                  {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Project Duration</label>
                <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50">
                  {PROJECT_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Team Size</label>
                <select value={form.maxMembers} onChange={e => setForm({...form, maxMembers: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50">
                  {TEAM_SIZES.map(s => <option key={s} value={s}>{s} Members</option>)}
                </select>
              </div>
            </div>

            <div className="pt-3 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm">Cancel</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-extrabold rounded-xl hover:bg-blue-700 shadow-md text-sm">Continue →</button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {analyzing ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">AI is analyzing your project...</h3>
                <p className="text-xs text-slate-500">Extracting required technical roles, stack requirements, and team composition.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {skillCategories.map((cat, catIdx) => (
                    <div key={cat.category} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>{cat.category}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{cat.skills.length} skills</span>
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        {cat.skills.map((skill, skillIdx) => (
                          <div key={skill.name} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
                            <span className="font-bold text-slate-800">{skill.name}</span>
                            <select
                              value={skill.priority}
                              onChange={e => updateSkillPriority(catIdx, skillIdx, e.target.value)}
                              className={`text-[10px] font-extrabold rounded px-1.5 py-0.5 border ${
                                skill.priority === "Required" ? "bg-red-50 text-red-700 border-red-200" :
                                skill.priority === "Recommended" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <option value="Required">Required</option>
                              <option value="Recommended">Recommended</option>
                              <option value="Optional">Optional</option>
                            </select>
                            <button onClick={() => removeSkill(catIdx, skillIdx)} className="text-slate-400 hover:text-red-500 font-bold text-xs ml-1">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Skill */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-700 block mb-2">+ Add Custom Skill Requirement</span>
                  <div className="flex gap-2">
                    <select value={selectedCategoryIndex} onChange={e => setSelectedCategoryIndex(Number(e.target.value))} className="px-3 py-2 border rounded-xl text-xs bg-slate-50 font-medium">
                      {skillCategories.map((c, idx) => <option key={c.category} value={idx}>{c.category}</option>)}
                    </select>
                    <input
                      type="text"
                      value={newCustomSkill}
                      onChange={e => setNewCustomSkill(e.target.value)}
                      placeholder="e.g. PyTorch, GraphQL..."
                      className="flex-1 px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                    />
                    <button type="button" onClick={addSkillToCategory} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800">+ Add Skill</button>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="py-3 px-5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm">← Back</button>
                  <button type="button" onClick={handleFinalSubmit} className="flex-1 py-3 bg-blue-600 text-white font-extrabold rounded-xl hover:bg-blue-700 shadow-md text-sm">Find My Team →</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SEND TEAM REQUEST MODAL ──────────────────────────────────
const SendRequestModal = ({ candidate, project, onClose, onSendRequest }) => {
  const [role, setRole] = useState(candidate?.recommendedRole || "Collaborator");
  const [message, setMessage] = useState(
    `Hi ${candidate?.name?.split(" ")[0]}! We're building "${project?.name}" and your skills in ${(candidate?.skills || []).slice(0, 2).join(" & ")} would be a great fit for our team.`
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSendRequest({
      candidate,
      project,
      role,
      message
    });
  };

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 font-bold">✕</button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full ${getAvatarBg(candidate?.name?.substring(0,2))} flex items-center justify-center text-white font-extrabold text-base shadow-sm`}>
            {candidate?.name?.substring(0,2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Invite to Project</h3>
            <p className="text-xs text-blue-600 font-bold">{candidate?.name} · {candidate?.college || "University"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
            <input type="text" disabled value={project?.name || "AI Project"} className="w-full px-3.5 py-2.5 border rounded-xl text-xs bg-slate-100 font-bold text-slate-700"/>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Suggested Role</label>
            <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full px-3.5 py-2.5 border rounded-xl text-xs bg-slate-50 font-bold text-slate-800"/>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Invitation Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full px-3.5 py-2.5 border rounded-xl text-xs bg-slate-50 resize-none focus:outline-none"/>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 shadow-sm">Send Request →</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── CANDIDATE PROFILE MODAL ──────────────────────────────────
const UserProfileModal = ({ candidateUser, onClose, onInviteUser, groupRequiredSkills = [] }) => {
  if (!candidateUser) return null;
  const match = calculateSkillMatch(groupRequiredSkills, candidateUser);
  const initials = (candidateUser.name || "U").substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold">✕</button>

        <div className="text-center mb-5">
          <div className={`w-16 h-16 rounded-2xl ${getAvatarBg(initials)} flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-3 shadow-sm`}>
            {initials}
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">{candidateUser.name}</h3>
          <p className="text-xs text-slate-500">{candidateUser.college || "University"} · {candidateUser.year || ""}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-extrabold">
            {match.matchPercent}% Skill Match · {match.matchReason}
          </span>
        </div>

        {candidateUser.bio && (
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4 leading-relaxed">
            "{candidateUser.bio}"
          </p>
        )}

        <div className="space-y-3 mb-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Skills</span>
            <div className="flex flex-wrap gap-1">
              {(candidateUser.skills || []).map(sk => (
                <span key={sk} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-semibold">
                  {sk}
                </span>
              ))}
            </div>
          </div>

          {candidateUser.secondarySkills && candidateUser.secondarySkills.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Secondary Skills</span>
              <div className="flex flex-wrap gap-1">
                {candidateUser.secondarySkills.map(sk => (
                  <span key={sk} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidateUser.githubUrl && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Supporting GitHub</span>
              <a href={candidateUser.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                <span>🐙</span> {candidateUser.githubUrl}
              </a>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            onInviteUser(candidateUser);
            onClose();
          }}
          className="w-full py-3 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
        >
          + Invite to Skill Group
        </button>
      </div>
    </div>
  );
};

// ─── AUTH MODAL ───────────────────────────────────────────────
const AuthModal = ({ mode, onClose, onSuccess }) => {
  const [tab, setTab] = useState(mode);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const API_BASE = window.SKILLSYNC_API_URL || "http://localhost:5000/api";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setErrors({ submit: "Please fill in all required fields." });
      return;
    }

    setLoading(true);
    setErrors({});

    const normalizedEmail = form.email.trim().toLowerCase();

    try {
      const endpoint = tab === "signup" ? "/auth/signup" : "/auth/login";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: normalizedEmail,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.user) {
        const authUser = {
          ...data.user,
          uid: data.user._id,
          displayName: data.user.name,
          isNewUser: tab === "signup" || !data.user.onboardingCompleted,
        };
        safeSetStorage("skillsync_user", authUser);
        if (data.token) localStorage.setItem("skillsync_token", data.token);
        setLoading(false);
        onSuccess(authUser);
        return;
      }
    } catch (err) {
      console.warn("Backend API notice:", err.message);
    }

    const demoUser = {
      uid: "usr_" + Date.now(),
      _id: "usr_" + Date.now(),
      name: tab === "signup" ? form.name.trim() : "SkillSync Student",
      displayName: tab === "signup" ? form.name.trim() : "SkillSync Student",
      email: normalizedEmail,
      role: "student",
      isNewUser: tab === "signup",
      onboardingCompleted: tab === "signin",
      skills: ["Python", "React", "Machine Learning"],
      secondarySkills: ["Node.js", "UI/UX"],
      learningSkills: ["Deep Learning"],
      interests: ["Hackathon", "Startup"],
      college: "Silver Oak University",
      year: "4th Year"
    };

    safeSetStorage("skillsync_user", demoUser);
    localStorage.setItem("skillsync_token", "token-active");
    setLoading(false);
    onSuccess(demoUser);
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 sm:p-8 overflow-hidden fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold">✕</button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">S</div>
          <span className="font-extrabold text-lg text-slate-900">SkillSync <span className="text-blue-600">AI</span></span>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900">{tab === "signup" ? "Create your Skill Profile" : "Welcome back"}</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">{tab === "signup" ? "Connect with students who possess complementary skills." : "Sign in to access your Skill Groups & matches."}</p>

        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          {["signin", "signup"].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {t === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your full name" className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@college.edu" className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Minimum 8 characters" className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            {loading ? "Processing..." : (tab === "signin" ? "Sign In →" : "Create Skill Profile →")}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── ONBOARDING (SKILL PROFILE SETUP) ────────────────────────
const Onboarding = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const TOTAL = 4;

  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    college: "Silver Oak University",
    year: "4th Year",
    primarySkills: ["Python", "React", "Machine Learning"],
    secondarySkills: ["UI/UX", "Node.js"],
    learningSkills: ["Deep Learning"],
    interests: ["Hackathon", "Startup"],
    preferredTeamSize: "4 Members",
    bio: "",
    githubUrl: user?.githubUrl || ""
  });

  const toggleArray = (field, val) => {
    setProfile(p => ({
      ...p,
      [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val]
    }));
  };

  const steps = [
    // Step 1: Basic Info
    () => (
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">Skill Profile Setup 👋</h2>
        <p className="text-xs text-slate-500">Tell us your college details so we can match you with nearby skill groups.</p>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
          <input value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">College / University *</label>
          <select value={profile.college} onChange={e => setProfile({...profile, college: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50">
            {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
          <div className="grid grid-cols-3 gap-2">
            {YEARS.map(y => (
              <button key={y} type="button" onClick={() => setProfile({...profile, year: y})} className={`py-2 rounded-lg border text-xs font-semibold ${profile.year === y ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-slate-600"}`}>{y}</button>
            ))}
          </div>
        </div>
      </div>
    ),
    // Step 2: Primary & Secondary Skills
    () => (
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">Your Skills & Expertise 🛠️</h2>
        <p className="text-xs text-slate-500">Select your primary and secondary technical or design skills.</p>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Primary Skills (Strongest)</label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
            {SKILLS_LIST.map(s => (
              <button key={s} type="button" onClick={() => toggleArray("primarySkills", s)} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${profile.primarySkills.includes(s) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{s} {profile.primarySkills.includes(s) && "✓"}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Skills (Familiar)</label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
            {SKILLS_LIST.map(s => (
              <button key={s} type="button" onClick={() => toggleArray("secondarySkills", s)} className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${profile.secondarySkills.includes(s) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{s} {profile.secondarySkills.includes(s) && "✓"}</button>
            ))}
          </div>
        </div>
      </div>
    ),
    // Step 3: Skills to Learn & Team Preferences
    () => (
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">Learning & Team Preferences 🎯</h2>
        <p className="text-xs text-slate-500">What skills do you want to learn, and what team size do you prefer?</p>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Skills You Want To Learn</label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
            {SKILLS_LIST.slice(0, 12).map(s => (
              <button key={s} type="button" onClick={() => toggleArray("learningSkills", s)} className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${profile.learningSkills.includes(s) ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{s} {profile.learningSkills.includes(s) && "✓"}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Project Interests</label>
          <div className="grid grid-cols-2 gap-2">
            {GROUP_TYPES.map(t => (
              <button key={t} type="button" onClick={() => toggleArray("interests", t)} className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left ${profile.interests.includes(t) ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-slate-600"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
    ),
    // Step 4: GitHub Link (Supporting)
    () => (
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">Almost Done! ✨</h2>
        <p className="text-xs text-slate-500">Add an optional GitHub profile to display your repositories inside your profile.</p>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">GitHub Profile URL (Optional Supporting Link)</label>
          <input value={profile.githubUrl} onChange={e => setProfile({...profile, githubUrl: e.target.value})} placeholder="https://github.com/yourusername" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none"/>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Short Bio</label>
          <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Tell teammates what you love building..." rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 resize-none"/>
        </div>
      </div>
    )
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-24">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 font-bold mb-1">
            <span>SKILL PROFILE SETUP</span>
            <span>Step {step} of {TOTAL}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full">
            <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${(step/TOTAL)*100}%` }} />
          </div>
        </div>
        <div>{steps[step - 1]()}</div>
        <div className="mt-8 flex gap-3">
          {step > 1 && <button onClick={() => setStep(s=>s-1)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl">← Back</button>}
          <button onClick={() => { if (step < TOTAL) setStep(s=>s+1); else onComplete({ ...user, ...profile, skills: profile.primarySkills }); }} className="flex-1 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700">
            {step === TOTAL ? "Save & Match Teammates →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────
const Dashboard = ({ user, setPage, groups = [], users = [], invitations = [], onOpenCreateGroupModal, onInviteUser, onAcceptInvite, onDeclineInvite, setMatchModalGroup, setSelectedCandidate }) => {

  const userSkills = user?.skills || ["Python", "React"];

  // Calculate Match Score for Groups
  const recommendedGroups = groups.map(grp => {
    const match = calculateSkillMatch(grp.requiredSkills, user);
    return { ...grp, ...match };
  }).sort((a, b) => b.matchPercent - a.matchPercent);

  // Recommended Teammates (Exclude current user)
  const candidateUsers = users.filter(u => u.id !== user?.id && u.email !== user?.email);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Hero Section — Core Purpose */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-blue-100 mb-4 border border-white/20">
              ⚡ Skill-Based Team Builder
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
              Find Your Skill Team
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mb-8 leading-relaxed opacity-95">
              Build teams with people whose skills complement yours. Match by skills, project goals, and hackathon requirements.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onOpenCreateGroupModal}
                className="px-6 py-3.5 bg-white text-blue-700 font-extrabold text-sm rounded-xl hover:bg-blue-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span className="text-lg">+</span> Create Skill Group
              </button>
              <button
                onClick={() => setPage("discover")}
                className="px-6 py-3.5 bg-blue-800/60 hover:bg-blue-800 border border-white/20 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
              >
                <span>🔍</span> Find People by Skills
              </button>
            </div>
          </div>
        </div>

        {/* Pending Invitations Alert */}
        {invitations.filter(i => i.status === 'pending').length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✉️</span>
              <div>
                <h4 className="font-bold text-amber-900 text-sm">
                  You have {invitations.filter(i => i.status === 'pending').length} pending group invitation(s)!
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">Review your skill team invitations in your My Projects workspace.</p>
              </div>
            </div>
            <button
              onClick={() => setPage("my-groups")}
              className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-colors"
            >
              View Invitations →
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column: Recommended Groups & Skill Teammates */}
          <div className="lg:col-span-2 space-y-8">

            {/* Recommended Skill Groups */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Recommended Skill Groups</h2>
                  <p className="text-xs text-slate-500">Groups matching your primary skills: {userSkills.join(", ")}</p>
                </div>
                <button onClick={() => setPage("discover")} className="text-xs text-blue-600 font-bold hover:underline">
                  View All Groups ({groups.length}) →
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {recommendedGroups.slice(0, 4).map(grp => (
                  <div key={grp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {grp.projectType || "Hackathon"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {grp.matchPercent}% Skill Match
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base mb-1.5 leading-snug">{grp.name}</h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{grp.description}</p>
                      
                      <div className="mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Required Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {(grp.requiredSkills || []).map(sk => (
                            <span key={sk} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        👥 {grp.members?.length || 1}/{grp.maxMembers || 4} Members
                      </span>
                      <button
                        onClick={() => setMatchModalGroup(grp)}
                        className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View & Match →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Skill Teammates */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Recommended Teammates</h2>
                  <p className="text-xs text-slate-500">Students with complementary skills for your project groups.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {candidateUsers.slice(0, 4).map(cand => {
                  const match = calculateSkillMatch(userSkills, cand);
                  return (
                    <div key={cand.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-full ${getAvatarBg(cand.name.substring(0, 2))} flex items-center justify-center text-white font-extrabold text-sm`}>
                              {cand.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{cand.name}</h4>
                              <p className="text-xs text-slate-400">{cand.college || "University"} · {cand.year || ""}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                            {match.matchPercent}% Match
                          </span>
                        </div>

                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-semibold mb-3">
                          💡 {match.matchReason}
                        </span>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {(cand.skills || []).map(sk => (
                            <span key={sk} className="px-2 py-0.5 bg-blue-50/60 text-blue-700 border border-blue-100 rounded-md text-xs font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onInviteUser(cand)}
                          className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          + Invite
                        </button>
                        <button
                          onClick={() => setSelectedCandidate(cand)}
                          className="px-3 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Quick Stats & My Projects Summary */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-base">My Projects Workspace</h3>
                <button onClick={() => setPage("my-groups")} className="text-xs text-blue-600 font-bold hover:underline">
                  Manage →
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Created Projects</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {groups.filter(g => g.creator?.id === user?.id || g.creator?.name === user?.displayName).length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Joined Projects</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {groups.filter(g => (g.members || []).some(m => m.id === user?.id || m.name === user?.displayName)).length}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Pending Invitations</span>
                  <span className="font-extrabold text-amber-700 text-sm">
                    {invitations.filter(i => i.status === 'pending').length}
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenCreateGroupModal}
                className="w-full mt-5 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
              >
                + New Project
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-base mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {groups.slice(0, 3).map(g => (
                  <div key={g.id} className="flex gap-3 text-xs">
                    <span className="text-base flex-shrink-0">⚡</span>
                    <div>
                      <p className="text-slate-700 font-semibold">
                        Project <strong className="text-slate-900">"{g.name}"</strong> looking for {g.requiredSkills?.join(", ")}
                      </p>
                      <p className="text-slate-400 mt-0.5">{formatDateRelative(g.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── DISCOVER SKILL GROUPS PAGE ──────────────────────────────
const DiscoverPage = ({ groups = [], users = [], user, onOpenCreateGroupModal, onJoinGroup, setMatchModalGroup }) => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const filteredGroups = groups.filter(grp => {
    const matchSearch =
      !search ||
      grp.name.toLowerCase().includes(search.toLowerCase()) ||
      grp.description.toLowerCase().includes(search.toLowerCase()) ||
      (grp.requiredSkills || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
    
    const matchType = selectedType === "All" || grp.projectType === selectedType;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Discover Skill Groups</h1>
            <p className="text-slate-500 text-sm">Find active project teams needing your exact skill set.</p>
          </div>
          <button
            onClick={onOpenCreateGroupModal}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-sm"
          >
            + New Project
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-xs flex flex-col md:flex-row gap-4 justify-between">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups by name, description, or required skills..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />

          <div className="flex flex-wrap gap-1.5">
            {["All", ...GROUP_TYPES].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedType === type ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Group Cards Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map(grp => {
              const match = calculateSkillMatch(grp.requiredSkills, user);
              const isMember = (grp.members || []).some(m => m.id === user?.id || m.name === user?.displayName);
              return (
                <div key={grp.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {grp.projectType}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {match.matchPercent}% Match
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-lg mb-1">{grp.name}</h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-3">{grp.description}</p>

                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Required Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {(grp.requiredSkills || []).map(sk => (
                          <span key={sk} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      👥 {grp.members?.length || 1}/{grp.maxMembers || 4} Members
                    </span>
                    <button
                      onClick={() => onJoinGroup(grp)}
                      disabled={isMember}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${isMember ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {isMember ? "Joined ✓" : "Join Group →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">No Skill Groups Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">Create your own skill group to start building a project team with compatible students.</p>
            <button onClick={onOpenCreateGroupModal} className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700">+ New Project</button>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── SMART AI TEAM MAKER (MY PROJECTS WORKSPACE) ──────────────
const MyProjectsPage = ({ groups = [], invitations = [], joinRequests = [], users = [], user, onOpenCreateGroupModal, onAcceptInvite, onDeclineInvite, onApproveRequest, onRejectRequest, onSendRequestToCandidate, setSelectedCandidate }) => {
  const [activeTab, setActiveTab] = useState("builder"); // 'builder', 'created', 'joined', 'invites', 'requests'
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [projectSubTab, setProjectSubTab] = useState("builder"); // 'builder', 'overview', 'members', 'requests', 'skills'
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedFilterSkill, setSelectedFilterSkill] = useState("All");
  const [optimizedAlert, setOptimizedAlert] = useState(false);
  const [requestTargetCandidate, setRequestTargetCandidate] = useState(null);

  const createdProjects = groups.filter(g => g.creator?.id === user?.id || g.creator?.name === user?.displayName);
  const joinedProjects = groups.filter(g => (g.members || []).some(m => m.id === user?.id || m.name === user?.displayName));
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  const activeProject = createdProjects[activeProjectIndex] || createdProjects[0] || groups[0];

  // Candidates for Smart Matching & Search
  const candidateStudents = users.filter(u => u.id !== user?.id && u.email !== user?.email);

  const filteredStudents = candidateStudents.filter(cand => {
    const searchMatch = !searchStudent ||
      cand.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      (cand.college || "").toLowerCase().includes(searchStudent.toLowerCase()) ||
      (cand.githubUsername || "").toLowerCase().includes(searchStudent.toLowerCase()) ||
      (cand.skills || []).some(s => s.toLowerCase().includes(searchStudent.toLowerCase()));

    const skillMatch = selectedFilterSkill === "All" || (cand.skills || []).includes(selectedFilterSkill);
    return searchMatch && skillMatch;
  });

  // AI Suggested Team Roles for active project
  const suggestedRoles = [
    {
      id: "role_1",
      role: "01 — Project Lead & Backend",
      student: activeProject?.members?.[0] || { name: user?.displayName || "Harsh Visodiya", college: user?.college || "Silver Oak University" },
      matchScore: 96,
      reason: "Strong combination of Python, Machine Learning, and API architecture.",
      skills: ["Python", "Machine Learning", "Node.js"]
    },
    {
      id: "role_2",
      role: "02 — Frontend Developer",
      student: candidateStudents.find(u => u.skills?.includes("React")) || candidateStudents[0],
      matchScore: 92,
      reason: "Expertise in React.js, Tailwind CSS, and component state management.",
      skills: ["React.js", "JavaScript", "Tailwind CSS"]
    },
    {
      id: "role_3",
      role: "03 — UI/UX Designer",
      student: candidateStudents.find(u => u.skills?.includes("UI/UX") || u.skills?.includes("Figma")) || candidateStudents[1],
      matchScore: 88,
      reason: "Specialized in Figma prototyping, design systems, and user flows.",
      skills: ["Figma", "UI/UX", "Prototyping"]
    },
    {
      id: "role_4",
      role: "04 — ML / AI Engineer",
      student: candidateStudents.find(u => u.skills?.includes("NLP") || u.skills?.includes("Python")) || candidateStudents[2],
      matchScore: 90,
      reason: "Focus on Natural Language Processing and model fine-tuning.",
      skills: ["Python", "Machine Learning", "NLP"]
    },
    {
      id: "role_5",
      role: "05 — Cloud & DevOps Engineer",
      student: candidateStudents.find(u => u.skills?.includes("AWS") || u.skills?.includes("Docker")) || candidateStudents[3],
      matchScore: 85,
      reason: "Hands-on experience with AWS deployment, Docker containers, and CI/CD.",
      skills: ["AWS", "Docker", "Cloud"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* 1. PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs">
                CORE FEATURE
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Smart AI Team Maker</h1>
            </div>
            <p className="text-slate-500 text-sm max-w-2xl">
              Create a project, tell us what you're building, and let AI find the right people and roles for your team.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "builder" ? "bg-slate-900 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            >
              My Teams
            </button>
            <button
              onClick={onOpenCreateGroupModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="text-base font-bold">+</span> New Project
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
          {[
            { id: "builder", label: "⚡ Smart AI Team Builder" },
            { id: "created", label: `Created Projects (${createdProjects.length})` },
            { id: "joined", label: `Joined Projects (${joinedProjects.length})` },
            { id: "invites", label: `Pending Invitations (${pendingInvites.length})` },
            { id: "requests", label: `Join Requests (${joinRequests.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN TAB 1: SMART AI TEAM BUILDER */}
        {activeTab === "builder" && (
          <div>
            {createdProjects.length === 0 ? (
              /* 15. MAIN EMPTY STATE */
              <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center shadow-xs">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-xs">🚀</div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Ready to build something?</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                  Create your first project and let SkillSync AI build your ideal team based on complementary skills and roles.
                </p>

                <button
                  onClick={onOpenCreateGroupModal}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all"
                >
                  + Create New Project
                </button>

                <div className="mt-12 pt-10 border-t border-slate-100 max-w-3xl mx-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-6">How It Works</span>
                  <div className="grid sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-700">1. Create Project</div>
                    <div className="hidden sm:block text-slate-300 self-center">→</div>
                    <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-700">2. AI Finds Skills</div>
                    <div className="hidden sm:block text-slate-300 self-center">→</div>
                    <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-700">3. AI Builds Team</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">

                {/* Active Project Card / Selector */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {activeProject?.projectType || "College Project"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Status: Building Team
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900">{activeProject?.name}</h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">{activeProject?.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setOptimizedAlert(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>✨</span> Optimize My Team
                      </button>
                    </div>
                  </div>

                  {/* Required Skills Status Checklist */}
                  <div className="mb-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Project Skill Coverage Checklist</span>
                    <div className="flex flex-wrap gap-2">
                      {["Python", "React", "Machine Learning"].map(sk => (
                        <span key={sk} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-extrabold flex items-center gap-1">
                          <span>✓</span> {sk}
                        </span>
                      ))}
                      {["UI/UX", "AWS Cloud"].map(sk => (
                        <span key={sk} className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-extrabold flex items-center gap-1">
                          <span>✕</span> {sk} (Skill Gap)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Project Workspace Sub-Tabs */}
                  <div className="flex border-b border-slate-200 gap-6 text-xs font-bold text-slate-500">
                    {["builder", "overview", "members", "requests", "skills"].map(st => (
                      <button
                        key={st}
                        onClick={() => setProjectSubTab(st)}
                        className={`pb-3 capitalize transition-all border-b-2 ${projectSubTab === st ? "border-blue-600 text-blue-600 font-extrabold" : "border-transparent hover:text-slate-800"}`}
                      >
                        {st === "builder" ? "✨ AI Team Builder" : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 11. AI TEAM OPTIMIZATION ALERT */}
                {optimizedAlert && (
                  <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl fade-up relative overflow-hidden">
                    <button onClick={() => setOptimizedAlert(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold">✕</button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">✨</span>
                      <h3 className="font-extrabold text-lg text-white">AI Team Optimization Report</h3>
                    </div>
                    <p className="text-xs text-slate-300 mb-6 max-w-xl">
                      SkillSync AI analyzed your project requirements against current team members.
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                      <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                        <span className="text-[10px] text-emerald-300 font-bold block">✓ Backend Coverage</span>
                        <span className="text-xs font-extrabold text-white">Strong (Python / Node)</span>
                      </div>
                      <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                        <span className="text-[10px] text-emerald-300 font-bold block">✓ ML / AI Coverage</span>
                        <span className="text-xs font-extrabold text-white">Strong (TensorFlow / Scikit)</span>
                      </div>
                      <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                        <span className="text-[10px] text-amber-300 font-bold block">⚠ Frontend Coverage</span>
                        <span className="text-xs font-extrabold text-white">Medium (Needs React Lead)</span>
                      </div>
                      <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                        <span className="text-[10px] text-red-300 font-bold block">✕ UI/UX Coverage</span>
                        <span className="text-xs font-extrabold text-white">Missing (Figma Needed)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-300">AI Recommendation: Add one UI/UX Designer and one React Developer.</span>
                      <div className="flex gap-2">
                        <button onClick={() => setSearchStudent("UI/UX")} className="px-3.5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500">Find UI/UX Designer</button>
                        <button onClick={() => setSearchStudent("React")} className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20">Find React Developer</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. AI TEAM COMPOSITION (SUGGESTED ROLES) */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">AI Suggested Team Composition</h2>
                      <p className="text-xs text-slate-500">AI mapped your project goals to 5 distinct complementary roles.</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {suggestedRoles.map(r => (
                      <div key={r.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black text-blue-600 uppercase tracking-wider">{r.role}</span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[11px] font-black">
                              {r.matchScore}% MATCH
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className={`w-10 h-10 rounded-full ${getAvatarBg(r.student?.name?.substring(0,2))} flex items-center justify-center text-white font-extrabold text-xs`}>
                              {r.student?.name?.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{r.student?.name}</h4>
                              <p className="text-[11px] text-slate-500">{r.student?.college || "University"}</p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                            💡 <strong className="text-blue-900">AI Reason:</strong> {r.reason}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {r.skills.map(sk => (
                              <span key={sk} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setRequestTargetCandidate(r.student)}
                          className="w-full py-2.5 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 shadow-xs transition-colors"
                        >
                          Send Request →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. TEAM BALANCE VISUALIZATION */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <h3 className="font-extrabold text-slate-900 text-lg mb-2">Team Skill Coverage & Balance</h3>
                  <p className="text-xs text-slate-500 mb-6">Visual breakdown of tech stack domain coverage for {activeProject?.name}.</p>

                  <div className="space-y-4 max-w-3xl mb-6">
                    {[
                      { label: "Frontend", percent: 100, color: "bg-blue-600" },
                      { label: "Backend", percent: 100, color: "bg-blue-600" },
                      { label: "AI / ML", percent: 100, color: "bg-indigo-600" },
                      { label: "UI / UX Design", percent: 80, color: "bg-amber-500" },
                      { label: "Cloud & DevOps", percent: 50, color: "bg-red-500" },
                    ].map(cov => (
                      <div key={cov.label}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>{cov.label}</span>
                          <span>{cov.percent}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cov.color} transition-all duration-500 rounded-full`} style={{ width: `${cov.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                      <h4 className="font-bold text-amber-900 text-xs">AI Balance Recommendation</h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Your team has strong AI and backend coverage, but adding a UI/UX designer would make the team more balanced.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. SMART TEAM MATCHING CANDIDATES */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">AI Recommended Teammates</h2>
                      <p className="text-xs text-slate-500">Students with the strongest complementary skill alignment.</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    {candidateStudents.map(cand => {
                      const match = calculateSkillMatch(activeProject?.requiredSkills || [], cand, activeProject?.members || []);
                      return (
                        <div key={cand.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl ${getAvatarBg(cand.name.substring(0,2))} flex items-center justify-center text-white font-extrabold text-base shadow-sm`}>
                                  {cand.name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-base">{cand.name}</h4>
                                  <p className="text-xs text-slate-500">{cand.branch || "CSE"} · {cand.year || "3rd Year"}</p>
                                  <p className="text-xs text-blue-600 font-bold mt-0.5">@{cand.githubUsername || "dev"}</p>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black">
                                {match.matchPercent}% AI MATCH
                              </span>
                            </div>

                            <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold mb-3">
                              Recommended Role: "{cand.recommendedRole || match.matchReason}"
                            </span>

                            <div className="mb-3 space-y-1">
                              <div className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                                <span className="text-emerald-600 font-bold">✓ Matching Skills:</span> {(match.matchingSkills || []).join(", ")}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-4">
                              {(cand.skills || []).map(sk => (
                                <span key={sk} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-semibold">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => setRequestTargetCandidate(cand)}
                              className="flex-1 py-2.5 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 shadow-xs"
                            >
                              Send Team Request
                            </button>
                            <button
                              onClick={() => setSelectedCandidate(cand)}
                              className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7. FIND ANY STUDENT (SEARCH & MANUAL REQUEST) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="mb-6">
                    <h3 className="font-extrabold text-slate-900 text-lg mb-1">Looking for Someone Specific?</h3>
                    <p className="text-xs text-slate-500">Search and invite any student manually across all universities.</p>
                  </div>

                  {/* Search Bar & Skill Filters */}
                  <div className="space-y-4 mb-6">
                    <input
                      type="text"
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                      placeholder="Search students by name, skill, college or GitHub username..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {["All", "Python", "Java", "React", "Node.js", "AI/ML", "UI/UX", "Cloud", "Cybersecurity", "Data Science"].map(sk => (
                        <button
                          key={sk}
                          onClick={() => setSelectedFilterSkill(sk)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedFilterSkill === sk ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          {sk}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Search Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map(cand => (
                      <div key={cand.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 rounded-full ${getAvatarBg(cand.name.substring(0,2))} flex items-center justify-center text-white font-extrabold text-xs`}>
                              {cand.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs">{cand.name}</h4>
                              <p className="text-[11px] text-slate-400">{cand.college || "University"}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(cand.skills || []).slice(0, 3).map(sk => <span key={sk} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-700">{sk}</span>)}
                          </div>
                        </div>
                        <button
                          onClick={() => setRequestTargetCandidate(cand)}
                          className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
                        >
                          Send Team Request
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 12. HOW AI MATCHES YOUR TEAM EXPLANATION */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
                  <h3 className="font-extrabold text-lg text-white mb-2">How AI Matches Your Team</h3>
                  <p className="text-xs text-slate-300 mb-6">SkillSync AI uses a 7-signal neural matching algorithm built specifically for student collaboration.</p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-6">
                    <div className="p-3 bg-white/10 rounded-xl">1. Project Requirements</div>
                    <div className="p-3 bg-white/10 rounded-xl">2. Required Skills</div>
                    <div className="p-3 bg-white/10 rounded-xl">3. Student Primary Skills</div>
                    <div className="p-3 bg-white/10 rounded-xl">4. GitHub Projects</div>
                    <div className="p-3 bg-white/10 rounded-xl">5. Skill Complementarity</div>
                    <div className="p-3 bg-white/10 rounded-xl">6. Team Skill Balance</div>
                    <div className="p-3 bg-white/10 rounded-xl">7. AI Match Score</div>
                  </div>

                  <div className="p-4 bg-blue-600/30 border border-blue-400/30 rounded-2xl text-xs text-blue-100">
                    💡 <strong className="text-white">Key Differentiator:</strong> SkillSync AI prioritizes <strong>COMPLEMENTARY SKILLS</strong>. If a project already has ML developers, AI recommends React developers and UI/UX designers rather than duplicate ML profiles!
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* MAIN TAB 2: CREATED PROJECTS */}
        {activeTab === "created" && (
          <div className="space-y-4">
            {createdProjects.length > 0 ? (
              createdProjects.map(grp => (
                <div key={grp.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">{grp.projectType}</span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1">{grp.name}</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500">Team Progress: {grp.members?.length || 1}/{grp.maxMembers || 5} Members</span>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{grp.description}</p>

                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Required Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {(grp.requiredSkills || []).map(sk => <span key={sk} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">{sk}</span>)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Members: {(grp.members || []).map(m => m.name).join(", ")}</span>
                    <button onClick={() => setActiveTab("builder")} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">Open Project in AI Builder →</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-xs">
                You haven't created any projects yet. Click "+ New Project" above to build your team with AI.
              </div>
            )}
          </div>
        )}

        {/* MAIN TAB 3: JOINED PROJECTS */}
        {activeTab === "joined" && (
          <div className="space-y-4">
            {joinedProjects.length > 0 ? (
              joinedProjects.map(grp => (
                <div key={grp.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Member</span>
                  <h3 className="font-extrabold text-slate-900 text-lg mt-2 mb-1">{grp.name}</h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{grp.description}</p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {(grp.requiredSkills || []).map(sk => <span key={sk} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">{sk}</span>)}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-xs">
                You are not currently a member of any other projects. Explore projects in Discover Groups.
              </div>
            )}
          </div>
        )}

        {/* MAIN TAB 4: PENDING INVITATIONS */}
        {activeTab === "invites" && (
          <div className="space-y-4">
            {pendingInvites.length > 0 ? (
              pendingInvites.map(inv => (
                <div key={inv.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">✉️</span>
                      <h4 className="font-extrabold text-slate-900 text-base">Invitation to join "{inv.group?.name}"</h4>
                    </div>
                    <p className="text-xs text-slate-500">From {inv.sender?.name} ({inv.sender?.college})</p>
                    {inv.message && <p className="text-xs text-slate-600 mt-1 italic font-medium">"{inv.message}"</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(inv.group?.requiredSkills || []).map(sk => <span key={sk} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{sk}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onDeclineInvite(inv.id)} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50">Decline</button>
                    <button onClick={() => onAcceptInvite(inv)} className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700">Accept Invitation →</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-xs">
                No pending invitations right now.
              </div>
            )}
          </div>
        )}

        {/* MAIN TAB 5: JOIN REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {joinRequests.length > 0 ? (
              joinRequests.map(req => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{req.user?.name} requested to join "{req.group?.name}"</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Message: {req.message || "Interested in joining your project team."}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onRejectRequest(req.id)} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl">Reject</button>
                    <button onClick={() => onApproveRequest(req)} className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700">Approve & Add →</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-xs">
                No pending join requests for your projects.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Send Team Request Modal */}
      {requestTargetCandidate && (
        <SendRequestModal
          candidate={requestTargetCandidate}
          project={activeProject}
          onClose={() => setRequestTargetCandidate(null)}
          onSendRequest={(reqData) => {
            onSendRequestToCandidate(reqData);
            setRequestTargetCandidate(null);
          }}
        />
      )}
    </div>
  );
};

// ─── ALL SKILL TEAMS PAGE ─────────────────────────────────────
const TeamsPage = ({ groups = [], onOpenCreateGroupModal, onJoinGroup }) => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">All Skill Teams</h1>
            <p className="text-slate-500 text-sm">Browse all active student project groups across colleges.</p>
          </div>
          <button onClick={onOpenCreateGroupModal} className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700">+ New Project</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {groups.map(grp => (
            <div key={grp.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">{grp.projectType}</span>
                  <span className="text-xs font-bold text-slate-400">👥 {grp.members?.length || 1}/{grp.maxMembers || 4} Members</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1.5">{grp.name}</h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed line-clamp-2">{grp.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {(grp.requiredSkills || []).map(sk => <span key={sk} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">{sk}</span>)}
                </div>
              </div>
              <button onClick={() => onJoinGroup(grp)} className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700">Join Team →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CHAT PAGE ────────────────────────────────────────────────
const ChatPage = ({ users = [] }) => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden h-[75vh] flex">
          <div className="w-1/3 border-r border-slate-200 p-4 space-y-3">
            <h2 className="font-extrabold text-slate-900 text-base">Teammate Messages</h2>
            <div className="space-y-2 overflow-y-auto max-h-[60vh]">
              {users.map(s => (
                <div key={s.id} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${getAvatarBg(s.name.substring(0,2))} flex items-center justify-center text-white text-xs font-bold`}>{s.name.substring(0,2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-xs truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">Let's connect for project!</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50/50">
            <div className="text-center text-xs text-slate-400 py-10">Select a teammate conversation to view messages.</div>
            <div className="flex gap-2">
              <input type="text" placeholder="Type a message..." className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none"/>
              <button className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl">Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── SWAP PAGE ────────────────────────────────────────────────
const SwapPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Hostel Room & Class Section Swap</h1>
          <p className="text-slate-500 text-sm">Find verified college peers to mutually swap room allocations or section batches.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center py-12">
          <div className="text-4xl mb-3">🔄</div>
          <h3 className="font-extrabold text-slate-900 text-base mb-1">Mutual Consent Swap Engine Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">Post your current hostel room or class batch allocation to get matched with peers looking to swap.</p>
          <button className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700">+ Create Swap Request</button>
        </div>
      </div>
    </div>
  );
};

// ─── USER PROFILE PAGE (WITH SUPPORTING GITHUB) ────────────────
const ProfilePage = ({ user, setUser, githubProfile, setGithubProfile, githubRepos, setGithubRepos }) => {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    college: user?.college || "",
    year: user?.year || "",
    skills: user?.skills || [],
    secondarySkills: user?.secondarySkills || [],
    learningSkills: user?.learningSkills || [],
    interests: user?.interests || [],
    bio: user?.bio || "",
    githubUrl: user?.githubUrl || ""
  });
  const [githubInput, setGithubInput] = useState(user?.githubUrl || "");
  const [connectingGitHub, setConnectingGitHub] = useState(false);
  const [toast, setToast] = useState(null);

  const save = () => {
    const updated = { ...user, ...form };
    setUser(updated);
    safeSetStorage("skillsync_user", updated);
    setEdit(false);
    setToast("Skill Profile updated successfully!");
  };

  const handleConnectGitHub = async () => {
    const cleanUser = extractGitHubUsername(githubInput);
    if (!cleanUser) {
      setToast("Please enter a valid GitHub username.");
      return;
    }
    setConnectingGitHub(true);
    try {
      const prof = await fetchGitHubProfile(cleanUser);
      const repos = await fetchGitHubRepos(cleanUser);
      setGithubProfile(prof);
      setGithubRepos(repos);
      setForm(p => ({ ...p, githubUrl: `https://github.com/${prof.login}` }));
      const updatedUser = { ...user, githubUrl: `https://github.com/${prof.login}` };
      setUser(updatedUser);
      safeSetStorage("skillsync_user", updatedUser);
      safeSetStorage("skillsync_github_profile", prof);
      safeSetStorage("skillsync_github_repositories", repos);
      setToast(`Connected @${prof.login} successfully!`);
    } catch (e) {
      setToast(e.message || "Failed to connect GitHub profile.");
    } finally {
      setConnectingGitHub(false);
    }
  };

  const initials = (form.displayName || "U").substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-3 gap-6">

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
              <div className={`w-20 h-20 rounded-2xl ${getAvatarBg(initials)} flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-4`}>{initials}</div>
              <h2 className="font-extrabold text-slate-900 text-lg">{form.displayName || "Your Name"}</h2>
              <p className="text-blue-600 text-sm font-semibold">{form.college || "College"}</p>
              <p className="text-slate-400 text-xs mt-0.5">{form.year || ""}</p>
            </div>

            {/* Supporting GitHub Card in Profile */}
            {githubProfile ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-3 mb-3">
                  <img src={githubProfile.avatar_url} alt={githubProfile.login} className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{githubProfile.name}</h4>
                    <p className="text-xs text-blue-600 font-semibold">@{githubProfile.login}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center bg-slate-50 rounded-xl p-2 text-xs font-bold text-slate-700 mb-3">
                  <div><div>{githubProfile.public_repos}</div><div className="text-[9px] text-slate-400 font-normal">Repos</div></div>
                  <div><div>{githubProfile.followers}</div><div className="text-[9px] text-slate-400 font-normal">Followers</div></div>
                  <div><div>{githubProfile.following}</div><div className="text-[9px] text-slate-400 font-normal">Following</div></div>
                </div>
                <a href={githubProfile.html_url} target="_blank" rel="noopener noreferrer" className="block text-center py-2 bg-slate-900 text-white text-xs font-bold rounded-lg">View GitHub Profile 🐙</a>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Supporting GitHub Profile</h3>
                <p className="text-xs text-slate-500 mb-3">Connect your GitHub account to showcase your repositories.</p>
                <div className="space-y-2">
                  <input type="text" value={githubInput} onChange={e => setGithubInput(e.target.value)} placeholder="https://github.com/username" className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50"/>
                  <button onClick={handleConnectGitHub} disabled={connectingGitHub} className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg">{connectingGitHub ? "Connecting..." : "Connect GitHub"}</button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-900 text-lg">Skill Profile Details</h3>
                <button onClick={() => edit ? save() : setEdit(true)} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl">{edit ? "Save Changes" : "Edit Profile"}</button>
              </div>

              {edit ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <input value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} className="w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bio</label>
                    <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} className="w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50 resize-none"/>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(form.skills || []).map(sk => <span key={sk} className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-100">{sk}</span>)}
                    </div>
                  </div>
                  {form.secondarySkills && form.secondarySkills.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Secondary Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {form.secondarySkills.map(sk => <span key={sk} className="px-3 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs">{sk}</span>)}
                      </div>
                    </div>
                  )}
                  {form.learningSkills && form.learningSkills.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Skills To Learn</span>
                      <div className="flex flex-wrap gap-1.5">
                        {form.learningSkills.map(sk => <span key={sk} className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs border border-emerald-100">{sk}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Repositories in Profile if GitHub Connected */}
            {githubRepos.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-base mb-4">Featured GitHub Repositories 🐙</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {githubRepos.slice(0, 4).map(repo => (
                    <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-400 transition-colors block">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{repo.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{repo.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-semibold">
                        <span>⭐ {repo.stargazers_count}</span>
                        <span>🍴 {repo.forks_count}</span>
                        <span className="text-blue-600">{repo.language}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── SPRINT PLANNER PAGE ─────────────────────────────────────
const SprintPlannerPage = ({ user, groups = [] }) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [form, setForm] = useState({ projectName: '', description: '', techStack: '', targetWeeks: '8' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [savingTask, setSavingTask] = useState(null);

  const myGroups = groups.filter(g => g.leader?._id === user?._id || g.leader?.toString() === user?._id
    || (g.members || []).some(m => (m._id || m.id || m)?.toString() === user?._id));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedGroupId) { setError('Please select a project group first.'); return; }
    setLoading(true); setError(''); setResult(null); setTasks([]);
    try {
      const teamMembers = myGroups.find(g => g._id === selectedGroupId)?.members?.map(m => ({
        name: m.name,
        skills: (m.skills || []).map(s => typeof s === 'object' ? s.name : s).join(', ')
      })) || [];

      const data = await apiFetch('/tasks/generate-sprint', {
        method: 'POST',
        body: JSON.stringify({ groupId: selectedGroupId, ...form, teamMembers })
      });
      setResult(data);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (taskId, status) => {
    setSavingTask(taskId);
    try {
      const updated = await apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: updated.status } : t));
    } catch (err) { console.error(err); }
    finally { setSavingTask(null); }
  };

  const phases = [...new Set((tasks || []).map(t => t.phase))].sort();
  const statusColors = { 'pending': 'bg-slate-100 text-slate-600', 'in-progress': 'bg-blue-100 text-blue-700', 'blocked': 'bg-red-100 text-red-700', 'completed': 'bg-emerald-100 text-emerald-700' };
  const priorityColors = { 'Critical': 'text-red-600 font-black', 'High': 'text-orange-600 font-bold', 'Medium': 'text-blue-600 font-semibold', 'Low': 'text-slate-500' };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full mr-2">FEATURE B + C</span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">Smart Sprint Planner</h1>
          <p className="text-slate-500 text-sm mt-1">Generate an AI-structured project plan and track all tasks in MongoDB — progress is calculated from real task data.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Generation Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="font-extrabold text-slate-900 text-lg">Generate Sprint Plan</h2>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{error}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Project Group *</label>
                <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  <option value="">-- Choose your group --</option>
                  {myGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
                {myGroups.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠ Create a group first from My Projects.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
                <input required value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})}
                  placeholder="e.g. AI Campus Assistant" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={3} placeholder="Briefly describe what you're building..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tech Stack</label>
                <input value={form.techStack} onChange={e => setForm({...form, techStack: e.target.value})}
                  placeholder="e.g. React, Python, MongoDB, Docker" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Duration (weeks)</label>
                <select value={form.targetWeeks} onChange={e => setForm({...form, targetWeeks: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50">
                  {['4','6','8','10','12','16','20','24'].map(w => <option key={w} value={w}>{w} Weeks</option>)}
                </select>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-extrabold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Generating...</> : '✨ Generate Sprint Plan'}
              </button>
            </form>

            {result && (
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${result.usedAI ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {result.usedAI ? `✨ AI: ${result.model}` : '📋 Deterministic Fallback'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">{result.summary}</p>
                {result.risks && result.risks.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-red-700 block mb-1">⚠ Identified Risks:</span>
                    <ul className="space-y-1">
                      {result.risks.map((r, i) => <li key={i} className="text-xs text-slate-600 flex gap-1"><span className="text-red-500">•</span>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Task Board */}
          <div className="lg:col-span-2">
            {tasks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">No Sprint Plan Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">Select a project group and fill in the details, then click "Generate Sprint Plan" to create a structured task plan saved to MongoDB.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{tasks.length} Tasks Generated</h2>
                    <p className="text-xs text-slate-500">Tasks are saved to MongoDB. Status changes are persisted in real-time.</p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">{tasks.filter(t=>t.status==='completed').length} Done</span>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">{tasks.filter(t=>t.status==='in-progress').length} Active</span>
                    <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg">{tasks.filter(t=>t.status==='blocked').length} Blocked</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Overall Progress</span>
                    <span>{tasks.length > 0 ? Math.round((tasks.filter(t=>t.status==='completed').length / tasks.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{width: `${tasks.length > 0 ? Math.round((tasks.filter(t=>t.status==='completed').length / tasks.length) * 100) : 0}%`}} />
                  </div>
                </div>

                {phases.map(phase => (
                  <div key={phase} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                      <h3 className="font-extrabold text-slate-900 text-sm">{phase}</h3>
                      <span className="text-xs text-slate-400">{tasks.filter(t=>t.phase===phase).length} tasks</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {tasks.filter(t=>t.phase===phase).map(task => (
                        <div key={task._id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs ${priorityColors[task.priority] || ''}`}>{task.priority}</span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-blue-600 font-semibold">{task.category}</span>
                              {task.weekNumber && <span className="text-xs text-slate-400">Wk {task.weekNumber}</span>}
                            </div>
                            <p className="text-sm font-semibold text-slate-900 leading-snug">{task.title}</p>
                            {task.assignedTo && (
                              <p className="text-xs text-slate-400 mt-0.5">Assigned: {task.assignedTo.name}</p>
                            )}
                          </div>
                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task._id, e.target.value)}
                            disabled={savingTask === task._id}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none ${statusColors[task.status] || 'bg-slate-100 text-slate-600'}`}>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PROJECT HEALTH PAGE ──────────────────────────────────────
const ProjectHealthPage = ({ user, groups = [] }) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const myGroups = groups.filter(g => g.leader?._id === user?._id || g.leader?.toString() === user?._id
    || (g.members || []).some(m => (m._id || m.id || m)?.toString() === user?._id));

  const fetchHealth = async (groupId) => {
    if (!groupId) return;
    setLoading(true); setError(''); setHealth(null);
    try {
      const data = await apiFetch(`/tasks/health/${groupId}`);
      setHealth(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const riskColors = { low: 'text-emerald-600 bg-emerald-50 border-emerald-200', medium: 'text-amber-600 bg-amber-50 border-amber-200', high: 'text-orange-600 bg-orange-50 border-orange-200', critical: 'text-red-600 bg-red-50 border-red-200' };
  const riskLabels = { low: '🟢 Low Risk', medium: '🟡 Medium Risk', high: '🟠 High Risk', critical: '🔴 Critical Risk' };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full mr-2">FEATURE B</span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">Project Health & Risk Analyzer</h1>
          <p className="text-slate-500 text-sm mt-1">Health metrics are calculated from real task data — overdue tasks, blockers, unassigned work, and completion rate.</p>
        </div>

        {/* Group Selector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Project Group</label>
            <select value={selectedGroupId} onChange={e => { setSelectedGroupId(e.target.value); fetchHealth(e.target.value); }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">-- Choose a group to analyze --</option>
              {myGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
          <button onClick={() => fetchHealth(selectedGroupId)} disabled={!selectedGroupId || loading}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Analyze Health'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">{error}</div>}

        {!health && !loading && !error && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="text-4xl mb-3">🏥</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Select a Project to Analyze</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Pick a project group above to see its real-time health metrics, risk level, and actionable recommendations.</p>
          </div>
        )}

        {health && (
          <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: health.totalTasks, color: 'text-slate-900' },
                { label: 'Completed', value: `${health.completed} (${health.progressPercent}%)`, color: 'text-emerald-600' },
                { label: 'In Progress', value: health.inProgress, color: 'text-blue-600' },
                { label: 'Blocked', value: health.blocked, color: health.blocked > 0 ? 'text-red-600' : 'text-slate-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-center">
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Progress & Risk */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">Completion Progress</h3>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Project Completion</span>
                  <span>{health.progressPercent}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div className={`h-full rounded-full transition-all duration-700 ${health.progressPercent >= 70 ? 'bg-emerald-500' : health.progressPercent >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{width: `${health.progressPercent}%`}} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-600">Unassigned:</span> {health.unassignedTasks}</div>
                  <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-600">Overdue:</span> {health.overdueTasks?.length || 0}</div>
                  <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-600">Critical Pending:</span> {health.criticalPending}</div>
                  <div className="p-2 bg-slate-50 rounded-lg"><span className="font-bold text-slate-600">Risk Score:</span> {health.riskScore}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">Risk Assessment</h3>
                <div className={`inline-flex px-4 py-2 rounded-xl border text-sm font-black mb-4 ${riskColors[health.riskLevel] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {riskLabels[health.riskLevel] || health.riskLevel}
                </div>
                <div className="space-y-2">
                  {health.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-blue-500 mt-0.5 flex-shrink-0">→</span>
                      <span className="text-slate-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overdue Tasks */}
            {health.overdueTasks && health.overdueTasks.length > 0 && (
              <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-red-700 text-base mb-4">⚠ Overdue Tasks ({health.overdueTasks.length})</h3>
                <div className="space-y-2">
                  {health.overdueTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                        <p className="text-xs text-red-600">Due: {new Date(t.dueDate).toLocaleDateString()} · Assigned: {t.assignedTo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Stats */}
            {health.memberStats && health.memberStats.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">Team Workload Distribution</h3>
                <div className="space-y-3">
                  {health.memberStats.map((m, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full ${getAvatarBg((m.name||'?').substring(0,2))} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {(m.name||'?').substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">{m.name}</span>
                          <span className="text-xs text-slate-500">{m.completed}/{m.total} tasks</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{width: `${m.total > 0 ? Math.round((m.completed/m.total)*100) : 0}%`}} />
                        </div>
                      </div>
                      {m.blocked > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg">{m.blocked} blocked</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── GITHUB INTELLIGENCE PAGE ────────────────────────────────
const GitHubIntelligencePage = ({ user }) => {
  const [username, setUsername] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    const cleanUser = extractGitHubUsername(username);
    if (!cleanUser) { setError('Please enter a valid GitHub username or URL.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await apiFetch('/tasks/github-intelligence', {
        method: 'POST',
        body: JSON.stringify({ username: cleanUser, userGoals: goals })
      });
      setResult(data);
    } catch (err) {
      setError(err.message.includes('not found') ? `GitHub profile "${cleanUser}" not found. Check the username and try again.` : err.message);
    } finally { setLoading(false); }
  };

  const langColors = ['bg-blue-500','bg-indigo-500','bg-violet-500','bg-cyan-500','bg-teal-500','bg-emerald-500','bg-amber-500','bg-orange-500'];

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-full mr-2">FEATURE D</span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">GitHub Portfolio Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">Analyze any public GitHub profile to discover language expertise, inferred domains, suggested roles, and a personalized learning roadmap — based on public repository metadata only.</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleAnalyze} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-xs">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GitHub Username or Profile URL *</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required
                placeholder="e.g. torvalds or https://github.com/torvalds"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Learning Goals (for roadmap)</label>
              <input value={goals} onChange={e => setGoals(e.target.value)}
                placeholder="e.g. AI/ML, Web Development, Mobile..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 mb-3">{error}</div>}
          <div className="flex items-center gap-4">
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-slate-900 text-white font-extrabold text-sm rounded-xl hover:bg-slate-800 flex items-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Analyzing...</> : '🐙 Analyze Portfolio'}
            </button>
            <p className="text-xs text-slate-400">Analysis is based on public repository metadata only. Source code is not inspected.</p>
          </div>
        </form>

        {result && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center gap-5">
              <img src={result.profile.avatarUrl} alt={result.profile.username}
                className="w-20 h-20 rounded-2xl border border-slate-200 object-cover" />
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-slate-900">{result.profile.name}</h2>
                <a href={result.profile.htmlUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 text-sm font-semibold hover:underline">@{result.profile.username}</a>
                {result.profile.bio && <p className="text-xs text-slate-500 mt-1">{result.profile.bio}</p>}
                <div className="flex gap-4 mt-2 text-xs font-bold text-slate-600">
                  <span>📦 {result.profile.publicRepos} repos</span>
                  <span>👥 {result.profile.followersCount} followers</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Data fetched: {new Date(result.fetchedAt).toLocaleDateString()}</p>
                <p className="text-xs text-amber-600 mt-1">⚠ Public data only</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Languages */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">Language Distribution</h3>
                <div className="space-y-3">
                  {result.topLanguages.map((l, i) => (
                    <div key={l.lang}>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>{l.lang}</span>
                        <span>{l.count} repos ({l.percent}%)</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${langColors[i % langColors.length]} rounded-full`} style={{width: `${l.percent}%`}} />
                      </div>
                    </div>
                  ))}
                  {result.topLanguages.length === 0 && <p className="text-xs text-slate-400">No language data found in public repositories.</p>}
                </div>
              </div>

              {/* Suggested Roles */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">Suggested Project Roles</h3>
                <p className="text-xs text-slate-500 mb-3">Based on languages found in public repositories. Not a definitive assessment of ability.</p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedRoles.map(role => (
                    <span key={role} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold">{role}</span>
                  ))}
                  {result.suggestedRoles.length === 0 && <p className="text-xs text-slate-400">No role suggestions available with current data.</p>}
                </div>

                <h4 className="font-extrabold text-slate-800 text-sm mt-5 mb-3">Inferred Domains</h4>
                <div className="space-y-1">
                  {result.inferredDomains.slice(0,4).map(d => (
                    <div key={d.language} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{d.language}</span>
                      <span className="text-slate-400">{d.domain} · {d.repoCount} repos</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Learning Roadmap */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Personalized Learning Roadmap</h3>
              <p className="text-xs text-slate-500 mb-5">Based on your declared goals: "{goals || 'General improvement'}". Generated from portfolio evidence — not a prediction of future performance.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {result.learningRoadmap.map((step, i) => (
                  <div key={i} className="flex gap-3 p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">{step.step}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{step.topic}</p>
                      <p className="text-xs text-blue-600 mt-0.5">📚 {step.resource}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Repos */}
            {result.recentActivity && result.recentActivity.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">Recent Repository Activity</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.recentActivity.map(repo => (
                    <a key={repo.id} href={repo.htmlUrl} target="_blank" rel="noopener noreferrer"
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors block">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{repo.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{repo.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-semibold">
                        <span>⭐ {repo.stars}</span>
                        <span>🍴 {repo.forks}</span>
                        {repo.language && <span className="text-blue-600">{repo.language}</span>}
                        <span>{formatDateRelative(repo.updatedAt)}</span>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4 italic">{result.dataNote}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── TEAM CONTRIBUTION PAGE ───────────────────────────────────
const TeamContributionPage = ({ user, groups = [] }) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const myGroups = groups.filter(g => g.leader?._id === user?._id || g.leader?.toString() === user?._id
    || (g.members || []).some(m => (m._id || m.id || m)?.toString() === user?._id));

  const fetchContribution = async (groupId) => {
    if (!groupId) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await apiFetch(`/tasks/contribution/${groupId}`);
      setData(res);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const catColors = { Frontend: 'bg-blue-100 text-blue-700', Backend: 'bg-indigo-100 text-indigo-700', 'AI/ML': 'bg-violet-100 text-violet-700', Database: 'bg-cyan-100 text-cyan-700', Testing: 'bg-emerald-100 text-emerald-700', DevOps: 'bg-amber-100 text-amber-700', Design: 'bg-pink-100 text-pink-700', Documentation: 'bg-slate-100 text-slate-600', Deployment: 'bg-orange-100 text-orange-700', Other: 'bg-gray-100 text-gray-600' };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full mr-2">FEATURE E</span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">Team Contribution Insights</h1>
          <p className="text-slate-500 text-sm mt-1">Track assigned tasks, completion rates, and workload distribution across your team — based on real MongoDB task data.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-800">
          <strong>⚠ Fairness Note:</strong> Task statistics reflect assigned and completed tasks recorded in the system. They are <strong>not</strong> a complete measure of a student's ability, creativity, or total effort. Coordinators should consider qualitative contributions when evaluating team members.
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Project Group</label>
            <select value={selectedGroupId} onChange={e => { setSelectedGroupId(e.target.value); fetchContribution(e.target.value); }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">-- Choose a group --</option>
              {myGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
          <button onClick={() => fetchContribution(selectedGroupId)} disabled={!selectedGroupId || loading}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Load Stats'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">{error}</div>}

        {!data && !loading && !error && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Select a Group to View Contributions</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Choose a project group to see per-member task statistics and workload analysis.</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: data.totalTasks },
                { label: 'Team Members', value: data.memberCount },
                { label: 'Unassigned', value: data.unassignedTasks, warn: data.unassignedTasks > 0 },
                { label: 'Avg Tasks/Member', value: data.avgTasksPerMember },
              ].map(s => (
                <div key={s.label} className={`bg-white border rounded-2xl p-4 shadow-xs text-center ${s.warn ? 'border-amber-200' : 'border-slate-200'}`}>
                  <div className={`text-2xl font-black ${s.warn ? 'text-amber-600' : 'text-slate-900'}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {data.workloadImbalanced && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-xl">⚖️</span>
                <div>
                  <p className="text-sm font-bold text-amber-900">Workload Imbalance Detected</p>
                  <p className="text-xs text-amber-700 mt-0.5">Some team members have significantly more or fewer tasks than average. The group leader should review task assignments.</p>
                </div>
              </div>
            )}

            {/* Member Cards */}
            <div className="grid md:grid-cols-2 gap-5">
              {data.memberStats.map((m, i) => (
                <div key={m._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-full ${getAvatarBg((m.name||'?').substring(0,2))} flex items-center justify-center text-white text-sm font-bold`}>
                      {(m.name||'?').substring(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">{m.name}</h3>
                        {m.isLeader && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded">LEADER</span>}
                      </div>
                      <p className="text-xs text-slate-400">{m.branch || ''}{m.semester ? ` · ${m.semester}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900">{m.completionRate}%</div>
                      <div className="text-[10px] text-slate-400">completion</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
                    {[['Total', m.total, 'text-slate-700'], ['Done', m.completed, 'text-emerald-600'], ['Active', m.inProgress, 'text-blue-600'], ['Blocked', m.blocked, m.blocked > 0 ? 'text-red-600' : 'text-slate-400']].map(([l,v,c]) => (
                      <div key={l} className="p-1.5 bg-slate-50 rounded-lg">
                        <div className={`text-base font-black ${c}`}>{v}</div>
                        <div className="text-[9px] text-slate-400">{l}</div>
                      </div>
                    ))}
                  </div>

                  {m.overdue > 0 && (
                    <div className="mb-2 px-2.5 py-1 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-bold">
                      ⚠ {m.overdue} overdue task{m.overdue !== 1 ? 's' : ''}
                    </div>
                  )}

                  {m.categories && m.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.categories.map(c => (
                        <span key={c.category} className={`px-2 py-0.5 rounded text-[10px] font-bold ${catColors[c.category] || 'bg-slate-100 text-slate-600'}`}>
                          {c.category}: {c.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 italic text-center">{data.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── COORDINATOR SHOWCASE PAGE ────────────────────────────────
const CoordinatorShowcasePage = ({ user, groups = [] }) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [health, setHealth] = useState(null);
  const [teamDna, setTeamDna] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const myGroups = groups.filter(g => g.leader?._id === user?._id || g.leader?.toString() === user?._id);

  const loadShowcase = async (groupId) => {
    if (!groupId) return;
    setLoading(true); setError(''); setHealth(null); setTeamDna(null); setTasks([]);
    try {
      const [healthData, dnaData, taskData] = await Promise.allSettled([
        apiFetch(`/tasks/health/${groupId}`),
        apiFetch(`/tasks/team-dna/${groupId}`, { method: 'POST' }),
        apiFetch(`/tasks/group/${groupId}`)
      ]);
      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      if (dnaData.status === 'fulfilled') setTeamDna(dnaData.value);
      if (taskData.status === 'fulfilled') setTasks(taskData.value || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const selectedGroup = groups.find(g => g._id === selectedGroupId);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const handlePrint = () => window.print();

  const dnaColors = { Frontend: 'bg-blue-500', Backend: 'bg-indigo-500', 'AI/ML': 'bg-violet-500', Database: 'bg-cyan-500', DevOps: 'bg-amber-500', Design: 'bg-pink-500', Testing: 'bg-emerald-500' };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16 print:pt-4 print:bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full mr-2">FEATURE G</span>
            <h1 className="text-3xl font-black text-slate-900 mt-2">Coordinator Showcase</h1>
            <p className="text-slate-500 text-sm mt-1">Professional project overview for final-year demo and coordinator evaluation.</p>
          </div>
          {selectedGroup && (
            <button onClick={handlePrint}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 flex items-center gap-2">
              🖨️ Print / Save PDF
            </button>
          )}
        </div>

        {/* Group Selector (hidden on print) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs print:hidden flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Your Project (Leader only)</label>
            <select value={selectedGroupId} onChange={e => { setSelectedGroupId(e.target.value); loadShowcase(e.target.value); }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none">
              <option value="">-- Select a project you lead --</option>
              {myGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
            {myGroups.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠ You must be a group leader to create a showcase.</p>}
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">{error}</div>}
        {loading && <div className="text-center py-16 text-slate-400"><div className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"/><p className="text-sm">Loading showcase data...</p></div>}

        {!selectedGroup && !loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Coordinator Demonstration View</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Select a project you lead above. The showcase pulls live data from your group's tasks, members, and health metrics.</p>
          </div>
        )}

        {selectedGroup && !loading && (
          <div className="space-y-6 print:space-y-4">
            {/* Title Banner */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">{selectedGroup.domain}</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">{selectedGroup.branch}</span>
                  </div>
                  <h1 className="text-3xl font-black mb-2">{selectedGroup.name}</h1>
                  <p className="text-blue-100 text-sm max-w-xl">{selectedGroup.description}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-4xl font-black">{progressPercent}%</div>
                  <div className="text-blue-200 text-xs">completion</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                <div><div className="text-2xl font-black">{(selectedGroup.members || []).length}</div><div className="text-blue-200 text-xs">Team Members</div></div>
                <div><div className="text-2xl font-black">{tasks.length}</div><div className="text-blue-200 text-xs">Total Tasks</div></div>
                <div><div className="text-2xl font-black">{completedTasks}</div><div className="text-blue-200 text-xs">Completed</div></div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Team Members */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="font-extrabold text-slate-900 text-base mb-4">Team Members & Roles</h2>
                <div className="space-y-3">
                  {[selectedGroup.leader, ...(selectedGroup.members || []).filter(m => {
                    const lid = selectedGroup.leader?._id || selectedGroup.leader;
                    return (m._id || m).toString() !== (lid || '').toString();
                  })].filter(Boolean).map((m, i) => {
                    const isLeader = i === 0;
                    const memberObj = typeof m === 'object' ? m : { _id: m, name: 'Member' };
                    return (
                      <div key={memberObj._id || i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className={`w-9 h-9 rounded-full ${getAvatarBg((memberObj.name||'?').substring(0,2))} flex items-center justify-center text-white text-xs font-bold`}>
                          {(memberObj.name||'?').substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{memberObj.name}</span>
                            {isLeader && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded">LEADER</span>}
                          </div>
                          <p className="text-xs text-slate-400">{memberObj.branch || memberObj.semester || ''}</p>
                        </div>
                        {memberObj.github && (
                          <a href={memberObj.github} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline">GitHub</a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Required Skills & Tech Stack */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="font-extrabold text-slate-900 text-base mb-4">Technology Stack</h2>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(selectedGroup.requiredSkills || []).map(sk => (
                    <span key={sk} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold">{sk}</span>
                  ))}
                </div>

                <h3 className="font-bold text-slate-700 text-sm mb-2">Project Details</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Semester</span>
                    <span className="font-semibold text-slate-900">{selectedGroup.semester}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Max Team Size</span>
                    <span className="font-semibold text-slate-900">{selectedGroup.maxMembers}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Visibility</span>
                    <span className="font-semibold text-slate-900">{selectedGroup.visibility}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team DNA Coverage */}
            {teamDna && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-extrabold text-slate-900 text-base">Team DNA — Skill Coverage</h2>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-black">DNA Score: {teamDna.dnaScore}%</span>
                </div>
                <div className="space-y-3 max-w-2xl">
                  {(teamDna.coverage || []).map(cov => (
                    <div key={cov.category}>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>{cov.category}</span>
                        <span>{cov.coveragePercent}%{cov.membersWithSkill.length > 0 ? ` · ${cov.membersWithSkill.join(', ')}` : ''}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${dnaColors[cov.category] || 'bg-blue-500'} rounded-full transition-all`}
                          style={{width: `${cov.coveragePercent}%`}} />
                      </div>
                    </div>
                  ))}
                </div>
                {teamDna.missingCategories && teamDna.missingCategories.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800"><strong>Missing expertise:</strong> {teamDna.missingCategories.join(', ')} — consider recruiting specialists in these areas.</p>
                  </div>
                )}
              </div>
            )}

            {/* Project Health */}
            {health && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="font-extrabold text-slate-900 text-base mb-4">Project Health Indicators</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[{l:'Progress', v:`${health.progressPercent}%`},{l:'Risk Level', v:health.riskLevel?.toUpperCase()},{l:'Blocked Tasks', v:health.blocked},{l:'Overdue', v:health.overdueTasks?.length || 0}].map(s=>(
                    <div key={s.l} className="text-center p-3 bg-slate-50 rounded-xl">
                      <div className="text-xl font-black text-slate-900">{s.v}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {health.recommendations.map((rec, i) => (
                    <div key={i} className="text-xs text-slate-600 flex gap-1">
                      <span className="text-blue-500">→</span>{rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Milestones */}
            {tasks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h2 className="font-extrabold text-slate-900 text-base mb-4">Task Milestones ({completedTasks}/{tasks.length} completed)</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto print:max-h-none">
                  {tasks.slice(0, 20).map(t => (
                    <div key={t._id} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-50 last:border-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${t.status === 'completed' ? 'bg-emerald-500' : t.status === 'in-progress' ? 'bg-blue-500' : t.status === 'blocked' ? 'bg-red-500' : 'bg-slate-300'}`}>
                        {t.status === 'completed' ? '✓' : t.status === 'blocked' ? '!' : '·'}
                      </span>
                      <span className={`flex-1 ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>{t.title}</span>
                      <span className="text-slate-400">{t.category}</span>
                      {t.assignedTo && <span className="text-blue-600">{t.assignedTo.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 py-4 print:block">
              Generated by SkillSync AI · {selectedGroup.branch} · {new Date().toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AI ASSISTANT ─────────────────────────────────────────────
const AIAssistant = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from:"ai", text:"Hi! I'm SkillSync AI 👋 Tell me your project idea and required skills, and I'll suggest the perfect team composition!" }
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const txt = input.trim();
    setInput("");
    setMessages(m => [...m, { from:"user", text:txt }]);
    setTimeout(() => {
      setMessages(m => [...m, { from:"ai", text:`Great idea for '${txt}'! I recommend creating a project requiring: 1) ML/Python Developer 2) React Frontend Engineer 3) UI/UX Designer. Click '+ New Project' to build your team with AI!` }]);
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[8000]">
      {open ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col h-96 fade-up">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <span className="font-extrabold text-sm flex items-center gap-2">🤖 SkillSync AI Team Assistant</span>
            <button onClick={() => setOpen(false)} className="text-lg">×</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
            {messages.map((m,i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${m.from === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-700 shadow-xs"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask AI Assistant..." className="flex-1 px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"/>
            <button onClick={send} className="px-3.5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">Send</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="w-13 h-13 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105">
          🤖
        </button>
      )}
    </div>
  );
};

// ─── MAIN APPLICATION COMPONENT ──────────────────────────────
const App = () => {
  const [user, setUser] = useState(() => safeGetStorage("skillsync_user"));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [page, setPage] = useState("landing");
  const [authModal, setAuthModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);

  // Group / Project State & Invitations
  const [groups, setGroups] = useState(() => safeGetStorage("skillsync_groups") || INITIAL_GROUPS);
  const [users, setUsers] = useState(() => safeGetStorage("skillsync_students") || INITIAL_STUDENTS);
  const [invitations, setInvitations] = useState(() => safeGetStorage("skillsync_invitations") || []);
  const [joinRequests, setJoinRequests] = useState(() => safeGetStorage("skillsync_join_requests") || []);

  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [matchModalGroup, setMatchModalGroup] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Supporting GitHub State
  const [githubProfile, setGithubProfile] = useState(() => safeGetStorage("skillsync_github_profile"));
  const [githubRepos, setGithubRepos] = useState(() => safeGetStorage("skillsync_github_repositories") || []);

  const API_BASE = window.SKILLSYNC_API_URL || "http://localhost:5000/api";

  // Session Restore
  useEffect(() => {
    const storedUser = safeGetStorage("skillsync_user");

    if (storedUser) {
      setUser(storedUser);
      if (!storedUser.onboardingCompleted) {
        setShowOnboarding(true);
      } else {
        setPage("dashboard");
      }
    }
    setRestoringSession(false);
  }, []);

  // Unauthenticated Route Guard
  useEffect(() => {
    if (!user && page !== "landing") {
      setPage("landing");
    }
  }, [user, page]);

  // Sync real data from MongoDB when user is authenticated
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("skillsync_token");
    if (!token) return; // no token = demo mode, keep local state

    const syncData = async () => {
      try {
        // Fetch real groups from MongoDB
        const myGroupsData = await apiFetch('/groups/my').catch(() => null);
        if (myGroupsData && Array.isArray(myGroupsData) && myGroupsData.length > 0) {
          // Merge: map server groups to the format the frontend expects
          const serverGroups = myGroupsData.map(g => ({
            ...g,
            id: g._id,
            name: g.name,
            description: g.description,
            projectType: g.domain || g.projectType || 'College Project',
            requiredSkills: g.requiredSkills || [],
            maxMembers: g.maxMembers || 5,
            creator: g.leader ? { id: g.leader._id, name: g.leader.name, college: g.leader.college } : {},
            members: (g.members || []).map(m => typeof m === 'object' ? { id: m._id, name: m.name, college: m.college } : { id: m }),
            createdAt: g.createdAt
          }));
          setGroups(prev => {
            // Keep local groups not in server, add server groups
            const localOnly = prev.filter(lg => !lg._id && !serverGroups.find(sg => sg.id === lg.id));
            return [...serverGroups, ...localOnly];
          });
        }

        // Fetch candidate users for matching
        const candidatesData = await apiFetch('/users/candidates?limit=30').catch(() => null);
        if (candidatesData && Array.isArray(candidatesData) && candidatesData.length > 0) {
          const serverUsers = candidatesData.map(u => ({
            ...u,
            id: u._id,
            name: u.name,
            email: u.email,
            college: u.college,
            year: u.semester,
            branch: u.branch,
            skills: (u.skills || []).map(s => typeof s === 'object' ? s.name : s),
            githubUsername: u.github,
            matchScore: u.matchScore
          }));
          setUsers(prev => {
            const localOnly = prev.filter(lu => !lu._id && !serverUsers.find(su => su.id === lu.id));
            return [...serverUsers, ...localOnly];
          });
        }
      } catch (err) {
        // Silently fall back to local state if backend is unavailable
        console.warn('[SkillSync] API sync failed (demo mode active):', err.message);
      }
    };

    syncData();
  }, [user]);

  const handleAuthSuccess = (authUser) => {
    setAuthModal(null);
    setUser(authUser);
    if (authUser.isNewUser || !authUser.onboardingCompleted) {
      setShowOnboarding(true);
    } else {
      setPage("dashboard");
      setToast("Welcome back! 👋");
    }
  };

  const handleOnboardingComplete = (profileData) => {
    const updatedUser = {
      ...user,
      ...profileData,
      displayName: profileData.displayName || user?.displayName || user?.name || "Student",
      onboardingCompleted: true,
      isNewUser: false
    };

    safeSetStorage("skillsync_user", updatedUser);
    setUser(updatedUser);
    setShowOnboarding(false);
    setPage("dashboard");
    setToast("Skill Profile created! Welcome to SkillSync AI 🎉");
  };

  const handleCreateProject = (newProjectData) => {
    const newGrp = {
      id: "grp_" + Date.now(),
      name: newProjectData.name,
      description: newProjectData.description,
      projectType: newProjectData.projectType || "College Project",
      duration: newProjectData.duration || "1 Month",
      requiredSkills: newProjectData.requiredSkills || ["Python", "React"],
      maxMembers: newProjectData.maxMembers || 5,
      creator: { id: user?.id || "usr_me", name: user?.displayName || user?.name || "Me", college: user?.college || "University" },
      members: [{ id: user?.id || "usr_me", name: user?.displayName || user?.name || "Me", role: "Project Lead" }],
      createdAt: new Date().toISOString()
    };

    const updatedGroups = [newGrp, ...groups];
    setGroups(updatedGroups);
    safeSetStorage("skillsync_groups", updatedGroups);
    setCreateGroupModalOpen(false);
    setPage("my-groups");
    setToast(`Project "${newGrp.name}" created! AI team recommendations generated 🎉`);
  };

  const handleInviteUser = (candidateUser, targetGroup) => {
    const grp = targetGroup || groups[0];
    if (!grp) return;

    const newInvite = {
      id: "inv_" + Date.now(),
      group: grp,
      sender: { id: user?.id, name: user?.displayName || "Me", college: user?.college },
      receiver: candidateUser,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    const updated = [newInvite, ...invitations];
    setInvitations(updated);
    safeSetStorage("skillsync_invitations", updated);
    setToast(`Invitation sent to ${candidateUser.name} for "${grp.name}"!`);
  };

  const handleSendRequestToCandidate = ({ candidate, project, role, message }) => {
    const newInvite = {
      id: "inv_" + Date.now(),
      group: project || groups[0],
      sender: { id: user?.id, name: user?.displayName || "Me", college: user?.college },
      receiver: candidate,
      role: role,
      message: message,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    const updated = [newInvite, ...invitations];
    setInvitations(updated);
    safeSetStorage("skillsync_invitations", updated);
    setToast(`Team request sent successfully to ${candidate?.name}!`);
  };

  const handleAcceptInvite = (invite) => {
    const updatedInvites = invitations.map(i => i.id === invite.id ? { ...i, status: 'accepted' } : i);
    setInvitations(updatedInvites);
    safeSetStorage("skillsync_invitations", updatedInvites);

    // Add user to group members
    const updatedGroups = groups.map(g => {
      if (g.id === invite.group?.id) {
        const currentMembers = g.members || [];
        if (!currentMembers.some(m => m.name === user?.displayName)) {
          return { ...g, members: [...currentMembers, { id: user?.id || "me", name: user?.displayName || "Me", role: invite.role || "Collaborator" }] };
        }
      }
      return g;
    });

    setGroups(updatedGroups);
    safeSetStorage("skillsync_groups", updatedGroups);
    setToast(`Joined "${invite.group?.name}"!`);
  };

  const handleDeclineInvite = (inviteId) => {
    const updatedInvites = invitations.map(i => i.id === inviteId ? { ...i, status: 'declined' } : i);
    setInvitations(updatedInvites);
    safeSetStorage("skillsync_invitations", updatedInvites);
    setToast("Invitation declined.");
  };

  const handleJoinGroupRequest = (grp) => {
    const isMember = (grp.members || []).some(m => m.name === user?.displayName);
    if (isMember) {
      setToast("You are already a member of this project.");
      return;
    }

    const newReq = {
      id: "req_" + Date.now(),
      group: grp,
      user: { id: user?.id || "me", name: user?.displayName || "Student" },
      status: "pending",
      message: "Interested in contributing to this project team.",
      createdAt: new Date().toISOString()
    };

    const updated = [newReq, ...joinRequests];
    setJoinRequests(updated);
    safeSetStorage("skillsync_join_requests", updated);
    setToast(`Requested to join "${grp.name}"!`);
  };

  const handleSignOut = () => {
    localStorage.removeItem("skillsync_token");
    localStorage.removeItem("skillsync_user");
    setUser(null);
    setShowOnboarding(false);
    setPage("landing");
    setToast("Signed out successfully");
  };

  if (restoringSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white font-extrabold shadow-sm">S</div>
          <div className="w-5 h-5 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mt-4" />
          <p className="text-sm text-slate-500 mt-3">Loading SkillSync AI Workspace...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding && user) {
    return (
      <>
        <Navbar page={page} setPage={setPage} user={user} onSignOut={handleSignOut} onSignIn={setAuthModal} />
        <Onboarding user={user} onComplete={handleOnboardingComplete} />
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "landing":
        return <LandingPage onSignIn={setAuthModal} />;
      case "dashboard":
        return (
          <Dashboard
            user={user}
            setPage={setPage}
            groups={groups}
            users={users}
            invitations={invitations}
            onOpenCreateGroupModal={() => setCreateGroupModalOpen(true)}
            onInviteUser={(cand) => handleInviteUser(cand)}
            onAcceptInvite={handleAcceptInvite}
            onDeclineInvite={handleDeclineInvite}
            setMatchModalGroup={setMatchModalGroup}
            setSelectedCandidate={setSelectedCandidate}
          />
        );
      case "discover":
        return (
          <DiscoverPage
            groups={groups}
            users={users}
            user={user}
            onOpenCreateGroupModal={() => setCreateGroupModalOpen(true)}
            onJoinGroup={handleJoinGroupRequest}
            setMatchModalGroup={setMatchModalGroup}
          />
        );
      case "my-groups":
        return (
          <MyProjectsPage
            groups={groups}
            invitations={invitations}
            joinRequests={joinRequests}
            users={users}
            user={user}
            onOpenCreateGroupModal={() => setCreateGroupModalOpen(true)}
            onAcceptInvite={handleAcceptInvite}
            onDeclineInvite={handleDeclineInvite}
            onApproveRequest={(req) => {
              const updatedReqs = joinRequests.filter(r => r.id !== req.id);
              setJoinRequests(updatedReqs);
              safeSetStorage("skillsync_join_requests", updatedReqs);
              setToast("Approved member!");
            }}
            onRejectRequest={(reqId) => {
              const updatedReqs = joinRequests.filter(r => r.id !== reqId);
              setJoinRequests(updatedReqs);
              safeSetStorage("skillsync_join_requests", updatedReqs);
              setToast("Request rejected.");
            }}
            onSendRequestToCandidate={handleSendRequestToCandidate}
            setSelectedCandidate={setSelectedCandidate}
          />
        );
      case "teams":
        return (
          <TeamsPage
            groups={groups}
            onOpenCreateGroupModal={() => setCreateGroupModalOpen(true)}
            onJoinGroup={handleJoinGroupRequest}
          />
        );
      case "chat":
        return <ChatPage users={users} />;
      case "swap":
        return <SwapPage />;
      case "profile":
        return (
          <ProfilePage
            user={user}
            setUser={setUser}
            githubProfile={githubProfile}
            setGithubProfile={setGithubProfile}
            githubRepos={githubRepos}
            setGithubRepos={setGithubRepos}
          />
        );
      case "sprint-planner":
        return <SprintPlannerPage user={user} groups={groups} />;
      case "health":
        return <ProjectHealthPage user={user} groups={groups} />;
      case "github-intel":
        return <GitHubIntelligencePage user={user} />;
      case "contribution":
        return <TeamContributionPage user={user} groups={groups} />;
      case "showcase":
        return <CoordinatorShowcasePage user={user} groups={groups} />;
      default:
        return <LandingPage onSignIn={setAuthModal} />;
    }
  };

  return (
    <>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <Navbar
        page={page}
        setPage={setPage}
        user={user}
        onSignOut={handleSignOut}
        onSignIn={setAuthModal}
        pendingCount={invitations.filter(i => i.status === 'pending').length}
      />

      {renderPage()}

      {/* New Project Wizard Modal */}
      {createGroupModalOpen && (
        <NewProjectWizardModal
          onClose={() => setCreateGroupModalOpen(false)}
          onCreateProject={handleCreateProject}
        />
      )}

      {/* Candidate Profile Details View */}
      {selectedCandidate && (
        <UserProfileModal
          candidateUser={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onInviteUser={(cand) => handleInviteUser(cand)}
          groupRequiredSkills={user?.skills || []}
        />
      )}

      {/* Skill Matching Candidate Popup */}
      {matchModalGroup && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setMatchModalGroup(null); }}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 fade-up max-h-[88vh] overflow-y-auto">
            <button onClick={() => setMatchModalGroup(null)} className="absolute top-4 right-4 text-slate-400 font-bold text-sm">✕</button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">⚡</span>
              <h3 className="font-extrabold text-slate-900 text-lg">Skill Matches for "{matchModalGroup.name}"</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Required Skills: {matchModalGroup.requiredSkills?.join(", ")}</p>

            <div className="space-y-3">
              {users.map(cand => {
                const match = calculateSkillMatch(matchModalGroup.requiredSkills, cand);
                return (
                  <div key={cand.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm">{cand.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700">{match.matchPercent}% Match</span>
                      </div>
                      <p className="text-xs text-blue-600 font-medium">💡 {match.matchReason}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Skills: {cand.skills?.join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCandidate(cand)}
                        className="px-2.5 py-1.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-white"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          handleInviteUser(cand, matchModalGroup);
                          setMatchModalGroup(null);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700"
                      >
                        + Invite
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {user && <AIAssistant user={user} />}
      {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={handleAuthSuccess} />}
    </>
  );
};

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
