// NISHKARSH — Step 2 seed data
// Physics subject, all 6 chapters (per spec), and full Kinematics content:
// 3 sub-topics, 18 questions with both hint levels + full solutions filled in.
//
// IMPORTANT — read this before treating any of these as verified PYQs:
// These 18 questions are written by me, in authentic JEE style and difficulty,
// covering the standard trap-question archetypes (rain-man, river-boat,
// v-t graphs, projectile on an incline, etc). I do NOT have reliable
// year/exam sourcing for each one from memory, and the spec is explicit
// that nothing gets labeled "PYQ" without real, verifiable sourcing — so
// every one of these is tagged question_type = 'Practice', not PYQ.
// Use the admin Bulk Import flow (Step 7) to import real, verified PYQ
// PDFs and they'll sit alongside these with the correct PYQ tag + year.

const db = require('./index');

const insertSubject = db.prepare(
  `INSERT INTO subjects (name, code, sort_order) VALUES (?, ?, ?)`
);
const insertChapter = db.prepare(
  `INSERT INTO chapters (subject_id, name, sort_order) VALUES (?, ?, ?)`
);
const insertTopic = db.prepare(
  `INSERT INTO topics (chapter_id, name, sort_order) VALUES (?, ?, ?)`
);
const insertQuestion = db.prepare(`
  INSERT INTO questions
    (topic_id, question_text, options_json, correct_answer, question_type,
     core_topic, prerequisites_json, difficulty, hint_1, hint_2, full_solution)
  VALUES (@topic_id, @question_text, @options_json, @correct_answer, @question_type,
          @core_topic, @prerequisites_json, @difficulty, @hint_1, @hint_2, @full_solution)
`);

function seed() {
  const already = db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n;
  if (already > 0) {
    console.log('Seed skipped — subjects already exist.');
    return;
  }

  const physicsId = insertSubject.run('Physics', 'PHY', 1).lastInsertRowid;

  const chapterNames = [
    'Kinematics',
    'Laws of Motion and Friction',
    'Work, Energy and Power',
    'Rotational Motion',
    'Electrostatics',
    'Current Electricity',
  ];
  const chapterIds = {};
  chapterNames.forEach((name, i) => {
    chapterIds[name] = insertChapter.run(physicsId, name, i + 1).lastInsertRowid;
  });

  const kinematicsId = chapterIds['Kinematics'];
  const topicNames = ['1D Motion', '2D Motion/Projectiles', 'Relative Velocity'];
  const topicIds = {};
  topicNames.forEach((name, i) => {
    topicIds[name] = insertTopic.run(kinematicsId, name, i + 1).lastInsertRowid;
  });

  const Q = (t) => ({
    topic_id: topicIds[t.topic],
    question_text: t.q,
    options_json: t.options ? JSON.stringify(t.options) : null,
    correct_answer: t.answer,
    question_type: 'Practice',
    core_topic: t.core_topic,
    prerequisites_json: JSON.stringify(t.prereqs),
    difficulty: t.difficulty,
    hint_1: t.hint_1,
    hint_2: t.hint_2,
    full_solution: t.full_solution,
  });

  const questions = [

    // ---------- 1D Motion (6) ----------
    Q({
      topic: '1D Motion',
      core_topic: 'Uniformly accelerated motion',
      prereqs: ['Equations of motion', 'Sign convention'],
      difficulty: 'Easy',
      q: 'A car starts from rest and accelerates uniformly at 2 m/s² for 10 s. Find the distance covered.',
      options: ['50 m', '100 m', '200 m', '20 m'],
      answer: '100 m',
      hint_1: 'You know the initial velocity, the acceleration, and the time — think about which equation of motion connects exactly those three to distance.',
      hint_2: 's = ut + ½at², where u is initial velocity, a is acceleration, t is time.',
      full_solution: 'u = 0, a = 2 m/s², t = 10 s. Using s = ut + ½at² = 0 + ½(2)(100) = 100 m. Why this trips people up: students sometimes use v² = u² + 2as without first finding v, adding an unnecessary step.',
    }),
    Q({
      topic: '1D Motion',
      core_topic: 'v-t graph interpretation',
      prereqs: ['Area under v-t graph = displacement', 'Slope of v-t graph = acceleration'],
      difficulty: 'Medium',
      q: 'A particle moves such that its velocity-time graph is a straight line from (0, 10 m/s) to (5 s, 0). What is the total distance covered in these 5 seconds?',
      options: ['25 m', '50 m', '10 m', '5 m'],
      answer: '25 m',
      hint_1: 'On a v-t graph, distance is not read off an axis directly — it comes from a specific geometric property of the graph.',
      hint_2: 'Distance = area under the v-t graph. For a straight-line graph from v₀ to 0, that area is a triangle: ½ × base × height.',
      full_solution: 'The v-t graph is a triangle with base 5 s and height 10 m/s. Area = ½ × 5 × 10 = 25 m. Why this trips people up: students often multiply v and t directly (10 × 5 = 50) forgetting the velocity is changing, not constant.',
    }),
    Q({
      topic: '1D Motion',
      core_topic: 'Free fall / motion under gravity',
      prereqs: ['Equations of motion', 'Sign convention for gravity'],
      difficulty: 'Easy',
      q: 'A ball is dropped from a height of 45 m. Taking g = 10 m/s², how long does it take to reach the ground?',
      options: ['3 s', '4.5 s', '9 s', '2 s'],
      answer: '3 s',
      hint_1: 'This is free fall from rest — think about which equation of motion relates height, time, and acceleration when the initial velocity is zero.',
      hint_2: 'h = ½gt² (since u = 0), so t = √(2h/g).',
      full_solution: 't = √(2×45/10) = √9 = 3 s. Why this trips people up: students sometimes forget u = 0 for "dropped" and try to use extra given data that doesn\'t exist.',
    }),
    Q({
      topic: '1D Motion',
      core_topic: 'Relative deceleration, stopping distance',
      prereqs: ['Equations of motion', 'Negative acceleration'],
      difficulty: 'Medium',
      q: 'A train moving at 72 km/h is brought to rest by a uniform deceleration of 2 m/s². Find the distance it travels before stopping.',
      options: ['100 m', '200 m', '400 m', '50 m'],
      answer: '100 m',
      hint_1: 'Convert the speed to consistent units first, then think about the equation that connects velocity, deceleration, and distance directly — no time needed.',
      hint_2: 'v² = u² − 2as, with v = 0 at the stop.',
      full_solution: 'u = 72 km/h = 20 m/s. 0 = (20)² − 2(2)s ⟹ s = 400/4 = 100 m. Why this trips people up: forgetting to convert km/h to m/s before plugging into the equation is the most common error here.',
    }),
    Q({
      topic: '1D Motion',
      core_topic: 'Average speed vs average velocity',
      prereqs: ['Definition of average speed', 'Definition of average velocity'],
      difficulty: 'Medium',
      q: 'A person walks 4 km in one direction, then walks back 3 km in 1 hour total. What is their average speed and average velocity respectively?',
      options: ['7 km/h, 1 km/h', '7 km/h, 7 km/h', '1 km/h, 1 km/h', '3.5 km/h, 0.5 km/h'],
      answer: '7 km/h, 1 km/h',
      hint_1: 'Average speed cares about total ground covered; average velocity cares only about net displacement from start to end point.',
      hint_2: 'Average speed = total distance / total time. Average velocity = net displacement / total time.',
      full_solution: 'Total distance = 4 + 3 = 7 km, so average speed = 7/1 = 7 km/h. Net displacement = 4 − 3 = 1 km, so average velocity = 1/1 = 1 km/h. Why this trips people up: treating "distance" and "displacement" as interchangeable is the classic mistake here.',
    }),
    Q({
      topic: '1D Motion',
      core_topic: 'Motion with variable acceleration (calculus-based)',
      prereqs: ['Differentiation/integration basics', 'Definitions of v = dx/dt, a = dv/dt'],
      difficulty: 'Hard',
      q: 'The position of a particle moving along the x-axis is given by x = 2t³ − 3t² + 4 (in metres, t in seconds). Find the acceleration at t = 2 s.',
      options: ['18 m/s²', '12 m/s²', '6 m/s²', '24 m/s²'],
      answer: '18 m/s²',
      hint_1: 'When position is given as a function of time rather than constants, you need calculus, not the standard equations of motion.',
      hint_2: 'v = dx/dt, then a = dv/dt. Differentiate x(t) twice with respect to time.',
      full_solution: 'v = dx/dt = 6t² − 6t. a = dv/dt = 12t − 6. At t = 2: a = 24 − 6 = 18 m/s². Why this trips people up: applying s = ut + ½at² here is wrong since acceleration itself is not constant — that formula only works for uniform acceleration.',
    }),

    // ---------- 2D Motion / Projectiles (6) ----------
    Q({
      topic: '2D Motion/Projectiles',
      core_topic: 'Projectile range and maximum height',
      prereqs: ['Resolving velocity into components', 'Independence of horizontal and vertical motion'],
      difficulty: 'Medium',
      q: 'A projectile is launched at 20 m/s at an angle of 30° to the horizontal. Taking g = 10 m/s², find its maximum height.',
      options: ['5 m', '10 m', '2.5 m', '20 m'],
      answer: '5 m',
      hint_1: 'Only the vertical component of velocity affects how high the projectile rises — the horizontal component is irrelevant to height.',
      hint_2: 'H = (u sinθ)² / 2g, where u sinθ is the vertical component of the initial velocity.',
      full_solution: 'u sinθ = 20 × sin30° = 20 × 0.5 = 10 m/s. H = 10² / (2×10) = 100/20 = 5 m. Why this trips people up: using the full speed u instead of just its vertical component u sinθ.',
    }),
    Q({
      topic: '2D Motion/Projectiles',
      core_topic: 'Horizontal projectile from a height',
      prereqs: ['Independence of horizontal and vertical motion', 'Equations of motion (vertical)'],
      difficulty: 'Easy',
      q: 'A ball is thrown horizontally with a speed of 15 m/s from the top of a 20 m tall tower. Taking g = 10 m/s², how far from the base of the tower does it land?',
      options: ['30 m', '15 m', '20 m', '10 m'],
      answer: '30 m',
      hint_1: 'Split this into two independent problems: how long does it take to fall 20 m vertically, and how far does it travel horizontally in that same time?',
      hint_2: 'Time to fall: h = ½gt². Horizontal range: R = u × t (horizontal speed is constant throughout).',
      full_solution: '20 = ½(10)t² ⟹ t² = 4 ⟹ t = 2 s. Horizontal distance = 15 × 2 = 30 m. Why this trips people up: trying to use a single combined equation instead of separating the motion into independent horizontal and vertical parts.',
    }),
    Q({
      topic: '2D Motion/Projectiles',
      core_topic: 'Time of flight and range together',
      prereqs: ['Time of flight formula', 'Range formula', 'Basic trigonometric equations'],
      difficulty: 'Hard',
      q: 'A projectile launched from level ground has a time of flight of 4 s and a horizontal range of 80 m. Taking g = 10 m/s², find its angle of projection.',
      options: ['45°', '30°', '60°', '37°'],
      answer: '45°',
      hint_1: 'You have two separate pieces of information (time of flight, range) and two unknowns (initial speed, angle) — set up both formulas and combine them rather than guessing.',
      hint_2: 'T = 2u sinθ/g gives u sinθ. R = u²sin2θ/g = 2u²sinθcosθ/g. Divide the second by the square of what you get from the first to eliminate u.',
      full_solution: 'From T = 2u sinθ/g = 4, u sinθ = 20. From R = 2u²sinθcosθ/g = 80, u²sinθcosθ = 400. Substituting u = 20/sinθ into the second equation: (20/sinθ)² sinθ cosθ = 400 ⟹ 400 cosθ/sinθ = 400 ⟹ cotθ = 1 ⟹ θ = 45°. Why this trips people up: trying to solve for u and θ using only one equation instead of combining both given quantities.',
    }),
    Q({
      topic: '2D Motion/Projectiles',
      core_topic: 'Equation of trajectory',
      prereqs: ['Parametric equations of projectile motion', 'Eliminating time between x(t) and y(t)'],
      difficulty: 'Medium',
      q: 'A projectile is launched with speed u at angle θ to the horizontal. Which of the following correctly gives y in terms of x (the trajectory equation)?',
      options: [
        'y = x tanθ − gx²/(2u²cos²θ)',
        'y = x tanθ + gx²/(2u²cos²θ)',
        'y = x sinθ − gx²/(2u²)',
        'y = x cosθ − gx²/(2u²sin²θ)',
      ],
      answer: 'y = x tanθ − gx²/(2u²cos²θ)',
      hint_1: 'Start from the separate horizontal and vertical position equations, then eliminate the time variable between them.',
      hint_2: 'x = (u cosθ)t and y = (u sinθ)t − ½gt². Solve the first for t, substitute into the second.',
      full_solution: 'From x = (u cosθ)t, t = x/(u cosθ). Substituting into y = (u sinθ)t − ½gt² gives y = x tanθ − gx²/(2u²cos²θ). Why this trips people up: sign errors when substituting, or forgetting to square the cosθ term in the denominator.',
    }),
    Q({
      topic: '2D Motion/Projectiles',
      core_topic: 'Maximum range condition',
      prereqs: ['Range formula', 'Basic optimization (or knowing sin2θ is maximum at 90°)'],
      difficulty: 'Easy',
      q: 'At what angle of projection is the horizontal range of a projectile maximum (for a given initial speed)?',
      options: ['45°', '30°', '60°', '90°'],
      answer: '45°',
      hint_1: 'Think about which angle makes the range formula\'s trigonometric term as large as possible.',
      hint_2: 'R = u²sin2θ/g. This is maximum when sin2θ = 1.',
      full_solution: 'sin2θ = 1 when 2θ = 90°, i.e. θ = 45°. Why this trips people up: confusing "maximum height" (θ = 90°) with "maximum range" (θ = 45°) — these are two different optimization questions.',
    }),
    Q({
      topic: '2D Motion/Projectiles',
      core_topic: 'Two angles giving the same range',
      prereqs: ['Range formula', 'sin(180° − x) = sin(x)'],
      difficulty: 'Medium',
      q: 'A projectile has the same range for two different angles of projection, 15° and another angle. What is the other angle?',
      options: ['75°', '60°', '45°', '30°'],
      answer: '75°',
      hint_1: 'Two different launch angles can give the identical range — think about a trig identity where two different angles produce the same sine value.',
      hint_2: 'R depends on sin2θ. Since sin(2θ) = sin(180° − 2θ), the two angles θ₁ and θ₂ satisfy θ₁ + θ₂ = 90°.',
      full_solution: 'θ₁ + θ₂ = 90°, so θ₂ = 90° − 15° = 75°. Why this trips people up: not immediately recognizing that this is asking about complementary angles in disguise.',
    }),

    // ---------- Relative Velocity (6) ----------
    Q({
      topic: 'Relative Velocity',
      core_topic: 'Rain-man problem',
      prereqs: ['Vector subtraction', 'Relative velocity concept'],
      difficulty: 'Medium',
      q: 'Rain is falling vertically downward with a speed of 10 m/s. A man runs horizontally with a speed of 10√3 m/s. At what angle to the vertical should he hold his umbrella to avoid getting wet?',
      options: ['30°', '60°', '45°', '90°'],
      answer: '60°',
      hint_1: 'The man should tilt his umbrella to match the direction rain appears to fall from *his* point of view, not from the ground\'s point of view — think about relative velocity of rain with respect to the man.',
      hint_2: 'v(rain w.r.t. man) = v(rain) − v(man). The umbrella angle to the vertical is tanθ = v(man)/v(rain).',
      full_solution: 'tanθ = v(man)/v(rain) = 10√3/10 = √3, so θ = 60°. Why this trips people up: holding the umbrella at the angle of the man\'s velocity itself, instead of the relative velocity of rain with respect to the man.',
    }),
    Q({
      topic: 'Relative Velocity',
      core_topic: 'River-boat problem — shortest time',
      prereqs: ['Vector addition', 'Independence of perpendicular velocity components'],
      difficulty: 'Medium',
      q: 'A river 400 m wide flows at 2 m/s. A boat can travel at 5 m/s in still water. In what direction should the boatman steer to cross the river in the shortest possible time, and what is that time?',
      options: [
        'Straight across (perpendicular to the bank); 80 s',
        'Upstream at an angle; 80 s',
        'Straight across; 200 s',
        'Downstream at an angle; 100 s',
      ],
      answer: 'Straight across (perpendicular to the bank); 80 s',
      hint_1: 'Shortest time depends only on how fast the boat closes the width of the river — think about which velocity component actually controls crossing time.',
      hint_2: 'Time to cross = width / (boat\'s velocity component perpendicular to the bank). To minimize time, that entire component should point straight across.',
      full_solution: 'Pointing straight across gives the full 5 m/s in the perpendicular direction. t = 400/5 = 80 s. Why this trips people up: assuming you need to angle upstream to "compensate" for the current — that minimizes drift, not time.',
    }),
    Q({
      topic: 'Relative Velocity',
      core_topic: 'River-boat problem — shortest path',
      prereqs: ['Vector addition', 'Resultant velocity direction'],
      difficulty: 'Hard',
      q: 'A river flows at 3 m/s. A boat can travel at 5 m/s in still water. In what direction (relative to straight across) should the boatman steer to reach a point directly opposite on the other bank (i.e., travel the shortest path)?',
      options: [
        'Upstream at sin⁻¹(3/5) to the perpendicular',
        'Downstream at sin⁻¹(3/5) to the perpendicular',
        'Straight across',
        'Upstream at cos⁻¹(3/5) to the perpendicular',
      ],
      answer: 'Upstream at sin⁻¹(3/5) to the perpendicular',
      hint_1: 'For the resultant path to go straight across with no sideways drift, the boat\'s own upstream component must exactly cancel the river\'s downstream push.',
      hint_2: 'The boat\'s velocity component along the river must equal and oppose the river\'s velocity: v(boat)sinθ = v(river), measured from the perpendicular.',
      full_solution: 'sinθ = v(river)/v(boat) = 3/5, so θ = sin⁻¹(3/5), angled upstream. Why this trips people up: confusing the "shortest time" strategy (aim straight across) with the "shortest path / reach directly opposite point" strategy (aim upstream) — these are two different questions with different answers.',
    }),
    Q({
      topic: 'Relative Velocity',
      core_topic: 'Relative velocity between two moving bodies',
      prereqs: ['Vector subtraction', 'Relative velocity concept'],
      difficulty: 'Medium',
      q: 'Two cars A and B move along the same straight road. A moves east at 20 m/s, B moves west at 15 m/s. What is the velocity of A relative to B?',
      options: ['35 m/s east', '5 m/s east', '35 m/s west', '5 m/s west'],
      answer: '35 m/s east',
      hint_1: 'Relative velocity of A with respect to B means: what does B measure A\'s velocity to be, from B\'s own moving frame?',
      hint_2: 'v(A relative to B) = v(A) − v(B), keeping careful track of direction/sign for each.',
      full_solution: 'Taking east as positive: v(A) = +20, v(B) = −15. v(A/B) = 20 − (−15) = 35 m/s east. Why this trips people up: forgetting to flip the sign of B\'s velocity since it\'s moving in the opposite direction, and simply adding magnitudes without direction.',
    }),
    Q({
      topic: 'Relative Velocity',
      core_topic: 'Rain-man problem — reverse (given umbrella angle)',
      prereqs: ['Vector subtraction', 'Relative velocity concept'],
      difficulty: 'Medium',
      q: 'A man walking at 3 km/h finds that rain appears to fall vertically. When he increases his speed to 6 km/h, the rain appears to come at 45° to the vertical. What is the actual speed of the rain?',
      options: ['3 km/h', '6 km/h', '3√2 km/h', '9 km/h'],
      answer: '3√2 km/h',
      hint_1: 'Break the rain\'s actual velocity into horizontal and vertical parts. The first condition pins down one part exactly; the second condition, combined with that, pins down the other.',
      hint_2: 'If rain looks vertical to a man walking at speed v, the rain\'s horizontal component equals v. At the second speed, use tan45° = (new relative horizontal component)/(vertical component) to find the vertical part, then combine both with Pythagoras.',
      full_solution: 'Let the rain\'s horizontal component be a and vertical (downward) component be b. At 3 km/h, rain appears vertical, so the relative horizontal velocity is zero: a − 3 = 0 ⟹ a = 3. At 6 km/h, the angle to vertical is 45°, so tan45° = |a − 6| / b = 1 ⟹ b = |3 − 6| = 3. Actual rain speed = √(a² + b²) = √(9 + 9) = 3√2 km/h. Why this trips people up: stopping at the horizontal component (3 km/h) and reporting that as "the speed of the rain," instead of combining both components for the actual resultant speed.',
    }),
    Q({
      topic: 'Relative Velocity',
      core_topic: 'Minimum distance between two moving bodies',
      prereqs: ['Relative velocity concept', 'Relative position vector', 'Basic calculus or geometry for minimum distance'],
      difficulty: 'Hard',
      q: 'Two ships A and B are 10 km apart, with B due east of A. Ship A moves north at 6 km/h and ship B moves west at 8 km/h. Find the minimum distance between them.',
      options: ['6 km', '8 km', '10 km', '4.8 km'],
      answer: '6 km',
      hint_1: 'Switch to B\'s frame of reference — once you find the relative velocity of A with respect to B, the problem becomes: how close does a straight-line path come to a fixed point?',
      hint_2: 'Find v(A relative to B), draw the relative velocity direction from the initial separation, and drop a perpendicular from B\'s position to that line — that perpendicular distance is the minimum separation.',
      full_solution: 'v(A) = 6 km/h north, v(B) = 8 km/h west, so v(A/B) = v(A) − v(B) = 6 km/h north + 8 km/h east (reversing B\'s westward motion). This relative velocity vector has magnitude 10 km/h, at an angle to the initial 10 km separation (which is along east-west). The perpendicular distance from B to A\'s relative path works out to 6 km using the 6-8-10 triangle formed by the velocity components. Why this trips people up: trying to track both ships\' positions separately over time with calculus, instead of the much simpler relative-velocity-frame geometric approach.',
    }),
  ];

  const insertAll = db.transaction(() => {
    for (const row of questions) insertQuestion.run(row);
  });
  insertAll();

  console.log(`Seeded: 1 subject, ${chapterNames.length} chapters, ${topicNames.length} Kinematics topics, ${questions.length} questions.`);
}

seed();
