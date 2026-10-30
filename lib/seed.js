// Starting content for a pad, as a Yjs update.
//
// With no options it builds the default starter with a fixed client ID, so two
// browsers that seed the same empty pad produce identical edits that merge into
// one copy instead of duplicating the starter code. A pad created from the New
// pad form passes a title and language, and is saved before anyone opens it, so
// it uses a normal random client ID.
import * as Y from 'yjs';
import { byId, DEFAULT_LANGUAGE } from './languages.js';

export function seedPad(options) {
  const { title = 'Untitled pad', language = DEFAULT_LANGUAGE } = options ?? {};
  const seed = new Y.Doc();
  if (!options) seed.clientID = 1;
  const lang = byId(language);
  seed.transact(() => {
    seed.getMap('meta').set('language', lang.id);
    seed.getMap('meta').set('title', title);
    seed.getText('code').insert(0, lang.template);
  });
  return Y.encodeStateAsUpdate(seed);
}
