import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, ui } from "@/components/ui";
import { api, formatarNumero } from "@/lib/api";

export const metadata: Metadata = { title: "Turmas" };

export default async function TurmasPage() {
  const turmas = await api.turmas();
  const totalAlunos = turmas.reduce((soma, t) => soma + t.alunos, 0);

  return (
    <>
      <Cabecalho titulo="Turmas" subtitulo={`${turmas.length} turmas · ${totalAlunos} alunos`}>
        <button className="btn btn-primario" disabled title="Em breve">
          + Nova turma
        </button>
      </Cabecalho>

      <Cartao>
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Turma</th>
                <th>Segmento</th>
                <th>Turno</th>
                <th>Sala</th>
                <th>Regente</th>
                <th className={ui.num}>Alunos</th>
                <th className={ui.num}>Frequência</th>
                <th className={ui.num}>Média</th>
              </tr>
            </thead>
            <tbody>
              {turmas.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/turmas/${t.id}`}>{t.nome}</Link>
                  </td>
                  <td>{t.segmento}</td>
                  <td className={ui.suave}>{t.turno}</td>
                  <td className="mono">{t.sala}</td>
                  <td>{t.regente}</td>
                  <td className={ui.num}>{t.alunos}</td>
                  <td className={ui.num}>{formatarNumero(t.frequencia)}%</td>
                  <td className={ui.num}>{formatarNumero(t.media)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
