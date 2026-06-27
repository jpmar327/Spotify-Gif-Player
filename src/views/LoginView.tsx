interface Props {
  onLogin: () => void;
}

export function LoginView({ onLogin }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      <h1
        style={{
          fontSize: '3.5rem',
          fontWeight: 700,
          letterSpacing: '-2px',
          marginBottom: '2.5rem',
          color: '#fff',
        }}
      >
        GIF Player
      </h1>
      <button
        onClick={onLogin}
        style={{
          backgroundColor: '#1DB954',
          color: '#000',
          border: 'none',
          borderRadius: '500px',
          padding: '14px 52px',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          transition: 'transform 80ms ease, background-color 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1ed760')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1DB954')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Connect Spotify
      </button>
    </div>
  );
}
