import Link from "next/link";
import { Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { formatarData, formatarHoras, formatarMoeda, type Ficha } from "@/lib/api";
import { FormFicha } from "./FormFicha";

export function FichaRh({ ficha, gestao }: { ficha: Ficha; gestao: boolean }) {
  const f = ficha.funcionario;
  const c = ficha.contracheque;
  return <>
    <Kpis itens={[
      { rotulo: "Salário líquido", valor: ficha.kpis.salario_liquido == null ? "—" : formatarMoeda(ficha.kpis.salario_liquido), variacao: ficha.kpis.competencia_liquido ?? "Sem competência", tendencia: "neutral" },
      { rotulo: "Saldo de férias", valor: `${ficha.kpis.saldo_ferias} dias`, variacao: ficha.situacao_ferias.status, tendencia: ficha.situacao_ferias.status === "Vencida" ? "down" : "neutral" },
      { rotulo: "Horas extras", valor: formatarHoras(ficha.kpis.horas_extras_mes), variacao: "Neste mês", tendencia: "neutral" },
      { rotulo: "Diárias acumuladas", valor: formatarMoeda(ficha.kpis.diarias_acumuladas), variacao: "Histórico", tendencia: "neutral" },
    ]} />

    <div className={ui.grade2}>
      <Cartao titulo="Dados profissionais">
        <ul className={ui.lista}>
          {Object.entries({ Matrícula: ficha.profissionais.matricula, Cargo: ficha.profissionais.cargo, Setor: ficha.profissionais.setor, Admissão: formatarData(ficha.profissionais.admissao), "Salário base": formatarMoeda(ficha.profissionais.salario_base) }).map(([rotulo, valor]) =>
            <li key={rotulo}><div><strong>{rotulo}</strong><span>{valor}</span></div></li>)}
        </ul>
        {gestao && <FormFicha tipo="profissionais" id={f.id} valores={ficha.profissionais} />}
      </Cartao>
      <Cartao titulo="Dados cadastrais">
        <FormFicha tipo="cadastrais" id={f.id} valores={ficha.cadastrais} estadosCivis={ficha.opcoes.estados_civis} />
      </Cartao>
    </div>

    <Cartao titulo="Contracheque" extra={<nav className={ui.abas} aria-label="Competência do contracheque">{ficha.competencias.slice(0, 12).map((mes) => <Link key={mes} href={`/meu-rh/${f.id}?competencia=${mes}`} aria-current={mes === ficha.competencia ? "page" : undefined}>{mes}</Link>)}</nav>}>
      {c ? <div className={ui.tabelaWrap}><table><tbody>
        {Object.entries({ Competência: c.competencia, "Salário bruto": formatarMoeda(c.salario_bruto), Descontos: formatarMoeda(c.descontos), INSS: formatarMoeda(c.inss), IRRF: formatarMoeda(c.irrf), FGTS: formatarMoeda(c.fgts), "Salário líquido": formatarMoeda(c.liquido) }).map(([rotulo, valor]) => <tr key={rotulo}><th>{rotulo}</th><td className={ui.num}>{valor}</td></tr>)}
      </tbody></table></div> : <Vazio>Não há contracheque nesta competência.</Vazio>}
      {c?.exemplo && <p className={ui.contagem}>Valores demonstrativos. O RH pode lançar os valores reais.</p>}
      {gestao && <FormFicha tipo="contracheque" id={f.id} valores={{ competencia: ficha.competencia, salario_bruto: c?.salario_bruto ?? 0, descontos: c?.descontos ?? 0, inss: c?.inss ?? 0, irrf: c?.irrf ?? 0, fgts: c?.fgts ?? 0 }} />}
    </Cartao>

    <div className={ui.grade2}>
      <Cartao titulo="Férias">
        <p className={ui.contagem}><Tag tom={ficha.situacao_ferias.status === "Vencida" ? "alerta" : "ok"}>{ficha.situacao_ferias.status}</Tag> · {ficha.situacao_ferias.meses_sem_ferias} meses sem férias</p>
        {ficha.ferias.length ? <ul className={ui.lista}>{ficha.ferias.map((x, i) => <li key={x.id ?? i}><div><strong>{formatarData(x.inicio)} a {formatarData(x.fim)}</strong><span>{x.dias_gozados} dias gozados · {x.dias_vendidos} vendidos · {x.status}{x.exemplo ? " · exemplo" : ""}</span></div></li>)}</ul> : <Vazio>Sem períodos registrados.</Vazio>}
        {gestao && <FormFicha tipo="ferias" id={f.id} valores={{}} statusFerias={ficha.opcoes.status_ferias} />}
      </Cartao>
      <Cartao titulo="Benefícios">
        {ficha.beneficios.length ? <ul className={ui.lista}>{ficha.beneficios.map((x, i) => <li key={x.id ?? i}><div><strong>{x.tipo} · {formatarMoeda(x.valor)}</strong><span>{x.descricao} {x.operadora && `· ${x.operadora}`}{x.exemplo ? " · exemplo" : ""}</span></div></li>)}</ul> : <Vazio>Sem benefícios registrados.</Vazio>}
        {gestao && <FormFicha tipo="beneficio" id={f.id} valores={{}} tiposBeneficio={ficha.opcoes.tipos_beneficio} />}
      </Cartao>
    </div>
    <div className={ui.grade2}>
      <Cartao titulo="Diárias">
        {ficha.diarias.length ? <ul className={ui.lista}>{ficha.diarias.map((x, i) => <li key={x.id ?? i}><div><strong>{x.destino} · {formatarMoeda(x.valor_diaria)} por dia</strong><span>{formatarData(x.inicio)} a {formatarData(x.fim)} · {x.motivo}</span></div></li>)}</ul> : <Vazio>Nenhuma diária registrada.</Vazio>}
        {gestao && <FormFicha tipo="diaria" id={f.id} valores={{}} />}
      </Cartao>
      <Cartao titulo="Treinamentos">
        {ficha.treinamentos.length ? <ul className={ui.lista}>{ficha.treinamentos.map((x, i) => <li key={x.id ?? i}><div><strong>{x.titulo}</strong><span>{x.instituicao} · {x.carga_horaria} horas · {x.status}</span></div></li>)}</ul> : <Vazio>Nenhum treinamento registrado.</Vazio>}
        {gestao && <FormFicha tipo="treinamento" id={f.id} valores={{}} />}
      </Cartao>
    </div>
    {gestao && <Cartao titulo="Histórico de alterações">{ficha.historico.length ? <ul className={ui.lista}>{ficha.historico.map((h) => <li key={h.id}><div><strong>{h.campo}</strong><span>{h.anterior || "—"} → {h.novo} · {h.por} · {h.em}</span></div></li>)}</ul> : <Vazio>Nenhuma alteração registrada.</Vazio>}</Cartao>}
  </>;
}
