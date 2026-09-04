/*
 * ============================================================
 * Cap Abdelnaseer Platform
 * Firebase Authentication & Student Identity
 * File: firebase-auth.js
 * ============================================================
 *
 * النظام الأساسي للطلاب:
 *      رقم الهاتف + كود المرور / PIN
 *
 * التوافق:
 * - يدعم الحسابات القديمة الموجودة داخل /students.
 * - يدعم الحسابات الجديدة التي يتم إنشاؤها من المنصة.
 * - لا يحذف أو يستبدل بيانات الحسابات القديمة.
 * - لا يحتاج Firebase Email Authentication لتسجيل دخول الطالب.
 *
 * يعتمد على:
 *      firebase-config.js
 *
 * وسيتم استخدامه بواسطة:
 *      firebase-database.js
 *      firebase-content.js
 *      firebase-features.js
 *      صفحات المنصة
 * ============================================================
 */

(function (window) {
    "use strict";

    /*
     * --------------------------------------------------------
     * منع تشغيل الملف أكثر من مرة
     * --------------------------------------------------------
     */
    if (window.FirebaseAuth && window.FirebaseAuth.__CAP_AUTH_MODULE__) {
        return;
    }

    /*
     * --------------------------------------------------------
     * التحقق من Firebase Core
     * --------------------------------------------------------
     */
    if (!window.FirebaseCore) {
        throw new Error(
            "firebase-config.js يجب تحميله قبل firebase-auth.js."
        );
    }

    const Core = window.FirebaseCore;

    if (!Core.database) {
        throw new Error(
            "Firebase Realtime Database غير متاح."
        );
    }

    const database = Core.database;
    const auth = Core.auth || null;
    const PATHS = Core.paths;

    /*
     * --------------------------------------------------------
     * مفاتيح Local Storage
     *
     * نحافظ على المفاتيح المتوافقة مع النظام السابق.
     * --------------------------------------------------------
     */
    const STORAGE_KEYS = Object.freeze({
        currentUser: "currentUser",
        student: "student",
        currentStudent: "currentStudent",
        currentStudentKey: "currentStudentKey",
        firebaseUser: "coach_platform_firebase_user",
        rememberedPhone: "rememberedPhone",
        rememberLogin: "rememberLogin"
    });

    /*
     * --------------------------------------------------------
     * الحالات المقبولة
     * --------------------------------------------------------
     */
    const APPROVED_STATUSES = Object.freeze([
        "approved",
        "active",
        "مقبول",
        "نشط"
    ]);

    const PENDING_STATUSES = Object.freeze([
        "pending",
        "waiting",
        "قيد المراجعة",
        "قيد الانتظار"
    ]);

    const REJECTED_STATUSES = Object.freeze([
        "rejected",
        "blocked",
        "مرفوض",
        "محظور"
    ]);

    /*
     * --------------------------------------------------------
     * أدوات داخلية
     * --------------------------------------------------------
     */

    function hasValue(value) {
        return (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        );
    }

    function safeString(value, fallback) {
        if (!hasValue(value)) {
            return fallback || "";
        }

        return String(value).trim();
    }

    function clone(value) {
        if (value === undefined || value === null) {
            return value;
        }

        if (typeof value !== "object") {
            return value;
        }

        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            return value;
        }
    }

    function normalizeIdentifier(value) {
        if (!hasValue(value)) {
            return "";
        }

        return String(value)
            .trim()
            .toLowerCase();
    }

    /*
     * --------------------------------------------------------
     * تطبيع رقم الهاتف
     *
     * لا نغير الرقم الموجود في Firebase.
     * نستخدم القيمة الطبيعية فقط للمقارنة.
     *
     * أمثلة:
     * 01012345678
     * 201012345678
     * +201012345678
     * 00201012345678
     *
     * كلها تصبح:
     * 01012345678
     * --------------------------------------------------------
     */
    function normalizePhone(value) {
        if (!hasValue(value)) {
            return "";
        }

        let phone = String(value).trim();

        /*
         * تحويل الأرقام العربية إلى إنجليزية.
         */
        phone = phone
            .replace(/٠/g, "0")
            .replace(/١/g, "1")
            .replace(/٢/g, "2")
            .replace(/٣/g, "3")
            .replace(/٤/g, "4")
            .replace(/٥/g, "5")
            .replace(/٦/g, "6")
            .replace(/٧/g, "7")
            .replace(/٨/g, "8")
            .replace(/٩/g, "9");

        /*
         * إزالة المسافات والشرطات والأقواس.
         */
        phone = phone.replace(/[\s\-().]/g, "");

        /*
         * إزالة + من البداية.
         */
        phone = phone.replace(/^\+/, "");

        /*
         * 0020xxxxxxxxxx
         * -> 20xxxxxxxxxx
         */
        if (/^0020\d{10}$/.test(phone)) {
            phone = phone.slice(2);
        }

        /*
         * 20xxxxxxxxxx
         * -> 0xxxxxxxxxx
         */
        if (/^20\d{10}$/.test(phone)) {
            phone = "0" + phone.slice(2);
        }

        /*
         * لو كتب 10 أرقام بدون الصفر الأول:
         * 1012345678
         * -> 01012345678
         */
        if (/^1\d{9}$/.test(phone)) {
            phone = "0" + phone;
        }

        return phone;
    }

    /*
     * --------------------------------------------------------
     * تحويل حالة الحساب إلى قيمة موحدة
     * --------------------------------------------------------
     */
    function normalizeStatus(status) {
        return normalizeIdentifier(status);
    }

    function isApproved(student) {
        if (!student) {
            return false;
        }

        const status = normalizeStatus(student.status);

        return APPROVED_STATUSES.some(function (item) {
            return normalizeStatus(item) === status;
        });
    }

    function isPending(student) {
        if (!student) {
            return false;
        }

        const status = normalizeStatus(student.status);

        return PENDING_STATUSES.some(function (item) {
            return normalizeStatus(item) === status;
        });
    }

    function isRejected(student) {
        if (!student) {
            return false;
        }

        const status = normalizeStatus(student.status);

        return REJECTED_STATUSES.some(function (item) {
            return normalizeStatus(item) === status;
        });
    }

    /*
     * --------------------------------------------------------
     * رسالة الخطأ
     * --------------------------------------------------------
     */
    function getErrorMessage(error, fallback) {
        if (Core.getErrorMessage) {
            return Core.getErrorMessage(error, fallback);
        }

        if (error && hasValue(error.message)) {
            return String(error.message);
        }

        return fallback || "حدث خطأ غير معروف.";
    }

    /*
     * --------------------------------------------------------
     * Server Timestamp
     * --------------------------------------------------------
     */
    function serverTimestamp() {
        if (Core.serverTimestamp) {
            return Core.serverTimestamp();
        }

        if (
            window.firebase &&
            window.firebase.database &&
            window.firebase.database.ServerValue
        ) {
            return window.firebase.database.ServerValue.TIMESTAMP;
        }

        return Date.now();
    }

    /*
     * --------------------------------------------------------
     * التحقق من صلاحية رقم الهاتف
     *
     * لا نفرض صيغة واحدة على البيانات القديمة.
     * --------------------------------------------------------
     */
    function isValidEgyptianPhone(phone) {
        const normalized = normalizePhone(phone);

        return /^01[0125]\d{8}$/.test(normalized);
    }

    /*
     * --------------------------------------------------------
     * التحقق من كود المرور
     *
     * لا نفرض على الحسابات القديمة شكلًا جديدًا.
     *
     * للحسابات الجديدة:
     * - يسمح من 4 إلى 128 حرفًا.
     *
     * --------------------------------------------------------
     */
    function isValidPin(pin) {
        if (!hasValue(pin)) {
            return false;
        }

        const value = String(pin).trim();

        return value.length >= 4 && value.length <= 128;
    }

    /*
     * --------------------------------------------------------
     * SHA-256
     *
     * الحسابات الجديدة لا تخزن الـPIN كنص صريح.
     * --------------------------------------------------------
     */
    async function sha256(value) {
        const input = String(value);

        /*
         * البيئة الطبيعية للموقع:
         * HTTPS + Web Crypto API
         */
        if (
            window.crypto &&
            window.crypto.subtle &&
            typeof window.crypto.subtle.digest === "function"
        ) {
            const encoder = new TextEncoder();

            const data = encoder.encode(input);

            const hashBuffer = await window.crypto.subtle.digest(
                "SHA-256",
                data
            );

            const hashArray = Array.from(
                new Uint8Array(hashBuffer)
            );

            return hashArray
                .map(function (byte) {
                    return byte
                        .toString(16)
                        .padStart(2, "0");
                })
                .join("");
        }

        /*
         * لا نستخدم fallback ضعيف لتخزين كلمات المرور.
         *
         * لو البيئة لا توفر Web Crypto:
         * نوقف إنشاء الحساب الجديد برسالة واضحة
         * بدل تخزين الـPIN بطريقة غير آمنة.
         */
        throw new Error(
            "المتصفح لا يدعم التشفير الآمن المطلوب لإنشاء الحساب. افتح الموقع عبر HTTPS أو استخدم متصفحًا حديثًا."
        );
    }

    /*
     * --------------------------------------------------------
     * مقارنة Hash
     * --------------------------------------------------------
     */
    async function verifyPinHash(inputPin, storedHash) {
        if (!hasValue(inputPin) || !hasValue(storedHash)) {
            return false;
        }

        const generatedHash = await sha256(inputPin);

        return (
            normalizeIdentifier(generatedHash) ===
            normalizeIdentifier(storedHash)
        );
    }

    /*
     * --------------------------------------------------------
     * التحقق من PIN للحساب القديم أو الجديد
     *
     * ترتيب الدعم:
     *
     * 1. pinHash
     * 2. pin
     * 3. passwordHash
     * 4. password
     *
     * الهدف:
     * الحفاظ على التوافق مع البيانات القديمة.
     * --------------------------------------------------------
     */
    async function verifyPin(inputPin, student) {
        if (!student || !hasValue(inputPin)) {
            return false;
        }

        const suppliedPin = String(inputPin).trim();

        /*
         * الحساب الجديد:
         * pinHash
         */
        if (hasValue(student.pinHash)) {
            try {
                return await verifyPinHash(
                    suppliedPin,
                    student.pinHash
                );
            } catch (error) {
                return false;
            }
        }

        /*
         * الحسابات القديمة:
         * pin
         *
         * لا نقوم بتعديلها أو تحويلها تلقائيًا هنا.
         */
        if (hasValue(student.pin)) {
            return (
                String(student.pin).trim() === suppliedPin
            );
        }

        /*
         * توافق إضافي مع passwordHash
         * إذا كان موجودًا في بيانات قديمة.
         */
        if (hasValue(student.passwordHash)) {
            try {
                return await verifyPinHash(
                    suppliedPin,
                    student.passwordHash
                );
            } catch (error) {
                return false;
            }
        }

        /*
         * توافق إضافي مع password القديم.
         */
        if (hasValue(student.password)) {
            return (
                String(student.password).trim() === suppliedPin
            );
        }

        return false;
    }

    /*
     * --------------------------------------------------------
     * استخراج بيانات الطالب بدون معلومات حساسة
     *
     * لا نعيد pinHash في currentUser.
     * --------------------------------------------------------
     */
    function sanitizeStudent(student, key) {
        if (!student || typeof student !== "object") {
            return null;
        }

        const safeStudent = clone(student) || {};

        if (key) {
            safeStudent._key = key;
            safeStudent.key = key;
            safeStudent.studentKey = key;
        }

        /*
         * لا نضع أي credential داخل LocalStorage.
         */
        delete safeStudent.pin;
        delete safeStudent.pinHash;
        delete safeStudent.password;
        delete safeStudent.passwordHash;

        return safeStudent;
    }

    /*
     * --------------------------------------------------------
     * حفظ هوية الطالب محليًا
     * --------------------------------------------------------
     */
    function saveStudentSession(student, key) {
        if (!student) {
            return null;
        }

        const safeStudent = sanitizeStudent(
            student,
            key
        );

        if (!safeStudent) {
            return null;
        }

        try {
            localStorage.setItem(
                STORAGE_KEYS.currentUser,
                JSON.stringify(safeStudent)
            );

            localStorage.setItem(
                STORAGE_KEYS.student,
                JSON.stringify(safeStudent)
            );

            localStorage.setItem(
                STORAGE_KEYS.currentStudent,
                JSON.stringify(safeStudent)
            );

            if (hasValue(key)) {
                localStorage.setItem(
                    STORAGE_KEYS.currentStudentKey,
                    String(key)
                );
            }

            /*
             * Marker فقط لمعرفة أن النظام يستخدم
             * هوية Firebase/Database المحلية.
             *
             * لا يحتوي على PIN أو Password.
             */
            localStorage.setItem(
                STORAGE_KEYS.firebaseUser,
                JSON.stringify({
                    type: "database-student",
                    studentKey: hasValue(key)
                        ? String(key)
                        : null,
                    phone: normalizePhone(student.phone),
                    loggedInAt: Date.now()
                })
            );
        } catch (error) {
            /*
             * عدم إيقاف الدخول إذا كان LocalStorage
             * غير متاح بالكامل.
             */
        }

        return safeStudent;
    }

    /*
     * --------------------------------------------------------
     * قراءة الهوية المحلية
     * --------------------------------------------------------
     */
    function readLocalStudent() {
        const keys = [
            STORAGE_KEYS.currentUser,
            STORAGE_KEYS.student,
            STORAGE_KEYS.currentStudent
        ];

        for (let i = 0; i < keys.length; i += 1) {
            try {
                const raw = localStorage.getItem(keys[i]);

                if (!hasValue(raw)) {
                    continue;
                }

                const parsed = JSON.parse(raw);

                if (
                    parsed &&
                    typeof parsed === "object"
                ) {
                    return parsed;
                }
            } catch (error) {
                /*
                 * ننتقل للمفتاح التالي.
                 */
            }
        }

        return null;
    }

    /*
     * --------------------------------------------------------
     * قراءة currentStudentKey
     * --------------------------------------------------------
     */
    function getStoredStudentKey() {
        try {
            return localStorage.getItem(
                STORAGE_KEYS.currentStudentKey
            ) || "";
        } catch (error) {
            return "";
        }
    }

    /*
     * --------------------------------------------------------
     * حفظ رقم الهاتف للتذكر
     * --------------------------------------------------------
     */
    function rememberPhone(phone) {
        const normalized = normalizePhone(phone);

        if (!normalized) {
            return;
        }

        try {
            localStorage.setItem(
                STORAGE_KEYS.rememberedPhone,
                normalized
            );

            localStorage.setItem(
                STORAGE_KEYS.rememberLogin,
                "true"
            );
        } catch (error) {
            /*
             * لا نوقف تسجيل الدخول.
             */
        }
    }

    /*
     * --------------------------------------------------------
     * حذف رقم الهاتف المحفوظ
     * --------------------------------------------------------
     */
    function forgetRememberedPhone() {
        try {
            localStorage.removeItem(
                STORAGE_KEYS.rememberedPhone
            );

            localStorage.removeItem(
                STORAGE_KEYS.rememberLogin
            );
        } catch (error) {
            /*
             * لا شيء.
             */
        }
    }

    /*
     * --------------------------------------------------------
     * رقم الهاتف المحفوظ
     * --------------------------------------------------------
     */
    function getRememberedPhone() {
        try {
            return (
                localStorage.getItem(
                    STORAGE_KEYS.rememberedPhone
                ) || ""
            );
        } catch (error) {
            return "";
        }
    }

    /*
     * --------------------------------------------------------
     * البحث عن الطالب بالهاتف
     *
     * مهم جدًا:
     * لا نعتمد على findStudent() من طبقة Database هنا،
     * لأننا نحتاج البحث المباشر باستخدام رقم الهاتف.
     *
     * يتم فحص جميع سجلات /students.
     *
     * لا يتم تعديل أي سجل.
     * --------------------------------------------------------
     */
    async function findStudentByPhone(phone) {
        const normalizedPhone = normalizePhone(phone);

        if (!normalizedPhone) {
            return {
                found: false,
                student: null,
                key: null
            };
        }

        const snapshot = await database
            .ref(PATHS.students)
            .once("value");

        const data = snapshot.val();

        if (!data || typeof data !== "object") {
            return {
                found: false,
                student: null,
                key: null
            };
        }

        const matches = [];

        Object.keys(data).forEach(function (key) {
            const student = data[key];

            if (
                !student ||
                typeof student !== "object"
            ) {
                return;
            }

            const storedPhone = normalizePhone(
                student.phone
            );

            const alternatePhone = normalizePhone(
                student.mobile
            );

            const phoneNumber = normalizePhone(
                student.phoneNumber
            );

            const matchesPhone =
                storedPhone === normalizedPhone ||
                alternatePhone === normalizedPhone ||
                phoneNumber === normalizedPhone;

            if (!matchesPhone) {
                return;
            }

            matches.push({
                key: key,
                student: student
            });
        });

        if (!matches.length) {
            return {
                found: false,
                student: null,
                key: null
            };
        }

        /*
         * ----------------------------------------------------
         * اختيار أفضل سجل عند وجود أكثر من سجل بنفس الرقم.
         *
         * الأولوية:
         * 1. approved / active
         * 2. pending
         * 3. rejected
         * 4. الأحدث
         *
         * هذا مهم للحفاظ على الحسابات القديمة وعدم اختيار
         * سجل غير مفعل بالخطأ إذا كان هناك سجل مفعل.
         * ----------------------------------------------------
         */
        function statusRank(student) {
            if (isApproved(student)) {
                return 3;
            }

            if (isPending(student)) {
                return 2;
            }

            if (isRejected(student)) {
                return 1;
            }

            return 0;
        }

        matches.sort(function (a, b) {
            const rankDifference =
                statusRank(b.student) -
                statusRank(a.student);

            if (rankDifference !== 0) {
                return rankDifference;
            }

            const aDate = Number(
                a.student.updatedAt ||
                a.student.createdAt ||
                0
            );

            const bDate = Number(
                b.student.updatedAt ||
                b.student.createdAt ||
                0
            );

            return bDate - aDate;
        });

        return {
            found: true,
            student: matches[0].student,
            key: matches[0].key,
            matches: matches.length
        };
    }

    /*
     * --------------------------------------------------------
     * البحث عن الطالب بالمفتاح
     * --------------------------------------------------------
     */
    async function getStudentByKey(key) {
        if (!hasValue(key)) {
            return null;
        }

        const snapshot = await database
            .ref(PATHS.students)
            .child(String(key))
            .once("value");

        if (!snapshot.exists()) {
            return null;
        }

        return snapshot.val();
    }

    /*
     * --------------------------------------------------------
     * تسجيل الدخول برقم الهاتف + PIN
     * --------------------------------------------------------
     */
    async function loginWithPhonePassword(
        phone,
        pin,
        options
    ) {
        const settings = options || {};

        const rawPhone = safeString(phone);
        const rawPin = safeString(pin);

        if (!rawPhone) {
            throw new Error(
                "من فضلك أدخل رقم الهاتف."
            );
        }

        if (!rawPin) {
            throw new Error(
                "من فضلك أدخل كود المرور."
            );
        }

        const normalizedPhone = normalizePhone(rawPhone);

        if (!isValidEgyptianPhone(normalizedPhone)) {
            throw new Error(
                "رقم الهاتف المصري غير صحيح."
            );
        }

        const result = await findStudentByPhone(
            normalizedPhone
        );

        if (!result.found || !result.student) {
            throw new Error(
                "رقم الهاتف أو كود المرور غير صحيح."
            );
        }

        const student = result.student;
        const studentKey = result.key;

        /*
         * ----------------------------------------------------
         * التحقق من PIN
         * ----------------------------------------------------
         */
        const validPin = await verifyPin(
            rawPin,
            student
        );

        if (!validPin) {
            throw new Error(
                "رقم الهاتف أو كود المرور غير صحيح."
            );
        }

        /*
         * ----------------------------------------------------
         * التحقق من حالة الحساب
         * ----------------------------------------------------
         */
        if (isPending(student)) {
            const error = new Error(
                "حسابك ما زال قيد المراجعة ولم يتم تفعيله بعد."
            );

            error.code = "AUTH_ACCOUNT_PENDING";

            throw error;
        }

        if (isRejected(student)) {
            const error = new Error(
                "هذا الحساب غير مفعل حاليًا. يرجى التواصل مع الإدارة."
            );

            error.code = "AUTH_ACCOUNT_REJECTED";

            throw error;
        }

        /*
         * ----------------------------------------------------
         * لو الحالة غير معروفة:
         *
         * لا نعتبر الحساب مقبولًا تلقائيًا.
         * ----------------------------------------------------
         */
        if (!isApproved(student)) {
            const error = new Error(
                "هذا الحساب لم يتم تفعيله بعد."
            );

            error.code = "AUTH_ACCOUNT_NOT_APPROVED";

            throw error;
        }

        /*
         * ----------------------------------------------------
         * حفظ Session
         * ----------------------------------------------------
         */
        const safeStudent = saveStudentSession(
            student,
            studentKey
        );

        if (settings.remember) {
            rememberPhone(normalizedPhone);
        } else if (settings.forgetRememberedPhone) {
            forgetRememberedPhone();
        }

        return {
            success: true,
            authenticated: true,
            student: safeStudent,
            studentKey: studentKey,
            phone: normalizedPhone,
            status: student.status || "approved"
        };
    }

    /*
     * --------------------------------------------------------
     * تسجيل طالب جديد
     *
     * لا نقوم هنا بالموافقة على الحساب.
     * الحالة دائمًا pending.
     *
     * البيانات القديمة لا يتم تعديلها.
     * --------------------------------------------------------
     */
    async function registerStudent(data) {
        const payload = data || {};

        const name = safeString(
            payload.name ||
            payload.studentName ||
            payload.fullName
        );

        const phone = safeString(
            payload.phone ||
            payload.mobile ||
            payload.phoneNumber
        );

        const email = safeString(
            payload.email
        );

        const grade = safeString(
            payload.grade ||
            payload.year ||
            payload.level
        );

        const studentId = safeString(
            payload.studentId ||
            payload.universityId ||
            payload.id
        );

        const pin = safeString(
            payload.pin ||
            payload.password ||
            payload.passcode
        );

        if (!name) {
            throw new Error(
                "من فضلك أدخل الاسم."
            );
        }

        if (name.length < 2) {
            throw new Error(
                "الاسم قصير جدًا."
            );
        }

        if (!phone) {
            throw new Error(
                "من فضلك أدخل رقم الهاتف."
            );
        }

        const normalizedPhone = normalizePhone(phone);

        if (!isValidEgyptianPhone(normalizedPhone)) {
            throw new Error(
                "رقم الهاتف المصري غير صحيح."
            );
        }

        if (!grade) {
            throw new Error(
                "من فضلك اختر الفرقة الدراسية."
            );
        }

        if (!isValidPin(pin)) {
            throw new Error(
                "كود المرور يجب أن يكون من 4 إلى 128 حرفًا على الأقل."
            );
        }

        /*
         * ----------------------------------------------------
         * التأكد من عدم وجود حساب سابق بنفس الهاتف.
         *
         * لا نحذف الحساب القديم.
         * ----------------------------------------------------
         */
        const existing = await findStudentByPhone(
            normalizedPhone
        );

        if (existing.found && existing.student) {
            if (isApproved(existing.student)) {
                const error = new Error(
                    "يوجد حساب مفعل بالفعل بهذا الرقم."
                );

                error.code = "AUTH_PHONE_ALREADY_REGISTERED";

                throw error;
            }

            if (isPending(existing.student)) {
                const error = new Error(
                    "يوجد بالفعل طلب تسجيل بهذا الرقم وما زال قيد المراجعة."
                );

                error.code = "AUTH_REGISTRATION_PENDING";

                throw error;
            }

            if (isRejected(existing.student)) {
                const error = new Error(
                    "يوجد حساب سابق بهذا الرقم ولم تتم الموافقة عليه."
                );

                error.code = "AUTH_REGISTRATION_REJECTED";

                throw error;
            }

            /*
             * حتى لو كانت الحالة غير معروفة:
             * لا ننشئ سجلًا ثانيًا بنفس الرقم.
             */
            const error = new Error(
                "يوجد حساب مسجل بالفعل بهذا الرقم."
            );

            error.code = "AUTH_PHONE_ALREADY_REGISTERED";

            throw error;
        }

        /*
         * ----------------------------------------------------
         * إنشاء Hash للـPIN
         * ----------------------------------------------------
         */
        const pinHash = await sha256(pin);

        /*
         * ----------------------------------------------------
         * بيانات الحساب الجديد
         *
         * نحتفظ بأسماء حقول مفيدة للتوافق.
         * ----------------------------------------------------
         */
        const now = serverTimestamp();

        const studentData = {
            name: name,
            studentName: name,

            grade: grade,

            phone: normalizedPhone,

            status: "pending",

            pinHash: pinHash,

            createdAt: now,
            updatedAt: now,

            source: "web",
            registeredFrom: "cap-abdelnaseer-platform"
        };

        if (email) {
            studentData.email = email;
        }

        if (studentId) {
            studentData.studentId = studentId;
        }

        /*
         * ----------------------------------------------------
         * إضافة الحساب الجديد.
         *
         * push() ينشئ Key جديدًا ولا يستبدل سجلًا قديمًا.
         * ----------------------------------------------------
         */
        const newReference = database
            .ref(PATHS.students)
            .push();

        await newReference.set(studentData);

        const studentKey = newReference.key;

        /*
         * ----------------------------------------------------
         * النتيجة التي ترجع للصفحة.
         *
         * لا نرجع pinHash.
         * ----------------------------------------------------
         */
        return {
            success: true,
            registered: true,
            studentKey: studentKey,
            status: "pending",
            student: sanitizeStudent(
                studentData,
                studentKey
            ),
            message:
                "تم إنشاء الحساب بنجاح، والحساب الآن قيد المراجعة."
        };
    }

    /*
     * --------------------------------------------------------
     * الحصول على المستخدم المحلي الحالي
     * --------------------------------------------------------
     */
    function getCurrentStudent() {
        return readLocalStudent();
    }

    /*
     * --------------------------------------------------------
     * الحصول على currentStudentKey
     * --------------------------------------------------------
     */
    function getCurrentStudentKey() {
        return getStoredStudentKey();
    }

    /*
     * --------------------------------------------------------
     * هل يوجد Session؟
     * --------------------------------------------------------
     */
    function isLoggedIn() {
        return !!getCurrentStudent();
    }

    /*
     * --------------------------------------------------------
     * تسجيل الخروج
     * --------------------------------------------------------
     */
    async function signOut() {
        /*
         * مسح هوية الطالب المحلية.
         */
        try {
            localStorage.removeItem(
                STORAGE_KEYS.currentUser
            );

            localStorage.removeItem(
                STORAGE_KEYS.student
            );

            localStorage.removeItem(
                STORAGE_KEYS.currentStudent
            );

            localStorage.removeItem(
                STORAGE_KEYS.currentStudentKey
            );

            localStorage.removeItem(
                STORAGE_KEYS.firebaseUser
            );
        } catch (error) {
            /*
             * لا نوقف تسجيل الخروج.
             */
        }

        /*
         * لو Firebase Auth مستخدم في أي جزء آخر
         * من المنصة، نغلق جلسته أيضًا.
         */
        if (
            auth &&
            typeof auth.signOut === "function"
        ) {
            try {
                await auth.signOut();
            } catch (error) {
                /*
                 * لا نمنع تسجيل خروج الطالب المحلي.
                 */
            }
        }

        return {
            success: true
        };
    }

    /*
     * --------------------------------------------------------
     * الحصول على Firebase Auth User
     * --------------------------------------------------------
     */
    function getCurrentFirebaseUser() {
        if (!auth) {
            return null;
        }

        return auth.currentUser || null;
    }

    /*
     * --------------------------------------------------------
     * مراقبة Firebase Auth
     * --------------------------------------------------------
     */
    function onAuthStateChanged(callback) {
        if (
            !auth ||
            typeof auth.onAuthStateChanged !== "function"
        ) {
            if (typeof callback === "function") {
                callback(null);
            }

            return function () {};
        }

        return auth.onAuthStateChanged(function (user) {
            if (typeof callback === "function") {
                callback(user || null);
            }
        });
    }

    /*
     * --------------------------------------------------------
     * الحصول على رقم الهاتف المحفوظ
     * --------------------------------------------------------
     */
    function getRememberedLoginPhone() {
        return getRememberedPhone();
    }

    /*
     * --------------------------------------------------------
     * توافق مع أسماء دوال قديمة
     *
     * هذه الدوال لا تستخدم Email Authentication
     * لتسجيل دخول الطلاب.
     * --------------------------------------------------------
     */

    async function loginWithEmail() {
        const error = new Error(
            "نظام دخول الطلاب الحالي يعتمد على رقم الهاتف وكود المرور."
        );

        error.code = "AUTH_EMAIL_LOGIN_DISABLED";

        throw error;
    }

    async function registerWithEmail() {
        const error = new Error(
            "تسجيل الطلاب الحالي يعتمد على رقم الهاتف وكود المرور."
        );

        error.code = "AUTH_EMAIL_REGISTER_DISABLED";

        throw error;
    }

    async function sendPasswordResetEmail() {
        const error = new Error(
            "استعادة كود المرور تتم من خلال نظام طلب الاستعادة الخاص بالمنصة، وليس Firebase Email Authentication."
        );

        error.code = "AUTH_EMAIL_RESET_DISABLED";

        throw error;
    }

    /*
     * --------------------------------------------------------
     * طلب استعادة كود المرور
     *
     * مهم:
     * لا نقوم بتغيير PIN مباشرة من صفحة عامة.
     *
     * السبب:
     * مجرد معرفة رقم الهاتف لا يكفي لإثبات ملكية الحساب.
     *
     * يتم إنشاء طلب داخل:
     * /passwordResetRequests
     *
     * وتقوم الإدارة/النظام المخصص بالمراجعة.
     * --------------------------------------------------------
     */
    async function requestPasswordReset(phone, options) {
        const settings = options || {};

        const normalizedPhone = normalizePhone(phone);

        if (!normalizedPhone) {
            throw new Error(
                "من فضلك أدخل رقم الهاتف."
            );
        }

        if (!isValidEgyptianPhone(normalizedPhone)) {
            throw new Error(
                "رقم الهاتف المصري غير صحيح."
            );
        }

        const result = await findStudentByPhone(
            normalizedPhone
        );

        if (!result.found || !result.student) {
            /*
             * لا نكشف بشكل مبالغ فيه إذا كان الرقم مسجلًا
             * أم لا في واجهة عامة.
             */
            return {
                success: true,
                requested: false,
                message:
                    "إذا كان الرقم مسجلًا، سيتم التعامل مع طلب الاستعادة."
            };
        }

        const student = result.student;
        const studentKey = result.key;

        /*
         * لا نسمح بطلب استعادة لحساب مرفوض.
         */
        if (isRejected(student)) {
            return {
                success: true,
                requested: false,
                message:
                    "لا يمكن معالجة طلب الاستعادة لهذا الحساب حاليًا."
            };
        }

        const requestData = {
            studentKey: studentKey,

            phone: normalizedPhone,

            studentId:
                student.studentId ||
                student.id ||
                "",

            studentName:
                student.name ||
                student.studentName ||
                "",

            status: "pending",

            type: "password-reset",

            createdAt: serverTimestamp(),

            source: "web",

            requestedFrom:
                settings.page ||
                "forgot-password.html"
        };

        const requestReference = database
            .ref(PATHS.passwordResetRequests)
            .push();

        await requestReference.set(
            requestData
        );

        return {
            success: true,
            requested: true,
            requestKey: requestReference.key,
            message:
                "تم إرسال طلب استعادة كود المرور، وسيتم مراجعته من الإدارة."
        };
    }

    /*
     * --------------------------------------------------------
     * ربط الحساب المحلي بالمستخدم
     *
     * لا نغير بيانات الطالب هنا.
     * --------------------------------------------------------
     */
    async function syncLocalIdentity() {
        const student = readLocalStudent();
        const key = getStoredStudentKey();

        if (!student) {
            return {
                success: false,
                authenticated: false,
                student: null,
                studentKey: key || null
            };
        }

        return {
            success: true,
            authenticated: true,
            student: student,
            studentKey: key || null
        };
    }

    /*
     * --------------------------------------------------------
     * API النهائي
     * --------------------------------------------------------
     */
    const FirebaseAuthAPI = {
        __CAP_AUTH_MODULE__: true,

        version: "1.0.0",

        storageKeys: STORAGE_KEYS,

        approvedStatuses: APPROVED_STATUSES,

        pendingStatuses: PENDING_STATUSES,

        rejectedStatuses: REJECTED_STATUSES,

        normalizePhone: normalizePhone,

        normalizeIdentifier: normalizeIdentifier,

        isValidEgyptianPhone: isValidEgyptianPhone,

        isValidPin: isValidPin,

        isApproved: isApproved,

        isPending: isPending,

        isRejected: isRejected,

        findStudentByPhone: findStudentByPhone,

        getStudentByKey: getStudentByKey,

        verifyPin: verifyPin,

        loginWithPhonePassword:
            loginWithPhonePassword,

        registerStudent:
            registerStudent,

        requestPasswordReset:
            requestPasswordReset,

        getCurrentStudent:
            getCurrentStudent,

        getCurrentStudentKey:
            getCurrentStudentKey,

        isLoggedIn:
            isLoggedIn,

        saveStudentSession:
            saveStudentSession,

        syncLocalIdentity:
            syncLocalIdentity,

        getRememberedPhone:
            getRememberedPhone,

        getRememberedLoginPhone:
            getRememberedLoginPhone,

        rememberPhone:
            rememberPhone,

        forgetRememberedPhone:
            forgetRememberedPhone,

        getCurrentFirebaseUser:
            getCurrentFirebaseUser,

        onAuthStateChanged:
            onAuthStateChanged,

        signOut:
            signOut,

        /*
         * توافق مع أسماء النظام القديم/المحتمل.
         */
        loginWithEmail:
            loginWithEmail,

        registerWithEmail:
            registerWithEmail,

        sendPasswordResetEmail:
            sendPasswordResetEmail
    };

    /*
     * --------------------------------------------------------
     * تجميد API
     * --------------------------------------------------------
     */
    Object.freeze(FirebaseAuthAPI);

    /*
     * --------------------------------------------------------
     * تسجيل API عالميًا
     * --------------------------------------------------------
     */
    window.FirebaseAuth = FirebaseAuthAPI;

    /*
     * --------------------------------------------------------
     * جاهزية الوحدة
     * --------------------------------------------------------
     */
    window.FirebaseAuthReady = true;

    /*
     * --------------------------------------------------------
     * Event
     * --------------------------------------------------------
     */
    try {
        window.dispatchEvent(
            new CustomEvent("firebaseauth:ready", {
                detail: {
                    version:
                        FirebaseAuthAPI.version,
                    databasePath:
                        PATHS.students
                }
            })
        );
    } catch (error) {
        /*
         * لا نوقف الموقع إذا لم يدعم المتصفح CustomEvent.
         */
    }

})(window);
