import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Cabecalho, Cartao, Tag, ui } from "@/components/ui";
import { api, formatarData, formatarMoeda, NaoEncontrado, type Parcela } from "@/lib/api";

async function carregar(numero: string) {
  try {
    return await api.matricula(numero);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/matriculas/[numero]">) {
  const { numero } = await params;
  return { title: `Matrícula ${numero}` };
}

const TOM_PARCELA: Record<Parcela["status"], "ok" | "aviso" | "alerta"> = { Paga: "ok", "Em aberto": "aviso", Vencida: "alerta" };

export default async function MatriculaPage({ params, searchParams }: PageProps<"/matriculas/[numero]">) {
  const [{ numero }, { nova }] = await Promise.all([params, searchParams]);
  const m = await carregar(numero);
  const r = m.responsavel_detalhe;

  return (
    <>
      <Cabecalho titulo={m.nome} subtitulo={`${m.turma} · ${m.turno} · matriculado em ${formatarData(m.data_matricula)} por ${m.atendente}`}>
        <Link className="btn btn-secundario" href="/matriculas">
          ← Matrículas
        </Link>
        <Link className="btn btn-secundario" href={`/responsavel/${m.matricula}`}>
          Ver como responsável
        </Link>
      </Cabecalho>

      {nova && <Aviso tom="ok">Matrícula concluída! Baixe o termo, imprima e colete as duas assinaturas.</Aviso>}

      <div className={ui.grade}>
        <div className={ui.destaque}>
          <span>Número da matrícula</span>
          <strong>{m.matricula}</strong>
          <span>
            {m.tipo} · ano letivo {m.ano_letivo}
          </span>
        </div>
        <Cartao titulo="Termo de matrícula">
          <p className={ui.contagem} style={{ marginBottom: 14 }}>
            Documento .docx com os dados do aluno, do responsável, as condições do contrato e os campos de assinatura do responsável e de
            quem fez a matrícula.
          </p>
          <a className="btn btn-primario" href={`/matriculas/${m.matricula}/termo`} download>
            Baixar termo para assinatura (.docx)
          </a>
        </Cartao>
      </div>

      <div className={ui.grade3}>
        <Cartao titulo="Aluno">
          <dl className={ui.dl}>
            <dt>Nome</dt>
            <dd>{m.aluno.nome}</dd>
            <dt>Nascimento</dt>
            <dd>{formatarData(m.aluno.data_nascimento)}</dd>
            <dt>CPF</dt>
            <dd>{m.aluno.cpf ?? "—"}</dd>
            {m.aluno.escola_anterior && (
              <>
                <dt>Escola anterior</dt>
                <dd>{m.aluno.escola_anterior}</dd>
              </>
            )}
            {m.aluno.observacoes && (
              <>
                <dt>Observações</dt>
                <dd>{m.aluno.observacoes}</dd>
              </>
            )}
          </dl>
        </Cartao>
        <Cartao titulo="Responsável financeiro">
          <dl className={ui.dl}>
            <dt>Nome</dt>
            <dd>
              {r.nome} <span className={ui.suave}>({r.parentesco})</span>
            </dd>
            <dt>CPF</dt>
            <dd className="mono">{r.cpf}</dd>
            <dt>Telefone</dt>
            <dd>{r.telefone}</dd>
            <dt>E-mail</dt>
            <dd>{r.email}</dd>
            <dt>Endereço</dt>
            <dd>{r.endereco}</dd>
          </dl>
        </Cartao>
        <Cartao titulo="Contrato">
          <dl className={ui.dl}>
            <dt>Turma</dt>
            <dd>
              <Link href={`/turmas/${m.turma_id}`}>{m.turma}</Link>
            </dd>
            <dt>Mensalidade</dt>
            <dd>{formatarMoeda(m.contrato.valor_bruto)}</dd>
            <dt>Desconto</dt>
            <dd>{m.contrato.desconto ? `${m.contrato.desconto}%` : "—"}</dd>
            <dt>Parcela</dt>
            <dd>
              {m.contrato.parcelas}× {formatarMoeda(m.contrato.valor_mensal)}
            </dd>
            <dt>Vencimento</dt>
            <dd>Todo dia {m.contrato.dia_vencimento}</dd>
            <dt>Total</dt>
            <dd>{formatarMoeda(m.contrato.total)}</dd>
          </dl>
        </Cartao>
      </div>

      <Cartao titulo="Parcelas">
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Parcela</th>
                <th>Competência</th>
                <th>Vencimento</th>
                <th className={ui.num}>Valor</th>
                <th>Situação</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {m.parcelas.map((p) => (
                <tr key={p.id}>
                  <td className="mono">
                    {p.numero}/{p.total}
                  </td>
                  <td>{p.competencia}</td>
                  <td className="mono">{formatarData(p.vencimento)}</td>
                  <td className={ui.num}>{formatarMoeda(p.valor)}</td>
                  <td>
                    <Tag tom={TOM_PARCELA[p.status]}>{p.status}</Tag>
                  </td>
                  <td className={`mono ${ui.suave}`}>{formatarData(p.pago_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
