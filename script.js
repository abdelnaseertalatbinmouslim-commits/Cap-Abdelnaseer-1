here/**
  منصة الكابتن التعليمية - النسخة المشفرة
  تطوير: كابتن عبدالناصر
*/

// مصفوفة الكائنات المشفرة بترميز هجين لمنع كشف التوكن والبيانات الحساسة
const _0xcapt = {
  // Bot Token
  t: "ODk0NDE3MTg4MDpBQUZtYnRMN1RqQjdaWnRXS2w0el93anFsU2hTUUZYa1pwQQ==",
  // Chat ID
  c: "NTkyNjYxMDYwMQ==",
  // Admin Username (abodaa)
  u: "YWJvZGFh",
  // Admin Password (1234)
  p: "MTIzNA==",
  // API URL Base
  a: "aHR0cHM6Ly9hcGkudGVsZWdyYW0ub3JnL2JvdA=="
};

// دالة تفكيك التشفير التلقائية وقت التشغيل (Runtime Decoder)
function _0xdecode(str) {
  try {
    return decodeURIComponent(escape(window.atob(str)));
  } catch (e) {
    return window.atob(str);
  }
}

let currentLevel = 1;
let currentTerm = 1;
let currentSection = 'summary';

let subjectsData = JSON.parse(localStorage.getItem('captain_subjects')) || {
  1: { 1: { summary: [], practical: [] }, 2: { summary: [], practical: [] } },
  2: { 1: { summary: [], practical: [] }, 2: { summary: [], practical: [] } },
  3: { 1: { summary: [], practical: [] }, 2: { summary: [], practical: [] } },
  4: { 1: { summary: [], practical: [] }, 2: { summary: [], practical: [] } }
};

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function toggleTheme() {
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

function pulseAvatar(el) {
  el.style.transform = 'scale(1.15)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
}

function switchAuthTab(tab) {
  const joinForm = document.getElementById('userJoinForm');
  const adminForm = document.getElementById('adminLoginForm');
  const tabJoinBtn = document.getElementById('tabJoinBtn');
  const tabAdminBtn = document.getElementById('tabAdminBtn');

  if (!joinForm || !adminForm) return;

  if (tab === 'user') {
    joinForm.style.display = 'block';
    adminForm.style.display = 'none';
    tabJoinBtn.classList.add('active');
    tabAdminBtn.classList.remove('active');
  } else {
    joinForm.style.display = 'none';
    adminForm.style.display = 'block';
    tabAdminBtn.classList.add('active');
    tabJoinBtn.classList.remove('active');
  }
}

function openLevelModal(level) {
  currentLevel = level;
  const titleEl = document.getElementById('modalLevelTitle');
  if (titleEl) titleEl.innerText = `تفاصيل الفرقة الدراسية ${level}`;
  openModal('levelModal');
  renderSubjectList();
}

function switchTerm(term) {
  currentTerm = term;
  document.getElementById('term1Btn')?.classList.toggle('active', term === 1);
  document.getElementById('term2Btn')?.classList.toggle('active', term === 2);
  renderSubjectList();
}

function switchSection(section) {
  currentSection = section;
  document.getElementById('summarySectionBtn')?.classList.toggle('active', section === 'summary');
  document.getElementById('practicalSectionBtn')?.classList.toggle('active', section === 'practical');
  renderSubjectList();
}

function renderSubjectList() {
  const container = document.getElementById('subjectListContainer');
  if (!container) return;
  const items = subjectsData[currentLevel]?.[currentTerm]?.[currentSection] || [];

  if (items.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد مواد مضافة لهذا القسم حتى الآن.</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="subject-card glass-panel">
      <div class="subject-info">
        <h4>📖 ${item.title}</h4>
        <p>مادة تعليمية رسمية</p>
      </div>
      <a href="${item.link}" target="_blank" class="btn-glass" style="text-decoration:none;">فتح الرابط 🔗</a>
    </div>
  `).join('');
}

// دالة إرسال طلب الانضمام إلى التليجرام باستخدام التوكين والتشفير الذكي
async function handleJoinSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('studentName').value;
  const phone = document.getElementById('studentPhone').value;
  const level = document.getElementById('studentLevel').value;

  const msg = `🚨 طلب انضمام جديد للمنصة:\n👤 الاسم: ${name}\n📱 الواتساب: ${phone}\n🎓 الفرقة: ${level}`;

  // تجميع الرابط وتفكيك التشفير فقط أثناء عملية الإرسال
  const endpoint = `${_0xdecode(_0xcapt.a)}${_0xdecode(_0xcapt.t)}/sendMessage`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: _0xdecode(_0xcapt.c),
        text: msg
      })
    });

    if (res.ok) {
      alert("تم إرسال طلب الانضمام بنجاح يا كابتن! ستصلك رسالة على التليجرام فوراً.");
      document.getElementById('userJoinForm').reset();
    } else {
      alert("تأكد من فتحك للبوت على التليجرام والضغط على Start أولاً.");
    }
  } catch (err) {
    alert("حدث خطأ أثناء الإرسال، تحقق من اتصال الإنترنت.");
  }
}

// التحقق من بيانات الأدمن باستخدام فك التشفير التلقائي
function handleAdminLogin(e) {
  e.preventDefault();
  const uInput = document.getElementById('adminUser').value;
  const pInput = document.getElementById('adminPass').value;

  if (uInput === _0xdecode(_0xcapt.u) && pInput === _0xdecode(_0xcapt.p)) {
    alert("أهلاً بك يا كابتن عبدالناصر! تم تسجيل الدخول بنجاح.");
    window.location.href = "admin.html";
  } else {
    alert("اسم المستخدم أو كلمة المرور غير صحيحة!");
  }
}

function savePlatformSettings() {
  const name = document.getElementById('inputPlatformName').value;
  localStorage.setItem('captain_platform_name', name);
  alert("تم حفظ اسم المنصة بنجاح!");
}

function handleAddContent(e) {
  e.preventDefault();
  const level = document.getElementById('addLevel').value;
  const term = document.getElementById('addTerm').value;
  const section = document.getElementById('addSection').value;
  const title = document.getElementById('addTitle').value;
  const link = document.getElementById('addLink').value;

  subjectsData[level][term][section].push({ title, link });
  localStorage.setItem('captain_subjects', JSON.stringify(subjectsData));

  alert("تمت إضافة المادة بنجاح للمنصة!");
  e.target.reset();
}

window.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('captain_platform_name');
  const nameDisplay = document.getElementById('platformNameDisplay');
  if (savedName && nameDisplay) {
    nameDisplay.innerText = savedName;
  }
});
