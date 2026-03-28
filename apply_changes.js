const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const newsletterRegex = /<!-- ===== NEWSLETTER ===== -->[\s\S]*?<\/section>/;
html = html.replace(newsletterRegex, '<!-- Newsletter Section Removed -->');

const autoplayScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const hiwSteps = document.querySelectorAll('.hiw-step');
      if (hiwSteps.length === 0) return;
      let stepIndex = 0;
      setInterval(() => {
        hiwSteps.forEach(s => s.classList.remove('expanded'));
        hiwSteps[stepIndex].classList.add('expanded');
        stepIndex = (stepIndex + 1) % hiwSteps.length;
      }, 4000); // 4 second interval
    });
  </script>
`;
html = html.replace('<!-- ===== TESTIMONIALS ===== -->', autoplayScript + '\n  <!-- ===== TESTIMONIALS ===== -->');

const cardCss = `
  <style>
    .area-card { cursor: pointer; transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .area-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); }
    .area-details-hidden { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease; margin-top: 0; }
    .area-card.expanded .area-details-hidden { max-height: 600px; opacity: 1; margin-top: 15px; overflow-y: auto; }
  </style>
`;
if(!html.includes('.area-details-hidden { max-height: 0;')) {
  html = html.replace('<!-- ===== SAFETY DASHBOARD ===== -->', cardCss + '\n  <!-- ===== SAFETY DASHBOARD ===== -->');
}

// Card 1
html = html.replace(
  '<div class="area-card glass-card reveal" id="dynamicCityCard">',
  `<div class="area-card glass-card reveal" id="dynamicCityCard" onclick="this.classList.toggle('expanded')">`
);
html = html.replace(
  '<span class="area-badge badge-safe" id="dynamicCityBadge">Safe</span>\n          </div>',
  `<span class="area-badge badge-safe" id="dynamicCityBadge">Safe</span>\n          </div>\n          <div class="area-details-hidden">`
);
html = html.replace(
  '<!-- Wikipedia analytics will be injected here -->\n          </div>',
  `<!-- Wikipedia analytics will be injected here -->\n          </div>\n          </div> <!-- end area-details-hidden -->`
);

// Card 2
html = html.replace(
  '<!-- Area Card 2 -->\n        <div class="area-card glass-card reveal">',
  `<!-- Area Card 2 -->\n        <div class="area-card glass-card reveal" onclick="this.classList.toggle('expanded')">`
);
html = html.replace(
  '<span class="area-badge badge-safe" id="dynamicCard1Badge">Very Safe</span>\n          </div>',
  `<span class="area-badge badge-safe" id="dynamicCard1Badge">Very Safe</span>\n          </div>\n          <div class="area-details-hidden">`
);
html = html.replace(
  '<span class="area-tag">👮 High Patrolling</span>\n          </div>\n        </div>',
  `<span class="area-tag">👮 High Patrolling</span>\n          </div>\n          </div>\n        </div>`
);

// Card 3
html = html.replace(
  '<div class="area-card glass-card reveal" id="dynamicTouristCard" style="display: none;">',
  `<div class="area-card glass-card reveal" id="dynamicTouristCard" style="display: none;" onclick="this.classList.toggle('expanded')">`
);
html = html.replace(
  '<span class="area-badge badge-safe">Explore</span>\n          </div>',
  `<span class="area-badge badge-safe">Explore</span>\n          </div>\n          <div class="area-details-hidden">`
);
html = html.replace(
  '<!-- Inject tourist spots here -->\n          </div>\n        </div>',
  `<!-- Inject tourist spots here -->\n          </div>\n          </div>\n        </div>`
);

// Card 4
html = html.replace(
  '<!-- Area Card 4 -->\n        <div class="area-card glass-card reveal">',
  `<!-- Area Card 4 -->\n        <div class="area-card glass-card reveal" onclick="this.classList.toggle('expanded')">`
);
html = html.replace(
  '<span class="area-badge badge-safe" id="dynamicCard2Badge">Safe</span>\n          </div>',
  `<span class="area-badge badge-safe" id="dynamicCard2Badge">Safe</span>\n          </div>\n          <div class="area-details-hidden">`
);
html = html.replace(
  '<span class="area-tag">🌇 Views</span>\n          </div>\n        </div>',
  `<span class="area-tag">🌇 Views</span>\n          </div>\n          </div>\n        </div>`
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Update Complete');
