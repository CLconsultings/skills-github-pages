export const LABELS = [
  "Investment confidence",
  "Workflow impact",
  "Failure detection",
  "Decision accountability",
  "Demonstrable value"
];

const RESULTS = [
  ["Strong Signal", "Several operating foundations appear to exist, but five responses cannot verify consistency, attribution, controls, or cross-workflow readiness."],
  ["Opportunity Signal", "Useful practices appear to exist, but material uncertainty remains in the basis for investment, workflow performance, review, accountability, or measurement."],
  ["Risk Signal", "Important AI decisions may currently depend on assumptions, isolated gains, informal controls, unclear ownership, or incomplete evidence."],
  ["Evidence Gap", "The organization does not yet have enough shared operating evidence to support a responsible implementation or expansion decision."]
];

function signalDetail(value) {
  if (value === 4) return "Appears strong but still requires verification.";
  if (value === 3) return "Partially established; evidence or consistency remains incomplete.";
  if (value === 2) return "Material uncertainty or inconsistency is present.";
  return "A critical gap is indicated and should be examined before movement.";
}

export function scoreAnswers(values) {
  if (!Array.isArray(values) || values.length !== 5 || values.some(v => !Number.isInteger(v) || v < 1 || v > 4)) {
    throw new TypeError("answers must contain exactly five integers from 1 to 4");
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  let rank = total >= 17 ? 0 : total >= 13 ? 1 : total >= 9 ? 2 : 3;

  if (values.includes(1)) rank = Math.max(rank, 1);
  if (values.slice(1).includes(1)) rank = Math.max(rank, 2);
  if (values.filter(v => v <= 2).length >= 2) rank = Math.max(rank, 2);
  if (values.filter(v => v === 1).length >= 2) rank = 3;

  const ranked = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value || a.index - b.index)
    .slice(0, 2);

  return {
    total,
    band: RESULTS[rank][0],
    interpretation: RESULTS[rank][1] + " The appropriate next step is deeper validation, not an automatic implementation recommendation.",
    signals: ranked.map(item => ({
      label: LABELS[item.index],
      detail: signalDetail(item.value)
    }))
  };
}
