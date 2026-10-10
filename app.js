"use strict";

// ==================================================
// 1. API CONFIGURATION — ORIGINAL URL PRESERVED
// ==================================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbx2-noD_jUvgMISjY0ycO7LAuejUb0GwnXKoniJp19unCjNLh4t62mSFe2jTEZ0LqqDow/exec";

// ==================================================
// 2. TEST CONFIGURATION — CLASS 8 NMMS ONLY
// ==================================================

const NMMS_DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9", "Day 10"];
const QUESTIONS_PER_TEST = 30;
const TEST_DURATION_SECONDS = 30 * 60;

// ==================================================
// 3. APPLICATION STATE
// ==================================================

let currentClass = "8";
let currentStudent = "";
let currentSubject = "NMMSN";
let currentDay = "";

let currentQuestions = [];
let answers = [];
let currentIndex = 0;

let testSubmitted = false;
let isLoading = false;
let isAutoSubmitting = false;

let timerInterval = null;
let remainingSeconds = TEST_DURATION_SECONDS;

let lastResultData = null;
let testStartedAt = null;
let testFinishedAt = null;

// ==================================================
// 4. DOM HELPERS
// ==================================================

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

function showElement(id) {
  const element = byId(id);

  if (element) {
    element.classList.remove("hidden");
    element.style.display = "";
  }
}

function hideElement(id) {
  const element = byId(id);

  if (element) {
    element.classList.add("hidden");
    element.style.display = "none";
  }
}

function setDisabled(id, disabled) {
  const element = byId(id);
  if (element) element.disabled = disabled;
}

function showMessage(message) {
  const element = byId("lookupMessage");

  if (element) {
    element.textContent = message;
    element.classList.remove("hidden");
    element.style.display = "";
  } else {
    alert(message);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

// ==================================================
// 5. INITIALIZATION
// ==================================================

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  const classSelect = byId("classSelect");
  const studentSelect = byId("studentName");
  const subjectSelect = byId("subjectSelect");
  const startButton = byId("startBtn");

  if (!classSelect || !studentSelect ||
      !subjectSelect || !startButton) {

    console.error(
      "Required HTML elements are missing. Check index.html."
    );

    alert(
      "Website setup error. Please check index.html and app.js."
    );

    return;
  }

  injectAppStyles();
  configureClass8Only();
  createDaySelector();
  createTimerDisplay();

  classSelect.addEventListener("change", handleClassChange);
  studentSelect.addEventListener("change", updateStartButton);

  subjectSelect.addEventListener("change", () => {
    currentSubject = "NMMSN";
    updateStartButton();
  });

  startButton.addEventListener("click", startTest);

  if (byId("prevBtn")) {
    byId("prevBtn").addEventListener("click", previousQuestion);
  }

  if (byId("nextBtn")) {
    byId("nextBtn").addEventListener("click", nextQuestion);
  }

  if (byId("submitBtn")) {
    byId("submitBtn").addEventListener("click", () => {
      submitTest(false);
    });
  }

  if (byId("newTestBtn")) {
    byId("newTestBtn").addEventListener("click", resetTest);
  }

  handleClassChange();
}

// ==================================================
// 6. CLASS 8 ONLY — REMOVE CLASS 10
// ==================================================

function configureClass8Only() {
  const classSelect = byId("classSelect");

  if (classSelect) {
    classSelect.replaceChildren();

    const option = document.createElement("option");
    option.value = "8";
    option.textContent = "Class 8";

    classSelect.appendChild(option);
    classSelect.value = "8";
    classSelect.disabled = true;
  }

  const subjectSelect = byId("subjectSelect");

  if (subjectSelect) {
    subjectSelect.replaceChildren();

    const option = document.createElement("option");
    option.value = "NMMSN";
    option.textContent = "NMMS";

    subjectSelect.appendChild(option);
    subjectSelect.value = "NMMSN";
    subjectSelect.disabled = true;

    const subjectLabel = subjectSelect.closest("label");

    if (subjectLabel) {
      subjectLabel.style.display = "none";
    }
  }
}

// ==================================================
// 7. DESIGN AND LAYOUT
// ==================================================

function injectAppStyles() {
  if (byId("appInjectedStyles")) return;

  const style = document.createElement("style");
  style.id = "appInjectedStyles";

  style.textContent = `
    .hidden {
      display: none !important;
    }

    #timerPanel {
      background: #f4f8ff;
      border: 2px solid #d5e2f2;
      border-radius: 14px;
      padding: 14px 18px;
      margin: 14px 0;
      box-shadow: 0 3px 12px rgba(20, 50, 80, 0.07);
    }

    #timerDisplay {
      font-size: 28px;
      font-weight: 800;
    }

    #timerWarning {
      margin-top: 6px;
      font-size: 14px;
    }

    #questionText {
      display: block;
      background: #ffffff;
      border: 1px solid #e0e7ef;
      border-radius: 14px;
      padding: 16px 18px;
      margin: 14px 0;
      line-height: 1.8;
      overflow-wrap: anywhere;
    }

    #questionText p {
      margin: 5px 0;
    }

    #options {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin: 14px 0 20px;
    }

    #options label.option {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 10px;
      padding: 14px;
      border: 1px solid #dfe6ee;
      border-radius: 12px;
      background: #ffffff;
      cursor: pointer;
      line-height: 1.6;
      transition: background 0.15s, border-color 0.15s;
    }

    #options label.option:hover {
      border-color: #7da7dc;
      background: #f6faff;
    }

    #options label.option:has(input:checked) {
      border-color: #3978c5;
      background: #eef6ff;
    }

    #options input[type="radio"] {
      margin-top: 5px;
      flex-shrink: 0;
    }

    #prevBtn,
    #nextBtn,
    #submitBtn,
    #newTestBtn,
    #pdfReportBtn {
      border: 0;
      border-radius: 10px;
      padding: 11px 17px;
      font-weight: 700;
      cursor: pointer;
      margin: 5px 5px 5px 0;
    }

    #prevBtn,
    #nextBtn {
      background: #e9eef5;
      color: #203047;
    }

    #submitBtn {
      background: #16834a;
      color: #ffffff;
    }

    #newTestBtn {
      background: #1769aa;
      color: #ffffff;
    }

    #pdfReportBtn {
      background: #743fc1;
      color: #ffffff;
    }

    #prevBtn:disabled,
    #nextBtn:disabled,
    #submitBtn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    #reviewList {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }

    #reviewList .review-item {
      background: #ffffff;
      border: 1px solid #dfe5ec;
      border-radius: 12px;
      padding: 16px;
      margin: 0;
      color: #253247;
      line-height: 1.7;
      overflow-wrap: anywhere;
    }

    #reviewList .review-item h3 {
      margin-top: 0;
    }

    #reviewList .review-item p {
      margin: 8px 0;
    }

    #reviewList .answer-selected-correct,
    #reviewList .answer-correct {
      color: #16834a;
      font-weight: 700;
    }

    #reviewList .answer-selected-wrong {
      color: #c62828;
      font-weight: 700;
    }

    #reviewList .answer-status {
      font-weight: 700;
    }


  `;

  document.head.appendChild(style);
}

// ==================================================
// 8. PRACTICE DAY SELECTOR
// ==================================================

function createDaySelector() {
  if (byId("daySelect")) return;

  const subjectSelect = byId("subjectSelect");
  if (!subjectSelect) return;

  const label = document.createElement("label");

  label.id = "dayLabel";
  label.textContent = "Practice Day / ప్రాక్టీస్ రోజు";

  const select = document.createElement("select");
  select.id = "daySelect";

  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent = "Select Day / రోజు ఎంచుకోండి";

  select.appendChild(placeholder);

  NMMS_DAYS.forEach(day => {
    const option = document.createElement("option");

    option.value = day;
    option.textContent = day;

    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    currentDay = select.value;
    updateStartButton();
  });

  label.appendChild(select);

  const grid = subjectSelect.closest(".grid");

  if (grid) {
    grid.appendChild(label);
  } else if (subjectSelect.parentElement) {
    subjectSelect.parentElement.appendChild(label);
  }
}

// ==================================================
// 9. TIMER — EXACTLY 30 MINUTES
// No instructions popup and no extra 30-second delay.
// ==================================================

function createTimerDisplay() {
  if (byId("timerPanel")) return;

  const panel = document.createElement("div");

  panel.id = "timerPanel";
  panel.style.display = "none";

  const timer = document.createElement("div");

  timer.id = "timerDisplay";
  timer.textContent = "30:00";

  const warning = document.createElement("div");

  warning.id = "timerWarning";
  warning.textContent =
    "⚠️ సమయం పూర్తయితే మీ టెస్ట్ ఆటోమేటిక్‌గా Submit అవుతుంది.";

  panel.append(timer, warning);

  const quizCard = byId("quizCard");

  if (quizCard) {
    quizCard.insertBefore(panel, quizCard.firstChild);
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remaining).padStart(2, "0")
  );
}

function updateTimerDisplay() {
  setText("timerDisplay", formatTime(remainingSeconds));

  const panel = byId("timerPanel");
  const timer = byId("timerDisplay");
  const warning = byId("timerWarning");

  if (!panel || !timer || !warning) return;

  if (remainingSeconds <= 300) {
    panel.style.borderColor = "#d93025";
    timer.style.color = "#d93025";

    warning.textContent =
      "⚠️ చివరి 5 నిమిషాలు! సమయం పూర్తయితే ఆటోమేటిక్‌గా Submit అవుతుంది.";
  } else {
    panel.style.borderColor = "#d5e2f2";
    timer.style.color = "";

    warning.textContent =
      "⚠️ సమయం పూర్తయితే మీ టెస్ట్ ఆటోమేటిక్‌గా Submit అవుతుంది.";
  }
}

function startTimer() {
  stopTimer();

  remainingSeconds = TEST_DURATION_SECONDS;

  const panel = byId("timerPanel");

  if (panel) {
    panel.style.display = "";
  }

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (testSubmitted) {
      stopTimer();
      return;
    }

    remainingSeconds = Math.max(0, remainingSeconds - 1);

    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      stopTimer();
      submitTest(true);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ==================================================
// END OF PART 1
// Paste PART 2 immediately below this line.
// ==================================================
// ==================================================
// 10. HANDLE CLASS CHANGE — CLASS 8 ONLY
// ==================================================

function handleClassChange() {
  const classSelect = byId("classSelect");
  const subjectSelect = byId("subjectSelect");
  const studentSelect = byId("studentName");
  const daySelect = byId("daySelect");

  if (!classSelect || !subjectSelect || !studentSelect) return;

  // Only Class 8 NMMS is available.
  currentClass = "8";
  currentStudent = "";
  currentSubject = "NMMSN";
  currentDay = "";

  classSelect.value = "8";
  subjectSelect.value = "NMMSN";

  // Reset student dropdown.
  studentSelect.replaceChildren();

  const studentPlaceholder = document.createElement("option");
  studentPlaceholder.value = "";
  studentPlaceholder.textContent = "Getting your names...";

  studentSelect.appendChild(studentPlaceholder);
  studentSelect.disabled = true;

  // Show practice day selector.
  const dayLabel = byId("dayLabel");

  if (dayLabel) {
    dayLabel.style.display = "";
  }

  if (daySelect) {
    daySelect.value = "";
  }

  hideElement("lookupMessage");
  setText("lookupMessage", "");

  updateStartButton();

  // Keep the existing Google Sheets student-loading method.
  loadStudents("8");
}


// ==================================================
// 11. LOAD STUDENTS FROM GOOGLE SHEETS
// Existing API connection preserved.
// ==================================================

async function loadStudents(cls) {
  const studentSelect = byId("studentName");

  if (!studentSelect) return;

  studentSelect.disabled = true;

  showMessage("Getting your names...");

  try {
    const url =
      `${API_URL}?action=students` +
      `&class=${encodeURIComponent(cls)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.message || "Student lookup failed");
    }

    studentSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";

    placeholder.textContent =
      data.students && data.students.length
        ? "Select your name / మీ పేరు ఎంచుకోండి"
        : "No students found";

    studentSelect.appendChild(placeholder);

    (data.students || []).forEach(name => {
      const option = document.createElement("option");

      option.value = name;
      option.textContent = name;

      studentSelect.appendChild(option);
    });

    studentSelect.disabled =
      !data.students || data.students.length === 0;

    showMessage(
      data.students && data.students.length
        ? `${data.students.length} students loaded.`
        : "No students found for Class 8."
    );

  } catch (error) {
    console.error("Student loading error:", error);

    studentSelect.replaceChildren();

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Unable to load students";

    studentSelect.appendChild(option);
    studentSelect.disabled = true;

    showMessage(
      "Could not load students. Please check the API deployment."
    );
  }

  updateStartButton();
}


// ==================================================
// 12. START BUTTON VALIDATION
// ==================================================

function updateStartButton() {
  const studentSelect = byId("studentName");
  const daySelect = byId("daySelect");

  if (!studentSelect) return;

  currentClass = "8";
  currentSubject = "NMMSN";
  currentStudent = studentSelect.value;
  currentDay = daySelect ? daySelect.value : "";

  const canStart =
    Boolean(currentStudent) &&
    Boolean(currentDay) &&
    !isLoading;

  setDisabled("startBtn", !canStart);
}


// ==================================================
// 13. START TEST — NO INSTRUCTIONS POPUP
// ==================================================

async function startTest() {
  if (isLoading || testSubmitted) return;

  updateStartButton();

  if (!currentStudent) {
    showMessage("Please select your name / దయచేసి మీ పేరు ఎంచుకోండి.");
    return;
  }

  if (!currentDay) {
    showMessage("Please select an NMMS practice day.");
    return;
  }

  isLoading = true;

  setDisabled("startBtn", true);
  setText("startBtn", "Loading questions...");

  try {
    // Keep the existing Apps Script endpoint and parameters.
    const url =
      `${API_URL}?action=questions` +
      `&class=8` +
      `&subject=NMMSN` +
      `&day=${encodeURIComponent(currentDay)}` +
      `&name=${encodeURIComponent(currentStudent)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.message || "Unable to load questions");
    }

    if (
      !Array.isArray(data.questions) ||
      data.questions.length === 0
    ) {
      throw new Error("No questions were returned by the server.");
    }

    if (data.questions.length !== QUESTIONS_PER_TEST) {
      throw new Error(
        `NMMS test must contain ${QUESTIONS_PER_TEST} questions. ` +
        `The server returned ${data.questions.length}.`
      );
    }

    // Initialize a fresh attempt.
    currentQuestions = data.questions;
    answers = new Array(currentQuestions.length).fill(null);
    currentIndex = 0;

    testSubmitted = false;
    isAutoSubmitting = false;
    lastResultData = null;

    testStartedAt = new Date();
    testFinishedAt = null;

    setText(
      "testLabel",
      `Class 8 • NMMS • ${currentDay} • ${currentStudent}`
    );

    document.body.classList.add("quiz-active");
    hideElement("setupCard");
    hideElement("resultCard");
    showElement("quizCard");

    // Hide Submit until the final question.
    const submitButton = byId("submitBtn");

    if (submitButton) {
      submitButton.classList.add("hidden");
      submitButton.style.display = "none";
      submitButton.disabled = false;
    }

    // Start the 30-minute timer immediately.
    startTimer();

    renderQuestion();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {
    console.error("Start test error:", error);

    showMessage(error.message || "Could not start the test.");

  } finally {
    isLoading = false;

    setText("startBtn", "Start Test / పరీక్ష ప్రారంభించు");

    updateStartButton();
    updateNavigation();
  }
}


// ==================================================
// 14. DISPLAY QUESTION AND OPTIONS
// ==================================================

function renderQuestion() {
  if (!currentQuestions.length) return;

  const question = currentQuestions[currentIndex];

  setText(
    "questionCounter",
    `Question ${currentIndex + 1} of ${currentQuestions.length}`
  );

  // Question text: Telugu and English.
  const questionText = byId("questionText");

  if (questionText) {
    questionText.replaceChildren();

    const telugu = document.createElement("p");
    telugu.className = "question-te";
    telugu.textContent = question.questionTE || "";

    const english = document.createElement("p");
    english.className = "question-en";
    english.textContent = question.questionEN || "";

    // Keep the question panel fixed-size; gently reduce type size for
    // unusually long bilingual questions rather than adding page scrolling.
    const combinedQuestionLength =
      String(question.questionTE || "").length +
      String(question.questionEN || "").length;

    const questionFontSize =
      combinedQuestionLength > 300 ? "0.76rem" :
      combinedQuestionLength > 220 ? "0.82rem" :
      combinedQuestionLength > 150 ? "0.9rem" :
      "1rem";

    telugu.style.fontSize = questionFontSize;
    english.style.fontSize = questionFontSize;

    questionText.append(telugu, english);
  }

  // Answer options.
  const optionsContainer = byId("options");

  if (optionsContainer) {
    optionsContainer.replaceChildren();

    (question.options || []).forEach((optionText, index) => {
      const label = document.createElement("label");
      label.className = "option";

      const radio = document.createElement("input");

      radio.type = "radio";
      radio.name = "answer";
      radio.value = String(index);
      radio.checked = answers[currentIndex] === index;
      radio.disabled = testSubmitted;

      radio.addEventListener("change", () => {
        if (testSubmitted) return;

        answers[currentIndex] = index;

        updateNavigation();
      });

      const text = document.createElement("span");

      text.textContent =
        `${String.fromCharCode(65 + index)}. ${optionText}`;

      const optionLength = String(optionText || "").length;
      text.style.fontSize =
        optionLength > 125 ? "0.68rem" :
        optionLength > 95 ? "0.72rem" :
        optionLength > 65 ? "0.78rem" :
        optionLength > 40 ? "0.84rem" :
        "0.92rem";

      label.append(radio, text);
      optionsContainer.appendChild(label);
    });
  }

  updateProgress();
  updateNavigation();
}


// ==================================================
// END OF PART 2
// Paste PART 3 immediately below this line.
// ==================================================
// ==================================================
// PART 3/4 — NAVIGATION AND SUBMIT TEST
// ==================================================

function updateProgress() {
  const total = currentQuestions.length;
  const answeredCount = answers.filter(answer => answer !== null).length;

  setText("progressText", `${answeredCount} / ${total} answered`);

  const progressBar = byId("progressBar");
  if (progressBar) {
    const percentage = total > 0
      ? (answeredCount / total) * 100
      : 0;

    progressBar.style.width = `${percentage}%`;
  }
}


// Previous, Next and Submit button visibility
function updateNavigation() {
  const total = currentQuestions.length;

  const prevBtn = byId("prevBtn");
  const nextBtn = byId("nextBtn");
  const submitBtn = byId("submitBtn");

  if (!total) {
    setDisabled("prevBtn", true);
    setDisabled("nextBtn", true);
    hideElement("submitBtn");
    return;
  }

  // Previous button
  setDisabled(
    "prevBtn",
    currentIndex === 0 || isLoading || testSubmitted
  );

  // Next button
  setDisabled(
    "nextBtn",
    currentIndex === total - 1 || isLoading || testSubmitted
  );

  // Submit button must appear only on the last question
  if (currentIndex === total - 1 && !testSubmitted) {
    showElement("submitBtn");
  } else {
    hideElement("submitBtn");
  }

  setDisabled("submitBtn", isLoading || testSubmitted);

  if (submitBtn) {
    submitBtn.textContent = isLoading
      ? "Submitting..."
      : "Submit Test";
  }

  updateProgress();
}


// Go to the previous question
function previousQuestion() {
  if (
    testSubmitted ||
    isLoading ||
    currentIndex <= 0
  ) {
    return;
  }

  currentIndex--;
  renderQuestion();
  updateNavigation();
}


// Go to the next question
function nextQuestion() {
  if (
    testSubmitted ||
    isLoading ||
    currentIndex >= currentQuestions.length - 1
  ) {
    return;
  }

  currentIndex++;
  renderQuestion();
  updateNavigation();
}


// Submit test to Google Apps Script
async function submitTest(autoSubmit = false) {
  if (
    testSubmitted ||
    isLoading ||
    currentQuestions.length === 0
  ) {
    return;
  }

  // Confirm only for a manual submission.
  // Automatic timer submission must not wait for confirmation.
  if (!autoSubmit) {
    const confirmed = window.confirm(
      "Are you sure you want to submit the test?"
    );

    if (!confirmed) {
      return;
    }
  }

  isLoading = true;
  isAutoSubmitting = autoSubmit;

  updateNavigation();

  // Stop the timer immediately when submission begins.
  stopTimer();

  showMessage(
    autoSubmit
      ? "Time is over. Submitting your test..."
      : "Submitting your test..."
  );

  try {
    const submittedAnswers = currentQuestions.map(
      (question, index) => ({
        questionID: question.id,
        selected:
          answers[index] === null ||
          answers[index] === undefined
            ? ""
            : question.options[answers[index]]
      })
    );

    const payload = {
      action: "submit",
      class: currentClass,
      name: currentStudent,
      subject: currentSubject,
      day: currentDay,
      answers: submittedAnswers
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Server returned status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.answers)) {
      throw new Error(
        "The server returned an invalid result."
      );
    }

    // Mark the test as submitted before showing results.
    testSubmitted = true;
    testFinishedAt = new Date();
    lastResultData = data;

    displayResults(data);

    hideElement("lookupMessage");

  } catch (error) {
    console.error("Submit test error:", error);

    // Allow the student to try submitting again.
    isLoading = false;
    isAutoSubmitting = false;

    showMessage(
      autoSubmit
        ? "Automatic submission failed. Please try Submit Test again."
        : "Submission failed. Please check your connection and try again."
    );

    updateNavigation();

  } finally {
    isLoading = false;
    isAutoSubmitting = false;

    updateNavigation();
  }
}


// ==================================================
// END OF PART 3
// Paste PART 4 immediately below this line.
// ==================================================
// ==================================================
// PART 4/4 — RESULTS, PDF REPORT AND RESET
// ==================================================


// Display test results
function displayResults(data) {
  stopTimer();

  document.body.classList.remove("quiz-active");
  hideElement("quizCard");
  showElement("resultCard");

  const resultCard = byId("resultCard");
  const newTestButton = byId("newTestBtn");

  // Move Take Another Test button to the top of results.
  if (resultCard && newTestButton) {
    newTestButton.textContent = "Take Another Test / మరో పరీక్ష";
    resultCard.insertBefore(newTestButton, resultCard.firstChild);
    showElement("newTestBtn");
  }

  const score = Number(data.score) || 0;
  const total = Number(data.total) || currentQuestions.length;
  const percentage = total > 0
    ? ((score / total) * 100).toFixed(1)
    : "0.0";

  setText("score", `${score} / ${total} (${percentage}%)`);

  const saveStatus = byId("saveStatus");
  if (saveStatus) {
    saveStatus.textContent =
      data.message || "Your result has been submitted.";
  }

  // Add PDF report button beside Take Another Test.
  createPDFButton();

  const reviewList = byId("reviewList");

  if (!reviewList) {
    return;
  }

  reviewList.innerHTML = "";

  const resultAnswers = Array.isArray(data.answers)
    ? data.answers
    : [];

  resultAnswers.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "review-item";

    // Keep the question card neutral.
    card.style.background = "#ffffff";
    card.style.border = "1px solid #d7dee8";
    card.style.borderRadius = "10px";
    card.style.padding = "16px";
    card.style.marginBottom = "14px";

    const questionHeading = document.createElement("h3");
    questionHeading.textContent =
      `Question ${index + 1}`;

    questionHeading.style.marginTop = "0";
    questionHeading.style.marginBottom = "10px";

    card.appendChild(questionHeading);

    const questionText = document.createElement("div");
    questionText.style.marginBottom = "12px";
    questionText.style.whiteSpace = "pre-wrap";

    const questionTE = item.questionTE || "";
    const questionEN = item.questionEN || "";

    questionText.textContent =
      questionTE && questionEN
        ? `${questionTE}\n${questionEN}`
        : questionTE || questionEN || "Question";

    card.appendChild(questionText);

    const selected = item.selected == null
      ? ""
      : String(item.selected);

    const correct = item.correct == null
      ? ""
      : String(item.correct);

    const isCorrect =
      item.isCorrect === true ||
      String(item.isCorrect).toLowerCase() === "true";

    const selectedLine = document.createElement("p");
    selectedLine.style.margin = "6px 0";

    const selectedLabel = document.createElement("strong");
    selectedLabel.textContent = "Your answer: ";

    const selectedText = document.createElement("span");
    selectedText.textContent = selected || "Not answered";

    if (selected) {
      if (isCorrect) {
        selectedText.className = "answer-selected-correct";
        selectedText.style.color = "#16803c";
        selectedText.style.fontWeight = "700";
      } else {
        selectedText.className = "answer-selected-wrong";
        selectedText.style.color = "#c62828";
        selectedText.style.fontWeight = "700";
      }
    }

    selectedLine.appendChild(selectedLabel);
    selectedLine.appendChild(selectedText);
    card.appendChild(selectedLine);

    const correctLine = document.createElement("p");
    correctLine.style.margin = "6px 0";

    const correctLabel = document.createElement("strong");
    correctLabel.textContent = "Correct answer: ";

    const correctText = document.createElement("span");
    correctText.textContent = correct || "Not provided";
    correctText.style.color = "#16803c";
    correctText.style.fontWeight = "700";
    correctText.className = "answer-correct";

    correctLine.appendChild(correctLabel);
    correctLine.appendChild(correctText);
    card.appendChild(correctLine);

    const explanationTE = item.explanationTE || "";
    const explanationEN = item.explanationEN || "";

    if (explanationTE || explanationEN) {
      const explanation = document.createElement("p");
      explanation.style.marginTop = "12px";
      explanation.style.whiteSpace = "pre-wrap";

      const explanationLabel = document.createElement("strong");
      explanationLabel.textContent = "Explanation: ";

      const explanationText = document.createElement("span");
      explanationText.textContent =
        explanationTE && explanationEN
          ? `${explanationTE}\n${explanationEN}`
          : explanationTE || explanationEN;

      explanation.appendChild(explanationLabel);
      explanation.appendChild(explanationText);
      card.appendChild(explanation);
    }

    reviewList.appendChild(card);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// Create the PDF report button
function createPDFButton() {
  const resultCard = byId("resultCard");
  const newTestButton = byId("newTestBtn");

  if (!resultCard) {
    return;
  }

  let pdfButton = byId("pdfReportBtn");

  if (!pdfButton) {
    pdfButton = document.createElement("button");
    pdfButton.id = "pdfReportBtn";
    pdfButton.type = "button";
    pdfButton.textContent = "Download / Print PDF Report";

    pdfButton.style.margin = "8px";
    pdfButton.style.padding = "10px 16px";
    pdfButton.style.borderRadius = "8px";
    pdfButton.style.border = "none";
    pdfButton.style.cursor = "pointer";

    pdfButton.addEventListener("click", downloadPDFReport);
  }

  // Place the PDF button immediately after Take Another Test.
  if (
    newTestButton &&
    newTestButton.parentElement === resultCard
  ) {
    if (newTestButton.nextElementSibling !== pdfButton) {
      resultCard.insertBefore(
        pdfButton,
        newTestButton.nextElementSibling
      );
    }
  } else {
    resultCard.insertBefore(pdfButton, resultCard.firstChild);
  }

  showElement("pdfReportBtn");
}


// Generate a printable report
function downloadPDFReport() {
  if (!lastResultData) {
    window.alert("No result is available to print.");
    return;
  }

  const data = lastResultData;
  const resultAnswers = Array.isArray(data.answers)
    ? data.answers
    : [];

  const score = Number(data.score) || 0;
  const total = Number(data.total) || resultAnswers.length;
  const percentage = total > 0
    ? ((score / total) * 100).toFixed(1)
    : "0.0";

  const finishedAt = testFinishedAt
    ? testFinishedAt.toLocaleString()
    : new Date().toLocaleString();

  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    window.alert(
      "The report window was blocked. Allow pop-ups and try again."
    );
    return;
  }

  const reportQuestions = resultAnswers.map((item, index) => {
    const isCorrect =
      item.isCorrect === true ||
      String(item.isCorrect).toLowerCase() === "true";

    const selected = item.selected == null
      ? ""
      : String(item.selected);

    const correct = item.correct == null
      ? ""
      : String(item.correct);

    const questionText = [
      item.questionTE || "",
      item.questionEN || ""
    ].filter(Boolean).join("\n");

    const explanation = [
      item.explanationTE || "",
      item.explanationEN || ""
    ].filter(Boolean).join("\n");

    const selectedColor = !selected
      ? "#333333"
      : isCorrect
        ? "#16803c"
        : "#c62828";

    return `
      <section class="question">
        <h3>Question ${index + 1}</h3>

        <p class="multiline">${escapeHTML(questionText)}</p>

        <p>
          <strong>Your answer:</strong>
          <span style="color:${selectedColor};font-weight:bold">
            ${escapeHTML(selected || "Not answered")}
          </span>
        </p>

        <p>
          <strong>Correct answer:</strong>
          <span style="color:#16803c;font-weight:bold">
            ${escapeHTML(correct || "Not provided")}
          </span>
        </p>

        ${
          explanation
            ? `<p class="multiline"><strong>Explanation:</strong>\n${escapeHTML(explanation)}</p>`
            : ""
        }
      </section>
    `;
  }).join("");

  const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>NMMS Test Report</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          color: #222;
          margin: 24px;
          line-height: 1.5;
        }

        h1, h2 {
          margin-bottom: 8px;
        }

        .summary {
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 14px;
          margin: 18px 0;
        }

        * {
          box-sizing: border-box;
        }

        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        body {
          font-family: Arial, "Noto Sans Telugu", sans-serif;
          color: #222;
          margin: 0;
          line-height: 1.35;
          overflow: visible;
        }

        .summary {
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 10px 12px;
          margin: 12px 0;
          break-inside: avoid-page;
          page-break-inside: avoid;
        }

        .question {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px 12px;
          margin: 8px 0;
          /* A question/explanation can exceed one page; do not force it onto a blank page. */
          break-inside: auto;
          page-break-inside: auto;
          overflow: visible;
        }

        .question h3 {
          margin: 0 0 6px;
          break-after: avoid-page;
          page-break-after: avoid;
        }

        .question p {
          margin: 5px 0;
          overflow-wrap: anywhere;
        }

        .multiline {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .print-button {
          padding: 10px 18px;
          margin-bottom: 18px;
          cursor: pointer;
        }

        @media print {
          html, body {
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            font-size: 9.5pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-button {
            display: none !important;
          }

          h1 {
            font-size: 18pt;
            margin: 0 0 8px;
          }

          h2 {
            font-size: 13pt;
            margin: 10px 0 6px;
          }

          .summary p {
            margin: 4px 0;
          }

          .question {
            margin: 6px 0;
            padding: 8px 10px;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .question h3 {
            font-size: 10pt;
          }
        }
      </style>
    </head>

    <body>
      <button
        class="print-button"
        onclick="window.print()"
      >
        Print / Save as PDF
      </button>

      <h1>NMMS Practice Test Report</h1>

      <div class="summary">
        <p><strong>Class:</strong> ${escapeHTML(currentClass)}</p>
        <p><strong>Student:</strong> ${escapeHTML(currentStudent)}</p>
        <p><strong>Subject:</strong> ${escapeHTML(currentSubject)}</p>
        <p><strong>Test:</strong> ${escapeHTML(currentDay)}</p>
        <p><strong>Completed:</strong> ${escapeHTML(finishedAt)}</p>
        <p><strong>Score:</strong> ${score} / ${total}</p>
        <p><strong>Percentage:</strong> ${percentage}%</p>
      </div>

      <h2>Answer Review</h2>

      ${reportQuestions}
    </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(reportHTML);
  reportWindow.document.close();

  reportWindow.focus();
}


// Reset the current test and return to setup
function resetTest() {
  stopTimer();

  document.body.classList.remove("quiz-active");

  currentClass = "8";
  currentStudent = "";
  currentSubject = "NMMSN";
  currentDay = "";

  currentQuestions = [];
  answers = [];
  currentIndex = 0;

  testSubmitted = false;
  isLoading = false;
  isAutoSubmitting = false;

  remainingSeconds = TEST_DURATION_SECONDS;
  lastResultData = null;
  testStartedAt = null;
  testFinishedAt = null;

  hideElement("quizCard");
  hideElement("resultCard");
  hideElement("timerPanel");
  hideElement("lookupMessage");

  showElement("setupCard");

  setText("lookupMessage", "");
  setText("questionCounter", "");
  setText("questionText", "");
  setText("progressText", "0 / 0 answered");
  setText("progressBar", "");

  const progressBar = byId("progressBar");
  if (progressBar) {
    progressBar.style.width = "0%";
  }

  const options = byId("options");
  if (options) {
    options.innerHTML = "";
  }

  const reviewList = byId("reviewList");
  if (reviewList) {
    reviewList.innerHTML = "";
  }

  setText("score", "");
  setText("saveStatus", "");

  setText("timerDisplay", "30:00");
  hideElement("timerWarning");

  hideElement("submitBtn");

  const pdfButton = byId("pdfReportBtn");
  if (pdfButton) {
    hideElement("pdfReportBtn");
  }

  const newTestButton = byId("newTestBtn");
  if (newTestButton) {
    newTestButton.textContent = "Take Another Test / మరో పరీక్ష";
  }

  updateNavigation();
  handleClassChange();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ==================================================
// END OF PART 4
// app.js code ends here.
// ==================================================