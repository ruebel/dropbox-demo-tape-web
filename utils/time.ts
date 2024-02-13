export function getMMSSFromMs(millis: number) {
  const totalSeconds = millis / 1000;
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor(totalSeconds / 60);
  return padWithZero(minutes) + ":" + padWithZero(seconds);
}

function padWithZero(number: number) {
  const string = number.toString();
  if (number < 10) {
    return "0" + string;
  }
  return string;
}
