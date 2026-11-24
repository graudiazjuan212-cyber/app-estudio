import { useState } from 'react';
import { fileConfig } from '../config.ts';

export function TechnicalDetails({ detail }: { detail: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(detail); setMessage(fileConfig.copied); }
    catch (error) { setMessage(fileConfig.copyFailed); void error; }
  }
  return <details><summary>{fileConfig.summary}</summary>
    <pre tabIndex={0} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text' }}>{detail}</pre>
    <button onClick={() => { void copy(); }}>{fileConfig.copy}</button>
    <p role="status">{message}</p>
  </details>;
}
