/*
 * firebase-content.js
 * Central content layer for the platform.
 *
 * Required load order:
 * 1) Firebase compat CDN scripts
 * 2) firebase-config.js
 * 3) firebase-auth.js
 * 4) firebase-database.js
 * 5) firebase-content.js
 *
 * Responsibilities:
 * - Unified access to files, videos, quizzes, subjects and summaries.
 * - Preserve the existing Firebase data.
 * - Normalize legacy field names without rewriting stored records.
 * - Provide filtering/search/sorting helpers for the HTML pages.
 * - Work with the current database schema and future content sections.
 * - No destructive migration or automatic deletion.
 */

(function (window) {
  "use strict";

  var Core = window.FirebaseCore;
  var DB = window.FirebaseDatabase;

  if (!Core) {
    throw new Error(
      "firebase-content.js requires firebase-config.js to be loaded first."
    );
  }

  if (!DB) {
    throw new Error(
      "firebase-content.js requires firebase-database.js to be loaded first."
    );
  }

  var PATHS = Core.PATHS || {};

  var CONTENT_PATHS = {
    files: PATHS.files || "files",
    videos: PATHS.videos || "videos",
    quizzes: PATHS.quizzes || "quizzes",
    contentViews: "content_views"
  };

  /*
   * ------------------------------------------------------------
   * Generic helpers
   * ------------------------------------------------------------
   */

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function clone(value) {
    if (value === undefined || value === null) {
      return value;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalized(value) {
    return text(value).toLowerCase();
  }

  function firstValue(object, keys, fallback) {
    if (!object) return fallback;

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      if (
        Object.prototype.hasOwnProperty.call(object, key) &&
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return fallback;
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value.map(function (item, index) {
        if (isObject(item) && item.id == null) {
          return Object.assign({}, item, {
            id: String(index)
          });
        }

        return item;
      });
    }

    if (!isObject(value)) {
      return [];
    }

    return Object.keys(value).map(function (key) {
      var item = value[key];

      if (isObject(item)) {
        return Object.assign({}, item, {
          id: item.id != null ? String(item.id) : key,
          _key: key
        });
      }

      return {
        id: key,
        _key: key,
        value: item
      };
    });
  }

  function parseTime(value) {
    if (value == null || value === "") {
      return 0;
    }

    if (typeof value === "number") {
      return value;
    }

    var number = Number(value);

    if (!isNaN(number) && isFinite(number)) {
      return number;
    }

    var parsed = Date.parse(String(value));

    return isNaN(parsed) ? 0 : parsed;
  }

  function getId(item, fallback) {
    if (!item) return fallback || "";

    return String(
      firstValue(
        item,
        ["id", "_key", "contentId", "fileId", "videoId", "quizId"],
        fallback || ""
      )
    );
  }

  function isPublished(item) {
    if (!item) return false;

    if (item.published === false) {
      return false;
    }

    if (item.active === false) {
      return false;
    }

    var status = normalized(item.status);

    if (
      status === "draft" ||
      status === "unpublished" ||
      status === "disabled" ||
      status === "inactive"
    ) {
      return false;
    }

    return true;
  }

  function matchesValue(item, keys, wanted) {
    if (wanted == null || wanted === "") {
      return true;
    }

    var target = normalized(wanted);

    return keys.some(function (key) {
      var value = normalized(item[key]);

      if (!value) {
        return false;
      }

      return value === target;
    });
  }

  function matchesAnyValue(item, keys, wantedValues) {
    if (!wantedValues || !wantedValues.length) {
      return true;
    }

    var values = wantedValues.map(normalized);

    return keys.some(function (key) {
      var value = normalized(item[key]);

      return value && values.indexOf(value) !== -1;
    });
  }

  function sortContent(items) {
    return items.sort(function (a, b) {
      var orderA = Number(
        firstValue(a, ["order", "sortOrder", "position"], 0)
      );

      var orderB = Number(
        firstValue(b, ["order", "sortOrder", "position"], 0)
      );

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      var dateA = parseTime(
        firstValue(a, ["createdAt", "updatedAt", "publishedAt"], 0)
      );

      var dateB = parseTime(
        firstValue(b, ["createdAt", "updatedAt", "publishedAt"], 0)
      );

      return dateB - dateA;
    });
  }

  /*
   * ------------------------------------------------------------
   * Files
   * ------------------------------------------------------------
   */

  function normalizeFile(item, key) {
    if (!isObject(item)) {
      return null;
    }

    var file = clone(item) || {};

    file._key = key != null
      ? String(key)
      : String(firstValue(file, ["_key", "id"], ""));

    file.id = String(
      firstValue(
        file,
        ["id", "fileId", "contentId"],
        file._key
      )
    );

    file.title = text(
      firstValue(
        file,
        ["title", "name", "fileName", "filename"],
        ""
      )
    );

    file.description = text(
      firstValue(
        file,
        ["description", "details", "desc"],
        ""
      )
    );

    file.subject = firstValue(
      file,
      ["subject", "subjectId", "course"],
      ""
    );

    file.term = firstValue(
      file,
      ["term", "semester"],
      ""
    );

    file.grade = firstValue(
      file,
      ["grade", "year", "level"],
      ""
    );

    file.url = firstValue(
      file,
      [
        "pdfUrl",
        "fileUrl",
        "url",
        "link",
        "downloadURL",
        "downloadUrl"
      ],
      ""
    );

    file.fileType = firstValue(
      file,
      ["fileType", "type", "mimeType", "extension"],
      ""
    );

    file.size = firstValue(
      file,
      ["size", "fileSize"],
      null
    );

    file.createdAt = firstValue(
      file,
      ["createdAt", "uploadedAt", "date"],
      null
    );

    file.updatedAt = firstValue(
      file,
      ["updatedAt", "modifiedAt"],
      null
    );

    file.published =
      file.published === undefined
        ? true
        : !!file.published;

    return file;
  }

  async function getFiles(options) {
    options = options || {};

    var files;

    if (DB.getFiles) {
      files = await DB.getFiles({
        publishedOnly:
          options.publishedOnly !== false,
        subject: options.subject,
        term: options.term,
        grade: options.grade
      });
    } else {
      var raw = await DB.get(CONTENT_PATHS.files);
      files = toArray(raw);
    }

    files = files
      .map(function (item) {
        return normalizeFile(
          item,
          item && (item._key || item.id)
        );
      })
      .filter(Boolean);

    if (options.publishedOnly !== false) {
      files = files.filter(isPublished);
    }

    if (options.search) {
      var search = normalized(options.search);

      files = files.filter(function (file) {
        return [
          file.title,
          file.description,
          file.subject,
          file.term,
          file.grade,
          file.fileType
        ].some(function (value) {
          return normalized(value).indexOf(search) !== -1;
        });
      });
    }

    if (options.subject) {
      files = files.filter(function (file) {
        return matchesValue(
          file,
          ["subject", "subjectId", "course"],
          options.subject
        );
      });
    }

    if (options.term) {
      files = files.filter(function (file) {
        return matchesValue(
          file,
          ["term", "semester"],
          options.term
        );
      });
    }

    if (options.grade) {
      var grade = normalized(options.grade);

      files = files.filter(function (file) {
        var current = normalized(file.grade);

        return (
          !current ||
          current === "all" ||
          current === "الجميع" ||
          current === grade
        );
      });
    }

    return sortContent(files);
  }

  async function getFile(fileId) {
    if (!fileId) {
      return null;
    }

    var direct = await DB.get(
      CONTENT_PATHS.files +
      "/" +
      encodeURIComponent(String(fileId))
    );

    if (direct) {
      return normalizeFile(direct, fileId);
    }

    var files = await getFiles({
      publishedOnly: false
    });

    for (var i = 0; i < files.length; i++) {
      if (
        String(files[i].id) === String(fileId) ||
        String(files[i]._key) === String(fileId)
      ) {
        return files[i];
      }
    }

    return null;
  }

  /*
   * ------------------------------------------------------------
   * Videos
   * ------------------------------------------------------------
   */

  function normalizeVideo(item, key) {
    if (!isObject(item)) {
      return null;
    }

    var video = clone(item) || {};

    video._key = key != null
      ? String(key)
      : String(firstValue(video, ["_key", "id"], ""));

    video.id = String(
      firstValue(
        video,
        ["id", "videoId", "contentId"],
        video._key
      )
    );

    video.title = text(
      firstValue(
        video,
        ["title", "name", "videoTitle"],
        ""
      )
    );

    video.description = text(
      firstValue(
        video,
        ["description", "details", "desc"],
        ""
      )
    );

    video.subject = firstValue(
      video,
      ["subject", "subjectId", "course"],
      ""
    );

    video.term = firstValue(
      video,
      ["term", "semester"],
      ""
    );

    video.grade = firstValue(
      video,
      ["grade", "year", "level"],
      ""
    );

    video.url = firstValue(
      video,
      [
        "url",
        "videoUrl",
        "link",
        "sourceUrl",
        "embedUrl",
        "video"
      ],
      ""
    );

    video.thumbnail = firstValue(
      video,
      ["thumbnail", "thumbnailUrl", "image", "imageUrl"],
      ""
    );

    video.duration = firstValue(
      video,
      ["duration", "durationSeconds", "durationMinutes"],
      null
    );

    video.createdAt = firstValue(
      video,
      ["createdAt", "uploadedAt", "date"],
      null
    );

    video.updatedAt = firstValue(
      video,
      ["updatedAt", "modifiedAt"],
      null
    );

    video.published =
      video.published === undefined
        ? true
        : !!video.published;

    return video;
  }

  function getYouTubeId(url) {
    if (!url) return "";

    var value = String(url).trim();

    var patterns = [
      /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
      /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/i,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i
    ];

    for (var i = 0; i < patterns.length; i++) {
      var match = value.match(patterns[i]);

      if (match && match[1]) {
        return match[1];
      }
    }

    return "";
  }

  function getVimeoId(url) {
    if (!url) return "";

    var match = String(url).match(
      /vimeo\.com\/(?:video\/)?(\d+)/i
    );

    return match && match[1] ? match[1] : "";
  }

  function getVideoType(url) {
    var value = normalized(url);

    if (!value) {
      return "unknown";
    }

    if (getYouTubeId(url)) {
      return "youtube";
    }

    if (getVimeoId(url)) {
      return "vimeo";
    }

    if (
      value.indexOf(".mp4") !== -1 ||
      value.indexOf(".webm") !== -1 ||
      value.indexOf(".ogg") !== -1 ||
      value.indexOf(".mov") !== -1
    ) {
      return "direct";
    }

    if (
      value.indexOf("<iframe") !== -1 ||
      value.indexOf("iframe") !== -1
    ) {
      return "iframe";
    }

    return "external";
  }

  function getVideoEmbedUrl(videoOrUrl) {
    var url = isObject(videoOrUrl)
      ? videoOrUrl.url
      : videoOrUrl;

    if (!url) {
      return "";
    }

    var youtubeId = getYouTubeId(url);

    if (youtubeId) {
      return "https://www.youtube.com/embed/" + youtubeId;
    }

    var vimeoId = getVimeoId(url);

    if (vimeoId) {
      return "https://player.vimeo.com/video/" + vimeoId;
    }

    return String(url);
  }

  async function getVideos(options) {
    options = options || {};

    var videos;

    if (DB.getVideos) {
      videos = await DB.getVideos({
        publishedOnly:
          options.publishedOnly !== false,
        subject: options.subject,
        term: options.term,
        grade: options.grade
      });
    } else {
      var raw = await DB.get(CONTENT_PATHS.videos);
      videos = toArray(raw);
    }

    videos = videos
      .map(function (item) {
        return normalizeVideo(
          item,
          item && (item._key || item.id)
        );
      })
      .filter(Boolean);

    if (options.publishedOnly !== false) {
      videos = videos.filter(isPublished);
    }

    if (options.search) {
      var search = normalized(options.search);

      videos = videos.filter(function (video) {
        return [
          video.title,
          video.description,
          video.subject,
          video.term,
          video.grade
        ].some(function (value) {
          return normalized(value).indexOf(search) !== -1;
        });
      });
    }

    if (options.subject) {
      videos = videos.filter(function (video) {
        return matchesValue(
          video,
          ["subject", "subjectId", "course"],
          options.subject
        );
      });
    }

    if (options.term) {
      videos = videos.filter(function (video) {
        return matchesValue(
          video,
          ["term", "semester"],
          options.term
        );
      });
    }

    if (options.grade) {
      var grade = normalized(options.grade);

      videos = videos.filter(function (video) {
        var current = normalized(video.grade);

        return (
          !current ||
          current === "all" ||
          current === "الجميع" ||
          current === grade
        );
      });
    }

    videos = sortContent(videos);

    videos.forEach(function (video) {
      video.videoType = getVideoType(video.url);
      video.embedUrl = getVideoEmbedUrl(video.url);
    });

    return videos;
  }

  async function getVideo(videoId) {
    if (!videoId) {
      return null;
    }

    var direct = await DB.get(
      CONTENT_PATHS.videos +
      "/" +
      encodeURIComponent(String(videoId))
    );

    if (direct) {
      var normalizedVideo = normalizeVideo(
        direct,
        videoId
      );

      normalizedVideo.videoType = getVideoType(
        normalizedVideo.url
      );

      normalizedVideo.embedUrl = getVideoEmbedUrl(
        normalizedVideo.url
      );

      return normalizedVideo;
    }

    var videos = await getVideos({
      publishedOnly: false
    });

    for (var i = 0; i < videos.length; i++) {
      if (
        String(videos[i].id) === String(videoId) ||
        String(videos[i]._key) === String(videoId)
      ) {
        return videos[i];
      }
    }

    return null;
  }

  /*
   * ------------------------------------------------------------
   * Quizzes
   * ------------------------------------------------------------
   */

  function normalizeQuizQuestion(question, index) {
    if (!isObject(question)) {
      return {
        id: String(index),
        question: text(question),
        options: []
      };
    }

    var item = clone(question) || {};

    item.id = String(
      firstValue(
        item,
        ["id", "questionId"],
        index
      )
    );

    item.question = text(
      firstValue(
        item,
        [
          "question",
          "text",
          "questionText",
          "title"
        ],
        ""
      )
    );

    item.options = firstValue(
      item,
      ["options", "choices", "answers"],
      []
    );

    if (!Array.isArray(item.options)) {
      item.options = toArray(item.options);
    }

    return item;
  }

  function normalizeQuiz(quiz, key) {
    if (!isObject(quiz)) {
      return null;
    }

    var item = clone(quiz) || {};

    item._key = key != null
      ? String(key)
      : String(firstValue(item, ["_key", "id"], ""));

    item.id = String(
      firstValue(
        item,
        ["id", "quizId"],
        item._key
      )
    );

    item.title = text(
      firstValue(
        item,
        ["title", "name"],
        ""
      )
    );

    item.description = text(
      firstValue(
        item,
        ["description", "details"],
        ""
      )
    );

    item.subject = firstValue(
      item,
      ["subject", "subjectId"],
      ""
    );

    item.term = firstValue(
      item,
      ["term", "semester"],
      ""
    );

    item.grade = firstValue(
      item,
      ["grade", "year", "level"],
      ""
    );

    item.duration = firstValue(
      item,
      ["duration", "durationMinutes"],
      0
    );

    item.passScore = firstValue(
      item,
      ["passScore", "passingScore"],
      null
    );

    item.totalScore = firstValue(
      item,
      ["totalScore", "totalMarks"],
      null
    );

    item.questions = Array.isArray(item.questions)
      ? item.questions.map(normalizeQuizQuestion)
      : toArray(item.questions).map(normalizeQuizQuestion);

    item.totalQuestions =
      item.totalQuestions != null
        ? Number(item.totalQuestions)
        : item.questions.length;

    item.published =
      item.published === undefined
        ? true
        : !!item.published;

    return item;
  }

  async function getQuizzes(options) {
    options = options || {};

    var quizzes;

    if (DB.getQuizzes) {
      quizzes = await DB.getQuizzes({
        publishedOnly:
          options.publishedOnly !== false,
        subject: options.subject,
        term: options.term,
        grade: options.grade
      });
    } else {
      var raw = await DB.get(CONTENT_PATHS.quizzes);
      quizzes = toArray(raw);
    }

    quizzes = quizzes
      .map(function (item) {
        return normalizeQuiz(
          item,
          item && (item._key || item.id)
        );
      })
      .filter(Boolean);

    if (options.publishedOnly !== false) {
      quizzes = quizzes.filter(isPublished);
    }

    if (options.search) {
      var search = normalized(options.search);

      quizzes = quizzes.filter(function (quiz) {
        return [
          quiz.title,
          quiz.description,
          quiz.subject,
          quiz.term,
          quiz.grade
        ].some(function (value) {
          return normalized(value).indexOf(search) !== -1;
        });
      });
    }

    if (options.subject) {
      quizzes = quizzes.filter(function (quiz) {
        return matchesValue(
          quiz,
          ["subject", "subjectId"],
          options.subject
        );
      });
    }

    if (options.term) {
      quizzes = quizzes.filter(function (quiz) {
        return matchesValue(
          quiz,
          ["term", "semester"],
          options.term
        );
      });
    }

    if (options.grade) {
      var grade = normalized(options.grade);

      quizzes = quizzes.filter(function (quiz) {
        var current = normalized(quiz.grade);

        return (
          !current ||
          current === "all" ||
          current === "الجميع" ||
          current === grade
        );
      });
    }

    return sortContent(quizzes);
  }

  async function getQuiz(quizId) {
    if (!quizId) {
      return null;
    }

    var quiz = await DB.get(
      CONTENT_PATHS.quizzes +
      "/" +
      encodeURIComponent(String(quizId))
    );

    if (quiz) {
      return normalizeQuiz(quiz, quizId);
    }

    var quizzes = await getQuizzes({
      publishedOnly: false
    });

    for (var i = 0; i < quizzes.length; i++) {
      if (
        String(quizzes[i].id) === String(quizId) ||
        String(quizzes[i]._key) === String(quizId)
      ) {
        return quizzes[i];
      }
    }

    return null;
  }

  /*
   * ------------------------------------------------------------
   * Subjects
   * ------------------------------------------------------------
   *
   * Subjects are intentionally derived from content instead of
   * creating a second competing Firebase subject database.
   */

  function addUniqueSubject(list, seen, value, source) {
    var label = text(value);

    if (!label) {
      return;
    }

    var key = normalized(label);

    if (seen[key]) {
      return;
    }

    seen[key] = true;

    list.push({
      id: key,
      name: label,
      title: label,
      source: source || "content"
    });
  }

  async function getSubjects(options) {
    options = options || {};

    var subjects = [];
    var seen = {};

    var files = await getFiles({
      publishedOnly:
        options.publishedOnly !== false,
      grade: options.grade,
      term: options.term
    });

    var videos = await getVideos({
      publishedOnly:
        options.publishedOnly !== false,
      grade: options.grade,
      term: options.term
    });

    var quizzes = await getQuizzes({
      publishedOnly:
        options.publishedOnly !== false,
      grade: options.grade,
      term: options.term
    });

    files.forEach(function (file) {
      addUniqueSubject(
        subjects,
        seen,
        file.subject,
        "files"
      );
    });

    videos.forEach(function (video) {
      addUniqueSubject(
        subjects,
        seen,
        video.subject,
        "videos"
      );
    });

    quizzes.forEach(function (quiz) {
      addUniqueSubject(
        subjects,
        seen,
        quiz.subject,
        "quizzes"
      );
    });

    subjects.sort(function (a, b) {
      return a.name.localeCompare(
        b.name,
        "ar"
      );
    });

    return subjects;
  }

  /*
   * ------------------------------------------------------------
   * Unified content
   * ------------------------------------------------------------
   */

  async function getAllContent(options) {
    options = options || {};

    var results = [];

    var files = await getFiles(options);

    files.forEach(function (file) {
      results.push(
        Object.assign({}, file, {
          contentType: "file",
          contentId: getId(file)
        })
      );
    });

    var videos = await getVideos(options);

    videos.forEach(function (video) {
      results.push(
        Object.assign({}, video, {
          contentType: "video",
          contentId: getId(video)
        })
      );
    });

    if (options.includeQuizzes !== false) {
      var quizzes = await getQuizzes(options);

      quizzes.forEach(function (quiz) {
        results.push(
          Object.assign({}, quiz, {
            contentType: "quiz",
            contentId: getId(quiz)
          })
        );
      });
    }

    if (options.type) {
      var wantedType = normalized(options.type);

      results = results.filter(function (item) {
        return normalized(item.contentType) === wantedType;
      });
    }

    if (options.search) {
      var search = normalized(options.search);

      results = results.filter(function (item) {
        return [
          item.title,
          item.name,
          item.description,
          item.subject,
          item.term,
          item.grade
        ].some(function (value) {
          return normalized(value).indexOf(search) !== -1;
        });
      });
    }

    return sortContent(results);
  }

  async function getContentById(contentType, contentId) {
    if (!contentId) {
      return null;
    }

    var type = normalized(contentType);

    if (type === "file" || type === "files") {
      return getFile(contentId);
    }

    if (type === "video" || type === "videos") {
      return getVideo(contentId);
    }

    if (type === "quiz" || type === "quizzes") {
      return getQuiz(contentId);
    }

    return null;
  }

  /*
   * ------------------------------------------------------------
   * Content views
   * ------------------------------------------------------------
   */

  async function recordView(content, extra) {
    if (!content) {
      throw new Error("Content is required.");
    }

    var data = isObject(content)
      ? content
      : {
          contentId: String(content)
        };

    var payload = Object.assign({}, extra || {});

    payload.contentId = firstValue(
      data,
      ["contentId", "id", "_key"],
      payload.contentId || ""
    );

    payload.contentTitle = firstValue(
      data,
      ["contentTitle", "title", "name"],
      payload.contentTitle || ""
    );

    payload.contentType = firstValue(
      data,
      ["contentType", "type"],
      payload.contentType || ""
    );

    if (DB.recordContentView) {
      return DB.recordContentView(payload);
    }

    if (payload.viewedAt == null) {
      payload.viewedAt = new Date().toLocaleString("ar-EG");
    }

    if (payload.viewedAtIso == null) {
      payload.viewedAtIso = new Date().toISOString();
    }

    return DB.push(
      CONTENT_PATHS.contentViews,
      payload
    );
  }

  /*
   * ------------------------------------------------------------
   * Search
   * ------------------------------------------------------------
   */

  async function searchContent(query, options) {
    options = options || {};

    var value = normalized(query);

    if (!value) {
      return getAllContent(options);
    }

    return getAllContent(
      Object.assign({}, options, {
        search: value
      })
    );
  }

  /*
   * ------------------------------------------------------------
   * Section helper for future databases/content areas
   * ------------------------------------------------------------
   */

  function customSection(path) {
    return DB.section(path);
  }

  /*
   * ------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------
   */

  var ContentAPI = {
    version: "1.0.0",
    ready: true,

    paths: Object.freeze(
      Object.assign({}, CONTENT_PATHS)
    ),

    getFiles: getFiles,
    getFile: getFile,

    getVideos: getVideos,
    getVideo: getVideo,

    getVideoType: getVideoType,
    getVideoEmbedUrl: getVideoEmbedUrl,
    getYouTubeId: getYouTubeId,
    getVimeoId: getVimeoId,

    getQuizzes: getQuizzes,
    getQuiz: getQuiz,

    getSubjects: getSubjects,

    getAllContent: getAllContent,
    getContentById: getContentById,

    recordView: recordView,

    search: searchContent,

    customSection: customSection
  };

  window.FirebaseContent = ContentAPI;
  window.FirebaseContentReady =
    Promise.resolve(ContentAPI);

})(window);