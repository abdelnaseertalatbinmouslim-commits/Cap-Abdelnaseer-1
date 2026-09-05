/* =========================================================
   الكوتش | المنصة التعليمية
   index.js
   Firebase Realtime Database - بدون Firebase Auth
   ========================================================= */

(function (window, document) {
  "use strict";

  /* =========================================================
     APP CONFIG
     ========================================================= */

  const APP = {
    name: "الكوتش",
    title: "الكوتش | المنصة التعليمية",
    version: "2.0.0",
    page: "index",

    firebase: {
      databaseURL: "https://abodaa-default-rtdb.firebaseio.com",
      projectId: "abodaa"
    },

    cache: {
      ttl: 60 * 1000,
      prefix: "coach_cache_"
    },

    storage: {
      student: "coach_student",
      theme: "coach_theme"
    }
  };

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  const $ = (selector, parent) => {
    try {
      return (parent || document).querySelector(selector);
    } catch (error) {
      return null;
    }
  };

  const $$ = (selector, parent) => {
    try {
      return Array.from((parent || document).querySelectorAll(selector));
    } catch (error) {
      return [];
    }
  };

  function safeString(value, fallback) {
    if (value === null || value === undefined) {
      return fallback || "";
    }

    return String(value);
  }

  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (isObject(value)) {
      return Object.keys(value).map(function (key) {
        const item = value[key];

        if (isObject(item) && item.id === undefined) {
          return Object.assign({ id: key }, item);
        }

        return item;
      });
    }

    return [];
  }

  function numberValue(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback || 0;
  }

  function normalizeText(value) {
    return safeString(value)
      .trim()
      .toLowerCase()
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ");
  }

  function escapeHtml(value) {
    return safeString(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value) {
    return numberValue(value, 0).toLocaleString("ar-EG");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function uid(prefix) {
    return (
      safeString(prefix || "id") +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  /* =========================================================
     STORAGE
     ========================================================= */

  function storageGet(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(
        key,
        typeof value === "string"
          ? value
          : JSON.stringify(value)
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /* ignore */
    }
  }

  /* =========================================================
     FIREBASE REST
     ========================================================= */

  function databaseUrl(path) {
    const cleanPath = safeString(path)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    return (
      APP.firebase.databaseURL +
      "/" +
      cleanPath +
      ".json"
    );
  }

  async function firebaseRequest(path, options) {
    const requestOptions = Object.assign(
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      },
      options || {}
    );

    const response = await fetch(
      databaseUrl(path),
      requestOptions
    );

    if (!response.ok) {
      throw new Error(
        "Firebase request failed: " +
        response.status
      );
    }

    return response.json();
  }

  async function dbGet(path, useCache) {
    const cacheKey =
      APP.cache.prefix +
      safeString(path);

    if (useCache !== false) {
      const cached = storageGet(cacheKey, null);

      if (
        cached &&
        cached.time &&
        Date.now() - cached.time < APP.cache.ttl
      ) {
        return cached.data;
      }
    }

    const data = await firebaseRequest(path);

    storageSet(cacheKey, {
      time: Date.now(),
      data: data
    });

    return data;
  }

  async function dbPost(path, data) {
    return firebaseRequest(path, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async function dbPut(path, data) {
    return firebaseRequest(path, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async function dbPatch(path, data) {
    return firebaseRequest(path, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  }

  function clearCache(path) {
    try {
      storageRemove(
        APP.cache.prefix + safeString(path)
      );
    } catch (error) {
      /* ignore */
    }
  }

  /* =========================================================
     UI
     ========================================================= */

  function getLoader() {
    return $("#globalLoader") ||
      $("#pageLoader") ||
      $(".global-loader") ||
      $(".page-loader");
  }

  function showLoader(message) {
    const loader = getLoader();

    if (!loader) {
      return;
    }

    const text =
      $(".loader-text", loader) ||
      $(".loading-text", loader);

    if (text && message) {
      text.textContent = message;
    }

    loader.hidden = false;
    loader.classList.add("active");
  }

  function hideLoader() {
    const loader = getLoader();

    if (!loader) {
      return;
    }

    loader.classList.remove("active");

    setTimeout(function () {
      loader.hidden = true;
    }, 250);
  }

  function getToastContainer() {
    let container =
      $("#toastContainer") ||
      $(".toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";

      document.body.appendChild(container);
    }

    return container;
  }

  function showToast(message, type) {
    if (!message) {
      return;
    }

    const container = getToastContainer();

    const toast = document.createElement("div");

    toast.className =
      "toast toast-" +
      safeString(type || "info");

    toast.setAttribute("role", "status");

    toast.innerHTML =
      '<span class="toast-message">' +
      escapeHtml(message) +
      "</span>";

    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    setTimeout(function () {
      toast.classList.remove("show");

      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3500);
  }

  /* =========================================================
     THEME
     ========================================================= */

  function applyTheme(theme) {
    const validTheme =
      theme === "light" ||
      theme === "dark"
        ? theme
        : "dark";

    document.documentElement.setAttribute(
      "data-theme",
      validTheme
    );

    storageSet(APP.storage.theme, validTheme);

    $$(
      '[data-theme-toggle], #themeToggle, .theme-toggle'
    ).forEach(function (button) {
      button.setAttribute(
        "aria-label",
        validTheme === "dark"
          ? "تفعيل الوضع الفاتح"
          : "تفعيل الوضع الداكن"
      );

      button.setAttribute(
        "title",
        validTheme === "dark"
          ? "الوضع الفاتح"
          : "الوضع الداكن"
      );
    });
  }

  function initTheme() {
    const saved =
      storageGet(APP.storage.theme, null);

    if (saved) {
      applyTheme(saved);
      return;
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    applyTheme(
      prefersDark
        ? "dark"
        : "light"
    );
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute(
        "data-theme"
      ) || "dark";

    applyTheme(
      current === "dark"
        ? "light"
        : "dark"
    );
  }

  /* =========================================================
     MOBILE MENU
     ========================================================= */

  function initMobileMenu() {
    const buttons = $$(
      '[data-menu-toggle], #mobileMenuToggle, .menu-toggle'
    );

    const menu =
      $("#mobileNav") ||
      $(".mobile-nav") ||
      $("#mobileMenu");

    if (!menu) {
      return;
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        const opened =
          menu.classList.toggle("open") ||
          menu.classList.contains("active");

        button.setAttribute(
          "aria-expanded",
          opened ? "true" : "false"
        );

        document.body.classList.toggle(
          "menu-open",
          opened
        );
      });
    });

    $$("a", menu).forEach(function (link) {
      link.addEventListener("click", function () {
        menu.classList.remove("open");
        menu.classList.remove("active");

        document.body.classList.remove(
          "menu-open"
        );
      });
    });
  }

  /* =========================================================
     AUTH - CUSTOM STUDENT SESSION
     ========================================================= */

  function getCurrentStudent() {
    const student =
      storageGet(
        APP.storage.student,
        null
      );

    if (!student || !isObject(student)) {
      return null;
    }

    return student;
  }

  function setCurrentStudent(student) {
    if (!student) {
      storageRemove(APP.storage.student);
      return;
    }

    storageSet(
      APP.storage.student,
      student
    );
  }

  function logoutStudent() {
    storageRemove(APP.storage.student);

    window.location.href = "index.html";
  }

  function getStudentKey(student) {
    if (!student) {
      return "";
    }

    return safeString(
      student.studentKey ||
      student.key ||
      student.id ||
      student.uid ||
      student.phone
    );
  }

  /* =========================================================
     HEADER AUTH UI
     ========================================================= */

  function updateAuthUI() {
    const student =
      getCurrentStudent();

    const loginButtons = $$(
      '[data-login], .login-btn, #loginBtn'
    );

    const registerButtons = $$(
      '[data-register], .register-btn, #registerBtn'
    );

    const profileButtons = $$(
      '[data-profile], .profile-btn'
    );

    const logoutButtons = $$(
      '[data-logout], .logout-btn'
    );

    const userElements = $$(
      "[data-student-name], .student-name"
    );

    if (student) {
      loginButtons.forEach(function (button) {
        button.hidden = true;
      });

      registerButtons.forEach(function (button) {
        button.hidden = true;
      });

      profileButtons.forEach(function (button) {
        button.hidden = false;
      });

      logoutButtons.forEach(function (button) {
        button.hidden = false;
      });

      userElements.forEach(function (element) {
        element.textContent =
          safeString(
            student.name,
            "الطالب"
          );
      });
    } else {
      profileButtons.forEach(function (button) {
        button.hidden = true;
      });

      logoutButtons.forEach(function (button) {
        button.hidden = true;
      });

      loginButtons.forEach(function (button) {
        button.hidden = false;
      });

      registerButtons.forEach(function (button) {
        button.hidden = false;
      });
    }
  }

  /* =========================================================
     SUBJECTS
     ========================================================= */

  const DEFAULT_SUBJECTS = [
    {
      id: "anatomy",
      name: "التشريح",
      title: "التشريح",
      term: "الفصل الأول",
      termNumber: 1,
      description:
        "محتوى مادة التشريح والمصادر التعليمية.",
      icon: "🫀"
    },
    {
      id: "physiology",
      name: "الفسيولوجي",
      title: "الفسيولوجي",
      term: "الفصل الأول",
      termNumber: 1,
      description:
        "محتوى مادة الفسيولوجي والمصادر التعليمية.",
      icon: "🧠"
    },
    {
      id: "english",
      name: "اللغة الإنجليزية",
      title: "اللغة الإنجليزية",
      term: "الفصل الأول",
      termNumber: 1,
      description:
        "محتوى اللغة الإنجليزية والمصادر التعليمية.",
      icon: "📚"
    },
    {
      id: "fencing",
      name: "رياضة المبارزة",
      title: "رياضة المبارزة",
      term: "الفصل الأول",
      termNumber: 1,
      description:
        "محتوى رياضة المبارزة.",
      icon: "🤺",
      paid: true
    },
    {
      id: "sport-anatomy",
      name: "التشريح الرياضي",
      title: "التشريح الرياضي",
      term: "الفصل الأول",
      termNumber: 1,
      description:
        "محتوى التشريح الرياضي.",
      icon: "🏃"
    },
    {
      id: "communication",
      name: "الاتصال والتواصل",
      title: "الاتصال والتواصل",
      term: "الفصل الأول",
      termNumber: 1,
      description:
        "محتوى الاتصال والتواصل.",
      icon: "💬"
    },
    {
      id: "movement",
      name: "الحركة",
      title: "الحركة",
      term: "الفصل الثاني",
      termNumber: 2,
      description:
        "محتوى مادة الحركة.",
      icon: "🏃"
    },
    {
      id: "training",
      name: "التدريب",
      title: "التدريب",
      term: "الفصل الثاني",
      termNumber: 2,
      description:
        "محتوى مادة التدريب.",
      icon: "🏋️",
      paid: true
    },
    {
      id: "psychology",
      name: "علم النفس",
      title: "علم النفس",
      term: "الفصل الثاني",
      termNumber: 2,
      description:
        "محتوى علم النفس.",
      icon: "🧩",
      paid: true
    }
  ];

  function getSubjectName(subject) {
    if (!subject) {
      return "مادة";
    }

    return safeString(
      subject.name ||
      subject.title ||
      subject.subjectName ||
      subject.label,
      "مادة"
    );
  }

  function getSubjectId(subject) {
    if (!subject) {
      return "";
    }

    return safeString(
      subject.id ||
      subject.key ||
      subject.subjectId ||
      subject.slug
    );
  }

  function getSubjectTerm(subject) {
    if (!subject) {
      return "";
    }

    const term =
      subject.term ||
      subject.semester ||
      subject.termName ||
      subject.season;

    if (term) {
      return safeString(term);
    }

    const number =
      numberValue(
        subject.termNumber ||
        subject.term,
        0
      );

    if (number === 1) {
      return "الفصل الأول";
    }

    if (number === 2) {
      return "الفصل الثاني";
    }

    return "";
  }

  function getSubjectIcon(subject) {
    return safeString(
      subject &&
      (
        subject.icon ||
        subject.emoji
      ),
      "📘"
    );
  }

  function normalizeSubject(item, key) {
    const subject =
      isObject(item)
        ? Object.assign({}, item)
        : {};

    if (!subject.id) {
      subject.id =
        key ||
        uid("subject");
    }

    subject.name =
      getSubjectName(subject);

    subject.title =
      safeString(
        subject.title,
        subject.name
      );

    subject.term =
      getSubjectTerm(subject);

    subject.icon =
      getSubjectIcon(subject);

    return subject;
  }

  async function loadSubjects() {
    const paths = [
      "subjects",
      "courses/subjects",
      "courses"
    ];

    for (const path of paths) {
      try {
        const data =
          await dbGet(path);

        const subjects =
          toArray(data)
            .map(function (item) {
              return normalizeSubject(
                item,
                item && item.id
              );
            })
            .filter(function (item) {
              return !!getSubjectName(item);
            });

        if (subjects.length) {
          return subjects;
        }
      } catch (error) {
        console.warn(
          "تعذر تحميل:",
          path,
          error
        );
      }
    }

    return DEFAULT_SUBJECTS;
  }

  function subjectCard(subject) {
    const id =
      getSubjectId(subject);

    const name =
      getSubjectName(subject);

    const term =
      getSubjectTerm(subject);

    const description =
      safeString(
        subject.description,
        "استكشف محتوى المادة والمصادر التعليمية."
      );

    const icon =
      getSubjectIcon(subject);

    const paid =
      subject.paid === true ||
      subject.isPaid === true ||
      normalizeText(
        subject.type
      ) === "paid";

    return `
      <article
        class="subject-card"
        data-subject-id="${escapeHtml(id)}"
      >
        <div class="subject-card-icon">
          ${escapeHtml(icon)}
        </div>

        <div class="subject-card-content">
          ${
            term
              ? `<span class="subject-term">${escapeHtml(term)}</span>`
              : ""
          }

          <h3>
            ${escapeHtml(name)}
          </h3>

          <p>
            ${escapeHtml(description)}
          </p>

          ${
            paid
              ? `
                <span class="subject-badge paid">
                  مدفوعة
                </span>
              `
              : ""
          }
        </div>

        <div class="subject-card-arrow">
          ←
        </div>
      </article>
    `;
  }

  function renderSubjects(subjects) {
    const containers = [
      $("#coursesPreview"),
      $("#subjectsPreview"),
      $("#subjectsGrid"),
      $(".subjects-grid")
    ].filter(Boolean);

    if (!containers.length) {
      return;
    }

    const html =
      subjects
        .map(subjectCard)
        .join("");

    containers.forEach(function (container) {
      container.innerHTML =
        html ||
        `
          <div class="empty-state">
            لا توجد مواد متاحة حالياً.
          </div>
        `;

      $$(".subject-card", container)
        .forEach(function (card) {
          card.addEventListener(
            "click",
            function () {
              const id =
                card.dataset.subjectId;

              if (!id) {
                return;
              }

              window.location.href =
                "subject.html?id=" +
                encodeURIComponent(id);
            }
          );
        });
    });
  }

  /* =========================================================
     FILES
     ========================================================= */

  function normalizeFile(item, key) {
    const file =
      isObject(item)
        ? Object.assign({}, item)
        : {};

    file.id =
      file.id ||
      key ||
      uid("file");

    file.title =
      safeString(
        file.title ||
        file.name,
        "ملف تعليمي"
      );

    file.url =
      safeString(
        file.url ||
        file.pdfUrl ||
        file.fileUrl ||
        file.link ||
        file.downloadURL ||
        file.downloadUrl
      );

    file.subject =
      safeString(
        file.subject ||
        file.subjectId,
        ""
      );

    return file;
  }

  async function loadFiles() {
    try {
      const data =
        await dbGet("files");

      return toArray(data)
        .map(function (item) {
          return normalizeFile(
            item,
            item && item.id
          );
        });
    } catch (error) {
      console.warn(
        "تعذر تحميل الملفات",
        error
      );

      return [];
    }
  }

  /* =========================================================
     VIDEOS
     ========================================================= */

  function normalizeVideo(item, key) {
    const video =
      isObject(item)
        ? Object.assign({}, item)
        : {};

    video.id =
      video.id ||
      key ||
      uid("video");

    video.title =
      safeString(
        video.title ||
        video.name,
        "فيديو تعليمي"
      );

    video.url =
      safeString(
        video.url ||
        video.videoUrl ||
        video.link ||
        video.sourceUrl ||
        video.embedUrl ||
        video.video
      );

    video.subject =
      safeString(
        video.subject ||
        video.subjectId,
        ""
      );

    return video;
  }

  async function loadVideos() {
    try {
      const data =
        await dbGet("videos");

      return toArray(data)
        .map(function (item) {
          return normalizeVideo(
            item,
            item && item.id
          );
        });
    } catch (error) {
      console.warn(
        "تعذر تحميل الفيديوهات",
        error
      );

      return [];
    }
  }

  /* =========================================================
     QUIZZES
     ========================================================= */

  function normalizeQuiz(item, key) {
    const quiz =
      isObject(item)
        ? Object.assign({}, item)
        : {};

    quiz.id =
      quiz.id ||
      key ||
      uid("quiz");

    quiz.title =
      safeString(
        quiz.title ||
        quiz.name,
        "اختبار"
      );

    quiz.questions =
      Array.isArray(
        quiz.questions
      )
        ? quiz.questions
        : toArray(
            quiz.questions
          );

    return quiz;
  }

  async function loadQuizzes() {
    try {
      const data =
        await dbGet("quizzes");

      return toArray(data)
        .map(function (item) {
          return normalizeQuiz(
            item,
            item && item.id
          );
        });
    } catch (error) {
      console.warn(
        "تعذر تحميل الاختبارات",
        error
      );

      return [];
    }
  }

  /* =========================================================
     STATS
     ========================================================= */

  async function loadStats() {
    const results = {
      subjects: 0,
      files: 0,
      videos: 0,
      quizzes: 0,
      visitors: 0,
      online: 0
    };

    try {
      const [
        subjects,
        files,
        videos,
        quizzes
      ] = await Promise.all([
        loadSubjects(),
        loadFiles(),
        loadVideos(),
        loadQuizzes()
      ]);

      results.subjects =
        subjects.length;

      results.files =
        files.length;

      results.videos =
        videos.length;

      results.quizzes =
        quizzes.length;
    } catch (error) {
      console.warn(
        "تعذر تحميل الإحصائيات",
        error
      );
    }

    try {
      const stats =
        await dbGet("stats");

      if (stats) {
        results.visitors =
          numberValue(
            stats.visitorsCount,
            0
          );

        results.online =
          numberValue(
            stats.onlineNow,
            0
          );
      }
    } catch (error) {
      console.warn(
        "تعذر تحميل stats",
        error
      );
    }

    renderStats(results);

    return results;
  }

  function renderStats(stats) {
    const mappings = {
      subjects: [
        "#subjectsCount",
        "[data-stat='subjects']"
      ],
      files: [
        "#filesCount",
        "[data-stat='files']"
      ],
      videos: [
        "#videosCount",
        "[data-stat='videos']"
      ],
      quizzes: [
        "#quizzesCount",
        "[data-stat='quizzes']"
      ],
      visitors: [
        "#visitorsCount",
        "[data-stat='visitors']"
      ],
      online: [
        "#onlineCount",
        "[data-stat='online']"
      ]
    };

    Object.keys(mappings)
      .forEach(function (key) {
        mappings[key].forEach(function (
          selector
        ) {
          $$(selector).forEach(function (
            element
          ) {
            element.textContent =
              formatNumber(
                stats[key]
              );
          });
        });
      });
  }

  /* =========================================================
     SUPPORT TICKETS
     ========================================================= */

  function collectSupportForm(form) {
    const data = {};

    $$("input, textarea, select", form)
      .forEach(function (field) {
        if (!field.name) {
          return;
        }

        data[field.name] =
          field.value.trim();
      });

    return data;
  }

  async function submitSupportTicket(form) {
    const formData =
      collectSupportForm(form);

    const student =
      getCurrentStudent();

    const ticket = {
      name:
        formData.name ||
        formData.studentName ||
        (student && student.name) ||
        "",

      phone:
        formData.phone ||
        (student && student.phone) ||
        "",

      email:
        formData.email ||
        "",

      subject:
        formData.subject ||
        formData.title ||
        "طلب دعم",

      message:
        formData.message ||
        formData.body ||
        "",

      category:
        formData.category ||
        "general",

      status: "open",

      studentId:
        student
          ? getStudentKey(student)
          : "",

      createdAt:
        Date.now()
    };

    if (!ticket.message) {
      showToast(
        "اكتب رسالتك أولاً.",
        "error"
      );

      return false;
    }

    try {
      await dbPost(
        "supportTickets",
        ticket
      );

      form.reset();

      showToast(
        "تم إرسال طلب الدعم بنجاح.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Support ticket error:",
        error
      );

      showToast(
        "تعذر إرسال الطلب حالياً، حاول مرة أخرى.",
        "error"
      );

      return false;
    }
  }

  function initSupportForms() {
    $$(
      "form[data-support-form], #supportForm, .support-form"
    ).forEach(function (form) {
      form.addEventListener(
        "submit",
        async function (event) {
          event.preventDefault();

          const submitButton =
            $("button[type='submit']", form);

          if (submitButton) {
            submitButton.disabled = true;
          }

          try {
            await submitSupportTicket(
              form
            );
          } finally {
            if (submitButton) {
              submitButton.disabled = false;
            }
          }
        }
      );
    });
  }

  /* =========================================================
     REVEAL ANIMATIONS
     ========================================================= */

  function initReveal() {
    const elements =
      $$(
        "[data-reveal], .reveal, .animate-on-scroll"
      );

    if (!elements.length) {
      return;
    }

    if (
      !("IntersectionObserver" in window)
    ) {
      elements.forEach(function (element) {
        element.classList.add(
          "is-visible"
        );
      });

      return;
    }

    const observer =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (
              entry.isIntersecting
            ) {
              entry.target.classList.add(
                "is-visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          });
        },
        {
          threshold: 0.12
        }
      );

    elements.forEach(function (element) {
      observer.observe(element);
    });
  }

  /* =========================================================
     SMOOTH NAVIGATION
     ========================================================= */

  function initNavigation() {
    $$("a[href^='#']").forEach(
      function (link) {
        link.addEventListener(
          "click",
          function (event) {
            const href =
              link.getAttribute("href");

            if (
              !href ||
              href === "#"
            ) {
              return;
            }

            const target =
              $(href);

            if (!target) {
              return;
            }

            event.preventDefault();

            target.scrollIntoView({
              behavior:
                window.matchMedia &&
                window.matchMedia(
                  "(prefers-reduced-motion: reduce)"
                ).matches
                  ? "auto"
                  : "smooth",
              block: "start"
            });

            history.replaceState(
              null,
              "",
              href
            );
          }
        );
      }
    );
  }

  /* =========================================================
     LOGIN / REGISTER NAVIGATION
     ========================================================= */

  function initAuthNavigation() {
    $$(
      '[data-login], .login-btn, #loginBtn'
    ).forEach(function (button) {
      button.addEventListener(
        "click",
        function () {
          window.location.href =
            "login.html";
        }
      );
    });

    $$(
      '[data-register], .register-btn, #registerBtn'
    ).forEach(function (button) {
      button.addEventListener(
        "click",
        function () {
          window.location.href =
            "register.html";
        }
      );
    });

    $$(
      '[data-profile], .profile-btn'
    ).forEach(function (button) {
      button.addEventListener(
        "click",
        function () {
          window.location.href =
            "profile.html";
        }
      );
    });

    $$(
      '[data-logout], .logout-btn'
    ).forEach(function (button) {
      button.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          logoutStudent();
        }
      );
    });
  }

  /* =========================================================
     INSTALL APP
     ========================================================= */

  let deferredInstallPrompt = null;

  function initInstallPrompt() {
    window.addEventListener(
      "beforeinstallprompt",
      function (event) {
        event.preventDefault();

        deferredInstallPrompt =
          event;

        $$(
          "[data-install], #installApp"
        ).forEach(function (button) {
          button.hidden = false;
        });
      }
    );

    $$(
      "[data-install], #installApp"
    ).forEach(function (button) {
      button.addEventListener(
        "click",
        async function () {
          if (!deferredInstallPrompt) {
            showToast(
              "التثبيت غير متاح حالياً من هذا المتصفح.",
              "info"
            );

            return;
          }

          deferredInstallPrompt.prompt();

          try {
            await deferredInstallPrompt.userChoice;
          } catch (error) {
            /* ignore */
          }

          deferredInstallPrompt = null;

          button.hidden = true;
        }
      );
    });
  }

  /* =========================================================
     ONLINE STATUS
     ========================================================= */

  function updateOnlineStatus() {
    const online =
      navigator.onLine;

    document.body.classList.toggle(
      "offline",
      !online
    );

    $$(
      "[data-online-status]"
    ).forEach(function (element) {
      element.textContent =
        online
          ? "متصل"
          : "غير متصل";
    });
  }

  /* =========================================================
     WELCOME MESSAGE
     ========================================================= */

  function renderWelcome() {
    const student =
      getCurrentStudent();

    if (!student) {
      return;
    }

    $$(
      "[data-welcome]"
    ).forEach(function (element) {
      element.textContent =
        "أهلاً يا " +
        safeString(
          student.name,
          "طالب"
        );
    });
  }

  /* =========================================================
     LAST ACTIVE
     ========================================================= */

  async function updateStudentActivity() {
    const student =
      getCurrentStudent();

    if (!student) {
      return;
    }

    const key =
      getStudentKey(student);

    if (!key) {
      return;
    }

    /*
      مهم:
      لا نقوم بتغيير بيانات الطالب
      إلا إذا كان لدينا مفتاح واضح.
    */

    try {
      await dbPatch(
        "students/" +
        encodeURIComponent(key),
        {
          lastActive: Date.now()
        }
      );

      student.lastActive =
        Date.now();

      setCurrentStudent(student);
    } catch (error) {
      /*
        فشل تحديث النشاط لا يمنع
        الطالب من استخدام المنصة.
      */

      console.warn(
        "تعذر تحديث نشاط الطالب",
        error
      );
    }
  }

  /* =========================================================
     FIREBASE CONNECTIVITY CHECK
     ========================================================= */

  async function checkFirebase() {
    try {
      const response =
        await fetch(
          databaseUrl("stats"),
          {
            method: "GET",
            cache: "no-store"
          }
        );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /* =========================================================
     PAGE VISIBILITY
     ========================================================= */

  function initVisibility() {
    document.addEventListener(
      "visibilitychange",
      function () {
        if (
          document.visibilityState ===
          "visible"
        ) {
          updateOnlineStatus();
        }
      }
    );
  }

  /* =========================================================
     ERROR HANDLING
     ========================================================= */

  window.addEventListener(
    "error",
    function (event) {
      console.error(
        "Application error:",
        event.error || event.message
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    function (event) {
      console.error(
        "Unhandled promise rejection:",
        event.reason
      );
    }
  );

  /* =========================================================
     MAIN INIT
     ========================================================= */

  async function init() {
    try {
      initTheme();
      initMobileMenu();
      initNavigation();
      initAuthNavigation();
      initSupportForms();
      initReveal();
      initInstallPrompt();
      initVisibility();

      updateOnlineStatus();

      window.addEventListener(
        "online",
        updateOnlineStatus
      );

      window.addEventListener(
        "offline",
        updateOnlineStatus
      );

      updateAuthUI();
      renderWelcome();

      /*
        تحميل المحتوى الأساسي.
        كل عملية مستقلة حتى لا يؤدي
        فشل واحدة إلى سقوط الصفحة.
      */

      showLoader(
        "جاري تحميل محتوى المنصة..."
      );

      const subjects =
        await loadSubjects();

      renderSubjects(subjects);

      await loadStats();

      hideLoader();

      /*
        تحديث النشاط في الخلفية فقط.
      */
      if (getCurrentStudent()) {
        updateStudentActivity();
      }

      /*
        فحص Firebase بدون تعطيل الصفحة.
      */
      checkFirebase().then(
        function (connected) {
          document.body.classList.toggle(
            "firebase-online",
            connected
          );

          document.body.classList.toggle(
            "firebase-offline",
            !connected
          );
        }
      );

    } catch (error) {
      console.error(
        "Initialization error:",
        error
      );

      hideLoader();

      showToast(
        "تم تشغيل المنصة، لكن بعض المحتوى قد يتأخر في الظهور.",
        "warning"
      );
    }
  }

  /* =========================================================
     GLOBAL API
     ========================================================= */

  window.CapIndex = {
    APP: APP,

    firebase: {
      get: dbGet,
      post: dbPost,
      put: dbPut,
      patch: dbPatch,
      clearCache: clearCache
    },

    auth: {
      getCurrentStudent:
        getCurrentStudent,

      setCurrentStudent:
        setCurrentStudent,

      logout:
        logoutStudent
    },

    subjects: {
      load:
        loadSubjects,

      render:
        renderSubjects
    },

    content: {
      loadFiles:
        loadFiles,

      loadVideos:
        loadVideos,

      loadQuizzes:
        loadQuizzes
    },

    support: {
      submit:
        submitSupportTicket
    },

    ui: {
      toast:
        showToast,

      loader: {
        show:
          showLoader,

        hide:
          hideLoader
      },

      theme: {
        apply:
          applyTheme,

        toggle:
          toggleTheme
      }
    }
  };

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})(window, document);