export const TOPIC_LABELS = {
  'everyday-object': 'Everyday objects',
  industrial: 'Industrial design',
  furniture: 'Furniture',
  ui: 'Screens and signs',
  'myth-buster': 'Worth a second look',
};

export const CONFIDENCE_LABELS = {
  accurate: {
    label: 'Accurate',
    note: 'Backed by a primary source, such as a patent, the designer, the maker or a standard.',
  },
  'high confidence': {
    label: 'High confidence',
    note: 'Independent sources agree, though no primary source was found.',
  },
  'medium confidence': {
    label: 'Medium confidence',
    note: 'Credible sources disagree. This is the best supported answer.',
  },
  deduction: {
    label: 'Deduction',
    note: 'Nobody has published the reason. This is the best explanation the evidence supports.',
  },
};
