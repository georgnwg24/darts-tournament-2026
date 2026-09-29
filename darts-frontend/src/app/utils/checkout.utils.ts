export type ThrowOption = {
  label: string;
  score: number;
};

const descendingValues = Array.from({ length: 20 }, (_, index) => 20 - index);

const checkoutOptions: ThrowOption[] = [
  ...descendingValues.map((value) => ({ label: `${value}`, score: value })),
  { label: 'SB', score: 25 },
  ...descendingValues.map((value) => ({
    label: `D${value}`,
    score: value * 2,
  })),
  { label: 'DB', score: 50 },
  ...descendingValues.map((value) => ({
    label: `T${value}`,
    score: value * 3,
  })),
];

export function findCheckoutPath(
  remaining: number,
  dartsLeft: number,
): string[] | null {
  if (remaining <= 0 || dartsLeft <= 0 || remaining > dartsLeft * 60) {
    return null;
  }

  for (let throwsToUse = 1; throwsToUse <= dartsLeft; throwsToUse++) {
    const path = findPathWithExactThrows(remaining, throwsToUse, []);
    if (path) return path;
  }
  return null;
}

function findPathWithExactThrows(
  remaining: number,
  throwsLeft: number,
  path: string[],
): string[] | null {
  if (throwsLeft === 0) return remaining === 0 ? path : null;

  for (const option of checkoutOptions) {
    if (option.score > remaining) continue;
    const candidate = findPathWithExactThrows(
      remaining - option.score,
      throwsLeft - 1,
      [...path, option.label],
    );
    if (candidate) return candidate;
  }
  return null;
}
