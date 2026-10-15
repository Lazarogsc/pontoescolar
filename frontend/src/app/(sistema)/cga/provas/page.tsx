import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { NovaProva } from "./NovaProva";

export const metadata: Metadata = { title: "Provas e correção" };

export default async function ProvasPage() {
  const [, provas, opcoes] = await Promise.all([exigir("cga"), api.provas(), api.opcoesCga()]);

  return (
    <>
      <Cabecalho titulo="Provas e correção" subtitulo="Gabarito, cartões-resposta em PDF e leitura dos cartões escaneados" />

      <Cartao titulo="Provas">
        {provas.length === 0 ? (
          <Vazio>Nenhuma prova cadastrada. Crie a primeira abaixo.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Prova</th>
                  <th>Data</th>
                  <th>Turmas</th>
                  <th className={ui.num}>Questões</th>
                  <th>Gabarito</th>
                  <th className={ui.num}>Cartões lidos</th>
                  <th>Conferir</th>
                </tr>
              </thead>
              <tbody>
                {provas.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/cga/provas/${p.id}`}>{p.titulo}</Link>
                      <span className={ui.suave}> · {p.tipo}</span>
                    </td>
                    <td className="mono">{formatarData(p.data)}</td>
                    <td>{p.nomes_turmas.join(", ")}</td>
                    <td className={ui.num}>{p.questoes}</td>
                    <td>{p.gabarito_completo ? <Tag tom="ok">Completo</Tag> : <Tag tom="aviso">Incompleto</Tag>}</td>
                    <td className={ui.num}>{p.cartoes}</td>
                    <td>{p.pendentes ? <Tag tom="alerta">{p.pendentes} para conferir</Tag> : <span className={ui.suave}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Nova prova">
        <NovaProva opcoes={opcoes} />
      </Cartao>
    </>
  );
}
