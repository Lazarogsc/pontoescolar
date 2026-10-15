import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir, pode } from "@/lib/sessao";
import { FormComunicado } from "./Formularios";
import styles from "./professores.module.css";

export const metadata: Metadata = { title: "Comunicados aos professores" };

export default async function ComunicadosProfessoresPage() {
  const [u, comunicados] = await Promise.all([exigir("professores", "professores_gestao"), api.comunicadosProfessores()]);
  const gestao = pode(u, "professores_gestao");

  return (
    <>
      <Cabecalho titulo="Comunicados aos professores" subtitulo="Avisos da coordenação e da direção para o corpo docente">
        {pode(u, "professores") && (
          <Link className="btn btn-secundario" href="/professores/materiais">
            Enviar material ao CPD
          </Link>
        )}
      </Cabecalho>

      <div className={gestao ? ui.grade2 : undefined}>
        <Cartao titulo="Recebidos">
          {comunicados.length === 0 ? (
            <Vazio>Nenhum comunicado por enquanto.</Vazio>
          ) : (
            <ul className={styles.comunicados}>
              {comunicados.map((c) => (
                <li key={c.id}>
                  <strong>{c.titulo}</strong>
                  <span className={styles.meta}>
                    {c.autor} · <span className="mono">{formatarData(c.publicado_em)}</span>
                  </span>
                  <p>{c.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        {gestao && (
          <Cartao titulo="Novo comunicado">
            <FormComunicado />
          </Cartao>
        )}
      </div>
    </>
  );
}
