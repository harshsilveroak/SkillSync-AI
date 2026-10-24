// ============================================================
// SkillSync AI — Sprint & Task API Routes
// POST /api/tasks/generate-sprint  — AI-generated sprint plan
// GET  /api/tasks/group/:groupId   — all tasks for a group
// POST /api/tasks                  — create single task
// PUT  /api/tasks/:id              — update task (status, assignee, etc.)
// DELETE /api/tasks/:id            — delete task
// GET  /api/tasks/health/:groupId  — project health summary
// POST /api/tasks/team-dna/:groupId — team DNA / skill coverage
// ============================================================
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task  = require('../models/Task');
const Group = require('../models/Group');
const User  = require('../models/User');

// ─── HELPER: verify group membership or leadership ───────────
async function requireGroupAccess(groupId, userId, res) {
  const group = await Group.findById(groupId);
  if (!group) { res.status(404).json({ message: 'Group not found' }); return null; }
  const isMember = group.members.map(m => m.toString()).includes(userId.toString());
  const isLeader = group.leader.toString() === userId.toString();
  if (!isMember && !isLeader) {
    res.status(403).json({ message: 'Access denied: not a group member' }); return null;
  }
  return group;
}

// ─── DETERMINISTIC SPRINT GENERATOR (AI fallback) ────────────
function generateDeterministicSprint(form) {
  const { projectName, description, teamMembers, targetWeeks, techStack } = form;
  const phases = [];
  const totalWeeks = Math.max(4, Math.min(24, parseInt(targetWeeks) || 8));
  const halfWay = Math.ceil(totalWeeks / 2);

  const techLower = (techStack || '').toLowerCase();
  const descLower = (description || projectName || '').toLowerCase();

  const hasML  = techLower.includes('ml') || techLower.includes('python') || descLower.includes('ai') || descLower.includes('machine learning');
  const hasMobile = techLower.includes('flutter') || techLower.includes('android') || techLower.includes('ios');
  const hasCloud = techLower.includes('aws') || techLower.includes('docker') || techLower.includes('deploy');

  // Phase 1 — Setup & Design (Weeks 1–2)
  const setupTasks = [
    { title:'Project repository setup & branch strategy', category:'DevOps', priority:'Critical', weekNumber:1, phase:'Phase 1: Setup' },
    { title:'Requirements document & feature specification', category:'Documentation', priority:'High', weekNumber:1, phase:'Phase 1: Setup' },
    { title:'Database schema design', category:'Database', priority:'High', weekNumber:1, phase:'Phase 1: Setup' },
    { title:'UI wireframes & design system', category:'Design', priority:'High', weekNumber:2, phase:'Phase 1: Setup' },
    { title:'Development environment & CI/CD pipeline', category:'DevOps', priority:'Medium', weekNumber:2, phase:'Phase 1: Setup' },
  ];

  // Phase 2 — Core Development
  const coreTasks = [
    { title:'Authentication & user management module', category:'Backend', priority:'Critical', weekNumber:3, phase:'Phase 2: Core Development' },
    { title:'Database models & migration scripts', category:'Database', priority:'High', weekNumber:3, phase:'Phase 2: Core Development' },
    { title:'Core REST API endpoints', category:'Backend', priority:'Critical', weekNumber:3, phase:'Phase 2: Core Development' },
    { title:'Frontend routing & layout scaffolding', category:'Frontend', priority:'High', weekNumber:4, phase:'Phase 2: Core Development' },
    { title:'Primary feature UI screens', category:'Frontend', priority:'Critical', weekNumber:4, phase:'Phase 2: Core Development' },
  ];

  if (hasML) {
    coreTasks.push(
      { title:'ML model training pipeline setup', category:'AI/ML', priority:'Critical', weekNumber:4, phase:'Phase 2: Core Development' },
      { title:'Data preprocessing & feature engineering', category:'AI/ML', priority:'High', weekNumber:5, phase:'Phase 2: Core Development' },
    );
  }
  if (hasMobile) {
    coreTasks.push(
      { title:'Mobile app shell & navigation setup', category:'Frontend', priority:'Critical', weekNumber:4, phase:'Phase 2: Core Development' },
      { title:'Mobile API client integration', category:'Frontend', priority:'High', weekNumber:5, phase:'Phase 2: Core Development' },
    );
  }

  // Phase 3 — Integration & Testing
  const testTasks = [
    { title:'Unit tests for core business logic', category:'Testing', priority:'High', weekNumber: halfWay + 1, phase:'Phase 3: Integration & Testing' },
    { title:'API integration testing', category:'Testing', priority:'High', weekNumber: halfWay + 1, phase:'Phase 3: Integration & Testing' },
    { title:'Frontend–backend integration & end-to-end flow', category:'Frontend', priority:'Critical', weekNumber: halfWay + 1, phase:'Phase 3: Integration & Testing' },
    { title:'Bug fixing sprint & code review', category:'Testing', priority:'High', weekNumber: halfWay + 2, phase:'Phase 3: Integration & Testing' },
  ];

  // Phase 4 — Deployment & Documentation
  const deployTasks = [
    { title:'Deployment to staging environment', category:'Deployment', priority:'High', weekNumber: totalWeeks - 2, phase:'Phase 4: Deployment' },
    { title:'User acceptance testing (UAT)', category:'Testing', priority:'High', weekNumber: totalWeeks - 2, phase:'Phase 4: Deployment' },
    { title:'Final documentation & API reference', category:'Documentation', priority:'Medium', weekNumber: totalWeeks - 1, phase:'Phase 4: Deployment' },
    { title:'Production deployment & monitoring setup', category:'Deployment', priority:'Critical', weekNumber: totalWeeks - 1, phase:'Phase 4: Deployment' },
    { title:'Presentation preparation & demo script', category:'Documentation', priority:'High', weekNumber: totalWeeks, phase:'Phase 4: Deployment' },
  ];

  if (hasCloud) {
    deployTasks.push({ title:'Cloud infrastructure provisioning (AWS/GCP)', category:'DevOps', priority:'High', weekNumber: totalWeeks - 2, phase:'Phase 4: Deployment' });
  }

  const allTasks = [...setupTasks, ...coreTasks, ...testTasks, ...deployTasks];

  // Assign members based on skill matching (from form)
  const memberList = Array.isArray(teamMembers) ? teamMembers : [];
  allTasks.forEach((task, idx) => {
    const cat = task.category.toLowerCase();
    let assignee = memberList[idx % Math.max(1, memberList.length)] || null;
    if (memberList.length > 1) {
      const frontendMember = memberList.find(m => (m.skills||'').toLowerCase().includes('react') || (m.skills||'').toLowerCase().includes('frontend'));
      const backendMember  = memberList.find(m => (m.skills||'').toLowerCase().includes('node') || (m.skills||'').toLowerCase().includes('backend'));
      const mlMember       = memberList.find(m => (m.skills||'').toLowerCase().includes('python') || (m.skills||'').toLowerCase().includes('ml'));
      if ((cat === 'frontend' || cat === 'design') && frontendMember) assignee = frontendMember;
      else if ((cat === 'backend' || cat === 'database') && backendMember) assignee = backendMember;
      else if (cat === 'ai/ml' && mlMember) assignee = mlMember;
    }
    task.suggestedAssignee = assignee ? (assignee.name || assignee) : null;
  });

  const risks = [
    'Scope creep — define features clearly in Week 1',
    'Integration delays — plan API contracts before coding',
    'Testing bottleneck — start testing in Phase 2, not just Phase 3',
    teamMembers?.length < 2 ? 'Solo development risk — consider finding a team member' : null,
    hasML ? 'ML model accuracy may require multiple iterations — budget time' : null,
  ].filter(Boolean);

  return {
    projectName,
    totalWeeks,
    generatedBy: 'deterministic-fallback',
    tasks: allTasks,
    risks,
    summary: `Generated ${allTasks.length}-task plan for "${projectName}" across ${totalWeeks} weeks with ${phases.length + 4} phases.`
  };
}

// ─── POST /api/tasks/generate-sprint ─────────────────────────
router.post('/generate-sprint', protect, async (req, res) => {
  try {
    const { groupId, projectName, description, techStack, targetWeeks, teamMembers } = req.body;

    if (!groupId || !projectName) {
      return res.status(400).json({ message: 'groupId and projectName are required' });
    }

    const group = await requireGroupAccess(groupId, req.user.id, res);
    if (!group) return;

    // Try Puter / OpenAI via environment key (optional)
    const apiKey = process.env.OPENAI_API_KEY;
    let plan = null;
    let usedAI = false;

    if (apiKey && apiKey.trim() && !apiKey.includes('YOUR_OPENAI_API_KEY')) {
      try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.trim()}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert software project planner. Given a project description, generate a detailed sprint plan as valid JSON with this structure:
{
  "tasks": [
    {
      "title": "task title",
      "description": "acceptance criteria",
      "category": "Frontend|Backend|AI/ML|Database|Testing|DevOps|Design|Documentation|Deployment|Other",
      "priority": "Critical|High|Medium|Low",
      "weekNumber": 1,
      "phase": "Phase 1: Setup",
      "suggestedAssignee": null
    }
  ],
  "risks": ["risk 1", "risk 2"],
  "summary": "one sentence plan summary"
}
Generate 12-20 realistic tasks. Output ONLY valid JSON.`
              },
              {
                role: 'user',
                content: `Project: ${projectName}\nDescription: ${description || ''}\nTech Stack: ${techStack || ''}\nDuration: ${targetWeeks || 8} weeks\nTeam size: ${Array.isArray(teamMembers) ? teamMembers.length : 1}`
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6
          })
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const parsed = JSON.parse(aiData.choices[0]?.message?.content || '{}');
          if (parsed.tasks && Array.isArray(parsed.tasks)) {
            plan = { ...parsed, projectName, totalWeeks: parseInt(targetWeeks) || 8, generatedBy: 'gpt-4o-mini' };
            usedAI = true;
          }
        }
      } catch (aiErr) {
        console.warn('[Sprint AI Error]:', aiErr.message);
      }
    }

    if (!plan) {
      plan = generateDeterministicSprint({ projectName, description, techStack, targetWeeks, teamMembers });
    }

    // Persist tasks to MongoDB
    const populatedMembers = await User.find({ _id: { $in: group.members } }).select('name skills');

    const savedTasks = await Promise.all(
      plan.tasks.map(async (t) => {
        // Try to match suggestedAssignee name to real user
        let assignedUser = null;
        if (t.suggestedAssignee && typeof t.suggestedAssignee === 'string') {
          assignedUser = populatedMembers.find(m =>
            m.name.toLowerCase().includes(t.suggestedAssignee.toLowerCase())
          );
        }

        return Task.create({
          group: groupId,
          title: t.title,
          description: t.description || t.acceptanceCriteria || '',
          category: t.category || 'Other',
          priority: t.priority || 'Medium',
          phase: t.phase || 'Phase 1',
          weekNumber: t.weekNumber || 1,
          status: 'pending',
          assignedTo: assignedUser?._id || null,
          createdBy: req.user.id
        });
      })
    );

    res.json({
      success: true,
      usedAI,
      model: plan.generatedBy,
      tasks: savedTasks,
      risks: plan.risks,
      summary: plan.summary,
      totalWeeks: plan.totalWeeks
    });

  } catch (err) {
    console.error('[Generate Sprint Error]:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/tasks/group/:groupId ───────────────────────────
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const group = await requireGroupAccess(req.params.groupId, req.user.id, res);
    if (!group) return;

    const tasks = await Task.find({ group: req.params.groupId })
      .populate('assignedTo', 'name avatar email')
      .populate('createdBy', 'name')
      .sort({ weekNumber: 1, createdAt: 1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/tasks ─────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, title, description, category, priority, phase, weekNumber, assignedTo, dueDate, acceptanceCriteria } = req.body;
    if (!groupId || !title) return res.status(400).json({ message: 'groupId and title are required' });

    const group = await requireGroupAccess(groupId, req.user.id, res);
    if (!group) return;

    const task = await Task.create({
      group: groupId,
      title: title.trim(),
      description: description || '',
      category: category || 'Other',
      priority: priority || 'Medium',
      phase: phase || 'Phase 1',
      weekNumber: weekNumber || 1,
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      acceptanceCriteria: acceptanceCriteria || '',
      createdBy: req.user.id
    });

    await task.populate('assignedTo', 'name avatar email');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/tasks/:id ──────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('group');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Verify access
    const group = await requireGroupAccess(task.group._id, req.user.id, res);
    if (!group) return;

    const allowed = ['title','description','category','priority','status','assignedTo','dueDate','phase','weekNumber','acceptanceCriteria'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    if (req.body.status === 'completed' && !task.completedAt) task.completedAt = new Date();
    if (req.body.status !== 'completed') task.completedAt = null;

    await task.save();
    await task.populate('assignedTo', 'name avatar email');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/tasks/:id ───────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const group = await Group.findById(task.group);
    // Only leader or creator can delete
    if (group.leader.toString() !== req.user.id && task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the group leader or task creator can delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/tasks/health/:groupId ─────────────────────────
router.get('/health/:groupId', protect, async (req, res) => {
  try {
    const group = await requireGroupAccess(req.params.groupId, req.user.id, res);
    if (!group) return;

    const tasks = await Task.find({ group: req.params.groupId })
      .populate('assignedTo', 'name');

    if (tasks.length === 0) {
      return res.json({
        totalTasks: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
        pending: 0,
        progressPercent: 0,
        riskLevel: 'low',
        overdueTasks: [],
        unassignedTasks: 0,
        blockedTasks: 0,
        recommendations: ['No tasks found. Generate a sprint plan to get started.'],
        memberStats: []
      });
    }

    const now = new Date();
    const total    = tasks.length;
    const completed  = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const blocked    = tasks.filter(t => t.status === 'blocked').length;
    const pending    = tasks.filter(t => t.status === 'pending').length;
    const progress   = Math.round((completed / total) * 100);

    const overdueTasks = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
    ).map(t => ({ id: t._id, title: t.title, dueDate: t.dueDate, assignedTo: t.assignedTo?.name || 'Unassigned' }));

    const unassigned = tasks.filter(t => !t.assignedTo && t.status !== 'completed').length;
    const criticalPending = tasks.filter(t => t.priority === 'Critical' && t.status !== 'completed').length;

    // Risk score
    let riskScore = 0;
    if (progress < 30) riskScore += 2;
    if (blocked > 0) riskScore += blocked * 3;
    if (overdueTasks.length > 0) riskScore += overdueTasks.length * 4;
    if (unassigned > 3) riskScore += 2;
    if (criticalPending > 2) riskScore += 3;

    const riskLevel = riskScore >= 10 ? 'critical' : riskScore >= 5 ? 'high' : riskScore >= 2 ? 'medium' : 'low';

    // Recommendations
    const recommendations = [];
    if (blocked > 0) recommendations.push(`${blocked} task(s) are blocked — resolve blockers immediately.`);
    if (overdueTasks.length > 0) recommendations.push(`${overdueTasks.length} task(s) are overdue — reschedule or reassign.`);
    if (unassigned > 0) recommendations.push(`${unassigned} task(s) have no assignee — assign responsibilities.`);
    if (progress < 30 && criticalPending > 0) recommendations.push(`${criticalPending} critical task(s) are still pending — prioritize these first.`);
    if (recommendations.length === 0) recommendations.push('Project is on track. Keep up the momentum!');

    // Member contribution stats
    const memberMap = {};
    tasks.forEach(t => {
      if (t.assignedTo) {
        const key = t.assignedTo._id.toString();
        if (!memberMap[key]) memberMap[key] = { name: t.assignedTo.name, total:0, completed:0, blocked:0, inProgress:0 };
        memberMap[key].total++;
        if (t.status === 'completed') memberMap[key].completed++;
        if (t.status === 'blocked') memberMap[key].blocked++;
        if (t.status === 'in-progress') memberMap[key].inProgress++;
      }
    });

    res.json({
      totalTasks: total,
      completed,
      inProgress,
      blocked,
      pending,
      progressPercent: progress,
      riskLevel,
      riskScore,
      overdueTasks,
      unassignedTasks: unassigned,
      blockedTasks: blocked,
      criticalPending,
      recommendations,
      memberStats: Object.values(memberMap)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/tasks/team-dna/:groupId ──────────────────────
router.post('/team-dna/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name skills branch semester availabilityTime github preferredRoles')
      .populate('leader', 'name skills');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m._id.toString() === req.user.id);
    const isLeader = group.leader._id.toString() === req.user.id;
    if (!isMember && !isLeader) return res.status(403).json({ message: 'Access denied' });

    const allMembers = [...group.members];
    const requiredSkills = group.requiredSkills || [];

    // Build skill category coverage
    const skillMap = {
      Frontend:   { keywords: ['react','vue','angular','html','css','tailwind','javascript','typescript','next','svelte','frontend','ui','ux'], count:0, members:[] },
      Backend:    { keywords: ['node','express','django','flask','spring','java','go','rust','api','backend','server'], count:0, members:[] },
      'AI/ML':    { keywords: ['python','ml','machine learning','tensorflow','pytorch','nlp','cv','data','scikit','ai','deep learning','keras'], count:0, members:[] },
      Database:   { keywords: ['mongodb','mysql','postgresql','sql','firebase','redis','database','orm','prisma'], count:0, members:[] },
      DevOps:     { keywords: ['docker','kubernetes','aws','gcp','azure','ci/cd','linux','nginx','devops','cloud','deploy'], count:0, members:[] },
      Design:     { keywords: ['figma','ui','ux','design','adobe','sketch','prototype','wireframe','photoshop'], count:0, members:[] },
      Testing:    { keywords: ['testing','jest','cypress','pytest','qa','mocha','selenium','unit test'], count:0, members:[] },
    };

    allMembers.forEach(member => {
      const memberSkills = (member.skills || []).map(s => (typeof s === 'object' ? s.name : s).toLowerCase());
      Object.entries(skillMap).forEach(([cat, data]) => {
        const matches = memberSkills.filter(sk => data.keywords.some(kw => sk.includes(kw)));
        if (matches.length > 0) {
          data.count += matches.length;
          if (!data.members.includes(member.name)) data.members.push(member.name);
        }
      });
    });

    // Calculate coverage percent per category
    const coverage = Object.entries(skillMap).map(([cat, data]) => ({
      category: cat,
      coveragePercent: Math.min(100, Math.round((data.count / Math.max(1, allMembers.length)) * 100)),
      membersWithSkill: data.members,
      count: data.count
    }));

    // Missing skill categories
    const missing = coverage.filter(c => c.coveragePercent === 0).map(c => c.category);

    // Required skills coverage
    const memberSkillPool = allMembers.flatMap(m =>
      (m.skills || []).map(s => (typeof s === 'object' ? s.name : s).toLowerCase())
    );
    const requiredCoverage = requiredSkills.map(skill => ({
      skill,
      covered: memberSkillPool.some(ms => ms.includes(skill.toLowerCase())),
      coveredBy: allMembers.filter(m =>
        (m.skills || []).some(s => (typeof s === 'object' ? s.name : s).toLowerCase().includes(skill.toLowerCase()))
      ).map(m => m.name)
    }));

    const missingRequired = requiredCoverage.filter(r => !r.covered).map(r => r.skill);

    // Team DNA score
    const categoriesCovered = coverage.filter(c => c.coveragePercent > 0).length;
    const dnaScore = Math.round((categoriesCovered / 7) * 100);

    // Candidate matching from all platform users (if requiredSkills exist)
    let candidateMatches = [];
    if (missingRequired.length > 0) {
      const allUsers = await User.find({ _id: { $nin: group.members.map(m => m._id) } })
        .select('name skills branch semester availabilityTime preferredRoles')
        .limit(50);

      candidateMatches = allUsers.map(u => {
        const userSkills = (u.skills || []).map(s => (typeof s === 'object' ? s.name : s).toLowerCase());
        const matchedReq = missingRequired.filter(req => userSkills.some(us => us.includes(req.toLowerCase())));
        const score = Math.round(65 + (matchedReq.length / Math.max(1, missingRequired.length)) * 35);
        return {
          _id: u._id,
          name: u.name,
          branch: u.branch,
          semester: u.semester,
          skills: (u.skills || []).map(s => typeof s === 'object' ? s.name : s).slice(0, 6),
          matchScore: score,
          matchedSkills: matchedReq,
          complementaryReason: matchedReq.length > 0
            ? `Covers missing: ${matchedReq.join(', ')}`
            : 'Complementary generalist profile'
        };
      })
      .filter(u => u.matchScore > 65)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8);
    }

    res.json({
      groupName: group.name,
      memberCount: allMembers.length,
      coverage,
      missingCategories: missing,
      requiredSkillsCoverage: requiredCoverage,
      missingRequiredSkills: missingRequired,
      dnaScore,
      candidateMatches
    });

  } catch (err) {
    console.error('[Team DNA Error]:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/tasks/github-intelligence ─────────────────────
router.post('/github-intelligence', protect, async (req, res) => {
  try {
    const { username, userGoals } = req.body;
    if (!username) return res.status(400).json({ message: 'GitHub username is required' });

    const { fetchGitHubUserData } = require('../services/githubService');
    const ghData = await fetchGitHubUserData(username);

    // Analyze language distribution
    const langCount = {};
    (ghData.repositories || []).forEach(r => {
      if (r.language && r.language !== 'Other') {
        langCount[r.language] = (langCount[r.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lang, count]) => ({ lang, count, percent: Math.round((count / Math.max(1, ghData.repositories.length)) * 100) }));

    // Infer skill domains from languages
    const langDomainMap = {
      Python: 'AI/ML & Backend', JavaScript: 'Frontend & Backend', TypeScript: 'Frontend & Backend',
      Java: 'Backend & Android', Kotlin: 'Android Development', Swift: 'iOS Development',
      Dart: 'Flutter Mobile', 'C++': 'Systems & Game Dev', C: 'Systems Programming',
      Go: 'Backend & DevOps', Rust: 'Systems Programming', HTML: 'Frontend Web',
      CSS: 'Frontend Styling', Ruby: 'Web Backend', PHP: 'Web Backend',
      Shell: 'DevOps & Automation', Jupyter: 'Data Science & AI'
    };

    const inferredDomains = topLanguages.map(l => ({
      language: l.lang,
      domain: langDomainMap[l.lang] || 'General Programming',
      repoCount: l.count
    }));

    // Suggested roles based on tech
    const languages = topLanguages.map(l => l.lang);
    const suggestedRoles = [];
    if (languages.some(l => ['Python', 'Jupyter'].includes(l))) suggestedRoles.push('ML Engineer', 'Data Scientist', 'AI Developer');
    if (languages.some(l => ['JavaScript', 'TypeScript', 'HTML', 'CSS'].includes(l))) suggestedRoles.push('Frontend Developer', 'Full-Stack Developer');
    if (languages.some(l => ['Java', 'Go', 'Rust', 'C++'].includes(l))) suggestedRoles.push('Backend Engineer', 'Systems Programmer');
    if (languages.some(l => ['Kotlin', 'Swift', 'Dart'].includes(l))) suggestedRoles.push('Mobile Developer');
    if (languages.some(l => ['Shell'].includes(l))) suggestedRoles.push('DevOps Engineer');

    // Generate learning roadmap based on goals
    const goals = (userGoals || '').toLowerCase();
    const roadmap = [];
    if (goals.includes('ai') || goals.includes('machine learning') || goals.includes('ml')) {
      roadmap.push(
        { step: 1, topic: 'Python fundamentals & NumPy/Pandas', resource: 'fast.ai, Kaggle Learn' },
        { step: 2, topic: 'Supervised ML — scikit-learn', resource: 'Andrew Ng ML Course' },
        { step: 3, topic: 'Deep Learning — PyTorch or TensorFlow', resource: 'PyTorch official tutorials' },
        { step: 4, topic: 'Model deployment with FastAPI + Docker', resource: 'Full Stack Deep Learning' },
      );
    } else if (goals.includes('web') || goals.includes('react') || goals.includes('frontend')) {
      roadmap.push(
        { step: 1, topic: 'HTML, CSS, JavaScript fundamentals', resource: 'MDN Web Docs' },
        { step: 2, topic: 'React.js & component architecture', resource: 'React official docs' },
        { step: 3, topic: 'REST APIs & Node.js/Express backend', resource: 'NodeJs.org + The Odin Project' },
        { step: 4, topic: 'Database design with MongoDB or PostgreSQL', resource: 'MongoDB University' },
      );
    } else if (goals.includes('mobile') || goals.includes('flutter') || goals.includes('android')) {
      roadmap.push(
        { step: 1, topic: 'Dart language basics', resource: 'dart.dev official' },
        { step: 2, topic: 'Flutter widgets & state management', resource: 'Flutter official docs' },
        { step: 3, topic: 'Firebase integration for mobile apps', resource: 'Firebase Flutter codelabs' },
        { step: 4, topic: 'App Store / Play Store deployment', resource: 'Flutter deployment guide' },
      );
    } else {
      roadmap.push(
        { step: 1, topic: 'Strengthen your top language', resource: 'LeetCode + HackerRank' },
        { step: 2, topic: 'Contribute to open source projects', resource: 'GitHub Explore, Good First Issues' },
        { step: 3, topic: 'Build a portfolio project end-to-end', resource: 'devprojects.net' },
        { step: 4, topic: 'Document projects with clear README files', resource: 'makeareadme.com' },
      );
    }

    // Recent activity signals
    const recentRepos = (ghData.repositories || [])
      .filter(r => r.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    res.json({
      profile: {
        username: ghData.username,
        name: ghData.name,
        avatarUrl: ghData.avatarUrl,
        bio: ghData.bio,
        publicRepos: ghData.publicRepos,
        followersCount: ghData.followersCount,
        htmlUrl: ghData.htmlUrl
      },
      topLanguages,
      inferredDomains,
      suggestedRoles: [...new Set(suggestedRoles)],
      learningRoadmap: roadmap,
      recentActivity: recentRepos,
      dataNote: 'Analysis based on public repository metadata only. Source code content is not inspected. Private repositories are not accessible.',
      fetchedAt: new Date()
    });

  } catch (err) {
    console.error('[GitHub Intelligence Error]:', err.message);
    if (err.message.includes('not found')) return res.status(404).json({ message: 'GitHub profile not found. Check the username.' });
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/tasks/contribution/:groupId ────────────────────
// Returns per-member contribution stats based on actual task data
router.get('/contribution/:groupId', protect, async (req, res) => {
  try {
    const group = await requireGroupAccess(req.params.groupId, req.user.id, res);
    if (!group) return;

    const tasks = await Task.find({ group: req.params.groupId })
      .populate('assignedTo', 'name avatar email branch semester')
      .populate('createdBy', 'name');

    const fullGroup = await Group.findById(req.params.groupId)
      .populate('members', 'name avatar email branch semester')
      .populate('leader', 'name avatar email');

    const now = new Date();

    // Build per-member stats
    const memberMap = {};

    // Initialize all members (even those with 0 tasks)
    const allMembers = [...(fullGroup.members || []), fullGroup.leader].filter(Boolean);
    const seenIds = new Set();
    allMembers.forEach(m => {
      const key = m._id.toString();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        memberMap[key] = {
          _id: m._id,
          name: m.name,
          email: m.email,
          avatar: m.avatar,
          branch: m.branch,
          semester: m.semester,
          isLeader: fullGroup.leader._id.toString() === key,
          total: 0,
          completed: 0,
          inProgress: 0,
          blocked: 0,
          pending: 0,
          overdue: 0,
          categories: {}
        };
      }
    });

    tasks.forEach(t => {
      if (t.assignedTo) {
        const key = t.assignedTo._id.toString();
        if (!memberMap[key]) {
          memberMap[key] = {
            _id: t.assignedTo._id,
            name: t.assignedTo.name,
            email: t.assignedTo.email,
            avatar: t.assignedTo.avatar,
            isLeader: false,
            total: 0, completed: 0, inProgress: 0, blocked: 0, pending: 0, overdue: 0,
            categories: {}
          };
        }
        const m = memberMap[key];
        m.total++;
        if (t.status === 'completed') m.completed++;
        else if (t.status === 'in-progress') m.inProgress++;
        else if (t.status === 'blocked') m.blocked++;
        else m.pending++;

        if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed') m.overdue++;

        const cat = t.category || 'Other';
        m.categories[cat] = (m.categories[cat] || 0) + 1;
      }
    });

    const memberStats = Object.values(memberMap).map(m => ({
      ...m,
      completionRate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
      categories: Object.entries(m.categories).map(([cat, count]) => ({ category: cat, count }))
    })).sort((a, b) => b.total - a.total);

    const totalTasks = tasks.length;
    const unassigned = tasks.filter(t => !t.assignedTo && t.status !== 'completed').length;
    const avgTasksPerMember = memberStats.length > 0
      ? Math.round(totalTasks / memberStats.length)
      : 0;

    // Workload imbalance detection
    const taskCounts = memberStats.map(m => m.total);
    const maxTasks = Math.max(...taskCounts, 0);
    const minTasks = Math.min(...taskCounts, 0);
    const imbalanced = memberStats.length > 1 && (maxTasks - minTasks) > avgTasksPerMember;

    res.json({
      groupName: fullGroup.name,
      totalTasks,
      unassignedTasks: unassigned,
      memberCount: memberStats.length,
      avgTasksPerMember,
      workloadImbalanced: imbalanced,
      memberStats,
      disclaimer: 'Task counts are one indicator of contribution. They do not fully represent a student\'s effort, creativity, or problem-solving ability. Leaders should consider overall project impact when evaluating contributions.',
      generatedAt: new Date()
    });

  } catch (err) {
    console.error('[Contribution Error]:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

