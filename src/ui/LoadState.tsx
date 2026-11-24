export function LoadError({ retry }: { retry: () => void }) {
  return <div role="alert">No se han podido cargar tus datos.<button onClick={retry}>Reintentar</button></div>;
}
