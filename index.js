/* =========================================================
   index.js
   CAP ABDELNASEER
   Home / Landing Page Controller
   Compatible with:
   - firebase-config.js
   - firebase-auth.js
   - firebase-database.js
   - firebase-content.js
   - firebase-features.js
   - index.html

   IMPORTANT:
   This file does NOT delete or overwrite existing Firebase data.
========================================================= */

(function (window, document) {
  "use strict";

  /* =======================================================
     GLOBAL CONSTANTS
  ======================================================= */

  const APP = {
    name: "كاب عبدالنصير",
    version: "1.0.0",
    page: "index"
  };


  /* =======================================================
     SAFE HELPERS
  ======================================================= */

  function getElement(id) {
    return document.getElementById(id);
  }


  function safeString(value, fallback) {
    if (
      value === undefined ||
      value === null
    ) {
      return fallback || "";
    }

    return String(value).trim();
  }


  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function toArray(value) {
    if (Array.isArray(value)) {
      return value.slice();
    }

    if (isObject(value)) {
      return Object.keys(value).map(function (key) {
        const item = value[key];

        if (isObject(item)) {
          return Object.assign(
            {
              key: key
            },
            item
          );
        }

        return {
          key: key,
          value: item
        };
      });
    }

    return [];
  }


  function numberValue(value, fallback) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }

    return fallback || 0;
  }


  function escapeHtml(value) {
    return safeString(value, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function normalizeText(value) {
    return safeString(value, "")
      .toLowerCase()
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  }


  /* =======================================================
     FIREBASE ACCESS
  ======================================================= */

  function getCore() {
    return window.FirebaseCore || null;
  }


  function getDatabase() {
    return window.FirebaseDatabase || null;
  }


  function getContent() {
    return window.FirebaseContent || null;
  }


  function getFeatures() {
    return window.FirebaseFeatures || null;
  }


  function getAuth() {
    return window.FirebaseAuth || null;
  }


  async function waitForModule(
    name,
    timeout
  ) {
    const maxWait =
      Number.isFinite(timeout)
        ? timeout
        : 10000;

    const started =
      Date.now();

    while (
      Date.now() - started <
      maxWait
    ) {

      if (
        window[name] &&
        typeof window[name] === "object"
      ) {
        return window[name];
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, 50);
      });
    }

    return null;
  }


  async function waitForFirebase() {

    const required = [
      "FirebaseCore",
      "FirebaseAuth",
      "FirebaseDatabase",
      "FirebaseContent",
      "FirebaseFeatures"
    ];

    for (
      let i = 0;
      i < required.length;
      i++
    ) {
      await waitForModule(
        required[i],
        10000
      );
    }

    return {
      core: getCore(),
      auth: getAuth(),
      database: getDatabase(),
      content: getContent(),
      features: getFeatures()
    };
  }


  /* =======================================================
     LOADER
  ======================================================= */

  function hideLoader() {

    if (
      typeof window.hideIndexLoader ===
      "function"
    ) {
      window.hideIndexLoader();
      return;
    }

    const loader =
      getElement("pageLoader");

    if (loader) {
      loader.classList.add("hidden");
    }
  }


  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(
    message,
    title
  ) {

    if (
      typeof window.showIndexToast ===
      "function"
    ) {
      window.showIndexToast(
        message,
        title
      );

      return;
    }

    console.info(
      title || "تنبيه",
      message || ""
    );
  }


  /* =======================================================
     CURRENT USER
  ======================================================= */

  function getCurrentUser() {

    const Auth =
      getAuth();

    if (
      Auth &&
      typeof Auth.getCurrentUser ===
      "function"
    ) {
      try {
        return Auth.getCurrentUser();
      } catch (error) {
        console.warn(
          "Unable to get current user:",
          error
        );
      }
    }

    try {

      const keys = [
        "currentUser",
        "student",
        "currentStudent"
      ];

      for (
        let i = 0;
        i < keys.length;
        i++
      ) {

        const raw =
          localStorage.getItem(
            keys[i]
          );

        if (!raw) {
          continue;
        }

        try {

          const parsed =
            JSON.parse(raw);

          if (
            parsed &&
            typeof parsed === "object"
          ) {
            return parsed;
          }

        } catch (error) {
          /* Ignore invalid local data. */
        }
      }

    } catch (error) {
      console.warn(
        "LocalStorage is unavailable:",
        error
      );
    }

    return null;
  }


  function getStudentName(student) {

    if (!student) {
      return "";
    }

    return (
      safeString(student.name) ||
      safeString(student.studentName) ||
      safeString(student.fullName) ||
      safeString(student.displayName) ||
      ""
    );
  }


  function isLoggedIn() {
    return !!getCurrentUser();
  }


  /* =======================================================
     AUTH-AWARE HEADER
  ======================================================= */

  function updateHeaderForUser() {

    const loggedIn =
      isLoggedIn();

    const headerButtons =
      document.querySelectorAll(
        ".nav-actions .header-btn"
      );

    if (!headerButtons.length) {
      return;
    }

    let loginButton = null;
    let registerButton = null;

    headerButtons.forEach(
      function (button) {

        const href =
          safeString(
            button.getAttribute(
              "href"
            )
          );

        if (
          href === "login.html"
        ) {
          loginButton = button;
        }

        if (
          href === "register.html"
        ) {
          registerButton = button;
        }
      }
    );


    if (loggedIn) {

      if (loginButton) {

        loginButton.href =
          "dashboard.html";

        loginButton.textContent =
          "لوحة الطالب";

      }

      if (registerButton) {

        registerButton.href =
          "profile.html";

        registerButton.textContent =
          "حسابي";

      }

    } else {

      if (loginButton) {

        loginButton.href =
          "login.html";

        loginButton.textContent =
          "تسجيل الدخول";

      }

      if (registerButton) {

        registerButton.href =
          "register.html";

        registerButton.textContent =
          "إنشاء حساب";

      }

    }


    const mobileNav =
      getElement("mobileNav");

    if (!mobileNav) {
      return;
    }

    const mobileLinks =
      mobileNav.querySelectorAll(
        "a"
      );

    mobileLinks.forEach(
      function (link) {

        const href =
          safeString(
            link.getAttribute(
              "href"
            )
          );

        if (
          href === "login.html"
        ) {

          if (loggedIn) {

            link.href =
              "dashboard.html";

            link.textContent =
              "لوحة الطالب";

          } else {

            link.href =
              "login.html";

            link.textContent =
              "تسجيل الدخول";

          }

        }

        if (
          href === "register.html"
        ) {

          if (loggedIn) {

            link.href =
              "profile.html";

            link.textContent =
              "حسابي";

          } else {

            link.href =
              "register.html";

            link.textContent =
              "إنشاء حساب جديد";

          }

        }

      }
    );
  }


  /* =======================================================
     SUBJECTS
  ======================================================= */

  async function loadSubjects() {

    const Content =
      getContent();

    if (
      !Content ||
      typeof Content.getSubjects !==
      "function"
    ) {
      return [];
    }

    try {

      const subjects =
        await Content.getSubjects();

      return toArray(subjects);

    } catch (error) {

      console.warn(
        "Could not load subjects:",
        error
      );

      return [];
    }
  }


  /* =======================================================
     FILES
  ======================================================= */

  async function loadFiles() {

    const DB =
      getDatabase();

    const Features =
      getFeatures();

    try {

      if (
        Features &&
        typeof Features.getFiles ===
        "function"
      ) {

        const files =
          await Features.getFiles();

        return toArray(files);

      }

      if (
        DB &&
        DB.files &&
        typeof DB.files.getAll ===
        "function"
      ) {

        const files =
          await DB.files.getAll();

        return toArray(files);

      }

    } catch (error) {

      console.warn(
        "Could not load files:",
        error
      );

    }

    return [];
  }


  /* =======================================================
     VIDEOS
  ======================================================= */

  async function loadVideos() {

    const DB =
      getDatabase();

    const Features =
      getFeatures();

    try {

      if (
        Features &&
        typeof Features.getVideos ===
        "function"
      ) {

        const videos =
          await Features.getVideos();

        return toArray(videos);

      }

      if (
        DB &&
        DB.videos &&
        typeof DB.videos.getAll ===
        "function"
      ) {

        const videos =
          await DB.videos.getAll();

        return toArray(videos);

      }

    } catch (error) {

      console.warn(
        "Could not load videos:",
        error
      );

    }

    return [];
  }


  /* =======================================================
     QUIZZES
  ======================================================= */

  async function loadQuizzes() {

    const DB =
      getDatabase();

    const Features =
      getFeatures();

    try {

      if (
        Features &&
        typeof Features.getQuizzes ===
        "function"
      ) {

        const quizzes =
          await Features.getQuizzes();

        return toArray(quizzes);

      }

      if (
        DB &&
        DB.quizzes &&
        typeof DB.quizzes.getAll ===
        "function"
      ) {

        const quizzes =
          await DB.quizzes.getAll();

        return toArray(quizzes);

      }

    } catch (error) {

      console.warn(
        "Could not load quizzes:",
        error
      );

    }

    return [];
  }


  /* =======================================================
     STATS
  ======================================================= */

  function updateStat(
    elementId,
    value
  ) {

    const element =
      getElement(elementId);

    if (!element) {
      return;
    }

    element.textContent =
      String(
        Number.isFinite(
          Number(value)
        )
          ? Number(value)
          : 0
      );
  }


  async function loadStatistics() {

    const results =
      await Promise.allSettled([
        loadSubjects(),
        loadFiles(),
        loadVideos(),
        loadQuizzes()
      ]);


    const subjects =
      results[0].status === "fulfilled"
        ? results[0].value
        : [];

    const files =
      results[1].status === "fulfilled"
        ? results[1].value
        : [];

    const videos =
      results[2].status === "fulfilled"
        ? results[2].value
        : [];

    const quizzes =
      results[3].status === "fulfilled"
        ? results[3].value
        : [];


    updateStat(
      "statSubjects",
      subjects.length
    );

    updateStat(
      "statFiles",
      files.length
    );

    updateStat(
      "statVideos",
      videos.length
    );

    updateStat(
      "statQuizzes",
      quizzes.length
    );


    return {
      subjects,
      files,
      videos,
      quizzes
    };
  }


  /* =======================================================
     SUBJECT ICON
  ======================================================= */

  function subjectIcon(
    subject
  ) {

    const id =
      normalizeText(
        subject &&
        (
          subject.id ||
          subject.subjectId ||
          subject.key ||
          ""
        )
      );

    const title =
      normalizeText(
        subject &&
        (
          subject.title ||
          subject.name ||
          ""
        )
      );


    if (
      id.includes("anatom") ||
      title.includes("تشريح")
    ) {
      return "A";
    }


    if (
      id.includes("physio") ||
      title.includes("فسيولوج")
    ) {
      return "P";
    }


    if (
      id.includes("english") ||
      title.includes("انجليزي") ||
      title.includes("إنجليزي") ||
      title.includes("لغة")
    ) {
      return "E";
    }


    if (
      id.includes("fenc") ||
      title.includes("مبارز")
    ) {
      return "F";
    }


    if (
      id.includes("psych") ||
      title.includes("نفس")
    ) {
      return "Ψ";
    }


    if (
      id.includes("training") ||
      title.includes("تدريب")
    ) {
      return "T";
    }


    if (
      id.includes("movement") ||
      title.includes("حرك")
    ) {
      return "M";
    }


    return "•";
  }


  /* =======================================================
     SUBJECT TERM
  ======================================================= */

  function getSubjectTerm(
    subject
  ) {

    if (!subject) {
      return "";
    }

    const term =
      subject.term ||
      subject.semester ||
      subject.year ||
      subject.level;


    if (
      term === undefined ||
      term === null ||
      term === ""
    ) {
      return "";
    }


    const value =
      String(term)
        .trim();


    if (
      /^term\s*1$/i.test(value) ||
      value === "1"
    ) {
      return "الترم الأول";
    }


    if (
      /^term\s*2$/i.test(value) ||
      value === "2"
    ) {
      return "الترم الثاني";
    }


    if (
      /^term\s*3$/i.test(value) ||
      value === "3"
    ) {
      return "الترم الثالث";
    }


    if (
      /^term\s*4$/i.test(value) ||
      value === "4"
    ) {
      return "الترم الرابع";
    }


    return value;
  }


  /* =======================================================
     SUBJECT NAME
  ======================================================= */

  function getSubjectName(
    subject
  ) {

    return (
      safeString(
        subject &&
        subject.title
      ) ||
      safeString(
        subject &&
        subject.name
      ) ||
      safeString(
        subject &&
        subject.subjectName
      ) ||
      "مادة دراسية"
    );
  }


  /* =======================================================
     SUBJECT DESCRIPTION
  ======================================================= */

  function getSubjectDescription(
    subject
  ) {

    return (
      safeString(
        subject &&
        subject.description
      ) ||
      safeString(
        subject &&
        subject.desc
      ) ||
      "محتوى المادة والملفات والفيديوهات والاختبارات المرتبطة بها."
    );
  }


  /* =======================================================
     RENDER SUBJECTS
  ======================================================= */

  function renderSubjects(
    subjects
  ) {

    const container =
      getElement(
        "coursesPreview"
      );

    if (!container) {
      return;
    }


    const list =
      toArray(subjects)
        .filter(function (subject) {

          if (!subject) {
            return false;
          }

          if (
            subject.published === false ||
            subject.active === false
          ) {
            return false;
          }

          return true;

        })
        .slice(0, 6);


    if (!list.length) {

      container.innerHTML = `
        <article class="course-card reveal">
          <span class="course-number">01</span>

          <div class="course-icon">
            •
          </div>

          <div class="course-term">
            المنصة التعليمية
          </div>

          <h3 class="course-title">
            المحتوى الدراسي
          </h3>

          <p class="course-text">
            سيتم عرض المواد المتاحة هنا تلقائيًا
            عند توفرها داخل المنصة.
          </p>
        </article>
      `;

      activateReveal(
        container
      );

      return;
    }


    container.innerHTML =
      list.map(
        function (
          subject,
          index
        ) {

          const name =
            escapeHtml(
              getSubjectName(
                subject
              )
            );

          const description =
            escapeHtml(
              getSubjectDescription(
                subject
              )
            );

          const term =
            escapeHtml(
              getSubjectTerm(
                subject
              ) ||
              "المحتوى الدراسي"
            );

          const icon =
            escapeHtml(
              subjectIcon(
                subject
              )
            );


          const subjectId =
            safeString(
              subject.id ||
              subject.subjectId ||
              subject.key
            );


          const number =
            String(
              index + 1
            ).padStart(
              2,
              "0"
            );


          return `
            <article
              class="course-card reveal"
              data-subject-id="${escapeHtml(subjectId)}"
            >

              <span class="course-number">
                ${number}
              </span>

              <div class="course-icon">
                ${icon}
              </div>

              <div class="course-term">
                ${term}
              </div>

              <h3 class="course-title">
                ${name}
              </h3>

              <p class="course-text">
                ${description}
              </p>

            </article>
          `;

        }
      )
      .join("");


    activateReveal(
      container
    );


    bindSubjectCards();
  }


  /* =======================================================
     SUBJECT CARDS
  ======================================================= */

  function bindSubjectCards() {

    const cards =
      document.querySelectorAll(
        "#coursesPreview .course-card"
      );


    cards.forEach(
      function (card) {

        const subjectId =
          safeString(
            card.getAttribute(
              "data-subject-id"
            )
          );


        if (!subjectId) {
          return;
        }


        card.style.cursor =
          "pointer";


        card.addEventListener(
          "click",
          function () {

            const url =
              "subject.html?id=" +
              encodeURIComponent(
                subjectId
              );

            window.location.href =
              url;

          }
        );

      }
    );
  }


  /* =======================================================
     REVEAL
  ======================================================= */

  function activateReveal(
    root
  ) {

    const scope =
      root || document;


    const items =
      scope.querySelectorAll
        ? scope.querySelectorAll(
            ".reveal"
          )
        : [];


    if (!items.length) {
      return;
    }


    if (
      !("IntersectionObserver" in window)
    ) {

      items.forEach(
        function (item) {
          item.classList.add(
            "visible"
          );
        }
      );

      return;
    }


    const observer =
      new IntersectionObserver(
        function (entries) {

          entries.forEach(
            function (entry) {

              if (
                entry.isIntersecting
              ) {

                entry.target.classList.add(
                  "visible"
                );

                observer.unobserve(
                  entry.target
                );

              }

            }
          );

        },
        {
          threshold: 0.08
        }
      );


    items.forEach(
      function (item) {

        if (
          !item.classList.contains(
            "visible"
          )
        ) {
          observer.observe(item);
        }

      }
    );
  }


  /* =======================================================
     AUTH STATE LISTENER
  ======================================================= */

  function listenForAuthChanges() {

    const Auth =
      getAuth();

    if (
      !Auth
    ) {
      return;
    }


    try {

      if (
        typeof Auth.onAuthStateChanged ===
        "function"
      ) {

        Auth.onAuthStateChanged(
          function () {
            updateHeaderForUser();
          }
        );

      }

    } catch (error) {

      console.warn(
        "Auth state listener unavailable:",
        error
      );

    }
  }


  /* =======================================================
     OPTIONAL FIREBASE FEATURE STATS
  ======================================================= */

  async function loadFeatureDashboard() {

    const Features =
      getFeatures();

    if (
      !Features ||
      typeof Features.getDashboard !==
      "function"
    ) {
      return null;
    }


    try {

      const student =
        getCurrentUser();


      if (!student) {
        return null;
      }


      return await Features.getDashboard(
        student
      );

    } catch (error) {

      console.warn(
        "Dashboard preview unavailable:",
        error
      );

      return null;
    }
  }


  /* =======================================================
     WELCOME MESSAGE
  ======================================================= */

  function updateWelcomeState() {

    const student =
      getCurrentUser();

    if (!student) {
      return;
    }


    const name =
      getStudentName(
        student
      );


    if (!name) {
      return;
    }


    const welcomeTitle =
      document.querySelector(
        ".hero-title"
      );


    /*
     * We intentionally keep the public
     * hero title unchanged.
     *
     * Student-specific identity is used
     * only when needed by future page logic.
     */
    if (
      welcomeTitle
    ) {

      welcomeTitle.dataset.studentName =
        name;

    }
  }


  /* =======================================================
     NAVIGATION PROTECTION
  ======================================================= */

  function bindNavigation() {

    const loggedIn =
      isLoggedIn();


    const dashboardLinks =
      document.querySelectorAll(
        'a[href="dashboard.html"]'
      );


    dashboardLinks.forEach(
      function (link) {

        if (!loggedIn) {

          /*
           * No forced redirect.
           * Dashboard page itself will perform
           * its own authentication check.
           */

        }

      }
    );
  }


  /* =======================================================
     ERROR HANDLING
  ======================================================= */

  function reportError(
    error,
    context
  ) {

    console.error(
      "[CAP INDEX]",
      context || "Unknown error",
      error
    );
  }


  /* =======================================================
     MAIN INITIALIZATION
  ======================================================= */

  async function initializeIndex() {

    try {

      updateHeaderForUser();

      updateWelcomeState();

      bindNavigation();

      listenForAuthChanges();


      /*
       * Firebase modules are already loaded
       * before index.js according to index.html.
       *
       * We still wait defensively in case a
       * module initializes asynchronously.
       */

      await waitForFirebase();


      /*
       * Load public landing-page data.
       *
       * Promise.allSettled prevents one broken
       * Firebase section from freezing the whole
       * homepage.
       */

      const data =
        await loadStatistics();


      if (
        data &&
        data.subjects
      ) {

        renderSubjects(
          data.subjects
        );

      }


      /*
       * This is intentionally non-blocking.
       * It allows future dashboard statistics
       * without changing the public homepage.
       */

      loadFeatureDashboard()
        .catch(function (error) {

          reportError(
            error,
            "Feature dashboard"
          );

        });


      activateReveal(
        document
      );


    } catch (error) {

      reportError(
        error,
        "Index initialization"
      );

    } finally {

      hideLoader();

    }

  }


  /* =======================================================
     GLOBAL API
  ======================================================= */

  window.CapIndex = {

    app: APP,

    init:
      initializeIndex,

    getCurrentUser:
      getCurrentUser,

    isLoggedIn:
      isLoggedIn,

    loadSubjects:
      loadSubjects,

    loadFiles:
      loadFiles,

    loadVideos:
      loadVideos,

    loadQuizzes:
      loadQuizzes,

    loadStatistics:
      loadStatistics,

    renderSubjects:
      renderSubjects,

    showToast:
      showToast

  };


  /* =======================================================
     START
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeIndex,
      {
        once: true
      }
    );

  } else {

    initializeIndex();

  }

})(window, document);
