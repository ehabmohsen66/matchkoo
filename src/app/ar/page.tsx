import '../landing.css';
import Link from 'next/link';
import MatchkooLogo from '@/components/MatchkooLogo';
import ScrollReveal from '@/components/ScrollReveal';

export const metadata = {
  title: 'ماتشكو — منصة التنبؤ بنتائج كرة القدم',
  description: 'انضم إلى 2.5 ألف متنبئ على ماتشكو. تنبأ بنتائج المباريات واكسب نقاطاً وتنافس عبر 188 دوري.',
};

export default function HomeAr() {
  return (
    <div className="landing-page-container bg-[var(--ink)] text-[var(--white)]" dir="rtl" lang="ar" style={{fontFamily:"'Tajawal', sans-serif"}}>

  {/* NAVBAR */}
  <nav className="nav" id="navbar" style={{flexDirection:'row-reverse'}}>
    <a className="nav-logo" href="/ar">
      <MatchkooLogo height={32} />
    </a>
    <ul className="nav-links" style={{flexDirection:'row-reverse'}}>
      <li><a href="#how">كيف يعمل</a></li>
      <li><a href="#features">المميزات</a></li>
      <li><a href="#scoring">نظام النقاط</a></li>
      <li><a href="#faq">الأسئلة الشائعة</a></li>
    </ul>
    <div className="nav-cta" style={{flexDirection:'row-reverse'}}>
      <a href="/" style={{"padding":"7px 14px","border":"1px solid rgba(255,255,255,0.15)","borderRadius":"100px","fontSize":"0.8rem","fontWeight":"700","color":"rgba(255,255,255,0.7)","textDecoration":"none","transition":"all 0.2s","display":"inline-flex","alignItems":"center","gap":"5px"}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
        EN
      </a>
      <a href="/ar/login" className="btn-ghost">تسجيل الدخول</a>
      <a href="/ar/register" className="btn-primary">
        العب مجاناً
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M17 10a.75.75 0 00-.75-.75H5.612l4.158-3.96a.75.75 0 00-1.04-1.08l-5.5 5.25a.75.75 0 000 1.08l5.5 5.25a.75.75 0 101.04-1.08L5.612 10.75H16.25A.75.75 0 0017 10z" clipRule="evenodd"/></svg>
      </a>
    </div>
  </nav>

  {/* HERO */}
  <section className="hero">
    <div className="hero-bg">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      <div className="hero-grid"></div>
    </div>
    <div className="hero-content" style={{position:'relative',zIndex:1,maxWidth:'900px'}}>
      <div className="hero-kicker" style={{flexDirection:'row-reverse'}}>
        <div className="hero-kicker-dot"></div>
        2.5 ألف متنبئ نشط الآن
      </div>
      <h1 className="hero-title" style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900}}>
        تنبأ بنتائج كرة القدم.<br />
        <span className="accent">تنافس. انتصر.</span>
      </h1>
      <p className="hero-sub">
        ماتشكو — منصة التنبؤ الأذكى لكرة القدم في العالم. راهن بنقاطك عبر 188 دوري، وتسلق قوائم الترتيب العالمية، وأثبت أنك تعرف الكرة أكثر من أي أحد.
      </p>
      <div className="hero-actions">
        <a href="/register" className="btn-primary btn-primary-lg" style={{flexDirection:'row-reverse'}}>
          ابدأ التنبؤ — مجاناً
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M17 10a.75.75 0 00-.75-.75H5.612l4.158-3.96a.75.75 0 00-1.04-1.08l-5.5 5.25a.75.75 0 000 1.08l5.5 5.25a.75.75 0 101.04-1.08L5.612 10.75H16.25A.75.75 0 0017 10z" clipRule="evenodd"/></svg>
        </a>
        <a href="#how" className="btn-outline-lg" style={{flexDirection:'row-reverse'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
          شاهد كيف يعمل
        </a>
      </div>
      <div className="hero-stats">
        <div className="hero-stat-item">
          <div className="hero-stat-num">2.5k</div>
          <div className="hero-stat-lbl">متنبئ</div>
        </div>
        <div className="hero-stat-divider"></div>
        <div className="hero-stat-item">
          <div className="hero-stat-num">188</div>
          <div className="hero-stat-lbl">دوري</div>
        </div>
        <div className="hero-stat-divider"></div>
        <div className="hero-stat-item">
          <div className="hero-stat-num">67.3%</div>
          <div className="hero-stat-lbl">متوسط الدقة</div>
        </div>
        <div className="hero-stat-divider"></div>
        <div className="hero-stat-item">
          <div className="hero-stat-num">#1</div>
          <div className="hero-stat-lbl">ترتيب أفريقيا</div>
        </div>
      </div>
    </div>
  </section>

  {/* LIVE TICKER */}
  <div className="ticker-wrap">
    <div className="ticker-inner">
      <div className="ticker-item"><span className="ticker-live"><span className="mock-live-dot"></span>مباشر</span><span>مان يونايتد</span><span className="ticker-score">1 – 2</span><span>أرسنال</span><span style={{"color":"#29BF12","fontSize":"0.72rem","fontWeight":"700"}}>67′</span></div>
      <div className="ticker-sep"></div>
      <div className="ticker-item"><span className="ticker-live"><span className="mock-live-dot"></span>مباشر</span><span>ريال مدريد</span><span className="ticker-score">2 – 0</span><span>برشلونة</span><span style={{"color":"#08BDBD","fontSize":"0.72rem","fontWeight":"700"}}>34′</span></div>
      <div className="ticker-sep"></div>
      <div className="ticker-item"><span style={{"color":"#ABFF4F","fontSize":"0.72rem","fontWeight":"700","letterSpacing":"1px"}}>نهاية</span><span>بايرن ميونخ</span><span className="ticker-score">3 – 1</span><span>دورتموند</span></div>
      <div className="ticker-sep"></div>
      <div className="ticker-item"><span className="ticker-live"><span className="mock-live-dot"></span>مباشر</span><span>باريس سان جيرمان</span><span className="ticker-score">1 – 1</span><span>ليون</span><span style={{"color":"#FF9914","fontSize":"0.72rem","fontWeight":"700"}}>78′</span></div>
      <div className="ticker-sep"></div>
      <div className="ticker-item"><span style={{"color":"#ABFF4F","fontSize":"0.72rem","fontWeight":"700","letterSpacing":"1px"}}>نهاية</span><span>الأهلي</span><span className="ticker-score">2 – 0</span><span>الوداد</span></div>
    </div>
  </div>

  {/* HOW IT WORKS */}
  <div id="how" style={{maxWidth:'1200px',margin:'0 auto'}}>
    <div className="section">
      <div className="section-header center reveal">
        <div className="section-tag">كيف يعمل</div>
        <h2 className="section-title" style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900}}>بسيط. مُسلٍّ. مجزٍ.</h2>
        <p className="section-sub">أربع خطوات تفصلك عن قمة الترتيب العالمي. مجاناً وبدون قيود.</p>
      </div>
      <div className="steps-grid">
        <div className="step-card reveal reveal-delay-1">
          <div className="step-num">01</div>
          <div className="step-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="#3CB82E" strokeWidth="2" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div className="step-title">أنشئ حسابك</div>
          <div className="step-desc">سجّل في 30 ثانية. اختر دورياتك المفضلة وابدأ التنبؤ. مجاناً للأبد.</div>
        </div>
        <div className="step-card reveal reveal-delay-2">
          <div className="step-num">02</div>
          <div className="step-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="#08BDBD" strokeWidth="2" width="22" height="22"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <div className="step-title">اكتشف المباريات</div>
          <div className="step-desc">تصفّح 188 دوراً من كل القارات. صفّ حسب البطولة والتاريخ ودرجة الصعوبة.</div>
        </div>
        <div className="step-card reveal reveal-delay-3">
          <div className="step-num">03</div>
          <div className="step-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="#FF9914" strokeWidth="2" width="22" height="22"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div className="step-title">اصنع توقعاتك</div>
          <div className="step-desc">توقع النتائج والأهداف وأول هداف. حدد مستوى ثقتك لمضاعفة نقاطك.</div>
        </div>
        <div className="step-card reveal reveal-delay-4">
          <div className="step-num">04</div>
          <div className="step-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="#F21B3F" strokeWidth="2" width="22" height="22"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
          <div className="step-title">تسلق وانتصر</div>
          <div className="step-desc">اكسب نقاط الخبرة، افتح الكؤوس، وارتقِ في الترتيبات العالمية والإقليمية.</div>
        </div>
      </div>
    </div>
  </div>

  {/* STATS BAR */}
  <div style={{padding:'0 24px 80px'}}>
    <div className="stats-bar reveal" style={{maxWidth:'1000px',margin:'0 auto'}}>
      <div className="stat-item"><div className="stat-value">2.5k+</div><div className="stat-label">متنبئ نشط</div></div>
      <div className="stat-item"><div className="stat-value">188</div><div className="stat-label">دوري حول العالم</div></div>
      <div className="stat-item"><div className="stat-value">12.5M+</div><div className="stat-label">تنبؤ تم تسجيله</div></div>
      <div className="stat-item"><div className="stat-value">67.3%</div><div className="stat-label">متوسط دقة المتصدرين</div></div>
    </div>
  </div>

  {/* SCORING */}
  <div id="scoring" style={{background:'rgba(255,255,255,0.015)',borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
    <div className="section" style={{maxWidth:'1160px',margin:'0 auto'}}>
      <div className="section-header center reveal">
        <div className="section-tag">نظام النقاط</div>
        <h2 className="section-title" style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900}}>كل توقع صحيح يكسبك نقاط خبرة</h2>
        <p className="section-sub">نظام نقاط متعدد الطبقات يكافئ الدقة والثقة والاتساق.</p>
      </div>
      <div className="scoring-grid">
        <div className="scoring-card reveal reveal-delay-1"><div className="scoring-xp" style={{color:'#3CB82E'}}>+100 XP</div><div className="scoring-action">النتيجة الصحيحة</div><div className="scoring-desc">توقع الفائز أو التعادل واكسب نقاطاً أساسية.</div></div>
        <div className="scoring-card reveal reveal-delay-2"><div className="scoring-xp" style={{color:'#6FE840'}}>+500 XP</div><div className="scoring-action">النتيجة الدقيقة</div><div className="scoring-desc">أصب النتيجة بالضبط للحصول على مكافأة ضخمة.</div></div>
        <div className="scoring-card reveal reveal-delay-3"><div className="scoring-xp" style={{color:'#08BDBD'}}>×1.4 – ×2.0</div><div className="scoring-action">مضاعف الثقة</div><div className="scoring-desc">حدد مستوى ثقتك من 50-100% لمضاعفة نقاطك.</div></div>
        <div className="scoring-card reveal reveal-delay-4"><div className="scoring-xp" style={{color:'#FF9914'}}>+300 XP</div><div className="scoring-action">أول هداف</div><div className="scoring-desc">توقع من يسجل أول هدف في المباراة.</div></div>
        <div className="scoring-card reveal reveal-delay-1"><div className="scoring-xp" style={{color:'#F21B3F'}}>×2 XP</div><div className="scoring-action">مكافأة التتابع</div><div className="scoring-desc">التوقعات الصحيحة المتتالية تضاعف نقاطك.</div></div>
        <div className="scoring-card reveal reveal-delay-2"><div className="scoring-xp" style={{color:'#6FE840'}}>+250 XP</div><div className="scoring-action">مكافأة يومية</div><div className="scoring-desc">أدر العجلة يومياً للحصول على نقاط ومكافآت إضافية.</div></div>
      </div>
    </div>
  </div>

  {/* FAQ */}
  <div id="faq" style={{background:'rgba(255,255,255,0.015)',borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
    <div className="section" style={{maxWidth:'1160px',margin:'0 auto'}}>
      <div className="section-header center reveal">
        <div className="section-tag">الأسئلة الشائعة</div>
        <h2 className="section-title" style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900}}>هل لديك أسئلة؟</h2>
      </div>
      <div className="faq-list reveal">
        <div className="faq-item open">
          <div className="faq-q">
            هل ماتشكو مجاني بالكامل؟
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className="faq-a">نعم — ماتشكو مجاني 100%. لا اشتراكات، لا مشتريات داخل التطبيق. جميع المميزات متاحة لجميع المستخدمين بلا أي تكلفة.</div>
        </div>
        <div className="faq-item">
          <div className="faq-q">
            كيف يعمل نظام نقاط الخبرة والمستويات؟
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className="faq-a">كل توقع صحيح يكسبك نقاط خبرة. الكمية تعتمد على نوع التوقع ومستوى ثقتك وتتابع إصاباتك. تتراكم النقاط لترقيك عبر المستويات: برونز ← فضي ← ذهبي ← بلاتيني ← ألماسي ← أسطوري.</div>
        </div>
        <div className="faq-item">
          <div className="faq-q">
            ما هي الدوريات المدعومة؟
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className="faq-a">188 دوراً عبر 6 قارات — تشمل الدوري الإنجليزي الممتاز، لا ليغا، سيريا، البوندسليغا، الدوري المصري، الدوري السعودي، دوري أبطال أفريقيا، الكان، وكأس العالم.</div>
        </div>
        <div className="faq-item">
          <div className="faq-q">
            ما هو الدوري المصغر الخاص؟
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className="faq-a">الدوريات المصغرة منافسات خاصة تنشئها وتدعو إليها أصدقاءك أو زملاءك. أنت من يختار البطولات ونظام التسجيل والمدة.</div>
        </div>
      </div>
    </div>
  </div>

  {/* CTA */}
  <section className="cta-section">
    <div className="cta-glow"></div>
    <div className="cta-card reveal">
      <div className="hero-kicker" style={{margin:'0 auto 24px',display:'inline-flex',flexDirection:'row-reverse'}}>
        <div className="hero-kicker-dot"></div>
        مجاني · بدون بطاقة ائتمانية
      </div>
      <h2 className="cta-title" style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900}}>
        مستعد لتثبت أنك تعرف كرة القدم؟
      </h2>
      <p className="cta-sub">انضم إلى 2.5 ألف متنبئ اليوم. توقعك الأول يستغرق 30 ثانية.</p>
      <div className="cta-actions">
        <a href="/register" className="btn-primary btn-primary-lg" style={{flexDirection:'row-reverse'}}>
          ابدأ التنبؤ مجاناً
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M17 10a.75.75 0 00-.75-.75H5.612l4.158-3.96a.75.75 0 00-1.04-1.08l-5.5 5.25a.75.75 0 000 1.08l5.5 5.25a.75.75 0 101.04-1.08L5.612 10.75H16.25A.75.75 0 0017 10z" clipRule="evenodd"/></svg>
        </a>
      </div>
      <div className="cta-note">✓ مجاني للأبد &nbsp;&nbsp; ✓ 188 دوري &nbsp;&nbsp; ✓ 2.5 ألف منافس</div>
    </div>
  </section>

  {/* FOOTER */}
  <footer>
    <div className="footer" style={{direction:'rtl'}}>
      <div className="footer-brand">
        <div className="footer-brand-logo"><MatchkooLogo height={28} /></div>
        <div className="footer-brand-desc">منصة التنبؤ الأذكى لكرة القدم في العالم. تنافس، اكسب، وارتقِ.</div>
      </div>
      <div>
        <div className="footer-col-title">المنصة</div>
        <ul className="footer-links">
          <li><a href="/dashboard">لوحة التحكم</a></li>
          <li><a href="/dashboard">اكتشف المباريات</a></li>
          <li><a href="/dashboard">الترتيب</a></li>
          <li><a href="/dashboard">الدوريات المصغرة</a></li>
        </ul>
      </div>
      <div>
        <div className="footer-col-title">الشركة</div>
        <ul className="footer-links">
          <li><a href="#">من نحن</a></li>
          <li><a href="#">المدونة</a></li>
          <li><a href="#">الوظائف</a></li>
          <li><a href="#">حزمة الصحافة</a></li>
        </ul>
      </div>
      <div>
        <div className="footer-col-title">قانوني</div>
        <ul className="footer-links">
          <li><a href="#">سياسة الخصوصية</a></li>
          <li><a href="#">شروط الخدمة</a></li>
          <li><a href="#">سياسة الكوكيز</a></li>
          <li><a href="#">اتصل بنا</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-bottom">
      © 2025 ماتشكو. جميع الحقوق محفوظة. صُنع لعشاق كرة القدم، بواسطة عشاق كرة القدم.
    </div>
  </footer>

  <ScrollReveal />
  <script dangerouslySetInnerHTML={{ __html: `
    (function() {
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
