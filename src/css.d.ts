/* ────────────────────────────────────────────────────────────
   Declara que los imports de .css retornan un objeto vacío.
   Esto evita que TypeScript intente parsear los archivos CSS
   y genera errores ts(1128), ts(1005), ts(1351), etc.
   ──────────────────────────────────────────────────────────── */
declare module '*.css' {
    const styles: Record<string, string>;
    export default styles;
}