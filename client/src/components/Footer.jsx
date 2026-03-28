import React from 'react';

export default function Footer() {
    return (
        <>
            {/* ===== NEWSLETTER ===== */}
            <section className="newsletter" id="newsletter">
                <div className="container">
                    <div className="newsletter-card glass-card reveal">
                        <div className="section-label">Stay Updated</div>
                        <h2 className="section-title">Get <span className="gradient-text">City Insights</span> Delivered</h2>
                        <p className="section-subtitle">Subscribe and receive weekly updates on new neighborhoods, safety reports, and community tips.</p>
                        <form className="newsletter-form" id="newsletterForm" onSubmit={(e) => {
                            e.preventDefault();
                            const btn = e.target.querySelector('button');
                            const prev = btn.textContent;
                            btn.textContent = '✓ Subscribed!';
                            btn.style.background = 'var(--safe-green)';
                            e.target.reset();
                            setTimeout(() => {
                                btn.textContent = prev;
                                btn.style.background = '';
                            }, 3000);
                        }}>
                            <input type="email" placeholder="Enter your email address" id="emailInput" required />
                            <button type="submit" className="btn-primary">Subscribe →</button>
                        </form>
                    </div>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <a href="#" className="nav-brand">
                                <div className="nav-brand-icon">🏙️</div>
                                <div className="nav-brand-text">Know<span>Your</span>City</div>
                            </a>
                            <p>Helping newcomers discover safe neighborhoods and settle into their new city with confidence.</p>
                            <div className="social-links">
                                <a href="#" className="social-link" aria-label="Twitter">𝕏</a>
                                <a href="#" className="social-link" aria-label="Instagram">📷</a>
                                <a href="#" className="social-link" aria-label="LinkedIn">in</a>
                                <a href="#" className="social-link" aria-label="YouTube">▶</a>
                            </div>
                        </div>
                        <div className="footer-col">
                            <h4>Explore</h4>
                            <ul>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#safety">Safety Explorer</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><a href="#testimonials">Stories</a></li>
                            </ul>
                        </div>
                        <div className="footer-col">
                            <h4>Resources</h4>
                            <ul>
                                <li><a href="#">City Guides</a></li>
                                <li><a href="#">Safety Reports</a></li>
                                <li><a href="#">Community Forum</a></li>
                                <li><a href="#">Blog</a></li>
                            </ul>
                        </div>
                        <div className="footer-col">
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Contact</a></li>
                                <li><a href="#">Privacy Policy</a></li>
                                <li><a href="#">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© 2026 KnowYourCity. All rights reserved.</p>
                        <p>Made with 💙 for newcomers everywhere</p>
                    </div>
                </div>
            </footer>
        </>
    );
}
