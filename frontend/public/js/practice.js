// Nishkarsh — Step 3: student practice flow (topic -> question list -> attempt)

let currentUser = null;
let currentTopics = [];
let currentQuestion = null;
let questionStartTime = null;

async function getJSON(url, opts = {}) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
async function postJSON(url, body) {
  return getJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
async function patchJSON(url, body) {
  return getJSON(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function appShell(activeTab, innerHTML) {
  const tabs = ['Practice', 'Dashboard', 'Progress Report'];
  document.body.innerHTML = `
    <div class="app-shell">
      <header class="app-nav">
        <div class="nav-brand">Nishkarsh</div>
        <nav class="nav-tabs">
          ${tabs.map(t => `<span class="nav-tab ${t === activeTab ? 'active' : ''}" data-tab="${t}">${t}</span>`).join('')}
        </nav>
        <div class="nav-user">${currentUser ? currentUser.name : ''}</div>
      </header>
      <main class="app-main">${innerHTML}</main>
    </div>
  `;
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.addEventListener('click', () => {
      const tab = el.dataset.tab;
      if (tab === 'Practice') renderTopicList();
      else renderComingSoon(tab);
    });
  });
}

function renderComingSoon(tab) {
  appShell(tab, `
    <div class="placeholder-panel">
      <p class="placeholder-title">${tab}</p>
      <p class="placeholder-sub">Coming in a later step — accuracy stats, streaks, and Concepts to Revisit will live here.</p>
    </div>
  `);
}

// ---------- Topic list ----------
async function renderTopicList() {
  appShell('Practice', `<p class="loading">Loading topics…</p>`);
  const { subjects } = await getJSON('/api/subjects');
  const physics = subjects[0];
  const { chapters } = await getJSON(`/api/chapters?subject_id=${physics.id}`);
  const kinematics = chapters.find(c => c.name === 'Kinematics');
  const { topics } = await getJSON(`/api/topics?chapter_id=${kinematics.id}`);
  currentTopics = topics;

  const cards = await Promise.all(topics.map(async (t) => {
    const { questions } = await getJSON(`/api/questions?topic_id=${t.id}`);
    return { topic: t, count: questions.length };
  }));

  appShell('Practice', `
    <p class="crumb">Physics <span class="crumb-sep">›</span> Kinematics</p>
    <h1 class="page-title">Choose a topic</h1>
    <div class="topic-grid">
      ${cards.map(c => `
        <button class="topic-card" data-topic-id="${c.topic.id}">
          <span class="topic-name">${c.topic.name}</span>
          <span class="topic-count">${c.count} questions</span>
        </button>
      `).join('')}
    </div>
  `);

  document.querySelectorAll('.topic-card').forEach(el => {
    el.addEventListener('click', () => renderQuestionList(el.dataset.topicId));
  });
}

// ---------- Question list ----------
async function renderQuestionList(topicId) {
  appShell('Practice', `<p class="loading">Loading questions…</p>`);
  const { questions } = await getJSON(`/api/questions?topic_id=${topicId}`);
  const topic = currentTopics.find(t => String(t.id) === String(topicId));

  appShell('Practice', `
    <p class="crumb"><span class="crumb-link" id="back-to-topics">Kinematics</span> <span class="crumb-sep">›</span> ${topic.name}</p>
    <h1 class="page-title">${topic.name}</h1>
    <div class="question-list">
      ${questions.map(q => `
        <button class="question-row" data-question-id="${q.id}">
          <span class="chip chip-type">${q.question_type}</span>
          <span class="chip chip-diff chip-diff-${q.difficulty.toLowerCase()}">${q.difficulty}</span>
          <span class="q-core-topic">${q.core_topic}</span>
        </button>
      `).join('')}
    </div>
  `);

  document.getElementById('back-to-topics').addEventListener('click', renderTopicList);
  document.querySelectorAll('.question-row').forEach(el => {
    el.addEventListener('click', () => renderQuestionAttempt(el.dataset.questionId, topicId));
  });
}

// ---------- Question attempt ----------
async function renderQuestionAttempt(questionId, topicId) {
  appShell('Practice', `<p class="loading">Loading question…</p>`);
  const { question } = await getJSON(`/api/questions/${questionId}`);
  const progress = await getJSON(`/api/questions/${questionId}/progress`);
  currentQuestion = question;
  questionStartTime = Date.now();

  const optionsHTML = question.options
    ? question.options.map((opt, i) => `
        <label class="option-row">
          <input type="radio" name="answer" value="${opt.replace(/"/g, '&quot;')}">
          <span>${String.fromCharCode(65 + i)}. ${opt}</span>
        </label>
      `).join('')
    : `<input type="text" id="numeric-answer" class="numeric-input" placeholder="Enter your answer">`;

  appShell('Practice', `
    <p class="crumb"><span class="crumb-link" id="back-to-list">Back to questions</span></p>

    <div class="question-card">
      <div class="chip-row">
        <span class="chip chip-type">${question.question_type}${question.year ? ' · ' + question.year : ''}${question.exam_type ? ' · ' + question.exam_type : ''}</span>
        <span class="chip chip-diff chip-diff-${question.difficulty.toLowerCase()}">${question.difficulty}</span>
        ${question.prerequisites.map(p => `<span class="chip chip-prereq">${p}</span>`).join('')}
      </div>

      <p class="question-text">${question.question_text}</p>

      <div class="options" id="options-container">${optionsHTML}</div>

      <div class="hints-panel" id="hints-panel"></div>

      <p class="form-feedback" id="attempt-feedback" hidden></p>

      <div class="action-row">
        <button class="btn-hint" id="hint-btn">Need a hint?</button>
        <button class="btn-primary" id="submit-btn">Submit</button>
      </div>

      <div class="post-attempt" id="post-attempt" hidden></div>
    </div>
  `);

  renderHintsPanel(progress.hint_1, progress.hint_2);
  updateHintButton(progress.hints_revealed);

  document.getElementById('back-to-list').addEventListener('click', () => renderQuestionList(topicId));
  document.getElementById('hint-btn').addEventListener('click', () => revealHintClicked(questionId));
  document.getElementById('submit-btn').addEventListener('click', () => submitAttempt(topicId));
}

function renderHintsPanel(hint1, hint2) {
  const panel = document.getElementById('hints-panel');
  let html = '';
  if (hint1) html += `<div class="hint-block"><span class="hint-label">Hint 1</span><p>${hint1}</p></div>`;
  if (hint2) html += `<div class="hint-block"><span class="hint-label">Hint 2</span><p>${hint2}</p></div>`;
  panel.innerHTML = html;
}

function updateHintButton(hintsRevealed) {
  const btn = document.getElementById('hint-btn');
  if (hintsRevealed >= 2) {
    btn.textContent = 'Both hints unlocked';
    btn.disabled = true;
  } else if (hintsRevealed === 1) {
    btn.textContent = 'Show hint 2';
  } else {
    btn.textContent = 'Need a hint?';
  }
}

async function revealHintClicked(questionId) {
  const btn = document.getElementById('hint-btn');
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Loading…';
  try {
    const result = await postJSON(`/api/questions/${questionId}/reveal-hint`, {});
    renderHintsPanel(result.hint_1, result.hint_2);
    updateHintButton(result.hints_revealed);
  } catch (err) {
    showFeedback(err.message, 'warn');
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function submitAttempt(topicId) {
  const feedback = document.getElementById('attempt-feedback');
  feedback.hidden = true;

  let selected;
  if (currentQuestion.options) {
    const checked = document.querySelector('input[name="answer"]:checked');
    if (!checked) { showFeedback('Select an option first.', 'warn'); return; }
    selected = checked.value;
  } else {
    selected = document.getElementById('numeric-answer').value.trim();
    if (!selected) { showFeedback('Enter an answer first.', 'warn'); return; }
  }

  const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking…';

  try {
    const result = await postJSON('/api/attempts', {
      question_id: currentQuestion.id,
      selected_answer: selected,
      time_taken_seconds: timeTaken,
    });
    renderPostAttempt(result, topicId);
  } catch (err) {
    showFeedback(err.message, 'warn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

function showFeedback(msg, kind) {
  const el = document.getElementById('attempt-feedback');
  el.textContent = msg;
  el.className = 'form-feedback ' + (kind === 'warn' ? 'feedback-warn' : '');
  el.hidden = false;
}

function renderPostAttempt(result, topicId) {
  document.getElementById('options-container').querySelectorAll('input').forEach(i => i.disabled = true);
  document.getElementById('submit-btn').hidden = true;

  const panel = document.getElementById('post-attempt');
  panel.hidden = false;

  if (result.is_correct) {
    document.getElementById('hint-btn').hidden = true;
    panel.innerHTML = `
      <p class="result-line result-correct">Correct.</p>
      <p class="solution-text">${result.full_solution}</p>
      ${masteryButtonsHTML(result.attempt_id)}
      <button class="btn-primary" id="next-question-btn">Back to questions</button>
    `;
  } else {
    // Wrong-answer-triggered hint state machine: reflect whatever the
    // backend just auto-revealed (Hint 1 / Hint 2 / Root Cause Isolation),
    // sharing the same hints panel as the voluntary "Need a hint?" path.
    if (result.hint_state) {
      renderHintsPanel(result.hint_state.hint_1, result.hint_state.hint_2);
      updateHintButton(result.hint_state.hints_revealed);
    }

    let rootCauseHTML = '';
    if (result.hint_state && result.hint_state.root_cause_active) {
      const remedial = result.hint_state.remedial_questions || [];
      rootCauseHTML = `
        <div class="root-cause-panel">
          <p class="root-cause-title">Let's isolate the actual gap here.</p>
          ${remedial.length > 0
            ? `<p class="root-cause-sub">Try these ${remedial.length} easier questions on the same prerequisite first:</p>
               <div class="remedial-list">
                 ${remedial.map(r => `<button class="remedial-row" data-question-id="${r.id}">${r.core_topic}</button>`).join('')}
               </div>`
            : `<p class="root-cause-sub">This prerequisite doesn't have any easier practice questions in the bank yet — that's a content gap, not a you problem. Go ahead and check the full solution below.</p>`
          }
        </div>
      `;
    }

    panel.innerHTML = `
      <p class="result-line result-wrong">Not quite — correct answer: ${result.correct_answer}</p>
      ${rootCauseHTML}
      <button class="btn-secondary" id="reveal-btn">Show full solution</button>
      <div id="solution-slot"></div>
    `;

    if (rootCauseHTML) {
      document.querySelectorAll('.remedial-row').forEach(btn => {
        btn.addEventListener('click', () => renderQuestionAttempt(btn.dataset.questionId, topicId));
      });
    }

    document.getElementById('reveal-btn').addEventListener('click', async () => {
      try {
        const { full_solution } = await postJSON(`/api/attempts/${result.attempt_id}/reveal-solution`, {});
        document.getElementById('solution-slot').innerHTML = `
          <p class="solution-text">${full_solution}</p>
          ${masteryButtonsHTML(result.attempt_id)}
          <button class="btn-primary" id="next-question-btn">Back to questions</button>
        `;
        wireNextButton(topicId);
        wireMasteryButtons(result.attempt_id);
      } catch (err) {
        document.getElementById('solution-slot').innerHTML = `<p class="form-feedback feedback-warn">${err.message}</p>`;
      }
    });
  }

  wireNextButton(topicId);
  wireMasteryButtons(result.attempt_id);
}

function masteryButtonsHTML(attemptId) {
  return `
    <div class="mastery-row">
      <span class="mastery-label">Mark this question:</span>
      <button class="btn-mastery" data-flag="Mastered" data-attempt="${attemptId}">Mastered</button>
      <button class="btn-mastery" data-flag="Needs Practice" data-attempt="${attemptId}">Needs Practice</button>
    </div>
  `;
}

function wireMasteryButtons(attemptId) {
  document.querySelectorAll('.btn-mastery').forEach(btn => {
    btn.addEventListener('click', async () => {
      await patchJSON(`/api/attempts/${btn.dataset.attempt}/mastery`, { mastered_flag: btn.dataset.flag });
      document.querySelectorAll('.btn-mastery').forEach(b => b.classList.remove('btn-mastery-selected'));
      btn.classList.add('btn-mastery-selected');
    });
  });
}

function wireNextButton(topicId) {
  const btn = document.getElementById('next-question-btn');
  if (btn) btn.addEventListener('click', () => renderQuestionList(topicId));
}

// Entry point called from auth.js after successful login/signup
function onAuthSuccess(user) {
  currentUser = user;
  renderTopicList();
}
