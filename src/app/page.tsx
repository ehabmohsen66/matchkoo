import './landing.css';
import Link from 'next/link';
import MatchkooLogo from '@/components/MatchkooLogo';
import ScrollReveal from '@/components/ScrollReveal';
import LiveTicker from '@/components/LiveTicker';

export default function Home() {
  return (
    <div className="landing-page-container bg-[var(--ink)] text-[var(--white)] font-['Inter']">


      {/*  ─── NAVBAR ──────────────────────────────────────────  */}
      <nav className="nav" id="navbar">
        <a className="nav-logo" href="#">
          <MatchkooLogo height={32} />
        </a>
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#scoring">Scoring</a></li>
        </ul>
        <div className="nav-cta">
          <a href="/ar" style={{ "padding": "7px 14px", "border": "1px solid rgba(255,255,255,0.15)", "borderRadius": "100px", "fontSize": "0.8rem", "fontWeight": "700", "color": "rgba(255,255,255,0.7)", "textDecoration": "none", "transition": "all 0.2s", "display": "inline-flex", "alignItems": "center", "gap": "5px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
            عربي
          </a>
          <a href="/login" className="btn-ghost">Sign In</a>
          <a href="/register" className="btn-primary">
            Play Free
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
          </a>
        </div>
      </nav>

      {/*  ─── HERO ────────────────────────────────────────────  */}
      <section className="hero">
        <div className="hero-bg">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="hero-content">
          <div className="hero-kicker">
            <div className="hero-kicker-dot"></div>
            2.5k Predictors Active Now
          </div>
          <h1 className="hero-title">
            Predict &amp; Vote Football.<br />
            <span className="accent">Compete. Win.</span>
          </h1>
          <p className="hero-sub">
            Matchkoo, the first esports &amp; gamification network. Aims to bring together all sports fans and world-class gamers from across the globe in one place.
          </p>
          <div className="hero-actions">
            <a href="/register" className="btn-primary btn-primary-lg">
              Start the Game — It's Free
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
            </a>
            <a href="#how" className="btn-outline-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" /></svg>
              See How It Works
            </a>
          </div>

        </div>
      </section>

      {/*  ─── LIVE TICKER ────────────────────────────────────  */}
      <LiveTicker />

      {/*  ─── HOW IT WORKS ───────────────────────────────────  */}
      <div id="how" style={{ "maxWidth": "1200px", "margin": "0 auto" }}>
        <div className="section">
          <div className="section-header center reveal">
            <div className="section-tag">How It Works</div>
            <h2 className="section-title">Simple. Addictive. Rewarding.</h2>
            <p className="section-sub">Four steps stand between you and the top of the global leaderboard. No fees. No catches.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card reveal reveal-delay-1">
              <div className="step-num">01</div>
              <div className="step-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="#29BF12" strokeWidth="2" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <div className="step-title">Create Your Account</div>
              <div className="step-desc">Sign up in 30 seconds. Choose your leagues and set your prediction preferences. Free forever.</div>
            </div>
            <div className="step-card reveal reveal-delay-2">
              <div className="step-num">02</div>
              <div className="step-icon cyan">
                <svg viewBox="0 0 24 24" fill="none" stroke="#08BDBD" strokeWidth="2" width="22" height="22"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              <div className="step-title">Discover Matches & Clubs</div>
              <div className="step-desc">Browse leagues and clubs across every continent. Filter by competition or country.</div>
            </div>
            <div className="step-card reveal reveal-delay-3">
              <div className="step-num">03</div>
              <div className="step-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="#FF9914" strokeWidth="2" width="22" height="22"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div className="step-title">Make Predictions or Voting</div>
              <div className="step-desc">Predict results, exact scores, and first goalscorers. Set your confidence level to multiply your XP. Vote your teams</div>
            </div>
            <div className="step-card reveal reveal-delay-4">
              <div className="step-num">04</div>
              <div className="step-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="#F21B3F" strokeWidth="2" width="22" height="22"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </div>
              <div className="step-title">Climb & Win</div>
              <div className="step-desc">Earn XP, unlock trophies, and rise through global and friends leaderboards. Daily bonuses keep you ahead.</div>
            </div>
          </div>
        </div>
      </div>

      {/*  ─── FEATURES — Live Matches ───────────────────────  */}
      <div id="features" style={{ "background": "rgba(255,255,255,0.015)", "borderTop": "1px solid rgba(255,255,255,0.05)", "borderBottom": "1px solid rgba(255,255,255,0.05)" }}>
        <div className="section" style={{ "maxWidth": "1160px", "margin": "0 auto" }}>
          <div className="features-two-col">
            <div className="feature-list reveal">
              <div><div className="section-tag">Live Match Moments</div></div>
              <h2 className="section-title">Watch Your Predictions Unfold in Real-Time</h2>
              <p className="section-sub" style={{ "marginBottom": "32px" }}>Our live match experience shows you community prediction splits, momentum meters, and live match commentary — all while the game is happening.</p>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#29BF12" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div className="feature-item-body">
                  <div className="feature-item-title">Community Prediction Data</div>
                  <div className="feature-item-desc">See how 2.5k predictors voted on every match in real-time split bars.</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#08BDBD" strokeWidth="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <div className="feature-item-body">
                  <div className="feature-item-title">Momentum Meter</div>
                  <div className="feature-item-desc">Visual momentum bars showing which team is dominating possession and chances.</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#FF9914" strokeWidth="2" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <div className="feature-item-body">
                  <div className="feature-item-title">Match Commentary</div>
                  <div className="feature-item-desc">Providing viewers with minute-by-minute match details and events</div>
                </div>
              </div>
            </div>
            <div className="reveal reveal-delay-2">
              <div className="mock-card">
                <div className="mock-live-badge"><span className="mock-live-dot"></span> Live</div>
                <div className="mock-league-tag">Premier League · Matchday 34</div>
                <div className="mock-match">
                  <div className="mock-team">
                    <div className="mock-badge" style={{ "background": "#C8102E", "color": "#fff" }}>MU</div>
                    <div className="mock-team-name">Man United</div>
                  </div>
                  <div>
                    <div className="mock-score">1 – 2</div>
                    <div style={{ "fontSize": "0.65rem", "color": "#F21B3F", "textAlign": "center", "fontWeight": "800", "marginTop": "4px" }}>67'</div>
                  </div>
                  <div className="mock-team">
                    <div className="mock-badge" style={{ "background": "#EF0107", "color": "#fff" }}>ARS</div>
                    <div className="mock-team-name">Arsenal</div>
                  </div>
                </div>
                <div style={{ "fontSize": "0.65rem", "color": "rgba(255,255,255,0.4)", "textTransform": "uppercase", "letterSpacing": "1.5px", "marginBottom": "10px", "fontWeight": "700" }}>Community Predictions</div>
                <div className="mock-bars">
                  <div className="mock-bar-row">
                    <span style={{ "minWidth": "40px" }}>Home</span>
                    <div className="mock-bar-track"><div className="mock-bar-fill-g" style={{ "width": "42%" }}></div></div>
                    <span>42%</span>
                  </div>
                  <div className="mock-bar-row">
                    <span style={{ "minWidth": "40px" }}>Draw</span>
                    <div className="mock-bar-track"><div className="mock-bar-fill-o" style={{ "width": "18%" }}></div></div>
                    <span>18%</span>
                  </div>
                  <div className="mock-bar-row">
                    <span style={{ "minWidth": "40px" }}>Away</span>
                    <div className="mock-bar-track"><div className="mock-bar-fill-c" style={{ "width": "40%" }}></div></div>
                    <span>40%</span>
                  </div>
                </div>
                <div style={{ "marginTop": "16px", "paddingTop": "16px", "borderTop": "1px solid rgba(255,255,255,0.07)", "fontSize": "0.75rem", "display": "flex", "justifyContent": "space-between" }}>
                  <span style={{ "color": "rgba(255,255,255,0.4)" }}>24,891 predictions</span>
                  <span style={{ "color": "#29BF12", "fontWeight": "700" }}>Your pick: Away Win ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*  ─── FEATURES — Leaderboards ───────────────────────  */}
      <div>
        <div className="section" style={{ "maxWidth": "1160px", "margin": "0 auto" }}>
          <div className="features-two-col flip">
            <div className="reveal">
              <div className="mock-lb">
                <div className="mock-lb-header">
                  Global Leaderboard · This Week
                </div>
                <div className="mock-lb-row">
                  <div className="mock-lb-rank" style={{ "color": "#FF9914" }}>🥇</div>
                  <div className="mock-lb-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=marcus" alt="Marcus" /></div>
                  <div className="mock-lb-name">Marcus T. <span style={{ "fontSize": "0.7rem", "color": "rgba(255,255,255,0.4)" }}>🇩🇪</span></div>
                  <div className="mock-lb-badge badge-gold">Legend</div>
                  <div className="mock-lb-xp">142,880</div>
                </div>
                <div className="mock-lb-row">
                  <div className="mock-lb-rank" style={{ "color": "#94A3B8" }}>🥈</div>
                  <div className="mock-lb-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=alex" alt="Alex" /></div>
                  <div className="mock-lb-name">Alex K. <span style={{ "fontSize": "0.7rem", "color": "rgba(255,255,255,0.4)" }}>🇧🇷</span></div>
                  <div className="mock-lb-badge badge-plat">Diamond</div>
                  <div className="mock-lb-xp">89,420</div>
                </div>
                <div className="mock-lb-row">
                  <div className="mock-lb-rank" style={{ "color": "#CD7F32" }}>🥉</div>
                  <div className="mock-lb-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=sofia" alt="Sofia" /></div>
                  <div className="mock-lb-name">Sofia L. <span style={{ "fontSize": "0.7rem", "color": "rgba(255,255,255,0.4)" }}>🇫🇷</span></div>
                  <div className="mock-lb-badge badge-gold">Gold</div>
                  <div className="mock-lb-xp">76,150</div>
                </div>
                <div className="mock-lb-row">
                  <div className="mock-lb-rank" style={{ "color": "rgba(255,255,255,0.4)" }}>#4</div>
                  <div className="mock-lb-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=yusuf" alt="Yusuf" /></div>
                  <div className="mock-lb-name">Yusuf A. <span style={{ "fontSize": "0.7rem", "color": "rgba(255,255,255,0.4)" }}>🇳🇬</span></div>
                  <div className="mock-lb-badge badge-gold">Gold</div>
                  <div className="mock-lb-xp">64,800</div>
                </div>
                <div className="mock-lb-row you">
                  <div className="mock-lb-rank" style={{ "color": "#29BF12" }}>#1,247</div>
                  <div className="mock-lb-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=kickoff" alt="You" /></div>
                  <div className="mock-lb-name"><strong>You</strong> <span style={{ "fontSize": "0.7rem", "color": "rgba(255,255,255,0.4)" }}>🇪🇬</span></div>
                  <div className="mock-lb-badge badge-you">Gold</div>
                  <div className="mock-lb-xp">12,450</div>
                </div>
              </div>
            </div>
            <div className="feature-list reveal reveal-delay-2">
              <div><div className="section-tag">Leaderboards</div></div>
              <h2 className="section-title">Prove You're the Best Predictor on Earth</h2>
              <p className="section-sub" style={{ "marginBottom": "32px" }}>Compete across global, continental, country, and friends leaderboards. Mini leagues let you challenge your squad privately.</p>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#29BF12" strokeWidth="2" width="20" height="20"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <div className="feature-item-body">
                  <div className="feature-item-title">6 Leaderboard Scopes</div>
                  <div className="feature-item-desc">Global, Continental, Country, Friends, League-specific, and Mini League boards.</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#08BDBD" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div className="feature-item-body">
                  <div className="feature-item-title">Private Mini Leagues</div>
                  <div className="feature-item-desc">Create your own league with a custom invite code for friends, family, or colleagues.</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#FF9914" strokeWidth="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                </div>
                <div className="feature-item-body">
                  <div className="feature-item-title">Weekly Resets + Seasons</div>
                  <div className="feature-item-desc">Weekly challenges reset every Monday. Season trophies awarded to top performers.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/*  ─── SCORING SYSTEM ─────────────────────────────────  */}
      <div id="scoring" style={{ "background": "rgba(255,255,255,0.015)", "borderTop": "1px solid rgba(255,255,255,0.05)", "borderBottom": "1px solid rgba(255,255,255,0.05)" }}>
        <div className="section" style={{ "maxWidth": "1160px", "margin": "0 auto" }}>
          <div className="section-header center reveal">
            <div className="section-tag">Scoring System</div>
            <h2 className="section-title">Every Correct Prediction and Vote Earns XP</h2>
            <p className="section-sub">A layered XP system that rewards accuracy, confidence, voting, and community. The bolder your prediction, the bigger the reward.</p>
          </div>
          <div className="scoring-grid">
            <div className="scoring-card reveal reveal-delay-1">
              <div className="scoring-xp" style={{ "color": "#29BF12" }}>+100 XP</div>
              <div className="scoring-action">Correct Result</div>
              <div className="scoring-desc">Predict the right winner or draw and earn base XP.</div>
            </div>
            <div className="scoring-card reveal reveal-delay-2">
              <div className="scoring-xp" style={{ "color": "#ABFF4F" }}>+200 XP</div>
              <div className="scoring-action">Exact Scoreline</div>
              <div className="scoring-desc">Nail the precise score for a massive XP bonus on top of the correct result.</div>
            </div>
            <div className="scoring-card reveal reveal-delay-3">
              <div className="scoring-xp" style={{ "color": "#08BDBD" }}>×1.4 – ×2.0</div>
              <div className="scoring-action">Confidence Multiplier</div>
              <div className="scoring-desc">Set your confidence from 50–100% to multiply XP earned on every correct prediction.</div>
            </div>
            <div className="scoring-card reveal reveal-delay-4">
              <div className="scoring-xp" style={{ "color": "#FF9914" }}>+150 XP</div>
              <div className="scoring-action">First Goalscorer</div>
              <div className="scoring-desc">Correctly predict which player scores first in the match.</div>
            </div>
            <div className="scoring-card reveal reveal-delay-1">
              <div className="scoring-xp" style={{ "color": "#F21B3F" }}>×2 XP</div>
              <div className="scoring-action">Streak Bonus</div>
              <div className="scoring-desc">Consecutive correct predictions double your XP gain — keep the streak alive!</div>
            </div>
            <div className="scoring-card reveal reveal-delay-2">
              <div className="scoring-xp" style={{ "color": "#ABFF4F" }}>+250 XP</div>
              <div className="scoring-action">Daily Spin Bonus</div>
              <div className="scoring-desc">Spin the wheel every day for bonus XP and prediction power-ups.</div>
            </div>
            <div className="scoring-card reveal reveal-delay-3">
              <div className="scoring-xp" style={{ "color": "#08BDBD" }}>+20 XP</div>
              <div className="scoring-action">Vote on a Match</div>
              <div className="scoring-desc">Cast your vote on any match outcome and earn XP just for participating — every vote counts.</div>
            </div>
            <div className="scoring-card reveal reveal-delay-4">
              <div className="scoring-xp" style={{ "color": "#29BF12" }}>+200 XP</div>
              <div className="scoring-action">Friend Invite</div>
              <div className="scoring-desc">Invite a friend to join Matchkoo and earn 200 XP as a thank-you bonus when they sign up.</div>
            </div>
          </div>
        </div>
      </div>


      {/*  ─── TESTIMONIALS ───────────────────────────────────  */}
      <div style={{ "maxWidth": "1200px", "margin": "0 auto" }}>
        <div className="section">
          <div className="section-header center reveal">
            <div className="section-tag">Community</div>
            <h2 className="section-title">Trusted by 2.5 Thousand Predictors</h2>
            <p className="section-sub">From hardcore fans to casual viewers, everyone has a shot at the top.</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card reveal reveal-delay-1">
              <div className="testimonial-stars">
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
              </div>
              <div className="testimonial-text">"I've tried every football prediction app and nothing compares to Matchkoo. The live match moments feature makes watching games 10x more intense."</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=marcus1" alt="Marcus" /></div>
                <div>
                  <div className="testimonial-name">Marcus T.</div>
                  <div className="testimonial-role">🇩🇪 Global Rank #1 · Legend</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card reveal reveal-delay-2">
              <div className="testimonial-stars">
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
              </div>
              <div className="testimonial-text">"The AFCON 2026 predictions league with my Egyptian friends has us sending voice notes before every match. Matchkoo is complete addiction."</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed1" alt="Ahmed" /></div>
                <div>
                  <div className="testimonial-name">Ahmed M.</div>
                  <div className="testimonial-role">🇪🇬 Africa Rank #38 · Gold</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card reveal reveal-delay-3">
              <div className="testimonial-stars">
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
                <svg viewBox="0 0 20 20" fill="#FF9914" width="16" height="16"><polygon points="10 1 12.39 6.26 18.18 7.27 14 11.14 14.97 16.9 10 14.27 5.03 16.9 6 11.14 1.82 7.27 7.61 6.26 10 1" /></svg>
              </div>
              <div className="testimonial-text">"78.4% accuracy this season. The confidence multiplier mechanic is genius — it punishes overconfidence and rewards bold, correct calls."</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=sofia1" alt="Sofia" /></div>
                <div>
                  <div className="testimonial-name">Sofia L.</div>
                  <div className="testimonial-role">🇫🇷 European Rank #12 · Gold</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*  ─── FAQ ────────────────────────────────────────────  */}
      <div id="faq" style={{ "background": "rgba(255,255,255,0.015)", "borderTop": "1px solid rgba(255,255,255,0.05)", "borderBottom": "1px solid rgba(255,255,255,0.05)" }}>
        <div className="section" style={{ "maxWidth": "1160px", "margin": "0 auto" }}>
          <div className="section-header center reveal">
            <div className="section-tag">FAQ</div>
            <h2 className="section-title">Got Questions?</h2>
          </div>
          <div className="faq-list reveal">
            <div className="faq-item open">
              <div className="faq-q" >
                Is Matchkoo completely free to use?
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              <div className="faq-a">Yes — Matchkoo is 100% free. No subscription, no in-app purchases, no premium tiers. Every feature including live match data, leaderboards, and mini leagues is available to all users at no cost.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q" >
                How does the XP and leveling system work?
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              <div className="faq-a">Every correct prediction earns you XP. The amount depends on prediction type (result, exact score, first scorer), your confidence level (50–100%), and whether you're on a streak. XP accumulates to advance you through Bronze → Silver → Gold → Platinum → Diamond → Legend tiers.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q" >
                Which leagues are supported?
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              <div className="faq-a">188 leagues across 6 continents — including Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, CAF Champions League, AFCON, Egyptian Premier League, Saudi Pro League, MLS, Brasileirão, J-League, and more. Plus every FIFA World Cup and UEFA Nations League match.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q" >
                What is a Mini League?
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              <div className="faq-a">Mini Leagues are private competitions you create and invite friends or colleagues to. You choose which competitions count, the scoring mode (standard XP or simple points), and the duration. Share your invite code and compete head-to-head.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q" >
                Can I predict in multiple languages?
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              <div className="faq-a">Yes. Matchkoo currently supports English, Arabic (with full RTL layout), German, Spanish, and French. Select your language from the preferences menu and the entire interface adapts instantly.</div>
            </div>
          </div>
        </div>
      </div>

      {/*  ─── CTA ─────────────────────────────────────────────  */}
      <section className="cta-section">
        <div className="cta-glow"></div>
        <div className="cta-card reveal">
          <div className="hero-kicker" style={{ "margin": "0 auto 24px", "display": "inline-flex" }}>
            <div className="hero-kicker-dot"></div>
            Free · No Credit Card Needed
          </div>
          <h2 className="cta-title">
            Ready to Prove You Know Football?
          </h2>
          <p className="cta-sub">Join 2.5 thousand predictors today. Your first prediction takes 30 seconds.</p>
          <div className="cta-actions">
            <a href="/register" className="btn-primary btn-primary-lg">
              Start Predicting Free
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
            </a>
          </div>
          <div className="cta-note">✓ Free forever &nbsp;&nbsp; ✓ 188 leagues &nbsp;&nbsp; ✓ 2.5k community</div>
        </div>
      </section>

      {/*  ─── FOOTER ──────────────────────────────────────────  */}
      <footer>
        <div className="footer">
          <div className="footer-brand">
            <div className="footer-brand-logo">
              <MatchkooLogo height={28} />
            </div>
            <div className="footer-brand-desc">The world's most intelligent football prediction platform. Compete, earn, and rise.</div>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <ul className="footer-links">
              <li><a href="/app">Dashboard</a></li>
              <li><a href="/app">Discover Matches</a></li>
              <li><a href="/app">Leaderboard</a></li>
              <li><a href="/app">Mini Leagues</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press Kit</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Legal</div>
            <ul className="footer-links">
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © 2025 Matchkoo. All rights reserved. Built for football fans, by football fans.
        </div>
      </footer>

      {/* Scroll reveal + FAQ accordion */}
      <ScrollReveal />
      <script dangerouslySetInnerHTML={{
        __html: `
    (function() {
      // FAQ accordion
      document.querySelectorAll('.faq-q').forEach(function(q) {
        q.addEventListener('click', function() {
          var item = q.closest('.faq-item');
          var isOpen = item.classList.contains('open');
          document.querySelectorAll('.faq-item').forEach(function(i) { i.classList.remove('open'); });
          if (!isOpen) item.classList.add('open');
        });
      });
    })();
  `}} />

    </div>
  );
}
