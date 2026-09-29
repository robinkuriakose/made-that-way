import { useRef, useState } from 'react';
import ImageFrame from '../components/ImageFrame.jsx';
import { prepareImage } from '../lib/imagePrep.js';

export default function ImageField({ image, onChange, api, filenameHint }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { full, thumb } = await prepareImage(file);
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
