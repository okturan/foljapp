'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import '@/lib/corpus-client';
import { generateQuestions, type Question } from '@/lib/practice';

interface Answer {
  question: Question;
  userInput: string;
  correct: boolean;
  skipped: boolean;
}

type Phase = 'answering' | 'reviewing' | 'done';

export function Quiz() {
  const searchParams = useSearchParams();
  const seed = useMemo(() => {
    const raw = searchParams?.get('seed');
    return raw ? Number(raw) : undefined;
  }, [searchParams]);
  const focus = searchParams?.get('focus') ?? undefined;

  const [questionsKey, setQuestionsKey] = useState(0);
  const questions = useMemo(
    () =>
      generateQuestions({
        ...(seed !== undefined ? { seed } : {}),
        ...(focus !== undefined ? { focus } : {}),
        count: 10,
      }),
    // questionsKey intentionally bumps the memo on Try-again restarts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, focus, questionsKey],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);

  const currentQuestion = questions[currentIndex];
  const score = answers.filter((a) => a.correct).length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentQuestion || phase !== 'answering') return;
    const userInput = input.trim();
    const correct = userInput === currentQuestion.expectedForm;
    setAnswers([
      ...answers,
      { question: currentQuestion, userInput, correct, skipped: false },
    ]);
    setPhase('reviewing');
  }

  function handleSkip() {
    if (!currentQuestion || phase !== 'answering') return;
    setAnswers([
      ...answers,
      { question: currentQuestion, userInput: '', correct: false, skipped: true },
    ]);
    setPhase('reviewing');
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setPhase('done');
    } else {
      setCurrentIndex(currentIndex + 1);
      setInput('');
      setPhase('answering');
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setAnswers([]);
    setInput('');
    setPhase('answering');
    setQuestionsKey(questionsKey + 1);
  }

  if (phase === 'done') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Session complete</h1>
        <p
          className="mt-4 text-2xl"
          aria-label={`Score: ${score} of ${questions.length}`}
        >
          Score: <span className="font-bold">{score}</span> / {questions.length}
        </p>
        {answers.some((a) => !a.correct) ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Missed</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {answers
                .filter((a) => !a.correct)
                .map((a, i) => (
                  <li key={i} className="rounded-md bg-stone-50 p-3">
                    <span className="text-stone-500">{a.question.prompt}</span>
                    <div className="mt-1">
                      <span className="font-mono text-stone-900">
                        {a.question.expectedForm}
                      </span>
                      {a.skipped ? (
                        <span className="ml-3 text-xs uppercase text-stone-400">
                          skipped
                        </span>
                      ) : (
                        <span className="ml-3 text-xs text-red-600">
                          you wrote: {a.userInput || '(blank)'}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
        <div className="mt-10">
          <Button type="button" onClick={handleRestart}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-stone-500 italic">no questions available</p>
      </main>
    );
  }

  const lastAnswer = answers[answers.length - 1];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between text-sm text-stone-500">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span>
          Score{' '}
          <span className="font-medium text-stone-900">
            {score}/{currentIndex + (phase === 'reviewing' ? 1 : 0)}
          </span>
        </span>
      </div>

      <p className="mt-6 text-lg text-stone-900">{currentQuestion.prompt}</p>

      <form onSubmit={handleSubmit} className="mt-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={phase !== 'answering'}
          autoFocus
          autoComplete="off"
          aria-label="Your answer"
          className="w-full rounded-md border border-stone-200 bg-white px-4 py-3 font-mono text-lg shadow-sm focus:border-stone-400 focus:outline-none disabled:bg-stone-50"
        />
        <div className="mt-4 flex items-center gap-3">
          {phase === 'answering' ? (
            <>
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline" onClick={handleSkip}>
                Skip
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleNext}>
              {currentIndex + 1 >= questions.length ? 'See results' : 'Next →'}
            </Button>
          )}
        </div>
      </form>

      {phase === 'reviewing' && lastAnswer ? (
        <section
          className={`mt-6 rounded-md p-4 ${
            lastAnswer.correct
              ? 'border border-green-200 bg-green-50'
              : 'border border-red-200 bg-red-50'
          }`}
        >
          <p className="text-sm font-medium">
            {lastAnswer.correct
              ? '✓ correct'
              : lastAnswer.skipped
                ? '— skipped'
                : '✗ incorrect'}
          </p>
          <p className="mt-2 font-mono text-lg text-stone-900">
            {currentQuestion.expectedForm}
          </p>
        </section>
      ) : null}
    </main>
  );
}
