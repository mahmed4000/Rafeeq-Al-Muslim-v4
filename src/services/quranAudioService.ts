export const getReciterAudioUrl = (reciterId: string, surahId: number): string => {
  const pad = surahId.toString().padStart(3, '0');
  if (reciterId === 'abdulbasit') {
    return `https://download.quranicaudio.com/qdc/abdul_baset/murattal/${surahId}.mp3`;
  }
  if (reciterId === 'abdulbasit_mujawwad') {
    return `https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/${surahId}.mp3`;
  }
  if (reciterId === 'minshawi') {
    return `https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/${surahId}.mp3`;
  }
  if (reciterId === 'shuraim') {
    return `https://cdn.mp3quran.net/audio/saud-shuraim/r1/${pad}.mp3`;
  }
  if (reciterId === 'yasser_dosari') {
    return `https://cdn.mp3quran.net/audio/yasser-dosari/r1/${pad}.mp3`;
  }
  if (reciterId === 'baijan') {
    return `https://cdn.mp3quran.net/audio/abdullah-buaijan/r1/${pad}.mp3`;
  }
  if (reciterId === 'burhaji') {
    return `https://cdn.mp3quran.net/audio/muhammad-burhaji/r1/${pad}.mp3`;
  }
  if (reciterId === 'ahmad_hudhaifi') {
    return `https://cdn.mp3quran.net/audio/ahmad-hudhaifi/r1/${pad}.mp3`;
  }
  if (reciterId === 'abdulmohsen_qasim') {
    return `https://cdn.mp3quran.net/audio/abdulmohsen-qasim/r1/${pad}.mp3`;
  }
  if (reciterId === 'alhusary') {
    return `https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/${surahId}.mp3`;
  }
  if (reciterId === 'almuaiqly') {
    return `https://cdn.mp3quran.net/audio/maher-muaiqly/r1/${pad}.mp3`;
  }
  if (reciterId === 'alghamdi') {
    return `https://download.quranicaudio.com/qdc/saad_al_ghamdi/murattal/${surahId}.mp3`;
  }
  // Default Alafasy
  return `https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/${surahId}.mp3`;
};
