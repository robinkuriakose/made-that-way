import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeTidbits, splitTidbits } from './bank.js';
import { checkQuestion, normalizeQuestion, slugify } from './questionRules.js';
import { FLAG_REASONS } from './flags.js';

function goodQuestion(overrides = {}) {
  return {
    id: 'manhole-round',
    topic: 'everyday-object',
    tags: ['geometry'],
    themes: ['everyday'],
    stem: 'Why are most manhole covers round?',
    options: ['It is cheapest to cast', "It can't fall through its hole", 'Round holes are easier', 'It drains rain better'],
    correctIndex: 1,
    hint: 'Tip a square lid on its edge.',
    explanationRight: 'A circle is the same width every way.',
    explanationWrong: ['Not cost.', null, 'Not digging.', 'Not drainage.'],
    confidence: 'high confidence',
    sourceName: 'Berkeley',
    sourceUrl: 'https://example.org/manhole',
    ...overrides,
  };
}

test('tidbits move onto their questions and back without loss', () => {
  const questions = [{ id: 'a' }, { id: 'b' }];
  const tidbits = [{ id: 'tidbit-x', tidbitFor: 'b', text: 'A nudge.' }];
  const merged = mergeTidbits(questions, tidbits);
  assert.equal(merged[0].tidbit, undefined);
  assert.deepEqual(merged[1].tidbit, { id: 'tidbit-x', text: 'A nudge.' });
  assert.deepEqual(splitTidbits(merged).tidbits, tidbits);
});

test('a question with no tidbit id gets one from its own id', () => {
  const { tidbits } = splitTidbits([{ id: 'q1', tidbit: { text: 'Hello' } }, { id: 'q2', tidbit: { text: '  ' } }]);
  assert.deepEqual(tidbits, [{ id: 'tidbit-q1', tidbitFor: 'q1', text: 'Hello' }]);
});

test('a complete question passes the rules', () => {
  const { errors } = checkQuestion(goodQuestion());
  assert.deepEqual(errors, []);
});

test('the rules catch missing parts, bad links and a giveaway right answer', () => {
  const tooLong = goodQuestion({ options: ['Cheap', 'It cannot ever fall down through its own round hole at any angle', 'Easy', 'Rain'] });
  assert.ok(checkQuestion(tooLong).errors.some((e) => e.includes('words longer')));
  assert.ok(checkQuestion(goodQuestion({ sourceUrl: 'example.org' })).errors.some((e) => e.includes('source link')));
  assert.ok(checkQuestion(goodQuestion({ tags: [] })).errors.some((e) => e.includes('tag')));
  assert.ok(checkQuestion(goodQuestion({ correctIndex: null })).errors.some((e) => e.includes('correct')));
  assert.ok(checkQuestion(goodQuestion({ hint: `A ${String.fromCharCode(0x2014)} dash` })).errors.some((e) => e.includes('em dash')));
  const noAlt = goodQuestion({ image: { src: '/images/x.webp', alt: '' } });
  assert.ok(checkQuestion(noAlt).errors.some((e) => e.includes('alt text')));
  assert.ok(checkQuestion(goodQuestion({ image: { src: '/x.webp', alt: 'A thing' } })).warnings.some((w) => w.includes('credit')));
});

test('normalising drops empty optional parts and server fields', () => {
  const q = normalizeQuestion({
    ...goodQuestion(),
    status: 'live',
    feedback: [],
    group: '  ',
    tags: [' Geometry', 'geometry', ''],
    image: { src: '', alt: '' },
    tidbit: { id: '', text: '' },
    explanationWrong: ['Not cost.', 'should be dropped', 'Not digging.', 'Not drainage.'],
  });
  assert.equal(q.status, undefined);
  assert.equal(q.feedback, undefined);
  assert.equal(q.group, undefined);
  assert.equal(q.image, undefined);
  assert.equal(q.tidbit, undefined);
  assert.deepEqual(q.tags, ['geometry']);
  assert.equal(q.explanationWrong[1], null);
});

test('ids are made from the question', () => {
  assert.equal(slugify('Why are most manhole covers round?'), 'manhole-covers-round');
  assert.equal(slugify("Why does a café's menu say Save As…?"), 'cafe-s-menu-say-save-as');
});

test('every flag reason has a label, and only "something else" requires details', () => {
  for (const r of FLAG_REASONS) assert.ok(r.label && r.detailsLabel);
  assert.deepEqual(FLAG_REASONS.filter((r) => r.needsDetails).map((r) => r.id), ['other']);
});
