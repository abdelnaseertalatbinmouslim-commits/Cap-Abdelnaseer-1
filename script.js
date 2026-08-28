Enter/* =========================================================
   منصة الكابتن - Logic, Security & Telegram Bot Integration
   Developer: Eng. Abdelnaseer
   ========================================================= */

// Telegram Config
const TELEGRAM_BOT_TOKEN = "8944171880:AAFmbtL7TjB72ZtWKl4z_wjqlShSQFXkZpA";
const TELEGRAM_CHAT_ID = "1783950091830"; // ID التليجرام الخاص بك لاستقبال الإشعارات

// Encrypted Credentials (SHA-256 Hashes)
// Username: Abdelnaseertalat111 -> SHA256 Hash below
// Password: Abdelnaseertalat111# -> SHA256 Hash below
const ADMIN_USER_HASH = "d11b22292f7e029c7b41e860161474a0e980ebbeed89c47c0b05b38d335f6ea5";
const ADMIN_PASS_HASH = "a6c8e3ed3fbcfbe44cf885669b20bfa511ec7fca2a3f721ef6551b8efed1816e";

// State Management
let currentLevel = 1;
let currentTerm = 1;
let currentSection = 'summaries';

// Local Storage Initial Data Structure
let platformData = JSON.parse(localStorage.getItem('captain_platform_db')) || {
  title: "منصة الكابتن",
  heroImage: "1783950091830.jpg",
  levels: {
    1: { 1: { summaries: [], practical: [] }, 2: { summaries: [], practical: [] } },
    2: { 1: { summaries: [], practical: [] }, 2: { summaries: [], practical: [] } },
    3: { 1: { summaries: [], practical: [] }, 2: { summaries: [], practical: [] } },
    4: { 1: { summaries: [], practical: [] }, 2: { summaries: [], practical: [] } }
  }
};

// Utility: SHA-256 Encryption Function
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  loadPlatformSettings();
  
  // Theme Toggle Listener
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
  
  // Auth Modal Trigger
  document.getElementById('openAuthBtn').addEventListener('click', () => {
    openModal('authModal');
  });
});

// Theme Switcher Logic
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('captain_theme', newTheme);
  
  const themeBtn = document.getElementById('themeToggleBtn');
  themeBtn.innerHTML = newTheme === 'dark' 
    ? '<i class="fa-solid fa-moon"></i> الوضع الليلي' 
    : '<i class="fa-solid fa-sun"></i> الوضع النهارى';
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('captain_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Modal Handlers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Academic Level Interaction
function openLevelModal(level) {
  currentLevel = level;
  document.getElementById('modalLevelTitle').innerText = `الفرقة الدراسية رقم (${level})`;
  renderSubjectList();
  openModal('levelModal');
}

function switchTerm(term) {
  currentTerm = term;
  document.getElementById('term1Tab').classList.toggle('active', term === 1);
  document.getElementById('term2Tab').classList.toggle('active', term === 2);
  renderSubjectList();
}

function switchSection(section) {
  currentSection = section;
  document.getElementById('secSummariesBtn').classList.toggle('active', section === 'summaries');
  document.getElementById('secPracticalBtn').classList.toggle('active', section === 'practical');
  renderSubjectList();
}

function renderSubjectList() {
  const container = document.getElementById('subjectListContainer');
  const items = platformData.levels[currentLevel][currentTerm][currentSection] || [];

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 30px;">
        <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 10px;"></i>
        <p>لا توجد مواد أو ملفات مضافة في هذا القسم حالياً.</p>
      </div>`;
    return;
  }

  container.innerHTML = items.map((item, index) => `
    <div class="subject-item glass-panel">
      <div>
        <strong>${item.title}</strong>
      </div>
      <div>
        <a href="${item.link}" target="_blank" class="btn-glass" style="padding: 6px 12px; text-decoration: none;">
          <i class="fa-solid fa-download"></i> فتح / تحميل
        </a>
      </div>
    </div>
  `).join('');
}

// Authentication & Admin Access
function switchAuthMode(mode) {
  document.getElementById('loginForm').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('loginTabBtn').classList.toggle('active', mode === 'login');
  document.getElementById('registerTabBtn').classList.toggle('active', mode === 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  const inputUserHash = await hashString(user);
  const inputPassHash = await hashString(pass);

  if (inputUserHash === ADMIN_USER_HASH && inputPassHash === ADMIN_PASS_HASH) {
    closeModal('authModal');
    openModal('adminModal');
    alert('تم تسجيل الدخول بصلاحيات الأدمن بنجاح! مرحباً كابتن عبدالناصر.');
  } else {
    alert('عذراً، اسم المستخدم أو كلمة المرور غير صحيحة!');
  }
}

// Telegram Registration Notification
async function handleRegistration(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const level = document.getElementById('regLevel').value;
  const phone = document.getElementById('regPhone').value;

  const textMessage = `📬 *طلب انضمام جديد لمنصة الكابتن*\n\n👤 *الاسم:* ${name}\n🎓 *الفرقة:* ${level}\n📞 *الهاتف:* ${phone}`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textMessage,
        parse_mode: 'Markdown'
      })
    });
    alert('تم إرسال طلبك بنجاح للأدمن! سيتم التواصل معك للقبول.');
    closeModal('authModal');
  } catch (err) {
    alert('حدث خطأ أثناء الإرسال، برجاء المحاولة لاحقاً.');
  }
}

// Admin Panel Functions
function savePlatformSettings() {
  const newTitle = document.getElementById('adminPlatformTitle').value;
  const newImage = document.getElementById('adminHeroImage').value;

  platformData.title = newTitle;
  platformData.heroImage = newImage;

  localStorage.setItem('captain_platform_db', JSON.stringify(platformData));
  loadPlatformSettings();
  alert('تم حفظ إعدادات الواجهة والاسم بنجاح!');
}

function loadPlatformSettings() {
  document.getElementById('platformTitleDisplay').innerText = platformData.title;
  document.getElementById('heroImage').src = platformData.heroImage;
}

function addNewSubject() {
  const level = document.getElementById('adminAddLevel').value;
  const term = document.getElementById('adminAddTerm').value;
  const section = document.getElementById('adminAddSection').value;
  const title = document.getElementById('adminSubjectTitle').value.trim();
  const link = document.getElementById('adminSubjectLink').value.trim();

  if (!title || !link) {
    alert('برجاء كتابة العنوان والرابط بالكامل.');
    return;
  }

  platformData.levels[level][term][section].push({ title, link });
  localStorage.setItem('captain_platform_db', JSON.stringify(platformData));

  document.getElementById('adminSubjectTitle').value = '';
  document.getElementById('adminSubjectLink').value = '';

  alert('تمت إضافة المادة/التلخيص بنجاح إلى المنصة!');
}
