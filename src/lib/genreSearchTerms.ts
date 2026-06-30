const GENRE_SEARCH_TERMS: Record<string, [string, string, string]> = {
  // Core
  'rap':              ['rap battle cypher', 'hip hop rap performance', 'rap concert crowd'],
  'hip hop':          ['hip hop dance battle', 'hip hop music video', 'breakdance hip hop'],
  'rock':             ['rock concert crowd', 'rock guitar solo', 'rock band live stage'],
  'alternative':      ['alternative rock concert', 'indie alternative band', 'alternative music stage'],
  'country':          ['country music concert', 'country western dancing', 'country guitar performance'],
  'trap':             ['trap music beat drop', 'trap rapper performance', 'trap music bass'],
  'metal':            ['heavy metal concert mosh', 'metal guitar shredding', 'metal band headbanging'],
  'jazz':             ['jazz club live music', 'jazz saxophone performance', 'jazz piano player'],
  'r&b':              ['r&b soul performance', 'r&b music dance', 'rhythm and blues concert'],
  'pop':              ['pop concert crowd energy', 'pop music dance stage', 'pop star performance'],
  'funk':             ['funk band groove', 'funk bass guitar solo', 'funky soul music'],
  'edm':              ['edm festival crowd drop', 'electronic music lights', 'edm rave concert'],
  'soul':             ['soul singer concert', 'soul music performance', 'motown soul dance'],
  'punk':             ['punk rock concert mosh', 'punk band live stage', 'punk rock energy'],
  'indie':            ['indie band live concert', 'indie folk performance', 'indie music stage'],
  'folk':             ['folk music acoustic guitar', 'folk singer songwriter', 'folk festival live'],
  'blues':            ['blues guitar solo', 'blues musician stage', 'blues concert performance'],
  'reggae':           ['reggae dance music', 'reggae concert crowd', 'reggae festival vibes'],
  'classical':        ['classical orchestra concert', 'classical piano performance', 'symphony orchestra hall'],
  'house':            ['house music club night', 'house music dj party', 'house dance floor'],
  'techno':           ['techno rave underground', 'techno dj festival', 'techno club night'],
  'drum and bass':    ['drum and bass rave dance', 'drum and bass festival', 'dnb music dance floor'],
  'k-pop':            ['kpop dance performance', 'kpop concert crowd', 'kpop idol group stage'],
  'latin':            ['latin dance party', 'latin music concert', 'latin salsa dancing'],
  'gospel':           ['gospel choir singing', 'gospel church performance', 'gospel music praise'],
  'ambient':          ['ambient abstract visuals', 'calm atmospheric lights', 'dreamy soundscape visuals'],
  'disco':            ['disco dance floor', 'disco ball party', '70s disco dancing'],

  // Latin / Caribbean
  'bachata':          ['bachata couple dancing', 'bachata dance night', 'romantic latin dance'],
  'merengue':         ['merengue dance party', 'merengue dancing couple', 'caribbean dance party'],
  'salsa':            ['salsa dancing couple', 'salsa night club', 'latin dance party'],
  'reggaeton':        ['reggaeton dance party', 'reggaeton club night', 'latin urban dance'],
  'dembow':           ['dembow dance party', 'caribbean urban dance', 'dembow club night'],

  // Brazilian
  'forro':            ['forro dancing couple', 'brazilian forro dance', 'forro festival'],
  'pagode':           ['pagode roda samba', 'brazilian pagode party', 'samba circle dance'],
  'samba':            ['samba dancing carnival', 'brazilian samba dance', 'carnival samba parade'],
  'funk brasileiro':  ['funk carioca dance', 'brazilian funk party', 'baile funk dance'],
  'sertanejo':        ['sertanejo concert crowd', 'brazilian country music', 'sertanejo festival'],

  // Regional Mexican
  'banda':            ['banda music dance', 'banda concert crowd', 'mexican banda performance'],
  'corridos':         ['corridos performance', 'mexican corridos music', 'regional mexican band'],
  'norteno':          ['norteno music dance', 'mexican norteno band', 'accordion norteno'],
  'mariachi':         ['mariachi band performance', 'mariachi street performance', 'mexican mariachi music'],

  'music visualizer': ['music visualizer abstract', 'audio spectrum animation', 'sound wave neon'],
};

export function getSearchTerm(genre: string): string {
  const terms = GENRE_SEARCH_TERMS[genre];
  if (!terms) return genre;
  return terms[Math.floor(Math.random() * terms.length)];
}
