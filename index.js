/* الكوتش | index.js
   الصفحة الرئيسية تعمل بدون Firebase.
   Firebase Realtime Database اختياري في الخلفية فقط.
   لا يوجد Firebase Authentication.
*/

(function () {
  "use strict";

  const APP = {
    name: "الكوتش",
    version: "2.1.0",
    databaseURL: "https://abodaa-default-rtdb.firebaseio.com",
    themeKey: "coach_theme",
    studentKey: "coach_student",
    cachePrefix: "coach_index_cache_",
    cacheTTL: 60000
  };

  /* =========================================================
     Helpers
  ========================================================= */

  const $ = (selector, root = document) => {
    try {
      return root.querySelector(selector);
    } catch {
      return null;
    }
  };

  const $$ = (selector, root = document) => {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  };

  const str = (value, fallback = "") =>
    value === null || value === undefined ? fallback : String(value);

  const escapeHTML = (value) =>
    str(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const arrayify = (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    return Object.entries(value).map(([key, item]) => {
      if (item && typeof item === "object" && !item.id) {
        return {
          id: key,
          ...item
        };
      }

      return item;
    });
  };

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);

        if (raw === null) {
          return fallback;
        }

        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(
          key,
          typeof value === "string"
            ? value
            : JSON.stringify(value)
        );
      } catch {}
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  };


  /* =========================================================
     Theme
  ========================================================= */

  function applyTheme(theme) {
    const value = theme === "light"
      ? "light"
      : "dark";

    document.documentElement.setAttribute(
      "data-theme",
      value
    );

    storage.set(APP.themeKey, value);

    const button = $("#themeToggle");

    if (button) {
      button.setAttribute(
        "aria-label",
        value === "dark"
          ? "تفعيل الوضع الفاتح"
          : "تفعيل الوضع الداكن"
      );

      button.setAttribute(
        "aria-pressed",
        value === "light"
          ? "true"
          : "false"
      );

      button.textContent =
        value === "dark"
          ? "☼"
          : "☾";
    }
  }

  function initTheme() {
    const saved = storage.get(
      APP.themeKey
    );

    if (
      saved === "light" ||
      saved === "dark"
    ) {
      applyTheme(saved);
      return;
    }

    let dark = true;

    try {
      dark =
        window.matchMedia &&
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
    } catch {}

    applyTheme(
      dark
        ? "dark"
        : "light"
    );
  }

  function initThemeButton() {
    const button = $("#themeToggle");

    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      () => {
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
    );
  }


  /* =========================================================
     Header
  ========================================================= */

  function initHeader() {
    const header = $("#siteHeader");
    const button = $("#mobileMenuButton");
    const menu = $("#mobileNav");

    const update = () => {
      if (header) {
        header.classList.toggle(
          "scrolled",
          window.scrollY > 12
        );
      }
    };

    update();

    window.addEventListener(
      "scroll",
      update,
      {
        passive: true
      }
    );

    if (button && menu) {
      button.addEventListener(
        "click",
        () => {
          const open =
            menu.classList.toggle("active");

          button.classList.toggle(
            "active",
            open
          );

          button.setAttribute(
            "aria-expanded",
            open ? "true" : "false"
          );

          button.setAttribute(
            "aria-label",
            open
              ? "إغلاق القائمة"
              : "فتح القائمة"
          );
        }
      );

      $$(".mobile-nav-link, .mobile-menu-actions a", menu)
        .forEach((link) => {
          link.addEventListener(
            "click",
            () => {
              menu.classList.remove("active");
              button.classList.remove("active");

              button.setAttribute(
                "aria-expanded",
                "false"
              );
            }
          );
        });
    }
  }


  /* =========================================================
     Navigation
  ========================================================= */

  function initNavigation() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener(
        "click",
        (event) => {
          const id =
            link.getAttribute("href");

          if (
            !id ||
            id === "#"
          ) {
            return;
          }

          const target = $(id);

          if (!target) {
            return;
          }

          event.preventDefault();

          let reduced = false;

          try {
            reduced =
              window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches;
          } catch {}

          target.scrollIntoView({
            behavior:
              reduced
                ? "auto"
                : "smooth",

            block: "start"
          });

          try {
            history.replaceState(
              null,
              "",
              id
            );
          } catch {}
        }
      );
    });

    const sections = $$(
      "#home, #subjects, #features, #about, #support"
    );

    const links = $$(
      ".desktop-nav .nav-link, .mobile-nav-link"
    );

    if (
      !sections.length ||
      !links.length ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (!entry.isIntersecting) {
                return;
              }

              links.forEach(
                (link) => {
                  link.classList.toggle(
                    "active",
                    link.getAttribute("href") ===
                      "#" + entry.target.id
                  );
                }
              );
            }
          );
        },
        {
          rootMargin:
            "-35% 0px -55% 0px"
        }
      );

    sections.forEach(
      (section) => {
        observer.observe(section);
      }
    );
  }


  /* =========================================================
     Reveal Animation
  ========================================================= */

  function initReveal() {
    const items = $$(".reveal");

    if (!items.length) {
      return;
    }

    let reduced = false;

    try {
      reduced =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
    } catch {}

    if (
      reduced ||
      !("IntersectionObserver" in window)
    ) {
      items.forEach(
        (item) => {
          item.classList.add(
            "is-visible"
          );
        }
      );

      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (!entry.isIntersecting) {
                return;
              }

              entry.target.classList.add(
                "is-visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          );
        },
        {
          threshold: 0.08
        }
      );

    items.forEach(
      (item) => {
        observer.observe(item);
      }
    );
  }


  /* =========================================================
     Page Loader

     مهم:
     لا ننتظر Firebase هنا.
  ========================================================= */

  function hideLoader() {
    const loader = $("#pageLoader");

    if (!loader) {
      return;
    }

    loader.classList.add("loaded");

    setTimeout(
      () => {
        loader.hidden = true;
      },
      650
    );
  }


  /* =========================================================
     Student Session

     مفيش Firebase Auth.
     الجلسة المحلية فقط.
  ========================================================= */

  function getStudent() {
    const value =
      storage.get(
        APP.studentKey,
        null
      );

    if (
      value &&
      typeof value === "object"
    ) {
      return value;
    }

    return null;
  }

  function initStudentUI() {
    const student =
      getStudent();

    if (!student) {
      return;
    }

    const name =
      str(student.name).trim();

    const welcome =
      $("#welcomeText");

    if (
      welcome &&
      name
    ) {
      welcome.textContent =
        "أهلاً بيك يا " +
        name +
        "، جاهز تكمل رحلتك التعليمية مع الكوتش؟";
    }

    const login =
      $("#headerLogin");

    const register =
      $("#headerRegister");

    const hero =
      $("#heroPrimary");

    const final =
      $("#finalPrimary");

    if (login) {
      login.textContent =
        "حسابي";

      login.href =
        "profile.html";
    }

    if (register) {
      register.textContent =
        "الملف الشخصي";

      register.href =
        "profile.html";
    }

    if (hero) {
      hero.textContent =
        "دخول المنصة ←";

      hero.href =
        "courses.html";
    }

    if (final) {
      final.textContent =
        "دخول المنصة ←";

      final.href =
        "courses.html";
    }
  }


  /* =========================================================
     Statistics
  ========================================================= */

  function setStat(
    id,
    value
  ) {
    const element =
      $("#" + id);

    if (!element) {
      return;
    }

    const n =
      Number(value);

    element.textContent =
      Number.isFinite(n)
        ? n.toLocaleString("ar-EG")
        : "—";
  }

  function renderStats(
    stats
  ) {
    setStat(
      "statSubjects",
      stats.subjects
    );

    setStat(
      "statFiles",
      stats.files
    );

    setStat(
      "statVideos",
      stats.videos
    );

    setStat(
      "statQuizzes",
      stats.quizzes
    );
  }


  /* =========================================================
     Firebase REST

     مهم جدًا:
     لا يوجد Firebase SDK.
     لا يوجد Firebase Auth.
     مجرد REST GET في الخلفية.
  ========================================================= */

  function dbURL(path) {
    const clean =
      str(path)
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

    return (
      APP.databaseURL +
      "/" +
      clean +
      ".json"
    );
  }

  async function dbGet(
    path,
    timeout = 5000
  ) {
    const controller =
      typeof AbortController !== "undefined"
        ? new AbortController()
        : null;

    const timer =
      controller
        ? setTimeout(
            () => {
              controller.abort();
            },
            timeout
          )
        : null;

    try {
      const response =
        await fetch(
          dbURL(path),
          {
            method: "GET",
            cache: "no-store",
            signal:
              controller
                ? controller.signal
                : undefined
          }
        );

      if (!response.ok) {
        throw new Error(
          "HTTP " +
          response.status
        );
      }

      return await response.json();

    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  function getCache(
    path
  ) {
    const cached =
      storage.get(
        APP.cachePrefix +
          path,
        null
      );

    if (
      !cached ||
      typeof cached !== "object"
    ) {
      return null;
    }

    if (
      !cached.time ||
      Date.now() -
        cached.time >
        APP.cacheTTL
    ) {
      storage.remove(
        APP.cachePrefix +
          path
      );

      return null;
    }

    return cached.data;
  }

  function setCache(
    path,
    data
  ) {
    storage.set(
      APP.cachePrefix +
        path,
      {
        time: Date.now(),
        data: data
      }
    );
  }

  async function firebaseData(
    path
  ) {
    const cached =
      getCache(path);

    if (cached !== null) {
      return cached;
    }

    const data =
      await dbGet(path);

    setCache(
      path,
      data
    );

    return data;
  }


  /* =========================================================
     Fallback Subjects

     لو Firebase مش موجودة،
     المواد دي تظهر عادي.
  ========================================================= */

  const fallbackSubjects = [
    {
      id: "anatomy",
      name: "التشريح",
      term: "الفصل الأول",
      icon: "🫀",
      description:
        "محتوى مادة التشريح والمصادر التعليمية."
    },

    {
      id: "physiology",
      name: "الفسيولوجي",
      term: "الفصل الأول",
      icon: "🧠",
      description:
        "محتوى مادة الفسيولوجي والمصادر التعليمية."
    },

    {
      id: "english",
      name: "اللغة الإنجليزية",
      term: "الفصل الأول",
      icon: "📚",
      description:
        "محتوى اللغة الإنجليزية والمصادر التعليمية."
    },

    {
      id: "fencing",
      name: "رياضة المبارزة",
      term: "الفصل الأول",
      icon: "🤺",
      description:
        "محتوى رياضة المبارزة.",
      paid: true
    },

    {
      id: "sport-anatomy",
      name: "التشريح الرياضي",
      term: "الفصل الأول",
      icon: "🏃",
      description:
        "محتوى التشريح الرياضي والمصادر التعليمية."
    },

    {
      id: "communication",
      name: "مهارات التواصل",
      term: "الفصل الأول",
      icon: "💬",
      description:
        "محتوى مهارات التواصل."
    },

    {
      id: "movement",
      name: "الحركة",
      term: "الفصل الثاني",
      icon: "🏋️",
      description:
        "محتوى مادة الحركة."
    },

    {
      id: "training",
      name: "التدريب",
      term: "الفصل الثاني",
      icon: "🎯",
      description:
        "محتوى التدريب والمصادر التعليمية.",
      paid: true
    },

    {
      id: "psychology",
      name: "علم النفس",
      term: "الفصل الثاني",
      icon: "🧩",
      description:
        "محتوى علم النفس.",
      paid: true
    }
  ];


  /* =========================================================
     Normalize Subjects
  ========================================================= */

  function normalizeSubject(
    source,
    fallbackId
  ) {
    source =
      source &&
      typeof source === "object"
        ? source
        : {};

    const id =
      str(
        source.id ||
        source.key ||
        source.slug ||
        fallbackId
      ).trim();

    const name =
      str(
        source.name ||
        source.title ||
        source.subjectName ||
        source.label,
        "مادة"
      ).trim();

    return {
      ...source,

      id:
        id ||
        "subject",

      name:
        name,

      title:
        str(
          source.title,
          name
        ),

      term:
        str(
          source.term ||
          source.semester ||
          source.termName ||
          source.season
        ),

      icon:
        str(
          source.icon ||
          source.emoji,
          "📘"
        ),

      description:
        str(
          source.description,
          "استكشف محتوى المادة والمصادر التعليمية."
        )
    };
  }


  /* =========================================================
     Load Subjects
  ========================================================= */

  async function loadSubjects() {
    const paths = [
      "subjects",
      "courses/subjects",
      "courses"
    ];

    for (
      const path of paths
    ) {
      try {
        const data =
          await firebaseData(
            path
          );

        const list =
          arrayify(data)
            .map(
              (item) =>
                normalizeSubject(
                  item,
                  item &&
                    item.id
                )
            )
            .filter(
              (item) =>
                item.name
            );

        if (list.length) {
          return list;
        }

      } catch (error) {
        console.warn(
          "تعذر تحميل " +
            path,
          error
        );
      }
    }

    return [];
  }


  /* =========================================================
     Subject Card
  ========================================================= */

  function subjectCard(
    subject
  ) {
    const paid =
      subject.paid === true ||
      subject.isPaid === true ||
      str(
        subject.type
      ).toLowerCase() ===
        "paid";

    return `
      <article
        class="subject-card"
        data-subject-id="${escapeHTML(subject.id)}"
      >

        <div class="subject-card-icon">
          ${escapeHTML(subject.icon)}
        </div>

        <div class="subject-card-content">

          ${
            subject.term
              ? `
                <span class="subject-term">
                  ${escapeHTML(subject.term)}
                </span>
              `
              : ""
          }

          <h3>
            ${escapeHTML(subject.name)}
          </h3>

          <p>
            ${escapeHTML(subject.description)}
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


  /* =========================================================
     Render Subjects
  ========================================================= */

  function renderSubjects(
    subjects
  ) {
    const grid =
      $("#subjectsGrid");

    if (!grid) {
      return;
    }

    if (!subjects.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>
            المحتوى الدراسي قيد التجهيز
          </strong>

          <span>
            سيظهر المحتوى هنا عند توفر المواد.
          </span>
        </div>
      `;

      return;
    }

    grid.innerHTML =
      subjects
        .map(subjectCard)
        .join("");

    $$(".subject-card", grid)
      .forEach(
        (card) => {
          card.addEventListener(
            "click",
            () => {
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
        }
      );
  }


  /* =========================================================
     Firebase Background Sync

     يبدأ بعد ظهور الصفحة.
  ========================================================= */

  async function syncFirebase() {
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          350
        )
    );

    /* ---------- Subjects ---------- */

    try {
      const subjects =
        await loadSubjects();

      if (subjects.length) {
        renderSubjects(
          subjects
        );

        setStat(
          "statSubjects",
          subjects.length
        );
      }

    } catch (error) {
      console.warn(
        "Subjects sync failed",
        error
      );
    }


    /* ---------- Counters ---------- */

    const counters = [
      [
        "files",
        "statFiles"
      ],

      [
        "videos",
        "statVideos"
      ],

      [
        "quizzes",
        "statQuizzes"
      ]
    ];

    await Promise.all(
      counters.map(
        async ([path, id]) => {
          try {
            const data =
              await firebaseData(
                path
              );

            setStat(
              id,
              arrayify(data).length
            );

          } catch (error) {
            console.warn(
              path +
                " sync failed",
              error
            );
          }
        }
      )
    );
  }


  /* =========================================================
     Report Modal
  ========================================================= */

  function openModal() {
    const modal =
      $("#reportModal");

    if (!modal) {
      return;
    }

    modal.classList.add(
      "active"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "modal-open"
    );

    const message =
      $("#reportMessage");

    if (message) {
      setTimeout(
        () => {
          message.focus();
        },
        80
      );
    }
  }

  function closeModal() {
    const modal =
      $("#reportModal");

    if (!modal) {
      return;
    }

    modal.classList.remove(
      "active"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "modal-open"
    );
  }


  function initReportModal() {

    /* فتح البلاغ */

    $$("[data-open-report]")
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            openModal
          );
        }
      );


    /* إغلاق البلاغ */

    $$("[data-close-modal]")
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            closeModal
          );
        }
      );


    /* الضغط على الخلفية */

    const modal =
      $("#reportModal");

    const overlay =
      $(".modal-overlay", modal || document);

    if (overlay) {
      overlay.addEventListener(
        "click",
        closeModal
      );
    }


    /* زر Escape */

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeModal();
        }
      }
    );


    /* عداد الأحرف */

    const textarea =
      $("#reportMessage");

    const counter =
      $("#reportCharacterCount");

    if (
      textarea &&
      counter
    ) {
      const update =
        () => {
          counter.textContent =
            textarea.value.length
              .toLocaleString("ar-EG");
        };

      textarea.addEventListener(
        "input",
        update
      );

      update();
    }


    /* نموذج البلاغ */

    const form =
      $("#reportForm");

    if (!form) {
      return;
    }


    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const submit =
          $("#reportSubmit");

        const name =
          $("#reportName");

        const contact =
          $("#reportContact");

        const subject =
          $("#reportSubject");

        const message =
          $("#reportMessage");

        const formMessage =
          $("#reportFormMessage");


        const payload = {
          name:
            str(
              name &&
                name.value
            ).trim(),

          contact:
            str(
              contact &&
                contact.value
            ).trim(),

          subject:
            str(
              subject &&
                subject.value
            ).trim(),

          message:
            str(
              message &&
                message.value
            ).trim(),

          createdAt:
            Date.now(),

          status:
            "open",

          source:
            "index"
        };


        /* التحقق */

        if (
          !payload.message
        ) {
          if (formMessage) {
            formMessage.textContent =
              "اكتب تفاصيل المشكلة أولاً.";

            formMessage.className =
              "form-message error";
          }

          if (message) {
            message.focus();
          }

          return;
        }


        if (submit) {
          submit.disabled =
            true;
        }


        if (formMessage) {
          formMessage.textContent =
            "جاري إرسال البلاغ...";

          formMessage.className =
            "form-message";
        }


        try {
          const response =
            await fetch(
              dbURL(
                "supportTickets"
              ),
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify(
                    payload
                  )
              }
            );


          if (!response.ok) {
            throw new Error(
              "HTTP " +
              response.status
            );
          }


          form.reset();


          if (counter) {
            counter.textContent =
              "0";
          }


          if (formMessage) {
            formMessage.textContent =
              "تم إرسال البلاغ بنجاح.";

            formMessage.className =
              "form-message success";
          }


          setTimeout(
            closeModal,
            900
          );

        } catch (error) {
          console.error(
            "Support ticket error:",
            error
          );

          if (formMessage) {
            formMessage.textContent =
              "تعذر إرسال البلاغ حالياً. جرّب مرة أخرى.";

            formMessage.className =
              "form-message error";
          }

        } finally {
          if (submit) {
            submit.disabled =
              false;
          }
        }
      }
    );
  }


  /* =========================================================
     PWA Install
  ========================================================= */

  let installPrompt = null;

  function initInstall() {
    const button =
      $("#installAppButton");

    if (!button) {
      return;
    }

    button.hidden =
      true;


    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        event.preventDefault();

        installPrompt =
          event;

        button.hidden =
          false;
      }
    );


    window.addEventListener(
      "appinstalled",
      () => {
        installPrompt =
          null;

        button.hidden =
          true;
      }
    );


    button.addEventListener(
      "click",
      async () => {
        if (!installPrompt) {
          showToast(
            "التثبيت غير متاح حالياً من هذا المتصفح.",
            "info"
          );

          return;
        }

        try {
          await installPrompt.prompt();

          await installPrompt.userChoice;

        } catch (error) {
          console.warn(
            "Install prompt",
            error
          );
        }

        installPrompt =
          null;

        button.hidden =
          true;
      }
    );
  }


  /* =========================================================
     Toast
  ========================================================= */

  function showToast(
    message,
    type = "info"
  ) {
    if (!message) {
      return;
    }

    let container =
      $("#toastContainer");


    if (!container) {
      container =
        document.createElement(
          "div"
        );

      container.id =
        "toastContainer";

      container.className =
        "toast-container";

      document.body.appendChild(
        container
      );
    }


    const toast =
      document.createElement(
        "div"
      );

    toast.className =
      "toast toast-" +
      type;

    toast.textContent =
      message;

    container.appendChild(
      toast
    );


    requestAnimationFrame(
      () => {
        toast.classList.add(
          "show"
        );
      }
    );


    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );

        setTimeout(
          () => {
            toast.remove();
          },
          300
        );
      },
      3200
    );
  }


  /* =========================================================
     Network
  ========================================================= */

  function initNetwork() {
    const update =
      () => {
        document.body.classList.toggle(
          "offline",
          !navigator.onLine
        );
      };

    update();

    window.addEventListener(
      "online",
      update
    );

    window.addEventListener(
      "offline",
      update
    );
  }


  /* =========================================================
     Current Year
  ========================================================= */

  function setYear() {
    const year =
      $("#currentYear");

    if (year) {
      year.textContent =
        String(
          new Date().getFullYear()
        );
    }
  }


  /* =========================================================
     Public API
  ========================================================= */

  window.CapIndex = {

    version:
      APP.version,

    getStudent:
      getStudent,

    showToast:
      showToast,

    theme: {

      apply:
        applyTheme,

      toggle() {
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
    },

    firebase: {

      get:
        dbGet,

      loadSubjects:
        loadSubjects
    }
  };


  /* =========================================================
     START
  ========================================================= */

  function init() {

    /*
      ========================================================
      مهم جدًا:

      الصفحة لا تنتظر Firebase.
      الصفحة لا تنتظر API.
      الصفحة لا تنتظر Auth.
      الصفحة لا تنتظر أي خدمة خارجية.

      HTML + CSS + JS يبدأوا فورًا.
      ========================================================
    */

    hideLoader();


    /* ---------- UI ---------- */

    initTheme();

    initThemeButton();

    initHeader();

    initNavigation();

    initReveal();

    initStudentUI();

    initReportModal();

    initInstall();

    initNetwork();

    setYear();


    /* ========================================================
       محتوى فوري

       حتى لو Firebase مش شغالة،
       المستخدم هيشوف الصفحة والمواد.
    ======================================================== */

    renderSubjects(
      fallbackSubjects
    );


    renderStats({
      subjects:
        fallbackSubjects.length,

      files:
        0,

      videos:
        0,

      quizzes:
        0
    });


    /* ========================================================
       Firebase

       اختياري تمامًا ويعمل بعد ظهور الواجهة.
    ======================================================== */

    syncFirebase()
      .catch(
        (error) => {
          console.warn(
            "Background Firebase sync failed:",
            error
          );
        }
      );
  }


  /* =========================================================
     DOM Ready
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

})();
