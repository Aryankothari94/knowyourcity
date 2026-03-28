import React, { useState } from 'react';

export default function AuthModals({
    isAuthOpen,
    closeAuth,
    isLogoutOpen,
    closeLogout,
    onLoginSuccess,
    onLogoutConfirm
}) {
    const [activeTab, setActiveTab] = useState('login');

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Fetch from localStorage DB
        const usersDB = JSON.parse(localStorage.getItem('kyc_users') || '[]');
        const user = usersDB.find(u => u.email === email && u.password === password);
        
        if (user) {
            document.getElementById('loginError').classList.remove('active');
            onLoginSuccess(user.firstName);
            closeAuth();
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = 'Invalid email or password.';
            errorDiv.classList.add('active');
        }
    };

    const handleSignupSubmit = (e) => {
        e.preventDefault();
        const firstName = document.getElementById('signupFirstName').value.trim();
        const lastName = document.getElementById('signupLastName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const phone = document.getElementById('signupPhone').value.trim();
        const dob = document.getElementById('signupDOB').value;
        const password = document.getElementById('signupPassword').value;
        
        const usersDB = JSON.parse(localStorage.getItem('kyc_users') || '[]');
        
        if (usersDB.some(u => u.email === email)) {
            const errorDiv = document.getElementById('signupError');
            errorDiv.textContent = 'Email is already registered. Please login.';
            errorDiv.classList.add('active');
            return;
        }
        
        usersDB.push({ firstName, lastName, email, phone, dob, password });
        localStorage.setItem('kyc_users', JSON.stringify(usersDB));
        
        onLoginSuccess(firstName);
        closeAuth();
    };

    return (
        <>
            {/* ===== AUTH MODAL ===== */}
            <div className={`modal-overlay ${isAuthOpen ? 'active' : ''}`} id="authModal" style={{ display: isAuthOpen ? 'flex' : 'none' }}>
                <div className="auth-modal glass-card">
                    <button className="modal-close" id="closeModal" onClick={closeAuth}>&times;</button>

                    <div className="auth-tabs">
                        <button className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Login</button>
                        <button className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`} onClick={() => setActiveTab('signup')}>Sign Up</button>
                    </div>

                    {/* Login Form */}
                    <form className={`auth-form ${activeTab === 'login' ? 'active' : ''}`} id="loginForm" onSubmit={handleLoginSubmit}>
                        <div id="loginError" className="auth-error-message"></div>
                        <div className="form-group">
                            <label htmlFor="loginEmail">Email Address</label>
                            <input type="email" id="loginEmail" placeholder="rahul@example.com" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="loginPassword">Password</label>
                            <input type="password" id="loginPassword" placeholder="••••••••" required />
                        </div>
                        <div className="form-group captcha-group">
                            <label id="captchaLabel" htmlFor="loginCaptcha">What is 0 + 0?</label>
                            <input type="text" id="loginCaptcha" placeholder="Enter answer" required />
                        </div>
                        <button type="submit" className="btn-auth">Login to Your City</button>
                        <div className="auth-footer">
                            Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('signup'); }}>Sign Up</a>
                        </div>
                    </form>

                    {/* Signup Form */}
                    <form className={`auth-form ${activeTab === 'signup' ? 'active' : ''}`} id="signupForm" onSubmit={handleSignupSubmit}>
                        <div id="signupError" className="auth-error-message"></div>
                        <div className="form-row">
                            <div className="form-group half">
                                <label htmlFor="signupFirstName">First Name</label>
                                <input type="text" id="signupFirstName" placeholder="Rahul" required />
                            </div>
                            <div className="form-group half">
                                <label htmlFor="signupLastName">Last Name</label>
                                <input type="text" id="signupLastName" placeholder="Sharma" required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="signupPhone">Phone Number</label>
                            <input type="tel" id="signupPhone" placeholder="+91 98765 43210" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="signupEmail">Email Address</label>
                            <input type="email" id="signupEmail" placeholder="rahul@example.com" required />
                        </div>
                        <div className="form-row">
                            <div className="form-group half">
                                <label htmlFor="signupDOB">Date of Birth</label>
                                <input type="date" id="signupDOB" required />
                            </div>
                            <div className="form-group half">
                                <label htmlFor="signupPassword">Password</label>
                                <input type="password" id="signupPassword" placeholder="••••••••" required />
                            </div>
                        </div>
                        <button type="submit" className="btn-auth">Create Account</button>
                        <div className="auth-footer">
                            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('login'); }}>Login</a>
                        </div>
                    </form>
                </div>
            </div>

            {/* ===== LOGOUT CONFIRMATION MODAL ===== */}
            <div className={`modal-overlay ${isLogoutOpen ? 'active' : ''}`} id="logoutConfirmModal" style={{ display: isLogoutOpen ? 'flex' : 'none' }}>
                <div className="confirm-modal glass-card">
                    <h4>Are you sure you want to logout?</h4>
                    <p>You will need to log in again to access neighborhood insights.</p>
                    <div className="confirm-actions">
                        <button id="cancelLogoutBtn" className="btn-secondary" onClick={closeLogout}>Cancel</button>
                        <button id="confirmLogoutBtn" className="btn-primary" style={{ background: 'var(--caution-red)', boxShadow: 'none' }} onClick={onLogoutConfirm}>Yes, Logout</button>
                    </div>
                </div>
            </div>
        </>
    );
}
