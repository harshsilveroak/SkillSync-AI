/* ==========================================================================
   SkillSync AI - Contact Form Validation & Toast Notification System
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('project-contact-form');
  const toastContainer = document.getElementById('toast-container');

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `⚡ <strong>SkillSync AI:</strong> ${message}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const message = document.getElementById('contact-message').value.trim();

      if (!name || !email || !message) {
        showToast('Please fill in all required fields.');
        return;
      }

      // Submit simulation
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'Transmitting Message...';
      submitBtn.disabled = true;

      setTimeout(() => {
        showToast(`Thank you, ${name}! Your inquiry has been received by the SkillSync AI research team.`);
        form.reset();
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }, 1000);
    });
  }
});
