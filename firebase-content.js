/* =========================================================
   firebase-content.js
   CAP ABDELNASEER
   Content / Courses / Subjects Layer

   Depends on:
   - firebase-config.js
   - firebase-auth.js
   - firebase-database.js

   Designed for:
   - Existing Firebase data
   - New Firebase data
   - Courses
   - Subjects
   - Files
   - Videos
   - Quizzes
   - Content views
   ========================================================= */

(function (window) {
  "use strict";

  /* =========================================================
     DEPENDENCY CHECK
     ========================================================= */

  if (
    !window.FirebaseCoreReady ||
    !window.FirebaseCore
  ) {
    console.error(
      "firebase-content.js: firebase-config.js must be loaded first."
    );
    return;
  }

  if (
    !window.FirebaseDatabaseReady ||
    !window.FirebaseDatabase
  ) {
    console.error(
      "firebase-content.js: firebase-database.js must be loaded first."
    );
    return;
  }

  const Core = window.FirebaseCore;
  const DB = window.FirebaseDatabase;

  /* =========================================================
     CONSTANTS
     ========================================================= */

  const CONTENT_VERSION = "1.0.0";

  /*
   * These are the original course areas of the project.
   * Firebase data can override/extend them without deleting
   * or replacing anything.
   */
  const DEFAULT_TERMS = [
    {
      id: "term1",
      key: "term1",
      name: "الترم الأول",
      title: "الترم الأول",
      number: 1,
      subjects: []
    },
    {
      id: "term2",
      key: "term2",
      name: "الترم الثاني",
      title: "الترم الثاني",
      number: 2,
      subjects: []
    },
    {
      id: "term3",
      key: "term3",
      name: "الترم الثالث",
      title: "الترم الثالث",
      number: 3,
      subjects: []
    },
    {
      id: "term4",
      key: "term4",
      name: "الترم الرابع",
      title: "الترم الرابع",
      number: 4,
      subjects: []
    }
  ];

  /*
   * Original project subjects.
   * IDs intentionally remain stable so pages can use them.
   */
  const DEFAULT_SUBJECTS = [
    {
      id: "anatomy",
      key: "anatomy",
      name: "التشريح",
      title: "التشريح",
      term: "term1",
      termNumber: 1,
      order: 1,
      icon: "🦴",
      color: "blue"
    },
    {
      id: "physiology",
      key: "physiology",
      name: "الفسيولوجي",
      title: "الفسيولوجي",
      term: "term1",
      termNumber: 1,
      order: 2,
      icon: "❤️",
      color: "red"
    },
    {
      id: "english",
      key: "english",
      name: "اللغة الإنجليزية",
      title: "اللغة الإنجليزية",
      term: "term1",
      termNumber: 1,
      order: 3,
      icon: "🇬🇧",
      color: "purple"
    },
    {
      id: "fencing",
      key: "fencing",
      name: "المبارزة",
      title: "المبارزة",
      term: "term1",
      termNumber: 1,
      order: 4,
      icon: "🤺",
      color: "orange",
      paid: true
    },
    {
      id: "sport-anatomy",
      key: "sport-anatomy",
      name: "التشريح الرياضي",
      title: "التشريح الرياضي",
      term: "term1",
      termNumber: 1,
      order: 5,
      icon: "🏃",
      color: "green"
    },
    {
      id: "communication",
      key: "communication",
      name: "الاتصال والتواصل",
      title: "الاتصال والتواصل",
      term: "term1",
      termNumber: 1,
      order: 6,
      icon: "💬",
      color: "cyan"
    },
    {
      id: "movement",
      key: "movement",
      name: "علم الحركة",
      title: "علم الحركة",
      term: "term2",
      termNumber: 2,
      order: 1,
      icon: "🏃‍♂️",
      color: "green"
    },
    {
      id: "training",
      key: "training",
      name: "التدريب الرياضي",
      title: "التدريب الرياضي",
      term: "term2",
      termNumber: 2,
      order: 2,
      icon: "🏋️",
      color: "orange",
      paid: true
    },
    {
      id: "psychology",
      key: "psychology",
      name: "علم النفس الرياضي",
      title: "علم النفس الرياضي",
      term: "term2",
      termNumber: 2,
      order: 3,
      icon: "🧠",
      color: "purple",
      paid: true
    }
  ];

  /* =========================================================
     HELPERS
     ========================================================= */

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function safeString(value, fallback) {
    if (
      value === undefined ||
      value === null
    ) {
      return fallback !== undefined
        ? String(fallback)
        : "";
    }

    try {
      return String(value);
    } catch (error) {
      return fallback !== undefined
        ? String(fallback)
        : "";
    }
  }

  function normalizeIdentifier(value) {
    if (
      Core &&
      typeof Core.normalizeIdentifier ===
        "function"
    ) {
      return Core.normalizeIdentifier(value);
    }

    return safeString(value, "")
      .trim()
      .toLowerCase();
  }

  function normalizePhone(value) {
    if (
      Core &&
      typeof Core.normalizePhone ===
        "function"
    ) {
      return Core.normalizePhone(value);
    }

    return safeString(value, "")
      .replace(/[^\d]/g, "");
  }

  function firstValue() {
    if (
      Core &&
      typeof Core.firstValue ===
        "function"
    ) {
      return Core.firstValue.apply(
        null,
        arguments
      );
    }

    for (
      let i = 0;
      i < arguments.length;
      i++
    ) {
      if (
        arguments[i] !== undefined &&
        arguments[i] !== null &&
        arguments[i] !== ""
      ) {
        return arguments[i];
      }
    }

    return "";
  }

  function clone(value) {
    if (
      Core &&
      typeof Core.cloneObject ===
        "function"
    ) {
      return Core.cloneObject(value);
    }

    try {
      return JSON.parse(
        JSON.stringify(value)
      );
    } catch (error) {
      return value;
    }
  }

  function toArray(value) {
    if (
      DB.helpers &&
      typeof DB.helpers.toArray ===
        "function"
    ) {
      return DB.helpers.toArray(value);
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (isObject(value)) {
      return Object.keys(value).map(
        function (key) {
          return Object.assign(
            {
              _key: key,
              key: key
            },
            value[key]
          );
        }
      );
    }

    return [];
  }

  function number(value, fallback) {
    const n = Number(value);

    return Number.isFinite(n)
      ? n
      : fallback;
  }

  function normalizeTermId(value) {
    const raw =
      normalizeIdentifier(value);

    if (!raw) {
      return "";
    }

    const map = {
      "1": "term1",
      "01": "term1",
      "term 1": "term1",
      "first term": "term1",
      "الترم الاول": "term1",
      "الترم الأول": "term1",
      "الاول": "term1",
      "الأول": "term1",

      "2": "term2",
      "02": "term2",
      "term 2": "term2",
      "second term": "term2",
      "الترم الثاني": "term2",
      "الثاني": "term2",

      "3": "term3",
      "03": "term3",
      "term 3": "term3",
      "third term": "term3",
      "الترم الثالث": "term3",
      "الثالث": "term3",

      "4": "term4",
      "04": "term4",
      "term 4": "term4",
      "fourth term": "term4",
      "الترم الرابع": "term4",
      "الرابع": "term4"
    };

    return map[raw] || raw;
  }

  function getTermNumber(value) {
    const id =
      normalizeTermId(value);

    if (id === "term1") {
      return 1;
    }

    if (id === "term2") {
      return 2;
    }

    if (id === "term3") {
      return 3;
    }

    if (id === "term4") {
      return 4;
    }

    const n =
      Number(
        safeString(value, "")
          .replace(/[^\d]/g, "")
      );

    return Number.isFinite(n) && n > 0
      ? n
      : 0;
  }

  function normalizeSubjectId(value) {
    return normalizeIdentifier(
      safeString(value, "")
        .trim()
        .replace(/\s+/g, "-")
    );
  }

  function contentIsPublished(item) {
    if (!item) {
      return true;
    }

    const state =
      firstValue(
        item.published,
        item.active,
        item.isPublished,
        item.status
      );

    if (
      state === undefined ||
      state === null ||
      state === ""
    ) {
      return true;
    }

    if (state === true) {
      return true;
    }

    if (state === false) {
      return false;
    }

    const normalized =
      normalizeIdentifier(state);

    return ![
      "false",
      "0",
      "draft",
      "unpublished",
      "inactive",
      "disabled",
      "مسودة",
      "غير منشور",
      "غير منشورة"
    ].includes(normalized);
  }

  function sortContent(a, b) {
    const aOrder = number(
      firstValue(
        a && a.order,
        a && a.sortOrder,
        a && a.position,
        999999
      ),
      999999
    );

    const bOrder = number(
      firstValue(
        b && b.order,
        b && b.sortOrder,
        b && b.position,
        999999
      ),
      999999
    );

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aDate = number(
      firstValue(
        a && a.createdAt,
        a && a.updatedAt,
        0
      ),
      0
    );

    const bDate = number(
      firstValue(
        b && b.createdAt,
        b && b.updatedAt,
        0
      ),
      0
    );

    return bDate - aDate;
  }

  /* =========================================================
     SUBJECT NORMALIZATION
     ========================================================= */

  function normalizeSubject(item) {
    if (!isObject(item)) {
      return null;
    }

    const result = clone(item);

    const rawId =
      firstValue(
        item.id,
        item.subjectId,
        item.key,
        item._key,
        item.slug,
        item.code,
        item.name,
        item.title
      );

    result._key =
      firstValue(
        item._key,
        item.key,
        item.id,
        rawId
      );

    result.key = result._key;

    result.id =
      normalizeSubjectId(
        rawId
      );

    result.name =
      firstValue(
        item.name,
        item.title,
        item.subjectName,
        result.id,
        "مادة"
      );

    result.title =
      firstValue(
        item.title,
        item.name,
        result.name
      );

    result.description =
      firstValue(
        item.description,
        item.desc,
        ""
      );

    result.term =
      normalizeTermId(
        firstValue(
          item.term,
          item.semester,
          item.termId,
          item.termNumber,
          item.semesterNumber
        )
      );

    result.termNumber =
      getTermNumber(
        firstValue(
          item.termNumber,
          item.semesterNumber,
          result.term
        )
      );

    result.order =
      number(
        firstValue(
          item.order,
          item.sortOrder,
          item.position,
          999999
        ),
        999999
      );

    result.icon =
      firstValue(
        item.icon,
        item.emoji,
        "📚"
      );

    result.color =
      firstValue(
        item.color,
        "blue"
      );

    result.paid =
      Boolean(
        firstValue(
          item.paid,
          item.isPaid,
          false
        )
      );

    result.image =
      firstValue(
        item.image,
        item.imageUrl,
        item.thumbnail,
        ""
      );

    result.published =
      contentIsPublished(item);

    return result;
  }

  /* =========================================================
     DEFAULT SUBJECT MERGE
     ========================================================= */

  function mergeSubject(
    base,
    custom
  ) {
    if (!custom) {
      return clone(base);
    }

    return Object.assign(
      {},
      clone(base || {}),
      clone(custom || {}),
      {
        id: firstValue(
          custom.id,
          base && base.id
        ),
        key: firstValue(
          custom.key,
          base && base.key,
          custom.id,
          base && base.id
        ),
        name: firstValue(
          custom.name,
          custom.title,
          base && base.name,
          base && base.title
        ),
        title: firstValue(
          custom.title,
          custom.name,
          base && base.title,
          base && base.name
        )
      }
    );
  }

  /* =========================================================
     GET REMOTE SUBJECTS
     ========================================================= */

  async function getRemoteSubjects() {
    /*
     * We support several possible structures so future
     * sections can be added without changing this layer.
     */

    const possiblePaths = [
      "subjects",
      "courses/subjects",
      "courses"
    ];

    for (
      let i = 0;
      i < possiblePaths.length;
      i++
    ) {
      try {
        const data =
          await DB.get(
            possiblePaths[i]
          );

        if (!data) {
          continue;
        }

        const array =
          toArray(data)
            .map(normalizeSubject)
            .filter(Boolean);

        if (array.length) {
          return array;
        }
      } catch (error) {
        /*
         * One optional path being unavailable must not
         * prevent the application from using other content.
         */
      }
    }

    return [];
  }

  /* =========================================================
     GET ALL SUBJECTS
     ========================================================= */

  async function getSubjects(options) {
    options = options || {};

    const includeDefaults =
      options.includeDefaults !== false;

    let subjects = [];

    if (includeDefaults) {
      subjects =
        DEFAULT_SUBJECTS.map(
          normalizeSubject
        );
    }

    const remote =
      await getRemoteSubjects();

    /*
     * Remote data overrides matching defaults,
     * but does not remove defaults that have no
     * matching remote record.
     */
    remote.forEach(
      function (remoteSubject) {
        const remoteId =
          normalizeSubjectId(
            firstValue(
              remoteSubject.id,
              remoteSubject.key
            )
          );

        const index =
          subjects.findIndex(
            function (subject) {
              return (
                normalizeSubjectId(
                  subject.id
                ) === remoteId
              );
            }
          );

        if (index >= 0) {
          subjects[index] =
            mergeSubject(
              subjects[index],
              remoteSubject
            );
        } else {
          subjects.push(
            remoteSubject
          );
        }
      }
    );

    if (
      options.publishedOnly !== false
    ) {
      subjects =
        subjects.filter(
          function (subject) {
            return (
              subject.published !== false
            );
          }
        );
    }

    if (options.term) {
      const term =
        normalizeTermId(
          options.term
        );

      subjects =
        subjects.filter(
          function (subject) {
            return (
              normalizeTermId(
                firstValue(
                  subject.term,
                  subject.termNumber
                )
              ) === term
            );
          }
        );
    }

    subjects.sort(sortContent);

    return subjects;
  }

  /* =========================================================
     GET SUBJECT BY ID
     ========================================================= */

  async function getSubjectById(
    subjectId,
    options
  ) {
    if (!subjectId) {
      return null;
    }

    const normalized =
      normalizeSubjectId(
        subjectId
      );

    const subjects =
      await getSubjects(
        options || {}
      );

    return (
      subjects.find(
        function (subject) {
          return (
            normalizeSubjectId(
              subject.id
            ) === normalized ||
            normalizeSubjectId(
              subject.key
            ) === normalized
          );
        }
      ) || null
    );
  }

  /* =========================================================
     GET SUBJECT COUNTS
     ========================================================= */

  async function getSubjectCounts(
    subjectId,
    options
  ) {
    options = options || {};

    const subject =
      await getSubjectById(
        subjectId,
        options
      );

    const subjectFilter =
      subject
        ? firstValue(
            subject.id,
            subject.key
          )
        : subjectId;

    let files = [];
    let videos = [];
    let quizzes = [];

    try {
      files =
        await DB.files.getAll({
          subject: subjectFilter,
          term: options.term,
          grade: options.grade,
          published: true
        });
    } catch (error) {
      files = [];
    }

    try {
      videos =
        await DB.videos.getAll({
          subject: subjectFilter,
          term: options.term,
          grade: options.grade,
          published: true
        });
    } catch (error) {
      videos = [];
    }

    try {
      quizzes =
        await DB.quizzes.getAll({
          subject: subjectFilter,
          term: options.term,
          grade: options.grade,
          published: true
        });
    } catch (error) {
      quizzes = [];
    }

    /*
     * If Firebase content uses a subject name instead of
     * the ID, perform a secondary matching pass.
     */
    if (
      subject &&
      subject.name &&
      files.length === 0
    ) {
      try {
        const allFiles =
          await DB.files.getAll({
            published: true
          });

        files =
          allFiles.filter(
            function (file) {
              return (
                normalizeIdentifier(
                  firstValue(
                    file.subject,
                    file.subjectName,
                    file.course
                  )
                ) ===
                normalizeIdentifier(
                  subject.name
                )
              );
            }
          );
      } catch (error) {
        // Ignore fallback failure.
      }
    }

    if (
      subject &&
      subject.name &&
      videos.length === 0
    ) {
      try {
        const allVideos =
          await DB.videos.getAll({
            published: true
          });

        videos =
          allVideos.filter(
            function (video) {
              return (
                normalizeIdentifier(
                  firstValue(
                    video.subject,
                    video.subjectName,
                    video.course
                  )
                ) ===
                normalizeIdentifier(
                  subject.name
                )
              );
            }
          );
      } catch (error) {
        // Ignore fallback failure.
      }
    }

    if (
      subject &&
      subject.name &&
      quizzes.length === 0
    ) {
      try {
        const allQuizzes =
          await DB.quizzes.getAll({
            published: true
          });

        quizzes =
          allQuizzes.filter(
            function (quiz) {
              return (
                normalizeIdentifier(
                  firstValue(
                    quiz.subject,
                    quiz.subjectName,
                    quiz.course
                  )
                ) ===
                normalizeIdentifier(
                  subject.name
                )
              );
            }
          );
      } catch (error) {
        // Ignore fallback failure.
      }
    }

    return {
      subjectId:
        subject
          ? firstValue(
              subject.id,
              subject.key
            )
          : subjectId,

      files: files.length,
      videos: videos.length,
      quizzes: quizzes.length,

      total:
        files.length +
        videos.length +
        quizzes.length
    };
  }

  /* =========================================================
     GET ALL SUBJECT COUNTS
     ========================================================= */

  async function getAllSubjectCounts(
    options
  ) {
    const subjects =
      await getSubjects(
        options || {}
      );

    const result = {};

    for (
      let i = 0;
      i < subjects.length;
      i++
    ) {
      const subject =
        subjects[i];

      const id =
        firstValue(
          subject.id,
          subject.key
        );

      result[id] =
        await getSubjectCounts(
          id,
          options || {}
        );
    }

    return result;
  }

  /* =========================================================
     TERMS
     ========================================================= */

  function normalizeTerm(item) {
    if (!isObject(item)) {
      return null;
    }

    const result =
      clone(item);

    result.id =
      normalizeTermId(
        firstValue(
          item.id,
          item.key,
          item.term,
          item.semester,
          item.number
        )
      );

    result.key =
      result.id;

    result.number =
      getTermNumber(
        firstValue(
          item.number,
          item.termNumber,
          item.semesterNumber,
          result.id
        )
      );

    result.name =
      firstValue(
        item.name,
        item.title,
        "الترم " +
          result.number
      );

    result.title =
      firstValue(
        item.title,
        item.name,
        result.name
      );

    return result;
  }

  async function getTerms(
    options
  ) {
    options = options || {};

    let remote = [];

    const possiblePaths = [
      "terms",
      "settings/terms",
      "courses/terms"
    ];

    for (
      let i = 0;
      i < possiblePaths.length;
      i++
    ) {
      try {
        const data =
          await DB.get(
            possiblePaths[i]
          );

        if (!data) {
          continue;
        }

        remote =
          toArray(data)
            .map(normalizeTerm)
            .filter(Boolean);

        if (remote.length) {
          break;
        }
      } catch (error) {
        // Optional path.
      }
    }

    const terms =
      DEFAULT_TERMS.map(
        function (term) {
          return clone(term);
        }
      );

    remote.forEach(
      function (remoteTerm) {
        const index =
          terms.findIndex(
            function (term) {
              return (
                normalizeTermId(
                  term.id
                ) ===
                normalizeTermId(
                  remoteTerm.id
                )
              );
            }
          );

        if (index >= 0) {
          terms[index] =
            Object.assign(
              {},
              terms[index],
              remoteTerm
            );
        } else {
          terms.push(
            remoteTerm
          );
        }
      }
    );

    const subjects =
      await getSubjects({
        includeDefaults:
          options.includeDefaults !==
          false,
        publishedOnly:
          options.publishedOnly !== false
      });

    terms.forEach(
      function (term) {
        term.subjects =
          subjects.filter(
            function (subject) {
              return (
                normalizeTermId(
                  firstValue(
                    subject.term,
                    subject.termNumber
                  )
                ) ===
                normalizeTermId(
                  term.id
                )
              );
            }
          );
      }
    );

    terms.sort(
      function (a, b) {
        return (
          number(a.number, 999) -
          number(b.number, 999)
        );
      }
    );

    return terms;
  }

  /* =========================================================
     FILES BY SUBJECT
     ========================================================= */

  async function getFilesForSubject(
    subjectId,
    options
  ) {
    options = options || {};

    const subject =
      await getSubjectById(
        subjectId,
        options
      );

    const requestedSubject =
      subject
        ? firstValue(
            subject.id,
            subject.key
          )
        : subjectId;

    let files = [];

    try {
      files =
        await DB.files.getAll({
          subject:
            requestedSubject,
          term:
            options.term,
          grade:
            options.grade,
          published:
            options.published !== false
        });
    } catch (error) {
      files = [];
    }

    /*
     * Fallback for legacy records that used the
     * subject name rather than the subject ID.
     */
    if (
      files.length === 0 &&
      subject
    ) {
      try {
        const allFiles =
          await DB.files.getAll({
            term:
              options.term,
            grade:
              options.grade,
            published:
              options.published !== false
          });

        files =
          allFiles.filter(
            function (file) {
              const value =
                firstValue(
                  file.subject,
                  file.subjectName,
                  file.course
                );

              return (
                normalizeIdentifier(
                  value
                ) ===
                normalizeIdentifier(
                  subject.name
                )
              );
            }
          );
      } catch (error) {
        // Ignore fallback failure.
      }
    }

    return files;
  }

  /* =========================================================
     VIDEOS BY SUBJECT
     ========================================================= */

  async function getVideosForSubject(
    subjectId,
    options
  ) {
    options = options || {};

    const subject =
      await getSubjectById(
        subjectId,
        options
      );

    const requestedSubject =
      subject
        ? firstValue(
            subject.id,
            subject.key
          )
        : subjectId;

    let videos = [];

    try {
      videos =
        await DB.videos.getAll({
          subject:
            requestedSubject,
          term:
            options.term,
          grade:
            options.grade,
          published:
            options.published !== false
        });
    } catch (error) {
      videos = [];
    }

    if (
      videos.length === 0 &&
      subject
    ) {
      try {
        const allVideos =
          await DB.videos.getAll({
            term:
              options.term,
            grade:
              options.grade,
            published:
              options.published !== false
          });

        videos =
          allVideos.filter(
            function (video) {
              const value =
                firstValue(
                  video.subject,
                  video.subjectName,
                  video.course
                );

              return (
                normalizeIdentifier(
                  value
                ) ===
                normalizeIdentifier(
                  subject.name
                )
              );
            }
          );
      } catch (error) {
        // Ignore fallback failure.
      }
    }

    return videos;
  }

  /* =========================================================
     QUIZZES BY SUBJECT
     ========================================================= */

  async function getQuizzesForSubject(
    subjectId,
    options
  ) {
    options = options || {};

    const subject =
      await getSubjectById(
        subjectId,
        options
      );

    const requestedSubject =
      subject
        ? firstValue(
            subject.id,
            subject.key
          )
        : subjectId;

    let quizzes = [];

    try {
      quizzes =
        await DB.quizzes.getAll({
          subject:
            requestedSubject,
          term:
            options.term,
          grade:
            options.grade,
          published:
            options.published !== false
        });
    } catch (error) {
      quizzes = [];
    }

    if (
      quizzes.length === 0 &&
      subject
    ) {
      try {
        const allQuizzes =
          await DB.quizzes.getAll({
            term:
              options.term,
            grade:
              options.grade,
            published:
              options.published !== false
          });

        quizzes =
          allQuizzes.filter(
            function (quiz) {
              const value =
                firstValue(
                  quiz.subject,
                  quiz.subjectName,
                  quiz.course
                );

              return (
                normalizeIdentifier(
                  value
                ) ===
                normalizeIdentifier(
                  subject.name
                )
              );
            }
          );
      } catch (error) {
        // Ignore fallback failure.
      }
    }

    return quizzes;
  }

  /* =========================================================
     COMPLETE SUBJECT CONTENT
     ========================================================= */

  async function getSubjectContent(
    subjectId,
    options
  ) {
    options = options || {};

    const subject =
      await getSubjectById(
        subjectId,
        options
      );

    if (!subject) {
      return null;
    }

    const [
      files,
      videos,
      quizzes
    ] = await Promise.all([
      getFilesForSubject(
        subject.id,
        options
      ),
      getVideosForSubject(
        subject.id,
        options
      ),
      getQuizzesForSubject(
        subject.id,
        options
      )
    ]);

    return {
      subject: subject,

      files: files,
      videos: videos,
      quizzes: quizzes,

      counts: {
        files: files.length,
        videos: videos.length,
        quizzes: quizzes.length,
        total:
          files.length +
          videos.length +
          quizzes.length
      }
    };
  }

  /* =========================================================
     COMPLETE COURSE CONTENT
     ========================================================= */

  async function getTermContent(
    termId,
    options
  ) {
    options = options || {};

    const term =
      normalizeTermId(
        termId
      );

    const subjects =
      await getSubjects({
        includeDefaults:
          options.includeDefaults !==
          false,
        publishedOnly:
          options.publishedOnly !==
          false,
        term: term
      });

    const result = {
      term: term,
      subjects: [],
      totals: {
        files: 0,
        videos: 0,
        quizzes: 0,
        subjects: subjects.length
      }
    };

    for (
      let i = 0;
      i < subjects.length;
      i++
    ) {
      const content =
        await getSubjectContent(
          subjects[i].id,
          options
        );

      if (!content) {
        continue;
      }

      result.subjects.push(
        content
      );

      result.totals.files +=
        content.counts.files;

      result.totals.videos +=
        content.counts.videos;

      result.totals.quizzes +=
        content.counts.quizzes;
    }

    return result;
  }

  /* =========================================================
     SEARCH CONTENT
     ========================================================= */

  function searchTextMatch(
    item,
    query
  ) {
    if (!item || !query) {
      return false;
    }

    const normalizedQuery =
      normalizeIdentifier(
        query
      );

    const fields = [
      item.title,
      item.name,
      item.description,
      item.subject,
      item.subjectName,
      item.course,
      item.text,
      item.question
    ];

    return fields.some(
      function (field) {
        return (
          normalizeIdentifier(
            field
          ).indexOf(
            normalizedQuery
          ) !== -1
        );
      }
    );
  }

  async function searchContent(
    query,
    options
  ) {
    options = options || {};

    const cleanQuery =
      safeString(
        query,
        ""
      ).trim();

    if (!cleanQuery) {
      return {
        subjects: [],
        files: [],
        videos: [],
        quizzes: []
      };
    }

    const [
      subjects,
      files,
      videos,
      quizzes
    ] = await Promise.all([
      getSubjects({
        includeDefaults: true,
        publishedOnly: true
      }),
      DB.files.getAll({
        published: true
      }),
      DB.videos.getAll({
        published: true
      }),
      DB.quizzes.getAll({
        published: true
      })
    ]);

    return {
      subjects:
        subjects.filter(
          function (item) {
            return searchTextMatch(
              item,
              cleanQuery
            );
          }
        ),

      files:
        files.filter(
          function (item) {
            return searchTextMatch(
              item,
              cleanQuery
            );
          }
        ),

      videos:
        videos.filter(
          function (item) {
            return searchTextMatch(
              item,
              cleanQuery
            );
          }
        ),

      quizzes:
        quizzes.filter(
          function (item) {
            return searchTextMatch(
              item,
              cleanQuery
            );
          }
        )
    };
  }

  /* =========================================================
     CURRENT STUDENT
     ========================================================= */

  async function getCurrentStudent() {
    try {
      return await DB.students.getCurrent();
    } catch (error) {
      return null;
    }
  }

  /* =========================================================
     CONTENT VIEW TRACKING
     ========================================================= */

  async function markContentViewed(
    contentType,
    contentId,
    extra
  ) {
    const student =
      await getCurrentStudent();

    if (!student) {
      return false;
    }

    const studentKey =
      firstValue(
        student._key,
        student.key,
        student.id,
        student.studentId
      );

    if (!studentKey) {
      return false;
    }

    const normalizedType =
      normalizeIdentifier(
        contentType
      ) || "content";

    const normalizedId =
      safeString(
        contentId,
        ""
      ).trim();

    if (!normalizedId) {
      return false;
    }

    const data =
      Object.assign(
        {},
        isObject(extra)
          ? clone(extra)
          : {},
        {
          contentType:
            normalizedType,
          contentId:
            normalizedId
        }
      );

    try {
      await DB.contentViews.save(
        studentKey,
        normalizedType +
          "_" +
          normalizedId,
        data
      );

      return true;
    } catch (error) {
      /*
       * Tracking must never prevent the student
       * from viewing content.
       */
      return false;
    }
  }

  async function getViewedContent() {
    const student =
      await getCurrentStudent();

    if (!student) {
      return {};
    }

    const studentKey =
      firstValue(
        student._key,
        student.key,
        student.id,
        student.studentId
      );

    if (!studentKey) {
      return {};
    }

    try {
      return await DB.contentViews.getAll(
        studentKey
      );
    } catch (error) {
      return {};
    }
  }

  /* =========================================================
     DASHBOARD SUMMARY
     ========================================================= */

  async function getDashboardContent(
    options
  ) {
    options = options || {};

    const [
      subjects,
      terms
    ] = await Promise.all([
      getSubjects({
        includeDefaults: true,
        publishedOnly: true,
        term: options.term
      }),
      getTerms({
        includeDefaults: true,
        publishedOnly: true
      })
    ]);

    let files = [];
    let videos = [];
    let quizzes = [];

    try {
      files =
        await DB.files.getAll({
          term: options.term,
          grade: options.grade,
          published: true
        });
    } catch (error) {
      files = [];
    }

    try {
      videos =
        await DB.videos.getAll({
          term: options.term,
          grade: options.grade,
          published: true
        });
    } catch (error) {
      videos = [];
    }

    try {
      quizzes =
        await DB.quizzes.getAll({
          term: options.term,
          grade: options.grade,
          published: true
        });
    } catch (error) {
      quizzes = [];
    }

    return {
      subjects: subjects,
      terms: terms,

      files: files,
      videos: videos,
      quizzes: quizzes,

      counts: {
        subjects: subjects.length,
        terms: terms.length,
        files: files.length,
        videos: videos.length,
        quizzes: quizzes.length,

        totalContent:
          files.length +
          videos.length +
          quizzes.length
      }
    };
  }

  /* =========================================================
     SUBJECT ALIASES
     ========================================================= */

  const aliases = {
    التشريح: "anatomy",
    anatomy: "anatomy",

    الفسيولوجي: "physiology",
    الفسيولوجى: "physiology",
    physiology: "physiology",

    الانجليزية: "english",
    الإنجليزية: "english",
    english: "english",

    المبارزة: "fencing",
    fencing: "fencing",

    "التشريح الرياضي":
      "sport-anatomy",
    "التشريح الرياضى":
      "sport-anatomy",
    "sport anatomy":
      "sport-anatomy",

    "الاتصال والتواصل":
      "communication",
    communication:
      "communication",

    "علم الحركة":
      "movement",
    movement:
      "movement",

    "التدريب الرياضي":
      "training",
    "التدريب الرياضى":
      "training",
    training:
      "training",

    "علم النفس الرياضي":
      "psychology",
    "علم النفس الرياضى":
      "psychology",
    psychology:
      "psychology"
  };

  function resolveSubjectId(
    value
  ) {
    const normalized =
      normalizeIdentifier(
        value
      );

    if (
      aliases[normalized]
    ) {
      return aliases[
        normalized
      ];
    }

    return normalizeSubjectId(
      value
    );
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  const FirebaseContent = {
    version:
      CONTENT_VERSION,

    defaults: {
      terms:
        clone(DEFAULT_TERMS),

      subjects:
        clone(DEFAULT_SUBJECTS)
    },

    getSubjects:
      getSubjects,

    getSubjectById:
      getSubjectById,

    getSubjectCounts:
      getSubjectCounts,

    getAllSubjectCounts:
      getAllSubjectCounts,

    getTerms:
      getTerms,

    getFilesForSubject:
      getFilesForSubject,

    getVideosForSubject:
      getVideosForSubject,

    getQuizzesForSubject:
      getQuizzesForSubject,

    getSubjectContent:
      getSubjectContent,

    getTermContent:
      getTermContent,

    getDashboardContent:
      getDashboardContent,

    search:
      searchContent,

    getCurrentStudent:
      getCurrentStudent,

    markViewed:
      markContentViewed,

    getViewed:
      getViewedContent,

    resolveSubjectId:
      resolveSubjectId,

    normalizeSubject:
      normalizeSubject,

    normalizeTerm:
      normalizeTerm,

    helpers: {
      normalizeTermId:
        normalizeTermId,

      getTermNumber:
        getTermNumber,

      normalizeSubjectId:
        normalizeSubjectId,

      contentIsPublished:
        contentIsPublished,

      sortContent:
        sortContent,

      searchTextMatch:
        searchTextMatch
    }
  };

  /* =========================================================
     REGISTER MODULE
     ========================================================= */

  if (
    Core.modules &&
    typeof Core.modules ===
      "object"
  ) {
    Core.modules.content =
      FirebaseContent;
  }

  window.FirebaseContent =
    FirebaseContent;

  window.FirebaseContentReady =
    true;

  window.FirebaseContentReadyPromise =
    Promise.resolve(
      FirebaseContent
    );

  console.log(
    "Firebase Content Layer initialized successfully."
  );

})(window);
