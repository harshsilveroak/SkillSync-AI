/* ==========================================================================
   SkillSync AI - Gallery Lightbox & Video Player Modal Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('modal-img-target');
  const modalCaption = document.getElementById('modal-caption-target');
  const modalClose = document.getElementById('modal-close-btn');

  // Gallery item click listeners
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const caption = item.getAttribute('data-caption') || 'SkillSync AI Visual Preview';

      if (modal && modalImg) {
        modalImg.src = img.src;
        if (modalCaption) modalCaption.innerText = caption;
        modal.classList.add('active');
      }
    });
  });

  // Video Modal Trigger
  const videoBtn = document.getElementById('view-video-btn');
  if (videoBtn) {
    videoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal && modalImg) {
        // Set placeholder or video container
        modalImg.src = 'assets/images/architecture_diagram.svg';
        if (modalCaption) modalCaption.innerText = 'SkillSync AI Live System Architecture & Project Walkthrough Video';
        modal.classList.add('active');
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
});
