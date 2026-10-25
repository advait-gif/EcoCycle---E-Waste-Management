const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

export const simDate = (ms: number) => DATE_FMT.format(new Date(ms));
export const simTime = (ms: number) => TIME_FMT.format(new Date(ms)).toUpperCase();
export const simClock = (ms: number) => `${simDate(ms)} · ${simTime(ms)}`;
export const kg = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("en-US")} kg`;
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
export const rewardPoints = (kg: number, rate = 10) => Math.round(kg * rate);
