import type { Metadata } from "next";
import { Cabecalho, Cartao, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { pode, usuarioAtual } from "@/lib/sessao";
import { FormAviso } from "./FormAviso";
import styles from "./inicio.module.css";

export const metadata: Metadata = { title: "Início" };

export default async function InicioPage() {
  const [usuario, avisos] = await Promise.all([usuarioAtual(), api.avisos()]);
  const publica = pode(usuario, "secretaria", "diretoria", "admin");
  return <>
    <Cabecalho titulo="Início" subtitulo={`Olá, ${usuario.nome.split(" ")[0]}. Confira os avisos da escola.`} />
    <div className={publica ? ui.grade : undefined}>
      <section className={styles.lista} aria-label="Avisos gerais">
        {avisos.length ? avisos.map((aviso) => <Cartao key={aviso.id} titulo={aviso.titulo}>
          <p className={styles.meta}>{formatarData(aviso.publicado_em)} · {aviso.autor}{aviso.exemplo ? " · exemplo" : ""}</p>
          <p className={styles.texto}>{aviso.texto}</p>
        </Cartao>) : <Cartao><Vazio>Nenhum aviso geral publicado por enquanto.</Vazio></Cartao>}
      </section>
      {publica && <Cartao titulo="Publicar aviso geral"><p className={ui.contagem}>O aviso aparecerá no Início de todos os usuários do sistema.</p><FormAviso /></Cartao>}
    </div>
  </>;
}
