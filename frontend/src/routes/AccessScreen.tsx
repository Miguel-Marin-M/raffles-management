import { useState, type FormEvent } from 'react';

import { useSession } from '../features/auth/use-session';
import { describeError } from '../lib/errors';

/**
 * Entry screen. Sign in and sign up share one form because an organizer sets
 * up their account once and then only ever signs in.
 */
export function AccessScreen(): React.JSX.Element {
  const { login, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <p className="eyebrow">Gestión de rifas</p>
      <h1 className="mt-1 text-4xl leading-none" style={{ fontStretch: '118%' }}>
        Tu talonario,
        <br />
        en el bolsillo.
      </h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Apunta quién apartó cada número y quién ya pagó, sin cargar el cuaderno.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        {mode === 'register' ? (
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Nombre</span>
            <input
              className="field"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              autoComplete="name"
              placeholder="Tu nombre"
              required
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="eyebrow">Correo</span>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            autoComplete="email"
            placeholder="Tu correo"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="eyebrow">Contraseña</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'login' ? 'Tu contraseña' : 'Mínimo 8 caracteres'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
        </label>

        {error !== null ? (
          <p role="alert" className="border-l-2 border-stamp pl-3 text-sm text-stamp">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn mt-2" disabled={busy}>
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <button
        type="button"
        className="mt-5 self-start text-sm underline underline-offset-4"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
      >
        {mode === 'login' ? 'No tengo cuenta todavía' : 'Ya tengo cuenta'}
      </button>
    </main>
  );
}
