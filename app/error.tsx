"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="center">
      <div className="panel">
        <h1>Vamos tentar de novo?</h1>
        <p>
          A brincadeira encontrou um probleminha. O que já foi salvo continua
          guardado.
        </p>
        <button className="primary" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
