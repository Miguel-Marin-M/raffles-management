import { useState, type FormEvent } from 'react';

import { ApiError } from '../lib/api';
import { useSession } from '../features/auth/session';

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
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <p className="rotulo">Gestión de rifas</p>
      <h1 className="mt-1 text-4xl leading-none" style={{ fontStretch: '118%' }}>
        Tu talonario,
        <br />
        en el bolsillo.
      </h1>
      <p className="mt-3 max-w-sm text-tinta-suave">
        Apunta quién apartó cada número y quién ya pagó, sin cargar el cuaderno.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        {mode === 'register' ? (
          <label className="flex flex-col gap-1">
            <span className="rotulo">Nombre</span>
            <input
              className="campo"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              autoComplete="name"
              required
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="rotulo">Correo</span>
          <input
            className="campo"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            autoComplete="email"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="rotulo">Contraseña</span>
          <input
            className="campo"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
        </label>

        {error !== null ? (
          <p role="alert" className="border-l-2 border-sello pl-3 text-sm text-sello">
            {error}
          </p>
        ) : null}

        <button type="submit" className="boton mt-2" disabled={busy}>
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

function messageFor(cause: unknown): string {
  if (!(cause instanceof ApiError)) return 'No pudimos conectar con el servidor.';

  switch (cause.body.code) {
    case 'INVALID_CREDENTIALS':
      return 'El correo o la contraseña no coinciden.';
    case 'EMAIL_ALREADY_REGISTERED':
      return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
    case 'VALIDATION_ERROR':
      return 'Revisa los datos: la contraseña necesita al menos 8 caracteres.';
    default:
      return cause.body.message;
  }
}
