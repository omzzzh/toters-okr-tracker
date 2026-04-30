import { useState, useRef, useCallback } from 'react';
import { TEAM } from '../data/constants';

export function useMention() {
  const [popup, setPopup] = useState({ open: false, query: '', x: 0, y: 0, focused: 0 });
  const stateRef = useRef({ el: null, start: 0 });

  const onInput = useCallback((e) => {
    const ta = e.target;
    const val = ta.value;
    const pos = ta.selectionStart;
    const before = val.slice(0, pos);
    const match = before.match(/@([\w.]*)$/);
    if (match) {
      stateRef.current = { el: ta, start: pos - match[0].length };
      const rect = ta.getBoundingClientRect();
      const matches = TEAM.filter(t =>
        t.name.toLowerCase().includes(match[1].toLowerCase()) ||
        t.email.toLowerCase().includes(match[1].toLowerCase())
      ).slice(0, 6);
      if (matches.length) {
        setPopup({ open: true, query: match[1], matches, x: rect.left, y: rect.bottom + 4, focused: 0 });
      } else {
        setPopup(p => ({ ...p, open: false }));
      }
    } else {
      setPopup(p => ({ ...p, open: false }));
    }
  }, []);

  const onKeyDown = useCallback((e) => {
    if (!popup.open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setPopup(p => ({ ...p, focused: Math.min(p.focused + 1, (p.matches?.length || 1) - 1) })); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPopup(p => ({ ...p, focused: Math.max(p.focused - 1, 0) })); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      if (popup.matches?.[popup.focused]) { e.preventDefault(); insertMention(popup.matches[popup.focused].email); }
    } else if (e.key === 'Escape') { setPopup(p => ({ ...p, open: false })); }
  }, [popup]);

  const insertMention = useCallback((email) => {
    const { el, start } = stateRef.current;
    if (!el) return;
    const val = el.value;
    const pos = el.selectionStart;
    const before = val.slice(0, start);
    const after = val.slice(pos);
    const newVal = before + '@' + email + ' ' + after;
    // Trigger React's synthetic event
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    nativeInputValueSetter?.call(el, newVal);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.selectionStart = el.selectionEnd = before.length + email.length + 2;
    el.focus();
    setPopup(p => ({ ...p, open: false }));
  }, []);

  const close = useCallback(() => setPopup(p => ({ ...p, open: false })), []);

  return { popup, onInput, onKeyDown, insertMention, close };
}
