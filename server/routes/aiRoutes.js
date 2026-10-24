const express = require('express');
const router = express.Router();

// Helper: Smart Local Fallback Analysis Engine
function generateLocalAnalysis(ideaText) {
  const lower = (ideaText || '').toLowerCase();
  
  let detectedDomain = "Web Development";
  if (lower.includes("ai") || lower.includes("machine learning") || lower.includes("vision") || lower.includes("opencv") || lower.includes("model") || lower.includes("face") || lower.includes("llm")) {
    detectedDomain = "AI / Machine Learning";
  } else if (lower.includes("app") || lower.includes("flutter") || lower.includes("android") || lower.includes("ios") || lower.includes("mobile")) {
    detectedDomain = "Mobile Development";
  } else if (lower.includes("cyber") || lower.includes("hack") || lower.includes("security")) {
    detectedDomain = "Cybersecurity";
  } else if (lower.includes("cloud") || lower.includes("docker") || lower.includes("aws")) {
    detectedDomain = "Cloud / DevOps";
  }

  const detectedSkills = [];
  if (lower.includes("python")) detectedSkills.push("Python");
  if (lower.includes("opencv") || lower.includes("face") || lower.includes("vision")) detectedSkills.push("OpenCV");
  if (lower.includes("react")) detectedSkills.push("React");
  if (lower.includes("node") || lower.includes("express")) detectedSkills.push("Node.js");
  if (lower.includes("mongo") || lower.includes("db") || lower.includes("database")) detectedSkills.push("MongoDB");
  if (lower.includes("flutter")) detectedSkills.push("Flutter");
  if (lower.includes("docker") || lower.includes("aws")) detectedSkills.push("Docker");
  if (detectedSkills.length === 0) {
    detectedSkills.push("Python", "React", "Node.js", "MongoDB");
  }

  const generatedTitle = ideaText.length < 35 ? ideaText : (ideaText.split('.')[0].slice(0, 40) + "...");

  return {
    title: generatedTitle,
    domain: detectedDomain,
    difficulty: "Intermediate",
    estimatedDuration: "8-10 Weeks",
    requiredSkills: detectedSkills,
    summary: `SkillSync AI analyzed your idea for "${generatedTitle}". Recommended stack includes ${detectedSkills.join(', ')} with a modular 4-tier architecture.`,
    tasks: [
      { title: "UI Dashboard & Responsive Screens", category: "Frontend", assignee: "Rahul Sharma" },
      { title: "REST API & Database Controller Setup", category: "Backend", assignee: "Meet Patel" },
      { title: `Core ${detectedSkills[0] || 'AI'} Engine Implementation`, category: detectedDomain.includes("AI") ? "AI / ML" : "Core Tech", assignee: "Harsh Visodiya" },
      { title: "Automated Integration & Unit Testing", category: "Testing", assignee: "Harsh Visodiya" }
    ]
  };
}

// @route   POST /api/ai/analyze-project
// @desc    Analyze project idea using OpenAI ChatGPT (or smart local fallback)
router.post('/analyze-project', async (req, res) => {
  const { projectIdea } = req.body;

  if (!projectIdea || !projectIdea.trim()) {
    return res.status(400).json({ success: false, message: 'Project idea cannot be empty.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.trim() && !apiKey.includes('YOUR_OPENAI_API_KEY')) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are SkillSync AI Project Architect, an expert software architect and team coordinator. Analyze the student project idea and output ONLY valid JSON matching this exact structure:
{
  "title": "Short Title",
  "domain": "AI / Machine Learning" | "Web Development" | "Mobile Development" | "Cybersecurity" | "Cloud / DevOps",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimatedDuration": "e.g. 6-8 Weeks",
  "requiredSkills": ["Skill1", "Skill2", "Skill3"],
  "summary": "2 sentence summary of architecture.",
  "tasks": [
    { "title": "Frontend UI Screen Setup", "category": "Frontend", "assignee": "Rahul Sharma" },
    { "title": "Backend API Gateway", "category": "Backend", "assignee": "Meet Patel" },
    { "title": "Core Module Implementation", "category": "AI / ML", "assignee": "Harsh Visodiya" },
    { "title": "System Testing & Deployment", "category": "Testing", "assignee": "Harsh Visodiya" }
  ]
}`
            },
            {
              role: 'user',
              content: `Analyze this project idea: "${projectIdea}"`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contentStr = data.choices[0]?.message?.content;
        if (contentStr) {
          const parsedAnalysis = JSON.parse(contentStr);
          return res.json({
            success: true,
            isLiveOpenAI: true,
            model: data.model || 'gpt-4o-mini',
            analysis: parsedAnalysis
          });
        }
      }
    } catch (err) {
      console.error('[OpenAI API Error]:', err.message);
    }
  }

  // Fallback to local analysis engine if OpenAI key not provided or request failed
  const fallbackAnalysis = generateLocalAnalysis(projectIdea);
  return res.json({
    success: true,
    isLiveOpenAI: false,
    analysis: fallbackAnalysis
  });
});

module.exports = router;
