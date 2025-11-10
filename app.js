const { useState, useEffect, useRef } = React;

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState([]);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [slowSpeech, setSlowSpeech] = useState(true);
  const [voiceRate, setVoiceRate] = useState(0.95);

  const localDictionary = {
    'good morning': 'bom dia',
    'how are you': 'como está?',
    'thank you': 'obrigado',
    'please': 'por favor',
    'i love you': 'amo-te',
    'where is the bathroom': 'onde fica a casa de banho?',
  };

  const inputRef = useRef(null);

  useEffect(() => {
    const h = localStorage.getItem('pt_history');
    const s = localStorage.getItem('pt_saved');
    if (h) setHistory(JSON.parse(h));
    if (s) setSaved(JSON.parse(s));
  }, []);

  useEffect(() => localStorage.setItem('pt_history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('pt_saved', JSON.stringify(saved)), [saved]);

  useEffect(() => {
    if (!autoTranslate) return;
    const t = setTimeout(() => { if (input.trim()) translate(input); }, 450);
    return () => clearTimeout(t);
  }, [input]);

  async function translate(text) {
    setLoading(true); setError(null);
    try {
      const translated = await translateWithAPI(text);
      setOutput(translated);
      pushHistory({ source: text, target: translated, ts: Date.now() });
    } catch (e) {
      const fallback = localTranslate(text);
      if (fallback) {
        setOutput(fallback);
        pushHistory({ source: text, target: fallback, ts: Date.now(), fallback: true });
      } else setError('Translation failed (no fallback).');
    } finally { setLoading(false); }
  }

  async function translateWithAPI(text) {
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=en|pt-PT`;

    const resp = await fetch(endpoint);
    if (!resp.ok) throw new Error('API error ' + resp.status);

    const data = await resp.json();
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    throw new Error('Invalid API response');
  }

  function localTranslate(text) {
    const normal = text.trim().toLowerCase();
    if (localDictionary[normal]) return localDictionary[normal];
    for (const k of Object.keys(localDictionary))
      if (normal.includes(k)) return localDictionary[k];
    return null;
  }

  function pushHistory(item) {
    setHistory(h => [item, ...h].slice(0, 60));
  }

  function handleCopy() {
    navigator.clipboard.writeText(output || '');
  }

  function handleSave() {
    if (!output) return;
    const item = { text: output, source: input, ts: Date.now() };
    setSaved(s => [item, ...s]);
    pushHistory({ ...item, saved: true }); // Add saved flag to history
  }

  function handleSpeak(textToSpeak = output) {
    if (!textToSpeak) return;
    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.lang = 'pt-PT';
    u.rate = slowSpeech ? Math.max(0.6, voiceRate - 0.2) : voiceRate;
    const voices = window.speechSynthesis.getVoices();
    const pt = voices.find(v => /pt[- ]?pt/i.test(v.lang) || /portuguese.*portugal/i.test(v.name));
    if (pt) u.voice = pt;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }

  return (
    <div className="container">
      <div className="card">
        <h1>European Portuguese Translator</h1>
        <p className="lead">Translate English → European Portuguese (pt-PT). </p>

        <div className="grid">
          <div>
            <label>English text</label>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Type English here..." />
            <div className="controls">
              <button className="btn primary" onClick={() => translate(input)} disabled={loading || !input.trim()}>
                {loading ? 'Translating...' : 'Translate'}
              </button>
              <button className="btn" onClick={() => { setInput(''); setOutput(''); }}>Clear</button>
              <label className="small"><input type="checkbox" checked={autoTranslate} onChange={e => setAutoTranslate(e.target.checked)} /> Auto</label>
              <label className="small"><input type="checkbox" checked={slowSpeech} onChange={e => setSlowSpeech(e.target.checked)} /> Slow speech</label>
            </div>
          </div>

          <div>
            <label>European Portuguese (pt-PT)</label>
            <div className="output">{output || <span style={{ color: '#9ca3af' }}>Translation will appear here...</span>}</div>
            <div className="controls">
              <button className="btn" onClick={() => handleSpeak()}>Speak</button>
              <button className="btn" onClick={handleCopy}>Copy</button>
              <button className="btn" onClick={handleSave}>Save</button>
            </div>
            {error && <div style={{ color: 'crimson', marginTop: 10 }}>{error}</div>}
          </div>
        </div>

        {/* History & Saved */}
        <div style={{ marginTop: 20 }}>
          <h2>History</h2>
          {history.length === 0 && <p style={{ color: '#9ca3af' }}>No translations yet.</p>}
          <ul>
            {history.map((h, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong>{h.source}</strong> → <em>{h.target}</em>
                {h.saved && <span style={{ color: 'green', marginLeft: 6 }}>(Saved)</span>}
                <br />
                <small style={{ color: '#9ca3af' }}>{formatDate(h.ts)}</small>
              </li>
            ))}
          </ul>

          <h2>Saved Translations</h2>
          {saved.length === 0 && <p style={{ color: '#9ca3af' }}>No saved translations yet.</p>}
          <ul>
            {saved.map((s, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong>{s.source}</strong> → <em>{s.text}</em>
                <br />
                <small style={{ color: '#9ca3af' }}>{formatDate(s.ts)}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
