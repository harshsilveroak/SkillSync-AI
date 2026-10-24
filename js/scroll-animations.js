/* ==========================================================================
   SkillSync AI - Scroll Reveal & Progress Bar Handler
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Top Scroll Progress Indicator
  const progressBar = document.getElementById('scroll-progress');
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    
    if (progressBar) {
      progressBar.style.width = scrollPercent + '%';
    }
  });

  // IntersectionObserver for Reveal Animations
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Optionally unobserve if we only want single trigger:
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));
});
