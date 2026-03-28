import React, { useEffect, useRef, useState } from 'react';

export default function Testimonials() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const trackRef = useRef(null);

    const totalSlides = 4;

    useEffect(() => {
        let interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % totalSlides);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="testimonials" id="testimonials">
            <div className="container">
                <div className="testimonials-header reveal">
                    <div className="section-label">Success Stories</div>
                    <h2 className="section-title">What <span className="gradient-text">Newcomers</span> Say</h2>
                    <p className="section-subtitle">Real stories from people who used Know Your City to find their perfect neighborhood.</p>
                </div>

                <div className="testimonials-carousel glass-card reveal" id="testimonialCarousel">
                    <div
                        className="testimonials-track"
                        id="testimonialTrack"
                        ref={trackRef}
                        style={{ transform: `translateX(-${currentSlide * 100}%)`, transition: 'transform 0.5s ease' }}
                    >
                        {/* Testimonial 1 */}
                        <div className="testimonial-card">
                            <p className="testimonial-quote">
                                Moving to a new city with two kids was terrifying. Know Your City showed us Green Valley — now we live in
                                the safest neighborhood with the best schools nearby. Absolute lifesaver!
                            </p>
                            <div className="testimonial-author">
                                <div className="author-avatar">PR</div>
                                <div className="author-info">
                                    <h4>Priya Rajput</h4>
                                    <p>Moved from Delhi to Pune</p>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="testimonial-card">
                            <p className="testimonial-quote">
                                As a solo female professional relocating for work, safety was my top priority. The detailed area ratings
                                gave me the confidence to choose the right neighborhood. Highly recommend!
                            </p>
                            <div className="testimonial-author">
                                <div className="author-avatar">SM</div>
                                <div className="author-info">
                                    <h4>Sarah Mitchell</h4>
                                    <p>Moved from London to Bangalore</p>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 3 */}
                        <div className="testimonial-card">
                            <p className="testimonial-quote">
                                I was clueless about which areas had good transport links. Know Your City mapped everything out
                                beautifully. Found a place near the metro with parks — couldn't be happier!
                            </p>
                            <div className="testimonial-author">
                                <div className="author-avatar">AK</div>
                                <div className="author-info">
                                    <h4>Arjun Kapoor</h4>
                                    <p>Moved from Mumbai to Hyderabad</p>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 4 */}
                        <div className="testimonial-card">
                            <p className="testimonial-quote">
                                The local tips section was a goldmine! Found the best markets, hospitals, and even a community center.
                                It's like having a local friend guide you through the city.
                            </p>
                            <div className="testimonial-author">
                                <div className="author-avatar">RD</div>
                                <div className="author-info">
                                    <h4>Rahul Desai</h4>
                                    <p>Moved from Surat to Chennai</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="carousel-dots" id="carouselDots">
                        {[0, 1, 2, 3].map(i => (
                            <button
                                key={i}
                                className={`carousel-dot ${currentSlide === i ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(i)}
                                aria-label={`Go to slide ${i + 1}`}
                            ></button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
