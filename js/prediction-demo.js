/* ==========================================================================
   SkillSync AI - Interactive AI Prediction Sandbox Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const inputTextarea = document.getElementById('demo-input-text');
  const runBtn = document.getElementById('run-inference-btn');
  const confidenceBar = document.getElementById('demo-confidence-fill');
  const confidenceVal = document.getElementById('demo-confidence-val');
  const outputJson = document.getElementById('demo-json-output');
  const statusBadge = document.getElementById('demo-status-badge');

  const presets = {
    code: `def calculate_talent_score(resume_ast, code_metrics):\n    # SkillSync NLP Transformer Pipeline\n    confidence = model.predict([resume_ast, code_metrics])\n    return {\n        "skill_alignment": confidence * 0.98,\n        "complexity_index": "O(N log N)",\n        "code_quality": "S-Tier"\n    }`,
    resume: `Senior Full Stack & AI Engineer with 4+ years of experience in Python, PyTorch, React, Fast-API, Docker, and Distributed Neural Networks. Developed scalable RAG architectures and real-time computer vision models.`,
    ml: `import tensorflow as tf\nfrom transformers import AutoTokenizer, TFAutoModelForSequenceClassification\n\ntokenizer = AutoTokenizer.from_pretrained("skillsync/bert-talent-v2")\ninputs = tokenizer("Evaluated Python async codebase", return_tensors="tf")\noutputs = model(inputs)\npredictions = tf.nn.softmax(outputs.logits, axis=-1)`
  };

  // Preset Buttons Listener
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-preset');
      if (presets[type]) {
        inputTextarea.value = presets[type];
      }
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      const text = inputTextarea.value.trim();
      if (!text) return;

      // Scanning visual feedback
      runBtn.innerText = '⚡ Processing Neural Network...';
      runBtn.disabled = true;
      statusBadge.innerText = 'Scanning Tokens...';
      statusBadge.style.color = '#f59e0b';
      confidenceBar.style.width = '0%';

      setTimeout(() => {
        // Compute realistic dynamic confidence based on input length
        const baseScore = 94.2 + (text.length % 5.5);
        const finalScore = Math.min(99.4, baseScore).toFixed(1);

        confidenceBar.style.width = finalScore + '%';
        confidenceVal.innerText = finalScore + '%';
        statusBadge.innerText = 'Inference Complete (38ms)';
        statusBadge.style.color = '#10b981';

        const resultObj = {
          status: "SUCCESS_200",
          model: "SkillSync-Multimodal-v2.4",
          latency_ms: 38.4,
          confidence: parseFloat(finalScore) / 100,
          predictions: {
            primary_domain: "Full-Stack AI Engineering",
            ast_complexity_score: 9.2,
            code_quality_grade: "A+",
            extracted_skills: ["Python", "TensorFlow", "React", "Deep Learning", "Async Architecture"],
            bias_variance_index: 0.012
          }
        };

        outputJson.textContent = JSON.stringify(resultObj, null, 2);

        runBtn.innerText = '⚡ Run SkillSync Inference';
        runBtn.disabled = false;
      }, 700);
    });
  }
});
