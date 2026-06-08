import { useState, useRef } from 'react'
import { supabase } from '../supabase.js'

export default function NameModal({ user, onSaved, onSkip }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const save = async () => {
    const name = inputRef.current?.value?.trim()
    if (!name) { setError('Escribe un nombre'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user.id)
    if (err) {
      setError('Error al guardar: ' + err.message)
      setSaving(false)
      return
    }
    onSaved(name)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,.75)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20,
    }}>
      <div style={{
        background:'var(--bg2)', border:'1px solid var(--border2)',
        borderRadius:16, padding:28, width:'100%', maxWidth:380,
      }}>
        <div style={{fontSize:28, textAlign:'center', marginBottom:8}}>👋</div>
        <h2 style={{fontFamily:'var(--font-d)', fontSize:22, letterSpacing:1, textAlign:'center', marginBottom:8}}>
          ¿CÓMO TE LLAMAS?
        </h2>
        <p style={{fontSize:13, color:'var(--text3)', textAlign:'center', marginBottom:20}}>
          Elige el nombre que verán los demás en el ranking.
        </p>
        <input
          ref={inputRef}
          autoFocus
          placeholder="Tu nombre o apodo"
          defaultValue=""
          onKeyDown={e => e.key === 'Enter' && save()}
          style={{
            background:'var(--bg4)', border:'1px solid var(--border2)',
            borderRadius:8, padding:'10px 14px', color:'var(--text)',
            fontSize:15, width:'100%', fontFamily:'var(--font-b)',
            marginBottom: error ? 8 : 16,
          }}
        />
        {error && (
          <div style={{fontSize:12, color:'var(--red)', marginBottom:12}}>{error}</div>
        )}
        <button
          onClick={save}
          disabled={saving}
          style={{
            width:'100%', padding:12, borderRadius:8, border:'none',
            background:'var(--accent)', color:'#0a0f1e',
            fontWeight:600, fontSize:15, cursor:'pointer',
            fontFamily:'var(--font-b)', marginBottom:8,
            opacity: saving ? .6 : 1,
          }}>
          {saving ? 'Guardando…' : 'Guardar nombre'}
        </button>
        <button
          onClick={onSkip}
          style={{
            width:'100%', padding:10, borderRadius:8,
            border:'1px solid var(--border)', background:'transparent',
            color:'var(--text3)', fontSize:13, cursor:'pointer',
            fontFamily:'var(--font-b)',
          }}>
          Ahora no (se mostrará tu correo)
        </button>
      </div>
    </div>
  )
}
