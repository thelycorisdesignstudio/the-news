import { useState } from 'react';
import { Button, Dialog } from './ui';
import { api, ApiError } from '../lib/api';
import { useStore } from '../lib/store';
import { storage } from '../lib/storage';

const RATINGS = [1, 2, 3, 4, 5] as const;
const WORDS: Record<number, string> = { 1: 'not for me', 2: 'needs work', 3: 'okay', 4: 'good', 5: 'love it' };

/** Asked once, at a natural pause (the caught-up card), and always available from the profile. */
export const feedbackAsked = () => storage.get('feedbackAsked', false);
export const markFeedbackAsked = () => storage.set('feedbackAsked', true);

/** The feedback pop-up, in the app's pop-up design: a rating, a note, send. */
export function FeedbackDialog({ onClose, context }: { onClose: () => void; context: string }) {
  const { showToast } = useStore();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !!rating || message.trim().length > 0;

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.feedback({ rating, message: message.trim(), context });
      markFeedbackAsked();
      onClose();
      showToast('thank you. we read every note.');
    } catch (e) {
      setError(e instanceof ApiError && !e.unreachable ? e.message : "couldn't send it. try again in a moment.");
      setBusy(false);
    }
  };
  const close = () => { if (busy) return; markFeedbackAsked(); onClose(); };

  return (
    <Dialog title="how's The News for you?" body="one tap, or a few words. we read every note." onClose={close}>
      <div className="pop__rating" role="radiogroup" aria-label="rating">
        {RATINGS.map(r => (
          <button key={r} type="button" role="radio" aria-checked={rating === r} aria-label={WORDS[r]} className={rating === r ? 'is-on' : undefined} onClick={() => setRating(r === rating ? null : r)}>{r}</button>
        ))}
      </div>
      <span className="pop__hint" aria-live="polite">{rating ? WORDS[rating] : 'pick a number, 5 is best'}</span>
      <textarea className="pop__field" rows={3} maxLength={2000} placeholder="what should we keep, fix or add?" aria-label="your feedback" value={message} onChange={e => setMessage(e.target.value)} disabled={busy} />
      {error && <span role="alert" className="pop__error">{error}</span>}
      <Button onClick={() => void send()} disabled={!ready} loading={busy}>{busy ? 'sending…' : 'send'}</Button>
      <Button variant="light" onClick={close}>not now</Button>
    </Dialog>
  );
}
