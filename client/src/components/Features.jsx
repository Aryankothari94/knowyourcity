import React, { useEffect } from 'react';

export default function Features() {

    // Replicate vanilla Scroll Reveal observer
    useEffect(() => {
        const revealElements = document.querySelectorAll('.features .reveal, .how-it-works .reveal');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 80);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));

        return () => revealObserver.disconnect();
    }, []);

    return (
        <>
            {/* ===== FEATURES ===== */}
            <section className="features" id="features">
                <div className="container">
                    <div className="features-header reveal">
                        <div className="section-label">Why Choose Us</div>
                        <h2 className="section-title">Everything You Need to<br /><span className="gradient-text">Feel at Home</span></h2>
                        <p className="section-subtitle">We analyze thousands of data points to give you the clearest picture of every neighborhood in your new city.</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card glass-card reveal">
                            <div className="feature-icon green">🛡️</div>
                            <h3>Safe Neighborhoods</h3>
                            <p>Real-time safety scores powered by verified data, so you always know which areas are secure for you and your family.</p>
                        </div>
                        <div className="feature-card glass-card reveal">
                            <div className="feature-icon cyan">🏫</div>
                            <h3>Schools & Parks</h3>
                            <p>Discover top-rated schools, green spaces, and recreational zones perfect for kids — all within walkable distance.</p>
                        </div>
                        <div className="feature-card glass-card reveal">
                            <div className="feature-icon purple">🚇</div>
                            <h3>Transport Hub</h3>
                            <p>Check public transit access, commute times, and connectivity so you never feel stranded in a new place.</p>
                        </div>
                        <div className="feature-card glass-card reveal">
                            <div className="feature-icon amber">💡</div>
                            <h3>Local Tips</h3>
                            <p>Insider knowledge from locals — best markets, healthcare facilities, community centers, and hidden gems.</p>
                        </div>
                        <div className="feature-card glass-card reveal" onClick={() => window.location.href='itinerary.html'} style={{cursor: 'pointer'}}>
                            <div className="feature-icon pink">📅</div>
                            <h3>Smart Itinerary</h3>
                            <p>Generate safety-first travel plans with one click, and receive them directly in your email with a PDF guide.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== HOW IT WORKS ===== */}
            <section className="how-it-works" id="how-it-works">
                <div className="container">
                    <div className="how-header reveal">
                        <div className="section-label">How It Works</div>
                        <h2 className="section-title">Get Settled in <span className="gradient-text">3 Easy Steps</span></h2>
                        <p className="section-subtitle">No complicated setup. Just search, explore, and decide — all in one place.</p>
                    </div>
                    <div className="steps-container">
                        <div className="step-card glass-card reveal">
                            <div className="step-number">1</div>
                            <span className="step-icon">🔍</span>
                            <h3>Search Your City</h3>
                            <p>Enter the city you're moving to and instantly get a complete overview of all neighborhoods.</p>
                        </div>
                        <div className="step-card glass-card reveal">
                            <div className="step-number">2</div>
                            <span className="step-icon">📊</span>
                            <h3>Explore & Compare</h3>
                            <p>Browse safety ratings, amenities, schools, transit options, and real reviews from residents.</p>
                        </div>
                        <div className="step-card glass-card reveal">
                            <div className="step-number">3</div>
                            <span className="step-icon">🏡</span>
                            <h3>Decide with Confidence</h3>
                            <p>Make an informed decision and settle into the perfect neighborhood for you and your family.</p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
