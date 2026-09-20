// What a player can report about a question. Shared by the flag form, the
// API that stores flags, and the builder that lists them.
export const FLAG_DETAILS_MAX = 1000;

export const FLAG_REASONS = [
  {
    id: 'answer-should-count',
    label: 'My answer should have counted',
    detailsLabel: 'Why should it count? (optional)',
    onlyIfWrong: true,
  },
  {
    id: 'multiple-correct',
    label: 'More than one option is right',
    detailsLabel: 'Which ones, and why? (optional)',
  },
  {
    id: 'factually-wrong',
    label: 'Something here is factually wrong',
    detailsLabel: "What's wrong? A link helps if you have one. (optional)",
  },
  {
    id: 'source-problem',
    label: "The source link is broken or doesn't back this up",
    detailsLabel: 'Anything to add? (optional)',
  },
  {
    id: 'unclear',
    label: 'The question or options are confusing',
    detailsLabel: 'What was confusing? (optional)',
  },
  {
    id: 'other',
    label: 'Something else',
    detailsLabel: "Tell us what's wrong",
    needsDetails: true,
  },
];

export const flagReason = (id) => FLAG_REASONS.find((r) => r.id === id);
