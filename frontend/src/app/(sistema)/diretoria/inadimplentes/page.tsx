import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Barras, Cabecalho, Cartao, Kpis, Vazio, ui } from "@/components/ui";
import { api, formatarData, formatarMoeda, formatarMoedaCurta, formatarNumero } from "@/lib/api";
import { pagarParcela } from "../actions";
import styles from "./inadimplentes.module.css";

export const metadata: Metadata = { title: "Inadimplentes" };

function whatsapp(telefone: string, responsavel: string, aluno: string) {
  const numero = telefone.replace(/\D/g, "");
  const texto = `Olá, ${responsavel.split(" ")[0]}! Aqui é da secretaria da escola. Consta mensalidade em aberto referente a ${aluno}. Podemos ajudar a regularizar?`;
  return `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`;
}

export default async function InadimplentesPage() {
  const { data, resumo, faixas, itens } = await api.inadimplentes();

  return (
    <>
      <Cabecalho
        titulo="Inadimplentes"
        subtitulo={`Contratos com mensalidade vencida e não paga até o vencimento · posição em ${formatarData(data)}`}
      />

      <Kpis
        itens={[
          { rotulo: "Contratos inadimplentes", valor: String(resumo.contratos), variacao: `${formatarNumero(resumo.taxa)}% dos contratos`, tendencia: resumo.contratos ? "down" : "up" },
          { rotulo: "Parcelas vencidas", valor: String(resumo.parcelas), variacao: "Sem pagamento", tendencia: "neutral" },
          { rotulo: "Valor original", valor: formatarMoedaCurta(resumo.valor_original), variacao: "Soma das parcelas", tendencia: "neutral" },
          { rotulo: "Com multa e juros", valor: formatarMoedaCurta(resumo.valor_atualizado), variacao: "Multa 2% + juros 1% a.m.", tendencia: "down" },
        ]}
      />

      <div className={ui.grade}>
        <Cartao titulo="Como a inadimplência é calculada">
          <p className={ui.contagem}>
            Um contrato entra nesta lista no dia seguinte ao vencimento de uma parcela que não foi paga. Ele sai assim que todas as parcelas
            vencidas recebem baixa — aqui ou no Financeiro. O valor atualizado soma multa de 2% e juros de 1% ao mês, pró-rata.
          </p>
        </Cartao>
        <Cartao titulo="Tempo de atraso">
          <Barras
            tom="alerta"
            itens={faixas.map((f) => ({ nome: f.nome, valor: f.valor, detalhe: `${f.contratos} ${f.contratos === 1 ? "contrato" : "contratos"}` }))}
            formatar={formatarMoedaCurta}
          />
        </Cartao>
      </div>

      <Cartao titulo={`${itens.length} ${itens.length === 1 ? "contrato" : "contratos"} em atraso`}>
        {itens.length === 0 ? (
          <Vazio>Nenhum contrato inadimplente.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Responsável</th>
                  <th className={ui.num}>Atraso</th>
                  <th className={ui.num}>Original</th>
                  <th className={ui.num}>Atualizado</th>
                  <th>Parcelas vencidas</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.aluno_id} className={styles.linha}>
                    <td>
                      <Link href={`/matriculas/${i.matricula}`}>{i.aluno}</Link>
                      <br />
                      <span className={ui.suave}>
                        {i.turma} · <span className="mono">{i.matricula}</span>
                      </span>
                    </td>
                    <td>
                      {i.responsavel}
                      <br />
                      <a className={styles.contato} href={whatsapp(i.telefone, i.responsavel, i.aluno)} target="_blank" rel="noreferrer">
                        {i.telefone} · WhatsApp
                      </a>
                    </td>
                    <td className={`${ui.num} ${ui.negativo}`}>
                      <strong>{i.dias_atraso} dias</strong>
                      <br />
                      <span className={ui.suave}>desde {formatarData(i.desde)}</span>
                    </td>
                    <td className={ui.num}>{formatarMoeda(i.valor_original)}</td>
                    <td className={`${ui.num} ${ui.negativo}`}>
                      <strong>{formatarMoeda(i.valor_atualizado)}</strong>
                    </td>
                    <td>
                      <ul className={styles.parcelas}>
                        {i.parcelas.map((p) => (
                          <li key={p.id}>
                            <span className="mono">
                              {p.competencia} · {formatarMoeda(p.atualizado)}
                            </span>
                            <form action={pagarParcela.bind(null, p.id)}>
                              <BotaoEnviar variante="secundario" enviando="…" className={ui.btnPequeno}>
                                Dar baixa
                              </BotaoEnviar>
                            </form>
                          </li>
                        ))}
                      </ul>
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
