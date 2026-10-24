/* ==========================================================================
   SkillSync AI - Confusion Matrix & Model Performance Metrics Visualizer
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const cmCells = document.querySelectorAll('.cm-cell');
  const cmDetailBox = document.getElementById('cm-detail-text');

  const cellDetails = {
    tp: "True Positives (14,820 samples): Correctly classified top-tier technical candidates and high-quality AST code snippets with 99.1% precision.",
    tn: "True Negatives (34,110 samples): Correctly filtered out unaligned applications and syntactically invalid code submissions.",
    fp: "False Positives (180 samples): Borderline junior submissions with high keyword density temporarily flagged for human review.",
    fn: "False Negatives (110 samples): Highly niche domain submissions requiring edge-case AST parser fine-tuning."
  };

  cmCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const type = cell.getAttribute('data-cm');
      if (cellDetails[type] && cmDetailBox) {
        cmDetailBox.innerHTML = `<span style="color: var(--neon-cyan)">[Inspection]</span> ${cellDetails[type]}`;
      }
    });
  });
});
