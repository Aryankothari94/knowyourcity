import React, { useState } from 'react';

const API_BASE = 'http://localhost:10000/api'; // Adjust to your production URL

export default function SmartItinerary() {
  const [city, setCity] = useState('');
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  
  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'success' or 'error'

  const generateItinerary = async () => {
    if (!city) return;
    setLoading(true);
    
    // Simulate smart generation logic
    setTimeout(() => {
      const activities = [
        { time: '09:00 AM', place: 'Local Museum & Heritage Site', safety: 95 },
        { time: '12:30 PM', place: 'Verified Safe Dining Area', safety: 88 },
        { time: '03:00 PM', place: 'Public Park & Garden', safety: 92 },
        { time: '07:00 PM', place: 'Well-lit Shopping District', safety: 85 }
      ];

      const generated = {
        city: city,
        days: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          activities: [...activities].sort(() => Math.random() - 0.5)
        })),
        totalActivities: days * 4
      };

      setItinerary(generated);
      setLoading(false);
      
      // Scroll to result
      setTimeout(() => {
        document.getElementById('itinerary-result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 1500);
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch(`${API_BASE}/itinerary/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          itineraryData: itinerary,
          message
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        setEmailStatus('success');
        setTimeout(() => setShowEmailModal(false), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error(err);
      setEmailStatus('error');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <section className="itinerary-section" id="itinerary">
      <div className="container">
        <div className="section-header reveal visible">
          <div className="section-label">AI Powered</div>
          <h2 className="section-title">Smart <span className="gradient-text">Itinerary Builder</span></h2>
          <p className="section-subtitle">Plan your trip with safety-first recommendations tailored to your destination.</p>
        </div>

        <div className="itinerary-generator glass-card reveal visible">
          <div className="generator-inputs">
            <div className="input-group">
              <label>Destination City</label>
              <input 
                type="text" 
                placeholder="e.g. Pune, Mumbai, Delhi" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Duration (Days)</label>
              <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <button 
              className="btn-primary" 
              onClick={generateItinerary} 
              disabled={loading || !city}
            >
              {loading ? '✨ Generating...' : 'Build Safe Itinerary'}
            </button>
          </div>
        </div>

        {itinerary && (
          <div id="itinerary-result" className="itinerary-result-area">
            <div className="itinerary-meta">
              <h3>Plan for {itinerary.city}</h3>
              <button className="btn-email-trigger" onClick={() => setShowEmailModal(true)}>
                <span>📧</span> Send to Email
              </button>
            </div>

            <div className="itinerary-grid">
              {itinerary.days.map(day => (
                <div key={day.day} className="itinerary-day-card glass-card">
                  <h4>Day {day.day}</h4>
                  <div className="activity-list">
                    {day.activities.map((act, idx) => (
                      <div key={idx} className="activity-item">
                        <div className="activity-time">{act.time}</div>
                        <div className="activity-info">
                          <div className="activity-place">{act.place}</div>
                          <div className="activity-safety">
                            <div className="safety-dot" style={{ background: act.safety > 90 ? '#00e676' : '#ffab40' }}></div>
                            Safety: {act.safety}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="itinerary-modal-overlay">
          <div className="itinerary-modal glass-card">
            <button className="modal-close" onClick={() => setShowEmailModal(false)}>✕</button>
            <h3>Send Itinerary to Email</h3>
            <p>We'll send a formatted HTML email and a PDF copy of your plan.</p>
            
            <form onSubmit={sendEmail}>
              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="yourname@gmail.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Optional Message</label>
                <textarea 
                  placeholder="Any special notes..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>

              {emailStatus === 'success' && (
                <div className="status-msg success">✅ Email sent successfully! Check your inbox.</div>
              )}
              {emailStatus === 'error' && (
                <div className="status-msg error">❌ Failed to send. Please check your connection.</div>
              )}

              <button className="btn-primary" type="submit" disabled={sendingEmail}>
                {sendingEmail ? '🚀 Sending...' : 'Send Itinerary'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .itinerary-section { padding: 80px 0; background: rgba(10,14,39,0.3); }
        .itinerary-generator { max-width: 800px; margin: 40px auto; padding: 30px; }
        .generator-inputs { display: grid; grid-template-columns: 2fr 1fr 1.5fr; gap: 20px; align-items: flex-end; }
        
        .input-group label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-secondary); }
        .input-group input, .input-group select, .input-group textarea {
          width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: white; outline: none; font-family: inherit;
        }
        
        .itinerary-result-area { margin-top: 50px; animation: fadeInUp 0.6s ease; }
        .itinerary-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .btn-email-trigger { 
          background: rgba(0,229,255,0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan);
          padding: 10px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; transition: all 0.3s;
          display: flex; align-items: center; gap: 10px;
        }
        .btn-email-trigger:hover { background: var(--accent-cyan); color: black; }
        
        .itinerary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .itinerary-day-card { padding: 25px; }
        .itinerary-day-card h4 { margin-bottom: 20px; color: var(--accent-cyan); font-size: 1.2rem; }
        
        .activity-list { display: flex; flex-direction: column; gap: 15px; }
        .activity-item { display: flex; gap: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .activity-time { font-size: 0.8rem; font-weight: 700; color: #888; white-space: nowrap; padding-top: 3px; }
        .activity-place { font-weight: 500; font-size: 0.95rem; margin-bottom: 4px; }
        .activity-safety { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #aaa; }
        .safety-dot { width: 8px; height: 8px; border-radius: 50%; }

        /* Modal */
        .itinerary-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8);
          z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);
        }
        .itinerary-modal { width: 90%; max-width: 450px; padding: 35px; position: relative; }
        .modal-close { position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; }
        .itinerary-modal h3 { margin-bottom: 10px; font-size: 1.5rem; color: var(--accent-cyan); }
        .itinerary-modal p { margin-bottom: 25px; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; }
        .status-msg { padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; }
        .status-msg.success { background: rgba(0,230,118,0.1); color: #00e676; border: 1px solid rgba(0,230,118,0.2); }
        .status-msg.error { background: rgba(255,82,82,0.1); color: #ff5252; border: 1px solid rgba(255,82,82,0.2); }

        @media (max-width: 768px) {
          .generator-inputs { grid-template-columns: 1fr; }
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </section>
  );
}
