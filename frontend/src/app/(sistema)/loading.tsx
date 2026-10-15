import Loading from "../loading";

/**
 * Esqueleto das telas internas. Fica abaixo do layout (menu e barra superior), então ao trocar
 * de tela o menu continua no lugar e só o conteúdo mostra o carregamento enquanto a API responde.
 * Pastas com subtelas (diretoria, turmas...) têm o seu, para as trocas entre elas também.
 */
export default function LoadingSistema() {
  return <Loading />;
}
