/**
 * ============================================================
 * COACH PLATFORM
 * Firebase Realtime Database Layer
 * ============================================================
 *
 * File:
 *   firebase-database.js
 *
 * Version:
 *   Final Architecture
 *
 * Depends on:
 *   firebase-config.js
 *   firebase-auth.js
 *
 * Firebase:
 *   Realtime Database
 *
 * IMPORTANT:
 *   - NON-DESTRUCTIVE.
 *   - Does NOT delete existing Firebase data.
 *   - Does NOT reset existing Firebase data.
 *   - Does NOT perform automatic migration.
 *   - Preserves legacy database structures.
 *   - Supports both legacy and new paths.
 *   - Does NOT modify index.css.
 *   - Does NOT modify website design.
 *
 * Supported existing paths:
 *   /students
 *   /quizzes
 *   /quiz_results
 *   /notifications
 *   /content_views
 *   /stats
 *
 * Supported platform paths:
 *   /files
 *   /videos
 *   /notificationReads
 *   /quizAttempts
 *   /results
 *   /settings
 *   /settings/support
 *   /supportTickets
 *
 * ============================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     1. DEPENDENCY CHECK
     ============================================================ */

  if (!window.FirebaseCore) {
    throw new Error(
      "[FirebaseDatabase] firebase-config.js must be loaded first."
    );
  }

  if (!window.FirebaseAuth) {
    throw new Error(
      "[FirebaseDatabase] firebase-auth.js must be loaded first."
    );
  }


  /* ============================================================
     2. CORE REFERENCES
     ============================================================ */

  const Core = window.FirebaseCore;
  const Auth = window.FirebaseAuth;

  const database = Core.database;

  if (!database) {
    throw new Error(
      "[FirebaseDatabase] Firebase Realtime Database is unavailable."
    );
  }


  /* ============================================================
     3. PATH REGISTRY
     ============================================================ */

  const PATHS = Object.freeze({

    students:
      "students",

    files:
      "files",

    videos:
      "videos",

    notifications:
      "notifications",

    notificationReads:
      "notificationReads",

    quizzes:
      "quizzes",

    quizAttempts:
      "quizAttempts",

    results:
      "results",

    legacyResults:
      "quiz_results",

    contentViews:
      "content_views",

    support:
      "settings/support",

    supportTickets:
      "supportTickets",

    settings:
      "settings",

    stats:
      "stats"
  });


  /* ============================================================
     4. GENERAL HELPERS
     ============================================================ */

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function hasValue(value) {
    return (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    );
  }


  function normalizeIdentifier(value) {
    if (!hasValue(value)) {
      return "";
    }

    return String(value)
      .trim()
      .toLowerCase();
  }


  function normalizePhone(value) {
    if (!hasValue(value)) {
      return "";
    }

    let phone = String(value)
      .trim()
      .replace(/[^\d+]/g, "");

    /*
     * Normalize Egyptian phone numbers into a comparable
     * international representation.
     *
     * Examples:
     * 01012345678
     * +201012345678
     * 201012345678
     */

    if (phone.indexOf("00") === 0) {
      phone = "+" + phone.substring(2);
    }

    if (phone.indexOf("+20") === 0) {
      return phone;
    }

    if (phone.indexOf("20") === 0 && phone.length >= 12) {
      return "+" + phone;
    }

    if (
      phone.indexOf("0") === 0 &&
      phone.length === 11
    ) {
      return "+20" + phone.substring(1);
    }

    return phone;
  }


  function toArray(value) {
    if (Array.isArray(value)) {
      return value.slice();
    }

    if (!isObject(value)) {
      return [];
    }

    return Object.keys(value).map(function (key) {

      const item = value[key];

      if (isObject(item)) {
        return Object.assign(
          {
            key: key,
            _key: key
          },
          item
        );
      }

      return {
        key: key,
        _key: key,
        value: item
      };
    });
  }


  function clone(value) {
    if (!isObject(value)) {
      return value;
    }

    return Object.assign({}, value);
  }


  function timestamp() {
    return Core.serverTimestamp();
  }


  function currentUser() {
    if (
      Auth &&
      typeof Auth.getCurrentUser === "function"
    ) {
      return Auth.getCurrentUser();
    }

    if (
      Core &&
      typeof Core.getCurrentUser === "function"
    ) {
      return Core.getCurrentUser();
    }

    return null;
  }


  function safeString(value) {
    if (!hasValue(value)) {
      return "";
    }

    return String(value).trim();
  }


  function getErrorMessage(error) {

    if (
      Core &&
      typeof Core.getErrorMessage === "function"
    ) {
      return Core.getErrorMessage(
        error,
        "حدث خطأ أثناء التعامل مع قاعدة البيانات."
      );
    }

    if (
      error &&
      error.message
    ) {
      return String(error.message);
    }

    return "حدث خطأ أثناء التعامل مع قاعدة البيانات.";
  }


  function makeError(error, fallbackMessage) {

    const normalized =
      new Error(
        getErrorMessage(error) ||
        fallbackMessage ||
        "حدث خطأ."
      );

    normalized.code =
      error && error.code
        ? String(error.code)
        : "";

    normalized.originalError =
      error || null;

    return normalized;
  }


  function isTimestampLike(value) {
    if (typeof value === "number") {
      return true;
    }

    if (
      value instanceof Date
    ) {
      return true;
    }

    if (
      typeof value === "string" &&
      !isNaN(
        Date.parse(value)
      )
    ) {
      return true;
    }

    return false;
  }


  function timestampValue(value) {

    if (
      value === undefined ||
      value === null
    ) {
      return 0;
    }

    if (typeof value === "number") {
      return value;
    }

    if (
      value instanceof Date
    ) {
      return value.getTime();
    }

    if (
      typeof value === "string"
    ) {
      const parsed =
        Date.parse(value);

      return isNaN(parsed)
        ? 0
        : parsed;
    }

    return 0;
  }


  function sortByOrderAndDate(a, b) {

    const aOrder =
      Number(
        a &&
        (
          a.order ??
          a.sortOrder ??
          999999
        )
      );

    const bOrder =
      Number(
        b &&
        (
          b.order ??
          b.sortOrder ??
          999999
        )
      );

    if (
      !isNaN(aOrder) &&
      !isNaN(bOrder) &&
      aOrder !== bOrder
    ) {
      return aOrder - bOrder;
    }

    return (
      timestampValue(
        b &&
        (
          b.createdAt ||
          b.updatedAt ||
          b.submittedAt
        )
      ) -
      timestampValue(
        a &&
        (
          a.createdAt ||
          a.updatedAt ||
          a.submittedAt
        )
      )
    );
  }


  /* ============================================================
     5. GENERIC DATABASE OPERATIONS
     ============================================================ */

  async function get(path, options) {

    options = options || {};

    try {

      const snapshot =
        await Core.ref(path).once("value");

      if (!snapshot.exists()) {
        return options.defaultValue !== undefined
          ? options.defaultValue
          : null;
      }

      return snapshot.val();

    } catch (error) {
      throw makeError(
        error,
        "تعذر قراءة البيانات من Firebase."
      );
    }
  }


  async function exists(path) {

    try {

      const snapshot =
        await Core.ref(path).once("value");

      return snapshot.exists();

    } catch (error) {
      throw makeError(
        error,
        "تعذر التحقق من البيانات."
      );
    }
  }


  function listen(path, callback) {

    if (
      typeof callback !== "function"
    ) {
      throw new TypeError(
        "[FirebaseDatabase] listen requires a callback."
      );
    }

    const reference =
      Core.ref(path);

    const handler =
      function (snapshot) {

        callback(
          snapshot.exists()
            ? snapshot.val()
            : null,
          snapshot
        );
      };

    reference.on(
      "value",
      handler
    );

    return function unsubscribe() {

      reference.off(
        "value",
        handler
      );
    };
  }


  async function update(path, changes) {

    if (
      !isObject(changes)
    ) {
      throw new Error(
        "بيانات التحديث غير صالحة."
      );
    }

    try {

      await Core.ref(path)
        .update(changes);

      return true;

    } catch (error) {

      throw makeError(
        error,
        "تعذر حفظ البيانات."
      );
    }
  }


  async function push(path, data) {

    try {

      const reference =
        Core.ref(path).push();

      if (
        data === undefined
      ) {
        await reference.set(
          null
        );
      } else {
        await reference.set(
          data
        );
      }

      return {
        key: reference.key,
        data: data
      };

    } catch (error) {

      throw makeError(
        error,
        "تعذر إضافة البيانات."
      );
    }
  }


  function section(path) {
    return Core.ref(path);
  }


  /* ============================================================
     6. STUDENT IDENTITY
     ============================================================ */

  function getLocalIdentity() {

    const result = {};

    const keys = [
      "currentUser",
      "student",
      "currentStudent",
      "currentStudentKey"
    ];

    keys.forEach(function (key) {

      try {

        const raw =
          localStorage.getItem(key);

        if (!raw) {
          return;
        }

        try {
          result[key] =
            JSON.parse(raw);
        } catch (error) {
          result[key] = raw;
        }

      } catch (error) {
        /*
         * Ignore localStorage errors.
         */
      }
    });

    return result;
  }


  function getIdentityCandidates() {

    const candidates = [];

    const user =
      currentUser();

    if (user) {

      if (hasValue(user.uid)) {
        candidates.push({
          type: "uid",
          value: String(user.uid)
        });
      }

      if (hasValue(user.email)) {
        candidates.push({
          type: "email",
          value: normalizeIdentifier(
            user.email
          )
        });
      }

      if (hasValue(user.phoneNumber)) {
        candidates.push({
          type: "phone",
          value: normalizePhone(
            user.phoneNumber
          )
        });
      }
    }


    const local =
      getLocalIdentity();


    if (
      hasValue(
        local.currentStudentKey
      )
    ) {

      const value =
        typeof local.currentStudentKey === "object"
          ? (
              local.currentStudentKey._key ||
              local.currentStudentKey.key ||
              local.currentStudentKey.studentKey ||
              ""
            )
          : local.currentStudentKey;

      if (hasValue(value)) {
        candidates.push({
          type: "key",
          value: String(value)
        });
      }
    }


    [
      local.student,
      local.currentStudent,
      local.currentUser
    ].forEach(function (identity) {

      if (!identity) {
        return;
      }

      if (typeof identity === "string") {

        candidates.push({
          type: "key",
          value: identity
        });

        return;
      }

      if (!isObject(identity)) {
        return;
      }


      [
        "uid",
        "userId",
        "id",
        "studentId",
        "studentKey",
        "key",
        "_key"
      ].forEach(function (field) {

        if (
          hasValue(identity[field])
        ) {

          candidates.push({
            type: "key",
            value: String(
              identity[field]
            )
          });
        }
      });


      if (
        hasValue(identity.email)
      ) {

        candidates.push({
          type: "email",
          value: normalizeIdentifier(
            identity.email
          )
        });
      }


      if (
        hasValue(identity.phone) ||
        hasValue(identity.phoneNumber)
      ) {

        candidates.push({
          type: "phone",
          value: normalizePhone(
            identity.phone ||
            identity.phoneNumber
          )
        });
      }
    });


    /*
     * Remove duplicates.
     */

    const unique = [];
    const seen = {};

    candidates.forEach(function (candidate) {

      if (
        !candidate ||
        !hasValue(candidate.value)
      ) {
        return;
      }

      const signature =
        candidate.type +
        ":" +
        String(candidate.value);

      if (seen[signature]) {
        return;
      }

      seen[signature] = true;
      unique.push(candidate);
    });

    return unique;
  }


  function studentMatchesCandidate(
    student,
    key,
    candidate
  ) {

    if (
      !student ||
      !candidate
    ) {
      return false;
    }

    const value =
      String(candidate.value)
        .trim();

    if (!value) {
      return false;
    }


    if (
      candidate.type === "email"
    ) {

      return (
        normalizeIdentifier(
          student.email
        ) ===
        normalizeIdentifier(
          value
        )
      );
    }


    if (
      candidate.type === "phone"
    ) {

      const candidatePhone =
        normalizePhone(value);

      const studentPhones = [
        student.phone,
        student.phoneNumber,
        student.mobile,
        student.whatsapp
      ];

      return studentPhones.some(
        function (phone) {

          return (
            hasValue(phone) &&
            normalizePhone(phone) ===
              candidatePhone
          );
        }
      );
    }


    const identifiers = [

      key,

      student._key,
      student.key,
      student.studentKey,

      student.uid,
      student.userId,
      student.id,
      student.studentId
    ];

    return identifiers.some(
      function (identifier) {

        return (
          hasValue(identifier) &&
          String(identifier).trim() ===
            value
        );
      }
    );
  }


  function studentStatusRank(student) {

    const status =
      String(
        student &&
        student.status
          ? student.status
          : ""
      )
      .trim()
      .toLowerCase();

    if (
      status === "approved" ||
      status === "active" ||
      status === "مقبول" ||
      status === "نشط"
    ) {
      return 3;
    }

    if (
      status === "pending" ||
      status === "قيد المراجعة"
    ) {
      return 2;
    }

    if (
      status === "rejected" ||
      status === "مرفوض"
    ) {
      return 1;
    }

    return 0;
  }


  function chooseBestStudent(
    matches
  ) {

    if (!matches.length) {
      return null;
    }

    matches.sort(
      function (a, b) {

        /*
         * Exact stored student key has highest priority.
         */

        if (
          a.exactKey !==
          b.exactKey
        ) {
          return a.exactKey
            ? -1
            : 1;
        }


        /*
         * Approved/active students are preferred.
         */

        const statusDifference =
          studentStatusRank(
            b.student
          ) -
          studentStatusRank(
            a.student
          );

        if (
          statusDifference !== 0
        ) {
          return statusDifference;
        }


        /*
         * Newer records are preferred when all other
         * identifiers/status values are equal.
         */

        return (
          timestampValue(
            b.student.createdAt
          ) -
          timestampValue(
            a.student.createdAt
          )
        );
      }
    );

    return matches[0];
  }


  async function findStudent() {

    const studentsData =
      await get(
        PATHS.students,
        {
          defaultValue: null
        }
      );

    if (!studentsData) {
      return null;
    }

    const students =
      toArray(studentsData);

    const candidates =
      getIdentityCandidates();

    if (!candidates.length) {
      return null;
    }

    const matches = [];


    students.forEach(function (student) {

      if (!student) {
        return;
      }

      const key =
        student._key ||
        student.key ||
        "";

      let exactKey = false;
      let matched = false;

      candidates.forEach(
        function (candidate) {

          if (
            studentMatchesCandidate(
              student,
              key,
              candidate
            )
          ) {

            matched = true;

            if (
              candidate.type === "key" &&
              String(candidate.value) ===
                String(key)
            ) {
              exactKey = true;
            }
          }
        }
      );

      if (matched) {

        matches.push({
          student: student,
          exactKey: exactKey
        });
      }
    });


    const selected =
      chooseBestStudent(matches);

    if (!selected) {
      return null;
    }

    const result =
      clone(selected.student);

    const studentKey =
      selected.student._key ||
      selected.student.key ||
      selected.student.studentKey ||
      "";


    if (studentKey) {

      result._key =
        studentKey;

      result.key =
        result.key ||
        studentKey;
    }

    return result;
  }


  async function getStudentByKey(
    studentKey
  ) {

    if (!hasValue(studentKey)) {
      return null;
    }

    const data =
      await get(
        PATHS.students +
        "/" +
        String(studentKey)
      );

    if (!data) {
      return null;
    }

    const result =
      clone(data);

    result._key =
      String(studentKey);

    result.key =
      result.key ||
      String(studentKey);

    return result;
  }


  async function getCurrentStudent() {

    return findStudent();
  }


  /* ============================================================
     7. LINK FIREBASE AUTH TO EXISTING STUDENT
     ============================================================ */

  async function linkStudentToAuth(
    student,
    user
  ) {

    if (!student) {
      return null;
    }

    user =
      user ||
      currentUser();

    if (!user) {
      return student;
    }

    const studentKey =
      student._key ||
      student.key ||
      student.studentKey ||
      "";

    if (!studentKey) {
      return student;
    }


    /*
     * Only add identity fields.
     *
     * Existing student information is preserved.
     */

    const changes = {};


    if (
      hasValue(user.uid) &&
      student.uid !== user.uid
    ) {
      changes.uid =
        user.uid;
    }


    if (
      hasValue(user.email) &&
      !hasValue(student.email)
    ) {
      changes.email =
        user.email;
    }


    if (
      hasValue(user.phoneNumber) &&
      !hasValue(student.phone)
    ) {
      changes.phone =
        user.phoneNumber;
    }


    if (
      Object.keys(changes).length === 0
    ) {
      return student;
    }


    /*
     * IMPORTANT:
     * This update only adds missing/identity information.
     * It does not replace the student object.
     */

    try {

      await update(
        PATHS.students +
        "/" +
        studentKey,
        changes
      );

      return Object.assign(
        {},
        student,
        changes,
        {
          _key: studentKey,
          key: studentKey
        }
      );

    } catch (error) {

      /*
       * Linking is helpful but should not prevent the
       * student from using the platform if Firebase rules
       * temporarily reject the optional identity update.
       */

      if (
        window.console &&
        typeof console.warn === "function"
      ) {
        console.warn(
          "[FirebaseDatabase] Student/Auth linking skipped:",
          error
        );
      }

      return student;
    }
  }


  /* ============================================================
     8. UPDATE STUDENT
     ============================================================ */

  async function updateStudent(
    studentKey,
    changes
  ) {

    if (!hasValue(studentKey)) {
      throw new Error(
        "معرّف الطالب غير صالح."
      );
    }

    if (!isObject(changes)) {
      throw new Error(
        "بيانات الطالب غير صالحة."
      );
    }


    /*
     * Never allow a profile update to change the Firebase
     * push-key through the update payload.
     */

    const safeChanges =
      clone(changes);

    delete safeChanges._key;
    delete safeChanges.key;


    await update(
      PATHS.students +
      "/" +
      String(studentKey),
      safeChanges
    );


    return getStudentByKey(
      studentKey
    );
  }


  /* ============================================================
     9. QUIZZES
     ============================================================ */

  function normalizeQuiz(
    quiz,
    key
  ) {

    if (!quiz) {
      return null;
    }

    const item =
      isObject(quiz)
        ? clone(quiz)
        : {
            value: quiz
          };


    const quizKey =
      key ||
      item._key ||
      item.key ||
      item.id ||
      "";


    item._key =
      quizKey;

    item.key =
      item.key ||
      quizKey;

    item.id =
      item.id ||
      quizKey;


    item.title =
      item.title ||
      item.name ||
      "";


    item.description =
      item.description ||
      "";


    item.subject =
      item.subject ||
      item.subjectId ||
      "";


    item.term =
      item.term ||
      item.semester ||
      "";


    item.grade =
      item.grade ||
      item.year ||
      item.level ||
      "";


    item.duration =
      item.duration ||
      item.durationMinutes ||
      0;


    item.passScore =
      item.passScore ??
      item.passingScore ??
      null;


    item.published =
      item.published !== false &&
      item.active !== false;


    item.questions =
      Array.isArray(item.questions)
        ? item.questions
        : toArray(item.questions);


    return item;
  }


  async function getQuizzes(
    options
  ) {

    options =
      options || {};


    const raw =
      await get(
        PATHS.quizzes,
        {
          defaultValue: null
        }
      );


    let quizzes =
      toArray(raw).map(
        function (quiz) {
          return normalizeQuiz(
            quiz,
            quiz &&
            (
              quiz._key ||
              quiz.key ||
              quiz.id
            )
          );
        }
      ).filter(Boolean);


    /*
     * Published filter.
     */

    if (
      options.publishedOnly === true
    ) {

      quizzes =
        quizzes.filter(
          function (quiz) {
            return (
              quiz.published !== false
            );
          }
        );
    }


    /*
     * Subject filter.
     */

    if (
      hasValue(options.subject)
    ) {

      const wanted =
        normalizeIdentifier(
          options.subject
        );

      quizzes =
        quizzes.filter(
          function (quiz) {

            return (
              normalizeIdentifier(
                quiz.subject
              ) === wanted ||
              normalizeIdentifier(
                quiz.subjectId
              ) === wanted
            );
          }
        );
    }


    /*
     * Term filter.
     */

    if (
      hasValue(options.term)
    ) {

      const wanted =
        normalizeIdentifier(
          options.term
        );

      quizzes =
        quizzes.filter(
          function (quiz) {

            return (
              normalizeIdentifier(
                quiz.term
              ) === wanted ||
              normalizeIdentifier(
                quiz.semester
              ) === wanted
            );
          }
        );
    }


    /*
     * Grade filter.
     *
     * "الجميع" is treated as available for every grade.
     */

    if (
      hasValue(options.grade)
    ) {

      const wanted =
        normalizeIdentifier(
          options.grade
        );

      quizzes =
        quizzes.filter(
          function (quiz) {

            const grade =
              normalizeIdentifier(
                quiz.grade ||
                quiz.year ||
                quiz.level
              );

            return (
              !grade ||
              grade === wanted ||
              grade === "الجميع" ||
              grade === "all"
            );
          }
        );
    }


    /*
     * Search filter.
     */

    if (
      hasValue(options.search)
    ) {

      const query =
        normalizeIdentifier(
          options.search
        );

      quizzes =
        quizzes.filter(
          function (quiz) {

            const text = [
              quiz.title,
              quiz.name,
              quiz.description,
              quiz.subject
            ]
              .join(" ")
              .toLowerCase();

            return text.indexOf(
              query
            ) !== -1;
          }
        );
    }


    quizzes.sort(
      sortByOrderAndDate
    );

    return quizzes;
  }


  async function getQuiz(
    quizId
  ) {

    if (!hasValue(quizId)) {
      return null;
    }

    const direct =
      await get(
        PATHS.quizzes +
        "/" +
        String(quizId)
      );

    if (direct) {

      return normalizeQuiz(
        direct,
        String(quizId)
      );
    }


    const quizzes =
      await getQuizzes();

    const wanted =
      String(quizId);

    return (
      quizzes.find(
        function (quiz) {
          return String(
            quiz.id ||
            quiz._key ||
            quiz.key ||
            ""
          ) === wanted;
        }
      ) ||
      null
    );
  }


  /* ============================================================
     10. QUIZ ATTEMPTS
     ============================================================ */

  async function getQuizAttempts(
    studentKey,
    options
  ) {

    options =
      options || {};


    if (!hasValue(studentKey)) {
      return [];
    }


    const raw =
      await get(
        PATHS.quizAttempts +
        "/" +
        String(studentKey),
        {
          defaultValue: null
        }
      );


    let attempts =
      toArray(raw);


    if (
      hasValue(options.quizId)
    ) {

      const wanted =
        String(options.quizId);

      attempts =
        attempts.filter(
          function (attempt) {

            return String(
              attempt.quizId ||
              ""
            ) === wanted;
          }
        );
    }


    attempts.sort(
      sortByOrderAndDate
    );

    return attempts;
  }


  async function saveQuizAttempt(
    studentKey,
    attempt
  ) {

    if (!hasValue(studentKey)) {
      throw new Error(
        "معرّف الطالب غير صالح."
      );
    }

    if (!isObject(attempt)) {
      throw new Error(
        "بيانات محاولة الاختبار غير صالحة."
      );
    }


    const safeAttempt =
      clone(attempt);


    /*
     * Preserve existing attempt information while adding
     * server-side submission time.
     */

    if (
      !hasValue(
        safeAttempt.studentKey
      )
    ) {
      safeAttempt.studentKey =
        String(studentKey);
    }


    if (
      !hasValue(
        safeAttempt.submittedAt
      )
    ) {
      safeAttempt.submittedAt =
        timestamp();
    }


    return push(
      PATHS.quizAttempts +
      "/" +
      String(studentKey),
      safeAttempt
    );
  }


  /* ============================================================
     11. LEGACY QUIZ RESULTS
     ============================================================ */

  function normalizeResult(
    result,
    key
  ) {

    if (!result) {
      return null;
    }

    const item =
      isObject(result)
        ? clone(result)
        : {
            value: result
          };


    const resultKey =
      key ||
      item._key ||
      item.key ||
      item.id ||
      "";


    item._key =
      resultKey;

    item.key =
      item.key ||
      resultKey;


    item.quizId =
      item.quizId ||
      item.quizID ||
      "";


    item.quizTitle =
      item.quizTitle ||
      item.title ||
      "";


    return item;
  }


  async function getQuizResults() {

    const raw =
      await get(
        PATHS.legacyResults,
        {
          defaultValue: null
        }
      );


    return toArray(raw).map(
      function (result) {

        return normalizeResult(
          result,
          result &&
          (
            result._key ||
            result.key
          )
        );
      }
    ).filter(Boolean);
  }


  async function getCurrentStudentResults() {

    const student =
      await getCurrentStudent();

    if (!student) {
      return [];
    }


    const results =
      await getQuizResults();


    const studentKey =
      String(
        student._key ||
        student.key ||
        student.studentKey ||
        student.id ||
        ""
      );


    const studentName =
      normalizeIdentifier(
        student.name ||
        student.fullName ||
        student.studentName ||
        ""
      );


    const studentGrade =
      normalizeIdentifier(
        student.grade ||
        student.year ||
        student.level ||
        ""
      );


    const authUser =
      currentUser();


    const authUid =
      authUser &&
      authUser.uid
        ? String(authUser.uid)
        : "";


    const authEmail =
      authUser &&
      authUser.email
        ? normalizeIdentifier(
            authUser.email
          )
        : "";


    const authPhone =
      authUser &&
      authUser.phoneNumber
        ? normalizePhone(
            authUser.phoneNumber
          )
        : "";


    return results.filter(
      function (result) {

        /*
         * Prefer secure identifiers when they exist.
         */

        if (
          authUid &&
          result.uid
        ) {
          return (
            String(result.uid) ===
            authUid
          );
        }


        if (
          authUid &&
          result.userId
        ) {
          return (
            String(result.userId) ===
            authUid
          );
        }


        if (
          authEmail &&
          result.email
        ) {
          return (
            normalizeIdentifier(
              result.email
            ) === authEmail
          );
        }


        if (
          authPhone &&
          (
            result.phone ||
            result.phoneNumber
          )
        ) {
          return (
            normalizePhone(
              result.phone ||
              result.phoneNumber
            ) === authPhone
          );
        }


        /*
         * Legacy quiz_results records in the existing
         * database currently use studentName/studentGrade.
         */

        const resultName =
          normalizeIdentifier(
            result.studentName ||
            result.name ||
            ""
          );


        const resultGrade =
          normalizeIdentifier(
            result.studentGrade ||
            result.grade ||
            ""
          );


        if (
          studentName &&
          resultName
        ) {

          if (
            studentName ===
            resultName
          ) {

            /*
             * If both grades are available, use the grade
             * as an additional check.
             */

            if (
              studentGrade &&
              resultGrade
            ) {
              return (
                studentGrade ===
                resultGrade
              );
            }

            return true;
          }
        }


        /*
         * Support legacy records that may contain the
         * student database key.
         */

        if (
          studentKey &&
          (
            result.studentKey ||
            result.studentId ||
            result.id
          )
        ) {

          return (
            String(
              result.studentKey ||
              result.studentId ||
              result.id
            ) === studentKey
          );
        }


        return false;
      }
    );
  }


  async function saveQuizResult(
    result
  ) {

    if (!isObject(result)) {
      throw new Error(
        "بيانات نتيجة الاختبار غير صالحة."
      );
    }


    /*
     * This method writes to the existing legacy
     * /quiz_results path.
     *
     * Existing data is preserved.
     */

    const payload =
      clone(result);


    if (
      !hasValue(
        payload.submittedAt
      )
    ) {
      payload.submittedAt =
        timestamp();
    }


    return push(
      PATHS.legacyResults,
      payload
    );
  }


  /* ============================================================
     12. NOTIFICATIONS
     ============================================================ */

  function notificationMatchesStudent(
    notification,
    student
  ) {

    if (!notification) {
      return false;
    }


    const target =
      notification.target ||
      notification.audience ||
      notification.studentId ||
      notification.studentKey ||
      notification.grade ||
      "";


    if (!hasValue(target)) {
      return true;
    }


    const normalizedTarget =
      normalizeIdentifier(
        target
      );


    if (
      normalizedTarget === "الجميع" ||
      normalizedTarget === "all" ||
      normalizedTarget === "everyone"
    ) {
      return true;
    }


    if (!student) {
      return false;
    }


    const identifiers = [

      student._key,
      student.key,
      student.studentKey,
      student.id,
      student.studentId,
      student.uid,
      student.userId,

      student.phone,
      student.phoneNumber,

      student.grade,
      student.year,
      student.level
    ];


    return identifiers.some(
      function (identifier) {

        if (!hasValue(identifier)) {
          return false;
        }

        if (
          normalizePhone(
            identifier
          ) ===
          normalizePhone(
            target
          )
        ) {
          return true;
        }

        return (
          normalizeIdentifier(
            identifier
          ) ===
          normalizedTarget
        );
      }
    );
  }


  async function getNotifications(
    options
  ) {

    options =
      options || {};


    const raw =
      await get(
        PATHS.notifications,
        {
          defaultValue: null
        }
      );


    let notifications =
      toArray(raw);


    let student =
      options.student ||
      null;


    if (
      !student &&
      options.currentStudent === true
    ) {
      student =
        await getCurrentStudent();
    }


    if (student) {

      notifications =
        notifications.filter(
          function (notification) {
            return notificationMatchesStudent(
              notification,
              student
            );
          }
        );
    }


    if (
      hasValue(options.target)
    ) {

      const target =
        normalizeIdentifier(
          options.target
        );

      notifications =
        notifications.filter(
          function (notification) {

            return (
              normalizeIdentifier(
                notification.target
              ) === target
            );
          }
        );
    }


    notifications.sort(
      function (a, b) {

        return (
          timestampValue(
            b.createdAt
          ) -
          timestampValue(
            a.createdAt
          )
        );
      }
    );


    return notifications;
  }


  async function getNotificationReads(
    studentKey
  ) {

    if (!hasValue(studentKey)) {
      return {};
    }


    return get(
      PATHS.notificationReads +
      "/" +
      String(studentKey),
      {
        defaultValue: {}
      }
    );
  }


  async function markNotificationRead(
    studentKey,
    notificationId
  ) {

    if (
      !hasValue(studentKey)
    ) {
      throw new Error(
        "معرّف الطالب غير صالح."
      );
    }


    if (
      !hasValue(notificationId)
    ) {
      throw new Error(
        "معرّف الإشعار غير صالح."
      );
    }


    const path =
      PATHS.notificationReads +
      "/" +
      String(studentKey) +
      "/" +
      String(notificationId);


    const payload = {
      read: true,
      readAt: timestamp()
    };


    await Core.ref(path)
      .update(payload);


    return payload;
  }


  /* ============================================================
     13. FILES
     ============================================================ */

  function normalizeFile(
    file,
    key
  ) {

    if (!file) {
      return null;
    }


    const item =
      isObject(file)
        ? clone(file)
        : {
            value: file
          };


    const fileKey =
      key ||
      item._key ||
      item.key ||
      item.id ||
      "";


    item._key =
      fileKey;

    item.key =
      item.key ||
      fileKey;

    item.id =
      item.id ||
      fileKey;


    item.title =
      item.title ||
      item.name ||
      item.fileName ||
      "";


    item.url =
      item.url ||
      item.pdfUrl ||
      item.fileUrl ||
      item.downloadURL ||
      item.downloadUrl ||
      item.link ||
      "";


    item.subject =
      item.subject ||
      item.subjectId ||
      "";


    item.term =
      item.term ||
      item.semester ||
      "";


    item.grade =
      item.grade ||
      item.year ||
      item.level ||
      "";


    return item;
  }


  async function getFiles(
    options
  ) {

    options =
      options || {};


    const raw =
      await get(
        PATHS.files,
        {
          defaultValue: null
        }
      );


    let files =
      toArray(raw).map(
        function (file) {

          return normalizeFile(
            file,
            file &&
            (
              file._key ||
              file.key ||
              file.id
            )
          );
        }
      ).filter(Boolean);


    if (
      options.publishedOnly === true
    ) {

      files =
        files.filter(
          function (file) {

            return (
              file.published !== false &&
              file.active !== false
            );
          }
        );
    }


    if (
      hasValue(options.subject)
    ) {

      const wanted =
        normalizeIdentifier(
          options.subject
        );

      files =
        files.filter(
          function (file) {

            return (
              normalizeIdentifier(
                file.subject
              ) === wanted ||
              normalizeIdentifier(
                file.subjectId
              ) === wanted
            );
          }
        );
    }


    if (
      hasValue(options.term)
    ) {

      const wanted =
        normalizeIdentifier(
          options.term
        );

      files =
        files.filter(
          function (file) {

            return (
              normalizeIdentifier(
                file.term
              ) === wanted ||
              normalizeIdentifier(
                file.semester
              ) === wanted
            );
          }
        );
    }


    if (
      hasValue(options.grade)
    ) {

      const wanted =
        normalizeIdentifier(
          options.grade
        );

      files =
        files.filter(
          function (file) {

            const grade =
              normalizeIdentifier(
                file.grade
              );

            return (
              !grade ||
              grade === wanted ||
              grade === "الجميع" ||
              grade === "all"
            );
          }
        );
    }


    files.sort(
      sortByOrderAndDate
    );


    return files;
  }


  /* ============================================================
     14. VIDEOS
     ============================================================ */

  function normalizeVideo(
    video,
    key
  ) {

    if (!video) {
      return null;
    }


    const item =
      isObject(video)
        ? clone(video)
        : {
            value: video
          };


    const videoKey =
      key ||
      item._key ||
      item.key ||
      item.id ||
      "";


    item._key =
      videoKey;

    item.key =
      item.key ||
      videoKey;

    item.id =
      item.id ||
      videoKey;


    item.title =
      item.title ||
      item.name ||
      "";


    item.url =
      item.url ||
      item.videoUrl ||
      item.link ||
      item.sourceUrl ||
      item.embedUrl ||
      item.video ||
      "";


    item.subject =
      item.subject ||
      item.subjectId ||
      item.course ||
      "";


    item.term =
      item.term ||
      item.semester ||
      "";


    item.grade =
      item.grade ||
      item.year ||
      item.level ||
      "";


    return item;
  }


  async function getVideos(
    options
  ) {

    options =
      options || {};


    const raw =
      await get(
        PATHS.videos,
        {
          defaultValue: null
        }
      );


    let videos =
      toArray(raw).map(
        function (video) {

          return normalizeVideo(
            video,
            video &&
            (
              video._key ||
              video.key ||
              video.id
            )
          );
        }
      ).filter(Boolean);


    if (
      options.publishedOnly === true
    ) {

      videos =
        videos.filter(
          function (video) {

            return (
              video.published !== false &&
              video.active !== false
            );
          }
        );
    }


    if (
      hasValue(options.subject)
    ) {

      const wanted =
        normalizeIdentifier(
          options.subject
        );

      videos =
        videos.filter(
          function (video) {

            return (
              normalizeIdentifier(
                video.subject
              ) === wanted ||
              normalizeIdentifier(
                video.subjectId
              ) === wanted ||
              normalizeIdentifier(
                video.course
              ) === wanted
            );
          }
        );
    }


    if (
      hasValue(options.term)
    ) {

      const wanted =
        normalizeIdentifier(
          options.term
        );

      videos =
        videos.filter(
          function (video) {

            return (
              normalizeIdentifier(
                video.term
              ) === wanted ||
              normalizeIdentifier(
                video.semester
              ) === wanted
            );
          }
        );
    }


    if (
      hasValue(options.grade)
    ) {

      const wanted =
        normalizeIdentifier(
          options.grade
        );

      videos =
        videos.filter(
          function (video) {

            const grade =
              normalizeIdentifier(
                video.grade
              );

            return (
              !grade ||
              grade === wanted ||
              grade === "الجميع" ||
              grade === "all"
            );
          }
        );
    }


    videos.sort(
      sortByOrderAndDate
    );


    return videos;
  }


  /* ============================================================
     15. SUPPORT SETTINGS
     ============================================================ */

  async function getSupportSettings() {

    const data =
      await get(
        PATHS.support,
        {
          defaultValue: null
        }
      );


    if (!data) {
      return {};
    }


    return clone(data);
  }


  async function saveSupportTicket(
    ticket
  ) {

    if (!isObject(ticket)) {
      throw new Error(
        "بيانات طلب الدعم غير صالحة."
      );
    }


    const payload =
      clone(ticket);


    if (
      !hasValue(
        payload.status
      )
    ) {
      payload.status =
        "open";
    }


    if (
      !hasValue(
        payload.createdAt
      )
    ) {
      payload.createdAt =
        timestamp();
    }


    return push(
      PATHS.supportTickets,
      payload
    );
  }


  /* ============================================================
     16. CONTENT VIEWS
     ============================================================ */

  async function recordContentView(
    content,
    options
  ) {

    options =
      options || {};


    if (
      !content ||
      (
        typeof content !== "object" &&
        typeof content !== "string"
      )
    ) {
      throw new Error(
        "بيانات المحتوى غير صالحة."
      );
    }


    const item =
      typeof content === "object"
        ? clone(content)
        : {
            id: String(content)
          };


    const user =
      currentUser();


    if (
      user &&
      user.uid &&
      !item.userId
    ) {
      item.userId =
        user.uid;
    }


    if (
      !hasValue(
        item.studentKey
      )
    ) {

      const student =
        await getCurrentStudent();

      if (student) {

        item.studentKey =
          student._key ||
          student.key ||
          student.studentKey ||
          "";

        item.studentId =
          item.studentId ||
          student.studentId ||
          student.id ||
          item.studentKey;

        item.studentName =
          item.studentName ||
          student.name ||
          student.fullName ||
          student.studentName ||
          "";
      }
    }


    item.contentId =
      item.contentId ||
      item.id ||
      item._key ||
      item.key ||
      "";


    item.contentTitle =
      item.contentTitle ||
      item.title ||
      item.name ||
      "";


    if (
      !hasValue(
        item.viewedAt
      )
    ) {
      item.viewedAt =
        timestamp();
    }


    /*
     * Keep compatibility with the existing /content_views
     * structure.
     */

    return push(
      PATHS.contentViews,
      item
    );
  }


  async function getContentViews(
    options
  ) {

    options =
      options || {};


    const raw =
      await get(
        PATHS.contentViews,
        {
          defaultValue: null
        }
      );


    let views =
      toArray(raw);


    if (
      hasValue(options.studentKey)
    ) {

      const wanted =
        String(
          options.studentKey
        );

      views =
        views.filter(
          function (view) {

            return (
              String(
                view.studentKey ||
                view.studentId ||
                ""
              ) === wanted
            );
          }
        );
    }


    if (
      hasValue(options.contentId)
    ) {

      const wanted =
        String(
          options.contentId
        );

      views =
        views.filter(
          function (view) {

            return (
              String(
                view.contentId ||
                view.id ||
                ""
              ) === wanted
            );
          }
        );
    }


    views.sort(
      function (a, b) {

        return (
          timestampValue(
            b.viewedAt
          ) -
          timestampValue(
            a.viewedAt
          )
        );
      }
    );


    return views;
  }


  /* ============================================================
     17. STATS
     ============================================================ */

  async function getStats() {

    const data =
      await get(
        PATHS.stats,
        {
          defaultValue: {}
        }
      );


    return isObject(data)
      ? data
      : {};
  }


  async function updateStats(
    changes
  ) {

    if (!isObject(changes)) {
      throw new Error(
        "بيانات الإحصائيات غير صالحة."
      );
    }


    await update(
      PATHS.stats,
      clone(changes)
    );


    return getStats();
  }


  /* ============================================================
     18. SETTINGS
     ============================================================ */

  async function getSettings() {

    const data =
      await get(
        PATHS.settings,
        {
          defaultValue: {}
        }
      );


    return isObject(data)
      ? data
      : {};
  }


  /* ============================================================
     19. PUBLIC API
     ============================================================ */

  const FirebaseDatabase = {

    /*
     * Database instance
     */
    database:
      database,


    /*
     * Path registry
     */
    paths:
      PATHS,


    /*
     * Generic operations
     */
    get:
      get,

    exists:
      exists,

    listen:
      listen,

    update:
      update,

    push:
      push,

    section:
      section,


    /*
     * Student operations
     */
    findStudent:
      findStudent,

    getCurrentStudent:
      getCurrentStudent,

    getStudentByKey:
      getStudentByKey,

    updateStudent:
      updateStudent,

    linkStudentToAuth:
      linkStudentToAuth,


    /*
     * Quiz operations
     */
    getQuizzes:
      getQuizzes,

    getQuiz:
      getQuiz,

    getQuizAttempts:
      getQuizAttempts,

    saveQuizAttempt:
      saveQuizAttempt,


    /*
     * Result operations
     */
    getQuizResults:
      getQuizResults,

    getCurrentStudentResults:
      getCurrentStudentResults,

    saveQuizResult:
      saveQuizResult,


    /*
     * Notification operations
     */
    getNotifications:
      getNotifications,

    getNotificationReads:
      getNotificationReads,

    markNotificationRead:
      markNotificationRead,


    /*
     * Content operations
     */
    getFiles:
      getFiles,

    getVideos:
      getVideos,


    /*
     * Support operations
     */
    getSupportSettings:
      getSupportSettings,

    saveSupportTicket:
      saveSupportTicket,


    /*
     * Content view tracking
     */
    recordContentView:
      recordContentView,

    getContentViews:
      getContentViews,


    /*
     * Statistics
     */
    getStats:
      getStats,

    updateStats:
      updateStats,


    /*
     * Settings
     */
    getSettings:
      getSettings,


    /*
     * Identity helpers
     */
    getCurrentUser:
      currentUser
  };


  /* ============================================================
     20. READY PROMISE
     ============================================================ */

  const ready =
    Promise.resolve(
      FirebaseDatabase
    );


  FirebaseDatabase.ready =
    ready;


  /* ============================================================
     21. PUBLIC GLOBAL
     ============================================================ */

  window.FirebaseDatabase =
    Object.freeze(
      FirebaseDatabase
    );


  window.FirebaseDatabaseReady =
    ready;


  /* ============================================================
     22. DEVELOPMENT MESSAGE
     ============================================================ */

  if (
    window.console &&
    typeof window.console.info ===
      "function"
  ) {

    console.info(
      "[FirebaseDatabase] Database module initialized."
    );
  }


})(window);