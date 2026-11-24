export const bannerCases = [
  [false, 'home', false, false], [false, 'home', true, false],
  [false, 'session', false, false], [false, 'session', true, false],
  [true, 'home', false, true], [true, 'home', true, false],
  [true, 'session', false, false], [true, 'session', true, false],
] as const;
export const platformCases = [
  ['Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', 'android'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', 'ios'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'other'],
  ['', 'other'],
] as const;
export const checkCases = [[0, 1740000, false], [0, 1800000, true], [null, 0, true]] as const;
