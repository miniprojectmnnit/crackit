export function renderQuestionList(questions, container) {
  container.innerHTML = '';
  questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.textContent = `${i + 1}. ${q.question_text}`;
    container.appendChild(div);
  });
}

export function renderInterviewUI(questions) {
  const ui = document.getElementById('interview-ui');
  const qText = document.getElementById('question-text');
  const nextBtn = document.getElementById('next-btn');
  const finishBtn = document.getElementById('finish-btn');
  
  ui.style.display = 'block';
  nextBtn.style.display = 'inline-block';
  finishBtn.style.display = 'none';
  
  // Randomize questions
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 5); // Pick up to 5 questions
  let currentIndex = 0;
  
  const showQuestion = () => {
    qText.textContent = `Q${currentIndex + 1}: ${selected[currentIndex].question_text}`;
    if (currentIndex === selected.length - 1 || selected.length === 1) {
      nextBtn.style.display = 'none';
      finishBtn.style.display = 'inline-block';
    } else {
      nextBtn.style.display = 'inline-block';
      finishBtn.style.display = 'none';
    }
  };
  
  if (selected.length > 0) {
    showQuestion();
  } else {
    qText.textContent = 'No questions available for mock interview.';
    nextBtn.style.display = 'none';
    finishBtn.style.display = 'inline-block';
  }
  
  nextBtn.onclick = () => {
    currentIndex++;
    showQuestion();
  };
  
  finishBtn.onclick = () => {
    ui.style.display = 'none';
    document.querySelector('.actions').style.display = 'flex';
    document.getElementById('questions-list').style.display = 'block';
    document.getElementById('status').style.display = 'block';
  };
}
