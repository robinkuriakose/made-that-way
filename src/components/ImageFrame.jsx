import { useState } from 'react';

// Every image sits in a frame of the same fixed height, scaled to fit inside
// it, so text below always starts at the same place whatever the image's
// shape. A question without an image simply has no frame.
//
// Placeholder images (stand-ins waiting to be replaced) show only when
// running locally; the live site behaves as if there were no image.
export const showsImage = (image) => Boolean(image?.src) && !(image.placeholder && import.meta.env.PROD);

export default function ImageFrame({ image, compact = false }) {
  const [broken, setBroken] = useState(false);
  if (broken || !showsImage(image)) return null;
  return (
    <figure className={`image-frame${compact ? ' is-compact' : ''}`}>
      <div className="image-frame-box">
        <img src={image.src} alt={image.alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      </div>
      {image.credit && <figcaption>{image.credit}</figcaption>}
    </figure>
  );
}
