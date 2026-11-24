export const allowedMinutes = [1, 5, 10, 15, 30] as const;
export const rejectedMinutes = [0, -5, 7, 45, NaN, '10'] as const;
export const rejectedSettings = [
  ['sessionMinutes', 7], ['sessionMinutes', 45],
  ['dailyGoalMinutes', 30], ['dailyGoalMinutes', 1],
] as const;
