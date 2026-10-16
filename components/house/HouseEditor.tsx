'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { HOUSE_BASE, imageOptions, photo, type HouseSettings } from '@/lib/house/config';
export default function HouseEditor({ initial }: { initial: HouseSettings }) {
  const [value, setValue] = useState(initial), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  const names = { exterior: 'Exterior', hallway: 'Hallway', listings: 'Listings room', team: 'Team room', contact: 'Contact room' } as const;
  function text(key: 'headline' | 'introduction' | 'listingTitle' | 'teamTitle' | 'teamDescription' | 'contactTitle' | 'seoTitle' | 'seoDescription', label: string, long = false) {
    return <label key={key}>{label}{long ? <textarea value={value[key]} onChange={event => setValue({ ...value, [key]: event.target.value })} rows={3}/> : <input value={value[key]} onChange={event => setValue({ ...value, [key]: event.target.value })}/>}</label>;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback('');
    try {
      const response = await fetch('/api/admin/house-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      setFeedback('Saved. Reload the house preview to see your changes.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Settings could not be saved.'); }
    finally { setBusy(false); }
  }
  async function upload(key: keyof HouseSettings['images'], file?: File) {
    if (!file) return; setBusy(true); setFeedback('');
    try {
      const body = new FormData(); body.set('file', file);
      const response = await fetch('/api/admin/house-images', { method: 'POST', body });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      setValue(current => ({ ...current, images: { ...current.images, [key]: result.url } }));
      setFeedback('Image uploaded. Save homepage settings to use it in the draft.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'The image could not be uploaded.'); }
    finally { setBusy(false); }
  }
  return <details className="admin-panel house-editor" style={{ marginTop: 32 }}>
    <summary style={{ cursor: 'pointer', fontSize: 22 }}>House homepage · content, images & motion</summary>
    <p>Changes apply to the private local homepage. <a href={HOUSE_BASE} target="_blank" rel="noreferrer">Open homepage ↗</a></p>
    <form onSubmit={save} aria-busy={busy}>
      <fieldset><legend>Editable content</legend>{text('headline', 'Exterior headline')}{text('introduction', 'Business introduction', true)}{text('listingTitle', 'Listings heading')}{text('teamTitle', 'Team heading')}{text('teamDescription', 'Team biography', true)}{text('contactTitle', 'Contact heading')}
        {(['listings', 'team', 'contact'] as const).map(key => <label key={key}>{names[key]} door label<input value={value.labels[key]} maxLength={30} onChange={event => setValue({ ...value, labels: { ...value.labels, [key]: event.target.value } })}/></label>)}
      </fieldset>
      <fieldset><legend>Scene images & focal positions</legend><p>Use the approved set or upload a JPEG, PNG or WebP (12 MB maximum). Changing doorway photographs may require a continuity review.</p>
        <div className="house-editor-images">{(Object.keys(names) as (keyof typeof names)[]).map(key => <div key={key}>
          <h3>{names[key]}</h3><img src={photo(value.images[key], 'thumb')} alt={names[key] + ' preview'} width={480} height={270}/>
          <label>Choose photograph<select value={imageOptions.includes(value.images[key] as typeof imageOptions[number]) ? value.images[key] : 'custom'} onChange={event => setValue({ ...value, images: { ...value.images, [key]: event.target.value } })}>
            {!imageOptions.includes(value.images[key] as typeof imageOptions[number]) && <option value="custom">Uploaded photograph</option>}{imageOptions.map(name => <option key={name} value={name}>{names[name]}</option>)}
          </select></label>
          <label>Upload replacement<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void upload(key, event.target.files?.[0])}/></label>
          {(['x','y'] as const).map(axis => <label key={axis}>{axis === 'x' ? 'Horizontal' : 'Vertical'} focal position: {value.focus[key][axis]}%<input type="range" min={0} max={100} value={value.focus[key][axis]} onChange={event => setValue({ ...value, focus: { ...value.focus, [key]: { ...value.focus[key], [axis]: Number(event.target.value) } } })}/></label>)}
        </div>)}</div>
      </fieldset>
      <fieldset><legend>Motion</legend>
        <label className="house-editor-check"><input type="checkbox" checked={value.motion.enabled} onChange={event => setValue({ ...value, motion: { ...value.motion, enabled: event.target.checked } })}/> Enable motion by default</label>
        {([['scrollScreens', 'Desktop scroll travel (screen heights)', 1.5, 4, .1], ['roomDuration', 'Desktop doorway transition (ms)', 600, 1500, 50], ['mobileDuration', 'Phone tap transition (ms)', 200, 450, 25], ['arrivalZoom', 'Arrival zoom strength', 1, 1.65, .05]] as const).map(([key,label,min,max,step]) => <label key={key}>{label}<input type="number" value={value.motion[key]} min={min} max={max} step={step} required onChange={event => setValue({ ...value, motion: { ...value.motion, [key]: event.target.valueAsNumber } })}/></label>)}
        <p>Phones use taps and normal scrolling. Reduced-motion preferences always override animation.</p>
      </fieldset>
      <fieldset><legend>Search metadata</legend>{text('seoTitle', 'Page title')}{text('seoDescription', 'Meta description', true)}<p>The draft stays noindex. Its canonical URL will be set only after the publication domain is verified.</p></fieldset>
      <button className="gold-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save homepage settings'}</button><p role="status">{feedback}</p>
    </form>
    <style>{`.house-editor{font-size:14px}.house-editor summary{margin-bottom:20px}.house-editor a{text-decoration:underline}.house-editor fieldset{border:1px solid #ccc0ae;padding:24px;margin:25px 0}.house-editor legend{font-size:17px;padding:0 10px}.house-editor label{display:grid;gap:8px;margin:17px 0;font-size:13px}.house-editor input,.house-editor select,.house-editor textarea{width:100%;min-height:44px;border:1px solid #c9baa5;padding:10px;background:#fff;font-size:16px;color:#30261f}.house-editor-images{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:25px}.house-editor-images img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}.house-editor h3{font-size:25px;margin-bottom:15px}.house-editor .house-editor-check{display:flex;align-items:center;gap:12px}.house-editor-check input{width:20px;min-height:20px}`}</style>
  </details>;
}
