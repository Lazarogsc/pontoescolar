import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Situacao, Vazio, ui } from "@/components/ui";
import { api, formatarNumero } from "@/lib/api";

export const metadata: Metadata = { title: "Alunos" };

export default async function AlunosPage({ searchParams }: PageProps<"/alunos">) {
  const { busca, turma } = await searchParams;
  const filtros = { busca: typeof busca === "string" ? busca : "", turma: typeof turma === "string" ? turma : "" };
  const [alunos, turmas] = await Promise.all([api.alunos(filtros), api.turmas()]);

  return (
    <>
      <Cabecalho titulo="Alunos" subtitulo="Cadastro e situação de cada aluno matriculado">
        <button className="btn btn-primario" disabled title="Em breve">
          + Nova matrícula
        </button>
      </Cabecalho>

      <Cartao>
        {/* Formulário GET: a busca vai para a URL e a página é renderizada no servidor */}
        <form className={ui.filtros} role="search">
          <input name="busca" defaultValue={filtros.busca} placeholder="Buscar por nome ou matrícula" aria-label="Buscar aluno" />
          <select name="turma" defaultValue={filtros.turma} aria-label="Filtrar por turma">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <button className="btn btn-secundario" type="submit">
            Filtrar
          </button>
          {(filtros.busca || filtros.turma) && (
            <Link className="btn btn-secundario" href="/alunos">
              Limpar
            </Link>
          )}
        </form>

        <p className={ui.contagem}>
          {alunos.length} {alunos.length === 1 ? "aluno encontrado" : "alunos encontrados"}
        </p>

        {alunos.length === 0 ? (
          <Vazio>Nenhum aluno encontrado com esses filtros.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nome</th>
                  <th>Turma</th>
                  <th>Responsável</th>
                  <th className={ui.num}>Frequência</th>
                  <th className={ui.num}>Média</th>
                  <th>Mensalidade</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((a) => (
                  <tr key={a.id}>
                    <td className={`mono ${ui.suave}`}>{a.matricula}</td>
                    <td>
                      <strong>{a.nome}</strong>
                    </td>
                    <td>
                      <Link href={`/turmas/${a.turma_id}`}>{a.turma}</Link>
                    </td>
                    <td>
                      {a.responsavel}
                      <br />
                      <span className={ui.suave}>{a.telefone}</span>
                    </td>
                    <td className={ui.num}>{formatarNumero(a.frequencia)}%</td>
                    <td className={ui.num}>{formatarNumero(a.media)}</td>
                    <td>
                      <Situacao valor={a.mensalidade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}
