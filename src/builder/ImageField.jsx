import { useRef, useState } from 'react';
import ImageFrame from '../components/ImageFrame.jsx';

const MAX_WIDTH = 1600;
const THUMB_WIDTH = 360;
const MAX_GIF_BYTES = 3 * 1024 * 1024;

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function encode(bitmap, width, quality) {
  const scale = Math.min(1, width / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error("Couldn't process that image.");
  return { contentType: blob.type || 'image/webp', data: await toBase64(blob) };
}

// Shrinks any image to at most MAX_WIDTH wide and re-encodes it as WebP,
// whatever it came in as (JPG, PNG, AVIF, WebP, HEIC where the browser can
// read it), plus a small still thumbnail for places like the home screen.
// GIFs are sent as they are, so animation survives; their thumbnail is the
// first frame.
async function prepare(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This browser can't read that image format. Try a JPG or PNG.");
  }
  const thumb = await encode(bitmap, THUMB_WIDTH, 0.72);
  if (file.type === 'image/gif') {
    if (file.size > MAX_GIF_BYTES) throw new Error('That GIF is over 3 MB. Try a shorter or smaller one.');
    return { full: { contentType: 'image/gif', data: await toBase64(file) }, thumb };
  }
  return { full: await encode(bitmap, MAX_WIDTH, 0.82), thumb };
}

export default function ImageField({ image, onChange, api, filenameHint }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { full, thumb } = await prepare(file);
      const name = filenameHint || file.name;
      const { url } = await api('/api/builder/upload', { method: 'POST', body: { filename: name, ...full } });
      const { url: thumbUrl } = await api('/api/builder/upload', { method: 'POST', body: { filename: `${name}-thumb`, ...thumb } });
      onChange({ src: url, thumb: thumbUrl, alt: image?.alt ?? '', credit: image?.credit ?? '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="image-field">
      {image?.src ? <ImageFrame image={{ ...image, credit: null }} compact /> : <p className="muted image-field-empty">No image. Questions work fine without one.</p>}

      <div className="actions">
        <label className={`button${busy ? ' is-busy' : ''}`}>
          {busy ? 'Uploading…' : image?.src ? 'Replace image' : 'Upload image'}
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="visually-hidden"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
        {image?.src && (
          <button type="button" className="text-button" onClick={() => onChange(null)}>
            Remove image
          </button>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}

      {image?.src && (
        <div className="image-field-text">
          <label className="field-label" htmlFor="image-alt">
            Describe the image
          </label>
          <textarea
            id="image-alt"
            rows={2}
            value={image.alt ?? ''}
            placeholder="What it shows, for people using screen readers"
            onChange={(e) => onChange({ ...image, alt: e.target.value })}
          />
          <label className="field-label" htmlFor="image-credit">
            Credit <span className="muted">(photographer or source, and licence)</span>
          </label>
          <input
            id="image-credit"
            type="text"
            value={image.credit ?? ''}
            placeholder="e.g. Photo: Jane Doe, CC BY 4.0"
            onChange={(e) => onChange({ ...image, credit: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
