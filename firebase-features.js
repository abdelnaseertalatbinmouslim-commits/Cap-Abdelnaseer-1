/*
 * firebase-features.js
 * ------------------------------------------------------------
 * Central application feature layer.
 *
 * Required load order:
 *   1) Firebase CDN scripts
 *   2) firebase-config.js
 *   3) firebase-auth.js
 *   4) firebase-database.js
 *   5) firebase-content.js
 *   6) firebase-features.js
 *
 * IMPORTANT:
 * - This file is NON-DESTRUCTIVE.
 * - It never deletes Firebase data.
 * - It never resets Firebase data.
 * - It never performs an automatic migration.
 * - Existing legacy Firebase data remains usable.
 */

(function (window) {
    "use strict";

    /* =========================================================
       DEPENDENCIES
       ========================================================= */

    var Core = window.FirebaseCore;
    var Auth = window.FirebaseAuth;
    var DB = window.FirebaseDatabase;
    var Content = window.FirebaseContent;

    if (!Core) {
        throw new Error(
            "firebase-config.js must be loaded before firebase-features.js"
        );
    }

    if (!Auth) {
        throw new Error(
            "firebase-auth.js must be loaded before firebase-features.js"
        );
    }

    if (!DB) {
        throw new Error(
            "firebase-database.js must be loaded before firebase-features.js"
        );
    }

    if (!Content) {
        throw new Error(
            "firebase-content.js must be loaded before firebase-features.js"
        );
    }

    var Features = {};

    /* =========================================================
       INTERNAL HELPERS
       ========================================================= */

    function toArray(value) {
        return Core.toArray(value);
    }

    function clone(value) {
        return Core.cloneObject(value);
    }

    function timestamp() {
        return Core.serverTimestamp();
    }

    function getCurrentUser() {
        if (typeof Auth.getCurrentUser === "function") {
            return Auth.getCurrentUser();
        }

        if (typeof Core.getCurrentUser === "function") {
            return Core.getCurrentUser();
        }

        return null;
    }

    function getStudentKey(student) {
        if (!student || typeof student !== "object") {
            return "";
        }

        return String(
            student._key ||
            student.key ||
            student.studentKey ||
            student.uid ||
            student.userId ||
            student.id ||
            ""
        ).trim();
    }

    function getStudentStatus(student) {
        if (!student) {
            return "";
        }

        return String(student.status || "")
            .trim()
            .toLowerCase();
    }

    function isApprovedStudent(student) {
        if (!student) {
            return false;
        }

        var status = getStudentStatus(student);

        return (
            status === "approved" ||
            status === "active" ||
            status === "مقبول" ||
            status === "نشط"
        );
    }

    function success(data) {
        return {
            ok: true,
            data: data
        };
    }

    function failure(error, fallbackMessage) {
        return {
            ok: false,
            error: error || null,
            message: Core.getErrorMessage(
                error,
                fallbackMessage || "حدث خطأ غير متوقع."
            )
        };
    }

    function requireAuthentication() {
        var user = getCurrentUser();

        if (!user) {
            return failure(
                null,
                "يجب تسجيل الدخول أولاً."
            );
        }

        return success(user);
    }

    function getStudentName(student) {
        if (!student) {
            return "";
        }

        return (
            student.name ||
            student.fullName ||
            student.studentName ||
            ""
        );
    }

    function getStudentId(student, fallback) {
        if (!student) {
            return fallback || "";
        }

        return (
            student.studentId ||
            student.id ||
            student.userId ||
            student.studentKey ||
            fallback ||
            ""
        );
    }

    /* =========================================================
       AUTH + STUDENT CONTEXT
       ========================================================= */

    Features.getCurrentStudentContext = async function (options) {
        options = options || {};

        try {
            var user = getCurrentUser();

            if (!user) {
                return failure(
                    null,
                    "يجب تسجيل الدخول أولاً."
                );
            }

            var student = await DB.getCurrentStudent();

            if (!student) {
                return failure(
                    null,
                    "لم يتم العثور على بيانات الطالب المرتبطة بهذا الحساب."
                );
            }

            var studentKey = getStudentKey(student);

            /*
             * Linking Auth UID to the existing student record is
             * non-destructive. It updates the existing record only.
             */
            if (
                options.linkAuth !== false &&
                studentKey &&
                typeof DB.linkStudentToAuth === "function"
            ) {
                try {
                    student = await DB.linkStudentToAuth(
                        student,
                        user
                    );

                    studentKey = getStudentKey(student) || studentKey;
                } catch (linkError) {
                    /*
                     * Linking must never prevent an otherwise valid
                     * student from using the platform.
                     */
                    if (
                        window.console &&
                        typeof console.warn === "function"
                    ) {
                        console.warn(
                            "Firebase student/auth linking skipped:",
                            linkError
                        );
                    }
                }
            }

            return success({
                user: user,
                student: student,
                studentKey: studentKey,
                approved: isApprovedStudent(student)
            });

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل بيانات الطالب."
            );
        }
    };

    Features.requireStudent = async function (options) {
        options = options || {};

        var context = await Features.getCurrentStudentContext({
            linkAuth: options.linkAuth !== false
        });

        if (!context.ok) {
            return context;
        }

        if (
            options.approvedOnly === true &&
            !context.data.approved
        ) {
            return failure(
                null,
                "الحساب غير معتمد حالياً."
            );
        }

        return context;
    };

    Features.syncAuthWithStudent = async function () {
        return Features.getCurrentStudentContext({
            linkAuth: true
        });
    };

    /* =========================================================
       DASHBOARD
       ========================================================= */

    Features.getDashboardData = async function (options) {
        options = options || {};

        var context = await Features.requireStudent({
            approvedOnly: options.approvedOnly === true,
            linkAuth: options.linkAuth !== false
        });

        if (!context.ok) {
            return context;
        }

        try {
            var data = await Promise.all([
                DB.getQuizzes(options.quizOptions || {}),
                DB.getCurrentStudentResults(),
                DB.getNotifications(
                    options.notificationOptions || {}
                ),
                DB.getStats()
            ]);

            return success({
                user: context.data.user,
                student: context.data.student,
                studentKey: context.data.studentKey,
                approved: context.data.approved,

                quizzes: toArray(data[0]),
                results: toArray(data[1]),
                notifications: toArray(data[2]),
                stats: data[3] || {}
            });

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل بيانات لوحة التحكم."
            );
        }
    };

    /* =========================================================
       NOTIFICATIONS
       ========================================================= */

    Features.getNotifications = async function (options) {
        try {
            var notifications = await DB.getNotifications(
                options || {}
            );

            return success(toArray(notifications));

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل الإشعارات."
            );
        }
    };

    Features.getNotificationSummary = async function (options) {
        options = options || {};

        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        try {
            var notifications = await DB.getNotifications(options);

            var reads = {};

            if (typeof DB.getNotificationReads === "function") {
                reads = await DB.getNotificationReads(
                    context.data.studentKey
                );
            }

            var readMap = {};

            toArray(reads).forEach(function (item) {
                if (!item) {
                    return;
                }

                var id =
                    item.id ||
                    item.notificationId ||
                    item._key ||
                    item.key;

                if (
                    id !== undefined &&
                    id !== null &&
                    item.read === true
                ) {
                    readMap[String(id)] = true;
                }
            });

            var notificationArray = toArray(notifications);

            var unread = notificationArray.filter(
                function (notification) {
                    if (!notification) {
                        return false;
                    }

                    var id =
                        notification.id ||
                        notification._key ||
                        notification.key;

                    if (
                        id === undefined ||
                        id === null
                    ) {
                        return false;
                    }

                    return !readMap[String(id)];
                }
            );

            return success({
                notifications: notificationArray,
                reads: reads || {},
                unread: unread,
                unreadCount: unread.length
            });

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل ملخص الإشعارات."
            );
        }
    };

    Features.markNotificationRead = async function (
        notificationId
    ) {
        var auth = requireAuthentication();

        if (!auth.ok) {
            return auth;
        }

        if (
            notificationId === undefined ||
            notificationId === null ||
            String(notificationId).trim() === ""
        ) {
            return failure(
                null,
                "معرّف الإشعار غير صالح."
            );
        }

        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        try {
            var result = await DB.markNotificationRead(
                context.data.studentKey,
                String(notificationId)
            );

            return success(result);

        } catch (error) {
            return failure(
                error,
                "تعذر تحديث حالة الإشعار."
            );
        }
    };

    /* =========================================================
       CONTENT
       ========================================================= */

    Features.getFiles = async function (options) {
        try {
            return success(
                await Content.getFiles(options || {})
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تحميل الملفات."
            );
        }
    };

    Features.getVideos = async function (options) {
        try {
            return success(
                await Content.getVideos(options || {})
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تحميل الفيديوهات."
            );
        }
    };

    Features.getQuizzes = async function (options) {
        try {
            return success(
                await Content.getQuizzes(options || {})
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تحميل الاختبارات."
            );
        }
    };

    Features.getSubjects = async function (options) {
        try {
            return success(
                await Content.getSubjects(options || {})
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تحميل المواد."
            );
        }
    };

    Features.getAllContent = async function (options) {
        try {
            return success(
                await Content.getAllContent(options || {})
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تحميل المحتوى."
            );
        }
    };

    Features.getContentById = async function (
        id,
        options
    ) {
        try {
            return success(
                await Content.getContentById(
                    id,
                    options || {}
                )
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تحميل المحتوى المطلوب."
            );
        }
    };

    Features.searchContent = async function (
        query,
        options
    ) {
        try {
            return success(
                await Content.search(
                    query,
                    options || {}
                )
            );
        } catch (error) {
            return failure(
                error,
                "تعذر تنفيذ البحث."
            );
        }
    };

    /* =========================================================
       CONTENT VIEWS
       ========================================================= */

    Features.recordContentView = async function (
        content,
        options
    ) {
        options = options || {};

        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        if (
            !content ||
            (
                typeof content !== "object" &&
                typeof content !== "string"
            )
        ) {
            return failure(
                null,
                "بيانات المحتوى غير صالحة."
            );
        }

        try {
            var item =
                typeof content === "object"
                    ? clone(content)
                    : {
                        id: content
                    };

            item.studentKey =
                item.studentKey ||
                context.data.studentKey;

            item.studentId =
                item.studentId ||
                getStudentId(
                    context.data.student,
                    context.data.studentKey
                );

            item.studentName =
                item.studentName ||
                getStudentName(
                    context.data.student
                );

            item.userId =
                item.userId ||
                context.data.user.uid;

            var result = await DB.recordContentView(
                item,
                options
            );

            return success(result);

        } catch (error) {
            return failure(
                error,
                "تعذر تسجيل مشاهدة المحتوى."
            );
        }
    };

    /* =========================================================
       QUIZZES
       ========================================================= */

    Features.getQuizSession = async function (
        quizId,
        options
    ) {
        options = options || {};

        var context = await Features.requireStudent({
            approvedOnly:
                options.approvedOnly === true,
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        if (
            quizId === undefined ||
            quizId === null ||
            String(quizId).trim() === ""
        ) {
            return failure(
                null,
                "معرّف الاختبار غير صالح."
            );
        }

        try {
            var quiz = await Content.getQuiz(
                quizId,
                options
            );

            if (!quiz) {
                return failure(
                    null,
                    "الاختبار غير موجود."
                );
            }

            return success({
                user: context.data.user,
                student: context.data.student,
                studentKey: context.data.studentKey,
                quiz: quiz
            });

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل الاختبار."
            );
        }
    };

    Features.getMyQuizAttempts = async function (
        options
    ) {
        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        try {
            var attempts = await DB.getQuizAttempts(
                context.data.studentKey,
                options || {}
            );

            return success(toArray(attempts));

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل محاولات الاختبارات."
            );
        }
    };

    Features.submitQuizAttempt = async function (
        quiz,
        answers,
        options
    ) {
        options = options || {};

        var context = await Features.requireStudent({
            approvedOnly:
                options.approvedOnly === true,
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        if (
            !quiz ||
            typeof quiz !== "object"
        ) {
            return failure(
                null,
                "بيانات الاختبار غير صالحة."
            );
        }

        var quizId =
            quiz.id ||
            quiz._key ||
            quiz.key;

        if (
            quizId === undefined ||
            quizId === null ||
            String(quizId).trim() === ""
        ) {
            return failure(
                null,
                "معرّف الاختبار غير موجود."
            );
        }

        var answerData =
            answers === undefined ||
            answers === null
                ? {}
                : clone(answers);

        var questions = toArray(
            quiz.questions
        );

        var answeredQuestions = 0;

        if (Array.isArray(answerData)) {
            answeredQuestions =
                answerData.filter(
                    function (answer) {
                        return (
                            answer !== null &&
                            answer !== undefined &&
                            String(answer).trim() !== ""
                        );
                    }
                ).length;

        } else if (
            answerData &&
            typeof answerData === "object"
        ) {
            answeredQuestions =
                Object.keys(answerData).filter(
                    function (key) {
                        var value =
                            answerData[key];

                        return (
                            value !== null &&
                            value !== undefined &&
                            String(value).trim() !== ""
                        );
                    }
                ).length;
        }

        /*
         * IMPORTANT:
         * We intentionally do NOT invent score/percentage/passed.
         * Existing legacy results stay untouched.
         */
        var attempt = {
            quizId: String(quizId),

            title:
                quiz.title ||
                quiz.name ||
                "",

            subject:
                quiz.subject ||
                quiz.subjectId ||
                "",

            term:
                quiz.term ||
                quiz.semester ||
                "",

            grade:
                quiz.grade ||
                quiz.year ||
                quiz.level ||
                "",

            answers: answerData,

            totalQuestions:
                questions.length,

            answeredQuestions:
                answeredQuestions,

            startedAt:
                options.startedAt !== undefined
                    ? options.startedAt
                    : timestamp(),

            submittedAt:
                timestamp(),

            status:
                options.status ||
                "submitted",

            studentKey:
                context.data.studentKey,

            studentId:
                getStudentId(
                    context.data.student,
                    context.data.studentKey
                ),

            studentName:
                getStudentName(
                    context.data.student
                ),

            userId:
                context.data.user.uid
        };

        try {
            var saved =
                await DB.saveQuizAttempt(
                    context.data.studentKey,
                    attempt
                );

            return success({
                attempt: saved,
                student: context.data.student,
                quiz: quiz
            });

        } catch (error) {
            return failure(
                error,
                "تعذر إرسال إجابات الاختبار."
            );
        }
    };

    /* =========================================================
       RESULTS
       ========================================================= */

    Features.getMyResults = async function () {
        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        try {
            var results =
                await DB.getCurrentStudentResults();

            return success(
                toArray(results)
            );

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل النتائج."
            );
        }
    };

    Features.getQuizResult = async function (
        quizId
    ) {
        var results =
            await Features.getMyResults();

        if (!results.ok) {
            return results;
        }

        var id = String(
            quizId === undefined ||
            quizId === null
                ? ""
                : quizId
        );

        var matches =
            results.data.filter(
                function (result) {
                    if (!result) {
                        return false;
                    }

                    var resultQuizId =
                        result.quizId ||
                        result.quizID ||
                        result.id ||
                        "";

                    return (
                        String(resultQuizId) === id
                    );
                }
            );

        return success(matches);
    };

    /* =========================================================
       PROFILE
       ========================================================= */

    Features.getProfile = async function () {
        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        return success({
            user: context.data.user,
            student: context.data.student,
            studentKey: context.data.studentKey
        });
    };

    Features.updateProfile = async function (
        changes,
        options
    ) {
        options = options || {};

        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        if (
            !changes ||
            typeof changes !== "object"
        ) {
            return failure(
                null,
                "بيانات الملف الشخصي غير صالحة."
            );
        }

        /*
         * Only caller-supplied fields are updated.
         * Existing fields remain untouched.
         */
        var safeChanges = clone(changes);

        /*
         * Protected identity/system fields.
         */
        delete safeChanges._key;
        delete safeChanges.key;
        delete safeChanges.studentKey;
        delete safeChanges.uid;
        delete safeChanges.userId;
        delete safeChanges.createdAt;

        /*
         * Status is not editable from the normal profile page.
         */
        if (options.allowStatus !== true) {
            delete safeChanges.status;
        }

        try {
            var updated =
                await DB.updateStudent(
                    context.data.studentKey,
                    safeChanges
                );

            return success(updated);

        } catch (error) {
            return failure(
                error,
                "تعذر حفظ بيانات الملف الشخصي."
            );
        }
    };

    /* =========================================================
       SUPPORT
       ========================================================= */

    Features.getSupportSettings = async function () {
        try {
            var settings =
                await DB.getSupportSettings();

            return success(settings);

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل بيانات الدعم."
            );
        }
    };

    Features.createSupportTicket = async function (
        ticket,
        options
    ) {
        options = options || {};

        var context = await Features.requireStudent({
            linkAuth: true
        });

        if (!context.ok) {
            return context;
        }

        if (
            !ticket ||
            typeof ticket !== "object"
        ) {
            return failure(
                null,
                "بيانات طلب الدعم غير صالحة."
            );
        }

        var safeTicket = clone(ticket);

        var payload = {
            studentId:
                safeTicket.studentId ||
                getStudentId(
                    context.data.student,
                    context.data.studentKey
                ),

            studentKey:
                context.data.studentKey,

            userId:
                context.data.user.uid,

            studentName:
                safeTicket.studentName ||
                getStudentName(
                    context.data.student
                ),

            phone:
                safeTicket.phone ||
                context.data.student.phone ||
                "",

            email:
                safeTicket.email ||
                context.data.user.email ||
                "",

            type:
                safeTicket.type ||
                "general",

            title:
                safeTicket.title ||
                "",

            message:
                safeTicket.message ||
                "",

            status:
                "open",

            createdAt:
                timestamp()
        };

        /*
         * Extra fields are opt-in so old ticket schema remains
         * clean and predictable.
         */
        if (options.includeExtraFields === true) {
            Object.keys(safeTicket).forEach(
                function (key) {
                    if (
                        key === "studentId" ||
                        key === "studentKey" ||
                        key === "userId" ||
                        key === "studentName" ||
                        key === "phone" ||
                        key === "email" ||
                        key === "status" ||
                        key === "createdAt"
                    ) {
                        return;
                    }

                    payload[key] =
                        safeTicket[key];
                }
            );
        }

        try {
            var saved =
                await DB.saveSupportTicket(
                    payload
                );

            return success(saved);

        } catch (error) {
            return failure(
                error,
                "تعذر إرسال طلب الدعم."
            );
        }
    };

    /* =========================================================
       STATS
       ========================================================= */

    Features.getStats = async function () {
        try {
            return success(
                await DB.getStats()
            );

        } catch (error) {
            return failure(
                error,
                "تعذر تحميل الإحصائيات."
            );
        }
    };

    Features.updateStats = async function (
        changes
    ) {
        if (
            !changes ||
            typeof changes !== "object"
        ) {
            return failure(
                null,
                "بيانات الإحصائيات غير صالحة."
            );
        }

        try {
            var result =
                await DB.updateStats(
                    clone(changes)
                );

            return success(result);

        } catch (error) {
            return failure(
                error,
                "تعذر تحديث الإحصائيات."
            );
        }
    };

    /* =========================================================
       GENERIC DATABASE ACCESS
       ========================================================= */

    Features.get = function (
        path,
        options
    ) {
        return DB.get(
            path,
            options || {}
        );
    };

    Features.listen = function (
        path,
        callback,
        options
    ) {
        return DB.listen(
            path,
            callback,
            options || {}
        );
    };

    Features.exists = function (
        path,
        options
    ) {
        if (typeof DB.exists === "function") {
            return DB.exists(
                path,
                options || {}
            );
        }

        return DB.get(
            path,
            options || {}
        ).then(function (value) {
            return value !== null &&
                value !== undefined;
        });
    };

    /* =========================================================
       AUTH SHORTCUTS
       ========================================================= */

    Features.getCurrentUser =
        getCurrentUser;

    Features.waitForAuth =
        function (options) {
            if (
                typeof Auth.waitForAuth !==
                "function"
            ) {
                return Promise.resolve(
                    getCurrentUser()
                );
            }

            return Auth.waitForAuth(
                options || {}
            );
        };

    Features.signOut =
        function () {
            return Auth.signOut();
        };

    Features.isAuthenticated =
        function () {
            return !!getCurrentUser();
        };

    Features.getIdToken =
        function (forceRefresh) {
            if (
                typeof Auth.getIdToken ===
                "function"
            ) {
                return Auth.getIdToken(
                    forceRefresh === true
                );
            }

            return Promise.reject(
                new Error(
                    "Firebase Auth is not available."
                )
            );
        };

    /* =========================================================
       READY PROMISE
       ========================================================= */

    Features.ready = Promise.all([
        window.FirebaseCoreReady ||
            Promise.resolve(),

        window.FirebaseAuthReady ||
            Promise.resolve(),

        window.FirebaseDatabaseReady ||
            Promise.resolve(),

        window.FirebaseContentReady ||
            Promise.resolve()
    ]).then(function () {
        return Features;
    });

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.FirebaseFeatures =
        Features;

    window.FirebaseFeaturesReady =
        Features.ready;

})(window);