"use strict";

/**
 * ENGINE: Sequence Quiz
 * Level 4 (10 multiple choice questions)
 * Level 28 (8 typed pattern questions)
 * Level 41 (Sequence Master hard questions)
 */

window.PuzzleEngines = window.PuzzleEngines || {};

window.PuzzleEngines.sequenceQuiz = {
    init: (container, puzzle, shell) => {
        const questions = puzzle.config.questions || [];
        let currentIndex = 0;
        let score = 0;

        function renderQuestion() {
            if (currentIndex >= questions.length) {
                // Completed all questions!
                container.innerHTML = `
                    <div style="max-width: 500px; margin: 0 auto; text-align: center; background: rgba(14, 27, 48, 0.85); border: 1px solid var(--panel-border); border-radius: 14px; padding: 28px;">
                        <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
                        <h3 style="font-size: 22px; color: var(--gold); margin: 0 0 10px;">ALL QUESTIONS SOLVED!</h3>
                        <p style="font-size: 14px; color: rgba(255, 255, 255, 0.85); margin: 0 0 18px;">
                            ${questions.length === 1 ? "You successfully decoded the sequence!" : `You successfully decoded all ${questions.length} sequences!`}
                        </p>
                    </div>
                `;
                setTimeout(() => {
                    shell.completeLevel();
                }, 1000);
                return;
            }

            const q = questions[currentIndex];
            const isMultipleChoice = Array.isArray(q.options);

            container.innerHTML = `
                <div style="max-width: 560px; width: 100%; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <div style="background: rgba(14, 27, 48, 0.75); border: 1px solid var(--panel-border); border-radius: 14px; padding: 24px; width: 100%; box-sizing: border-box;">
                        ${questions.length > 1 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                            <span style="font-size: 11px; font-weight: 800; color: var(--cyan); letter-spacing: 1px;">
                                QUESTION ${currentIndex + 1} OF ${questions.length}
                            </span>
                            <span style="font-size: 12px; font-weight: 800; color: var(--gold);">
                                SOLVED: ${score} / ${questions.length}
                            </span>
                        </div>
                        ` : ""}

                        <div style="font-size: 26px; font-weight: 900; color: #ffffff; margin: 16px 0; font-family: monospace; letter-spacing: 2px;">
                            ${q.sequence}
                        </div>

                        ${isMultipleChoice ? `
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px;">
                                ${q.options.map((opt) => `
                                    <button class="pq-btn pq-btn-secondary pq-opt-btn" type="button" data-val="${opt}" style="padding: 14px; font-size: 18px; font-family: monospace;">
                                        ${opt}
                                    </button>
                                `).join("")}
                            </div>
                        ` : `
                            <div style="display: flex; justify-content: center; gap: 12px; margin-top: 20px;">
                                <input id="pq-seq-input" class="pq-input" type="number" placeholder="Enter answer" style="width: 180px;" autocomplete="off" />
                                <button id="pq-seq-submit" class="pq-btn pq-btn-gold" type="button">SUBMIT</button>
                            </div>
                        `}

                        <div id="pq-seq-feedback" style="min-height: 24px; margin-top: 16px; font-size: 13px; font-weight: 700;"></div>
                    </div>
                </div>
            `;

            const feedback = container.querySelector("#pq-seq-feedback");

            if (isMultipleChoice) {
                const buttons = container.querySelectorAll(".pq-opt-btn");
                buttons.forEach(btn => {
                    btn.onclick = () => {
                        const val = Number(btn.dataset.val);
                        shell.incrementMoves();
                        if (val === q.answer) {
                            btn.style.background = "var(--emerald)";
                            btn.style.borderColor = "var(--emerald)";
                            btn.style.color = "#000000";
                            score++;
                            feedback.innerHTML = `<span style="color:var(--emerald);">✓ Correct! ${q.rule ? "Rule: " + q.rule : ""}</span>`;
                            buttons.forEach(b => b.disabled = true);
                            setTimeout(() => {
                                currentIndex++;
                                renderQuestion();
                            }, 700);
                        } else {
                            btn.style.background = "rgba(239, 68, 68, 0.4)";
                            btn.style.borderColor = "var(--crimson)";
                            feedback.innerHTML = `<span style="color:var(--crimson);">✗ Not quite. Try another option!</span>`;
                        }
                    };
                });
            } else {
                const input = container.querySelector("#pq-seq-input");
                const submitBtn = container.querySelector("#pq-seq-submit");
                input.focus();

                const checkTyped = () => {
                    const val = Number(input.value);
                    shell.incrementMoves();
                    if (val === q.answer) {
                        score++;
                        feedback.innerHTML = `<span style="color:var(--emerald);">✓ Correct! ${q.rule ? "Rule: " + q.rule : ""}</span>`;
                        submitBtn.disabled = true;
                        input.disabled = true;
                        setTimeout(() => {
                            currentIndex++;
                            renderQuestion();
                        }, 800);
                    } else {
                        feedback.innerHTML = `<span style="color:var(--crimson);">✗ Incorrect. Re-evaluate the progression formula.</span>`;
                        input.select();
                    }
                };

                submitBtn.onclick = checkTyped;
                input.onkeydown = (e) => {
                    if (e.key === "Enter") checkTyped();
                };
            }
        }

        shell.onReset = () => {
            if (currentIndex >= questions.length) {
                currentIndex = 0;
                score = 0;
                renderQuestion();
                return;
            }
            const input = container.querySelector("#pq-seq-input");
            const feedback = container.querySelector("#pq-seq-feedback");
            const submitBtn = container.querySelector("#pq-seq-submit");
            if (input) {
                input.value = "";
                input.disabled = false;
                input.focus();
            }
            if (submitBtn) {
                submitBtn.disabled = false;
            }
            if (feedback) {
                feedback.innerHTML = "";
            }
        };

        shell.cleanup = () => {
            shell.onReset = null;
        };

        renderQuestion();
    }
};

