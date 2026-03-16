function shouldRestartHtmlAudio(audio) {
  if (!audio) return true;
  return Boolean(audio.paused || audio.ended);
}

module.exports = {
  shouldRestartHtmlAudio
};
